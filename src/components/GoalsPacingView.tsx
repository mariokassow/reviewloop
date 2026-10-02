import React, { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfMonth,
} from 'date-fns';
import {
  ArrowRightLeft,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  GripVertical,
  Info,
  Layers,
  MoveRight,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Shield,
  Sliders,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { Chapter, PacingCalculation, ScheduledDay, StudyGoal } from '../types';
import {
  batchRescheduleChapters,
  generateScheduleCalendar,
  rescheduleChapterInGoal,
  resetAllPacingToAuto,
} from '../lib/pacingEngine';
import { getTodayDateString } from '../lib/srsEngine';
import { DEMO_PRACTICE_TESTS, PracticeTestRecord } from '../lib/demoData';

interface GoalsPacingViewProps {
  goal: StudyGoal;
  pacing: PacingCalculation;
  onUpdateGoal: (updatedGoal: StudyGoal) => void;
  onRecalculateSchedule: () => void;
  onExtendTargetDate: () => void;
  onToggleChapter: (chapterId: string) => void;
}

const DAYS_OF_WEEK = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface MonthInfo {
  key: string;
  year: number;
  monthIndex: number;
  labelPt: string;
  labelEn: string;
  shortLabel: string;
  isTodayMonth: boolean;
  isTargetMonth: boolean;
}

export const GoalsPacingView: React.FC<GoalsPacingViewProps> = ({
  goal,
  pacing,
  onUpdateGoal,
  onRecalculateSchedule,
  onExtendTargetDate,
  onToggleChapter,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [title, setTitle] = useState<string>(goal.title);
  const [materialTitle, setMaterialTitle] = useState<string>(goal.materials[0]?.title || '');
  const [startDate, setStartDate] = useState<string>(goal.startDate);
  const [targetDate, setTargetDate] = useState<string>(goal.targetDate);
  const [bufferPercentage, setBufferPercentage] = useState<number>(goal.bufferPercentage || 0.15);
  const [activeDays, setActiveDays] = useState<number[]>(goal.activeDaysOfWeek);
  const [dailyReviewCap, setDailyReviewCap] = useState<number>(goal.dailyReviewCap || 30);
  const [totalUnits, setTotalUnits] = useState<number>(goal.materials[0]?.totalUnits || 30);

  // Sync state whenever goal changes
  useEffect(() => {
    setTitle(goal.title);
    setMaterialTitle(goal.materials[0]?.title || '');
    setStartDate(goal.startDate);
    setTargetDate(goal.targetDate);
    setBufferPercentage(goal.bufferPercentage || 0.15);
    setActiveDays(goal.activeDaysOfWeek);
    setDailyReviewCap(goal.dailyReviewCap || 30);
    setTotalUnits(goal.materials[0]?.totalUnits || goal.materials[0]?.chapters.length || 20);
  }, [goal]);

  const todayStr = getTodayDateString();
  const scheduleCalendar: ScheduledDay[] = generateScheduleCalendar(goal, todayStr);

  // Generate complete list of months for navigation
  const availableMonths: MonthInfo[] = useMemo(() => {
    const startP = parseISO(goal.startDate);
    const targetP = parseISO(goal.targetDate);
    const todayP = parseISO(todayStr);

    const minDate = isBefore(startP, todayP) ? startP : todayP;
    const maxDate = isAfter(targetP, todayP) ? targetP : todayP;

    const startMonth = startOfMonth(minDate);
    const endMonth = endOfMonth(maxDate);

    const list: MonthInfo[] = [];
    let curr = startMonth;

    while (!isAfter(curr, endMonth)) {
      const key = format(curr, 'yyyy-MM');
      const mIdx = curr.getMonth();
      const yr = curr.getFullYear();
      const isTodayMonth = todayStr.startsWith(key);
      const isTargetMonth = goal.targetDate.startsWith(key);

      list.push({
        key,
        year: yr,
        monthIndex: mIdx,
        labelPt: `${MONTH_NAMES_EN[mIdx]} ${yr}`,
        labelEn: `${MONTH_NAMES_EN[mIdx]} ${yr}`,
        shortLabel: `${MONTH_NAMES_EN[mIdx].slice(0, 3)} ${yr}`,
        isTodayMonth,
        isTargetMonth,
      });

      curr = addMonths(curr, 1);
    }

    return list;
  }, [goal.startDate, goal.targetDate, todayStr]);

  // Default month: the month of today if present, else first month
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    const todayMonthKey = todayStr.slice(0, 7);
    return todayMonthKey;
  });

  // Mock Exams visibility on the calendar grid (collapsible / toggleable)
  const [showMockExams, setShowMockExams] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('reviewloop_calendar_mock_exams_visible');
      if (stored !== null) return stored === 'true';
    } catch {
      // ignore
    }
    return true;
  });

  const toggleMockExams = () => {
    setShowMockExams((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('reviewloop_calendar_mock_exams_visible', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const currentMonthIndex = Math.max(
    0,
    availableMonths.findIndex((m) => m.key === selectedMonthKey)
  );
  const activeMonth = availableMonths[currentMonthIndex] || availableMonths[0];

  const handlePrevMonth = () => {
    if (currentMonthIndex > 0) {
      setSelectedMonthKey(availableMonths[currentMonthIndex - 1].key);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex < availableMonths.length - 1) {
      setSelectedMonthKey(availableMonths[currentMonthIndex + 1].key);
    }
  };

  const handleGoToTodayMonth = () => {
    const todayMonthKey = todayStr.slice(0, 7);
    setSelectedMonthKey(todayMonthKey);
  };

  const handleGoToTargetMonth = () => {
    const targetMonthKey = goal.targetDate.slice(0, 7);
    setSelectedMonthKey(targetMonthKey);
  };

  // Moving and assigning chapter states
  const [movingChapterInfo, setMovingChapterInfo] = useState<{ chapter: Chapter; currentDate: string } | null>(null);
  const [targetMoveDate, setTargetMoveDate] = useState<string>('');
  const [addingChapterToDate, setAddingChapterToDate] = useState<string | null>(null);
  const [draggedChapterId, setDraggedChapterId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [isPacingStudioOpen, setIsPacingStudioOpen] = useState<boolean>(false);
  const [studioSearch, setStudioSearch] = useState<string>('');
  const [studioSelectedMaterialId, setStudioSelectedMaterialId] = useState<string>('all');
  const [studioBatchDate, setStudioBatchDate] = useState<string>('');
  const [studioSelectedChapterIds, setStudioSelectedChapterIds] = useState<string[]>([]);
  const [addModalSearch, setAddModalSearch] = useState<string>('');
  const [addModalSelectedChapterIds, setAddModalSelectedChapterIds] = useState<string[]>([]);

  // All chapters flat list with material title
  const allGoalChapters = useMemo(() => {
    return goal.materials.flatMap((m) =>
      m.chapters.map((ch) => ({
        ...ch,
        materialTitle: m.title,
      }))
    );
  }, [goal.materials]);

  // Handler to move a single chapter to a target date
  const handleMoveChapterToDate = (chapterId: string, newDateStr?: string) => {
    const updatedGoal = rescheduleChapterInGoal(goal, chapterId, newDateStr);
    onUpdateGoal(updatedGoal);
    setMovingChapterInfo(null);
  };

  // Handler to assign multiple chapters to a date
  const handleAssignChaptersToDate = (chapterIds: string[], targetDateStr: string) => {
    const updates = chapterIds.map((id) => ({ chapterId: id, dateStr: targetDateStr }));
    const updatedGoal = batchRescheduleChapters(goal, updates);
    onUpdateGoal(updatedGoal);
    setAddingChapterToDate(null);
    setAddModalSelectedChapterIds([]);
  };

  // Handler to reset all manual dates back to dynamic auto pacing
  const handleResetAllToAuto = () => {
    const updatedGoal = resetAllPacingToAuto(goal);
    onUpdateGoal(updatedGoal);
    onRecalculateSchedule();
  };

  // Practice tests map for overlay on calendar days
  const practiceTestMap = useMemo(() => {
    const map = new Map<string, PracticeTestRecord>();
    if (goal.mockExams && goal.mockExams.length > 0) {
      goal.mockExams.forEach((me) => {
        map.set(me.date, {
          id: me.id,
          date: me.date,
          testName: me.title,
          totalScore: me.score,
          errorCount: me.errorCount,
          notes: me.notes || '',
        });
      });
    } else {
      DEMO_PRACTICE_TESTS.forEach((pt) => {
        map.set(pt.date, pt);
      });
    }
    return map;
  }, [goal.mockExams]);

  // Compute days for the active month
  const activeMonthDays: ScheduledDay[] = useMemo(() => {
    if (!activeMonth) return [];

    const monthStart = startOfMonth(new Date(activeMonth.year, activeMonth.monthIndex, 1));
    const monthEnd = endOfMonth(monthStart);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const scheduleMap = new Map<string, ScheduledDay>();
    scheduleCalendar.forEach((sd) => scheduleMap.set(sd.dateStr, sd));

    const todayObj = parseISO(todayStr);

    return daysInMonth.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const existing = scheduleMap.get(dateStr);
      if (existing) {
        return {
          ...existing,
          isToday: dateStr === todayStr,
        };
      }

      const dayOfWeek = getDay(d);
      const dayName = format(d, 'EEE');
      const isToday = dateStr === todayStr;
      const isPast = isBefore(d, todayObj);

      return {
        dateStr,
        dayOfWeek,
        dayName,
        isToday,
        isPast,
        isActiveDay: false,
        isBufferDay: false,
        chapters: [],
      };
    });
  }, [activeMonth, scheduleCalendar, todayStr]);

  // Month Statistics
  const monthStats = useMemo(() => {
    const chapters = activeMonthDays.flatMap((d) => d.chapters);
    const completed = chapters.filter((c) => c.isCompleted).length;
    const studyDays = activeMonthDays.filter((d) => d.isActiveDay && !d.isBufferDay).length;
    const bufferDays = activeMonthDays.filter((d) => d.isBufferDay).length;
    const pct = chapters.length > 0 ? Math.round((completed / chapters.length) * 100) : 0;

    return {
      totalChapters: chapters.length,
      completedChapters: completed,
      studyDays,
      bufferDays,
      pct,
    };
  }, [activeMonthDays]);

  const handleToggleDay = (day: number) => {
    if (activeDays.includes(day)) {
      if (activeDays.length > 1) {
        setActiveDays(activeDays.filter((d) => d !== day));
      }
    } else {
      setActiveDays([...activeDays, day]);
    }
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();

    let validStart = startDate.trim() || goal.startDate;
    let validTarget = targetDate.trim() || goal.targetDate;

    try {
      const s = parseISO(validStart);
      const t = parseISO(validTarget);
      if (isBefore(t, s)) {
        validTarget = format(addDays(s, 30), 'yyyy-MM-dd');
      }
    } catch {
      // fallback
    }

    const updatedMaterials = goal.materials.map((m, idx) => {
      let currentChapters = [...m.chapters];
      if (idx === 0 && totalUnits !== m.chapters.length) {
        if (totalUnits > m.chapters.length) {
          for (let i = m.chapters.length + 1; i <= totalUnits; i++) {
            currentChapters.push({
              id: `ch-${Date.now()}-${i}`,
              materialId: m.id,
              number: i,
              title: `Chapter ${i}: Topic Set ${i}`,
              isCompleted: false,
            });
          }
        } else {
          currentChapters = currentChapters.slice(0, totalUnits);
        }
      }

      return {
        ...m,
        title: idx === 0 ? (materialTitle.trim() || m.title) : m.title,
        totalUnits: currentChapters.length,
        chapters: currentChapters,
      };
    });

    const updated: StudyGoal = {
      ...goal,
      title: title.trim() || goal.title,
      startDate: validStart,
      targetDate: validTarget,
      bufferPercentage,
      activeDaysOfWeek: activeDays,
      dailyReviewCap,
      materials: updatedMaterials,
    };

    onUpdateGoal(updated);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Pacing & Curriculum Engine
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Mathematical chapter pacing with guaranteed buffer smoothing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Edit2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{isEditing ? 'Cancel Edit' : 'Adjust Parameters'}</span>
          </button>
        </div>
      </div>

      {/* EDITING PANEL */}
      {isEditing && (
        <form
          onSubmit={handleSaveGoal}
          className="bg-white dark:bg-[#0d1627] border border-blue-300 dark:border-blue-500/40 rounded-2xl p-6 shadow-md space-y-4 animate-in fade-in duration-150 transition-colors"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Parameters Configuration & Pacing Equation</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Goal / Sprint Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Primary Material / Book Title
              </label>
              <input
                type="text"
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Target Completion Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Total Chapters / Units
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={totalUnits}
                onChange={(e) => setTotalUnits(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Daily SRS Review Cap (Anti-Snowball)
              </label>
              <input
                type="number"
                min="10"
                max="100"
                step="5"
                value={dailyReviewCap}
                onChange={(e) => setDailyReviewCap(parseInt(e.target.value) || 30)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Buffer Percentage Slider */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Reserved Buffer Percentage: <span className="font-mono text-blue-700 dark:text-blue-400 font-extrabold">{(bufferPercentage * 100).toFixed(0)}%</span>
              </span>
              <span className="text-slate-700 dark:text-slate-300 font-bold">
                Reserves {Math.round(pacing.totalActiveStudyDays * bufferPercentage)} days for rest and SRS review consolidation
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.25"
              step="0.01"
              value={bufferPercentage}
              onChange={(e) => setBufferPercentage(parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
              <span>5% (Aggressive)</span>
              <span>15% (Recommended Default)</span>
              <span>25% (High Smoothing)</span>
            </div>
          </div>

          {/* Active study days selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
              Active Study Days per Week
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = activeDays.includes(d.day);
                return (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => handleToggleDay(d.day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>Save Parameters</span>
            </button>
          </div>
        </form>
      )}

      {/* MATHEMATICAL PACING FORMULA CARD */}
      <section className="bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 transition-colors">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/10 border border-blue-300 dark:border-blue-500/30 flex items-center justify-center text-blue-700 dark:text-blue-400">
              <Info className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
                Deterministic Pacing Equation
              </h2>
              <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                Mathematical calculation with guaranteed buffer and rest smoothing
              </p>
            </div>
          </div>

          {/* Catch-Up Triggers */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRecalculateSchedule}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              title="Recalculate pacing based on remaining active days"
            >
              <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Recalculate Pacing</span>
            </button>
          </div>
        </div>

        {/* Formula Display Box */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-800 font-mono text-xs sm:text-sm text-slate-900 dark:text-slate-200 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2">
            <span className="text-blue-700 dark:text-blue-400 font-black">
              Daily Target = ⌈ Remaining Chapters ÷ Remaining Active Days ⌉
            </span>
            <span className="font-black text-slate-950 dark:text-white tabular-nums text-sm sm:text-base">
              {pacing.dailyPace} ch / day
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div>
              <span className="text-slate-700 dark:text-slate-300 block text-xs font-extrabold">Total Active Days:</span>
              <span className="font-extrabold text-slate-950 dark:text-white text-sm">{pacing.totalActiveStudyDays} days</span>
            </div>
            <div>
              <span className="text-slate-700 dark:text-slate-300 block text-xs font-extrabold">Buffer Days (15%):</span>
              <span className="font-extrabold text-blue-700 dark:text-blue-400 text-sm">{pacing.bufferDays} rest days</span>
            </div>
            <div>
              <span className="text-slate-700 dark:text-slate-300 block text-xs font-extrabold">Remaining Chapters:</span>
              <span className="font-extrabold text-slate-950 dark:text-white text-sm">{pacing.remainingUnits} of {pacing.totalUnits}</span>
            </div>
            <div>
              <span className="text-slate-700 dark:text-slate-300 block text-xs font-extrabold">Remaining Active Days:</span>
              <span className="font-extrabold text-slate-950 dark:text-white text-sm">{pacing.remainingActiveStudyDays} active</span>
            </div>
          </div>
        </div>
      </section>

      {/* MONTHLY CALENDAR & SCHEDULE VISUALIZATION */}
      <section className="bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 transition-colors">
        {/* Top Header & Legend */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-700 dark:text-blue-400 stroke-[2.5]" />
              <span>Monthly Schedule & Chapter Distribution</span>
            </h2>
            <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">
              Navigate month by month to inspect scheduled chapters, practice tests, and rest days
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs font-bold text-slate-800 dark:text-slate-200 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-600" />
              <span>Active Study</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-600" />
              <span>Buffer / Rest</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded ring-2 ring-blue-600 bg-blue-600" />
              <span className="font-extrabold text-blue-700 dark:text-blue-400">Today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span>Practice Test / Exam</span>
            </div>
          </div>
        </div>

        {/* MONTH NAVIGATION BAR */}
        <div className="bg-slate-100/90 dark:bg-slate-950 p-4 rounded-xl border border-slate-300 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Arrow navigation buttons & title */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevMonth}
              disabled={currentMonthIndex === 0}
              className="p-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 text-xs font-bold shadow-sm"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="text-center min-w-[160px]">
              <div className="text-lg font-black text-slate-950 dark:text-white tracking-tight flex items-center justify-center gap-2">
                <span>{activeMonth?.labelEn}</span>
                {activeMonth?.isTodayMonth && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-600 text-white shadow-sm">
                    Current Month
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleNextMonth}
              disabled={currentMonthIndex === availableMonths.length - 1}
              className="p-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 text-xs font-bold shadow-sm"
              title="Next Month"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Quick Month Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
            {availableMonths.map((m, idx) => {
              const isSelected = idx === currentMonthIndex;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setSelectedMonthKey(m.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-500'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  <span>{m.labelEn.split(' ')[0]}</span>
                  {m.isTodayMonth && (
                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-600 dark:bg-blue-400'}`} />
                  )}
                  {m.isTargetMonth && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-400 text-slate-950 shadow-2xs">
                      Exam
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick jump to Today */}
          {!activeMonth?.isTodayMonth && (
            <button
              onClick={handleGoToTodayMonth}
              className="px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 stroke-[2.5]" />
              <span>Go to Today</span>
            </button>
          )}

          {/* Quick jump to Exam Day / Final Day */}
          {!activeMonth?.isTargetMonth && (
            <button
              onClick={handleGoToTargetMonth}
              className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-black transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
              title="Jump to the Final Day (Exam Date) month"
            >
              <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 stroke-[2.5]" />
              <span>Go to Exam Day ({goal.targetDate})</span>
            </button>
          )}

          {/* Custom Pacing Studio Button */}
          <button
            type="button"
            onClick={() => setIsPacingStudioOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
            title="Build and reorganize chapters by day on the calendar"
          >
            <Sliders className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Customize Pacing (Move Chapters)</span>
          </button>

          {/* Mock Exams toggle on the calendar (Hiding / Not hiding) */}
          <button
            type="button"
            onClick={toggleMockExams}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border shrink-0 cursor-pointer shadow-2xs ${
              showMockExams
                ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={showMockExams ? 'Click to hide Mock Exams from calendar' : 'Click to show Mock Exams on calendar'}
          >
            <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 stroke-[2.2]" />
            <span>Mock Exams:</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
              showMockExams ? 'bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {showMockExams ? 'Showing' : 'Hidden'}
            </span>
          </button>
        </div>

        {/* Selected Month Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-100/80 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs">
          <div>
            <span className="text-slate-700 dark:text-slate-300 block text-xs font-extrabold">Chapters in Month:</span>
            <span className="font-extrabold text-slate-950 dark:text-white text-sm sm:text-base">
              {monthStats.completedChapters} / {monthStats.totalChapters} done ({monthStats.pct}%)
            </span>
          </div>
          <div>
            <span className="text-slate-700 dark:text-slate-300 block text-xs font-extrabold">Active Study Days:</span>
            <span className="font-extrabold text-blue-700 dark:text-blue-400 text-sm sm:text-base">
              {monthStats.studyDays} days
            </span>
          </div>
          <div>
            <span className="text-slate-700 dark:text-slate-300 block text-xs font-extrabold">Buffer / Rest Days:</span>
            <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm sm:text-base">
              {monthStats.bufferDays} days
            </span>
          </div>
          <div>
            <span className="text-slate-700 dark:text-slate-300 block text-xs font-extrabold">Month Status:</span>
            <span className="font-extrabold text-slate-950 dark:text-slate-100 text-sm sm:text-base">
              {activeMonth?.isTodayMonth ? '📅 In Progress (Today)' : monthStats.pct === 100 && monthStats.totalChapters > 0 ? '✅ 100% Completed' : 'Planned'}
            </span>
          </div>
        </div>

        {/* Monthly Calendar Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {activeMonthDays.map((day) => {
            const isTargetDay = day.dateStr === goal.targetDate;
            const pt = showMockExams ? practiceTestMap.get(day.dateStr) : undefined;
            const isDragTarget = dragOverDate === day.dateStr;

            return (
              <div
                key={day.dateStr}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverDate !== day.dateStr) setDragOverDate(day.dateStr);
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  if (dragOverDate === day.dateStr) setDragOverDate(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const cId = e.dataTransfer.getData('text/plain') || draggedChapterId;
                  if (cId) {
                    handleMoveChapterToDate(cId, day.dateStr);
                  }
                  setDragOverDate(null);
                  setDraggedChapterId(null);
                }}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between relative ${
                  isDragTarget
                    ? 'ring-4 ring-blue-500 bg-blue-50/90 dark:bg-blue-950/80 border-blue-500 scale-[1.01] z-30 shadow-lg'
                    : day.isToday && isTargetDay
                    ? 'bg-amber-50/95 dark:bg-[#281e05] border-2 border-amber-500 dark:border-amber-400 ring-4 ring-amber-500/50 shadow-xl z-20'
                    : isTargetDay
                    ? 'bg-amber-50/90 dark:bg-[#201805] border-2 border-amber-500 dark:border-amber-400 ring-2 ring-amber-400/40 shadow-md z-10'
                    : day.isToday
                    ? 'bg-blue-50 dark:bg-[#0f1d38] border-2 border-blue-600 dark:border-blue-500 ring-2 ring-blue-600/30 dark:ring-blue-500/40 shadow-md z-10'
                    : day.isBufferDay
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/40 text-emerald-950 dark:text-emerald-300'
                    : pt
                    ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/40'
                    : !day.isActiveDay
                    ? 'bg-slate-100/70 dark:bg-slate-950/40 border-slate-300 dark:border-slate-800/40'
                    : day.isPast
                    ? 'bg-slate-50 dark:bg-slate-950/70 border-slate-300 dark:border-slate-800/60'
                    : 'bg-white dark:bg-slate-900/90 border-slate-300 dark:border-slate-800 hover:border-blue-500'
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-300 dark:border-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-bold text-sm ${
                      isTargetDay
                        ? 'text-amber-950 dark:text-amber-200 font-black'
                        : day.isToday
                        ? 'text-blue-800 dark:text-blue-400 font-black'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}>
                      {day.dayName}
                    </span>
                    <span className={`font-mono ${
                      isTargetDay
                        ? 'text-amber-950 dark:text-amber-100 font-black text-sm'
                        : day.isToday
                        ? 'text-blue-950 dark:text-white font-black text-sm'
                        : 'text-slate-700 dark:text-slate-300 font-bold'
                    }`}>
                      {day.dateStr.slice(8)}/{day.dateStr.slice(5, 7)}
                    </span>
                  </div>

                  {/* Highlights and Badges */}
                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    {/* Exam Day / Final Day Highlight Badge (Golden / Reserved) */}
                    {isTargetDay && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[11px] font-black bg-amber-400 text-slate-950 shadow-xs border border-amber-600">
                        <Award className="w-3 h-3 fill-slate-950/20 stroke-[2.5]" />
                        <span>EXAM DAY · RESERVED</span>
                      </div>
                    )}
                    {day.isToday && (
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-xs font-black bg-blue-600 text-white shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        <span>TODAY</span>
                      </div>
                    )}
                    {day.isBufferDay && !isTargetDay && (
                      <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                        BUFFER
                      </span>
                    )}
                    {pt && !isTargetDay && (
                      <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                        PRACTICE TEST
                      </span>
                    )}
                    {!day.isActiveDay && !day.isBufferDay && !day.isToday && !isTargetDay && (
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Rest</span>
                    )}
                  </div>
                </div>

                {/* EXAM DAY / FINAL DAY PROMINENT GOLDEN BANNER */}
                {isTargetDay && (
                  <div className="mt-2 p-2.5 rounded-lg bg-amber-200/90 dark:bg-amber-950/90 border border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-100 text-xs sm:text-sm font-black flex items-center gap-2 shadow-xs">
                    <Award className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0 stroke-[2.5]" />
                    <span>🏆 Exam Day / Final Day — Reserved for Official Exam</span>
                  </div>
                )}

                {/* TODAY SOLID PROMINENT BANNER (No Gradient) */}
                {day.isToday && !isTargetDay && (
                  <div className="mt-2 p-2.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 border border-blue-400 dark:border-blue-700 text-blue-950 dark:text-blue-200 text-xs sm:text-sm font-extrabold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 stroke-[2.5]" />
                    <span>🎯 Current Study Session (Today)</span>
                  </div>
                )}

                {/* Practice Test Overlay Card if present (can be toggled / hidden) */}
                {pt && (
                  <div className="mt-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-amber-950 dark:text-amber-200 text-xs space-y-1">
                    <div className="flex items-center gap-1 font-black text-amber-950 dark:text-amber-300">
                      <Award className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 stroke-[2.5]" />
                      <span className="truncate">{pt.testName}</span>
                    </div>
                    {pt.totalScore && (
                      <div className="font-mono text-xs text-amber-950 dark:text-amber-100 font-extrabold">
                        Score: {pt.totalScore} {pt.rwScore ? `(R&W: ${pt.rwScore}, Math: ${pt.mathScore})` : ''}
                      </div>
                    )}
                    {pt.notes && (
                      <div className="text-xs font-bold text-amber-900/90 dark:text-amber-300/90 line-clamp-2">
                        {pt.notes}
                      </div>
                    )}
                  </div>
                )}

                {/* Assigned Chapters */}
                <div className="py-2.5 flex-1 space-y-1.5">
                  {isTargetDay ? (
                    <div className="p-2.5 rounded-lg bg-amber-100/70 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs font-bold space-y-1.5">
                      <div className="flex items-center gap-1.5 font-black text-amber-900 dark:text-amber-300">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Official Exam Day (Reserved)</span>
                      </div>
                      <p className="text-[11px] font-semibold text-amber-900/90 dark:text-amber-300/90">
                        Final schedule deadline. Reserved exclusively for taking the official exam. No new chapters scheduled.
                      </p>
                    </div>
                  ) : day.isBufferDay ? (
                    <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 py-1">
                      <Shield className="w-4 h-4 shrink-0 stroke-[2.2]" />
                      <span>Buffer: Catch-up and spaced repetition review (SRS).</span>
                    </div>
                  ) : day.chapters.length === 0 ? (
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 py-1">
                      {day.isToday
                        ? 'Free of new chapters today. Practice and review in the SRS Deck.'
                        : !day.isActiveDay
                        ? 'Scheduled rest day.'
                        : day.isPast
                        ? 'No pending chapters.'
                        : 'Free of new chapters.'}
                    </div>
                  ) : (
                    day.chapters.map((ch) => {
                      const isManual = Boolean(ch.scheduledDate);

                      return (
                        <div
                          key={ch.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', ch.id);
                            setDraggedChapterId(ch.id);
                          }}
                          className={`text-xs p-2 rounded-lg flex items-center justify-between gap-1.5 border transition-all select-none ${
                            ch.isCompleted
                              ? 'bg-slate-100 dark:bg-slate-950/80 border-slate-300 dark:border-slate-800 text-slate-500'
                              : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800/90 text-slate-950 dark:text-slate-100 hover:border-blue-500 font-bold shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                            <div
                              className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 shrink-0"
                              title="Drag to move this chapter to another day"
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </div>
                            <button
                              type="button"
                              onClick={() => onToggleChapter(ch.id)}
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                ch.isCompleted
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-slate-400 dark:border-slate-600 hover:border-blue-500'
                              }`}
                            >
                              {ch.isCompleted && <Check className="w-3 h-3" />}
                            </button>
                            <span
                              className={`truncate ${ch.isCompleted ? 'line-through text-slate-400' : ''}`}
                              title={`Ch ${ch.number}: ${ch.title}`}
                            >
                              Ch {ch.number}: {ch.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isManual && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800"
                                title="Manually scheduled date"
                              >
                                Pinned
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setMovingChapterInfo({ chapter: ch, currentDate: day.dateStr });
                                setTargetMoveDate(day.dateStr);
                              }}
                              className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                              title="Move chapter to another day"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Button to Add / Move Chapter into this day */}
                  <button
                    type="button"
                    onClick={() => {
                      setAddingChapterToDate(day.dateStr);
                      setAddModalSelectedChapterIds([]);
                      setAddModalSearch('');
                    }}
                    className="w-full mt-2 py-1 px-2 border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer bg-slate-50/60 dark:bg-slate-900/50 hover:bg-blue-50/40 dark:hover:bg-blue-950/20"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>+ Add / Move Chapter</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 1. Modal: Move Chapter to Another Day */}
      {movingChapterInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <ArrowRightLeft className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-950 dark:text-white">
                    Move Chapter in Schedule
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Choose which day this chapter should be studied
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMovingChapterInfo(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div className="font-extrabold text-slate-900 dark:text-white truncate">
                Ch {movingChapterInfo.chapter.number}: {movingChapterInfo.chapter.title}
              </div>
              <div className="text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>Currently allocated to:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-200">
                  {movingChapterInfo.currentDate}
                </span>
              </div>
              {movingChapterInfo.chapter.scheduledDate && (
                <div className="text-[11px] font-bold text-blue-700 dark:text-blue-400">
                  ⚡ Currently manually pinned to: {movingChapterInfo.chapter.scheduledDate}
                </div>
              )}
            </div>

            {/* Quick date shortcuts */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Quick Scheduling Shortcuts:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetMoveDate(todayStr)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                    targetMoveDate === todayStr
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800 hover:border-blue-500'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  <span>Today ({todayStr.slice(5)})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tom = format(addDays(parseISO(todayStr), 1), 'yyyy-MM-dd');
                    setTargetMoveDate(tom);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                    targetMoveDate === format(addDays(parseISO(todayStr), 1), 'yyyy-MM-dd')
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800 hover:border-blue-500'
                  }`}
                >
                  <Calendar className="w-3 h-3 text-blue-500" />
                  <span>Tomorrow</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const in2Days = format(addDays(parseISO(todayStr), 2), 'yyyy-MM-dd');
                    setTargetMoveDate(in2Days);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                    targetMoveDate === format(addDays(parseISO(todayStr), 2), 'yyyy-MM-dd')
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800 hover:border-blue-500'
                  }`}
                >
                  <span>+2 Days</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const in7Days = format(addDays(parseISO(todayStr), 7), 'yyyy-MM-dd');
                    setTargetMoveDate(in7Days);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                    targetMoveDate === format(addDays(parseISO(todayStr), 7), 'yyyy-MM-dd')
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800 hover:border-blue-500'
                  }`}
                >
                  <span>Next Week</span>
                </button>
              </div>
            </div>

            {/* Custom Date Input */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Or Choose a Specific Date:
              </label>
              <input
                type="date"
                value={targetMoveDate}
                min={goal.startDate}
                max={goal.targetDate}
                onChange={(e) => setTargetMoveDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-950 dark:text-white focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800">
              {movingChapterInfo.chapter.scheduledDate ? (
                <button
                  type="button"
                  onClick={() => handleMoveChapterToDate(movingChapterInfo.chapter.id, undefined)}
                  className="px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                  title="Remove manual date and let the algorithm distribute automatically"
                >
                  Return to Auto-Pacing
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMovingChapterInfo(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (targetMoveDate) {
                      handleMoveChapterToDate(movingChapterInfo.chapter.id, targetMoveDate);
                    }
                  }}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  Move Chapter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: Add / Schedule Chapters to a Specific Date */}
      {addingChapterToDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-950 dark:text-white">
                    Add Chapters to Date: <span className="font-mono text-blue-600 dark:text-blue-400">{addingChapterToDate}</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Select which chapters you want to allocate specifically to this date
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddingChapterToDate(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={addModalSearch}
                onChange={(e) => setAddModalSearch(e.target.value)}
                placeholder="Search by chapter, number, or material..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-950 dark:text-white focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Chapters List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[220px]">
              {allGoalChapters
                .filter((ch) => {
                  if (!addModalSearch.trim()) return true;
                  const q = addModalSearch.toLowerCase();
                  return (
                    ch.title.toLowerCase().includes(q) ||
                    String(ch.number).includes(q) ||
                    ch.materialTitle.toLowerCase().includes(q)
                  );
                })
                .map((ch) => {
                  const isAlreadyOnThisDay = ch.scheduledDate === addingChapterToDate;
                  const isSelected = addModalSelectedChapterIds.includes(ch.id);

                  return (
                    <div
                      key={ch.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                        isAlreadyOnThisDay
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                          : isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected || isAlreadyOnThisDay}
                          disabled={isAlreadyOnThisDay}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAddModalSelectedChapterIds([...addModalSelectedChapterIds, ch.id]);
                            } else {
                              setAddModalSelectedChapterIds(
                                addModalSelectedChapterIds.filter((id) => id !== ch.id)
                              );
                            }
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="truncate">
                          <div className="font-bold text-slate-950 dark:text-slate-100 truncate">
                            Ch {ch.number}: {ch.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {ch.materialTitle}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isAlreadyOnThisDay ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Already on this day
                          </span>
                        ) : ch.scheduledDate ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Scheduled for {ch.scheduledDate}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Auto-Paced
                          </span>
                        )}

                        {!isAlreadyOnThisDay && (
                          <button
                            type="button"
                            onClick={() => handleMoveChapterToDate(ch.id, addingChapterToDate)}
                            className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
                          >
                            Schedule
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                {addModalSelectedChapterIds.length} chapter(s) selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAddingChapterToDate(null)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
                {addModalSelectedChapterIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      handleAssignChaptersToDate(addModalSelectedChapterIds, addingChapterToDate)
                    }
                    className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm cursor-pointer"
                  >
                    Schedule Selected for {addingChapterToDate}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: Full Pacing Studio (Organize Whole Schedule) */}
      {isPacingStudioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div>
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  <Sliders className="w-4 h-4 stroke-[2.5]" />
                  <span>Custom Pacing Studio</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white mt-0.5">
                  Customize Pacing Schedule & Move Chapters
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Set exact dates for chapters or let the dynamic auto-pacing distribute them.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPacingStudioOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter and Batch Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl shrink-0">
              <div className="flex items-center gap-2 flex-wrap flex-1">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={studioSearch}
                    onChange={(e) => setStudioSearch(e.target.value)}
                    placeholder="Filter chapters..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-950 dark:text-white focus:outline-none focus:border-blue-600"
                  />
                </div>

                <select
                  value={studioSelectedMaterialId}
                  onChange={(e) => setStudioSelectedMaterialId(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  <option value="all">All Materials</option>
                  {goal.materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={studioBatchDate}
                  min={goal.startDate}
                  max={goal.targetDate}
                  onChange={(e) => setStudioBatchDate(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-950 dark:text-white"
                  title="Date to move selected chapters to"
                />
                <button
                  type="button"
                  disabled={!studioBatchDate || studioSelectedChapterIds.length === 0}
                  onClick={() => {
                    if (studioBatchDate && studioSelectedChapterIds.length > 0) {
                      handleAssignChaptersToDate(studioSelectedChapterIds, studioBatchDate);
                      setStudioSelectedChapterIds([]);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                >
                  Move Selected ({studioSelectedChapterIds.length})
                </button>
                <button
                  type="button"
                  onClick={handleResetAllToAuto}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Restore dynamic auto-pacing for all chapters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All to Auto</span>
                </button>
              </div>
            </div>

            {/* Chapters Table */}
            <div className="flex-1 overflow-y-auto rounded-xl border border-slate-300 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 uppercase font-black border-b border-slate-200 dark:border-slate-800 sticky top-0">
                  <tr>
                    <th className="p-3 w-10">
                      <input
                        type="checkbox"
                        checked={
                          studioSelectedChapterIds.length > 0 &&
                          studioSelectedChapterIds.length === allGoalChapters.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setStudioSelectedChapterIds(allGoalChapters.map((c) => c.id));
                          } else {
                            setStudioSelectedChapterIds([]);
                          }
                        }}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                      />
                    </th>
                    <th className="p-3">Chapter</th>
                    <th className="p-3">Material</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Scheduled Date</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {allGoalChapters
                    .filter((ch) => {
                      if (studioSelectedMaterialId !== 'all' && ch.materialId !== studioSelectedMaterialId) {
                        return false;
                      }
                      if (!studioSearch.trim()) return true;
                      const q = studioSearch.toLowerCase();
                      return (
                        ch.title.toLowerCase().includes(q) ||
                        String(ch.number).includes(q) ||
                        ch.materialTitle.toLowerCase().includes(q)
                      );
                    })
                    .map((ch) => {
                      const isSelected = studioSelectedChapterIds.includes(ch.id);

                      return (
                        <tr
                          key={ch.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors ${
                            isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                          }`}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setStudioSelectedChapterIds([...studioSelectedChapterIds, ch.id]);
                                } else {
                                  setStudioSelectedChapterIds(
                                    studioSelectedChapterIds.filter((id) => id !== ch.id)
                                  );
                                }
                              }}
                              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            Ch {ch.number}: {ch.title}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">
                            {ch.materialTitle}
                          </td>
                          <td className="p-3">
                            {ch.isCompleted ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                Completed
                              </span>
                            ) : ch.scheduledDate ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                Manual ({ch.scheduledDate})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                Auto-Pacing
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <input
                              type="date"
                              value={ch.scheduledDate || ''}
                              min={goal.startDate}
                              max={goal.targetDate}
                              onChange={(e) =>
                                handleMoveChapterToDate(ch.id, e.target.value || undefined)
                              }
                              className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-slate-950 dark:text-white"
                            />
                          </td>
                          <td className="p-3 text-right">
                            {ch.scheduledDate ? (
                              <button
                                type="button"
                                onClick={() => handleMoveChapterToDate(ch.id, undefined)}
                                className="px-2.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline cursor-pointer"
                              >
                                Clear (Auto)
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Dynamic (Auto)</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Total of {allGoalChapters.length} chapters in curriculum.
              </span>
              <button
                type="button"
                onClick={() => setIsPacingStudioOpen(false)}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Done & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
