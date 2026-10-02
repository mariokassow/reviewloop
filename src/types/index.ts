export type ErrorReason = 'THEORY' | 'ATTENTION' | 'CALCULATION' | 'TIME';

export type AttemptStatus = 'CORRECT' | 'INCORRECT';

export type SRSStage = 'SAME_DAY' | 'INTERVAL_3' | 'INTERVAL_7' | 'GRADUATED';

export type UnitType = 'CHAPTER' | 'PAGE' | 'LESSON' | 'MODULE' | 'EXERCISE_BLOCK';

export type MaterialFormat = 'BOOK' | 'VIDEO_COURSE' | 'PDF_SUMMARY' | 'QUESTION_BANK';

export type MockExamScoringType = 'PERCENTAGE' | 'RAW_SCORE' | 'SCALED_SCORE';

export interface SubjectScoreBreakdown {
  subject: string;
  score?: number;
  maxScore?: number;
  errorCount?: number;
}

export interface AttemptLog {
  id: string;
  questionId: string;
  date: string; // ISO date string
  status: AttemptStatus;
  errorReason?: ErrorReason;
  userNote?: string;
  blindAnswer?: string; // Answer typed during active recall blind re-attempt
  subTags?: string[]; // e.g. ["#formula", "#trap", "#speed-rush", "#memorization"]
}

export interface SRSItem {
  id: string;
  questionId: string;
  stage: SRSStage;
  intervalDays: number;
  dueDate: string; // YYYY-MM-DD
  lastReviewed?: string; // ISO
  repetitionCount: number;
  isSameDayPending: boolean; // True if failed today and needs same-day remediation
}

export interface Question {
  id: string;
  userId: string;
  materialId: string;
  chapterId: string;
  sourceRef: string; // e.g. "Q14 - Page 120"
  topicWeight: number; // 1 to 5 (importance / high-yield priority)
  notes?: string;
  subTags?: string[]; // e.g. ["#trap", "#formula-slip", "#definition"]
  createdAt: string;
  attempts: AttemptLog[];
  srsItem: SRSItem;
}

export interface Chapter {
  id: string;
  materialId: string;
  number: number;
  title: string;
  topic?: string;
  isCompleted: boolean;
  completedAt?: string;
  scheduledDate?: string; // Explicit scheduled date override (YYYY-MM-DD)
  subTags?: string[];
}

export interface Material {
  id: string;
  goalId: string;
  title: string;
  totalUnits: number;
  unitType: UnitType;
  format?: MaterialFormat;
  subject?: string;
  chapters: Chapter[];
}

export interface MockExam {
  id: string;
  goalId?: string;
  title: string;
  date: string; // YYYY-MM-DD
  scoringType?: MockExamScoringType;
  score?: number;
  maxScore?: number;
  targetScore?: number;
  errorCount?: number | string;
  subjectBreakdown?: SubjectScoreBreakdown[];
  notes?: string;
}

export interface StudyGoal {
  id: string;
  userId: string;
  title: string;
  examName?: string;
  startDate: string; // YYYY-MM-DD
  targetDate: string; // YYYY-MM-DD
  bufferPercentage: number; // e.g. 0.15 for 15%
  activeDaysOfWeek: number[]; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  dailyReviewCap: number; // e.g. 30
  subjects?: string[];
  materials: Material[];
  mockExams?: MockExam[];
  createdAt: string;
}

export interface PriorityScoredItem {
  question: Question;
  overdueDays: number;
  historicalErrorRate: number; // 0 to 100
  topicWeight: number; // 1 to 5
  priorityScore: number; // 0 to 100
}

export interface PacingCalculation {
  totalCalendarDays: number;
  totalActiveStudyDays: number;
  bufferDays: number;
  effectiveStudyDays: number;
  completedUnits: number;
  totalUnits: number;
  remainingUnits: number;
  daysPassed: number;
  remainingActiveStudyDays: number;
  dailyPace: number;
  expectedUnitsCompletedByToday: number;
  paceStatus: 'ON_TRACK' | 'BEHIND' | 'AHEAD';
  missedUnits: number;
}

export interface ScheduledDay {
  dateStr: string; // YYYY-MM-DD
  dayOfWeek: number;
  dayName: string;
  isToday: boolean;
  isPast: boolean;
  isActiveDay: boolean;
  isBufferDay: boolean;
  chapters: Chapter[];
}
