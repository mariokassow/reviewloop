import React from 'react';
import { format, parseISO } from 'date-fns';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Flame,
  Layers,
  ListChecks,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Chapter, PacingCalculation, PriorityScoredItem, Question, StudyGoal } from '../types';

interface WelcomeHubViewProps {
  goal: StudyGoal;
  allGoals?: StudyGoal[];
  onSwitchGoal?: (goalId: string) => void;
  pacing: PacingCalculation;
  todayChapters: Chapter[];
  dueReviews: PriorityScoredItem[];
  sameDayPending: Question[];
  totalVaultQuestionsCount: number;
  todayStr: string;
  onToggleChapter: (chapterId: string) => void;
  onStartReviewDeck: (mode?: 'all' | 'same_day' | 'due' | 'all_questions') => void;
  onOpenQuickLog: () => void;
  onFinishStudyDay?: () => void;
  onNavigateToTodayActions: () => void;
  onNavigateToCurriculum: () => void;
  onNavigateToReview: () => void;
  onNavigateToPacing: () => void;
  onNavigateToErrors: () => void;
}

export const WelcomeHubView: React.FC<WelcomeHubViewProps> = ({
  goal,
  allGoals = [],
  onSwitchGoal,
  pacing,
  todayChapters,
  dueReviews,
  sameDayPending,
  totalVaultQuestionsCount,
  todayStr,
  onToggleChapter,
  onStartReviewDeck,
  onOpenQuickLog,
  onFinishStudyDay,
  onNavigateToTodayActions,
  onNavigateToCurriculum,
  onNavigateToReview,
  onNavigateToPacing,
  onNavigateToErrors,
}) => {
  // Format clean date display: e.g. "Saturday, October 1, 2026"
  const formattedToday = (() => {
    try {
      return format(parseISO(todayStr), 'EEEE, MMMM d, yyyy');
    } catch {
      return todayStr;
    }
  })();

  const activeMaterial = goal.materials[0];
  const percentComplete =
    pacing.totalUnits > 0
      ? Math.round((pacing.completedUnits / pacing.totalUnits) * 100)
      : 0;

  const totalReviewsDueToday = dueReviews.length + sameDayPending.length;
  const uncompletedTodayChapters = todayChapters.filter((c) => !c.isCompleted);
  const primaryChapter = uncompletedTodayChapters[0] || todayChapters[0];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* 1. ZEN WELCOME HEADER */}
      <section className="bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm transition-colors relative overflow-hidden">
        {/* Subtle decorative accent */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="text-blue-700 dark:text-blue-400 font-extrabold uppercase tracking-wider">
                Study Cockpit
              </span>
              <span aria-hidden="true" className="font-extrabold">·</span>
              <span>{formattedToday}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight mt-1.5">
              Welcome back to your study sprint
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
              Active sprint: <strong className="text-slate-900 dark:text-white font-black">{goal.title}</strong> · Target Exam: {goal.targetDate} ({pacing.remainingActiveStudyDays} active study days remaining)
            </p>
          </div>

          {/* Goal Selector (if multi-sprint) */}
          {allGoals.length > 1 && onSwitchGoal && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Sprint:</span>
              <select
                value={goal.id}
                onChange={(e) => onSwitchGoal(e.target.value)}
                className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 transition-colors"
              >
                {allGoals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Minimalist Progress Meter */}
        <div className="pt-6 space-y-3">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 dark:text-white">Curriculum Velocity</span>
              <span className="text-slate-600 dark:text-slate-400">·</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {pacing.completedUnits} of {pacing.totalUnits} chapters completed ({percentComplete}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {pacing.paceStatus === 'ON_TRACK' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  ✓ On Track ({pacing.dailyPace} chaps/day)
                </span>
              )}
              {pacing.paceStatus === 'BEHIND' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Behind by {pacing.missedUnits} units
                </span>
              )}
              {pacing.paceStatus === 'AHEAD' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  Ahead of schedule
                </span>
              )}
            </div>
          </div>

          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
            <div
              className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(2, Math.min(100, percentComplete))}%` }}
            />
          </div>
        </div>
      </section>

      {/* 2. TODAY'S 3 ESSENTIAL FOCUS PILLARS (CLEAN & NON-OVERWHELMING) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight">
              Today's Focus Mission
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
              Clear these three essential milestones to keep your learning curve on target.
            </p>
          </div>

          <button
            onClick={onNavigateToTodayActions}
            className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
          >
            <span>Open Detailed Checklist</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pillar 1: New Chapter Study */}
          <div className="bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-300 dark:border-blue-500/30 flex items-center justify-center text-blue-700 dark:text-blue-400">
                <BookOpen className="w-5 h-5 stroke-[2.2]" />
              </div>

              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-400 block">
                  Pillar 1 · New Topic
                </span>
                <h3 className="text-base font-black text-slate-950 dark:text-white mt-1">
                  {primaryChapter ? primaryChapter.title : 'All Chapters Complete'}
                </h3>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 line-clamp-2">
                  {primaryChapter?.topic || 'Target content calculated by your pacing engine.'}
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
              {primaryChapter ? (
                <button
                  onClick={() => onToggleChapter(primaryChapter.id)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    primaryChapter.isCompleted
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  }`}
                >
                  {primaryChapter.isCompleted ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Completed! (+ Advance)</span>
                    </>
                  ) : (
                    <span>Mark as Studied Today</span>
                  )}
                </button>
              ) : (
                <button
                  onClick={onNavigateToTodayActions}
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  Manage Today's Chapters
                </button>
              )}
            </div>
          </div>

          {/* Pillar 2: Spaced Repetition Flashcards */}
          <div className="bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-300 dark:border-indigo-500/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400">
                <RotateCcw className="w-5 h-5 stroke-[2.2]" />
              </div>

              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block">
                  Pillar 2 · Memory Retention
                </span>
                <h3 className="text-base font-black text-slate-950 dark:text-white mt-1">
                  {totalReviewsDueToday > 0
                    ? `${totalReviewsDueToday} Cards Due for Review`
                    : 'SRS Reviews Clear!'}
                </h3>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 line-clamp-2">
                  {totalReviewsDueToday > 0
                    ? `${sameDayPending.length} same-day misses + ${dueReviews.length} spaced interval reviews.`
                    : 'All cards due today have been reinforced. Practice full deck anytime.'}
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => onStartReviewDeck(sameDayPending.length > 0 ? 'same_day' : 'all')}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>{totalReviewsDueToday > 0 ? `Start Reviews (${totalReviewsDueToday})` : 'Practice Flashcards'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Pillar 3: Log Errors */}
          <div className="bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-300 dark:border-purple-500/30 flex items-center justify-center text-purple-700 dark:text-purple-400">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>

              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-400 block">
                  Pillar 3 · Error Logging
                </span>
                <h3 className="text-base font-black text-slate-950 dark:text-white mt-1">
                  Log Missed Practice Question
                </h3>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 line-clamp-2">
                  Tag root cognitive causes (Concept, Attention, Time, Technique) to feed your SRS deck.
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={onOpenQuickLog}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold text-purple-900 dark:text-purple-200 bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/70 dark:hover:bg-purple-900/80 border border-purple-300 dark:border-purple-800 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <span>+ Log Mistake</span>
                <span className="font-mono text-[10px] bg-purple-200 dark:bg-purple-900 px-1.5 py-0.2 rounded font-black">
                  Q
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2.5 CELEBRATION / END STUDY DAY BANNER */}
      {onFinishStudyDay && (
        <div className="p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-2xs">
              <Sparkles className="w-6 h-6 fill-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-950 dark:text-white">Done studying for today?</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">Celebrate today's consistency and wrap up your daily session with a streak summary.</p>
            </div>
          </div>
          <button
            onClick={onFinishStudyDay}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Sparkles className="w-4 h-4 fill-white" />
            <span>End Study Day & Wrap Up</span>
          </button>
        </div>
      )}

      {/* 3. STUDY NAVIGATION INDEX (CLEAN, PROMINENT DOORWAYS) */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight">
            Study Index & Navigation
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
            Choose a section to dive into detailed planning, materials, flashcards, or diagnostics.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Doorway 1: Today's Actions */}
          <button
            onClick={onNavigateToTodayActions}
            className="p-5 rounded-2xl bg-white dark:bg-[#0d1627] hover:bg-blue-50/50 dark:hover:bg-slate-900/80 border border-slate-300 dark:border-slate-800 hover:border-blue-400 transition-all text-left group flex items-start justify-between gap-4 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-500/10 border border-blue-300 dark:border-blue-500/30 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0">
                <Compass className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Today's Action Planner
                </h3>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                  Manage your daily study blocks, move chapters between today and tomorrow, adjust scheduling dates, and review same-day misses.
                </p>
                <div className="text-xs font-bold text-blue-700 dark:text-blue-400 mt-2 flex items-center gap-1">
                  <span>Open Planner ({todayChapters.length} tasks scheduled)</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </button>

          {/* Doorway 2: Curriculum & Books */}
          <button
            onClick={onNavigateToCurriculum}
            className="p-5 rounded-2xl bg-white dark:bg-[#0d1627] hover:bg-indigo-50/50 dark:hover:bg-slate-900/80 border border-slate-300 dark:border-slate-800 hover:border-indigo-400 transition-all text-left group flex items-start justify-between gap-4 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-300 dark:border-indigo-500/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 shrink-0">
                <ListChecks className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-950 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Curriculum & Textbooks Hub
                </h3>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                  Select and inspect configured books, manage chapters, track textbook progress, and view official practice test benchmark scores.
                </p>
                <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mt-2 flex items-center gap-1">
                  <span>Explore Curriculum ({goal.materials.length} books)</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </button>

          {/* Doorway 3: SRS Review Deck */}
          <button
            onClick={onNavigateToReview}
            className="p-5 rounded-2xl bg-white dark:bg-[#0d1627] hover:bg-emerald-50/50 dark:hover:bg-slate-900/80 border border-slate-300 dark:border-slate-800 hover:border-emerald-400 transition-all text-left group flex items-start justify-between gap-4 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                <RotateCcw className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-950 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Spaced Repetition Review Deck
                </h3>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                  Review flashcards with Leitner intervals (Same-Day, D+3, D+7, Mastered), sorted in natural curriculum chapter order.
                </p>
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-2 flex items-center gap-1">
                  <span>Practice Cards ({totalVaultQuestionsCount} in Vault)</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </button>

          {/* Doorway 4: Pacing & Analytics */}
          <button
            onClick={onNavigateToPacing}
            className="p-5 rounded-2xl bg-white dark:bg-[#0d1627] hover:bg-amber-50/50 dark:hover:bg-slate-900/80 border border-slate-300 dark:border-slate-800 hover:border-amber-400 transition-all text-left group flex items-start justify-between gap-4 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                <Calendar className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-950 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Pacing Calendar & Buffer Smoothing
                </h3>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                  Inspect the month-by-month study calendar, protected buffer rest days, dynamic daily target recalculation, and pacing projections.
                </p>
                <div className="text-xs font-bold text-amber-700 dark:text-amber-400 mt-2 flex items-center gap-1">
                  <span>View Study Calendar ({pacing.bufferDays} buffer days)</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
};
