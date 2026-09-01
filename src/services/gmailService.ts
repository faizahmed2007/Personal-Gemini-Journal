import { GmailEmail, GmailComposeRequest } from '../types';

// Helper to decode Base64Url strings from Gmail payload
function decodeBase64Url(str: string): string {
  try {
    // Replace URL-safe characters
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    // Pad string with '='
    while (base64.length % 4) {
      base64 += '=';
    }
    // Decode base64 to bytes then UTF-8 string
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    console.warn('Failed to decode Base64Url string:', e);
    return '';
  }
}

// Helper to encode string to Base64Url for Gmail send API
function encodeBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Parse parts recursively to extract plain text and HTML
function extractBodyFromPayload(payload: any): { text: string; html: string } {
  let text = '';
  let html = '';

  if (!payload) return { text, html };

  if (payload.body && payload.body.data) {
    const decoded = decodeBase64Url(payload.body.data);
    if (payload.mimeType === 'text/html') {
      html = decoded;
    } else {
      text = decoded;
    }
  }

  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        text += (text ? '\n' : '') + decodeBase64Url(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        html += (html ? '<br/>' : '') + decodeBase64Url(part.body.data);
      } else if (part.parts) {
        const nested = extractBodyFromPayload(part);
        if (nested.text) text += (text ? '\n' : '') + nested.text;
        if (nested.html) html += (html ? '<br/>' : '') + nested.html;
      }
    }
  }

  return { text, html };
}

// Strip HTML tags for clean plain text preview if text is empty
function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export const gmailService = {
  /**
   * Fetch current authenticated Gmail profile (email, total messages)
   */
  async getProfile(accessToken: string): Promise<{ emailAddress: string; messagesTotal: number; threadsTotal: number }> {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch Gmail profile (${res.status})`);
    }

    return await res.json();
  },

  /**
   * List messages with query filtering and pagination
   */
  async listMessages(
    accessToken: string,
    query: string = 'in:inbox',
    maxResults: number = 15,
    pageToken?: string
  ): Promise<{ emails: GmailEmail[]; nextPageToken?: string; totalEstimated?: number }> {
    const params = new URLSearchParams({
      q: query,
      maxResults: maxResults.toString()
    });
    if (pageToken) params.append('pageToken', pageToken);

    const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!listRes.ok) {
      const err = await listRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gmail API error (${listRes.status})`);
    }

    const listData = await listRes.json();
    const messageStubs = listData.messages || [];

    if (messageStubs.length === 0) {
      return { emails: [], nextPageToken: listData.nextPageToken, totalEstimated: listData.resultSizeEstimate };
    }

    // Fetch individual full messages in parallel (chunked by 8 for concurrency safety)
    const emails: GmailEmail[] = [];
    const chunkSize = 8;
    for (let i = 0; i < messageStubs.length; i += chunkSize) {
      const chunk = messageStubs.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(async (stub: { id: string }) => {
          try {
            return await gmailService.getMessage(accessToken, stub.id);
          } catch (e) {
            console.warn(`Failed to fetch message ${stub.id}:`, e);
            return null;
          }
        })
      );
      emails.push(...(chunkResults.filter(Boolean) as GmailEmail[]));
    }

    return {
      emails,
      nextPageToken: listData.nextPageToken,
      totalEstimated: listData.resultSizeEstimate
    };
  },

  /**
   * Get single full email message by ID
   */
  async getMessage(accessToken: string, messageId: string): Promise<GmailEmail> {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch message (${res.status})`);
    }

    const data = await res.json();
    const headers = data.payload?.headers || [];

    const getHeader = (name: string) => {
      const found = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
      return found ? found.value : '';
    };

    const { text, html } = extractBodyFromPayload(data.payload);
    const labelIds: string[] = data.labelIds || [];

    const finalBodyText = text || (html ? stripHtml(html) : data.snippet || '');

    return {
      id: data.id,
      threadId: data.threadId,
      snippet: data.snippet || '',
      internalDate: data.internalDate || Date.now().toString(),
      labelIds,
      subject: getHeader('Subject') || '(No Subject)',
      from: getHeader('From') || 'Unknown Sender',
      to: getHeader('To') || 'Me',
      date: getHeader('Date') || new Date(parseInt(data.internalDate, 10)).toLocaleString(),
      bodyText: finalBodyText,
      bodyHtml: html || undefined,
      isUnread: labelIds.includes('UNREAD'),
      isStarred: labelIds.includes('STARRED'),
      isImportant: labelIds.includes('IMPORTANT')
    };
  },

  /**
   * Send a new email or reply (MUST be preceded by explicit user confirmation)
   */
  async sendEmail(accessToken: string, req: GmailComposeRequest): Promise<{ id: string; threadId: string }> {
    const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(req.subject)))}?=`;
    
    let emailHeaders = [
      `To: ${req.to}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit'
    ];

    if (req.inReplyTo) {
      emailHeaders.push(`In-Reply-To: ${req.inReplyTo}`);
      emailHeaders.push(`References: ${req.inReplyTo}`);
    }

    const emailContent = `${emailHeaders.join('\r\n')}\r\n\r\n${req.body}`;
    const raw = encodeBase64Url(emailContent);

    const bodyPayload: any = { raw };
    if (req.threadId) {
      bodyPayload.threadId = req.threadId;
    }

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyPayload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to send email (${res.status})`);
    }

    return await res.json();
  },

  /**
   * Trash message (destructive operation requiring confirmation)
   */
  async trashMessage(accessToken: string, messageId: string): Promise<void> {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to move message to trash (${res.status})`);
    }
  },

  /**
   * Toggle star state on message
   */
  async toggleStar(accessToken: string, messageId: string, currentlyStarred: boolean): Promise<void> {
    const addLabelIds = currentlyStarred ? [] : ['STARRED'];
    const removeLabelIds = currentlyStarred ? ['STARRED'] : [];

    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ addLabelIds, removeLabelIds })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to update star (${res.status})`);
    }
  },

  /**
   * Mark message as read
   */
  async markAsRead(accessToken: string, messageId: string): Promise<void> {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ removeLabelIds: ['UNREAD'] })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to mark message as read (${res.status})`);
    }
  }
};
