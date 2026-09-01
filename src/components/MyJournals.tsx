import React, { useState, useMemo } from 'react';
import { JournalEntry, JournalMode, JournalSummary } from '../types';
import { 
  Search, 
  Plus, 
  Star, 
  BookOpen, 
  Calendar, 
  MessageSquare, 
  FileText, 
  Trash2, 
  Edit3, 
  Filter, 
  ArrowUpDown,
  Tag,
  Check,
  X
} from 'lucide-react';

interface MyJournalsProps {
  journals: JournalEntry[];
  onOpenJournal: (journalId: string) => void;
  onCreateNew: (mode: JournalMode) => void;
  onToggleFavorite: (journalId: string, current: boolean) => void;
  onRenameJournal: (journalId: string, newTitle: string) => void;
  onDeleteJournal: (journalId: string) => void;
  onViewSummary: (journal: JournalEntry) => void;
}

export const MyJournals: React.FC<MyJournalsProps> = ({
  journals,
  onOpenJournal,
  onCreateNew,
  onToggleFavorite,
  onRenameJournal,
  onDeleteJournal,
  onViewSummary
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'messages'>('newest');

  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');

  // Filter & sort logic
  const displayedJournals = useMemo(() => {
    return journals
      .filter((j) => {
        if (favoritesOnly && !j.favorite) return false;
        if (selectedMode !== 'all' && j.mode !== selectedMode) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = j.title.toLowerCase().includes(q);
          const matchSummary = (j.summary || '').toLowerCase().includes(q);
          const matchMood = (j.mood || '').toLowerCase().includes(q);
          const matchTags = (j.tags || []).some(t => t.toLowerCase().includes(q));
          if (!matchTitle && !matchSummary && !matchMood && !matchTags) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt);
        if (sortBy === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0);
        if (sortBy === 'messages') return (b.messageCount || 0) - (a.messageCount || 0);
        return 0;
      });
  }, [journals, searchQuery, selectedMode, favoritesOnly, sortBy]);

  const handleStartRename = (j: JournalEntry) => {
    setEditingJournalId(j.id);
    setEditTitleText(j.title);
  };

  const handleSaveRename = (journalId: string) => {
    if (editTitleText.trim()) {
      onRenameJournal(journalId, editTitleText.trim());
    }
    setEditingJournalId(null);
  };

  const modesList: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Modes' },
    { id: 'free_journal', label: 'Free Journal' },
    { id: 'brainstorm', label: 'Brainstorm' },
    { id: 'reflection', label: 'Reflection' },
    { id: 'problem_solving', label: 'Problem Solving' },
    { id: 'goal_planning', label: 'Goal Planning' },
    { id: 'study_notes', label: 'Study Notes' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-['Playfair_Display',serif]">
            My Journals & Reflections
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse, search, revisit, and organize your private thoughts.
          </p>
        </div>

        <button
          onClick={() => onCreateNew('free_journal')}
          className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-medium text-xs shadow-xs flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Journal</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col lg:flex-row gap-3.5 justify-between items-stretch lg:items-center">
        
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            id="input-my-journals-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords, topics, or mood..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          
          {/* Mode Filter */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 shadow-2xs overflow-x-auto max-w-full">
            {modesList.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMode(m.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all shrink-0 ${
                  selectedMode === m.id
                    ? 'bg-blue-700 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Favorites Filter Button */}
          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors shadow-2xs ${
              favoritesOnly
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 font-semibold'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${favoritesOnly ? 'text-amber-500 fill-amber-500' : ''}`} />
            <span>Favorites</span>
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="newest" className="dark:bg-slate-900">Newest</option>
              <option value="oldest" className="dark:bg-slate-900">Oldest</option>
              <option value="messages" className="dark:bg-slate-900">Most Messages</option>
            </select>
          </div>

        </div>
      </div>

      {/* Journals Grid */}
      {displayedJournals.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/40 dark:bg-slate-900/40 text-center max-w-lg mx-auto">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No journals match your criteria
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {searchQuery || selectedMode !== 'all' || favoritesOnly
              ? 'Try resetting the filters or clearing the search query.'
              : 'Create your first private reflection session with Gemini.'}
          </p>
          {(searchQuery || selectedMode !== 'all' || favoritesOnly) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedMode('all');
                setFavoritesOnly(false);
              }}
              className="mt-4 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-300"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedJournals.map((journal) => (
            <div
              key={journal.id}
              id={`my-journal-${journal.id}`}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Card Top Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                    {journal.mode.replace('_', ' ')}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onToggleFavorite(journal.id, journal.favorite)}
                      className="p-1 text-slate-400 hover:text-amber-500 transition-colors"
                      title={journal.favorite ? 'Favorited' : 'Add to favorites'}
                    >
                      <Star className={`w-4 h-4 ${journal.favorite ? 'text-amber-500 fill-amber-500' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Title or Rename input */}
                {editingJournalId === journal.id ? (
                  <div className="flex items-center gap-1 mb-2">
                    <input
                      type="text"
                      value={editTitleText}
                      onChange={(e) => setEditTitleText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(journal.id)}
                      className="flex-1 px-2.5 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-blue-500 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveRename(journal.id)}
                      className="p-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingJournalId(null)}
                      className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-600 rounded-md"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2
                      onClick={() => onOpenJournal(journal.id)}
                      className="font-bold text-sm sm:text-base text-slate-900 dark:text-white cursor-pointer hover:text-blue-700 dark:hover:text-blue-400 transition-colors line-clamp-2 font-['Playfair_Display',serif]"
                    >
                      {journal.title}
                    </h2>
                    <button
                      onClick={() => handleStartRename(journal)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Rename journal"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Summary / Snippet */}
                <p 
                  onClick={() => onOpenJournal(journal.id)}
                  className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed cursor-pointer"
                >
                  {journal.summary || 'Click to open and reflect on your thoughts...'}
                </p>

                {/* Tags if available */}
                {journal.tags && journal.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {journal.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(journal.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    <span>{journal.messageCount || 0}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {journal.hasSummary && (
                    <button
                      onClick={() => onViewSummary(journal)}
                      className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold text-[10px] hover:bg-blue-100 flex items-center gap-1"
                      title="View structured summary"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Summary</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${journal.title}" and all its reflections?`)) {
                        onDeleteJournal(journal.id);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors"
                    title="Delete journal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

