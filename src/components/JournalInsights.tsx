import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { geminiService } from '../services/geminiService';
import { firestoreService } from '../services/firestoreService';
import { JournalSummary, ActionItem, GoalItem, WeeklyReflection } from '../types';
import { 
  BarChart3, 
  Sparkles, 
  Target, 
  CheckCircle2, 
  Circle, 
  Clock, 
  TrendingUp, 
  Smile, 
  Calendar, 
  Tag, 
  HelpCircle, 
  RefreshCw, 
  AlertCircle, 
  Shield,
  Layers,
  ChevronRight,
  ListTodo,
  Lightbulb
} from 'lucide-react';

interface JournalInsightsProps {
  summaries: JournalSummary[];
  actionItems: ActionItem[];
  weeklyReflections: WeeklyReflection[];
  onActionStatusChange: (actionId: string, status: 'pending' | 'in_progress' | 'completed') => void;
  onNewWeeklyReflection: (ref: WeeklyReflection) => void;
}

export const JournalInsights: React.FC<JournalInsightsProps> = ({
  summaries,
  actionItems,
  weeklyReflections,
  onActionStatusChange,
  onNewWeeklyReflection
}) => {
  const { user, getIdToken } = useAuth();
  const { showToast } = useToast();

  const [isGeneratingWeekly, setIsGeneratingWeekly] = useState(false);
  const [selectedActionFilter, setSelectedActionFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // 1. Recurring Topics computation
  const recurringTopics = useMemo(() => {
    const counts: Record<string, number> = {};
    summaries.forEach((s) => {
      (s.mainTopics || []).forEach((topic) => {
        const clean = topic.trim();
        if (clean) {
          counts[clean] = (counts[clean] || 0) + 1;
        }
      });
    });

    return Object.entries(counts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);
  }, [summaries]);

  // 2. Goals computation from summaries
  const aggregatedGoals = useMemo(() => {
    const goalsMap = new Map<string, GoalItem>();

    summaries.forEach((s) => {
      (s.goals || []).forEach((goalText) => {
        const clean = goalText.trim();
        if (!clean) return;

        const existing = goalsMap.get(clean.toLowerCase());
        if (existing) {
          existing.mentionCount += 1;
          existing.latestMention = Math.max(existing.latestMention, s.createdAt);
          if (s.title && !existing.journalTitles?.includes(s.title)) {
            existing.journalTitles?.push(s.title);
          }
        } else {
          goalsMap.set(clean.toLowerCase(), {
            id: `goal_${Math.random().toString(36).substring(2, 8)}`,
            goal: clean,
            firstMentioned: s.createdAt,
            latestMention: s.createdAt,
            status: 'active',
            mentionCount: 1,
            journalTitles: s.title ? [s.title] : []
          });
        }
      });
    });

    return Array.from(goalsMap.values()).sort((a, b) => b.mentionCount - a.mentionCount);
  }, [summaries]);

  // 3. Action Items filtering
  const filteredActions = useMemo(() => {
    if (selectedActionFilter === 'all') return actionItems;
    if (selectedActionFilter === 'completed') return actionItems.filter(a => a.status === 'completed');
    return actionItems.filter(a => a.status === 'pending' || a.status === 'in_progress');
  }, [actionItems, selectedActionFilter]);

  // 4. Mood and Reflection Trends computation
  const moodDistribution = useMemo(() => {
    const moods: Record<string, number> = {};
    summaries.forEach((s) => {
      if (s.moodTheme) {
        moods[s.moodTheme] = (moods[s.moodTheme] || 0) + 1;
      }
    });
    return Object.entries(moods).sort((a, b) => b[1] - a[1]);
  }, [summaries]);

  // 5. Weekly Reflection Generator
  const handleGenerateWeeklyReflection = async () => {
    if (!user) return;
    if (summaries.length === 0) {
      showToast('You need at least 1 saved journal summary to synthesize a weekly reflection', 'info');
      return;
    }

    setIsGeneratingWeekly(true);
    try {
      const token = await getIdToken();
      const res = await geminiService.generateWeeklyReflection(summaries, token);
      
      const fullReflection: WeeklyReflection = {
        ...res.weeklyReflection,
        userId: user.uid
      };

      await firestoreService.saveWeeklyReflection(user.uid, fullReflection);
      onNewWeeklyReflection(fullReflection);
      showToast('Weekly Gemini Meta-Reflection synthesized!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to generate weekly reflection', 'error');
    } finally {
      setIsGeneratingWeekly(false);
    }
  };

  const latestWeekly = weeklyReflections[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Authenticated Privacy Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-['Playfair_Display',serif]">
            Gemini Journal Insights
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Synthesizing patterns, goals, and breakthroughs across your private journal summaries.
          </p>
        </div>

        {/* Privacy Notice Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
          <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Strict User Partition: Only your data is analyzed</span>
        </div>
      </div>

      {summaries.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-center max-w-lg mx-auto">
          <Sparkles className="w-10 h-10 text-blue-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No Journal Summaries Yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Create a journal session and click <strong>"Summary"</strong> to unlock recurring topics, goal tracking, action item management, and weekly reflections.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Section 5: Weekly Gemini Meta-Reflection */}
          <section className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-indigo-700 via-blue-800 to-slate-900 text-white shadow-md relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-white/20 text-white border border-white/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white font-['Playfair_Display',serif]">
                    Weekly Gemini Reflection
                  </h2>
                  <p className="text-xs text-blue-100">
                    High-level meta-synthesis of what you explored and learned recently.
                  </p>
                </div>
              </div>

              <button
                id="btn-generate-weekly-reflection"
                onClick={handleGenerateWeeklyReflection}
                disabled={isGeneratingWeekly}
                className="px-4 py-2 rounded-lg bg-white text-blue-900 hover:bg-blue-50 font-semibold text-xs shadow-xs flex items-center gap-2 transition-colors disabled:opacity-50 self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingWeekly ? 'animate-spin' : ''}`} />
                <span>{isGeneratingWeekly ? 'Synthesizing Wisdom...' : 'Generate Reflection'}</span>
              </button>
            </div>

            {latestWeekly ? (
              <div className="space-y-6 text-xs sm:text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Focus Highlights */}
                  <div className="p-5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-200 mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>What You Focused On</span>
                    </h3>
                    <p className="text-slate-100 leading-relaxed">
                      {latestWeekly.focusHighlights}
                    </p>
                  </div>

                  {/* Key Learnings */}
                  <div className="p-5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-2 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>Key Learnings & Realizations</span>
                    </h3>
                    <p className="text-slate-100 leading-relaxed">
                      {latestWeekly.keyLearnings}
                    </p>
                  </div>

                </div>

                {/* Recurring Themes & Goals Progress */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-200 mb-2 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Recurring Themes</span>
                    </h3>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {latestWeekly.recurringThemes?.map((theme, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-white/15 text-xs text-white">
                          #{theme}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-2 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      <span>Goal Trajectory & Momentum</span>
                    </h3>
                    <p className="text-slate-100 leading-relaxed">
                      {latestWeekly.goalsProgress}
                    </p>
                  </div>
                </div>

                {/* Inspirational Thought for the Week */}
                {latestWeekly.inspirationalThought && (
                  <div className="p-4 rounded-xl bg-white/15 border border-white/20 text-center italic text-xs text-blue-100">
                    "{latestWeekly.inspirationalThought}"
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-xs text-slate-300">
                  Click <strong>"Generate Reflection"</strong> above to produce a personalized weekly AI synthesis from your {summaries.length} saved summaries.
                </p>
              </div>
            )}
          </section>

          {/* Grid Layout: Recurring Topics & Goals Mentioned */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Section 1: Recurring Topics (5 cols) */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white font-['Playfair_Display',serif]">
                    1. Recurring Topics
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Themes appearing most frequently across your reflections.
                </p>

                <div className="space-y-2.5">
                  {recurringTopics.slice(0, 7).map(({ topic, count }, idx) => {
                    const maxCount = recurringTopics[0]?.count || 1;
                    const pct = Math.round((count / maxCount) * 100);

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-800 dark:text-slate-200 font-semibold">{topic}</span>
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">{count} mentions</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div 
                            className="h-full bg-blue-700 dark:bg-blue-500 rounded-full transition-all duration-500" 
                            style={{ width: `${pct}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                Tracking {recurringTopics.length} distinct subject tags
              </div>
            </div>

            {/* Section 2: Goals Mentioned (7 cols) */}
            <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-rose-500" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white font-['Playfair_Display',serif]">
                    2. Goals Mentioned
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Aspirations and objectives extracted from your sessions.
                </p>

                {aggregatedGoals.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No specific goals detected in summaries yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                    {aggregatedGoals.map((g) => (
                      <div
                        key={g.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex-1">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                            {g.goal}
                          </h3>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                            <span>First: {new Date(g.firstMentioned).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            <span>•</span>
                            <span>Latest: {new Date(g.latestMention).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            <span>•</span>
                            <span>{g.mentionCount} {g.mentionCount === 1 ? 'time' : 'times'}</span>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px] self-start sm:self-auto">
                          Active Goal
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                {aggregatedGoals.length} goals actively tracked
              </div>
            </div>

          </div>

          {/* Section 3: Action Items & Next Steps */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white font-['Playfair_Display',serif]">
                  3. Action Items from Journals
                </h2>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
                <button
                  onClick={() => setSelectedActionFilter('all')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    selectedActionFilter === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  All ({actionItems.length})
                </button>
                <button
                  onClick={() => setSelectedActionFilter('pending')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    selectedActionFilter === 'pending'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  Pending ({actionItems.filter(a => a.status !== 'completed').length})
                </button>
                <button
                  onClick={() => setSelectedActionFilter('completed')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    selectedActionFilter === 'completed'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  Completed ({actionItems.filter(a => a.status === 'completed').length})
                </button>
              </div>
            </div>

            {filteredActions.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">No action items in this view.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {filteredActions.map((action) => {
                  const isDone = action.status === 'completed';
                  return (
                    <div
                      key={action.id}
                      onClick={() => onActionStatusChange(action.id, isDone ? 'pending' : 'completed')}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isDone
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-slate-400 line-through'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{action.text}</p>
                        {action.journalTitle && (
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            From: {action.journalTitle}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 4: Reflection Trends & Moods */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smile className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white font-['Playfair_Display',serif]">
                  4. Reflection & Mood Trends
                </h2>
              </div>
              <span className="text-[11px] text-slate-400">
                Self-reflection aid • Not a clinical diagnosis
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {moodDistribution.map(([mood, count], i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center"
                >
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {count}
                  </div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 capitalize">
                    {mood}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {Math.round((count / summaries.length) * 100)}% of journals
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
