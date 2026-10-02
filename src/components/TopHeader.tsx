import React from 'react';
import { Menu, Plus } from 'lucide-react';
import { NavTabId } from './Sidebar';
import { StudyFocusTimer } from './StudyFocusTimer';

interface TopHeaderProps {
  currentTab: NavTabId;
  onOpenMobileMenu: () => void;
  onOpenQuickLog: () => void;
  onOpenGoalSetup?: () => void;
  activeGoalTitle: string;
  onFinishStudyDay?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenMobileMenu,
  onOpenQuickLog,
  activeGoalTitle,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-[#070b14]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Button + Clean Minimal Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden transition-colors border border-slate-200 dark:border-slate-800"
            title="Open navigation sidebar"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight truncate">
              {activeGoalTitle}
            </span>
          </div>
        </div>

        {/* Right: Clean Clock Command Center & Quick Log Button */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Minimalist Clock Command Center (expands when in use or clicked) */}
          <StudyFocusTimer />

          {/* Primary Quick Log Action */}
          <button
            onClick={onOpenQuickLog}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-xs transition-all whitespace-nowrap"
            title="Log Question Result (Shortcut: Q)"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Log Question</span>
            <span className="sm:hidden">Log</span>
            <kbd className="hidden 2xl:inline ml-1 px-1.5 py-0.2 text-[10px] bg-blue-800/80 rounded text-blue-100 font-mono font-bold">
              Q
            </kbd>
          </button>
        </div>
      </div>
    </header>
  );
};
