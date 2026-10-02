import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Edit2,
  Edit3,
  ExternalLink,
  FileText,
  Filter,
  Flame,
  HelpCircle,
  Layers,
  Lightbulb,
  Plus,
  Search,
  Sliders,
  Sparkles,
  Trash2,
  TrendingUp,
  Video,
  X,
} from 'lucide-react';
import { Chapter, Material, MockExam, PacingCalculation, Question, StudyGoal } from '../types';
import { getChapterScheduleMap } from '../lib/pacingEngine';
import { getTodayDateString } from '../lib/srsEngine';
import { INITIAL_MOCK_EXAMS } from '../lib/demoData';
import { extractGoalSubjects, formatMockExamScore } from '../lib/subjectUtils';
import { AddMaterialModal } from './AddMaterialModal';
import { ManageChaptersModal } from './ManageChaptersModal';
import { AddMockExamModal } from './AddMockExamModal';
import { ConfirmModal } from './ConfirmModal';

interface GoalCurriculumViewProps {
  goal: StudyGoal;
  allGoals?: StudyGoal[];
  pacing: PacingCalculation;
  questions: Question[];
  onToggleChapter: (chapterId: string) => void;
  onOpenQuickLogForChapter: (chapterId: string) => void;
  onOpenGoalSetup: () => void;
  onUpdateGoal: (updatedGoal: StudyGoal) => void;
  onSwitchGoal?: (goalId: string) => void;
  onDeleteGoal?: (goalId: string) => void;
}

