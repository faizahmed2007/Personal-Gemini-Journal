import { JournalMode, JournalSummary, WeeklyReflection, SecurityTestResult, EmailGeminiAnalysis, GeminiModelId, ChatPersonaRole, GroundingSource } from '../types';

export interface ChatApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const geminiService = {
  /**
   * Send conversation to server-side Gemini API with role personas, model selection & search grounding
   */
  async sendMessage(
    messages: ChatApiMessage[],
    mode: JournalMode,
    authToken: string,
    options?: {
      model?: GeminiModelId;
      personaRole?: ChatPersonaRole;
      enableSearchGrounding?: boolean;
    }
  ): Promise<{ 
    reply: string; 
    timestamp: number;
    modelUsed?: string;
    personaRole?: string;
    groundingSources?: GroundingSource[];
  }> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ 
        messages, 
        mode,
        model: options?.model || 'gemini-3.5-flash',
        personaRole: options?.personaRole || 'empathetic_guide',
        enableSearchGrounding: !!options?.enableSearchGrounding
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Server responded with ${res.status}`);
    }

    return await res.json();
  },

  /**
   * Request structured journal summary from server-side Gemini
   */
  async generateSummary(
    messages: ChatApiMessage[],
    journalTitle: string,
    mode: JournalMode,
    authToken: string
  ): Promise<{ summary: JournalSummary }> {
    const res = await fetch('/api/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ messages, journalTitle, mode })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to generate summary (${res.status})`);
    }

    return await res.json();
  },

  /**
   * Generate meta-reflection across multiple summaries
   */
  async generateWeeklyReflection(
    summaries: JournalSummary[],
    authToken: string
  ): Promise<{ weeklyReflection: WeeklyReflection }> {
    const res = await fetch('/api/insights/generate-weekly', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ summaries })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to generate weekly insight (${res.status})`);
    }

    return await res.json();
  },

  /**
   * Run live security & isolation test suite
   */
  async runSecurityAudit(authToken: string): Promise<{
    status: string;
    timestamp: number;
    testsPassed: number;
    totalTests: number;
    results: SecurityTestResult[];
  }> {
    const res = await fetch('/api/security/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!res.ok) {
      throw new Error(`Security audit request failed with status ${res.status}`);
    }

    return await res.json();
  },

  /**
   * Analyze email with Gemini for insights, key points, action items, reflection prompt, and reply drafts
   */
  async analyzeEmail(
    email: { subject: string; from: string; date: string; bodyText: string },
    authToken: string
  ): Promise<{ analysis: EmailGeminiAnalysis }> {
    const res = await fetch('/api/gmail/analyze-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(email)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to analyze email (${res.status})`);
    }

    return await res.json();
  },

  /**
   * Draft a customized email reply with Gemini
   */
  async draftEmailReply(
    emailContext: { subject: string; from: string; bodyText: string },
    instruction: string,
    tone: string,
    authToken: string
  ): Promise<{ replyText: string }> {
    const res = await fetch('/api/gmail/draft-reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ emailContext, instruction, tone })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to draft reply (${res.status})`);
    }

    return await res.json();
  }
};
