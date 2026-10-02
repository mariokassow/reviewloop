import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  getDay,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
} from 'date-fns';
import { Chapter, PacingCalculation, ScheduledDay, StudyGoal } from '../types';
import { getTodayDateString } from './srsEngine';

/**
 * Safely extract the local YYYY-MM-DD date string when a chapter was completed.
 * Handles both plain YYYY-MM-DD strings and ISO timestamps across timezones.
 */
export function getChapterCompletedDateStr(completedAt?: string): string | undefined {
  if (!completedAt) return undefined;
  if (completedAt.length === 10) return completedAt;
  try {
    const d = new Date(completedAt);
    if (!isNaN(d.getTime())) {
      return format(d, 'yyyy-MM-dd');
    }
  } catch {
    // fallback
  }
  return completedAt.slice(0, 10);
}

/**
 * Check if a chapter was marked completed on a given target date (defaults to today).
 */
export function isChapterCompletedOnDate(
  completedAt?: string,
  targetDateStr: string = getTodayDateString()
): boolean {
  if (!completedAt) return false;
  if (completedAt === targetDateStr) return true;
  const cDate = getChapterCompletedDateStr(completedAt);
  return cDate === targetDateStr;
}

/**
 * Check if a date is an active study day based on activeDaysOfWeek
 * dayOfWeek: 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
 */
export function isActiveStudyDay(date: Date, activeDaysOfWeek: number[]): boolean {
  const day = getDay(date);
  return activeDaysOfWeek.includes(day);
}

/**
 * Compute the comprehensive pacing metrics for a study goal
 */
export function calculatePacingMetrics(
  goal: StudyGoal,
  todayStr: string = getTodayDateString()
): PacingCalculation {
  const start = parseISO(goal.startDate);
  const target = parseISO(goal.targetDate);
  const today = parseISO(todayStr);

  const safeTarget = isBefore(target, start) ? addDays(start, 30) : target;

  const allChapters = goal.materials.flatMap((m) => m.chapters);
  const totalUnits = allChapters.length;
  const completedUnits = allChapters.filter((c) => c.isCompleted).length;
  const remainingUnits = Math.max(0, totalUnits - completedUnits);

  // Interval of full goal window
  const allDaysInWindow = eachDayOfInterval({ start, end: safeTarget });
  const totalCalendarDays = allDaysInWindow.length;

  // Active study days across entire window
  const activeDaysInWindow = allDaysInWindow.filter((d) =>
    isActiveStudyDay(d, goal.activeDaysOfWeek)
  );
  const totalActiveStudyDays = activeDaysInWindow.length;

  // Buffer days reserved (e.g. 15% of active study days)
  const bufferDays = Math.max(1, Math.round(totalActiveStudyDays * (goal.bufferPercentage || 0.15)));
  const effectiveStudyDays = Math.max(1, totalActiveStudyDays - bufferDays);

  // Days passed from start to today
  const daysPassed = Math.max(0, differenceInCalendarDays(today, start));

  // Active study days from today until target date
  const futureOrTodayDays = allDaysInWindow.filter(
    (d) => (isAfter(d, today) || isSameDay(d, today)) && isActiveStudyDay(d, goal.activeDaysOfWeek)
  );

  const activeDaysPassedCount = allDaysInWindow.filter(
    (d) => isBefore(d, today) && isActiveStudyDay(d, goal.activeDaysOfWeek)
  ).length;

  const bufferDaysAlreadyPassed = Math.min(
    bufferDays,
    Math.floor((activeDaysPassedCount / Math.max(1, totalActiveStudyDays)) * bufferDays)
  );
  const remainingBufferDays = Math.max(0, bufferDays - bufferDaysAlreadyPassed);

  // Remaining active study days
  const remainingActiveStudyDays = Math.max(1, futureOrTodayDays.length - remainingBufferDays);

  // Daily pace calculation: ceil(remaining units / remaining active study days)
  const dailyPace = remainingUnits > 0
    ? Math.max(1, Math.ceil(remainingUnits / remainingActiveStudyDays))
    : 0;

  // Baseline expected units
  const baselineDailyPace = totalUnits / Math.max(1, effectiveStudyDays);
  const expectedUnitsCompletedByToday = Math.min(
    totalUnits,
    Math.round(activeDaysPassedCount * baselineDailyPace)
  );

  const missedUnits = expectedUnitsCompletedByToday - completedUnits;

  let paceStatus: 'ON_TRACK' | 'BEHIND' | 'AHEAD' = 'ON_TRACK';
  if (missedUnits > 1) {
    paceStatus = 'BEHIND';
  } else if (completedUnits > expectedUnitsCompletedByToday + 1) {
    paceStatus = 'AHEAD';
  }

  return {
    totalCalendarDays,
    totalActiveStudyDays,
    bufferDays,
    effectiveStudyDays,
    completedUnits,
    totalUnits,
    remainingUnits,
    daysPassed,
    remainingActiveStudyDays,
    dailyPace,
    expectedUnitsCompletedByToday,
    paceStatus,
    missedUnits,
  };
}

