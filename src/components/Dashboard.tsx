import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { JournalEntry, JournalMode, JournalSummary, ActionItem } from '../types';
import { 
  Plus, 
  Search, 
  Star, 
  Sparkles, 
  Compass, 
  Lightbulb, 
  Target, 
  Zap, 
  BookOpen, 
  BarChart3, 
  ArrowRight, 
  Clock, 
  Calendar,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface DashboardProps {
  journals: JournalEntry[];
  summaries: JournalSummary[];
  actionItems: ActionItem[];
  onOpenJournal: (journalId: string) => void;
  onStartNewJournal: (mode: JournalMode, initialPrompt?: string, customTitle?: string) => void;
  onToggleFavorite: (journalId: string, current: boolean) => void;
  onViewAllJournals: () => void;
  onViewInsights: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  journals,
  summaries,
  actionItems,
  onOpenJournal,
  onStartNewJournal,
  onToggleFavorite,
  onViewAllJournals,
  onViewInsights
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [quickBrainstormInput, setQuickBrainstormInput] = useState('');

  // Filter journals based on search query
  const filteredJournals = useMemo(() => {
    if (!searchQuery.trim()) return journals;
    const q = searchQuery.toLowerCase();
    return journals.filter(j => 
      j.title.toLowerCase().includes(q) ||
      (j.summary && j.summary.toLowerCase().includes(q)) ||
      j.mode.toLowerCase().includes(q) ||
      (j.mood && j.mood.toLowerCase().includes(q))
    );
  }, [journals, searchQuery]);

  // Recent and favorite journals
  const recentJournals = useMemo(() => filteredJournals.slice(0, 4), [filteredJournals]);
  const favoriteJournals = useMemo(() => journals.filter(j => j.favorite).slice(0, 4), [journals]);

  // Quick statistics
  const pendingActionsCount = actionItems.filter(a => a.status === 'pending').length;
  const totalSummariesCount = summaries.length;
  
  // Aggregate recurring topics from summaries
  const topTopics = useMemo(() => {
    const counts: Record<string, number> = {};
    summaries.forEach(s => {
      (s.mainTopics || []).forEach(t => {
        const clean = t.trim();
        if (clean) counts[clean] = (counts[clean] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [summaries]);

  const handleQuickBrainstormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBrainstormInput.trim()) return;
    onStartNewJournal('brainstorm', quickBrainstormInput.trim(), 'Quick Brainstorm Session');
    setQuickBrainstormInput('');
  };

  const modeOptions: Array<{
    id: JournalMode;
    label: string;
    description: string;
    icon: any;
    accentBg: string;
    accentText: string;
  }> = [
    {
      id: 'free_journal',
      label: 'Free Journal',
      description: 'Unfiltered stream of thoughts & daily reflections',
      icon: Compass,
      accentBg: 'bg-blue-50 dark:bg-blue-950/60',
      accentText: 'text-blue-700 dark:text-blue-300'
    },
    {
      id: 'brainstorm',
      label: 'Brainstorm',
      description: 'Creative ideation, novel connections & concepts',
      icon: Lightbulb,
      accentBg: 'bg-amber-50 dark:bg-amber-950/60',
      accentText: 'text-amber-700 dark:text-amber-300'
    },
    {
      id: 'reflection',
      label: 'Reflection',
      description: 'Deep introspection, wisdom & lessons learned',
      icon: Sparkles,
      accentBg: 'bg-indigo-50 dark:bg-indigo-950/60',
      accentText: 'text-indigo-700 dark:text-indigo-300'
    },
    {
      id: 'problem_solving',
      label: 'Problem Solving',
      description: 'Deconstruct obstacles into structured clarity',
      icon: Zap,
      accentBg: 'bg-emerald-50 dark:bg-emerald-950/60',
      accentText: 'text-emerald-700 dark:text-emerald-300'
    },
    {
      id: 'goal_planning',
      label: 'Goal Planning',
      description: 'Architect habits, systems & milestone execution',
      icon: Target,
      accentBg: 'bg-rose-50 dark:bg-rose-950/60',
      accentText: 'text-rose-700 dark:text-rose-300'
    },
    {
      id: 'study_notes',
      label: 'Study Notes',
      description: 'Synthesize research, books & intellectual concepts',
      icon: BookOpen,
      accentBg: 'bg-cyan-50 dark:bg-cyan-950/60',
      accentText: 'text-cyan-700 dark:text-cyan-300'
    }
  ];

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Friend';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Private Sanctuary</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-['Playfair_Display',serif]">
            Good to see you, {displayName}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal">
            What would you like to explore or reflect on today?
          </p>
        </div>

        {/* Primary CTA */}
        <div className="flex items-center gap-3">
          <button
            id="dashboard-new-journal-btn"
            onClick={() => onStartNewJournal('free_journal')}
            className="px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-medium text-xs shadow-xs flex items-center gap-2 transition-colors group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
            <span>+ New Journal</span>
          </button>
        </div>
      </div>

      {/* Mode Launch Bar (6 modes quick access) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Select Journaling Mode
          </h2>
          <span className="text-[11px] text-slate-400">
            Tailored AI Reflection Frameworks
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {modeOptions.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                id={`btn-mode-${mode.id}`}
                onClick={() => onStartNewJournal(mode.id)}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 shadow-2xs hover:shadow-xs transition-all text-left group flex flex-col justify-between"
              >
                <div className={`w-8 h-8 rounded-lg ${mode.accentBg} ${mode.accentText} flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-slate-900 dark:text-white leading-tight">
                    {mode.label}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-snug">
                    {mode.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Brainstorm Box & Search Bar in Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Quick Brainstorm Section (7 cols) - Clean Utility Hero Card */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-700 to-blue-900 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20 text-white">
                <Lightbulb className="w-4 h-4" />
              </div>
              <h2 className="text-xs uppercase font-bold tracking-wider text-blue-100">
                Quick Brainstorm
              </h2>
            </div>
            <h3 className="text-xl font-bold font-['Playfair_Display',serif] text-white">
              Spark an Idea with Gemini
            </h3>
            <p className="text-xs text-blue-100 mt-1 max-w-lg leading-relaxed">
              Drop an unpolished thought, challenge, or question. Gemini will jump in immediately with structured creative angles.
            </p>
          </div>

          <form onSubmit={handleQuickBrainstormSubmit} className="mt-6">
            <div className="relative">
              <input
                type="text"
                id="input-quick-brainstorm"
                value={quickBrainstormInput}
                onChange={(e) => setQuickBrainstormInput(e.target.value)}
                placeholder="E.g. How do I build a sustainable morning routine without waking up at 5am?"
                className="w-full pl-4 pr-12 py-2.5 bg-white/15 backdrop-blur-md border border-white/25 rounded-lg text-xs sm:text-sm text-white placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all shadow-inner"
              />
              <button
                type="submit"
                disabled={!quickBrainstormInput.trim()}
                className="absolute right-1.5 top-1.5 p-1.5 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-40 rounded-md transition-colors shadow-2xs"
                title="Launch Brainstorm session"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Search Journal History & Insights Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
              Search Journal History
            </h2>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                id="input-dashboard-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by keyword, topic, mood..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Mini Insights Overview */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                Journal Insights Summary
              </span>
              <button
                onClick={onViewInsights}
                className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                View full <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {journals.length}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Journals
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="text-lg font-bold text-blue-700 dark:text-blue-400">
                  {totalSummariesCount}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Summaries
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {pendingActionsCount}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Action Items
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Recent Journals */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-['Playfair_Display',serif]">
              Recent Journals
            </h2>
          </div>
          {journals.length > 0 && (
            <button
              onClick={onViewAllJournals}
              className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>View all ({journals.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentJournals.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-center">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {searchQuery ? 'No matching journal entries found' : 'Your journal is empty'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'Try searching for different terms or clear the filter.'
                : 'Start a free stream of consciousness or a structured reflection with Gemini.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => onStartNewJournal('free_journal')}
                className="mt-4 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-medium text-xs shadow-xs"
              >
                Create your first journal
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentJournals.map((journal) => (
              <div
                key={journal.id}
                id={`journal-card-${journal.id}`}
                onClick={() => onOpenJournal(journal.id)}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {journal.mode.replace('_', ' ')}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(journal.id, journal.favorite);
                      }}
                      className="text-slate-400 hover:text-amber-500 p-1 -mr-1"
                      title={journal.favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className={`w-4 h-4 ${journal.favorite ? 'text-amber-500 fill-amber-500' : ''}`} />
                    </button>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                    {journal.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                    {journal.summary || 'Click to resume your thoughts, reflection, and Gemini conversation...'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(journal.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {journal.mood && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium">
                        {journal.mood}
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <span>{journal.messageCount || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Favorite Journals (if any) */}
      {favoriteJournals.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-['Playfair_Display',serif]">
              Favorite Journals
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {favoriteJournals.map((journal) => (
              <div
                key={journal.id}
                onClick={() => onOpenJournal(journal.id)}
                className="p-5 rounded-2xl border border-amber-200/60 dark:border-amber-900/30 bg-amber-50/20 dark:bg-amber-950/10 hover:border-amber-400 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      {journal.mode.replace('_', ' ')}
                    </span>
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                    {journal.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                    {journal.summary || 'Favorite reflection'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-amber-100 dark:border-amber-900/40 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{new Date(journal.createdAt).toLocaleDateString()}</span>
                  <span>{journal.messageCount || 0} messages</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 4: Recurring Topics Highlights */}
      {topTopics.length > 0 && (
        <section className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Frequently Recurring Reflection Topics
              </h2>
            </div>
            <button
              onClick={onViewInsights}
              className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
            >
              Analyze in Insights
            </button>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {topTopics.map(([topic, count], idx) => (
              <div
                key={idx}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2"
              >
                <span className="font-medium">{topic}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

