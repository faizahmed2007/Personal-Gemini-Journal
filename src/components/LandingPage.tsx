import React from 'react';
import { 
  Sparkles, 
  Shield, 
  Bot, 
  FileText, 
  History, 
  Cloud, 
  ArrowRight, 
  CheckCircle2, 
  Lightbulb, 
  Target, 
  Compass, 
  Lock,
  Zap
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onSignIn }) => {
  const featureCards = [
    {
      icon: Shield,
      title: 'Private by Design',
      desc: 'Per-user Firestore data isolation and strict access rules ensure your reflections belong exclusively to you.',
      tag: 'Zero-Leak Architecture'
    },
    {
      icon: Bot,
      title: 'Gemini-Powered Conversations',
      desc: 'Engage with tailored modes: Free Journal, Creative Brainstorm, Philosophical Reflection, Problem Solving, and Goal Planning.',
      tag: 'Multi-Turn Context'
    },
    {
      icon: FileText,
      title: 'Automatic Summaries',
      desc: 'Transform flowing journal entries into structured takeaways: key breakthroughs, decisions, action items, and future questions.',
      tag: 'Structured AI Synthesis'
    },
    {
      icon: History,
      title: 'Personal Journal History',
      desc: 'Search, categorize, filter by mood or mode, and organize your intellectual and emotional journey over time.',
      tag: 'Full-Text Search'
    },
    {
      icon: Cloud,
      title: 'Secure Cloud Storage',
      desc: 'Resilient cloud storage with end-to-end authenticated sessions and zero client-side API key exposure.',
      tag: 'Firebase & Secret Manager'
    }
  ];

  const journalModes = [
    { name: 'Free Journal', icon: Compass, prompt: 'Stream of consciousness without judgment' },
    { name: 'Brainstorm', icon: Lightbulb, prompt: 'Expand creative ideas and cross-disciplinary concepts' },
    { name: 'Reflection', icon: Sparkles, prompt: 'Examine values, lessons learned, and self-awareness' },
    { name: 'Problem Solving', icon: Zap, prompt: 'Deconstruct complex friction into sequential steps' },
    { name: 'Goal Planning', icon: Target, prompt: 'Shape ambitions into measurable habits and milestones' }
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Subtle ambient lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-500/10 via-blue-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-8 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Next-Generation Intelligent Diary & Brainstorming Sanctuary</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-slate-900 dark:text-white font-['Playfair_Display',serif] leading-[1.15]">
            Your Thoughts. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-900 via-indigo-700 to-indigo-900 dark:from-blue-400 dark:via-indigo-300 dark:to-purple-300">Your Journal.</span> <br className="hidden sm:inline" />
            Your Gemini.
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Think, reflect, brainstorm, and organize your ideas with a private AI-powered journal.
          </p>

          {/* Action CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="landing-cta-start"
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-900 via-indigo-900 to-indigo-800 hover:from-blue-850 hover:to-indigo-750 text-white font-medium text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 transition-all group"
            >
              <span>Start Journaling</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              id="landing-cta-signin"
              onClick={onSignIn}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
            >
              Sign In
            </button>
          </div>

          {/* Privacy Message Callout */}
          <div className="mt-8 inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-800/60 px-4 py-2 rounded-full border border-slate-200/50 dark:border-slate-700/50">
            <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Your journal is private and protected by authenticated access.</span>
          </div>
        </div>

        {/* Live Journal Mockup Preview */}
        <div className="max-w-4xl mx-auto px-4 mt-14 sm:mt-16">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl overflow-hidden">
            {/* Mock Header */}
            <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400/80" />
                <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                <span className="ml-3 text-xs font-mono text-slate-500 dark:text-slate-400">
                  reflection / Morning Strategy & Creative Direction
                </span>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">
                Encrypted & Isolated
              </span>
            </div>

            {/* Mock Chat Content */}
            <div className="p-6 sm:p-8 space-y-4 text-xs sm:text-sm">
              <div className="flex justify-end">
                <div className="max-w-md bg-blue-950 text-white p-4 rounded-2xl rounded-tr-xs shadow-xs">
                  <p className="leading-relaxed">
                    "I want to rethink my priorities this quarter. I feel pulled between deep creative coding and administrative meetings. How do I protect my maker time?"
                  </p>
                </div>
              </div>

              <div className="flex justify-start items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="max-w-lg bg-slate-50 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 p-4 rounded-2xl rounded-tl-xs border border-slate-200/60 dark:border-slate-700/60">
                  <p className="font-semibold text-indigo-950 dark:text-indigo-200 mb-1">
                    Gemini Journal Companion
                  </p>
                  <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                    Let's structure a deliberate <strong>Maker vs. Manager partition</strong>. If you batch all syncs into two afternoons, you safeguard 3 full mornings for flow state. What is the single highest-leverage artifact you wish to build this month?
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="py-16 sm:py-24 bg-slate-100/50 dark:bg-slate-900/40 border-y border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-['Playfair_Display',serif]">
              Built for Deep Thinking and Uncompromised Privacy
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Every detail is engineered to protect your intellectual sovereignty and empower continuous reflection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureCards.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  id={`feature-card-${idx}`}
                  className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 flex items-center justify-center mb-4 border border-indigo-100 dark:border-indigo-900">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-base text-slate-900 dark:text-white mb-2">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                      {feat.tag}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Modes Showcase */}
      <section className="py-16 sm:py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-['Playfair_Display',serif]">
            Intelligent Journal Modes for Every Thought State
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Tailor Gemini's conversational style to your present mindset.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {journalModes.map((mode, i) => {
            const Icon = mode.icon;
            return (
              <div
                key={i}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3.5"
              >
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                    {mode.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    {mode.prompt}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 bg-white dark:bg-slate-900 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Personal Gemini Journal
            </span>
          </div>
          <p>
            Private, secure, authenticated personal AI journaling.
          </p>
        </div>
      </footer>
    </div>
  );
};