/**
 * Generate a STABLE, deterministic day-by-day study schedule.
 */
export function generateScheduleCalendar(
  goal: StudyGoal,
  todayStr: string = getTodayDateString()
): ScheduledDay[] {
  const start = parseISO(goal.startDate);
  const target = parseISO(goal.targetDate);
  const today = parseISO(todayStr);

  const safeTarget = isBefore(target, start) ? addDays(start, 30) : target;
  const allChapters = goal.materials.flatMap((m) => m.chapters);
  const daysInWindow = eachDayOfInterval({ start, end: safeTarget });
  const totalActiveDays = daysInWindow.filter((d) =>
    isActiveStudyDay(d, goal.activeDaysOfWeek)
  ).length;

  const bufferDaysCount = Math.max(1, Math.round(totalActiveDays * (goal.bufferPercentage || 0.15)));
  const activeDayList = daysInWindow.filter((d) => isActiveStudyDay(d, goal.activeDaysOfWeek));
  const bufferStep = Math.max(4, Math.floor(activeDayList.length / (bufferDaysCount + 1)));

  const bufferDatesSet = new Set<string>();
  for (let i = 1; i <= bufferDaysCount; i++) {
    const idx = Math.min(activeDayList.length - 1, i * bufferStep - 1);
    if (idx >= 0 && activeDayList[idx]) {
      bufferDatesSet.add(format(activeDayList[idx], 'yyyy-MM-dd'));
    }
  }

  // 1. Chapters explicitly scheduled by date
  const explicitlyScheduledMap = new Map<string, Chapter[]>();
  const explicitChapterIds = new Set<string>();

  allChapters.forEach((ch) => {
    if (ch.scheduledDate) {
      if (!explicitlyScheduledMap.has(ch.scheduledDate)) {
        explicitlyScheduledMap.set(ch.scheduledDate, []);
      }
      explicitlyScheduledMap.get(ch.scheduledDate)!.push(ch);
      explicitChapterIds.add(ch.id);
    }
  });

  // 2. Today assigned chapters (takes into account explicit and completed today)
  const todayAssigned = getTodaysAssignedChapters(goal, todayStr);
  const assignedChapterIds = new Set<string>([
    ...Array.from(explicitChapterIds),
    ...todayAssigned.map((c) => c.id),
  ]);

  // 3. Past completed chapters (without explicit override)
  const pastMap = new Map<string, Chapter[]>();
  allChapters.forEach((ch) => {
    if (ch.isCompleted && ch.completedAt && !explicitChapterIds.has(ch.id)) {
      const cDate = getChapterCompletedDateStr(ch.completedAt);
      if (cDate && cDate < todayStr) {
        if (!pastMap.has(cDate)) pastMap.set(cDate, []);
        pastMap.get(cDate)!.push(ch);
        assignedChapterIds.add(ch.id);
      }
    }
  });

  // 4. Future uncompleted chapters needing auto-distribution (no explicit scheduledDate and not in today)
  const futureAutoChapters = allChapters.filter(
    (c) => !c.isCompleted && !assignedChapterIds.has(c.id)
  );

  // Future active study days after today (excluding buffer days and excluding exam target date)
  const futureStudyDays = activeDayList.filter((d) => {
    const dStr = format(d, 'yyyy-MM-dd');
    return isAfter(d, today) && !bufferDatesSet.has(dStr) && dStr !== goal.targetDate;
  });

  const futureAutoMap = new Map<string, Chapter[]>();
  const numFutureDays = futureStudyDays.length;
  const numFutureChapters = futureAutoChapters.length;

  if (numFutureDays > 0 && numFutureChapters > 0) {
    futureStudyDays.forEach((d, k) => {
      const dStr = format(d, 'yyyy-MM-dd');
      const startIdx = Math.floor((k * numFutureChapters) / numFutureDays);
      const endIdx = Math.floor(((k + 1) * numFutureChapters) / numFutureDays);
      futureAutoMap.set(dStr, futureAutoChapters.slice(startIdx, endIdx));
    });
  }

  const scheduledDays: ScheduledDay[] = daysInWindow.map((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayOfWeek = getDay(day);
    const dayName = format(day, 'EEE');
    const isToday = isSameDay(day, today);
    const isPast = isBefore(day, today);
    const isActive = isActiveStudyDay(day, goal.activeDaysOfWeek);
    const isBuffer = bufferDatesSet.has(dateStr);

    let assignedChapters: Chapter[] = [];
    if (isToday) {
      assignedChapters = todayAssigned;
    } else if (isPast) {
      assignedChapters = [
        ...(explicitlyScheduledMap.get(dateStr) || []),
        ...(pastMap.get(dateStr) || []),
      ];
    } else {
      const explicit = explicitlyScheduledMap.get(dateStr) || [];
      const autoChaps = futureAutoMap.get(dateStr) || [];
      assignedChapters = [...explicit, ...autoChaps];
    }

    // Deduplicate by chapter id
    const seen = new Set<string>();
    const deduplicated = assignedChapters.filter((ch) => {
      if (seen.has(ch.id)) return false;
      seen.add(ch.id);
      return true;
    });

    return {
      dateStr,
      dayOfWeek,
      dayName,
      isToday,
      isPast,
      isActiveDay: isActive,
      isBufferDay: isBuffer,
      chapters: deduplicated,
    };
  });

  return scheduledDays;
}

