import { addDays, format } from 'date-fns';
import { Chapter, Material, MockExam, Question, StudyGoal } from '../types';

export interface PracticeTestRecord {
  id: string;
  date: string;
  testName: string;
  totalScore?: number;
  rwScore?: number;
  mathScore?: number;
  errorCount?: string | number;
  notes: string;
}

export const INITIAL_MOCK_EXAMS: MockExam[] = [];
export const DEMO_PRACTICE_TESTS: PracticeTestRecord[] = [];

/**
 * Completely clean, vanilla initial study goal.
 */
export function getInitialStudyGoal(): StudyGoal {
  const goalId = 'goal-1';
  const today = new Date();
  const startDateStr = format(today, 'yyyy-MM-dd');
  const targetDateStr = format(addDays(today, 30), 'yyyy-MM-dd');

  const defaultChapters: Chapter[] = Array.from({ length: 10 }, (_, i) => ({
    id: `ch-mat-1-${i + 1}`,
    materialId: 'mat-1',
    number: i + 1,
    title: `Chapter ${i + 1}`,
    topic: '',
    isCompleted: false,
  }));

  const initialMaterial: Material = {
    id: 'mat-1',
    goalId,
    title: 'Textbook / Course Material 1',
    totalUnits: defaultChapters.length,
    unitType: 'CHAPTER',
    format: 'BOOK',
    subject: 'General',
    chapters: defaultChapters,
  };

  return {
    id: goalId,
    userId: 'user-default',
    title: 'My Study Curriculum',
    examName: '',
    startDate: startDateStr,
    targetDate: targetDateStr,
    bufferPercentage: 0.15,
    activeDaysOfWeek: [1, 2, 3, 4, 5, 6],
    dailyReviewCap: 30,
    materials: [initialMaterial],
    mockExams: [],
    createdAt: startDateStr,
  };
}

/**
 * 100% vanilla questions vault: starts completely empty.
 */
export function getInitialQuestions(): Question[] {
  return [];
}
