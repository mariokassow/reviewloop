import React from 'react';
import {
  Calendar,
  CheckSquare,
  ChevronRight,
  Compass,
  Layers,
  ListChecks,
  Moon,
  Plus,
  RotateCcw,
  Sliders,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { useTheme } from '../lib/theme';

export type NavTabId = 'overview' | 'dashboard' | 'curriculum' | 'review' | 'goals' | 'error-log';

interface SidebarProps {
  currentTab: NavTabId;
  setCurrentTab: (tab: NavTabId) => void;
  onOpenQuickLog: () => void;
  onOpenGoalSetup: () => void;
  pendingDueCount: number;
  sameDayPendingCount: number;
  totalChaptersCount: number;
  completedChaptersCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenQuickLog,
  onOpenGoalSetup,
  pendingDueCount,
  sameDayPendingCount,
  totalChaptersCount,
  completedChaptersCount,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { theme, toggleTheme, setTheme } = useTheme();

  const navItems = [
    {
      id: 'overview' as const,
      label: 'Study Cockpit',
      subtitle: 'Welcome hub & mission',
      icon: Compass,
      badge: null,
    },
    {
      id: 'dashboard' as const,
      label: "Today's Actions",
      subtitle: 'Detailed study checklist',
      icon: CheckSquare,
      badge: sameDayPendingCount > 0 ? (
        <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30">
          {sameDayPendingCount}
        </span>
      ) : null,
    },
    {
      id: 'curriculum' as const,
      label: 'Goal Curriculum',
      subtitle: 'Books, chapters & progress',
      icon: ListChecks,
      badge: (
        <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-md bg-slate-200/90 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
          {completedChaptersCount}/{totalChaptersCount}
        </span>
      ),
    },
    {
      id: 'review' as const,
      label: 'Review Deck',
      subtitle: 'Spaced repetition (SRS)',
      icon: RotateCcw,
      badge: pendingDueCount > 0 ? (
        <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30">
          {pendingDueCount}
        </span>
      ) : null,
    },
    {
      id: 'goals' as const,
      label: 'Pacing & Calendar',
      subtitle: 'Month-by-month & buffer days',
      icon: Calendar,
      badge: null,
    },
    {
      id: 'error-log' as const,
      label: 'Error Analytics',
      subtitle: 'Taxonomy & root error causes',
      icon: Layers,
      badge: null,
    },
  ];

  const handleSelectTab = (tab: NavTabId) => {
    setCurrentTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs md:hidden animate-in fade-in duration-150"
        />
      )}

      {/* Main Sidebar Drawer / Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white dark:bg-[#090e1a] border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-screen md:sticky md:top-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* TOP ZONE: Brand & Quick Action */}
        <div className="p-5 pb-3">
          {/* Logo & Close Button for mobile */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => handleSelectTab('dashboard')}
              className="text-left flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs group-hover:bg-blue-700 transition-colors">
                RL
              </div>
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                  ReviewLoop
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                  SRS & Pacing Engine
                </span>
              </div>
            </button>

            {/* Close on mobile */}
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden transition-colors"
              title="Close sidebar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Primary Action Button: Log Question */}
          <div className="pt-4">
            <button
              onClick={() => {
                onOpenQuickLog();
                onCloseMobile();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-xs transition-all"
              title="Log Question Result (Shortcut: Q)"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Log Question</span>
              <kbd className="ml-auto px-1.5 py-0.5 text-xs font-mono font-bold bg-blue-800/80 rounded text-blue-100 border border-blue-400/40">
                Q
              </kbd>
            </button>
          </div>
        </div>

        {/* MIDDLE ZONE: Vertical Navigation Index */}
        <div className="flex-1 px-3 py-2 overflow-y-auto space-y-1.5">
          <div className="px-3 pb-1 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Navigation Index
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 font-bold border border-blue-300 dark:border-blue-800 shadow-xs'
                    : 'text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/70 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 group-hover:bg-blue-100 group-hover:text-blue-800 dark:group-hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold tracking-tight truncate leading-tight text-slate-900 dark:text-white">
                      {item.label}
                    </div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate mt-0.5">
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {item.badge}
                  <ChevronRight
                    className={`w-4 h-4 transition-transform stroke-[2.2] ${
                      isActive
                        ? 'text-blue-700 dark:text-blue-400 translate-x-0.5'
                        : 'text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100'
                    }`}
                  />
                </div>
              </button>
            );
          })}

          {/* Goal Setup Action inside list */}
          <div className="pt-2">
            <button
              onClick={() => {
                onOpenGoalSetup();
                onCloseMobile();
              }}
              className="w-full text-left p-3 rounded-xl transition-all flex items-center justify-between text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/70 border border-transparent group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200 group-hover:bg-blue-100 group-hover:text-blue-800 dark:group-hover:text-white transition-colors">
                  <Sliders className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Configure Goals</div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Parameters & Presets</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* BOTTOM ZONE: Theme Switcher */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-[#070b14]/90">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-900 dark:text-slate-200">
              Display Mode
            </span>
            <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-slate-200">
              {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </span>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={toggleTheme}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                toggleTheme();
              }
            }}
            aria-label="Toggle between light and dark mode"
            className={`relative w-full h-11 p-1 rounded-xl cursor-pointer select-none transition-all duration-300 flex items-center justify-between border ${
              theme === 'dark'
                ? 'bg-[#0b1326] border-blue-900/60 shadow-inner'
                : 'bg-white/95 border-slate-300 shadow-xs backdrop-blur-xs'
            }`}
          >
            {/* Sliding Pill Thumb */}
            <div
              className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg transition-transform duration-300 ease-out flex items-center justify-center gap-1.5 shadow-sm ${
                theme === 'dark'
                  ? 'translate-x-[calc(100%+2px)] bg-blue-600 text-white border border-blue-400/40 shadow-blue-950/50'
                  : 'translate-x-0 bg-white text-slate-950 border border-slate-300 shadow-slate-300/80'
              }`}
            >
              {theme === 'dark' ? (
                <>
                  <Moon className="w-4 h-4 text-sky-200 shrink-0 fill-sky-200 stroke-[2.2]" />
                  <span className="text-xs font-extrabold text-white tracking-tight">Dark</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-500 shrink-0 fill-amber-500 stroke-[2.2]" />
                  <span className="text-xs font-extrabold text-slate-900 tracking-tight">Light</span>
                </>
              )}
            </div>

            {/* Left Button Target: Light */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setTheme('light');
              }}
              className={`relative z-10 w-1/2 h-full flex items-center justify-center gap-1.5 text-xs transition-colors ${
                theme === 'light' ? 'opacity-0' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0 stroke-[2.2]" />
              <span className="font-bold text-xs">Light</span>
            </div>

            {/* Right Button Target: Dark */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setTheme('dark');
              }}
              className={`relative z-10 w-1/2 h-full flex items-center justify-center gap-1.5 text-xs transition-colors ${
                theme === 'dark' ? 'opacity-0' : 'text-slate-700 hover:text-slate-950 font-bold'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0 stroke-[2.2]" />
              <span className="font-bold text-xs">Dark</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
