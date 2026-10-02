import { addDays, differenceInCalendarDays, format, isAfter, isBefore, isSameDay, parseISO } from 'date-fns';
import { AttemptLog, AttemptStatus, ErrorReason, PriorityScoredItem, Question, SRSItem, SRSStage } from '../types';

/**
 * Format today's date in local YYYY-MM-DD
 */
export function getTodayDateString(referenceDate: Date = new Date()): string {
  return format(referenceDate, 'yyyy-MM-dd');
}

/**
 * Calculate the next SRS state based on attempt outcome and current stage
 */
export function calculateNextSRSState(
  currentSRS: SRSItem,
  status: AttemptStatus,
  isSameDayReview: boolean = false,
  todayStr: string = getTodayDateString()
): {
  stage: SRSStage;
  intervalDays: number;
  dueDate: string;
  isSameDayPending: boolean;
  repetitionCount: number;
} {
  const today = parseISO(todayStr);

  if (isSameDayReview) {
    if (status === 'CORRECT') {
      // User successfully remediated today's error!
      // Progresses out of same-day queue into D+3
      return {
        stage: 'INTERVAL_3',
        intervalDays: 3,
        dueDate: format(addDays(today, 3), 'yyyy-MM-dd'),
        isSameDayPending: false,
        repetitionCount: currentSRS.repetitionCount + 1,
      };
    } else {
      // Failed same-day remediation; still pending in same-day queue
      return {
        stage: 'SAME_DAY',
        intervalDays: 0,
        dueDate: todayStr,
        isSameDayPending: true,
        repetitionCount: currentSRS.repetitionCount + 1,
      };
    }
  }

  // Standard attempt/review flow
  if (status === 'INCORRECT') {
    // FAILED:
    // 1. Immediately enters same-day queue for remediation today
    // 2. Base schedule set to D+3
    return {
      stage: 'INTERVAL_3',
      intervalDays: 3,
      dueDate: format(addDays(today, 3), 'yyyy-MM-dd'),
      isSameDayPending: true, // Needs same-day check before day ends
      repetitionCount: currentSRS.repetitionCount + 1,
    };
  }

  // CORRECT answer flow:
  if (currentSRS.stage === 'SAME_DAY' || currentSRS.stage === 'INTERVAL_3') {
    // First correct answer after an error -> moves to D+7
    return {
      stage: 'INTERVAL_7',
      intervalDays: 7,
      dueDate: format(addDays(today, 7), 'yyyy-MM-dd'),
      isSameDayPending: false,
      repetitionCount: currentSRS.repetitionCount + 1,
    };
  }

  if (currentSRS.stage === 'INTERVAL_7') {
    // Reviewed at D+7 and answered correctly -> Graduates (+14 days or Mastered)
    return {
      stage: 'GRADUATED',
      intervalDays: 14,
      dueDate: format(addDays(today, 14), 'yyyy-MM-dd'),
      isSameDayPending: false,
      repetitionCount: currentSRS.repetitionCount + 1,
    };
  }

  // Already graduated and answered correctly -> stays graduated, pushes +30 days
  return {
    stage: 'GRADUATED',
    intervalDays: 30,
    dueDate: format(addDays(today, 30), 'yyyy-MM-dd'),
    isSameDayPending: false,
    repetitionCount: currentSRS.repetitionCount + 1,
  };
}

/**
 * Calculate Priority Score (0 - 100)
 * Formula: Priority = (0.4 * Overdue Score) + (0.4 * Historical Error Rate) + (0.2 * Topic Weight Score)
 */
export function calculatePriorityScore(
  question: Question,
  todayStr: string = getTodayDateString()
): PriorityScoredItem {
  const today = parseISO(todayStr);
  const due = parseISO(question.srsItem.dueDate);

  // Overdue Days calculation
  const dayDiff = differenceInCalendarDays(today, due);
  const overdueDays = Math.max(0, dayDiff);

  // Overdue score: 0 to 100 (5+ days overdue = 100)
  const overdueScore = Math.min(100, overdueDays * 20);

  // Historical error rate calculation (0 to 100)
  const totalAttempts = question.attempts.length;
  let historicalErrorRate = 100;
  if (totalAttempts > 0) {
    const incorrectCount = question.attempts.filter((a) => a.status === 'INCORRECT').length;
    historicalErrorRate = Math.round((incorrectCount / totalAttempts) * 100);
  }

  // Topic weight score (1-5 scaled to 20-100)
  const topicWeight = question.topicWeight || 3;
  const topicWeightScore = (topicWeight / 5) * 100;

  // Weighted total (0 to 100)
  const rawPriority = 0.4 * overdueScore + 0.4 * historicalErrorRate + 0.2 * topicWeightScore;
  const priorityScore = Math.round(Math.min(100, Math.max(0, rawPriority)));

  return {
    question,
    overdueDays,
    historicalErrorRate,
    topicWeight,
    priorityScore,
  };
}

/**
 * Filter and sort due reviews according to anti-snowball cap and priority scoring
 */