export const GoalCurriculumView: React.FC<GoalCurriculumViewProps> = ({
  goal,
  allGoals = [],
  pacing,
  questions,
  onToggleChapter,
  onOpenQuickLogForChapter,
  onOpenGoalSetup,
  onUpdateGoal,
  onSwitchGoal,
  onDeleteGoal,
}) => {
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(
    goal.materials[0]?.id || ''
  );
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showScoreHistory, setShowScoreHistory] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('reviewloop_mock_exams_visible');
      if (stored !== null) return stored === 'true';
    } catch {
      // ignore
    }
    return true;
  });

  const toggleMockExamsVisibility = () => {
    setShowScoreHistory((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('reviewloop_mock_exams_visible', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Mock Exams state
  const [isAddMockModalOpen, setIsAddMockModalOpen] = useState<boolean>(false);
  const [editingMockExam, setEditingMockExam] = useState<MockExam | null>(null);
  const [mockExamToDelete, setMockExamToDelete] = useState<MockExam | null>(null);

  // Modals state
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState<boolean>(false);
  const [isManageChaptersOpen, setIsManageChaptersOpen] = useState<boolean>(false);
  const [isDeleteGoalModalOpen, setIsDeleteGoalModalOpen] = useState<boolean>(false);
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);
  const [chapterToDelete, setChapterToDelete] = useState<Chapter | null>(null);

  // Inline editing state for individual chapter
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editTopic, setEditTopic] = useState<string>('');
  const [editNumber, setEditNumber] = useState<number>(1);

  // Editing active book title state
  const [isEditingBookTitle, setIsEditingBookTitle] = useState<boolean>(false);
  const [editBookTitle, setEditBookTitle] = useState<string>('');

  const todayStr = getTodayDateString();

  // Current Mock Exams list (either goal.mockExams or initial seeds)
  const currentMockExams: MockExam[] = useMemo(() => {
    if (goal.mockExams && goal.mockExams.length > 0) return goal.mockExams;
    return INITIAL_MOCK_EXAMS;
  }, [goal.mockExams]);

  const handleSaveMockExam = (savedExam: MockExam) => {
    const existingIndex = currentMockExams.findIndex((e) => e.id === savedExam.id);
    let updated: MockExam[];
    if (existingIndex >= 0) {
      updated = [...currentMockExams];
      updated[existingIndex] = savedExam;
    } else {
      updated = [savedExam, ...currentMockExams];
    }
    onUpdateGoal({
      ...goal,
      mockExams: updated,
    });
    setEditingMockExam(null);
  };

  const confirmDeleteMockExam = () => {
    if (!mockExamToDelete) return;
    const updated = currentMockExams.filter((e) => e.id !== mockExamToDelete.id);
    onUpdateGoal({
      ...goal,
      mockExams: updated,
    });
    setMockExamToDelete(null);
  };

  // Active book / material based on selection (safely fallback if materials list changed)
  const activeMaterial =
    goal.materials.find((m) => m.id === selectedMaterialId) || goal.materials[0];
  const allChapters = activeMaterial?.chapters || [];

  // Material-specific progress
  const materialCompletedUnits = allChapters.filter((c) => c.isCompleted).length;
  const materialTotalUnits = allChapters.length;
  const materialPercent =
    materialTotalUnits > 0
      ? Math.round((materialCompletedUnits / materialTotalUnits) * 100)
      : 0;

  // Compute question count map per chapter
  const chapterQuestionStats = useMemo(() => {
    const stats = new Map<string, { total: number; errors: number }>();
    questions.forEach((q) => {
      const current = stats.get(q.chapterId) || { total: 0, errors: 0 };
      const hasErrors = q.attempts.some((a) => a.status === 'INCORRECT');
      stats.set(q.chapterId, {
        total: current.total + 1,
        errors: current.errors + (hasErrors ? 1 : 0),
      });
    });
    return stats;
  }, [questions]);

  // Schedule map to know which date each chapter is scheduled for
  const scheduleMap = useMemo(
    () => getChapterScheduleMap(goal, todayStr),
    [goal, todayStr]
  );

  // Filtered chapters
  const filteredChapters = useMemo(() => {
    return allChapters.filter((ch) => {
      if (filterMode === 'pending' && ch.isCompleted) return false;
      if (filterMode === 'completed' && !ch.isCompleted) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNum = `chapter ${ch.number}`.includes(query) || `${ch.number}` === query;
        const matchesTitle = ch.title.toLowerCase().includes(query);
        const matchesTopic = (ch.topic || '').toLowerCase().includes(query);
        if (!matchesNum && !matchesTitle && !matchesTopic) return false;
      }

      return true;
    });
  }, [allChapters, filterMode, searchQuery]);

  // Handle adding new material
  const handleAddMaterial = (newMaterial: Material) => {
    const updatedMaterials = [...goal.materials, newMaterial];
    onUpdateGoal({
      ...goal,
      materials: updatedMaterials,
    });
    setSelectedMaterialId(newMaterial.id);
  };

  // Handle deleting a material
  const confirmDeleteMaterial = () => {
    if (!materialToDelete) return;
    const updatedMaterials = goal.materials.filter((m) => m.id !== materialToDelete.id);
    onUpdateGoal({
      ...goal,
      materials: updatedMaterials,
    });
    setSelectedMaterialId(updatedMaterials[0]?.id || '');
    setMaterialToDelete(null);
  };

  // Handle deleting a chapter
  const confirmDeleteChapter = () => {
    if (!chapterToDelete || !activeMaterial) return;
    const updatedMaterials = goal.materials.map((m) => {
      const hasChapter = m.chapters.some((c) => c.id === chapterToDelete.id);
      if (!hasChapter) return m;
      const updatedChs = m.chapters.filter((c) => c.id !== chapterToDelete.id);
      return {
        ...m,
        totalUnits: updatedChs.length,
        chapters: updatedChs,
      };
    });
    onUpdateGoal({
      ...goal,
      materials: updatedMaterials,
    });
    setChapterToDelete(null);
  };

  // Handle renaming active book
  const handleSaveBookTitle = () => {
    if (!activeMaterial || !editBookTitle.trim()) return;
    const updatedMaterials = goal.materials.map((m) => {
      if (m.id !== activeMaterial.id) return m;
      return {
        ...m,
        title: editBookTitle.trim(),
      };
    });
    onUpdateGoal({
      ...goal,
      materials: updatedMaterials,
    });
    setIsEditingBookTitle(false);
  };

  // Handle saving chapters from modal
  const handleSaveMaterialChapters = (updatedChapters: Chapter[]) => {
    if (!activeMaterial) return;
    const updatedMaterials = goal.materials.map((m) => {
      if (m.id !== activeMaterial.id) return m;
      return {
        ...m,
        totalUnits: updatedChapters.length,
        chapters: updatedChapters,
      };
    });
    onUpdateGoal({
      ...goal,
      materials: updatedMaterials,
    });
  };

  // Handle start editing chapter inline
  const handleStartEditChapter = (ch: Chapter) => {
    setEditingChapterId(ch.id);
    setEditTitle(ch.title);
    setEditTopic(ch.topic || '');
    setEditNumber(ch.number);
  };

  // Handle save inline chapter edit
  const handleSaveChapterInline = (chapterId: string) => {
    if (!editTitle.trim()) return;

    const updatedMaterials = goal.materials.map((m) => {
      const hasChapter = m.chapters.some((c) => c.id === chapterId);
      if (!hasChapter) return m;
      return {
        ...m,
        chapters: m.chapters.map((c) => {
          if (c.id !== chapterId) return c;
          return {
            ...c,
            title: editTitle.trim(),
            topic: editTopic.trim() || undefined,
            number: editNumber,
          };
        }),
      };
    });

    onUpdateGoal({
      ...goal,
      materials: updatedMaterials,
    });
    setEditingChapterId(null);
  };

  // Handle add single chapter directly to active book
  const handleAddSingleChapter = () => {
    if (!activeMaterial) return;
    const nextNumber =
      activeMaterial.chapters.length > 0
        ? Math.max(...activeMaterial.chapters.map((c) => c.number)) + 1
        : 1;

    const newChapter: Chapter = {
      id: `ch-${activeMaterial.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      materialId: activeMaterial.id,
      number: nextNumber,
      title: `Chapter ${nextNumber}: New Topic`,
      topic: '',
      isCompleted: false,
    };

    const updatedMaterials = goal.materials.map((m) => {
      if (m.id !== activeMaterial.id) return m;
      const updatedChs = [...m.chapters, newChapter];
      return {
        ...m,
        totalUnits: updatedChs.length,
        chapters: updatedChs,
      };
    });

    onUpdateGoal({
      ...goal,
      materials: updatedMaterials,
    });

    // Automatically trigger inline editing for the new chapter
    setEditingChapterId(newChapter.id);
    setEditTitle(newChapter.title);
    setEditTopic('');
    setEditNumber(nextNumber);
  };

  // Handle delete single chapter
  const handleDeleteChapter = (chapterId: string) => {
    if (!activeMaterial) return;
    if (activeMaterial.chapters.length <= 1) {
      alert('The book must contain at least one chapter.');
      return;
    }

    const updatedMaterials = goal.materials.map((m) => {
      const hasChapter = m.chapters.some((c) => c.id === chapterId);
      if (!hasChapter) return m;
      const filtered = m.chapters.filter((c) => c.id !== chapterId);
      return {
        ...m,
        totalUnits: filtered.length,
        chapters: filtered,
      };
    });

    onUpdateGoal({
      ...goal,
      materials: updatedMaterials,
    });
  };

  return (
    <div className="space-y-6">
      {/* GOAL / CURRICULUM MULTI-SPRINT SELECTOR BAR */}
      <section className="bg-white dark:bg-[#0d1627] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                Active Goal / Curriculum
              </span>
              {allGoals.length > 1 ? (
                <div className="relative mt-0.5 max-w-md">
                  <select
                    value={goal.id}
                    onChange={(e) => onSwitchGoal && onSwitchGoal(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 transition-colors"
                  >
                    {allGoals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title} ({g.materials.length} books)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                  {goal.title}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenGoalSetup}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              title="Create a new goal without losing existing ones"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Goal / Sprint</span>
            </button>

            {onDeleteGoal && (
              <button
                onClick={() => setIsDeleteGoalModalOpen(true)}
                className="p-2 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-300 dark:border-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"
                title="Delete this curriculum / goal"
              >
                <Trash2 className="w-4 h-4 stroke-[2.2]" />
                <span className="hidden sm:inline">Delete Goal</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 1: MOCK EXAMS & PRACTICE DIAGNOSTICS (COLLAPSIBLE / TOGGLEABLE) */}
      <section className="bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div
            onClick={toggleMockExamsVisibility}
            className="flex items-center gap-3 cursor-pointer select-none group"
            title={showScoreHistory ? 'Click to hide/collapse Mock Exams' : 'Click to show/expand Mock Exams'}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-950 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Mock Exams & Practice Diagnostics
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  {currentMockExams.length} Simulations Logged
                </span>
                {!showScoreHistory && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                    Hidden (Collapsed)
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                Full-length mock exam records, cutoff targets, score progression, and pacing takeaways
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setEditingMockExam(null);
                setIsAddMockModalOpen(true);
              }}
              className="px-3.5 py-2 text-xs sm:text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Record Mock Exam</span>
            </button>

            <button
              onClick={toggleMockExamsVisibility}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 shadow-2xs border cursor-pointer ${
                showScoreHistory
                  ? 'text-slate-800 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700'
                  : 'text-amber-900 dark:text-amber-200 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border-amber-300 dark:border-amber-800'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
              <span>{showScoreHistory ? 'Hide Mock Exams' : 'Show Mock Exams'}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  showScoreHistory ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Mock Exams Table (Toggled) */}
        {showScoreHistory && (
          <div className="pt-5 mt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
            {currentMockExams.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
                <Award className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No mock exams recorded yet.
                </p>
                <p className="text-xs text-slate-500">
                  Take a simulated exam or diagnostic test and log your score, mistakes, and pacing takeaways.
                </p>
                <button
                  onClick={() => {
                    setEditingMockExam(null);
                    setIsAddMockModalOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
                >
                  Record Your First Mock Exam
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-200 dark:bg-slate-950 text-slate-900 dark:text-slate-200 uppercase text-xs font-black tracking-wider border-b border-slate-300 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Simulation / Exam Title</th>
                      <th className="py-3 px-3 text-right">Score</th>
                      <th className="py-3 px-3 text-right">Target</th>
                      <th className="py-3 px-3">Errors Logged</th>
                      <th className="py-3 px-3">Diagnostic Notes & Strategy</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-900/60 font-mono text-xs">
                    {currentMockExams.map((test) => {
                      const scoreInfo = formatMockExamScore(test);
                      const metTarget = scoreInfo.isPassing;

                      return (
                        <tr key={test.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap">{test.date}</td>
                          <td className="py-2.5 px-3 font-extrabold text-slate-950 dark:text-white font-sans text-sm">
                            <div>{test.title}</div>
                            {test.subjectBreakdown && test.subjectBreakdown.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap font-mono text-[11px]">
                                {test.subjectBreakdown.map((sb, i) => (
                                  <span key={i} className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                    {sb.subject}: {sb.score !== undefined ? sb.score : '—'}{sb.maxScore ? `/${sb.maxScore}` : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black tabular-nums text-sm">
                            {test.score !== undefined ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <span className={metTarget ? 'text-emerald-700 dark:text-emerald-400 font-black' : 'text-slate-950 dark:text-slate-100'}>
                                  {scoreInfo.display}
                                </span>
                                {scoreInfo.percentage !== undefined && test.scoringType !== 'PERCENTAGE' && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                                    {scoreInfo.percentage}%
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-slate-800 dark:text-slate-200 font-bold">
                            {test.targetScore !== undefined ? test.targetScore : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 dark:text-slate-300 font-sans font-bold text-xs">
                            {test.errorCount !== undefined ? `${test.errorCount} errors` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 font-sans font-medium text-xs max-w-xs truncate" title={test.notes}>
                            {test.notes || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingMockExam(test);
                                  setIsAddMockModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title="Edit this mock exam"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setMockExamToDelete(test)}
                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                title="Delete this mock exam"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* SECTION 2: HIGHLIGHTED CURRICULUM & STUDY BOOKS HUB */}
      <section className="bg-white dark:bg-[#0d1627] border-2 border-blue-500/50 dark:border-blue-500/50 rounded-2xl p-6 shadow-md transition-colors relative overflow-hidden">
        {/* Subtle accent highlight badge */}
        <div className="absolute top-0 right-0 bg-blue-600 text-white font-mono uppercase text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-xs">
          Curriculum Materials Hub
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 flex-wrap">
              <span className="text-blue-700 dark:text-blue-400 font-extrabold uppercase tracking-wider">
                Active Curriculum
              </span>
              <span aria-hidden="true" className="font-extrabold">·</span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                {goal.materials.length} {goal.materials.length === 1 ? 'Resource' : 'Resources'}
              </span>
              <span aria-hidden="true" className="font-extrabold">·</span>
              <button
                type="button"
                onClick={onOpenGoalSetup}
                className="font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Click to edit start date and target completion date"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Pacing Window: {goal.startDate} → {goal.targetDate}</span>
                <Edit2 className="w-3 h-3 text-slate-400" />
              </button>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-[11px] font-black bg-amber-400 dark:bg-amber-400 text-slate-950 shadow-2xs border border-amber-600/40">
                <Award className="w-3 h-3 fill-slate-950/20 stroke-[2.5]" />
                <span>EXAM DAY · RESERVED</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight mt-1">
              {goal.title}
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
              Select any curriculum resource below to view its units, track pacing, and log question errors.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddMaterialOpen(true)}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
              title="Add a new textbook, video course, or question bank"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add Resource</span>
            </button>
          </div>
        </div>

        {/* BOOK / MATERIAL SELECTOR TABS */}
        <div className="pt-5 space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 stroke-[2.5]" />
              <span>Select Resource to Browse Units:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {goal.materials.map((mat) => {
                const isSelected = mat.id === activeMaterial?.id;
                const doneCount = mat.chapters.filter((c) => c.isCompleted).length;
                const totalCount = mat.chapters.length;
                const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

                const FormatIcon =
                  mat.format === 'VIDEO_COURSE'
                    ? Video
                    : mat.format === 'QUESTION_BANK'
                    ? HelpCircle
                    : mat.format === 'PDF_SUMMARY'
                    ? FileText
                    : BookOpen;

                const unitLabel =
                  mat.unitType === 'LESSON'
                    ? 'lessons'
                    : mat.unitType === 'MODULE'
                    ? 'modules'
                    : mat.unitType === 'EXERCISE_BLOCK'
                    ? 'blocks'
                    : mat.unitType === 'PAGE'
                    ? 'pages'
                    : 'chapters';

                return (
                  <button
                    key={mat.id}
                    onClick={() => {
                      setSelectedMaterialId(mat.id);
                      setEditingChapterId(null);
                      setIsEditingBookTitle(false);
                    }}
                    className={`p-3.5 rounded-xl text-left transition-all border flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/50'
                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800/80 text-slate-900 dark:text-white border-slate-300 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FormatIcon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-200' : 'text-slate-500'}`} />
                        <span className="font-extrabold text-sm line-clamp-1 leading-snug">
                          {mat.title}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-white shrink-0 stroke-[3]" />
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className={isSelected ? 'text-blue-100 font-semibold' : 'text-slate-600 dark:text-slate-400'}>
                        {totalCount} {unitLabel}
                      </span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          isSelected
                            ? 'bg-blue-700 text-white'
                            : pct === 100
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {doneCount}/{totalCount} ({pct}%)
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACTIVE BOOK HEADER & ACTIONS */}
          <div className="bg-slate-50 dark:bg-slate-950/80 p-4 sm:p-5 rounded-xl border border-slate-300 dark:border-slate-800 space-y-3 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                {isEditingBookTitle ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editBookTitle}
                      onChange={(e) => setEditBookTitle(e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-900 border border-blue-600 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white font-bold focus:outline-none"
                      placeholder="Book / Resource Title"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveBookTitle}
                      className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      title="Save Title"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </button>
                    <button
                      onClick={() => setIsEditingBookTitle(false)}
                      className="p-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors font-bold"
                      title="Cancel"
                    >
                      <X className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/80 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                      Active Selection
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-white tracking-tight truncate">
                      {activeMaterial?.title}
                    </h3>
                    <button
                      onClick={() => {
                        setEditBookTitle(activeMaterial?.title || '');
                        setIsEditingBookTitle(true);
                      }}
                      className="p-1 text-slate-500 hover:text-blue-700 dark:hover:text-blue-400 rounded transition-colors"
                      title="Rename this book"
                    >
                      <Edit2 className="w-4 h-4 stroke-[2.2]" />
                    </button>
                    {goal.materials.length > 1 && (
                      <button
                        onClick={() => setMaterialToDelete(activeMaterial)}
                        className="p-1 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors ml-1"
                        title="Delete this book from curriculum"
                      >
                        <Trash2 className="w-4 h-4 stroke-[2.2]" />
                      </button>
                    )}
                  </div>
                )}
                <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
                  {allChapters.length} chapters total · {materialCompletedUnits} completed ({materialPercent}%)
                </div>
              </div>

              {/* Book-level management actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleAddSingleChapter}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>+ Add Chapter</span>
                </button>

                {activeMaterial && (
                  <button
                    onClick={() => setIsManageChaptersOpen(true)}
                    className="px-3.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <Edit3 className="w-4 h-4 text-blue-700 dark:text-blue-400 stroke-[2.2]" />
                    <span>Manage Chapters</span>
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-300 dark:border-slate-800">
                <div
                  className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, Math.min(100, materialPercent))}%` }}
                />
              </div>
            </div>

            {/* Visual Guide Banner pointing down */}
            <div className="pt-2 text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
              <span>📖 Chapters below belong to:</span>
              <span className="font-extrabold text-slate-900 dark:text-white underline">{activeMaterial?.title}</span>
            </div>
          </div>
        </div>
      </section>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter buttons */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              filterMode === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            All Chapters ({allChapters.length})
          </button>
          <button
            onClick={() => setFilterMode('completed')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              filterMode === 'completed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            Completed ({materialCompletedUnits})
          </button>
          <button
            onClick={() => setFilterMode('pending')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              filterMode === 'pending'
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800/40 shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            Pending ({materialTotalUnits - materialCompletedUnits})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 stroke-[2.2]" />
          <input
            type="text"
            placeholder={`Search in ${activeMaterial?.title || 'chapters'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-sm font-bold text-slate-950 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-sm"
          />
        </div>
      </div>

      {/* CHAPTERS MATRIX / GRID */}
      <section className="bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors">
        <div className="px-6 py-4 bg-slate-100/80 dark:bg-slate-900/60 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-950 dark:text-white tracking-tight">
              {activeMaterial?.title} — Chapter List ({filteredChapters.length})
            </h2>
            <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
              Click the checkbox to mark completion or click the pencil to rename any chapter inline
            </p>
          </div>

          <button
            onClick={handleAddSingleChapter}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ New Chapter</span>
          </button>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800/60">
          {filteredChapters.length === 0 ? (
            <div className="p-8 text-center text-slate-700 dark:text-slate-300 text-sm font-bold space-y-2">
              <p>No chapters match the current filters.</p>
              <button
                onClick={handleAddSingleChapter}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors inline-flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add First Chapter</span>
              </button>
            </div>
          ) : (
            filteredChapters.map((ch) => {
              const scheduleInfo = scheduleMap.get(ch.id);
              const stats = chapterQuestionStats.get(ch.id);
              const isEditing = editingChapterId === ch.id;

              return (
                <div
                  key={ch.id}
                  className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                    ch.isCompleted
                      ? 'bg-slate-50/80 dark:bg-slate-950/60 opacity-80 border-l-4 border-emerald-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  {/* Left: Checkbox + Chapter Info or Inline Edit */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onToggleChapter(ch.id)}
                      className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                        ch.isCompleted
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                          : 'border-slate-400 dark:border-slate-600 hover:border-emerald-500 bg-white dark:bg-slate-950'
                      }`}
                      title={ch.isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
                    >
                      {ch.isCompleted && <Check className="w-4 h-4 stroke-[2.5]" />}
                    </button>

                    {isEditing ? (
                      /* INLINE EDIT MODE */
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 py-1">
                        <div className="w-20 shrink-0">
                          <input
                            type="number"
                            min="1"
                            value={editNumber}
                            onChange={(e) => setEditNumber(parseInt(e.target.value) || 1)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-400 dark:border-slate-700 rounded px-2 py-1 text-sm font-mono font-black text-blue-700 dark:text-blue-400 text-center focus:outline-none focus:border-blue-600"
                            placeholder="No."
                            title="Chapter Number"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveChapterInline(ch.id);
                              if (e.key === 'Escape') setEditingChapterId(null);
                            }}
                            className="w-full bg-white dark:bg-slate-950 border border-blue-600 rounded px-2.5 py-1 text-sm font-bold text-slate-950 dark:text-white focus:outline-none"
                            placeholder="Chapter Title"
                            autoFocus
                          />
                        </div>

                        <div className="w-full sm:w-44 shrink-0">
                          <input
                            type="text"
                            value={editTopic}
                            onChange={(e) => setEditTopic(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveChapterInline(ch.id);
                              if (e.key === 'Escape') setEditingChapterId(null);
                            }}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-400 dark:border-slate-700 rounded px-2.5 py-1 text-sm font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                            placeholder="Topic / Domain"
                          />
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSaveChapterInline(ch.id)}
                            className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            title="Save Changes"
                          >
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingChapterId(null)}
                            className="p-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded transition-colors font-bold"
                            title="Cancel"
                          >
                            <X className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* NORMAL VIEW MODE */
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-slate-800 dark:text-slate-200">
                          <span
                            className={`font-mono font-extrabold ${
                              ch.isCompleted ? 'text-slate-400 line-through' : 'text-blue-700 dark:text-blue-400'
                            }`}
                          >
                            Chapter {ch.number}
                          </span>

                          {ch.topic && (
                            <>
                              <span aria-hidden="true" className="font-extrabold">·</span>
                              <span className={ch.isCompleted ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200 font-extrabold'}>
                                {ch.topic}
                              </span>
                            </>
                          )}

                          {/* Status Label */}
                          {ch.isCompleted ? (
                            <>
                              <span aria-hidden="true" className="font-extrabold">·</span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-black text-xs">
                                ✓ Completed {ch.completedAt ? `(${ch.completedAt.slice(0, 10)})` : ''}
                              </span>
                            </>
                          ) : (
                            <>
                              <span aria-hidden="true" className="font-extrabold">·</span>
                              <span className="text-slate-600 dark:text-slate-400 text-xs font-bold">Pending</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 group">
                          <span
                            className={`text-base font-extrabold truncate transition-all ${
                              ch.isCompleted
                                ? 'line-through text-slate-400'
                                : 'text-slate-950 dark:text-slate-100'
                            }`}
                          >
                            {ch.title}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleStartEditChapter(ch)}
                            className="opacity-70 hover:opacity-100 text-slate-500 hover:text-blue-700 dark:hover:text-blue-400 p-1 transition-opacity"
                            title="Rename and edit this chapter"
                          >
                            <Edit2 className="w-3.5 h-3.5 stroke-[2.2]" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Question Stats & Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end">
                      {stats && stats.total > 0 && (
                        <div className="text-xs text-slate-700 dark:text-slate-300 font-mono font-bold text-right mr-1">
                          <span>{stats.total} logged</span>
                          {stats.errors > 0 && (
                            <span className="text-rose-700 dark:text-rose-400 ml-1.5 font-extrabold">({stats.errors} errors)</span>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => onOpenQuickLogForChapter(ch.id)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
                        title="Log error for this chapter"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Log Error</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setChapterToDelete(ch)}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                        title="Delete this chapter"
                      >
                        <Trash2 className="w-4 h-4 stroke-[2.2]" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Add / Edit Mock Exam Modal */}
      <AddMockExamModal
        isOpen={isAddMockModalOpen}
        onClose={() => {
          setIsAddMockModalOpen(false);
          setEditingMockExam(null);
        }}
        goalId={goal.id}
        onAddMockExam={handleSaveMockExam}
        editingExam={editingMockExam}
        availableSubjects={extractGoalSubjects(goal.materials)}
      />

      {/* CONFIRM DELETE MOCK EXAM MODAL */}
      <ConfirmModal
        isOpen={!!mockExamToDelete}
        title="Delete Mock Exam Record"
        message={`Are you sure you want to remove the record for "${mockExamToDelete?.title}"?`}
        confirmLabel="Delete Exam"
        confirmVariant="danger"
        onConfirm={confirmDeleteMockExam}
        onCancel={() => setMockExamToDelete(null)}
      />

      {/* Add Material Modal */}
      <AddMaterialModal
        isOpen={isAddMaterialOpen}
        onClose={() => setIsAddMaterialOpen(false)}
        goalId={goal.id}
        onAddMaterial={handleAddMaterial}
      />

      {/* Manage Chapters Modal */}
      {activeMaterial && (
        <ManageChaptersModal
          isOpen={isManageChaptersOpen}
          onClose={() => setIsManageChaptersOpen(false)}
          material={activeMaterial}
          onSaveChapters={handleSaveMaterialChapters}
        />
      )}

      {/* CONFIRM DELETE GOAL MODAL */}
      {onDeleteGoal && (
        <ConfirmModal
          isOpen={isDeleteGoalModalOpen}
          title="Delete Curriculum / Study Goal"
          message={
            allGoals.length <= 1
              ? `Are you sure you want to delete "${goal.title}"? A fresh new study curriculum will be initialized so you can start clean.`
              : `Are you sure you want to delete "${goal.title}"? All scheduled dates and materials for this goal will be removed.`
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

      {/* CONFIRM DELETE BOOK MODAL */}
      <ConfirmModal
        isOpen={!!materialToDelete}
        title="Delete Book from Curriculum"
        message={`Are you sure you want to remove "${materialToDelete?.title}" and all its chapters from this curriculum?`}
        confirmLabel="Delete Book"
        confirmVariant="danger"
        onConfirm={confirmDeleteMaterial}
        onCancel={() => setMaterialToDelete(null)}
      />

      {/* CONFIRM DELETE CHAPTER MODAL */}
      <ConfirmModal
        isOpen={!!chapterToDelete}
        title="Delete Chapter"
        message={`Are you sure you want to remove chapter "${chapterToDelete?.title}"?`}
        confirmLabel="Delete Chapter"
        confirmVariant="danger"
        onConfirm={confirmDeleteChapter}
        onCancel={() => setChapterToDelete(null)}
      />
    </div>
  );
};