/**
 * Get today's assigned chapters from the goal.
 * Invariant Rule:
 * 1. Active sequence: All chapters that are either uncompleted (!isCompleted) OR were completed today.
 *    (Chapters completed on past days are preserved in past history).
 * 2. Today quota: Calculated based on the pacing engine and active study days.
 * 3. Any chapter marked completed today remains firmly in today's checklist with its completed status.
 *    The list does NOT delete the chapter or slide a new one in place of it!
 */
export function getTodaysAssignedChapters(
  goal: StudyGoal,
  todayStr: string = getTodayDateString()
): Chapter[] {
  const allChapters = goal.materials.flatMap((m) => m.chapters);
  const pacing = calculatePacingMetrics(goal, todayStr);

  // Active sequence for today: uncompleted chapters + chapters completed today
  const activeChapters = allChapters.filter(
    (c) => !c.isCompleted || isChapterCompletedOnDate(c.completedAt, todayStr)
  );

  // Base daily quota
  const baseQuota = Math.max(
    1,
    Math.ceil(activeChapters.length / Math.max(1, pacing.remainingActiveStudyDays)),
    pacing.dailyPace || 1
  );

  // Completed today count
  const completedTodayCount = allChapters.filter(
    (c) => c.isCompleted && isChapterCompletedOnDate(c.completedAt, todayStr)
  ).length;

  // The quota must at least include all chapters already finished today
  const effectiveQuota = Math.max(baseQuota, completedTodayCount);

  return activeChapters.slice(0, effectiveQuota);
}

/**
 * Get tomorrow's assigned chapters from the curriculum.
 * Returns the next pending chapters right after today's assigned batch.
 */
export function getTomorrowsAssignedChapters(
  goal: StudyGoal,
  todayStr: string = getTodayDateString()
): Chapter[] {
  const allChapters = goal.materials.flatMap((m) => m.chapters);
  const pacing = calculatePacingMetrics(goal, todayStr);

  const todayAssigned = getTodaysAssignedChapters(goal, todayStr);
  const todayIds = new Set(todayAssigned.map((c) => c.id));

  // Upcoming uncompleted chapters right after today's assigned batch
  const upcomingChapters = allChapters.filter(
    (c) => !c.isCompleted && !todayIds.has(c.id)
  );

  const tomorrowQuota = Math.max(1, pacing.dailyPace || 1);
  return upcomingChapters.slice(0, tomorrowQuota);
}

/**
 * Reschedule a chapter to a specific target date (e.g. today, tomorrow, or clear override).
 */
