import React from 'react';
import { AlertTriangle, Send, Trash2, X, ShieldAlert } from 'lucide-react';

export interface GmailConfirmationData {
  type: 'send' | 'trash';
  title: string;
  description: string;
  details?: {
    recipient?: string;
    subject?: string;
    messageCount?: number;
    previewText?: string;
  };
  onConfirm: () => Promise<void> | void;
}

interface GmailConfirmationModalProps {
  data: GmailConfirmationData | null;
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

export const GmailConfirmationModal: React.FC<GmailConfirmationModalProps> = ({
  data,
  isOpen,
  onClose,
  isLoading = false
}) => {
  if (!isOpen || !data) return null;

  const isDestructive = data.type === 'trash';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div 
        id="gmail-confirmation-modal"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-scale-in"
      >
        {/* Header */}
        <div className={`p-5 flex items-center gap-3 border-b ${
          isDestructive 
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/60 text-rose-900 dark:text-rose-200' 
            : 'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/60 text-blue-900 dark:text-blue-200'
        }`}>
          <div className={`p-2 rounded-lg ${
            isDestructive 
              ? 'bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300' 
              : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
          }`}>
            {isDestructive ? <Trash2 className="w-5 h-5" /> : <Send className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm">
              {data.title}
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
              {isDestructive ? 'Action Requires Confirmation' : 'Explicit Authorization Required'}
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            {data.description}
          </p>

          {data.details && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              {data.details.recipient && (
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 w-16 shrink-0">To:</span>
                  <span className="font-medium text-slate-900 dark:text-white break-all">{data.details.recipient}</span>
                </div>
              )}
              {data.details.subject && (
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 w-16 shrink-0">Subject:</span>
                  <span className="font-medium text-slate-900 dark:text-white truncate">{data.details.subject}</span>
                </div>
              )}
              {data.details.previewText && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Preview:</span>
                  <p className="text-slate-600 dark:text-slate-400 italic line-clamp-3 text-[11px] leading-relaxed">
                    "{data.details.previewText}"
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {isDestructive 
                ? 'This email will be moved to your Gmail Trash folder.'
                : 'This email will be dispatched directly through your connected Gmail account.'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            id="modal-cancel-btn"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            id="modal-confirm-btn"
            onClick={async () => {
              await data.onConfirm();
              onClose();
            }}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-blue-700 hover:bg-blue-600'
            } disabled:opacity-50`}
          >
            {isLoading ? (
              <span>Processing...</span>
            ) : (
              <>
                {isDestructive ? <Trash2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                <span>{isDestructive ? 'Confirm Move to Trash' : 'Confirm & Send Email'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
