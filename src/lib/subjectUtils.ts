import { Chapter, Material, MockExam, Question, StudyGoal } from '../types';

export interface SubjectBadgeStyle {
  id: string;
  name: string;
  bg: string;
  text: string;
  border: string;
  accentBar: string;
  pillBg: string;
}

const PALETTE: Omit<SubjectBadgeStyle, 'id' | 'name'>[] = [
  {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/60',
    accentBar: 'bg-blue-600 dark:bg-blue-500',
    pillBg: 'bg-blue-100 dark:bg-blue-900/60',
  },
  {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    accentBar: 'bg-emerald-600 dark:bg-emerald-500',
    pillBg: 'bg-emerald-100 dark:bg-emerald-900/60',
  },
  {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800/60',
    accentBar: 'bg-purple-600 dark:bg-purple-500',
    pillBg: 'bg-purple-100 dark:bg-purple-900/60',
  },
  {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/60',
    accentBar: 'bg-amber-600 dark:bg-amber-500',
    pillBg: 'bg-amber-100 dark:bg-amber-900/60',
  },
  {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800/60',
    accentBar: 'bg-rose-600 dark:bg-rose-500',
    pillBg: 'bg-rose-100 dark:bg-rose-900/60',
  },
  {
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800/60',
    accentBar: 'bg-cyan-600 dark:bg-cyan-500',
    pillBg: 'bg-cyan-100 dark:bg-cyan-900/60',
  },
  {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800/60',
    accentBar: 'bg-indigo-600 dark:bg-indigo-500',
    pillBg: 'bg-indigo-100 dark:bg-indigo-900/60',
  },
  {
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800/60',
    accentBar: 'bg-teal-600 dark:bg-teal-500',
    pillBg: 'bg-teal-100 dark:bg-teal-900/60',
  },
];

/**
 * Deterministically get color styles for any user-defined subject name.
 */
export function getSubjectStyle(subjectName?: string): SubjectBadgeStyle {
  const name = subjectName?.trim() || 'General';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  const style = PALETTE[index];

  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    ...style,
  };
}

/**
 * Extracts all distinct subjects from materials, chapters, and questions.
 */
export function extractGoalSubjects(materials: Material[], chapters?: Chapter[]): string[] {
  const set = new Set<string>();

  materials.forEach((m) => {
    if (m.subject && m.subject.trim()) {
      set.add(m.subject.trim());
    }
    m.chapters.forEach((c) => {
      if (c.topic && c.topic.trim()) {
        set.add(c.topic.trim());
      }
    });
  });

  if (chapters) {
    chapters.forEach((c) => {
      if (c.topic && c.topic.trim()) {
        set.add(c.topic.trim());
      }
    });
  }

  return Array.from(set);
}

/**
 * Resolve the subject name for a specific question based on its chapter and material.
 */
export function getQuestionResolvedSubject(
  q: Question,
  materials: Material[],
  chapters: Chapter[]
): string {
  const ch = chapters.find((c) => c.id === q.chapterId);
  if (ch?.topic && ch.topic.trim()) return ch.topic.trim();

  const mat = materials.find((m) => m.id === q.materialId);
  if (mat?.subject && mat.subject.trim()) return mat.subject.trim();
  if (mat?.title) return mat.title.split('—')[0].trim();

  return 'General';
}

/**
 * Universal Mock Exam score formatter.
 */
export function formatMockExamScore(exam: MockExam): {
  display: string;
  percentage?: number;
  isPassing?: boolean;
} {
  const score = exam.score;
  const maxScore = exam.maxScore;
  const targetScore = exam.targetScore;

  if (score === undefined || score === null) {
    return { display: '—' };
  }

  let pct: number | undefined = undefined;
  if (maxScore && maxScore > 0) {
    pct = Math.round((score / maxScore) * 100);
  }

  const isPassing = targetScore !== undefined ? score >= targetScore : undefined;

  switch (exam.scoringType) {
    case 'PERCENTAGE':
      return {
        display: `${score}%`,
        percentage: score,
        isPassing,
      };
    case 'RAW_SCORE':
      return {
        display: maxScore ? `${score} / ${maxScore}` : `${score} pts`,
        percentage: pct,
        isPassing,
      };
    case 'SCALED_SCORE':
    default:
      return {
        display: maxScore ? `${score} / ${maxScore}` : `${score}`,
        percentage: pct,
        isPassing,
      };
  }
}
