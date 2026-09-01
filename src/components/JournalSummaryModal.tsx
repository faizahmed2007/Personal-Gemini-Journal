import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { firestoreService } from '../services/firestoreService';
import { JournalSummary } from '../types';
import { 
  X, 
  Sparkles, 
  Copy, 
  Check, 
  CheckCircle2, 
  Circle, 
  Tag, 
  HelpCircle, 
  Target, 
  Compass, 
  Calendar,
  Share2
} from 'lucide-react';

interface JournalSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: JournalSummary | null;
  onActionStatusChange?: (actionId: string, newStatus: 'pending' | 'completed') => void;
}

export const JournalSummaryModal: React.FC<JournalSummaryModalProps> = ({
  isOpen,
  onClose,
  summary,
  onActionStatusChange
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [localActions, setLocalActions] = useState<Array<{ id: string; text: string; status: 'pending' | 'in_progress' | 'completed' }>>(
    summary?.actionItems || []
  );

  if (!isOpen || !summary) return null;

  const handleToggleAction = async (actionId: string, currentStatus: string) => {
    if (!user) return;
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    setLocalActions(prev => prev.map(a => a.id === actionId ? { ...a, status: nextStatus } : a));

    try {
      await firestoreService.updateActionItemStatus(user.uid, actionId, nextStatus);
      if (onActionStatusChange) {
        onActionStatusChange(actionId, nextStatus);
      }
      showToast(nextStatus === 'completed' ? 'Action item marked complete' : 'Action item reopened', 'success');
    } catch {
      showToast('Failed to update action item status', 'error');
    }
  };

  const handleCopyMarkdown = () => {
    const md = `## 📖 Journal Summary: ${summary.title}
*Date: ${new Date(summary.createdAt).toLocaleDateString()} | Mood Theme: ${summary.moodTheme || 'Reflective'}*

### 📝 Executive Summary
${summary.shortSummary}

### 🏷️ Main Topics
${(summary.mainTopics || []).map(t => `- ${t}`).join('\n')}

### 💡 Key Realizations & Breakthroughs
${(summary.keyIdeas || []).map(k => `- ${k}`).join('\n')}

${(summary.importantDecisions || []).length > 0 ? `### 🎯 Important Decisions\n${summary.importantDecisions.map(d => `- ${d}`).join('\n')}\n` : ''}

### ✅ Action Items
${localActions.map(a => `- [${a.status === 'completed' ? 'x' : ' '}] ${a.text}`).join('\n')}

### 🚀 Goals Mentioned
${(summary.goals || []).map(g => `- ${g}`).join('\n')}

### ❓ Questions to Revisit in Future Sessions
${(summary.questionsToRevisit || []).map(q => `- ${q}`).join('\n')}
`;

    navigator.clipboard.writeText(md);
    setCopied(true);
    showToast('Formatted summary copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-fade-in">
      <div 
        id="journal-summary-card"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-lg overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 dark:bg-slate-950 text-white relative flex items-start justify-between border-b border-slate-800">
          <div className="flex-1 pr-6">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-600/30 border border-blue-500/30 text-[10px] uppercase font-bold tracking-wider text-blue-200">
                Gemini AI Summary
              </span>
              {summary.moodTheme && (
                <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-[10px] font-semibold text-white">
                  Mood: {summary.moodTheme}
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold tracking-tight text-white font-['Playfair_Display',serif]">
              {summary.title}
            </h2>

            <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{new Date(summary.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            aria-label="Close summary modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
          
          {/* Executive Summary */}
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Executive Synthesis</span>
            </h3>
            <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
              {summary.shortSummary}
            </p>
          </div>

          {/* Main Topics */}
          {summary.mainTopics && summary.mainTopics.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Key Topics & Themes</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {summary.mainTopics.map((topic, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    #{topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key Ideas & Realizations */}
          {summary.keyIdeas && summary.keyIdeas.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Realizations & Insights</span>
              </h3>
              <ul className="space-y-2">
                {summary.keyIdeas.map((idea, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                    <span>{idea}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Important Decisions (if any) */}
          {summary.importantDecisions && summary.importantDecisions.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Important Decisions</span>
              </h3>
              <ul className="space-y-2">
                {summary.importantDecisions.map((dec, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                    <span>{dec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Items with checkable statuses */}
          {localActions && localActions.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Action Items & Next Steps</span>
              </h3>
              <div className="space-y-2">
                {localActions.map((action) => {
                  const isDone = action.status === 'completed';
                  return (
                    <div
                      key={action.id}
                      onClick={() => handleToggleAction(action.id, action.status)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center gap-3 ${
                        isDone 
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-slate-400 dark:text-slate-500 line-through'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className="text-xs font-medium flex-1">{action.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Goals */}
          {summary.goals && summary.goals.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-rose-500" />
                <span>Goals Identified</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {summary.goals.map((goal, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-medium text-rose-900 dark:text-rose-300"
                  >
                    🎯 {goal}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Questions to Revisit */}
          {summary.questionsToRevisit && summary.questionsToRevisit.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>Questions for Future Reflections</span>
              </h3>
              <ul className="space-y-2">
                {summary.questionsToRevisit.map((q, i) => (
                  <li key={i} className="p-3 rounded-lg bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-slate-700 dark:text-slate-300 italic">
                    "{q}"
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Markdown' : 'Copy Markdown'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
