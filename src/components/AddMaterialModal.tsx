import React, { useState } from 'react';
import { BookOpen, Check, FileText, HelpCircle, Layers, Plus, Trash2, Video, X } from 'lucide-react';
import { Material, MaterialFormat, UnitType } from '../types';
import { createMaterial } from '../lib/storage';

interface AddMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: string;
  onAddMaterial: (newMaterial: Material) => void;
}

export const AddMaterialModal: React.FC<AddMaterialModalProps> = ({
  isOpen,
  onClose,
  goalId,
  onAddMaterial,
}) => {
  const [title, setTitle] = useState<string>('');
  const [format, setFormat] = useState<MaterialFormat>('BOOK');
  const [unitType, setUnitType] = useState<UnitType>('CHAPTER');
  const [subject, setSubject] = useState<string>('');
  const [totalUnits, setTotalUnits] = useState<number>(10);
  const [showCustomTitles, setShowCustomTitles] = useState<boolean>(false);
  const [chapterTitles, setChapterTitles] = useState<string[]>([]);

  if (!isOpen) return null;

  const getPrefix = (type: UnitType) => {
    switch (type) {
      case 'CHAPTER': return 'Chapter';
      case 'LESSON': return 'Lesson';
      case 'MODULE': return 'Module';
      case 'EXERCISE_BLOCK': return 'Exercise Block';
      case 'PAGE': return 'Page';
      default: return 'Unit';
    }
  };

  const handleUnitCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(150, count));
    setTotalUnits(validCount);

    // Adjust chapterTitles array length
    setChapterTitles((prev) => {
      const next = [...prev];
      const prefix = getPrefix(unitType);
      while (next.length < validCount) {
        const num = next.length + 1;
        next.push(`${prefix} ${num}`);
      }
      return next.slice(0, validCount);
    });
  };

  const handleUnitTypeChange = (newType: UnitType) => {
    setUnitType(newType);
    const prefix = getPrefix(newType);
    setChapterTitles((prev) =>
      prev.map((t, idx) => {
        if (t.startsWith('Chapter') || t.startsWith('Lesson') || t.startsWith('Module') || t.startsWith('Block') || t.startsWith('Unit') || t.startsWith('Page')) {
          return `${prefix} ${idx + 1}`;
        }
        return t;
      })
    );
  };

  const handleTitleChange = (index: number, val: string) => {
    setChapterTitles((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newMaterial = createMaterial({
      goalId,
      title: title.trim(),
      totalUnits,
      unitType,
      format,
      subject: subject.trim() || undefined,
      chapterTitles: showCustomTitles ? chapterTitles : undefined,
    });

    onAddMaterial(newMaterial);
    // Reset form
    setTitle('');
    setFormat('BOOK');
    setUnitType('CHAPTER');
    setSubject('');
    setTotalUnits(10);
    setShowCustomTitles(false);
    setChapterTitles([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0d1627] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-700 dark:text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-950 dark:text-white tracking-tight">
                Add Study Resource / Curriculum Item
              </h2>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Books, video lecture courses, question banks, or revision PDFs
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
          {/* Resource Format Picker */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Resource Format
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => { setFormat('BOOK'); handleUnitTypeChange('CHAPTER'); }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  format === 'BOOK'
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Book / Textbook</span>
              </button>

              <button
                type="button"
                onClick={() => { setFormat('VIDEO_COURSE'); handleUnitTypeChange('LESSON'); }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  format === 'VIDEO_COURSE'
                    ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-600 text-purple-700 dark:text-purple-300 ring-1 ring-purple-500'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Video Course</span>
              </button>

              <button
                type="button"
                onClick={() => { setFormat('QUESTION_BANK'); handleUnitTypeChange('EXERCISE_BLOCK'); }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  format === 'QUESTION_BANK'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Q-Bank / Drills</span>
              </button>

              <button
                type="button"
                onClick={() => { setFormat('PDF_SUMMARY'); handleUnitTypeChange('MODULE'); }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  format === 'PDF_SUMMARY'
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-600 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>PDF / Summary</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Resource Title <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Organic Chemistry Review, Bar Prep Civil Law, or Math Drills"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-950 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
            />
          </div>

          {/* Subject / Topic Domain (optional) */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Subject / Topic Domain (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Constitutional Law, Biology, Calculus, Macroeconomics"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-950 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Unit Type */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                Division Unit Type
              </label>
              <select
                value={unitType}
                onChange={(e) => handleUnitTypeChange(e.target.value as UnitType)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 transition-colors"
              >
                <option value="CHAPTER">Chapters (Book / Textbook)</option>
                <option value="LESSON">Lessons / Video Classes</option>
                <option value="MODULE">Modules</option>
                <option value="EXERCISE_BLOCK">Exercise Blocks / Problem Sets</option>
                <option value="PAGE">Pages</option>
              </select>
            </div>

            {/* Total Units */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                Number of {getPrefix(unitType)}s
              </label>
              <input
                type="number"
                min="1"
                max="150"
                value={totalUnits}
                onChange={(e) => handleUnitCountChange(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-950 dark:text-white focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>
          </div>

          {/* Toggle Custom Chapter Titles */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                const nextState = !showCustomTitles;
                setShowCustomTitles(nextState);
                if (nextState && chapterTitles.length === 0) {
                  handleUnitCountChange(totalUnits);
                }
              }}
              className="text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1.5"
            >
              <span>{showCustomTitles ? '− Hide chapter names' : '+ Name each chapter now (Optional)'}</span>
            </button>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
              You can also rename chapters at any time directly in the chapter list.
            </p>
          </div>

          {/* Custom Titles List */}
          {showCustomTitles && (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 border border-slate-300 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-950/60">
              {Array.from({ length: totalUnits }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 w-12 shrink-0">
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    placeholder={`Chapter ${idx + 1} Title`}
                    value={chapterTitles[idx] || ''}
                    onChange={(e) => handleTitleChange(idx, e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Book to Curriculum</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
