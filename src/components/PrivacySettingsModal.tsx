import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { firestoreService } from '../services/firestoreService';
import { JournalEntry, JournalSummary, UserPrivacySettings } from '../types';
import { 
  X, 
  Shield, 
  Trash2, 
  Download, 
  AlertTriangle, 
  Lock, 
  Check, 
  Database,
  EyeOff,
  Sparkles,
  LogOut
} from 'lucide-react';

interface PrivacySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  journals: JournalEntry[];
  summaries: JournalSummary[];
  privacySettings: UserPrivacySettings;
  onUpdatePrivacySettings: (settings: Partial<UserPrivacySettings>) => void;
  onDataWiped: () => void;
}

export const PrivacySettingsModal: React.FC<PrivacySettingsModalProps> = ({
  isOpen,
  onClose,
  journals,
  summaries,
  privacySettings,
  onUpdatePrivacySettings,
  onDataWiped
}) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [isWiping, setIsWiping] = useState(false);
  const [showWipeDialog, setShowWipeDialog] = useState(false);

  if (!isOpen) return null;

  const handleExportData = () => {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      user: {
        uid: user?.uid,
        email: user?.email,
        displayName: user?.displayName
      },
      journalsCount: journals.length,
      summariesCount: summaries.length,
      journals,
      summaries
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `personal_gemini_journal_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast('Your private journal data archive has been downloaded.', 'success');
  };

  const handleWipeAllData = async () => {
    if (confirmDeleteText !== 'DELETE' || !user) return;

    setIsWiping(true);
    try {
      await firestoreService.deleteAllUserData(user.uid);
      showToast('All your journal data and summaries have been permanently deleted.', 'success');
      onDataWiped();
      setShowWipeDialog(false);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to wipe data', 'error');
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-fade-in">
      <div 
        id="privacy-settings-card"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] shadow-lg overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-['Playfair_Display',serif]">
                Privacy & Data Controls
              </h2>
              <p className="text-xs text-slate-300">
                Manage personal storage, export archives, and delete data.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
          
          {/* Data Summary Stats */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-around text-center">
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{journals.length}</div>
              <div className="text-[11px] text-slate-500">Journals Stored</div>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
            <div>
              <div className="text-lg font-bold text-blue-700 dark:text-blue-400">{summaries.length}</div>
              <div className="text-[11px] text-slate-500">Summaries</div>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
            <div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">100%</div>
              <div className="text-[11px] text-slate-500">Isolated UID</div>
            </div>
          </div>

          {/* Privacy Toggles */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Feature Preferences
            </h3>

            {/* Enable Insights Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div>
                <h4 className="font-semibold text-xs text-slate-900 dark:text-white">
                  Enable Gemini Journal Insights
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Allow long-term synthesis of your recurring topics and goal progress.
                </p>
              </div>
              <input
                type="checkbox"
                checked={privacySettings.enableInsights}
                onChange={(e) => onUpdatePrivacySettings({ enableInsights: e.target.checked })}
                className="w-4 h-4 rounded text-blue-700 focus:ring-blue-600"
              />
            </div>

            {/* Mood Tracking Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div>
                <h4 className="font-semibold text-xs text-slate-900 dark:text-white">
                  Enable Mood & Reflection Tags
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Generate descriptive sentiment tags during summary synthesis.
                </p>
              </div>
              <input
                type="checkbox"
                checked={privacySettings.enableMoodTracking}
                onChange={(e) => onUpdatePrivacySettings({ enableMoodTracking: e.target.checked })}
                className="w-4 h-4 rounded text-blue-700 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Data Export */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Export Archive
            </h3>
            <button
              onClick={handleExportData}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 font-medium text-xs shadow-2xs transition-colors"
            >
              <Download className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <span>Download Complete Journal Archive (.JSON)</span>
            </button>
          </div>

          {/* Danger Zone: Delete All Data */}
          <div className="pt-4 border-t border-rose-100 dark:border-rose-950/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Danger Zone</span>
            </h3>

            {!showWipeDialog ? (
              <button
                id="btn-open-wipe-data"
                onClick={() => setShowWipeDialog(true)}
                className="w-full p-2.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete All My Journal Data</span>
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-3">
                <p className="text-xs text-rose-800 dark:text-rose-300 font-medium">
                  This action is permanent and irreversible. All your journals, chat transcripts, summaries, and action items will be immediately wiped from Firestore.
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-rose-900 dark:text-rose-200 mb-1">
                    Type "DELETE" to confirm:
                  </label>
                  <input
                    type="text"
                    id="input-confirm-delete-all"
                    value={confirmDeleteText}
                    onChange={(e) => setConfirmDeleteText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="btn-confirm-wipe-all"
                    onClick={handleWipeAllData}
                    disabled={confirmDeleteText !== 'DELETE' || isWiping}
                    className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-lg font-semibold text-xs transition-colors"
                  >
                    {isWiping ? 'Wiping Data...' : 'Permanently Delete Everything'}
                  </button>
                  <button
                    onClick={() => { setShowWipeDialog(false); setConfirmDeleteText(''); }}
                    className="py-2 px-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <button
            onClick={async () => {
              await logout();
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out of Account</span>
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
