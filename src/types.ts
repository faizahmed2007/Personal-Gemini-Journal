export type JournalMode =
  | 'free_journal'
  | 'brainstorm'
  | 'reflection'
  | 'problem_solving'
  | 'goal_planning'
  | 'study_notes';

export type GeminiModelId = 
  | 'gemini-3.5-flash'
  | 'gemini-3.1-pro-preview'
  | 'gemini-3.1-flash-lite';

export type ChatPersonaRole = 
  | 'empathetic_guide'
  | 'socratic_mentor'
  | 'life_coach'
  | 'problem_solver'
  | 'creative_partner'
  | 'research_analyst';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface JournalModeConfig {
  id: JournalMode;
  label: string;
  description: string;
  iconName: string;
  placeholder: string;
  promptGuidance: string;
  accentColor: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  lastMessageAt?: number;
  summary?: string;
  favorite: boolean;
  mode: JournalMode;
  messageCount: number;
  mood?: string;
  tags?: string[];
  hasSummary?: boolean;
}

export interface ChatMessage {
  id: string;
  journalId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  status?: 'sent' | 'pending' | 'error';
  mode?: JournalMode;
  groundingSources?: GroundingSource[];
  modelUsed?: string;
  personaRole?: string;
}

export interface ActionItem {
  id: string;
  text: string;
  status: 'pending' | 'in_progress' | 'completed';
  journalId?: string;
  journalTitle?: string;
  createdAt?: number;
  completedAt?: number;
}

export interface GoalItem {
  id: string;
  goal: string;
  firstMentioned: number;
  latestMention: number;
  status: 'active' | 'achieved' | 'paused';
  mentionCount: number;
  journalTitles?: string[];
}

export interface JournalSummary {
  id: string;
  journalId: string;
  userId: string;
  title: string;
  shortSummary: string;
  mainTopics: string[];
  keyIdeas: string[];
  importantDecisions: string[];
  actionItems: Array<{ id: string; text: string; status: 'pending' | 'in_progress' | 'completed' }>;
  goals: string[];
  questionsToRevisit: string[];
  moodTheme?: string;
  createdAt: number;
}

export interface WeeklyReflection {
  id: string;
  userId: string;
  createdAt: number;
  timeRange: string;
  focusHighlights: string;
  recurringThemes: string[];
  goalsProgress: string;
  actionItemsReview: string;
  keyLearnings: string;
  inspirationalThought: string;
}

export interface UserPrivacySettings {
  enableInsights: boolean;
  enableMoodTracking: boolean;
  autoSaveSummaries: boolean;
  retentionNoticeAcknowledged: boolean;
}

export interface SecurityTestResult {
  id: string;
  category: 'Authentication' | 'Firestore Isolation' | 'Secret Protection' | 'Input Sanitization' | 'Rate Limiting';
  title: string;
  status: 'passed' | 'failed' | 'running';
  details: string;
  timestamp: number;
}

export interface GmailEmail {
  id: string;
  threadId: string;
  snippet: string;
  internalDate: string;
  labelIds: string[];
  subject: string;
  from: string;
  to: string;
  date: string;
  bodyText: string;
  bodyHtml?: string;
  isUnread: boolean;
  isStarred: boolean;
  isImportant: boolean;
}

export interface GmailComposeRequest {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  threadId?: string;
}

export interface EmailGeminiAnalysis {
  summary: string;
  tone: string;
  keyPoints: string[];
  actionItems: string[];
  suggestedReflectionPrompt: string;
  draftReplies: Array<{
    title: string;
    text: string;
  }>;
}
