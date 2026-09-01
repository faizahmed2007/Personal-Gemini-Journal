import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { Sparkles, Shield, Lock, Mail, User as UserIcon, ArrowRight, X, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin'
}) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, error, clearError } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      setLocalError(null);
      await signInWithGoogle();
      showToast('Signed in with Google successfully!', 'success');
      onClose();
    } catch (err: any) {
      setLocalError(err.message || 'Google sign-in was canceled or failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email) {
      setLocalError('Please enter your email address');
      return;
    }

    if (mode === 'reset') {
      try {
        setIsSubmitting(true);
        await resetPassword(email);
        showToast('Password reset link sent to your email!', 'success');
        setMode('signin');
      } catch (err: any) {
        setLocalError(err.message || 'Could not send password reset email');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!password || password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      if (mode === 'signup') {
        await signUpWithEmail(email, password, displayName || undefined);
        showToast('Account created! Welcome to Personal Gemini Journal', 'success');
      } else {
        await signInWithEmail(email, password);
        showToast('Welcome back!', 'success');
      }
      onClose();
    } catch (err: any) {
      setLocalError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-fade-in">
      <div 
        id="auth-modal-card" 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-lg overflow-hidden relative"
      >
        {/* Header */}
        <div className="bg-slate-900 dark:bg-slate-950 p-6 text-white relative border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              G
            </div>
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-300">
              Personal Gemini Journal
            </span>
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight font-['Playfair_Display',serif]">
            {mode === 'signup' 
              ? 'Create Your Private Journal' 
              : mode === 'reset'
              ? 'Reset Your Password'
              : 'Sign In to Your Thoughts'}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {mode === 'signup' 
              ? 'Your reflections are isolated, private, and encrypted.' 
              : mode === 'reset'
              ? 'Enter your email to receive recovery instructions.'
              : 'Access your private conversations, insights, and summaries.'}
          </p>
        </div>

        {/* Content Form */}
        <div className="p-6">
          {/* Error Banner */}
          {(localError || error) && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{localError || error}</div>
            </div>
          )}

          {/* Google Sign In Button */}
          {mode !== 'reset' && (
            <>
              <button
                type="button"
                id="btn-google-auth"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-medium">
                    Or with email
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Display Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    id="input-displayname"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="E.g. Alex"
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  id="input-auth-email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => setMode('reset')}
                      className="text-xs text-blue-700 dark:text-blue-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    id="input-auth-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              id="btn-auth-submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-blue-700 hover:bg-blue-600 text-white font-medium text-sm rounded-lg shadow-2xs flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                <>
                  {mode === 'signup' ? 'Create Private Account' : mode === 'reset' ? 'Send Reset Link' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Mode Switcher */}
          <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
            {mode === 'signin' ? (
              <span>
                Don't have a private account yet?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); clearError(); setLocalError(null); }}
                  className="font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                >
                  Create one now
                </button>
              </span>
            ) : mode === 'signup' ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signin'); clearError(); setLocalError(null); }}
                  className="font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                >
                  Sign in
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => { setMode('signin'); clearError(); setLocalError(null); }}
                className="font-semibold text-blue-700 dark:text-blue-400 hover:underline"
              >
                Back to sign in
              </button>
            )}
          </div>

          {/* Privacy Guarantee Pill */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>Strict User Data Isolation & Firestore Rules Enforced</span>
          </div>
        </div>
      </div>
    </div>
  );
};
