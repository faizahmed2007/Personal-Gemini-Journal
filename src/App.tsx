import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { useToast } from './components/Toast';
import { firestoreService } from './services/firestoreService';
import { JournalEntry, JournalSummary, ActionItem, WeeklyReflection, JournalMode, UserPrivacySettings } from './types';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { JournalChat } from './components/JournalChat';
import { MyJournals } from './components/MyJournals';
import { JournalInsights } from './components/JournalInsights';
import { AuthModal } from './components/AuthModal';
import { JournalSummaryModal } from './components/JournalSummaryModal';
import { PrivacySettingsModal } from './components/PrivacySettingsModal';
import { SecurityCenterModal } from './components/SecurityCenterModal';
import { 
  Compass, 
  BookOpen, 
  Sparkles, 
  BarChart3, 
  ShieldCheck, 
  Plus, 
  Moon, 
  Sun, 
  LogOut, 
  Lock, 
  Shield, 
  Menu, 
  X as CloseIcon,
  CheckCircle2
} from 'lucide-react';

type AppView = 'landing' | 'dashboard' | 'chat' | 'journals' | 'insights' | 'security';

export const App: React.FC = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  // Navigation state
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [activeJournal, setActiveJournal] = useState<JournalEntry | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [activeSummary, setActiveSummary] = useState<JournalSummary | null>(null);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);

  // Data state
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [summaries, setSummaries] = useState<JournalSummary[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [weeklyReflections, setWeeklyReflections] = useState<WeeklyReflection[]>([]);
  const [privacySettings, setPrivacySettings] = useState<UserPrivacySettings>({
    enableInsights: true,
    enableMoodTracking: true,
    autoSaveSummaries: true,
    retentionNoticeAcknowledged: true
  });

  // Load user data when authenticated
  useEffect(() => {
    if (!user) {
      setJournals([]);
      setSummaries([]);
      setActionItems([]);
      setWeeklyReflections([]);
      setActiveJournal(null);
      setCurrentView('landing');
      return;
    }

    let isMounted = true;

    const loadAllUserData = async () => {
      try {
        const [loadedJournals, loadedSummaries, loadedActions, loadedReflections, loadedSettings] = await Promise.all([
          firestoreService.getUserJournals(user.uid),
          firestoreService.getAllUserSummaries(user.uid),
          firestoreService.getActionItems(user.uid),
          firestoreService.getWeeklyReflections(user.uid),
          firestoreService.getPrivacySettings(user.uid)
        ]);

        if (isMounted) {
          setJournals(loadedJournals);
          setSummaries(loadedSummaries);
          setActionItems(loadedActions);
          setWeeklyReflections(loadedReflections);
          if (loadedSettings) {
            setPrivacySettings(loadedSettings);
          }
          setCurrentView('dashboard');
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      }
    };

    loadAllUserData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Handler: Start a new journal
  const handleStartNewJournal = async (mode: JournalMode, initialPrompt?: string, customTitle?: string) => {
    if (!user) {
      setAuthModalMode('signup');
      setAuthModalOpen(true);
      return;
    }

    try {
      const newEntry = await firestoreService.createJournal(user.uid, mode, customTitle);

      setJournals(prev => [newEntry, ...prev]);
      setActiveJournal(newEntry);
      setCurrentView('chat');
      setMobileMenuOpen(false);

      // If there was an initial prompt
      if (initialPrompt) {
        setTimeout(async () => {
          try {
            await firestoreService.saveMessage(user.uid, newEntry.id, {
              journalId: newEntry.id,
              userId: user.uid,
              role: 'user',
              content: initialPrompt,
              createdAt: Date.now(),
              mode
            });
          } catch (e) {
            console.error('Failed to auto-save initial message:', e);
          }
        }, 100);
      }

      showToast(`Started new ${mode.replace('_', ' ')} session`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to create journal', 'error');
    }
  };

  // Handler: Open existing journal
  const handleOpenJournal = (journalId: string) => {
    const found = journals.find(j => j.id === journalId);
    if (found) {
      setActiveJournal(found);
      setCurrentView('chat');
      setMobileMenuOpen(false);
    }
  };

  // Handler: Update active journal metadata
  const handleUpdateJournal = (updates: Partial<JournalEntry>) => {
    if (!activeJournal) return;
    const updated = { ...activeJournal, ...updates, updatedAt: Date.now() };
    setActiveJournal(updated);
    setJournals(prev => prev.map(j => j.id === activeJournal.id ? updated : j));
  };

  // Handler: Toggle favorite
  const handleToggleFavorite = async (journalId: string, current: boolean) => {
    if (!user) return;
    try {
      const nextFav = await firestoreService.toggleFavoriteJournal(user.uid, journalId, current);
      setJournals(prev => prev.map(j => j.id === journalId ? { ...j, favorite: nextFav } : j));
      if (activeJournal && activeJournal.id === journalId) {
        setActiveJournal({ ...activeJournal, favorite: nextFav });
      }
      showToast(nextFav ? 'Added to favorites' : 'Removed from favorites', 'info');
    } catch {
      showToast('Failed to update favorite status', 'error');
    }
  };

  // Handler: Rename journal
  const handleRenameJournal = async (journalId: string, newTitle: string) => {
    if (!user) return;
    try {
      await firestoreService.updateJournal(user.uid, journalId, { title: newTitle });
      setJournals(prev => prev.map(j => j.id === journalId ? { ...j, title: newTitle } : j));
      if (activeJournal && activeJournal.id === journalId) {
        setActiveJournal({ ...activeJournal, title: newTitle });
      }
      showToast('Journal renamed', 'success');
    } catch {
      showToast('Failed to rename journal', 'error');
    }
  };

  // Handler: Delete journal
  const handleDeleteJournal = async (journalId: string) => {
    if (!user) return;
    try {
      await firestoreService.deleteJournal(user.uid, journalId);
      setJournals(prev => prev.filter(j => j.id !== journalId));
      if (activeJournal && activeJournal.id === journalId) {
        setActiveJournal(null);
        setCurrentView('dashboard');
      }
      showToast('Journal deleted permanently', 'info');
    } catch {
      showToast('Failed to delete journal', 'error');
    }
  };

  // Handler: Open Summary Modal
  const handleOpenSummary = async (journal: JournalEntry, existingSummary?: JournalSummary | null) => {
    if (existingSummary) {
      setActiveSummary(existingSummary);
      setSummaryModalOpen(true);
      return;
    }

    if (!user) return;

    try {
      const foundSummary = await firestoreService.getSummary(user.uid, journal.id);
      if (foundSummary) {
        setActiveSummary(foundSummary);
        setSummaryModalOpen(true);
      } else {
        showToast('No summary found for this journal yet. Open the journal and click "Summary" to generate one.', 'info');
      }
    } catch {
      showToast('Could not fetch summary', 'error');
    }
  };

  // Handler: Action item status toggle
  const handleActionStatusChange = async (actionId: string, status: 'pending' | 'in_progress' | 'completed') => {
    if (!user) return;
    try {
      await firestoreService.updateActionItemStatus(user.uid, actionId, status);
      setActionItems(prev => prev.map(a => a.id === actionId ? { ...a, status } : a));
    } catch {
      showToast('Failed to update action item', 'error');
    }
  };

  // Handler: Update Privacy Settings
  const handleUpdatePrivacySettings = async (updates: Partial<UserPrivacySettings>) => {
    if (!user) return;
    try {
      await firestoreService.savePrivacySettings(user.uid, updates);
      setPrivacySettings(prev => ({ ...prev, ...updates }));
      showToast('Privacy preferences updated', 'success');
    } catch {
      showToast('Failed to save settings', 'error');
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-xl bg-blue-700 text-white font-bold italic text-xl flex items-center justify-center shadow-lg animate-pulse mb-4">
          G
        </div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Securing Journal Sandbox...
        </p>
      </div>
    );
  }

  // If unauthenticated: Render full Landing Page with Clean Utility header
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
        <Navbar
          currentView={currentView}
          setCurrentView={(v) => setCurrentView(v)}
          onOpenNewJournal={() => {
            setAuthModalMode('signup');
            setAuthModalOpen(true);
          }}
          onOpenAuth={() => {
            setAuthModalMode('signin');
            setAuthModalOpen(true);
          }}
          onOpenPrivacy={() => setPrivacyModalOpen(true)}
          onOpenSecurity={() => setSecurityModalOpen(true)}
        />
        <main className="flex-1">
          <LandingPage
            onGetStarted={() => {
              setAuthModalMode('signup');
              setAuthModalOpen(true);
            }}
            onSignIn={() => {
              setAuthModalMode('signin');
              setAuthModalOpen(true);
            }}
          />
        </main>
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode={authModalMode}
        />
        <SecurityCenterModal
          isOpen={securityModalOpen}
          onClose={() => setSecurityModalOpen(false)}
        />
      </div>
    );
  }

  // Authenticated State: Clean Utility Sidebar + App Shell Layout
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      
      {/* Desktop Sidebar (Clean Utility Style) */}
      <aside className="hidden lg:flex w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col justify-between shrink-0">
        <div>
          {/* Top Brand Header */}
          <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold italic shadow-xs">
              G
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white tracking-tight text-sm block">
                Gemini Journal
              </span>
              <span className="text-[10px] text-slate-400 font-medium block -mt-0.5">
                Private Workspace
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 text-sm font-medium">
            <button
              id="sidebar-dashboard-btn"
              onClick={() => setCurrentView('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                currentView === 'dashboard'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              id="sidebar-journals-btn"
              onClick={() => setCurrentView('journals')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                currentView === 'journals'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>My Journals</span>
            </button>

            <button
              id="sidebar-brainstorm-btn"
              onClick={() => {
                if (!activeJournal && journals.length > 0) {
                  setActiveJournal(journals[0]);
                }
                setCurrentView('chat');
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                currentView === 'chat'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Active Chat</span>
            </button>

            <button
              id="sidebar-insights-btn"
              onClick={() => setCurrentView('insights')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                currentView === 'insights'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Insights</span>
            </button>

            <button
              id="sidebar-security-btn"
              onClick={() => setSecurityModalOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Security Center</span>
            </button>
          </nav>
        </div>

        {/* User Profile & Security Bottom Panel */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              onClick={() => setPrivacyModalOpen(true)}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800"
              title="Privacy Controls"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={async () => {
              await logout();
              setCurrentView('landing');
            }}
            className="w-full flex items-center justify-center gap-2 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop & Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-64 bg-white dark:bg-slate-900 h-full border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between p-4 z-10 animate-fade-in">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold italic">
                    G
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    Gemini Journal
                  </span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              <nav className="py-4 space-y-1 text-sm font-medium">
                <button
                  onClick={() => { setCurrentView('dashboard'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left"
                >
                  <Compass className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => { setCurrentView('journals'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>My Journals</span>
                </button>
                <button
                  onClick={() => { setCurrentView('insights'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Insights</span>
                </button>
                <button
                  onClick={() => { setSecurityModalOpen(true); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Security Center</span>
                </button>
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={async () => {
                  setMobileMenuOpen(false);
                  await logout();
                  setCurrentView('landing');
                }}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs text-rose-600 dark:text-rose-400 font-medium hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header Bar (Clean Utility) */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10 shrink-0">
          
          {/* Left Status Indicator */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                VPC Secure
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] hidden sm:inline">
                ID: {user.uid.slice(0, 8)}
              </span>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              id="topbar-new-journal-btn"
              onClick={() => handleStartNewJournal('free_journal')}
              className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Journal</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>
          </div>
        </header>

        {/* View Canvas Body */}
        <main className="flex-1 overflow-y-auto">
          {currentView === 'dashboard' && (
            <Dashboard
              journals={journals}
              summaries={summaries}
              actionItems={actionItems}
              onOpenJournal={handleOpenJournal}
              onStartNewJournal={handleStartNewJournal}
              onToggleFavorite={handleToggleFavorite}
              onViewAllJournals={() => setCurrentView('journals')}
              onViewInsights={() => setCurrentView('insights')}
            />
          )}

          {currentView === 'chat' && (
            activeJournal ? (
              <JournalChat
                journal={activeJournal}
                onBack={() => setCurrentView('dashboard')}
                onUpdateJournal={handleUpdateJournal}
                onDeleteJournal={handleDeleteJournal}
                onOpenSummary={handleOpenSummary}
              />
            ) : (
              <div className="max-w-md mx-auto py-20 text-center px-4">
                <h2 className="text-xl font-bold font-['Playfair_Display',serif]">
                  No Active Journal Selected
                </h2>
                <p className="text-xs text-slate-500 mt-2 mb-6">
                  Pick a journal from your history or start a fresh session.
                </p>
                <button
                  onClick={() => handleStartNewJournal('free_journal')}
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  + Create New Journal
                </button>
              </div>
            )
          )}

          {currentView === 'journals' && (
            <MyJournals
              journals={journals}
              onOpenJournal={handleOpenJournal}
              onCreateNew={(mode) => handleStartNewJournal(mode)}
              onToggleFavorite={handleToggleFavorite}
              onRenameJournal={handleRenameJournal}
              onDeleteJournal={handleDeleteJournal}
              onViewSummary={(j) => handleOpenSummary(j)}
            />
          )}

          {currentView === 'insights' && (
            <JournalInsights
              summaries={summaries}
              actionItems={actionItems}
              weeklyReflections={weeklyReflections}
              onActionStatusChange={handleActionStatusChange}
              onNewWeeklyReflection={(ref) => setWeeklyReflections(prev => [ref, ...prev])}
            />
          )}
        </main>

        {/* Clean Utility Footer Bar */}
        <footer className="h-10 border-t border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-900 shrink-0">
          <span>Cloud Identity Verified: Firebase-Auth-Prod-01</span>
          <span className="hidden sm:inline">System Status: Optimal</span>
          <span className="hidden md:inline">Firestore Region: us-central1</span>
        </footer>

      </div>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      <JournalSummaryModal
        isOpen={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
        summary={activeSummary}
        onActionStatusChange={handleActionStatusChange}
      />

      <PrivacySettingsModal
        isOpen={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
        journals={journals}
        summaries={summaries}
        privacySettings={privacySettings}
        onUpdatePrivacySettings={handleUpdatePrivacySettings}
        onDataWiped={() => {
          setJournals([]);
          setSummaries([]);
          setActionItems([]);
          setWeeklyReflections([]);
          setActiveJournal(null);
          setCurrentView('dashboard');
        }}
      />

      <SecurityCenterModal
        isOpen={securityModalOpen}
        onClose={() => setSecurityModalOpen(false)}
      />

    </div>
  );
};

export default App;