export function rescheduleChapterInGoal(
  goal: StudyGoal,
  chapterId: string,
  newDateStr?: string
): StudyGoal {
  const updatedMaterials = goal.materials.map((m) => ({
    ...m,
    chapters: m.chapters.map((ch) => {
      if (ch.id === chapterId) {
        return {
          ...ch,
          scheduledDate: newDateStr,
        };
      }
      return ch;
    }),
  }));

  return {
    ...goal,
    materials: updatedMaterials,
  };
}

/**
 * Batch reschedule multiple chapters to dates (or clear dates).
 */
export function batchRescheduleChapters(
  goal: StudyGoal,
  updates: { chapterId: string; dateStr?: string }[]
): StudyGoal {
  const updateMap = new Map<string, string | undefined>();
  updates.forEach((u) => updateMap.set(u.chapterId, u.dateStr));

  const updatedMaterials = goal.materials.map((m) => ({
    ...m,
    chapters: m.chapters.map((ch) => {
      if (updateMap.has(ch.id)) {
        return {
          ...ch,
          scheduledDate: updateMap.get(ch.id),
        };
      }
      return ch;
    }),
  }));

  return {
    ...goal,
    materials: updatedMaterials,
  };
}

/**
 * Reset all custom chapter schedules back to auto pacing.
 */
export function resetAllPacingToAuto(goal: StudyGoal): StudyGoal {
  const updatedMaterials = goal.materials.map((m) => ({
    ...m,
    chapters: m.chapters.map((ch) => ({
      ...ch,
      scheduledDate: undefined,
    })),
  }));

  return {
    ...goal,
    materials: updatedMaterials,
  };
}

/**
 * Get upcoming chapters scheduled for tomorrow or future days.
 */
export function getUpcomingAssignedChapters(
  goal: StudyGoal,
  todayStr: string = getTodayDateString()
): { dateStr: string; dayName: string; chapters: Chapter[] }[] {
  const schedule = generateScheduleCalendar(goal, todayStr);
  const futureDays = schedule.filter(
    (d) => !d.isPast && !d.isToday && d.chapters.length > 0
  );
  return futureDays.slice(0, 3).map((d) => ({
    dateStr: d.dateStr,
    dayName: d.dayName,
    chapters: d.chapters,
  }));
}

/**
 * Find the next uncompleted chapter across materials not yet in today's list.
 */
export function getNextAvailableChapter(
  goal: StudyGoal,
  todayChapterIds: Set<string>
): Chapter | undefined {
  const allChapters = goal.materials.flatMap((m) => m.chapters);
  return allChapters.find((c) => !c.isCompleted && !todayChapterIds.has(c.id));
}

/**
 * Helper to get the planned date for each chapter in the curriculum
 */
export function getChapterScheduleMap(
  goal: StudyGoal,
  todayStr: string = getTodayDateString()
): Map<string, { dateStr: string; isToday: boolean; isPast: boolean }> {
  const schedule = generateScheduleCalendar(goal, todayStr);
  const map = new Map<string, { dateStr: string; isToday: boolean; isPast: boolean }>();

  schedule.forEach((day) => {
    day.chapters.forEach((ch) => {
      map.set(ch.id, {
        dateStr: day.dateStr,
        isToday: day.isToday,
        isPast: day.isPast,
      });
    });
  });

  return map;
}

/**
 * Dynamic Recalculation Catch-Up Mode 1:
 * Recalculate schedule keeping original target date (increases daily pace)
 */
export function recalculateGoalSchedule(goal: StudyGoal): StudyGoal {
  return {
    ...goal,
  };
}

/**
 * Dynamic Recalculation Catch-Up Mode 2:
 * Extend target date forward by the exact number of missed study days
 */
export function extendGoalTargetDate(
  goal: StudyGoal,
  todayStr: string = getTodayDateString()
): StudyGoal {
  const metrics = calculatePacingMetrics(goal, todayStr);
  if (metrics.missedUnits <= 0) return goal;

  const daysNeededToCatchUp = Math.ceil(metrics.missedUnits / Math.max(1, metrics.dailyPace));
  const currentTarget = parseISO(goal.targetDate);
  const newTargetDate = format(addDays(currentTarget, Math.max(2, daysNeededToCatchUp * 2)), 'yyyy-MM-dd');

  return {
    ...goal,
    targetDate: newTargetDate,
  };
}
