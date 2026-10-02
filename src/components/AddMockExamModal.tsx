import React, { useState } from 'react';
import { Award, Calendar, Check, Plus, Target, Trash2, TrendingUp, X } from 'lucide-react';
import { MockExam, MockExamScoringType, SubjectScoreBreakdown } from '../types';
import { getTodayDateString } from '../lib/srsEngine';

interface AddMockExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: string;
  onAddMockExam: (exam: MockExam) => void;
  editingExam?: MockExam | null;
  availableSubjects?: string[];
}

export const AddMockExamModal: React.FC<AddMockExamModalProps> = ({
  isOpen,
  onClose,
  goalId,
  onAddMockExam,
  editingExam,
  availableSubjects = [],
}) => {
  const todayStr = getTodayDateString();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayStr);
  const [scoringType, setScoringType] = useState<MockExamScoringType>('RAW_SCORE');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [targetScore, setTargetScore] = useState('');
  const [errorCount, setErrorCount] = useState('');
  const [notes, setNotes] = useState('');
  const [subjectBreakdown, setSubjectBreakdown] = useState<SubjectScoreBreakdown[]>([]);

  // Sub-score addition input state
  const [subSubject, setSubSubject] = useState('');
  const [subScore, setSubScore] = useState('');
  const [subMaxScore, setSubMaxScore] = useState('');
  const [subErrors, setSubErrors] = useState('');

  // Prefill or reset state when modal opens or editingExam changes
  React.useEffect(() => {
    if (editingExam) {
      setTitle(editingExam.title || '');
      setDate(editingExam.date || todayStr);
      setScoringType(editingExam.scoringType || 'RAW_SCORE');
      setScore(editingExam.score !== undefined ? String(editingExam.score) : '');
      setMaxScore(editingExam.maxScore !== undefined ? String(editingExam.maxScore) : '100');
      setTargetScore(editingExam.targetScore !== undefined ? String(editingExam.targetScore) : '');
      setErrorCount(editingExam.errorCount !== undefined ? String(editingExam.errorCount) : '');
      setNotes(editingExam.notes || '');
      setSubjectBreakdown(editingExam.subjectBreakdown || []);
    } else {
      setTitle('');
      setDate(todayStr);
      setScoringType('RAW_SCORE');
      setScore('');
      setMaxScore('100');
      setTargetScore('');
      setErrorCount('');
      setNotes('');
      setSubjectBreakdown([]);
    }
  }, [editingExam, isOpen, todayStr]);

  if (!isOpen) return null;

  const handleAddSubScore = () => {
    if (!subSubject.trim()) return;
    setSubjectBreakdown((prev) => [
      ...prev,
      {
        subject: subSubject.trim(),
        score: subScore ? parseFloat(subScore) : undefined,
        maxScore: subMaxScore ? parseFloat(subMaxScore) : undefined,
        errorCount: subErrors ? parseInt(subErrors) : undefined,
      },
    ]);
    setSubSubject('');
    setSubScore('');
    setSubMaxScore('');
    setSubErrors('');
  };

  const handleRemoveSubScore = (index: number) => {
    setSubjectBreakdown((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newExam: MockExam = {
      id: editingExam ? editingExam.id : `mock-${Date.now()}`,
      goalId: editingExam?.goalId || goalId,
      title: title.trim(),
      date: date || todayStr,
      scoringType,
      score: score ? parseFloat(score) : undefined,
      maxScore: maxScore ? parseFloat(maxScore) : undefined,
      targetScore: targetScore ? parseFloat(targetScore) : undefined,
      errorCount: errorCount ? (parseInt(errorCount) || errorCount) : undefined,
      subjectBreakdown: subjectBreakdown.length > 0 ? subjectBreakdown : undefined,
      notes: notes.trim() || undefined,
    };

    onAddMockExam(newExam);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-950 dark:text-white tracking-tight">
                {editingExam ? 'Edit Mock Exam / Benchmark' : 'Record Mock Exam / Practice Test'}
              </h2>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Universal scoring for any exam, competition, or test benchmark
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Exam Title */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Exam / Simulation Title <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Diagnostic Simulation #1, Past Exam 2025, or Midterm Drill"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-950 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
            />
          </div>

          {/* Scoring Format Selector */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Score Format Type
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setScoringType('RAW_SCORE')}
                className={`py-2 px-2 text-xs font-bold rounded-lg transition-all ${
                  scoringType === 'RAW_SCORE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950'
                }`}
              >
                Questions (72 / 90)
              </button>
              <button
                type="button"
                onClick={() => {
                  setScoringType('PERCENTAGE');
                  setMaxScore('100');
                }}
                className={`py-2 px-2 text-xs font-bold rounded-lg transition-all ${
                  scoringType === 'PERCENTAGE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950'
                }`}
              >
                Percentage (85%)
              </button>
              <button
                type="button"
                onClick={() => setScoringType('SCALED_SCORE')}
                className={`py-2 px-2 text-xs font-bold rounded-lg transition-all ${
                  scoringType === 'SCALED_SCORE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950'
                }`}
              >
                Scaled (750 / 800)
              </button>
            </div>
          </div>

          {/* Date & Overall Score */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                Date Taken
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                Score Obtained {scoringType === 'PERCENTAGE' ? '(%)' : ''}
              </label>
              <input
                type="number"
                step="any"
                placeholder={scoringType === 'PERCENTAGE' ? '85' : '74'}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono font-black text-slate-950 dark:text-white focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            {scoringType !== 'PERCENTAGE' && (
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                  Max Scale / Total Items
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="90"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>
            )}
          </div>

          {/* Target Cutoff Score & Total Errors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                Target / Passing Cutoff (Optional)
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 70 or 800"
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400 focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                Total Errors / Wrong Items
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 16"
                value={errorCount}
                onChange={(e) => setErrorCount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono font-bold text-rose-700 dark:text-rose-400 placeholder-slate-500 focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>
          </div>

          {/* Subject Sub-Scores Breakdown */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Subject Sub-Scores Breakdown (Optional)
              </span>
              <span className="text-[11px] text-slate-500">Track performance per section</span>
            </div>

            {subjectBreakdown.length > 0 && (
              <div className="space-y-1.5">
                {subjectBreakdown.map((sb, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <div className="font-bold text-slate-900 dark:text-white">{sb.subject}</div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                        {sb.score !== undefined ? `${sb.score}${sb.maxScore ? ` / ${sb.maxScore}` : ''}` : '—'}
                      </span>
                      {sb.errorCount !== undefined && (
                        <span className="text-rose-600 font-semibold">{sb.errorCount} err</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveSubScore(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add sub-score row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
              <input
                type="text"
                placeholder="Subject / Topic"
                list="available-subjects-list"
                value={subSubject}
                onChange={(e) => setSubSubject(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-900 dark:text-white"
              />
              <datalist id="available-subjects-list">
                {availableSubjects.map((s, i) => (
                  <option key={i} value={s} />
                ))}
              </datalist>

              <input
                type="number"
                placeholder="Score"
                value={subScore}
                onChange={(e) => setSubScore(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold"
              />

              <input
                type="number"
                placeholder="Max"
                value={subMaxScore}
                onChange={(e) => setSubMaxScore(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold"
              />

              <button
                type="button"
                onClick={handleAddSubScore}
                disabled={!subSubject.trim()}
                className="px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800 rounded-lg text-xs font-bold hover:bg-blue-100 disabled:opacity-40 transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Section</span>
              </button>
            </div>
          </div>

          {/* Diagnostic Notes */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Diagnostic Notes & Takeaways
            </label>
            <textarea
              rows={2}
              placeholder="e.g. 'Strong in section 1 concepts, but rushed through final 10 questions. Need to practice pacing.'"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-950 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{editingExam ? 'Save Changes' : 'Save Mock Exam'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
