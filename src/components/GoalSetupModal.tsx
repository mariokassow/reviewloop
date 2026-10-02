import React, { useEffect, useState } from 'react';
import { addDays, differenceInCalendarDays, format, isBefore, parseISO } from 'date-fns';
import { Award, Calendar, Check, ChevronDown, Compass, Edit2, Layers, Plus, Shield, Sparkles, Target, X } from 'lucide-react';
import { StudyGoal, UnitType } from '../types';
import { createCustomStudyGoal } from '../lib/storage';

interface GoalSetupModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isFirstTime?: boolean;
  mode?: 'create' | 'edit';
  currentGoal?: StudyGoal;
  onGoalCreated: (goal: StudyGoal) => void;
  onGoalUpdated?: (goal: StudyGoal) => void;
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

export const GoalSetupModal: React.FC<GoalSetupModalProps> = ({
  isOpen,
  onClose,
  isFirstTime = false,
  mode = 'edit',
  currentGoal,
  onGoalCreated,
  onGoalUpdated,
}) => {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const defaultTargetStr = format(addDays(today, 30), 'yyyy-MM-dd');

  const [activeTab, setActiveTab] = useState<'edit' | 'create'>(() => {
    if (isFirstTime) return 'create';
    return mode || 'edit';
  });

  const [title, setTitle] = useState<string>('My Study Sprint');
  const [materialTitle, setMaterialTitle] = useState<string>('Primary Course Book / Material');
  const [unitType, setUnitType] = useState<UnitType>('CHAPTER');
  const [totalUnits, setTotalUnits] = useState<number>(20);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [targetDate, setTargetDate] = useState<string>(defaultTargetStr);
  const [activeDays, setActiveDays] = useState<number[]>([1, 2, 3, 4, 5, 6]); // Mon-Sat
  const [bufferPercentage, setBufferPercentage] = useState<number>(0.15);
  const [dailyReviewCap, setDailyReviewCap] = useState<number>(30);
  const [isTimelineTemplatesOpen, setIsTimelineTemplatesOpen] = useState<boolean>(false);

  // Sync state whenever modal opens or currentGoal/mode changes
  useEffect(() => {
    if (isOpen) {
      if (currentGoal && activeTab === 'edit') {
        setTitle(currentGoal.title);
        setMaterialTitle(currentGoal.materials[0]?.title || 'Primary Course Material');
        setUnitType(currentGoal.materials[0]?.unitType || 'CHAPTER');
        setTotalUnits(currentGoal.materials[0]?.totalUnits || currentGoal.materials[0]?.chapters.length || 20);
        setStartDate(currentGoal.startDate || todayStr);
        setTargetDate(currentGoal.targetDate || defaultTargetStr);
        setActiveDays(currentGoal.activeDaysOfWeek || [1, 2, 3, 4, 5, 6]);
        setBufferPercentage(currentGoal.bufferPercentage ?? 0.15);
        setDailyReviewCap(currentGoal.dailyReviewCap ?? 30);
      } else if (activeTab === 'create') {
        setTitle('My Study Sprint');
        setMaterialTitle('Primary Course Book / Material');
        setUnitType('CHAPTER');
        setTotalUnits(20);
        setStartDate(todayStr);
        setTargetDate(defaultTargetStr);
        setActiveDays([1, 2, 3, 4, 5, 6]);
        setBufferPercentage(0.15);
        setDailyReviewCap(30);
      }
    }
  }, [isOpen, currentGoal, activeTab, todayStr, defaultTargetStr]);

  if (!isOpen) return null;

  const handleToggleDay = (day: number) => {
    if (activeDays.includes(day)) {
      if (activeDays.length > 1) {
        setActiveDays(activeDays.filter((d) => d !== day));
      }
    } else {
      setActiveDays([...activeDays, day]);
    }
  };

  const applyPreset = (preset: '30days' | '60days' | '90days' | 'express') => {
    const sDate = startDate || todayStr;
    const sParsed = parseISO(sDate);
    const validStart = isNaN(sParsed.getTime()) ? today : sParsed;

    if (preset === 'express') {
      setTitle('Express Sprint (15 Days)');
      setMaterialTitle('Rapid Review & Exercises');
      setUnitType('CHAPTER');
      setTotalUnits(15);
      setTargetDate(format(addDays(validStart, 15), 'yyyy-MM-dd'));
      setActiveDays([1, 2, 3, 4, 5, 6]);
      setBufferPercentage(0.10);
    } else if (preset === '30days') {
      setTitle('Intensive Sprint (30 Days)');
      setMaterialTitle('Core Textbook & Problem Sets');
      setUnitType('CHAPTER');
      setTotalUnits(25);
      setTargetDate(format(addDays(validStart, 30), 'yyyy-MM-dd'));
      setActiveDays([1, 2, 3, 4, 5, 6]);
      setBufferPercentage(0.15);
    } else if (preset === '60days') {
      setTitle('Comprehensive Prep (60 Days)');
      setMaterialTitle('Full Course / Workbook');
      setUnitType('CHAPTER');
      setTotalUnits(40);
      setTargetDate(format(addDays(validStart, 60), 'yyyy-MM-dd'));
      setActiveDays([1, 2, 3, 4, 5, 6]);
      setBufferPercentage(0.15);
    } else if (preset === '90days') {
      setTitle('Quarterly Mastery Cycle (90 Days)');
      setMaterialTitle('Complete Curriculum');
      setUnitType('CHAPTER');
      setTotalUnits(60);
      setTargetDate(format(addDays(validStart, 90), 'yyyy-MM-dd'));
      setActiveDays([1, 2, 3, 4, 5, 6]);
      setBufferPercentage(0.20);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure target date is after or equal to start date
    let validStartDate = startDate.trim() || todayStr;
    let validTargetDate = targetDate.trim() || defaultTargetStr;

    try {
      const s = parseISO(validStartDate);
      const t = parseISO(validTargetDate);
      if (isBefore(t, s)) {
        validTargetDate = format(addDays(s, 30), 'yyyy-MM-dd');
      }
    } catch {
      // fallback
    }

    if (activeTab === 'edit' && currentGoal && onGoalUpdated) {
      // Update the active goal preserving existing chapters, logs, and progress
      const updatedMaterials = currentGoal.materials.map((m, idx) => {
        if (idx === 0) {
          return {
            ...m,
            title: materialTitle.trim() || m.title,
            unitType,
          };
        }
        return m;
      });

      const updatedGoal: StudyGoal = {
        ...currentGoal,
        title: title.trim() || currentGoal.title,
        startDate: validStartDate,
        targetDate: validTargetDate,
        bufferPercentage,
        activeDaysOfWeek: activeDays,
        dailyReviewCap,
        materials: updatedMaterials,
      };

      onGoalUpdated(updatedGoal);
      if (onClose) onClose();
      return;
    }

    // Otherwise create a new goal
    const newGoal = createCustomStudyGoal({
      title: title.trim() || 'My Study Sprint',
      materialTitle: materialTitle.trim() || 'Primary Material',
      totalUnits: Math.max(1, totalUnits),
      unitType,
      startDate: validStartDate,
      targetDate: validTargetDate,
      bufferPercentage,
      activeDaysOfWeek: activeDays,
      dailyReviewCap,
    });

    onGoalCreated(newGoal);
    if (onClose) onClose();
  };

  // Preview metrics
  const calendarDaysDiff = Math.max(
    1,
    differenceInCalendarDays(parseISO(targetDate || defaultTargetStr), parseISO(startDate || todayStr))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 my-8 overflow-hidden transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              <span>{activeTab === 'edit' ? 'Edit Active Goal & Schedule' : 'Create New Study Goal'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight mt-1">
              {activeTab === 'edit' ? 'Adjust Start & Target Completion Dates' : 'Configure Study Goal & Dynamic Pacing'}
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
              Change your start date, target exam deadline, weekly study schedule, and buffer protection.
            </p>
          </div>

          {!isFirstTime && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab Switcher if editing an existing goal is available */}
        {currentGoal && !isFirstTime && (
          <div className="mt-4 flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'edit'
                  ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Current Goal: {currentGoal.title}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950'
              }`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Create Brand New Goal</span>
            </button>
          </div>
        )}

        {/* Quick Presets (Collapsible / Minimizable) */}
        <div className="mt-4 rounded-xl border border-slate-300 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950/80 transition-all">
          <button
            type="button"
            onClick={() => setIsTimelineTemplatesOpen(!isTimelineTemplatesOpen)}
            className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer select-none"
          >
            <div className="flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Quick Timeline Templates</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
              <span>{isTimelineTemplatesOpen ? 'Minimize / Hide' : 'Expand / Show'}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isTimelineTemplatesOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {isTimelineTemplatesOpen && (
            <div className="p-3 pt-1 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('express')}
                  className="px-3 py-2 text-left rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 hover:border-blue-500 transition-all text-xs shadow-xs"
                >
                  <div className="font-bold text-slate-950 dark:text-white text-xs sm:text-sm">Express 15 Days</div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">+15 Days from Start</div>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('30days')}
                  className="px-3 py-2 text-left rounded-lg bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-300 dark:border-blue-800 transition-all text-xs shadow-xs"
                >
                  <div className="font-bold text-blue-900 dark:text-blue-200 text-xs sm:text-sm">Sprint 30 Days</div>
                  <div className="text-xs font-semibold text-blue-800/80 dark:text-blue-300/80 mt-0.5">+30 Days from Start</div>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('60days')}
                  className="px-3 py-2 text-left rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 hover:border-blue-500 transition-all text-xs shadow-xs"
                >
                  <div className="font-bold text-slate-950 dark:text-white text-xs sm:text-sm">Prep 60 Days</div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">+60 Days from Start</div>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('90days')}
                  className="px-3 py-2 text-left rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 hover:border-blue-500 transition-all text-xs shadow-xs"
                >
                  <div className="font-bold text-slate-950 dark:text-white text-xs sm:text-sm">Quarterly 90 Days</div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">+90 Days from Start</div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* DATE SELECTORS - HIGHLIGHTED AT TOP */}
          <div className="p-4 bg-blue-50/70 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-900/50 rounded-xl space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Study Timeline Dates (Start & Target Completion)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-black text-slate-950 dark:text-white mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-slate-950 border-2 border-blue-300 dark:border-blue-600 rounded-lg px-3 py-2 text-sm font-bold text-slate-950 dark:text-white font-mono focus:outline-none focus:border-blue-700 transition-colors shadow-2xs"
                />
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-1">
                  First day of your study schedule
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs sm:text-sm font-black text-slate-950 dark:text-white">
                    Target Completion Date (Exam / Deadline)
                  </label>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-400 text-slate-950 shadow-2xs border border-amber-600/40">
                    <Award className="w-2.5 h-2.5 fill-slate-950/20" />
                    <span>Exam Day · Reserved</span>
                  </span>
                </div>
                <input
                  type="date"
                  value={targetDate}
                  min={startDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-slate-950 border-2 border-blue-300 dark:border-blue-600 rounded-lg px-3 py-2 text-sm font-bold text-slate-950 dark:text-white font-mono focus:outline-none focus:border-blue-700 transition-colors shadow-2xs"
                />
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-1 flex items-center justify-between flex-wrap gap-1">
                  <span>Total Window: <strong className="text-blue-700 dark:text-blue-400">{calendarDaysDiff} calendar days</strong></span>
                  <span className="text-amber-800 dark:text-amber-300 font-bold">🏆 Exam Day (Reserved)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                Goal / Sprint / Exam Title
              </label>
              <input
                type="text"
                placeholder="e.g. USMLE Step 1, CFA Level 1, MCAT Prep, Bar Exam"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-semibold text-slate-950 dark:text-white focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                Primary Book or Resource Name
              </label>
              <input
                type="text"
                placeholder="e.g. First Aid for USMLE, Calculus Early Transcendentals..."
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-semibold text-slate-950 dark:text-white focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>
          </div>

          {activeTab === 'create' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Unit Type
                </label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-300 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setUnitType('CHAPTER')}
                    className={`py-1.5 text-xs font-bold rounded-md transition-colors ${
                      unitType === 'CHAPTER'
                        ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-950'
                    }`}
                  >
                    Chapters
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitType('PAGE')}
                    className={`py-1.5 text-xs font-bold rounded-md transition-colors ${
                      unitType === 'PAGE'
                        ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-950'
                    }`}
                  >
                    Pages
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Total Initial {unitType === 'CHAPTER' ? 'Chapters' : 'Pages'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={totalUnits}
                  onChange={(e) => setTotalUnits(parseInt(e.target.value) || 1)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-950 dark:text-white font-mono focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Active study days of the week */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
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
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-800 hover:border-slate-400'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                Daily Review Cap (SRS Anti-Snowball)
              </label>
              <input
                type="number"
                min="10"
                max="100"
                step="5"
                value={dailyReviewCap}
                onChange={(e) => setDailyReviewCap(parseInt(e.target.value) || 30)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-950 dark:text-white font-mono focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Buffer Smoothing: <span className="font-mono text-blue-700 dark:text-blue-400 font-black">{(bufferPercentage * 100).toFixed(0)}%</span>
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.25"
                step="0.01"
                value={bufferPercentage}
                onChange={(e) => setBufferPercentage(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer mt-2"
              />
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mt-1">
                Reserves rest days & prevents schedule snowballing
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            {!isFirstTime && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{activeTab === 'edit' ? 'Save Dates & Goal' : 'Save & Launch Sprint'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
