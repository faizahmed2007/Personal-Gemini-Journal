import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { gmailService } from '../services/gmailService';
import { geminiService } from '../services/geminiService';
import { GmailConfirmationModal, GmailConfirmationData } from './GmailConfirmationModal';
import { Send, X, Sparkles, Wand2, Paperclip, AlertCircle, RefreshCw } from 'lucide-react';

interface GmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  threadId?: string;
  inReplyTo?: string;
  onSent?: () => void;
}

export const GmailComposeModal: React.FC<GmailComposeModalProps> = ({
  isOpen,
  onClose,
  initialTo = '',
  initialSubject = '',
  initialBody = '',
  threadId,
  inReplyTo,
  onSent
}) => {
  const { getGoogleAccessToken, getIdToken } = useAuth();
  const { showToast } = useToast();

  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [isSending, setIsSending] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [confirmData, setConfirmData] = useState<GmailConfirmationData | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTo(initialTo);
      setSubject(initialSubject);
      setBody(initialBody);
    }
  }, [isOpen, initialTo, initialSubject, initialBody]);

  if (!isOpen) return null;

  const handlePolishWithGemini = async (tone: string = 'warm and professional') => {
    if (!body.trim()) {
      showToast('Write a rough draft first so Gemini can enhance it', 'info');
      return;
    }

    setIsPolishing(true);
    try {
      const authToken = await getIdToken();
      const res = await geminiService.draftEmailReply(
        { subject, from: to, bodyText: '' },
        `Rewrite and polish this draft email with high clarity and excellent flow: "${body}"`,
        tone,
        authToken
      );
      if (res.replyText) {
        setBody(res.replyText.trim());
        showToast('Email draft polished by Gemini', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to enhance draft', 'error');
    } finally {
      setIsPolishing(false);
    }
  };

  const handleInitiateSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim()) {
      showToast('Please specify at least one recipient email address', 'error');
      return;
    }
    if (!subject.trim()) {
      showToast('Please add a subject line', 'error');
      return;
    }
    if (!body.trim()) {
      showToast('Email message body cannot be empty', 'error');
      return;
    }

    // Trigger mandatory explicit user confirmation before executing Workspace mutation
    setConfirmData({
      type: 'send',
      title: 'Authorize Sending Email',
      description: `You are about to dispatch this email from your connected Gmail address to ${to}.`,
      details: {
        recipient: to,
        subject: subject,
        previewText: body
      },
      onConfirm: executeSend
    });
  };

  const executeSend = async () => {
    setIsSending(true);
    try {
      const googleToken = await getGoogleAccessToken();
      if (!googleToken) {
        throw new Error('Gmail session has expired. Please reconnect Gmail in your profile.');
      }

      await gmailService.sendEmail(googleToken, {
        to: to.trim(),
        subject: subject.trim(),
        body: body.trim(),
        threadId,
        inReplyTo
      });

      showToast('Email sent successfully via Gmail', 'success');
      if (onSent) onSent();
      onClose();
    } catch (err: any) {
      console.error('Send email error:', err);
      showToast(err.message || 'Failed to dispatch email', 'error');
    } finally {
      setIsSending(false);
      setConfirmData(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
        <div 
          id="gmail-compose-modal"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-600 text-white">
                <Send className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-white font-['Playfair_Display',serif]">
                {inReplyTo ? 'Reply to Email' : 'Compose Email via Gmail'}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleInitiateSend} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {/* Recipient */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                To (Recipient Email)
              </label>
              <input
                type="email"
                id="input-compose-to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="colleague@example.com, mentor@domain.com"
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Subject
              </label>
              <input
                type="text"
                id="input-compose-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject of your message..."
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            {/* AI Assistant Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60">
              <div className="flex items-center gap-1.5 text-blue-900 dark:text-blue-200 text-[11px] font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Gemini Draft Assistant:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePolishWithGemini('concise, direct, and polished')}
                  disabled={isPolishing}
                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-md text-[10px] font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <Wand2 className="w-3 h-3" />
                  Make Concise
                </button>
                <button
                  type="button"
                  onClick={() => handlePolishWithGemini('warm, thoughtful, and professional')}
                  disabled={isPolishing}
                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-md text-[10px] font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3" />
                  Polish Tone
                </button>
              </div>
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Message Body
              </label>
              <textarea
                id="textarea-compose-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email here, or paste your journal thoughts..."
                rows={10}
                required
                className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans leading-relaxed resize-y text-xs sm:text-sm"
              />
            </div>
          </form>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Authenticated through Google Workspace OAuth
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-compose-submit"
                onClick={handleInitiateSend}
                disabled={isSending}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-semibold text-xs shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Email</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Explicit Confirmation Dialog */}
      <GmailConfirmationModal
        isOpen={!!confirmData}
        data={confirmData}
        isLoading={isSending}
        onClose={() => setConfirmData(null)}
      />
    </>
  );
};
