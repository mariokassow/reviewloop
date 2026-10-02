import React from 'react';
import {
  BookOpen,
  Calendar,
  CheckSquare,
  Layers,
  ListChecks,
  Moon,
  Plus,
  RotateCcw,
  Sliders,
  Sun,
} from 'lucide-react';
import { useTheme } from '../lib/theme';

interface NavbarProps {
  currentTab: 'dashboard' | 'curriculum' | 'review' | 'goals' | 'error-log';
  setCurrentTab: (tab: 'dashboard' | 'curriculum' | 'review' | 'goals' | 'error-log') => void;
  onOpenQuickLog: () => void;
  onOpenGoalSetup: () => void;
  pendingDueCount: number;
  sameDayPendingCount: number;
  totalChaptersCount: number;
  completedChaptersCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenQuickLog,
  onOpenGoalSetup,
  pendingDueCount,
  sameDayPendingCount,
  totalChaptersCount,
  completedChaptersCount,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0b1220]/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Solid Wordmark */}
        <button
          onClick={() => setCurrentTab('dashboard')}
          className="text-xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors flex items-center gap-2.5 text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold text-xs tracking-wider shadow-xs">
            RL
          </div>
          <div className="flex flex-col">
            <span className="text-blue-700 dark:text-blue-400 font-extrabold tracking-tight leading-none text-lg">
              ReviewLoop
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-normal mt-0.5">
              SRS & Curriculum Engine
            </span>
          </div>
        </button>

        {/* Zone 2: Clean navigation links */}
        <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentTab === 'dashboard'
                ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Today's Actions</span>
            {sameDayPendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono rounded bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30">
                {sameDayPendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentTab('curriculum')}
            className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentTab === 'curriculum'
                ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            <span>Goal Curriculum</span>
            <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono rounded bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
              {completedChaptersCount}/{totalChaptersCount}
            </span>
          </button>

          <button
            onClick={() => setCurrentTab('review')}
            className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentTab === 'review'
                ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Review Deck</span>
            {pendingDueCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono rounded bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30">
                {pendingDueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentTab('goals')}
            className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentTab === 'goals'
                ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Pacing & Calendar</span>
          </button>

          <button
            onClick={() => setCurrentTab('error-log')}
            className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentTab === 'error-log'
                ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Error Analytics</span>
          </button>
        </nav>

        {/* Zone 3: Dark/Light Mode toggle and Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold hidden md:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-semibold hidden md:inline">Dark</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenGoalSetup}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:hover:text-white dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap"
            title="Configure or start a new study goal"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Goal Setup</span>
          </button>

          {/* Log Question Button */}
          <button
            onClick={onOpenQuickLog}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:scale-98 transition-all shadow-sm whitespace-nowrap"
            title="Log Question Result (Hotkey: Q)"
          >
            <Plus className="w-4 h-4" />
            <span>Log Question</span>
            <kbd className="hidden md:inline ml-1 px-1.5 py-0.5 text-[10px] bg-blue-800/50 rounded text-blue-100 font-mono">
              Q
            </kbd>
          </button>
        </div>
      </div>
    </header>
  );
};
