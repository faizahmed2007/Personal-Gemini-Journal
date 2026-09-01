import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { gmailService } from '../services/gmailService';
import { geminiService } from '../services/geminiService';
import { firestoreService } from '../services/firestoreService';
import { GmailEmail, EmailGeminiAnalysis, JournalMode } from '../types';
import { GmailConfirmationModal, GmailConfirmationData } from './GmailConfirmationModal';
import { GmailComposeModal } from './GmailComposeModal';
import { 
  Mail, 
  Search, 
  Star, 
  Trash2, 
  Reply, 
  Send, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  BookOpen, 
  ChevronRight, 
  Inbox, 
  SendHorizonal, 
  AlertCircle,
  Plus,
  Compass,
  Zap,
  Tag,
  Clock,
  User as UserIcon,
  Check,
  ChevronDown
} from 'lucide-react';

interface GmailViewProps {
  onStartNewJournalWithContent?: (mode: JournalMode, prompt: string, title: string) => void;
  onAddActionItem?: (text: string) => void;
}

export const GmailView: React.FC<GmailViewProps> = ({
  onStartNewJournalWithContent,
  onAddActionItem
}) => {
  const { user, getGoogleAccessToken, connectGmail, hasGmailAccess, getIdToken } = useAuth();
  const { showToast } = useToast();

  const [activeFolder, setActiveFolder] = useState<'inbox' | 'starred' | 'sent' | 'unread'>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<GmailEmail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [profile, setProfile] = useState<{ emailAddress: string; messagesTotal: number } | null>(null);
  
  // AI analysis state for selected email
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMap, setAnalysisMap] = useState<Record<string, EmailGeminiAnalysis>>({});

  // Compose / Confirmation Modals
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeInitialData, setComposeInitialData] = useState<{
    to?: string;
    subject?: string;
    body?: string;
    threadId?: string;
    inReplyTo?: string;
  }>({});
  const [confirmData, setConfirmData] = useState<GmailConfirmationData | null>(null);
  const [quickReplyText, setQuickReplyText] = useState('');
  const [isSendingQuickReply, setIsSendingQuickReply] = useState(false);

  // Determine query string based on active folder & search
  const effectiveQuery = useMemo(() => {
    let base = 'in:inbox';
    if (activeFolder === 'starred') base = 'is:starred';
    if (activeFolder === 'sent') base = 'in:sent';
    if (activeFolder === 'unread') base = 'is:unread';

    if (searchQuery.trim()) {
      return `${base} ${searchQuery.trim()}`;
    }
    return base;
  }, [activeFolder, searchQuery]);

  // Load emails
  const loadEmails = async () => {
    const token = await getGoogleAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      // Also fetch profile if not cached
      if (!profile) {
        gmailService.getProfile(token).then(setProfile).catch(() => {});
      }

      const res = await gmailService.listMessages(token, effectiveQuery, 20);
      setEmails(res.emails);

      // Auto-select first email on desktop if none selected
      if (res.emails.length > 0 && !selectedEmail) {
        setSelectedEmail(res.emails[0]);
      }
    } catch (err: any) {
      console.error('Failed to load Gmail messages:', err);
      showToast(err.message || 'Could not load emails from Gmail', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasGmailAccess) {
      loadEmails();
    }
  }, [hasGmailAccess, effectiveQuery]);

  const handleConnectGmail = async () => {
    setIsConnecting(true);
    try {
      await connectGmail();
      showToast('Gmail connected successfully!', 'success');
      loadEmails();
    } catch (err: any) {
      console.error('Connect Gmail failed:', err);
      showToast(err.message || 'Failed to connect Gmail', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleToggleStar = async (email: GmailEmail, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = await getGoogleAccessToken();
    if (!token) return;

    const newStarred = !email.isStarred;
    setEmails(prev => prev.map(m => m.id === email.id ? { ...m, isStarred: newStarred } : m));
    if (selectedEmail?.id === email.id) {
      setSelectedEmail({ ...selectedEmail, isStarred: newStarred });
    }

    try {
      await gmailService.toggleStar(token, email.id, email.isStarred);
    } catch {
      showToast('Failed to update star in Gmail', 'error');
      loadEmails();
    }
  };

  const handleInitiateTrash = (email: GmailEmail, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // Explicit confirmation for destructive deletion requirement
    setConfirmData({
      type: 'trash',
      title: 'Move Email to Trash',
      description: `Are you sure you want to move the email "${email.subject}" from "${email.from}" to your Gmail Trash?`,
      details: {
        subject: email.subject,
        recipient: email.from,
        previewText: email.snippet
      },
      onConfirm: async () => {
        const token = await getGoogleAccessToken();
        if (!token) return;

        try {
          await gmailService.trashMessage(token, email.id);
          showToast('Email moved to Trash', 'info');
          setEmails(prev => prev.filter(m => m.id !== email.id));
          if (selectedEmail?.id === email.id) {
            setSelectedEmail(null);
          }
        } catch (err: any) {
          showToast(err.message || 'Failed to trash email', 'error');
        }
      }
    });
  };

  // AI Analyze Email
  const handleAnalyzeEmail = async (email: GmailEmail) => {
    if (analysisMap[email.id]) return; // Already analyzed

    setIsAnalyzing(true);
    try {
      const authToken = await getIdToken();
      const res = await geminiService.analyzeEmail(
        {
          subject: email.subject,
          from: email.from,
          date: email.date,
          bodyText: email.bodyText
        },
        authToken
      );

      setAnalysisMap(prev => ({
        ...prev,
        [email.id]: res.analysis
      }));
      showToast('Gemini analyzed email insights', 'success');
    } catch (err: any) {
      console.error('Email analysis failed:', err);
      showToast(err.message || 'Failed to analyze email with Gemini', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Automatically trigger analysis if an email is opened
  useEffect(() => {
    if (selectedEmail && !analysisMap[selectedEmail.id]) {
      handleAnalyzeEmail(selectedEmail);
    }
  }, [selectedEmail?.id]);

  // Turn email reflection into a new Journal Entry
  const handleCreateJournalFromEmail = (email: GmailEmail, analysis?: EmailGeminiAnalysis) => {
    if (!onStartNewJournalWithContent) return;

    const suggestedPrompt = analysis?.suggestedReflectionPrompt 
      ? `Email Reflection Prompt: ${analysis.suggestedReflectionPrompt}\n\nEmail Context:\nFrom: ${email.from}\nSubject: ${email.subject}\nKey Realizations:\n${(analysis.keyPoints || []).map(p => `• ${p}`).join('\n')}`
      : `Reflecting on email from ${email.from} regarding "${email.subject}":\n\n${email.bodyText.slice(0, 1000)}`;

    onStartNewJournalWithContent(
      'reflection',
      suggestedPrompt,
      `Reflection on: ${email.subject}`
    );
    showToast('Launched new Journal from email', 'success');
  };

  // Extract action item to Firestore tasks
  const handleSaveActionItem = async (text: string) => {
    if (!user) return;
    try {
      await firestoreService.saveActionItem(user.uid, {
        text,
        status: 'pending',
        journalTitle: selectedEmail ? `Email: ${selectedEmail.subject}` : 'From Gmail'
      });
      if (onAddActionItem) onAddActionItem(text);
      showToast('Added action item to Journal Tasks', 'success');
    } catch {
      showToast('Failed to save task', 'error');
    }
  };

  // Open compose with reply prefill
  const handleOpenReplyModal = (email: GmailEmail, draftBody: string = '') => {
    setComposeInitialData({
      to: email.from.match(/<([^>]+)>/)?.[1] || email.from,
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      body: draftBody || `\n\n--- On ${email.date}, ${email.from} wrote ---\n> ${email.snippet}`,
      threadId: email.threadId,
      inReplyTo: email.id
    });
    setIsComposeOpen(true);
  };

  // Quick reply submit
  const handleSendQuickReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmail || !quickReplyText.trim()) return;

    const recipient = selectedEmail.from.match(/<([^>]+)>/)?.[1] || selectedEmail.from;
    const replySubject = selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`;

    setConfirmData({
      type: 'send',
      title: 'Authorize Sending Reply',
      description: `Send reply to ${recipient} for "${replySubject}"?`,
      details: {
        recipient,
        subject: replySubject,
        previewText: quickReplyText
      },
      onConfirm: async () => {
        setIsSendingQuickReply(true);
        try {
          const token = await getGoogleAccessToken();
          if (!token) throw new Error('Gmail token missing');

          await gmailService.sendEmail(token, {
            to: recipient,
            subject: replySubject,
            body: quickReplyText.trim(),
            threadId: selectedEmail.threadId,
            inReplyTo: selectedEmail.id
          });

          showToast('Reply dispatched via Gmail', 'success');
          setQuickReplyText('');
        } catch (err: any) {
          showToast(err.message || 'Failed to send reply', 'error');
        } finally {
          setIsSendingQuickReply(false);
        }
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-1">
            <Mail className="w-3.5 h-3.5" />
            <span>Google Workspace Integration</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-['Playfair_Display',serif]">
            Gmail Reflection & Correspondence Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Transform incoming messages into reflection journals, action items, and AI-assisted responses.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {hasGmailAccess ? (
            <>
              <button
                id="btn-refresh-gmail"
                onClick={loadEmails}
                disabled={isLoading}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                title="Refresh Gmail Inbox"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                id="btn-compose-email"
                onClick={() => {
                  setComposeInitialData({});
                  setIsComposeOpen(true);
                }}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Compose Email</span>
              </button>
            </>
          ) : (
            <button
              id="btn-connect-gmail-header"
              onClick={handleConnectGmail}
              disabled={isConnecting}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-semibold text-xs shadow-xs flex items-center gap-2 transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>{isConnecting ? 'Connecting...' : 'Connect Gmail Account'}</span>
            </button>
          )}
        </div>
      </div>

      {/* If Not Connected to Gmail, show Clean OAuth Invitation Card */}
      {!hasGmailAccess ? (
        <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center max-w-2xl mx-auto space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 flex items-center justify-center mx-auto border border-blue-100 dark:border-blue-900">
            <Mail className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-['Playfair_Display',serif]">
              Connect Your Gmail to Personal Gemini Journal
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              Seamlessly view your inbox, convert key emails into introspective journal entries, extract tasks with Gemini, and compose replies—all secured with in-memory Google Workspace OAuth tokens.
            </p>
          </div>

          {/* Official Google Sign In button styling as per workspace skill */}
          <div className="pt-2 flex justify-center">
            <button
              onClick={handleConnectGmail}
              disabled={isConnecting}
              className="inline-flex items-center gap-3 px-5 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold text-xs shadow-xs transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isConnecting ? 'Authorizing Gmail...' : 'Connect Gmail with Google'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-left text-[11px] text-slate-500 dark:text-slate-400">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
              <span className="font-semibold text-slate-900 dark:text-white block mb-1">Email Journaling</span>
              Turn complex conversations into structured reflections and brainstorming prompts.
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
              <span className="font-semibold text-slate-900 dark:text-white block mb-1">AI Action Extraction</span>
              Automatically parse to-dos and commitments into your journal action items.
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
              <span className="font-semibold text-slate-900 dark:text-white block mb-1">Send Protections</span>
              Mandatory confirmation dialogs protect against accidental or destructive operations.
            </div>
          </div>
        </div>
      ) : (
        /* Connected Layout: Search + Folders + Split Screen View */
        <div className="space-y-4">
          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            {/* Folder Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
              <button
                id="folder-tab-inbox"
                onClick={() => setActiveFolder('inbox')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium whitespace-nowrap ${
                  activeFolder === 'inbox'
                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>Inbox</span>
              </button>

              <button
                id="folder-tab-unread"
                onClick={() => setActiveFolder('unread')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium whitespace-nowrap ${
                  activeFolder === 'unread'
                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Unread</span>
              </button>

              <button
                id="folder-tab-starred"
                onClick={() => setActiveFolder('starred')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium whitespace-nowrap ${
                  activeFolder === 'starred'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Starred</span>
              </button>

              <button
                id="folder-tab-sent"
                onClick={() => setActiveFolder('sent')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium whitespace-nowrap ${
                  activeFolder === 'sent'
                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <SendHorizonal className="w-3.5 h-3.5" />
                <span>Sent</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                id="input-gmail-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Gmail messages..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Main 2-Column Split Hub */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
            
            {/* Left Column: Email List (5 cols) */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden flex flex-col max-h-[720px]">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {emails.length} {emails.length === 1 ? 'Message' : 'Messages'}
                </span>
                {profile && (
                  <span className="text-[11px] text-slate-400 truncate max-w-[180px]">
                    {profile.emailAddress}
                  </span>
                )}
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                {isLoading ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Loading your Gmail messages...</span>
                  </div>
                ) : emails.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <span>No emails found in this view</span>
                  </div>
                ) : (
                  emails.map((email) => {
                    const isSelected = selectedEmail?.id === email.id;
                    return (
                      <div
                        key={email.id}
                        id={`email-item-${email.id}`}
                        onClick={() => setSelectedEmail(email)}
                        className={`p-3.5 transition-colors cursor-pointer text-xs group relative ${
                          isSelected
                            ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {email.isUnread && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" title="Unread" />
                            )}
                            <span className={`truncate font-semibold ${
                              email.isUnread ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'
                            }`}>
                              {email.from.split('<')[0].replace(/"/g, '')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-slate-400">
                              {new Date(parseInt(email.internalDate, 10)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleToggleStar(email, e)}
                              className="text-slate-300 dark:text-slate-600 hover:text-amber-500"
                            >
                              <Star className={`w-3.5 h-3.5 ${email.isStarred ? 'text-amber-500 fill-amber-500' : ''}`} />
                            </button>
                          </div>
                        </div>

                        <div className={`text-xs truncate ${email.isUnread ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                          {email.subject}
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-snug">
                          {email.snippet}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Selected Email Viewer & AI Assistant (7 cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden flex flex-col max-h-[720px]">
              {selectedEmail ? (
                <div className="flex-1 overflow-y-auto flex flex-col">
                  {/* Email Action Header */}
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenReplyModal(selectedEmail)}
                        className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-medium text-xs shadow-2xs flex items-center gap-1.5 transition-colors"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        <span>Reply</span>
                      </button>

                      <button
                        onClick={() => handleCreateJournalFromEmail(selectedEmail, analysisMap[selectedEmail.id])}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-medium text-xs border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 transition-colors"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Journal This</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleToggleStar(selectedEmail, e)}
                        className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        title={selectedEmail.isStarred ? 'Unstar' : 'Star message'}
                      >
                        <Star className={`w-4 h-4 ${selectedEmail.isStarred ? 'text-amber-500 fill-amber-500' : ''}`} />
                      </button>

                      <button
                        onClick={() => handleInitiateTrash(selectedEmail)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Move to Trash"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Email Meta details */}
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-3">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-['Playfair_Display',serif]">
                      {selectedEmail.subject}
                    </h2>

                    <div className="flex items-start justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center shrink-0">
                          {selectedEmail.from[0]?.toUpperCase() || 'E'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {selectedEmail.from}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            To: {selectedEmail.to}
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{selectedEmail.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Gemini AI Intelligence Box */}
                  <div className="p-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
                        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Gemini Email Analysis & Insights</span>
                      </div>
                      {isAnalyzing && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 animate-pulse">
                          Analyzing content...
                        </span>
                      )}
                    </div>

                    {analysisMap[selectedEmail.id] ? (
                      <div className="space-y-3">
                        {/* Summary & Tone */}
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-blue-100 dark:border-blue-900/60 shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">Summary:</span>
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                              Tone: {analysisMap[selectedEmail.id].tone}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                            {analysisMap[selectedEmail.id].summary}
                          </p>
                        </div>

                        {/* Action items from Email */}
                        {analysisMap[selectedEmail.id].actionItems?.length > 0 && (
                          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                            <div className="font-semibold text-emerald-900 dark:text-emerald-200 text-[11px] mb-1.5 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Identified Action Items ({analysisMap[selectedEmail.id].actionItems.length})</span>
                            </div>
                            <div className="space-y-1.5">
                              {analysisMap[selectedEmail.id].actionItems.map((action, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2 text-[11px]">
                                  <span className="text-slate-700 dark:text-slate-300">• {action}</span>
                                  <button
                                    onClick={() => handleSaveActionItem(action)}
                                    className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[10px] shrink-0"
                                  >
                                    + Add to Tasks
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Suggested Reply Drafts */}
                        {analysisMap[selectedEmail.id].draftReplies?.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                              1-Click AI Reply Drafts:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {analysisMap[selectedEmail.id].draftReplies.map((reply, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleOpenReplyModal(selectedEmail, reply.text)}
                                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 text-slate-800 dark:text-slate-200 text-[11px] font-medium shadow-2xs flex items-center gap-1"
                                >
                                  <Send className="w-3 h-3 text-blue-600" />
                                  <span>{reply.title}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-slate-500 text-[11px]">
                        Click "Analyze with Gemini" or wait a moment for deep reflection insights.
                      </div>
                    )}
                  </div>

                  {/* Email Body Content */}
                  <div className="p-5 flex-1 text-slate-800 dark:text-slate-200 leading-relaxed font-sans text-xs sm:text-sm whitespace-pre-wrap">
                    {selectedEmail.bodyText || selectedEmail.snippet}
                  </div>

                  {/* Quick Inline Reply Footer */}
                  <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
                    <form onSubmit={handleSendQuickReply} className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold">Quick Reply via Gmail:</span>
                        <span className="text-slate-400">Explicit confirmation will appear before sending</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={quickReplyText}
                          onChange={(e) => setQuickReplyText(e.target.value)}
                          placeholder="Type quick reply or click 'Reply' for full draft composer..."
                          className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="submit"
                          disabled={!quickReplyText.trim() || isSendingQuickReply}
                          className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-semibold text-xs shadow-2xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <Mail className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-700" />
                  <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                    Select an email to read
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Choose any message from the list to view full content, generate Gemini summaries, or draft replies.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compose Email Modal */}
      <GmailComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        initialTo={composeInitialData.to}
        initialSubject={composeInitialData.subject}
        initialBody={composeInitialData.body}
        threadId={composeInitialData.threadId}
        inReplyTo={composeInitialData.inReplyTo}
        onSent={loadEmails}
      />

      {/* Explicit User Confirmation Modal */}
      <GmailConfirmationModal
        isOpen={!!confirmData}
        data={confirmData}
        onClose={() => setConfirmData(null)}
      />
    </div>
  );
};
