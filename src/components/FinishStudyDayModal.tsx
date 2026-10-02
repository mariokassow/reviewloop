import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Award, Check, CheckCircle2, Flame, Sparkles, TrendingUp, X } from 'lucide-react';
import { Chapter, PacingCalculation, PriorityScoredItem, StudyGoal } from '../types';

interface FinishStudyDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: StudyGoal;
  pacing: PacingCalculation;
  todayChapters: Chapter[];
  reviewedCount: number;
}

export const FinishStudyDayModal: React.FC<FinishStudyDayModalProps> = ({
  isOpen,
  onClose,
  goal,
  pacing,
  todayChapters,
  reviewedCount,
}) => {
  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore if not loaded
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const completedToday = todayChapters.filter((c) => c.isCompleted).length;
  const isAllTodayDone = todayChapters.length > 0 && completedToday >= todayChapters.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white dark:bg-[#0d1627] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden transition-colors space-y-5">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Celebration Header */}
        <div className="text-center space-y-1.5 pt-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center text-amber-500">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-950 dark:text-white tracking-tight">
            Study Day Completed!
          </h2>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Solid session in the books. Consistent active study is the secret to exam mastery.
          </p>
        </div>

        {/* Daily Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Today's Units</span>
            </div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
              {completedToday} <span className="text-xs text-slate-500 font-bold">/ {todayChapters.length}</span>
            </div>
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
              {isAllTodayDone ? 'All assigned completed!' : 'Great daily progress!'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Pacing Status</span>
            </div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
              {pacing.paceStatus === 'AHEAD' ? '+ Ahead' : pacing.paceStatus === 'ON_TRACK' ? 'On Track' : 'Recovering'}
            </div>
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
              {pacing.dailyPace} units/day pace
            </div>
          </div>
        </div>

        {/* Motivation Callout */}
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 flex items-start gap-3">
          <Award className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs font-medium text-slate-800 dark:text-slate-200 space-y-0.5">
            <div className="font-bold text-blue-950 dark:text-blue-200">
              Spaced Repetition Tip
            </div>
            <div>
              Rest your brain tonight. Any questions marked for spaced review will naturally resurface when consolidation is optimal.
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-sm"
        >
          Wrap Up & Rest
        </button>
      </div>
    </div>
  );
};
