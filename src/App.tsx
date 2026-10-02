import React, { useEffect, useMemo, useState } from 'react';
import {
  AttemptStatus,
  Chapter,
  ErrorReason,
  Question,
  StudyGoal,
} from './types';
import {
  calculateNextSRSState,
  getDailyChecklistData,
  getTodayDateString,
} from './lib/srsEngine';
import {
  calculatePacingMetrics,
  extendGoalTargetDate,
  getTodaysAssignedChapters,
  getTomorrowsAssignedChapters,
} from './lib/pacingEngine';
import {
  clearAllStorageData,
  createCustomStudyGoal,
  loadActiveGoalIdFromStorage,
  loadAllGoalsFromStorage,
  loadQuestionsFromStorage,
  resetToVanillaState,
  saveAllGoalsToStorage,
  saveQuestionsToStorage,
} from './lib/storage';
import { getInitialQuestions, getInitialStudyGoal } from './lib/demoData';

// UI Components
import { Sidebar, NavTabId } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { WelcomeHubView } from './components/WelcomeHubView';
import { DashboardView } from './components/DashboardView';
import { GoalCurriculumView } from './components/GoalCurriculumView';
import { ReviewModeView } from './components/ReviewModeView';
import { GoalsPacingView } from './components/GoalsPacingView';
import { QuickLogModal } from './components/QuickLogModal';
import { GoalSetupModal } from './components/GoalSetupModal';
import { ErrorLogAnalyticsView } from './components/ErrorLogAnalyticsView';
import { ConfirmModal } from './components/ConfirmModal';
import { FinishStudyDayModal } from './components/FinishStudyDayModal';

