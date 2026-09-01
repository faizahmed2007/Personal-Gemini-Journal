import { JournalMode, JournalSummary, WeeklyReflection, SecurityTestResult } from '../types';

export interface ChatApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const geminiService = {
  /**
   * Send conversation to server-side Gemini API
   */
  async sendMessage(
    messages: ChatApiMessage[],
    mode: JournalMode,
    authToken: string
  ): Promise<{ reply: string; timestamp: number }> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ messages, mode })
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
  }
};
