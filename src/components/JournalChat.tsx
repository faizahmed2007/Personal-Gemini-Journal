import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { geminiService } from '../services/geminiService';
import { firestoreService } from '../services/firestoreService';
import { JournalEntry, ChatMessage, JournalMode, JournalSummary } from '../types';
import { 
  ArrowLeft, 
  Send, 
  Sparkles, 
  FileText, 
  Trash2, 
  RotateCcw, 
  Copy, 
  Check, 
  Square, 
  Star, 
  Edit3, 
  Compass, 
  Lightbulb, 
  Target, 
  Zap, 
  BookOpen, 
  Clock, 
  AlertCircle,
  MoreVertical,
  ChevronDown
} from 'lucide-react';

interface JournalChatProps {
  journal: JournalEntry;
  onBack: () => void;
  onUpdateJournal: (updates: Partial<JournalEntry>) => void;
  onDeleteJournal: (journalId: string) => void;
  onOpenSummary: (journal: JournalEntry, existingSummary?: JournalSummary | null) => void;
}

export const JournalChat: React.FC<JournalChatProps> = ({
  journal,
  onBack,
  onUpdateJournal,
  onDeleteJournal,
  onOpenSummary
}) => {
  const { user, getIdToken } = useAuth();
  const { showToast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(journal.title);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load messages from Firestore
  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const loadMessages = async () => {
      try {
        const msgs = await firestoreService.getJournalMessages(user.uid, journal.id);
        if (isMounted) {
          setMessages(msgs);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
        showToast('Could not load past conversation history', 'error');
      }
    };

    loadMessages();
    return () => { isMounted = false; };
  }, [journal.id, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-focus input on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleTitleSubmit = async () => {
    if (!user || !titleInput.trim()) return;
    try {
      await firestoreService.updateJournal(user.uid, journal.id, { title: titleInput.trim() });
      onUpdateJournal({ title: titleInput.trim() });
      setIsEditingTitle(false);
      showToast('Journal title updated', 'success');
    } catch (err) {
      showToast('Failed to update title', 'error');
    }
  };

  const handleModeChange = async (newMode: JournalMode) => {
    if (!user) return;
    setModeMenuOpen(false);
    try {
      await firestoreService.updateJournal(user.uid, journal.id, { mode: newMode });
      onUpdateJournal({ mode: newMode });
      showToast(`Switched mode to ${newMode.replace('_', ' ')}`, 'info');
    } catch {
      showToast('Failed to change mode', 'error');
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading || !user) return;

    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userMessageData: Omit<ChatMessage, 'id'> = {
      journalId: journal.id,
      userId: user.uid,
      role: 'user',
      content: text,
      createdAt: Date.now(),
      mode: journal.mode
    };

    // Optimistically save & show user message
    try {
      const savedUserMsg = await firestoreService.saveMessage(user.uid, journal.id, userMessageData);
      const updatedMessages = [...messages, savedUserMsg];
      setMessages(updatedMessages);

      setIsLoading(true);

      // Prepare payload for Gemini server endpoint
      const token = await getIdToken();
      const apiPayload = updatedMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Call server-side Gemini API
      const result = await geminiService.sendMessage(apiPayload, journal.mode, token);

      // Save assistant response
      const assistantMessageData: Omit<ChatMessage, 'id'> = {
        journalId: journal.id,
        userId: user.uid,
        role: 'assistant',
        content: result.reply,
        createdAt: Date.now(),
        mode: journal.mode
      };

      const savedAssistantMsg = await firestoreService.saveMessage(user.uid, journal.id, assistantMessageData);
      setMessages([...updatedMessages, savedAssistantMsg]);
      onUpdateJournal({
        messageCount: updatedMessages.length + 1,
        lastMessageAt: Date.now()
      });
    } catch (err: any) {
      console.error('Chat error:', err);
      showToast(err.message || 'Gemini is temporarily unavailable. Your message was saved.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
    showToast('Generation halted', 'info');
  };

  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(msgId);
    showToast('Message copied to clipboard', 'success');
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!user) return;
    try {
      await firestoreService.deleteMessage(user.uid, journal.id, msgId);
      const remaining = messages.filter(m => m.id !== msgId);
      setMessages(remaining);
      onUpdateJournal({ messageCount: remaining.length });
      showToast('Message removed', 'info');
    } catch {
      showToast('Failed to delete message', 'error');
    }
  };

  const handleClearConversation = async () => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to clear all messages in this journal session?')) return;

    try {
      await firestoreService.clearJournalMessages(user.uid, journal.id);
      setMessages([]);
      onUpdateJournal({ messageCount: 0 });
      showToast('Conversation cleared', 'info');
      setOptionsMenuOpen(false);
    } catch {
      showToast('Failed to clear conversation', 'error');
    }
  };

  const handleRetryLastMessage = async () => {
    if (messages.length === 0 || isLoading || !user) return;

    // Find the last user message
    const lastUserIndex = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserIndex === -1) return;

    const actualIndex = messages.length - 1 - lastUserIndex;
    const lastUserMsg = messages[actualIndex];

    // If the very last message is an assistant message, remove it first
    if (messages[messages.length - 1].role === 'assistant') {
      await firestoreService.deleteMessage(user.uid, journal.id, messages[messages.length - 1].id);
    }

    const trimmedMessages = messages.slice(0, actualIndex + 1);
    setMessages(trimmedMessages);

    setIsLoading(true);
    try {
      const token = await getIdToken();
      const apiPayload = trimmedMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const result = await geminiService.sendMessage(apiPayload, journal.mode, token);

      const assistantMsg = await firestoreService.saveMessage(user.uid, journal.id, {
        journalId: journal.id,
        userId: user.uid,
        role: 'assistant',
        content: result.reply,
        createdAt: Date.now(),
        mode: journal.mode
      });

      setMessages([...trimmedMessages, assistantMsg]);
    } catch (err: any) {
      showToast(err.message || 'Retry failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!user || messages.length === 0) {
      showToast('Write a few thoughts before generating a summary', 'info');
      return;
    }

    setIsSummarizing(true);
    try {
      const token = await getIdToken();
      const apiPayload = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await geminiService.generateSummary(apiPayload, journal.title, journal.mode, token);
      
      // Save summary in Firestore
      const savedSummary = await firestoreService.saveSummary(user.uid, journal.id, res.summary);
      
      onUpdateJournal({
        summary: savedSummary.shortSummary,
        hasSummary: true,
        mood: savedSummary.moodTheme
      });

      showToast('Structured summary generated successfully!', 'success');
      onOpenSummary(journal, savedSummary);
    } catch (err: any) {
      console.error('Summary error:', err);
      showToast(err.message || 'Failed to generate summary', 'error');
    } finally {
      setIsSummarizing(false);
    }
  };

  const modePrompts: Record<JournalMode, string[]> = {
    free_journal: [
      'What occupied your thoughts most today?',
      'How are you feeling right in this moment?',
      'What is something unexpected that happened?'
    ],
    brainstorm: [
      'What is an ambitious idea you want to explore?',
      'If there were zero constraints, how would we solve this?',
      'What are 3 novel ways to approach this opportunity?'
    ],
    reflection: [
      'What lesson did you learn from this recent experience?',
      'What values guided your choices today?',
      'What would you tell yourself if you did it again?'
    ],
    problem_solving: [
      'What is the core obstacle, and what is within our control?',
      'What is the smallest step forward we can take today?',
      'What are the trade-offs of the top two options?'
    ],
    goal_planning: [
      'What is the specific milestone for this week?',
      'What friction might prevent you from completing this habit?',
      'How will you know this goal is achieved?'
    ],
    study_notes: [
      'Explain this concept in simple terms',
      'What is the core mental model behind this theory?',
      'Give me 3 practice scenarios to test comprehension'
    ]
  };

  const modeIcons: Record<JournalMode, any> = {
    free_journal: Compass,
    brainstorm: Lightbulb,
    reflection: Sparkles,
    problem_solving: Zap,
    goal_planning: Target,
    study_notes: BookOpen
  };

  const ModeIcon = modeIcons[journal.mode] || Compass;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-5rem)] flex flex-col justify-between animate-fade-in">
      
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Back to Dashboard"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                  autoFocus
                  className="px-2.5 py-1 text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 rounded-lg border border-blue-500 focus:outline-none w-full"
                />
                <button
                  onClick={handleTitleSubmit}
                  className="text-xs px-2.5 py-1 bg-blue-700 text-white rounded-md font-medium"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate font-['Playfair_Display',serif]">
                  {journal.title}
                </h1>
                <Edit3 className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}

            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
              <Clock className="w-3 h-3" />
              <span>{new Date(journal.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <span>•</span>
              <span>{messages.length} messages</span>
            </div>
          </div>
        </div>

        {/* Right: Mode selector, Summary button, Favorite & Options */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Mode Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setModeMenuOpen(!modeMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
            >
              <ModeIcon className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span className="capitalize">{journal.mode.replace('_', ' ')}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {modeMenuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setModeMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 z-30 animate-fade-in text-xs">
                  {(['free_journal', 'brainstorm', 'reflection', 'problem_solving', 'goal_planning', 'study_notes'] as JournalMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => handleModeChange(m)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors capitalize ${
                        journal.mode === m 
                          ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold' 
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {m.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Generate Summary Button */}
          <button
            id="btn-generate-summary"
            onClick={handleGenerateSummary}
            disabled={isSummarizing || messages.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
            title="Generate structured summary and takeaways"
          >
            <FileText className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            <span>{isSummarizing ? 'Synthesizing...' : 'Summary'}</span>
          </button>

          {/* Favorite Toggle */}
          <button
            onClick={async () => {
              if (!user) return;
              const nextFav = await firestoreService.toggleFavoriteJournal(user.uid, journal.id, journal.favorite);
              onUpdateJournal({ favorite: nextFav });
            }}
            className="p-2 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={journal.favorite ? 'Favorited' : 'Add to favorites'}
          >
            <Star className={`w-4 h-4 ${journal.favorite ? 'text-amber-500 fill-amber-500' : ''}`} />
          </button>

          {/* Options Dropdown */}
          <div className="relative">
            <button
              onClick={() => setOptionsMenuOpen(!optionsMenuOpen)}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {optionsMenuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setOptionsMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 z-30 animate-fade-in text-xs">
                  <button
                    onClick={handleClearConversation}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Clear Messages</span>
                  </button>
                  <button
                    onClick={() => {
                      setOptionsMenuOpen(false);
                      if (window.confirm('Delete this entire journal entry and its conversations?')) {
                        onDeleteJournal(journal.id);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Journal</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 p-4 border border-slate-200 dark:border-slate-800">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center border border-blue-100 dark:border-blue-900 shadow-2xs">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="max-w-md">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-['Playfair_Display',serif]">
                Begin Your {journal.mode.replace('_', ' ')} Session
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Type freely. Your journal is private and securely encrypted on your personal cloud partition.
              </p>
            </div>

            {/* Quick Inspiration Prompts */}
            <div className="flex flex-col gap-2 w-full max-w-md">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-left">
                Suggested Prompts for this mode:
              </span>
              {modePrompts[journal.mode]?.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 text-left text-xs text-slate-700 dark:text-slate-300 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between group"
                >
                  <span>"{prompt}"</span>
                  <Send className="w-3.5 h-3.5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                id={`message-bubble-${msg.id}`}
                className={`flex gap-3 group ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {/* Gemini Avatar */}
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1 font-bold text-xs">
                    G
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`relative max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-blue-700 text-white rounded-tr-xs shadow-2xs'
                      : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-tl-xs border border-slate-200 dark:border-slate-800 shadow-2xs'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="markdown-body space-y-2 prose dark:prose-invert prose-xs max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Message Meta and Action Buttons */}
                  <div className={`mt-2.5 pt-2 flex items-center justify-between gap-3 text-[10px] ${
                    isUser ? 'border-t border-white/15 text-blue-100' : 'border-t border-slate-100 dark:border-slate-800 text-slate-400'
                  }`}>
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
                        title="Copy text"
                      >
                        {copiedMessageId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>

                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1 hover:bg-rose-500/20 hover:text-rose-400 rounded transition-colors"
                        title="Delete message"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex gap-3 justify-start animate-fade-in">
            <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-2xs font-bold text-xs">
              G
            </div>
            <div className="p-4 rounded-2xl rounded-tl-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>Gemini is synthesizing thoughts...</span>
              <button
                onClick={handleStopGeneration}
                className="ml-2 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] rounded font-semibold text-slate-600 dark:text-slate-300"
              >
                Stop
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <div className="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs relative">
        {/* Retry prompt helper if last message had error or completed */}
        {messages.length > 0 && !isLoading && messages[messages.length - 1].role === 'assistant' && (
          <div className="mb-2 flex items-center justify-between px-1 text-[11px] text-slate-400">
            <span>Press Enter to send, Shift+Enter for newline</span>
            <button
              onClick={handleRetryLastMessage}
              className="flex items-center gap-1 text-blue-700 dark:text-blue-400 hover:underline font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry Gemini response</span>
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            id="chat-message-input"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Reflect, write, or brainstorm in ${journal.mode.replace('_', ' ')} mode...`}
            rows={1}
            className="flex-1 max-h-40 min-h-[44px] p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all"
          />

          <button
            id="btn-chat-send"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className="p-3 bg-blue-700 hover:bg-blue-600 text-white rounded-lg shadow-2xs disabled:opacity-40 transition-colors shrink-0"
            title="Send reflection to Gemini"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