export function getDailyChecklistData(
  questions: Question[],
  dailyCap: number = 30,
  todayStr: string = getTodayDateString()
): {
  sameDayPending: Question[];
  dueReviews: PriorityScoredItem[];
  overdueCount: number;
  rolledOverCount: number;
  totalDueCount: number;
} {
  const today = parseISO(todayStr);

  // Block 3: Same-day pending queue
  const sameDayPending = questions.filter(
    (q) => q.srsItem.isSameDayPending
  );

  // Block 2: Due Spaced Reviews (due_date <= today AND stage !== GRADUATED or due graduated)
  // Exclude questions that are purely same-day pending to avoid duplicate action blocks
  const eligibleForReview = questions.filter((q) => {
    // If it's already in same-day pending, it is handled in Block 3 first
    if (q.srsItem.isSameDayPending) return false;

    const due = parseISO(q.srsItem.dueDate);
    return isBefore(due, today) || isSameDay(due, today);
  });

  // Calculate priority score for each
  const scoredReviews = eligibleForReview.map((q) => calculatePriorityScore(q, todayStr));

  // Sort descending by priority score
  scoredReviews.sort((a, b) => b.priorityScore - a.priorityScore);

  const totalDueCount = scoredReviews.length;
  const overdueCount = scoredReviews.filter((item) => item.overdueDays > 0).length;

  // Apply Daily Cap to prevent snowball burnout
  const cappedReviews = scoredReviews.slice(0, dailyCap);
  const rolledOverCount = Math.max(0, totalDueCount - dailyCap);

  return {
    sameDayPending,
    dueReviews: cappedReviews,
    overdueCount,
    rolledOverCount,
    totalDueCount,
  };
}

/**
 * Human readable names for error categories
 */
export const ERROR_CATEGORY_DETAILS: Record<
  ErrorReason,
  {
    label: string;
    description: string;
    remediationTip: string;
    color: string;
    border: string;
    bg: string;
  }
> = {
  THEORY: {
    label: 'Theoretical Gap',
    description: 'Underlying formula, rule, or core concept was misunderstood or forgotten.',
    remediationTip: 'Review textbook chapter summary and derive the formula from first principles.',
    color: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
  },
  ATTENTION: {
    label: 'Carelessness / Misread',
    description: 'Misread the prompt constraint, units, or question qualifier (e.g. "NOT", "LEAST").',
    remediationTip: 'Always circle or underline the final target variable before solving.',
    color: 'text-rose-400',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/10',
  },
  CALCULATION: {
    label: 'Calculation Error',
    description: 'Arithmetic blunder, sign slip, or algebraic rearrangement mistake.',
    remediationTip: 'Write intermediate algebra steps explicitly; avoid mental arithmetic in timed steps.',
    color: 'text-sky-400',
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/10',
  },
  TIME: {
    label: 'Time Management / Guess',
    description: 'Ran short on clock time, rushed through answer choices, or took a wild guess.',
    remediationTip: 'Mark & skip questions exceeding 90 seconds early; return with fresh perspective.',
    color: 'text-violet-400',
    border: 'border-violet-500/30',
    bg: 'bg-violet-500/10',
  },
};

/**
 * Identify chronic mistake questions ("Leeches").
 * Questions with 2+ failed attempts or recurring cognitive traps.
 */
export function isLeechQuestion(q: Question): boolean {
  const incorrectCount = q.attempts.filter((a) => a.status === 'INCORRECT').length;
  return incorrectCount >= 2;
}

/**
 * Export questions directly formatted for Anki (.tsv file: Front / Question \t Back / Answer & Notes \t Tags)
 */
export function generateAnkiTSV(questions: Question[]): string {
  const header = '#separator:tab\n#html:true\n#tags column:3\n';
  const rows = questions.map((q) => {
    const errorCat = q.attempts.find((a) => a.errorReason)?.errorReason || 'ATTENTION';
    const errorLabel = ERROR_CATEGORY_DETAILS[errorCat]?.label || 'Error';
    
    // Front: Source Reference + Topic Weight
    const front = `<b>${q.sourceRef}</b><br><small>Exam Importance: ${q.topicWeight}/5</small>`;
    
    // Back: Root Cause, Notes, Solution
    const back = `<div style="font-family: sans-serif;"><b>Diagnosis:</b> <span style="color:#e11d48">${errorLabel}</span><br><br>${
      q.notes ? `<b>Key Trap / Insight:</b> ${q.notes}` : ''
    }</div>`;
    
    const tags = `ApexSRS ${errorCat} Stage_${q.srsItem.stage}`;
    return `${front}\t${back}\t${tags}`;
  });

  return header + rows.join('\n');
}

/**
 * Export questions to standard CSV for Excel or Google Sheets
 */
export function generateQuestionsCSV(questions: Question[]): string {
  const headers = ['ID', 'Reference', 'Error Taxonomy', 'SRS Stage', 'Due Date', 'Repetitions', 'Weight', 'Notes', 'Created At'];
  const rows = questions.map((q) => {
    const errorCat = q.attempts.find((a) => a.errorReason)?.errorReason || 'ATTENTION';
    const errorLabel = ERROR_CATEGORY_DETAILS[errorCat]?.label || 'None';
    const cleanNotes = (q.notes || '').replace(/"/g, '""');
    return [
      `"${q.id}"`,
      `"${q.sourceRef.replace(/"/g, '""')}"`,
      `"${errorLabel}"`,
      `"${q.srsItem.stage}"`,
      `"${q.srsItem.dueDate}"`,
      q.srsItem.repetitionCount,
      q.topicWeight,
      `"${cleanNotes}"`,
      `"${q.createdAt}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

