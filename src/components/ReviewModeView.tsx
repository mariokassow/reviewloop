import React, { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  EyeOff,
  Flame,
  HelpCircle,
  History,
  Layers,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { AttemptStatus, Chapter, Question } from '../types';
import { calculatePriorityScore, ERROR_CATEGORY_DETAILS, getTodayDateString, isLeechQuestion } from '../lib/srsEngine';

interface ReviewModeViewProps {
  questions: Question[];
  chapters: Chapter[];
  initialFilter?: 'all' | 'same_day' | 'due' | 'all_questions' | 'leeches';
  onReviewAttempt: (questionId: string, status: AttemptStatus, isSameDayReview: boolean, blindAnswer?: string) => void;
  onExitReview: () => void;
  onResetSeedData?: () => void;
}

/**
 * Natural curricular sorting:
 * 1. Book / Curriculum Chapters first: grouped by materialId, then Chapter number (Ch 1, Ch 2, Ch 3...), then question/exercise number numerically (1, 2, 3, 4... 10...)
 * 2. Unassigned practice tests second: grouped by test number (Test 1, Test 2...), then question number (Q1, Q2... Q20...)
 * 3. Never interleaves practice tests with chapter exercises
 */
export function sortQuestionsCurricular(questions: Question[], chapters: Chapter[]): Question[] {
  const chapterMap = new Map<string, Chapter>();
  chapters.forEach((c) => chapterMap.set(c.id, c));

  const extractQuestionNumber = (ref: string): number => {
    // 1. Explicit question markers: Q5, Q 5, Question 5, Questão 5, Ex 5, Exercise 5, Item 5, #5
    const qMatch = ref.match(/(?:q(?:uestion|uest[ãa]o|uery)?|item|ex(?:ercise|erc[íi]cio)?|#)\s*(\d+)/i);
    if (qMatch && qMatch[1]) {
      return parseInt(qMatch[1], 10);
    }
    // 2. Trailing delimiter with number: "· 5" or "- 5" or ": 5" or " 5"
    const trailingMatch = ref.match(/[·\-:\s]\s*(\d+)\s*(?:\([^)]*\))?$/);
    if (trailingMatch && trailingMatch[1]) {
      return parseInt(trailingMatch[1], 10);
    }
    // 3. Any numbers found: if multiple exist (like "Ch 1 Ex 10"), take the last number as the question number
    const numbers = [...ref.matchAll(/\d+/g)];
    if (numbers.length > 1) {
      return parseInt(numbers[numbers.length - 1][0], 10);
    } else if (numbers.length === 1) {
      return parseInt(numbers[0][0], 10);
    }
    return 9999;
  };

  const extractTestNumber = (ref: string): number => {
    const match = ref.match(/(?:test|simulado|practice)\s*#?\s*(\d+)/i);
    return match && match[1] ? parseInt(match[1], 10) : 9999;
  };

  return [...questions].sort((a, b) => {
    const chA = chapterMap.get(a.chapterId);
    const chB = chapterMap.get(b.chapterId);

    const hasChapterA = !!chA;
    const hasChapterB = !!chB;

    // Group 1: Book / Curriculum Chapters first
    // Group 2: Practice Tests / Unassigned Questions second
    if (hasChapterA !== hasChapterB) {
      return hasChapterA ? -1 : 1;
    }

    if (hasChapterA && hasChapterB) {
      // Both belong to curriculum chapters:
      // Group by materialId first so books stay grouped
      if (a.materialId !== b.materialId) {
        return a.materialId.localeCompare(b.materialId);
      }

      // Sort by chapter number (Chapter 1 before Chapter 2, etc.)
      const numA = chA.number;
      const numB = chB.number;
      if (numA !== numB) {
        return numA - numB;
      }

      // Within same chapter, sort strictly numerically by exercise / question number (1, 2, 3... 10)
      const qNumA = extractQuestionNumber(a.sourceRef);
      const qNumB = extractQuestionNumber(b.sourceRef);
      if (qNumA !== qNumB) {
        return qNumA - qNumB;
      }

      return a.sourceRef.localeCompare(b.sourceRef);
    } else {
      // Both are unassigned / general practice tests:
      // Group by test number first
      const testNumA = extractTestNumber(a.sourceRef);
      const testNumB = extractTestNumber(b.sourceRef);
      if (testNumA !== testNumB) {
        return testNumA - testNumB;
      }

      // Then sort by question number within the test
      const qNumA = extractQuestionNumber(a.sourceRef);
      const qNumB = extractQuestionNumber(b.sourceRef);
      if (qNumA !== qNumB) {
        return qNumA - qNumB;
      }

      return a.sourceRef.localeCompare(b.sourceRef);
    }
  });
}

export const ReviewModeView: React.FC<ReviewModeViewProps> = ({
  questions,
  chapters,
  initialFilter = 'all',
  onReviewAttempt,
  onExitReview,
  onResetSeedData,
}) => {
  const today = getTodayDateString();

  // Counts for each mode
  const sameDayCount = questions.filter((q) => q.srsItem.isSameDayPending).length;
  const dueCount = questions.filter((q) => !q.srsItem.isSameDayPending && q.srsItem.dueDate <= today).length;
  const allDueCount = questions.filter((q) => q.srsItem.isSameDayPending || q.srsItem.dueDate <= today).length;
  const leechCount = questions.filter(isLeechQuestion).length;
  const totalDeckCount = questions.length;

  // Determine initial filter fallback: if 'all' has 0 due items but questions exist, start in 'all_questions'
  const defaultFilter =
    initialFilter === 'all' && allDueCount === 0 && totalDeckCount > 0
      ? 'all_questions'
      : initialFilter;

  // Helper to build queue
  const buildQueue = (mode: 'all' | 'same_day' | 'due' | 'all_questions' | 'leeches', order: 'curricular' | 'priority') => {
    let eligible = questions.filter((q) => {
      if (mode === 'all_questions') return true;
      if (mode === 'same_day') return q.srsItem.isSameDayPending;
      if (mode === 'due') return !q.srsItem.isSameDayPending && q.srsItem.dueDate <= today;
      if (mode === 'leeches') return isLeechQuestion(q);
      return q.srsItem.isSameDayPending || q.srsItem.dueDate <= today;
    });

    if (order === 'curricular' || mode === 'all_questions') {
      eligible = sortQuestionsCurricular(eligible, chapters);
    } else {
      eligible = [...eligible].sort((a, b) => {
        const scoreA = calculatePriorityScore(a, today).priorityScore;
        const scoreB = calculatePriorityScore(b, today).priorityScore;
        return scoreB - scoreA;
      });
    }

    return eligible.map((q) => q.id);
  };

  const [filterMode, setFilterMode] = useState<'all' | 'same_day' | 'due' | 'all_questions' | 'leeches'>(defaultFilter);
  const [sortOrder, setSortOrder] = useState<'curricular' | 'priority'>('curricular');

  // Active Recall / Blind Re-attempt state
  const [activeRecallMode, setActiveRecallMode] = useState<boolean>(true);
  const [blindAnswer, setBlindAnswer] = useState<string>('');
  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  // Stable session queue of question IDs for the current review session
  const [sessionQueue, setSessionQueue] = useState<string[]>(() => {
    return buildQueue(defaultFilter, 'curricular');
  });
  // Keep original list of IDs so "Practice Again" repeats the exact same deck
  const [originalSessionQueue, setOriginalSessionQueue] = useState<string[]>(() => {
    return buildQueue(defaultFilter, 'curricular');
  });

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [reviewedCount, setReviewedCount] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [incorrectCount, setIncorrectCount] = useState<number>(0);

  // Sync filterMode if initialFilter prop changes
  useEffect(() => {
    if (initialFilter) {
      setFilterMode(initialFilter);
    }
  }, [initialFilter]);

  // Re-build session queue when user switches tab or changes sort order
  useEffect(() => {
    const queue = buildQueue(filterMode, sortOrder);
    setSessionQueue(queue);
    setOriginalSessionQueue(queue);
    setCurrentIndex(0);
    setShowNotes(false);
    setIsRevealed(false);
    setBlindAnswer('');
    setIsCompleted(false);
    setReviewedCount(0);
    setCorrectCount(0);
    setIncorrectCount(0);
  }, [filterMode, sortOrder]);

  const totalInDeck = sessionQueue.length;
  const currentQuestionId = sessionQueue[currentIndex];
  const currentQuestion = questions.find((q) => q.id === currentQuestionId);

  // Chapter info
  const chapter = chapters.find((c) => c.id === currentQuestion?.chapterId);

  // Trigger celebration when completed
  const handleDeckFinished = () => {
    setIsCompleted(true);
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // non-fatal
    }
  };

  const handleRestartDeck = () => {
    // Restart with the original session cards
    setSessionQueue([...originalSessionQueue]);
    setCurrentIndex(0);
    setShowNotes(false);
    setIsRevealed(false);
    setBlindAnswer('');
    setIsCompleted(false);
    setReviewedCount(0);
    setCorrectCount(0);
    setIncorrectCount(0);
  };

  const handleAnswer = (status: AttemptStatus) => {
    if (!currentQuestion) return;

    const isSameDay = currentQuestion.srsItem.isSameDayPending;
    onReviewAttempt(currentQuestion.id, status, isSameDay, activeRecallMode && blindAnswer.trim() ? blindAnswer.trim() : undefined);
    setReviewedCount((prev) => prev + 1);

    if (status === 'CORRECT') {
      setCorrectCount((prev) => prev + 1);
      // If this was the last card in the session queue
      if (currentIndex + 1 >= sessionQueue.length) {
        handleDeckFinished();
      } else {
        // Advance immediately to the next card
        setCurrentIndex((prev) => prev + 1);
      }
    } else {
      setIncorrectCount((prev) => prev + 1);
      // For incorrect attempts: re-queue card to end of session queue so student gets to retry before finishing!
      setSessionQueue((prev) => [...prev, currentQuestion.id]);
      // Advance to next card in session queue
      setCurrentIndex((prev) => prev + 1);
    }

    setShowNotes(false);
    setIsRevealed(false);
    setBlindAnswer('');
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if (isCompleted || !currentQuestion) return;

      if (e.key === 'Escape') {
        onExitReview();
        return;
      }

      // If user is actively typing in the active recall scratchpad, don't trigger answer shortcuts
      if (isInput) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          setIsRevealed(true);
          setShowNotes(true);
        }
        return;
      }

      if (e.key === '1') {
        e.preventDefault();
        handleAnswer('INCORRECT');
      } else if (e.key === '2') {
        e.preventDefault();
        handleAnswer('CORRECT');
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (activeRecallMode && !isRevealed) {
          setIsRevealed(true);
          setShowNotes(true);
        } else {
          setShowNotes((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCompleted, currentQuestion, currentIndex, totalInDeck, activeRecallMode, isRevealed, blindAnswer]);

  const srs = currentQuestion?.srsItem;
  const lastAttempt = currentQuestion?.attempts[currentQuestion.attempts.length - 1];
  const errorTaxonomy = lastAttempt?.errorReason
    ? ERROR_CATEGORY_DETAILS[lastAttempt.errorReason]
    : null;
  const isLeech = currentQuestion ? isLeechQuestion(currentQuestion) : false;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top control bar with ALL 5 Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onExitReview}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        {/* Deck Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-300 dark:border-slate-800 flex-wrap">
          <button
            onClick={() => setFilterMode('all_questions')}
            className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 ${
              filterMode === 'all_questions'
                ? 'bg-blue-600 text-white shadow-sm font-bold'
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-slate-100 font-semibold'
            }`}
          >
            <span>Full Deck</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${filterMode === 'all_questions' ? 'bg-blue-800 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
              {totalDeckCount}
            </span>
          </button>

          <button
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 ${
              filterMode === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm font-bold'
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-slate-100 font-semibold'
            }`}
          >
            <span>Due Today</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${filterMode === 'all' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
              {allDueCount}
            </span>
          </button>

          <button
            onClick={() => setFilterMode('same_day')}
            className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 ${
              filterMode === 'same_day'
                ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800/60 shadow-sm font-bold'
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-slate-100 font-semibold'
            }`}
          >
            <span>Same Day</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${filterMode === 'same_day' ? 'bg-rose-200 text-rose-900 dark:bg-rose-800 dark:text-rose-100' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'}`}>
              {sameDayCount}
            </span>
          </button>

          <button
            onClick={() => setFilterMode('due')}
            className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 ${
              filterMode === 'due'
                ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-800/60 shadow-sm font-bold'
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-slate-100 font-semibold'
            }`}
          >
            <span>Overdue</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${filterMode === 'due' ? 'bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100' : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'}`}>
              {dueCount}
            </span>
          </button>

          <button
            onClick={() => setFilterMode('leeches')}
            className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 ${
              filterMode === 'leeches'
                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800/80 shadow-sm font-bold'
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-slate-100 font-semibold'
            }`}
            title="Questions missed 2 or more times"
          >
            <span>⚠️ Leeches</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${filterMode === 'leeches' ? 'bg-amber-300 dark:bg-amber-800 text-amber-950 dark:text-amber-100' : 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'}`}>
              {leechCount}
            </span>
          </button>
        </div>

        {/* Counter, Sort Toggle & Active Recall Switch */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveRecallMode(!activeRecallMode)}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1.5 ${
              activeRecallMode
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800'
            }`}
            title="Require typing your reasoning or answer before seeing solution"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Active Recall:</span>
            <span>{activeRecallMode ? 'ON' : 'OFF'}</span>
          </button>

          {filterMode === 'all_questions' && (
            <button
              onClick={() => setSortOrder((prev) => (prev === 'curricular' ? 'priority' : 'curricular'))}
              className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-800"
              title="Toggle question ordering"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{sortOrder === 'curricular' ? 'Ch 1 → N' : 'Urgency'}</span>
            </button>
          )}

          {totalInDeck > 0 && !isCompleted && (
            <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">
              <span className="text-slate-950 dark:text-white font-black text-sm">{currentIndex + 1}</span> of{' '}
              <span className="text-slate-800 dark:text-slate-200">{totalInDeck}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar (Solid Blue) */}
      {totalInDeck > 0 && !isCompleted && (
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-300 dark:border-slate-800/60">
          <div
            className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / totalInDeck) * 100}%` }}
          />
        </div>
      )}

      {/* When completed OR when deck is empty for current tab */}
      {(totalInDeck === 0 || isCompleted) && (
        <div className="bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-2xl p-8 sm:p-10 shadow-sm text-center space-y-6 animate-in fade-in duration-200">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">
              {isCompleted
                ? 'Review Session Complete!'
                : filterMode === 'all_questions'
                ? 'No Questions Logged Yet'
                : filterMode === 'leeches'
                ? 'No Chronic Leeches Detected! 🎉'
                : 'Current Queue Cleared for Today!'}
            </h2>
            <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-relaxed">
              {isCompleted
                ? `You reviewed ${reviewedCount} questions in this session. All card outcomes were saved and scheduled along the SRS repetition curve.`
                : filterMode === 'all_questions'
                ? 'There are no questions in your vault. Log new questions or restore study data.'
                : filterMode === 'leeches'
                ? 'Excellent work! You have no questions missed 2+ times in your study bank.'
                : `No items due in this specific queue today, but you have ${totalDeckCount} cards available in the Full Deck to practice anytime.`}
            </p>

            {isCompleted && (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-bold">
                  ✓ {correctCount} Correct
                </span>
                {incorrectCount > 0 && (
                  <span className="px-3 py-1 bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-lg text-xs font-bold">
                    ✕ {incorrectCount} Missed (Scheduled for Repeat)
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {isCompleted && (
              <button
                onClick={handleRestartDeck}
                className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Practice Again ({originalSessionQueue.length})</span>
              </button>
            )}

            {isCompleted && filterMode === 'same_day' && dueCount > 0 && (
              <button
                onClick={() => setFilterMode('due')}
                className="px-5 py-2.5 text-sm font-bold text-blue-700 dark:text-blue-300 hover:text-white bg-blue-100 hover:bg-blue-600 dark:bg-blue-950/60 dark:hover:bg-blue-600 border border-blue-300 dark:border-blue-800 rounded-xl shadow-xs transition-all flex items-center gap-2"
              >
                <span>Continue to Due Reviews ({dueCount})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {totalDeckCount > 0 && filterMode !== 'all_questions' && (
              <button
                onClick={() => setFilterMode('all_questions')}
                className="px-5 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs transition-all flex items-center gap-2"
              >
                <Layers className="w-4 h-4" />
                <span>Practice Full Deck ({totalDeckCount})</span>
              </button>
            )}

            {totalDeckCount === 0 && onResetSeedData && (
              <button
                onClick={onResetSeedData}
                className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Restore Study Error Report</span>
              </button>
            )}

            <button
              onClick={onExitReview}
              className="px-5 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      )}

      {/* FLASHCARD / REVIEW CARD (Rendered when question exists) */}
      {totalInDeck > 0 && !isCompleted && currentQuestion && srs && (
        <div className="bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden transition-colors">
          {/* Chronic Leech Warning Callout */}
          {isLeech && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs font-bold">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                Chronic Error / Leech (Missed {currentQuestion.attempts.filter((a) => a.status === 'INCORRECT').length} times). Focus on authentic conceptual retrieval!
              </span>
            </div>
          )}

          {/* Stage & Type indicators */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              {srs.isSameDayPending ? (
                <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-rose-50 dark:bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-500/40">
                  Same-Day Remediation
                </span>
              ) : srs.stage === 'INTERVAL_3' ? (
                <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-blue-50 dark:bg-blue-500/20 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-500/40">
                  D+3 Intensive Review
                </span>
              ) : srs.stage === 'INTERVAL_7' ? (
                <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-sky-50 dark:bg-sky-500/20 text-sky-800 dark:text-sky-200 border border-sky-300 dark:border-sky-500/40">
                  D+7 Graduated Check
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/40">
                  Mastered / Graduated
                </span>
              )}

              {errorTaxonomy && (
                <span className={`px-2.5 py-1 rounded text-xs font-bold ${errorTaxonomy.bg} ${errorTaxonomy.color} border ${errorTaxonomy.border}`}>
                  {errorTaxonomy.label}
                </span>
              )}
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300 font-mono font-bold">
              Repetition #{srs.repetitionCount}
            </div>
          </div>

          {/* Question Identification */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 flex-wrap">
              <span>{chapter ? `Chapter ${chapter.number}: ${chapter.title}` : 'Study Resource'}</span>
              {currentQuestion.topicWeight && currentQuestion.topicWeight >= 4 && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                  {currentQuestion.topicWeight}★ High-Yield
                </span>
              )}
            </div>
            <h3 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight mt-1">
              {currentQuestion.sourceRef}
            </h3>
            {currentQuestion.subTags && currentQuestion.subTags.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {currentQuestion.subTags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Active Recall / Blind Re-attempt Scratchpad */}
          {activeRecallMode && !isRevealed && (
            <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Blind Re-attempt: Draft your solution or reasoning first</span>
                </label>
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hidden sm:inline">
                  Active Recall Practice
                </span>
              </div>
              <textarea
                rows={3}
                value={blindAnswer}
                onChange={(e) => setBlindAnswer(e.target.value)}
                placeholder="Type your line of reasoning, intermediate steps, or final answer before revealing notes..."
                className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-600 transition-colors"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 font-medium">
                  Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border text-[10px] font-mono">Cmd+Enter</kbd> or click button
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRevealed(true);
                    setShowNotes(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Reveal & Compare Solution</span>
                </button>
              </div>
            </div>
          )}

          {/* Active Recall Revealed Comparison Box */}
          {activeRecallMode && isRevealed && (
            <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                <Edit3 className="w-3.5 h-3.5" />
                <span>Your Blind Re-attempt Reasoning:</span>
              </div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-sans whitespace-pre-wrap pl-1">
                {blindAnswer.trim() ? (
                  <span className="italic">"{blindAnswer.trim()}"</span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 italic">(Proceeded without typing draft)</span>
                )}
              </div>
            </div>
          )}

          {/* Diagnostic Taxonomy Explainer */}
          {(!activeRecallMode || isRevealed) && errorTaxonomy && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-800 space-y-1.5">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Cognitive Vulnerability: {errorTaxonomy.label}</span>
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                {errorTaxonomy.description}
              </p>
              <div className="text-xs text-blue-800 dark:text-blue-300 pt-1.5 border-t border-slate-300 dark:border-slate-800/80 font-medium">
                <span className="font-extrabold text-blue-700 dark:text-blue-400">Tactical Rule: </span>
                {errorTaxonomy.remediationTip}
              </div>
            </div>
          )}

          {/* Self-Explanation & Notes Reveal */}
          {(!activeRecallMode || isRevealed) && (
            <div>
              <button
                type="button"
                onClick={() => setShowNotes(!showNotes)}
                className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-950/90 hover:bg-slate-100 dark:hover:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-left transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white">
                  {showNotes ? <EyeOff className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                  <span>{showNotes ? 'Hide Notes & Trap Analysis' : 'Reveal Notes & Trap Analysis'}</span>
                </div>
                <kbd className="px-2 py-0.5 text-[11px] font-mono font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded border border-slate-400 dark:border-slate-700 shadow-xs">
                  Space
                </kbd>
              </button>

              {showNotes && (
                <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl space-y-3 animate-in fade-in duration-150">
                  {currentQuestion.notes && (
                    <div>
                      <div className="text-xs font-bold text-blue-900 dark:text-blue-300">Recorded Note:</div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5 leading-relaxed">{currentQuestion.notes}</div>
                    </div>
                  )}

                  {/* Historical Attempts Timeline */}
                  {currentQuestion.attempts.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <History className="w-3.5 h-3.5" />
                        <span>Attempt History ({currentQuestion.attempts.length}):</span>
                      </div>
                      <div className="space-y-1.5">
                        {currentQuestion.attempts.map((att, idx) => (
                          <div
                            key={att.id || idx}
                            className="text-xs p-2.5 bg-white dark:bg-slate-900 rounded border border-slate-300 dark:border-slate-800 flex items-start justify-between gap-2"
                          >
                            <div className="space-y-0.5">
                              <span
                                className={`font-bold font-mono text-xs ${
                                  att.status === 'CORRECT' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                                }`}
                              >
                                {att.status === 'CORRECT' ? 'CORRECT' : 'INCORRECT'}
                              </span>
                              {att.blindAnswer && (
                                <p className="text-indigo-600 dark:text-indigo-300 text-[11px] font-mono">
                                  Draft: "{att.blindAnswer}"
                                </p>
                              )}
                              {att.userNote && (
                                <p className="text-slate-800 dark:text-slate-200 text-xs font-medium">{att.userNote}</p>
                              )}
                            </div>
                            <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400 shrink-0">
                              {att.date.slice(0, 10)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* DECISION ACTION BUTTONS */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-center text-xs font-bold text-slate-700 dark:text-slate-300">
              Did you solve this question correctly without looking at notes?
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* WRONG BUTTON */}
              <button
                onClick={() => handleAnswer('INCORRECT')}
                className="py-3.5 px-4 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 active:bg-rose-200 border border-rose-300 dark:border-rose-800/60 rounded-xl transition-all flex flex-col items-center justify-center gap-1 group shadow-xs"
              >
                <div className="flex items-center gap-1.5 text-sm font-bold text-rose-800 dark:text-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                  <span>Missed Again (+3 Days)</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  <span>Reschedules for D+3 loop</span>
                  <kbd className="px-1.5 py-0.2 bg-white dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 font-mono text-xs rounded border border-rose-300 dark:border-rose-700 font-bold">
                    Key 1
                  </kbd>
                </div>
              </button>

              {/* RIGHT BUTTON */}
              <button
                onClick={() => handleAnswer('CORRECT')}
                className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl transition-all flex flex-col items-center justify-center gap-1 group shadow-sm"
              >
                <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>
                    {srs.isSameDayPending
                      ? 'Correct! (Advance to D+3)'
                      : srs.stage === 'INTERVAL_3'
                      ? 'Correct! (Advance to D+7)'
                      : 'Mastered! (Graduated)'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-100">
                  <span>Advances along SRS curve</span>
                  <kbd className="px-1.5 py-0.2 bg-emerald-700 text-white font-mono text-xs rounded font-bold">
                    Key 2
                  </kbd>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