export default function App() {
  // Load all goals list from storage
  const [allGoals, setAllGoals] = useState<StudyGoal[]>(() => loadAllGoalsFromStorage());
  const [activeGoalId, setActiveGoalId] = useState<string>(() =>
    loadActiveGoalIdFromStorage(allGoals)
  );

  // Active goal derived from allGoals and activeGoalId
  const goal = useMemo(() => {
    return (
      allGoals.find((g) => g.id === activeGoalId) ||
      allGoals[0] ||
      getInitialStudyGoal()
    );
  }, [allGoals, activeGoalId]);

  const [questions, setQuestions] = useState<Question[]>(() => loadQuestionsFromStorage());
  const [currentTab, setCurrentTab] = useState<NavTabId>('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Goal setup modal state
  const [isGoalSetupOpen, setIsGoalSetupOpen] = useState<boolean>(false);
  const [goalSetupMode, setGoalSetupMode] = useState<'create' | 'edit'>('edit');

  const handleOpenEditGoal = () => {
    setGoalSetupMode('edit');
    setIsGoalSetupOpen(true);
  };

  const handleOpenCreateGoal = () => {
    setGoalSetupMode('create');
    setIsGoalSetupOpen(true);
  };

  // Quick log modal state
  const [isQuickLogOpen, setIsQuickLogOpen] = useState<boolean>(false);
  const [defaultLogChapterId, setDefaultLogChapterId] = useState<string | undefined>(undefined);

  // Finish Study Day celebration modal state
  const [isFinishDayOpen, setIsFinishDayOpen] = useState<boolean>(false);

  // Review mode filter
  const [reviewFilterMode, setReviewFilterMode] = useState<'all' | 'same_day' | 'due' | 'all_questions' | 'leeches'>('all');

  // Confirm modals
  const [recalculateModalOpen, setRecalculateModalOpen] = useState<boolean>(false);
  const [extendModalOpen, setExtendModalOpen] = useState<boolean>(false);
  const [resetModalOpen, setResetModalOpen] = useState<boolean>(false);

  const todayStr = useMemo(() => getTodayDateString(), []);

  // Questions reviewed today
  const reviewedTodayCount = useMemo(() => {
    return questions.reduce((acc, q) => {
      const todayAttempts = q.attempts.filter((a) => a.date.slice(0, 10) === todayStr);
      return acc + todayAttempts.length;
    }, 0);
  }, [questions, todayStr]);

  // Sync goals and active goal ID to storage
  useEffect(() => {
    saveAllGoalsToStorage(allGoals, activeGoalId);
  }, [allGoals, activeGoalId]);

  // Sync questions to storage
  useEffect(() => {
    saveQuestionsToStorage(questions);
  }, [questions]);

  // Global hotkey 'Q' to open Quick Log
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return;
      }

      if ((e.key === 'q' || e.key === 'Q') && !isQuickLogOpen) {
        e.preventDefault();
        setDefaultLogChapterId(undefined);
        setIsQuickLogOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickLogOpen]);

  // Update active goal in allGoals list
  const handleUpdateActiveGoal = (updatedGoal: StudyGoal) => {
    setAllGoals((prev) => {
      const idx = prev.findIndex((g) => g.id === updatedGoal.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedGoal;
        return next;
      }
      return [...prev, updatedGoal];
    });
  };

  // Add a newly created goal without erasing existing ones
  const handleGoalCreated = (newGoal: StudyGoal) => {
    setAllGoals((prev) => [...prev, newGoal]);
    setActiveGoalId(newGoal.id);
    setIsGoalSetupOpen(false);
  };

  // Switch between goals
  const handleSwitchGoal = (goalId: string) => {
    setActiveGoalId(goalId);
  };

  // Delete a goal from allGoals
  const handleDeleteGoal = (goalId: string) => {
    const remaining = allGoals.filter((g) => g.id !== goalId);
    if (remaining.length === 0) {
      const cleanGoal = createCustomStudyGoal({
        title: 'My Study Curriculum',
        materialTitle: 'Course Book / Resource 1',
        totalUnits: 10,
        unitType: 'CHAPTER',
      });
      setAllGoals([cleanGoal]);
      setActiveGoalId(cleanGoal.id);
      setIsGoalSetupOpen(true);
    } else {
      setAllGoals(remaining);
      if (activeGoalId === goalId) {
        setActiveGoalId(remaining[0].id);
      }
    }
  };

  // Modify chapter schedule date
  const handleRescheduleChapter = (chapterId: string, newDateStr?: string) => {
    const updatedMaterials = goal.materials.map((m) => {
      const updatedChapters = m.chapters.map((ch) => {
        if (ch.id === chapterId) {
          return {
            ...ch,
            scheduledDate: newDateStr,
          };
        }
        return ch;
      });
      return {
        ...m,
        chapters: updatedChapters,
      };
    });

    handleUpdateActiveGoal({
      ...goal,
      materials: updatedMaterials,
    });
  };

  // Derived Calculations
  const pacing = useMemo(() => calculatePacingMetrics(goal, todayStr), [goal, todayStr]);
  const todayChapters = useMemo(() => getTodaysAssignedChapters(goal, todayStr), [goal, todayStr]);
  const tomorrowChapters = useMemo(
    () => getTomorrowsAssignedChapters(goal, todayStr),
    [goal, todayStr]
  );
  const checklistData = useMemo(
    () => getDailyChecklistData(questions, goal.dailyReviewCap, todayStr),
    [questions, goal.dailyReviewCap, todayStr]
  );

  const allChapters = useMemo(
    () => goal.materials.flatMap((m) => m.chapters),
    [goal.materials]
  );

  // Master list of all known materials and chapters across all goals
  const allKnownMaterials = useMemo(() => {
    const list: typeof goal.materials = [];
    const seen = new Set<string>();
    allGoals.forEach((g) => {
      g.materials.forEach((m) => {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          list.push(m);
        }
      });
    });
    getInitialStudyGoal().materials.forEach((m) => {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        list.push(m);
      }
    });
    return list;
  }, [allGoals]);

  const allKnownChapters = useMemo(() => {
    return allKnownMaterials.flatMap((m) => m.chapters);
  }, [allKnownMaterials]);

  // Toggle chapter completion
  const handleToggleChapter = (chapterId: string) => {
    const updatedMaterials = goal.materials.map((m) => {
      const updatedChapters = m.chapters.map((ch) => {
        if (ch.id === chapterId) {
          const nextCompleted = !ch.isCompleted;
          return {
            ...ch,
            isCompleted: nextCompleted,
            completedAt: nextCompleted ? todayStr : undefined,
          };
        }
        return ch;
      });
      return {
        ...m,
        chapters: updatedChapters,
      };
    });

    handleUpdateActiveGoal({
      ...goal,
      materials: updatedMaterials,
    });
  };

  const handleOpenQuickLogForChapter = (chapterId: string) => {
    setDefaultLogChapterId(chapterId);
    setIsQuickLogOpen(true);
  };

  const handleLogQuestion = (data: {
    materialId?: string;
    chapterId: string;
    sourceRef: string;
    status: AttemptStatus;
    errorReason?: ErrorReason;
    topicWeight: number;
    userNote?: string;
    subTags?: string[];
  }) => {
    const nowISO = new Date().toISOString();
    const questionId = `q-${Date.now()}`;
    const attemptId = `att-${Date.now()}`;

    const dummyInitialSRS = {
      id: `srs-init`,
      questionId,
      stage: 'SAME_DAY' as const,
      intervalDays: 0,
      dueDate: todayStr,
      repetitionCount: 0,
      isSameDayPending: false,
    };

    // Calculate initial SRS schedule using SRS rules
    const nextSRS = calculateNextSRSState(dummyInitialSRS, data.status, false, todayStr);

    const parentMaterial = allKnownMaterials.find((m) =>
      m.chapters.some((c) => c.id === data.chapterId)
    );
    const materialId = data.materialId || (parentMaterial ? parentMaterial.id : (goal.materials[0]?.id || 'mat-1'));

    const newQuestion: Question = {
      id: questionId,
      userId: goal.userId,
      materialId,
      chapterId: data.chapterId,
      sourceRef: data.sourceRef,
      topicWeight: data.topicWeight,
      notes: data.userNote,
      subTags: data.subTags,
      createdAt: nowISO,
      attempts: [
        {
          id: attemptId,
          questionId,
          date: nowISO,
          status: data.status,
          errorReason: data.errorReason,
          userNote: data.userNote,
          subTags: data.subTags,
        },
      ],
      srsItem: {
        id: `srs-${Date.now()}`,
        questionId,
        stage: nextSRS.stage,
        intervalDays: nextSRS.intervalDays,
        dueDate: nextSRS.dueDate,
        lastReviewed: nowISO,
        repetitionCount: nextSRS.repetitionCount,
        isSameDayPending: nextSRS.isSameDayPending,
      },
    };

    setQuestions((prev) => [newQuestion, ...prev]);
  };

  const handleReviewAttempt = (
    questionId: string,
    status: AttemptStatus,
    isSameDayReview: boolean,
    blindAnswer?: string
  ) => {
    setQuestions((prevQuestions) => {
      return prevQuestions.map((q) => {
        if (q.id !== questionId) return q;

        const nextSRS = calculateNextSRSState(q.srsItem, status, isSameDayReview, todayStr);
        const nowISO = new Date().toISOString();

        // Preserve root cause error taxonomy classification across review repetitions
        const rootCause = q.attempts.find((a) => a.errorReason)?.errorReason || q.attempts[0]?.errorReason || 'ATTENTION';

        const newAttempt = {
          id: `att-${Date.now()}`,
          questionId: q.id,
          date: nowISO,
          status,
          errorReason: rootCause,
          blindAnswer: blindAnswer ? blindAnswer.trim() : undefined,
          userNote:
            status === 'CORRECT'
              ? 'Solved correctly during SRS review session.'
              : 'Logged mistake during SRS review cycle.',
        };

        return {
          ...q,
          attempts: [...q.attempts, newAttempt],
          srsItem: {
            ...q.srsItem,
            stage: nextSRS.stage,
            intervalDays: nextSRS.intervalDays,
            dueDate: nextSRS.dueDate,
            lastReviewed: nowISO,
            repetitionCount: nextSRS.repetitionCount,
            isSameDayPending: nextSRS.isSameDayPending,
          },
        };
      });
    });
  };

  const handleStartReviewDeck = (mode: 'all' | 'same_day' | 'due' | 'all_questions' = 'all') => {
    setReviewFilterMode(mode);
    setCurrentTab('review');
  };

  const handleConfirmRecalculate = () => {
    handleUpdateActiveGoal({ ...goal });
    setRecalculateModalOpen(false);
  };

  const handleConfirmExtend = () => {
    const extended = extendGoalTargetDate(goal, todayStr);
    handleUpdateActiveGoal(extended);
    setExtendModalOpen(false);
  };

  const handleDeleteQuestion = (questionId: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
  };

  const handleStartClean = () => {
    clearAllStorageData();
    const cleanGoal = createCustomStudyGoal({
      title: 'My Study Curriculum',
      materialTitle: 'Course Book / Resource 1',
      totalUnits: 10,
      unitType: 'CHAPTER',
    });
    setAllGoals([cleanGoal]);
    setActiveGoalId(cleanGoal.id);
    setQuestions([]);
    setResetModalOpen(false);
  };

  const handleResetToClean = () => {
    const data = resetToVanillaState();
    setAllGoals([data.goal]);
    setActiveGoalId(data.goal.id);
    setQuestions(data.questions);
    setResetModalOpen(false);
  };

  const handleExportData = () => {
    const data = {
      version: '4.0',
      exportedAt: new Date().toISOString(),
      activeGoalId,
      allGoals,
      goal,
      questions,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apexsrs_backup_${todayStr}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.allGoals && Array.isArray(parsed.allGoals)) {
          setAllGoals(parsed.allGoals);
          setActiveGoalId(parsed.activeGoalId || parsed.allGoals[0]?.id || '');
          if (Array.isArray(parsed.questions)) setQuestions(parsed.questions);
        } else if (parsed.goal && Array.isArray(parsed.questions)) {
          setAllGoals([parsed.goal]);
          setActiveGoalId(parsed.goal.id);
          setQuestions(parsed.questions);
        } else {
          alert('Unrecognized JSON backup file format.');
        }
      } catch (err) {
        console.error('Error importing backup:', err);
        alert('Failed to parse the JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070b14] dark:text-slate-100 flex flex-col md:flex-row font-sans transition-colors duration-200">
      {/* Left Vertical Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenGoalSetup={handleOpenEditGoal}
        onOpenQuickLog={() => {
          setDefaultLogChapterId(undefined);
          setIsQuickLogOpen(true);
        }}
        pendingDueCount={checklistData.dueReviews.length}
        sameDayPendingCount={checklistData.sameDayPending.length}
        totalChaptersCount={allChapters.length}
        completedChaptersCount={pacing.completedUnits}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          currentTab={currentTab}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onOpenQuickLog={() => {
            setDefaultLogChapterId(undefined);
            setIsQuickLogOpen(true);
          }}
          onOpenGoalSetup={handleOpenEditGoal}
          activeGoalTitle={goal.title}
          onFinishStudyDay={() => setIsFinishDayOpen(true)}
        />

        {/* Main Viewport Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {currentTab === 'overview' && (
            <WelcomeHubView
              goal={goal}
              allGoals={allGoals}
              onSwitchGoal={handleSwitchGoal}
              pacing={pacing}
              todayChapters={todayChapters}
              dueReviews={checklistData.dueReviews}
              sameDayPending={checklistData.sameDayPending}
              totalVaultQuestionsCount={questions.length}
              todayStr={todayStr}
              onToggleChapter={handleToggleChapter}
              onStartReviewDeck={handleStartReviewDeck}
              onOpenQuickLog={() => {
                setDefaultLogChapterId(undefined);
                setIsQuickLogOpen(true);
              }}
              onFinishStudyDay={() => setIsFinishDayOpen(true)}
              onNavigateToTodayActions={() => setCurrentTab('dashboard')}
              onNavigateToCurriculum={() => setCurrentTab('curriculum')}
              onNavigateToReview={() => setCurrentTab('review')}
              onNavigateToPacing={() => setCurrentTab('goals')}
              onNavigateToErrors={() => setCurrentTab('error-log')}
            />
          )}

          {currentTab === 'dashboard' && (
            <DashboardView
              goal={goal}
              allGoals={allGoals}
              onSwitchGoal={handleSwitchGoal}
              onOpenGoalSetup={handleOpenCreateGoal}
              onOpenEditGoal={handleOpenEditGoal}
              onDeleteGoal={handleDeleteGoal}
              onBackToOverview={() => setCurrentTab('overview')}
              pacing={pacing}
              todayChapters={todayChapters}
              tomorrowChapters={tomorrowChapters}
              dueReviews={checklistData.dueReviews}
              sameDayPending={checklistData.sameDayPending}
              totalVaultQuestionsCount={questions.length}
              overdueCount={checklistData.overdueCount}
              rolledOverCount={checklistData.rolledOverCount}
              totalDueCount={checklistData.totalDueCount}
              todayStr={todayStr}
              onToggleChapter={handleToggleChapter}
              onRescheduleChapter={handleRescheduleChapter}
              onOpenQuickLogForChapter={handleOpenQuickLogForChapter}
              onStartReviewDeck={handleStartReviewDeck}
              onRecalculateSchedule={() => setRecalculateModalOpen(true)}
              onExtendTargetDate={() => setExtendModalOpen(true)}
              onQuickReviewItem={handleReviewAttempt}
              onNavigateToCurriculum={() => setCurrentTab('curriculum')}
              onNavigateToPacing={() => setCurrentTab('goals')}
              onNavigateToErrors={() => setCurrentTab('error-log')}
              onOpenQuickLogGeneral={() => {
                setDefaultLogChapterId(undefined);
                setIsQuickLogOpen(true);
              }}
              onResetSeedData={handleResetToClean}
              onFinishStudyDay={() => setIsFinishDayOpen(true)}
            />
          )}

          {currentTab === 'curriculum' && (
            <GoalCurriculumView
              goal={goal}
              allGoals={allGoals}
              pacing={pacing}
              questions={questions}
              onToggleChapter={handleToggleChapter}
              onOpenQuickLogForChapter={handleOpenQuickLogForChapter}
              onOpenGoalSetup={handleOpenEditGoal}
              onUpdateGoal={handleUpdateActiveGoal}
              onSwitchGoal={handleSwitchGoal}
              onDeleteGoal={handleDeleteGoal}
            />
          )}

          {currentTab === 'review' && (
            <ReviewModeView
              key={`${currentTab}-${reviewFilterMode}`}
              questions={questions}
              chapters={allKnownChapters}
              initialFilter={reviewFilterMode}
              onReviewAttempt={handleReviewAttempt}
              onExitReview={() => setCurrentTab('dashboard')}
              onResetSeedData={handleResetToClean}
            />
          )}

          {currentTab === 'goals' && (
            <GoalsPacingView
              goal={goal}
              pacing={pacing}
              onUpdateGoal={handleUpdateActiveGoal}
              onRecalculateSchedule={() => setRecalculateModalOpen(true)}
              onExtendTargetDate={() => setExtendModalOpen(true)}
              onToggleChapter={handleToggleChapter}
            />
          )}

          {currentTab === 'error-log' && (
            <ErrorLogAnalyticsView
              questions={questions}
              chapters={allKnownChapters}
              materials={allKnownMaterials}
              allGoals={allGoals}
              activeGoalId={goal.id}
              onOpenQuickLog={() => {
                setDefaultLogChapterId(undefined);
                setIsQuickLogOpen(true);
              }}
              onDeleteQuestion={handleDeleteQuestion}
              onResetSeedData={() => setResetModalOpen(true)}
              onExportData={handleExportData}
              onImportData={handleImportData}
            />
          )}
        </main>
      </div>

      {/* Quick-Log Floating Action Button (Mobile) */}
      <div className="fixed bottom-6 right-6 z-30 md:hidden">
        <button
          onClick={() => {
            setDefaultLogChapterId(undefined);
            setIsQuickLogOpen(true);
          }}
          className="w-13 h-13 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 active:scale-95 transition-all text-xl font-bold"
          title="Quick Log"
        >
          +
        </button>
      </div>

      {/* Goal Setup Modal */}
      <GoalSetupModal
        isOpen={isGoalSetupOpen}
        onClose={() => setIsGoalSetupOpen(false)}
        mode={goalSetupMode}
        currentGoal={goal}
        isFirstTime={allGoals.length === 0}
        onGoalCreated={handleGoalCreated}
        onGoalUpdated={handleUpdateActiveGoal}
      />

      {/* Quick Log Modal */}
      <QuickLogModal
        isOpen={isQuickLogOpen}
        onClose={() => setIsQuickLogOpen(false)}
        chapters={allKnownChapters}
        materials={allKnownMaterials}
        materialId={goal.materials[0]?.id || 'mat-1'}
        defaultChapterId={defaultLogChapterId}
        onLogQuestion={handleLogQuestion}
      />

      {/* Recalculate Schedule Confirmation Modal */}
      <ConfirmModal
        isOpen={recalculateModalOpen}
        title="Recalculate Daily Study Target"
        message={`Your current pace target is ${pacing.dailyPace} units per active study day. Recalculating will distribute your ${pacing.remainingUnits} remaining chapters across your ${pacing.remainingActiveStudyDays} remaining active study days while maintaining your target date (${goal.targetDate}).`}
        confirmLabel="Recalculate Pace"
        confirmVariant="primary"
        onConfirm={handleConfirmRecalculate}
        onCancel={() => setRecalculateModalOpen(false)}
      />

      {/* Extend Target Date Confirmation Modal */}
      <ConfirmModal
        isOpen={extendModalOpen}
        title="Extend Target Completion Date"
        message={`This will calculate the delay from your missed chapters and push your target completion date beyond ${goal.targetDate} to preserve your original daily workload.`}
        confirmLabel="Extend Target Date"
        confirmVariant="warning"
        onConfirm={handleConfirmExtend}
        onCancel={() => setExtendModalOpen(false)}
      />

      {/* Reset Seed Data Modal */}
      <ConfirmModal
        isOpen={resetModalOpen}
        title="Reset Study Workspace"
        message="This will reset all study logs and initialize a fresh, clean vanilla workspace ready for your own materials."
        confirmLabel="Reset to Clean Workspace"
        cancelLabel="Close"
        confirmVariant="primary"
        onConfirm={handleResetToClean}
        onCancel={() => setResetModalOpen(false)}
      />

      {/* Finish Study Day Celebration Modal */}
      <FinishStudyDayModal
        isOpen={isFinishDayOpen}
        onClose={() => setIsFinishDayOpen(false)}
        goal={goal}
        pacing={pacing}
        todayChapters={todayChapters}
        reviewedCount={reviewedTodayCount}
      />
    </div>
  );
}
