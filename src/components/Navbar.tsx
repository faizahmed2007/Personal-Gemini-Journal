import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Sparkles, 
  BookOpen, 
  Compass, 
  BarChart3, 
  ShieldCheck, 
  Sun, 
  Moon, 
  LogOut, 
  User as UserIcon, 
  Plus, 
  Lock,
  ChevronDown
} from 'lucide-react';

interface NavbarProps {
  currentView: 'landing' | 'dashboard' | 'chat' | 'journals' | 'insights' | 'security';
  setCurrentView: (view: 'landing' | 'dashboard' | 'chat' | 'journals' | 'insights' | 'security') => void;
  onOpenNewJournal: () => void;
  onOpenAuth: () => void;
  onOpenPrivacy: () => void;
  onOpenSecurity: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  onOpenNewJournal,
  onOpenAuth,
  onOpenPrivacy,
  onOpenSecurity
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div 
          onClick={() => setCurrentView(user ? 'dashboard' : 'landing')}
          className="flex items-center gap-3 cursor-pointer group"
          id="navbar-brand-logo"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-700 flex items-center justify-center text-white font-bold italic shadow-xs group-hover:bg-blue-600 transition-colors">
            G
          </div>
          <div>
            <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 font-['Playfair_Display',serif]">
              Personal Gemini Journal
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400 block -mt-1">
              Private AI Reflection
            </span>
          </div>
        </div>

        {/* Navigation Tabs (if authenticated) */}
        {user && (
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-medium">
            <button
              id="nav-dashboard-btn"
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg transition-all ${
                currentView === 'dashboard'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              id="nav-journals-btn"
              onClick={() => setCurrentView('journals')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg transition-all ${
                currentView === 'journals'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>My Journals</span>
            </button>

            <button
              id="nav-insights-btn"
              onClick={() => setCurrentView('insights')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg transition-all ${
                currentView === 'insights'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Insights</span>
            </button>

            <button
              id="nav-security-btn"
              onClick={() => setCurrentView('security')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg transition-all ${
                currentView === 'security'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Security Center</span>
            </button>
          </nav>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-2.5">
          {/* Quick New Journal CTA */}
          {user && (
            <button
              id="nav-new-journal-quick-btn"
              onClick={onOpenNewJournal}
              className="hidden sm:flex items-center gap-1.5 py-2 px-3.5 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white rounded-lg font-medium text-xs shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Journal</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {/* User Profile or Sign In */}
          {user ? (
            <div className="relative">
              <button
                id="user-profile-menu-btn"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-7 h-7 rounded-md object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden sm:inline max-w-[100px] truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-2 z-50 animate-fade-in text-xs">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {user.displayName || 'Journalist'}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 truncate text-[11px]">
                        {user.email}
                      </p>
                    </div>

                    <button
                      id="dropdown-privacy-btn"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenPrivacy();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span>Privacy & Data Controls</span>
                    </button>

                    <button
                      id="dropdown-security-btn"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setCurrentView('security');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>Security & Threat Model</span>
                    </button>

                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                    <button
                      id="dropdown-logout-btn"
                      onClick={async () => {
                        setUserDropdownOpen(false);
                        await logout();
                        setCurrentView('landing');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              id="nav-signin-btn"
              onClick={onOpenAuth}
              className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-xs shadow-xs transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Mobile bottom nav for small screens */}
      {user && (
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px]">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg ${
              currentView === 'dashboard' ? 'text-blue-700 dark:text-blue-400 font-semibold' : 'text-slate-500'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setCurrentView('journals')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg ${
              currentView === 'journals' ? 'text-blue-700 dark:text-blue-400 font-semibold' : 'text-slate-500'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Journals</span>
          </button>
          <button
            onClick={() => setCurrentView('insights')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg ${
              currentView === 'insights' ? 'text-blue-700 dark:text-blue-400 font-semibold' : 'text-slate-500'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Insights</span>
          </button>
          <button
            onClick={() => setCurrentView('security')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg ${
              currentView === 'security' ? 'text-blue-700 dark:text-blue-400 font-semibold' : 'text-slate-500'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Security</span>
          </button>
        </div>
      )}
    </header>
  );
};

