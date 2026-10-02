import React, { useState } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  Flame,
  Layers,
  ListChecks,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { Chapter, PacingCalculation, PriorityScoredItem, Question, StudyGoal } from '../types';
import { ERROR_CATEGORY_DETAILS } from '../lib/srsEngine';
import { ConfirmModal } from './ConfirmModal';

interface DashboardViewProps {
  goal: StudyGoal;
  allGoals?: StudyGoal[];
  onSwitchGoal?: (goalId: string) => void;
  onOpenGoalSetup?: () => void;
  onOpenEditGoal?: () => void;
  onDeleteGoal?: (goalId: string) => void;
  onBackToOverview?: () => void;
  pacing: PacingCalculation;
  todayChapters: Chapter[];
  tomorrowChapters?: Chapter[];
  dueReviews: PriorityScoredItem[];
  sameDayPending: Question[];
  totalVaultQuestionsCount?: number;
  overdueCount: number;
  rolledOverCount: number;
  totalDueCount: number;
  todayStr: string;
  onToggleChapter: (chapterId: string) => void;
  onRescheduleChapter?: (chapterId: string, newDateStr?: string) => void;
  onOpenQuickLogForChapter: (chapterId: string) => void;
  onStartReviewDeck: (filterMode?: 'all' | 'same_day' | 'due' | 'all_questions') => void;
  onRecalculateSchedule: () => void;
  onExtendTargetDate: () => void;
  onQuickReviewItem: (questionId: string, status: 'CORRECT' | 'INCORRECT', isSameDay: boolean) => void;
  onNavigateToCurriculum?: () => void;
  onNavigateToPacing?: () => void;
  onNavigateToErrors?: () => void;
  onOpenQuickLogGeneral?: () => void;
  onResetSeedData?: () => void;
  onFinishStudyDay?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  goal,
  allGoals = [],
  onSwitchGoal,
  onOpenGoalSetup,
  onOpenEditGoal,
  onDeleteGoal,
  onBackToOverview,
  pacing,
  todayChapters,
  tomorrowChapters = [],
  dueReviews,
  sameDayPending,
  totalVaultQuestionsCount = 0,
  overdueCount,
  rolledOverCount,
  totalDueCount,
  todayStr,
  onToggleChapter,
  onOpenQuickLogForChapter,
  onStartReviewDeck,
  onRecalculateSchedule,
  onQuickReviewItem,
  onNavigateToCurriculum,
  onNavigateToPacing,
  onNavigateToErrors,
  onOpenQuickLogGeneral,
  onResetSeedData,
  onFinishStudyDay,
}) => {
  const [isDeleteGoalModalOpen, setIsDeleteGoalModalOpen] = useState(false);

  const tomorrowStr = format(addDays(parseISO(todayStr), 1), 'yyyy-MM-dd');
  const percentComplete = pacing.totalUnits > 0
    ? Math.round((pacing.completedUnits / pacing.totalUnits) * 100)
    : 0;

  const activeMaterial = goal.materials[0];

  return (
    <div className="space-y-6">
      {/* Breadcrumb Back to Study Cockpit */}
      {onBackToOverview && (
        <button
          onClick={onBackToOverview}
          className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Study Cockpit</span>
        </button>
      )}

      {/* STREAMLINED ACTION PLANNER HEADER */}
      <section className="bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-sm shrink-0">
              <Target className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  Daily Action Planner
                </span>
                <span aria-hidden="true" className="font-extrabold text-slate-400">·</span>
                <button
                  type="button"
                  onClick={onOpenEditGoal || onOpenGoalSetup}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Click to edit Start Date and Target Exam Date"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Target Exam: <strong className="text-slate-950 dark:text-white font-mono">{goal.targetDate}</strong> ({pacing.remainingActiveStudyDays} active study days)</span>
                  <Edit2 className="w-3 h-3 text-slate-400 ml-0.5" />
                </button>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-[11px] font-black bg-amber-400 dark:bg-amber-400 text-slate-950 shadow-2xs border border-amber-600/40">
                  <Award className="w-3 h-3 fill-slate-950/20 stroke-[2.5]" />
                  <span>EXAM DAY · RESERVED</span>
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight truncate mt-0.5">
                {goal.title}
              </h1>
            </div>
          </div>

          {/* Goal Selector Buttons & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {allGoals.length > 1 && (
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-800 flex-wrap">
                {allGoals.map((g) => {
                  const isSelected = g.id === goal.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => onSwitchGoal && onSwitchGoal(g.id)}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-blue-600 text-white font-black shadow-sm'
                          : 'text-slate-800 dark:text-slate-200 hover:text-slate-950 font-bold hover:bg-white/60 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate max-w-[140px]">{g.title.split('—')[0].trim()}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            )}

            {onFinishStudyDay && (
              <button
                onClick={onFinishStudyDay}
                className="px-3.5 py-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 dark:text-amber-300 dark:hover:text-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs shrink-0"
                title="Wrap up today's study session & view celebration metrics"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span>End Study Day</span>
              </button>
            )}

            {onResetSeedData && (
              <button
                onClick={onResetSeedData}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs shrink-0"
                title="Reload study data"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                <span>Restore Study Data</span>
              </button>
            )}

            {(onOpenEditGoal || onOpenGoalSetup) && (
              <button
                onClick={onOpenEditGoal || onOpenGoalSetup}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs shrink-0"
                title="Edit start date, exam date, and goal parameters"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Edit Dates & Goal</span>
              </button>
            )}

            {onOpenGoalSetup && (
              <button
                onClick={onOpenGoalSetup}
                className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ New Goal</span>
              </button>
            )}

            {onDeleteGoal && (
              <button
                onClick={() => setIsDeleteGoalModalOpen(true)}
                className="px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/50 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs shrink-0"
                title="Delete this curriculum"
              >
                <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Compact Pacing & Progress Strip */}
        <div className="pt-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white">Overall Progress:</span>
              <span className="font-mono text-slate-900 dark:text-white font-extrabold">
                {pacing.completedUnits} / {pacing.totalUnits} chapters ({percentComplete}%)
              </span>
              <span aria-hidden="true" className="font-extrabold text-slate-400">·</span>
              <span>Pace: {pacing.dailyPace} chaps/day</span>
              <span aria-hidden="true" className="font-extrabold text-slate-400">·</span>
              <span>{pacing.bufferDays} buffer days preserved</span>
            </div>

            <div className="flex items-center gap-2">
              {pacing.paceStatus === 'ON_TRACK' && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  ✓ On Track
                </span>
              )}
              {pacing.paceStatus === 'BEHIND' && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Behind by {pacing.missedUnits} units
                </span>
              )}
              {pacing.paceStatus === 'AHEAD' && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  Ahead of schedule
                </span>
              )}
            </div>
          </div>

          <div className="w-full h-2 bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-300 dark:border-slate-800">
            <div
              className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(2, Math.min(100, percentComplete))}%` }}
            />
          </div>
        </div>
      </section>

      {/* Catch-Up Mode Banner (when behind pace) */}
      {pacing.paceStatus === 'BEHIND' && (
        <section className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 text-amber-900 dark:text-amber-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-300">
                  Schedule Deficit Detected ({pacing.missedUnits} chapters behind)
                </h2>
                <p className="text-[11px] text-amber-800 dark:text-amber-200/80">
                  Recalculate pace across remaining study days to stay on target.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onRecalculateSchedule}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recalculate</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* SMART DAILY CHECKLIST: 3 ACTION BLOCKS */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
              Smart Daily Study Checklist
            </h2>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
              <span>Date: {todayStr}</span>
              <span aria-hidden="true" className="font-extrabold">·</span>
              <span>Anti-Snowball Cap (Max: {goal.dailyReviewCap})</span>
            </div>
          </div>

          {(dueReviews.length > 0 || sameDayPending.length > 0) && (
            <button
              onClick={() => onStartReviewDeck('all')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
            >
              <RotateCcw className="w-4 h-4 stroke-[2.5]" />
              <span>Start Review Session ({dueReviews.length + sameDayPending.length})</span>
            </button>
          )}
        </div>

        {/* BLOCK 1: NEW MATERIAL ASSIGNED FOR TODAY */}
        <section className="bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
          <div className="px-5 py-4 bg-slate-100/80 dark:bg-slate-900/60 border-b border-slate-300 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/10 border border-blue-300 dark:border-blue-500/30 flex items-center justify-center text-blue-700 dark:text-blue-400">
                <BookOpen className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-white">
                    Block 1: Content Scheduled for Today
                  </h3>
                  <span className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded-full ${
                    todayChapters.filter((c) => c.isCompleted).length === todayChapters.length && todayChapters.length > 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                  }`}>
                    {todayChapters.filter((c) => c.isCompleted).length} / {todayChapters.length} Done
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Target chapters calculated by pacing engine
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {todayChapters.length === 0 ? (
              <div className="p-6 text-center text-slate-700 dark:text-slate-300 text-sm font-bold space-y-2">
                <div>🎉 No chapters remaining on today's target!</div>
              </div>
            ) : (
              todayChapters.map((ch) => (
                <div
                  key={ch.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                    ch.isCompleted
                      ? 'bg-slate-50 dark:bg-slate-950/60 opacity-80 border-l-4 border-emerald-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button
                      onClick={() => onToggleChapter(ch.id)}
                      className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                        ch.isCompleted
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                          : 'border-slate-400 dark:border-slate-600 hover:border-emerald-500 bg-white dark:bg-slate-950'
                      }`}
                      title={ch.isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
                    >
                      {ch.isCompleted && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 flex-wrap">
                        <span className={`font-mono font-extrabold ${ch.isCompleted ? 'text-slate-400 line-through' : 'text-blue-700 dark:text-blue-400'}`}>
                          Chapter {ch.number}
                        </span>
                        {ch.topic && (
                          <>
                            <span aria-hidden="true" className="font-extrabold">·</span>
                            <span className={ch.isCompleted ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200 font-extrabold'}>{ch.topic}</span>
                          </>
                        )}
                        {ch.isCompleted && (
                          <>
                            <span aria-hidden="true" className="font-extrabold">·</span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold text-xs">✓ Completed</span>
                          </>
                        )}
                      </div>
                      <div
                        className={`text-base font-extrabold truncate mt-0.5 transition-all ${
                          ch.isCompleted
                            ? 'line-through text-slate-400'
                            : 'text-slate-950 dark:text-slate-100'
                        }`}
                      >
                        {ch.title}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => onOpenQuickLogForChapter(ch.id)}
                      className="px-3.5 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-blue-700 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                      <span>Log Error</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* TOMORROW'S UPCOMING SCHEDULE SECTION */}
          {tomorrowChapters.length > 0 && (
            <div className="bg-slate-50/80 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Scheduled for Tomorrow ({tomorrowChapters.length} {tomorrowChapters.length === 1 ? 'Chapter' : 'Chapters'} · {tomorrowStr})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {tomorrowChapters.map((tmCh) => (
                  <div
                    key={tmCh.id}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 shadow-2xs hover:border-blue-400 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span className="font-mono text-blue-700 dark:text-blue-400 font-extrabold">
                          Chapter {tmCh.number}
                        </span>
                        {tmCh.topic && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{tmCh.topic}</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                        {tmCh.title}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* BLOCK 2: DUE SPACED REVIEWS (D+3 AND D+7) */}
        <section className="bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
          <div className="px-5 py-4 bg-slate-100/80 dark:bg-slate-900/60 border-b border-slate-300 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/10 border border-blue-300 dark:border-blue-500/30 flex items-center justify-center text-blue-700 dark:text-blue-400">
                <RotateCcw className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-white">
                  Block 2: Due Spaced Reviews (D+3 & D+7) ({dueReviews.length})
                </h3>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Sorted by Cognitive Priority</span>
                  <span aria-hidden="true" className="font-extrabold">·</span>
                  <span>Daily Cap: {goal.dailyReviewCap || 30} max</span>
                  {overdueCount > 0 && (
                    <>
                      <span aria-hidden="true" className="font-extrabold">·</span>
                      <span className="text-rose-700 dark:text-rose-400 font-extrabold">{overdueCount} overdue</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {dueReviews.length > 0 && (
              <button
                onClick={() => onStartReviewDeck('due')}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm"
              >
                <span>Start Due Reviews</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Rollover notice if cap exceeded */}
          {rolledOverCount > 0 && (
            <div className="px-5 py-2.5 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-900/30 text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center justify-between">
              <span>
                🛡️ Anti-Snowball Protection: {rolledOverCount} lower-priority items rolled over to tomorrow to prevent cognitive burnout.
              </span>
              <span className="font-mono text-xs font-extrabold text-blue-800 dark:text-blue-300">Cap: {goal.dailyReviewCap}</span>
            </div>
          )}

          <div className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {dueReviews.length === 0 ? (
              <div className="p-6 text-center text-slate-700 dark:text-slate-300 text-sm font-bold">
                ✨ All scheduled spaced reviews for today are finished!
              </div>
            ) : (
              dueReviews.map(({ question, priorityScore, overdueDays }) => {
                const srs = question.srsItem;
                const lastAttempt = question.attempts[question.attempts.length - 1];
                const errorTaxonomy = lastAttempt?.errorReason
                  ? ERROR_CATEGORY_DETAILS[lastAttempt.errorReason]
                  : null;

                const isOverdue = overdueDays > 0;

                return (
                  <div
                    key={question.id}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-slate-800 dark:text-slate-200">
                        {/* Stage badge */}
                        <span className="px-2.5 py-0.5 rounded font-mono text-xs font-extrabold bg-blue-50 text-blue-900 border border-blue-300 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20">
                          {srs.stage === 'INTERVAL_3' ? 'D+3 Review' : srs.stage === 'INTERVAL_7' ? 'D+7 Review' : 'Graduated'}
                        </span>

                        {isOverdue && (
                          <span className="px-2.5 py-0.5 rounded font-mono text-xs font-extrabold bg-rose-50 text-rose-900 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30">
                            {overdueDays}d Overdue
                          </span>
                        )}

                        <span className="font-extrabold text-slate-950 dark:text-slate-100 text-base">
                          {question.sourceRef}
                        </span>

                        {errorTaxonomy && (
                          <>
                            <span aria-hidden="true" className="font-extrabold">·</span>
                            <span className={`${errorTaxonomy.color} font-extrabold text-xs`}>
                              {errorTaxonomy.label}
                            </span>
                          </>
                        )}
                      </div>

                      {question.notes && (
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                          "{question.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                      {/* Priority Score badge */}
                      <div className="text-right">
                        <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Priority</div>
                        <div
                          className={`font-mono text-sm font-black tabular-nums ${
                            priorityScore >= 75
                              ? 'text-rose-700 dark:text-rose-400'
                              : priorityScore >= 50
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {priorityScore} / 100
                        </div>
                      </div>

                      {/* Quick action buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onQuickReviewItem(question.id, 'INCORRECT', false)}
                          className="px-3 py-1.5 text-xs font-bold text-rose-900 dark:text-rose-300 hover:text-white bg-rose-50 hover:bg-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-300 dark:border-rose-800/40 rounded transition-colors"
                        >
                          Missed (+3d)
                        </button>
                        <button
                          onClick={() => onQuickReviewItem(question.id, 'CORRECT', false)}
                          className="px-3 py-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300 hover:text-white bg-emerald-50 hover:bg-emerald-600 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800/40 rounded transition-colors"
                        >
                          Passed (D+7)
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* BLOCK 3: SAME-DAY ERROR REMEDIATION */}
        <section className="bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
          <div className="px-5 py-4 bg-slate-100/80 dark:bg-slate-900/60 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 flex items-center justify-center text-rose-700 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-white">
                  Block 3: Same-Day Immediate Remediation Queue ({sameDayPending.length})
                </h3>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Questions missed today that must be resolved before completing your study session
                </p>
              </div>
            </div>

            {sameDayPending.length > 0 && (
              <button
                onClick={() => onStartReviewDeck('same_day')}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors whitespace-nowrap shadow-sm"
              >
                Clear Today's Queue ({sameDayPending.length})
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {sameDayPending.length === 0 ? (
              <div className="p-6 text-center text-slate-700 dark:text-slate-300 text-sm font-bold">
                ✨ No pending same-day errors! All mistakes made today have been remediated.
              </div>
            ) : (
              sameDayPending.map((question) => {
                const lastAttempt = question.attempts[question.attempts.length - 1];
                const errorTaxonomy = lastAttempt?.errorReason
                  ? ERROR_CATEGORY_DETAILS[lastAttempt.errorReason]
                  : null;

                return (
                  <div
                    key={question.id}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span className="px-2.5 py-0.5 rounded font-mono text-xs font-extrabold bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30">
                          Today's Miss
                        </span>
                        <span className="font-extrabold text-slate-950 dark:text-slate-100 text-base">
                          {question.sourceRef}
                        </span>
                        {errorTaxonomy && (
                          <>
                            <span aria-hidden="true" className="font-extrabold">·</span>
                            <span className={`${errorTaxonomy.color} font-extrabold text-xs`}>
                              {errorTaxonomy.label}
                            </span>
                          </>
                        )}
                      </div>
                      {question.notes && (
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                          "{question.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onQuickReviewItem(question.id, 'CORRECT', true)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors shadow-2xs"
                      >
                        ✓ Remediated
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* CONFIRM DELETE GOAL MODAL */}
      {onDeleteGoal && (
        <ConfirmModal
          isOpen={isDeleteGoalModalOpen}
          title="Delete Curriculum / Study Goal"
          message={
            allGoals.length <= 1
              ? `Are you sure you want to delete "${goal.title}"? A fresh new study curriculum will be initialized so you can start clean.`
              : `Are you sure you want to delete "${goal.title}"? All scheduled dates and settings for this goal will be removed.`
          }
          confirmLabel="Delete Goal"
          confirmVariant="danger"
          onConfirm={() => {
            setIsDeleteGoalModalOpen(false);
            onDeleteGoal(goal.id);
          }}
          onCancel={() => setIsDeleteGoalModalOpen(false)}
        />
      )}
    </div>
  );
};
