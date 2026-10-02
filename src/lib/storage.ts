import { addDays, format } from 'date-fns';
import { Chapter, Material, MaterialFormat, MockExam, Question, StudyGoal, UnitType } from '../types';
import { getInitialQuestions, getInitialStudyGoal } from './demoData';

const STORAGE_KEY_GOALS_LIST = 'apexsrs_all_goals_v6';
const STORAGE_KEY_ACTIVE_GOAL_ID = 'apexsrs_active_goal_id_v6';
const STORAGE_KEY_QUESTIONS = 'apexsrs_questions_v6';

/**
 * Creates a new Material with customizable chapters.
 */
export function createMaterial(params: {
  goalId: string;
  title: string;
  totalUnits: number;
  unitType?: UnitType;
  format?: MaterialFormat;
  subject?: string;
  chapterTitles?: string[];
}): Material {
  const materialId = `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const unitType = params.unitType || 'CHAPTER';
  const chapters: Chapter[] = [];
  const count = Math.max(1, params.totalUnits);

  const unitPrefix =
    unitType === 'CHAPTER'
      ? 'Chapter'
      : unitType === 'LESSON'
      ? 'Lesson'
      : unitType === 'MODULE'
      ? 'Module'
      : unitType === 'EXERCISE_BLOCK'
      ? 'Block'
      : 'Page';

  for (let i = 1; i <= count; i++) {
    const customTitle = params.chapterTitles && params.chapterTitles[i - 1];
    chapters.push({
      id: `ch-${materialId}-${i}`,
      materialId,
      number: i,
      title: customTitle && customTitle.trim() ? customTitle.trim() : `${unitPrefix} ${i}`,
      topic: params.subject,
      isCompleted: false,
    });
  }

  return {
    id: materialId,
    goalId: params.goalId,
    title: params.title.trim() || 'New Study Resource',
    totalUnits: chapters.length,
    unitType,
    format: params.format || 'BOOK',
    subject: params.subject,
    chapters,
  };
}

/**
 * Creates a custom study goal based on user parameters.
 */
export function createCustomStudyGoal(params: {
  title?: string;
  examName?: string;
  materialTitle?: string;
  totalUnits?: number;
  unitType?: UnitType;
  format?: MaterialFormat;
  subject?: string;
  chapterTitles?: string[];
  startDate?: string;
  targetDate?: string;
  bufferPercentage?: number;
  activeDaysOfWeek?: number[];
  dailyReviewCap?: number;
  subjects?: string[];
  materials?: Material[];
  mockExams?: MockExam[];
}): StudyGoal {
  const today = new Date();
  const startDateStr = params.startDate || format(today, 'yyyy-MM-dd');
  const targetDateStr = params.targetDate || format(addDays(today, 30), 'yyyy-MM-dd');
  const totalUnits = params.totalUnits || 10;
  const unitType = params.unitType || 'CHAPTER';
  const goalTitle = params.title || 'My Study Sprint';
  const materialTitle = params.materialTitle || 'Course Book / Resource 1';

  const goalId = `goal-${Date.now()}`;
  const materials = params.materials && params.materials.length > 0
    ? params.materials
    : [
        createMaterial({
          goalId,
          title: materialTitle,
          totalUnits,
          unitType,
          format: params.format || 'BOOK',
          subject: params.subject,
          chapterTitles: params.chapterTitles,
        }),
      ];

  return {
    id: goalId,
    userId: 'user-active',
    title: goalTitle,
    examName: params.examName,
    startDate: startDateStr,
    targetDate: targetDateStr,
    bufferPercentage: params.bufferPercentage ?? 0.15,
    activeDaysOfWeek: params.activeDaysOfWeek ?? [1, 2, 3, 4, 5, 6],
    dailyReviewCap: params.dailyReviewCap ?? 30,
    subjects: params.subjects,
    materials,
    mockExams: params.mockExams || [],
    createdAt: startDateStr,
  };
}

/**
 * Loads all saved study goals from localStorage.
 */
export function loadAllGoalsFromStorage(): StudyGoal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GOALS_LIST);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load goals list from storage:', e);
  }

  const defaultGoals = [getInitialStudyGoal()];
  saveAllGoalsToStorage(defaultGoals, defaultGoals[0].id);
  return defaultGoals;
}

/**
 * Loads the active goal ID from localStorage.
 */
export function loadActiveGoalIdFromStorage(allGoals: StudyGoal[]): string {
  try {
    const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_GOAL_ID);
    if (activeId && allGoals.some((g) => g.id === activeId)) {
      return activeId;
    }
  } catch (e) {
    console.error('Failed to load active goal ID:', e);
  }

  return allGoals[0]?.id || '';
}

/**
 * Saves all goals and optional active goal ID to localStorage.
 */
export function saveAllGoalsToStorage(goals: StudyGoal[], activeGoalId?: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_GOALS_LIST, JSON.stringify(goals));
    if (activeGoalId) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_GOAL_ID, activeGoalId);
    }
  } catch (e) {
    console.error('Failed to save all goals to storage:', e);
  }
}

/**
 * Legacy compatibility: load active goal.
 */
export function loadGoalFromStorage(): StudyGoal {
  const allGoals = loadAllGoalsFromStorage();
  const activeId = loadActiveGoalIdFromStorage(allGoals);
  return allGoals.find((g) => g.id === activeId) || allGoals[0] || getInitialStudyGoal();
}

/**
 * Legacy compatibility: save active goal.
 */
export function saveGoalToStorage(goal: StudyGoal | null): void {
  if (!goal) return;
  const allGoals = loadAllGoalsFromStorage();
  const index = allGoals.findIndex((g) => g.id === goal.id);
  let updatedList: StudyGoal[];
  if (index >= 0) {
    updatedList = [...allGoals];
    updatedList[index] = goal;
  } else {
    updatedList = [...allGoals, goal];
  }
  saveAllGoalsToStorage(updatedList, goal.id);
}

/**
 * Loads questions from localStorage (defaults to empty array if none).
 */
export function loadQuestionsFromStorage(): Question[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUESTIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load questions from storage:', e);
  }

  const defaultQuestions = getInitialQuestions();
  saveQuestionsToStorage(defaultQuestions);
  return defaultQuestions;
}

export function saveQuestionsToStorage(questions: Question[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(questions));
  } catch (e) {
    console.error('Failed to save questions to storage:', e);
  }
}

/**
 * Resets storage back to clean vanilla empty state.
 */
export function resetToVanillaState(): { goal: StudyGoal; questions: Question[] } {
  clearAllStorageData();
  const cleanGoal = getInitialStudyGoal();
  const cleanQuestions = getInitialQuestions();

  saveAllGoalsToStorage([cleanGoal], cleanGoal.id);
  saveQuestionsToStorage(cleanQuestions);

  return { goal: cleanGoal, questions: cleanQuestions };
}

/**
 * Clears all user data completely to start fresh from scratch.
 */
export function clearAllStorageData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_GOALS_LIST);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_GOAL_ID);
    localStorage.removeItem(STORAGE_KEY_QUESTIONS);
  } catch (e) {
    console.error('Failed to clear storage:', e);
  }
}
