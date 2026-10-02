import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, Layers, ListPlus, Sparkles, Tag, X, Zap } from 'lucide-react';
import { AttemptStatus, Chapter, ErrorReason, Material, Question } from '../types';
import { ERROR_CATEGORY_DETAILS, getTodayDateString } from '../lib/srsEngine';

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: Chapter[];
  materials?: Material[];
  materialId?: string;
  defaultChapterId?: string;
  onLogQuestion: (data: {
    materialId?: string;
    chapterId: string;
    sourceRef: string;
    status: AttemptStatus;
    errorReason?: ErrorReason;
    topicWeight: number;
    userNote?: string;
    subTags?: string[];
  }) => void;
}

const COMMON_TAGS = [
  '#trap',
  '#formula-gap',
  '#definition',
  '#misread-prompt',
  '#calculation-slip',
  '#speed-rush',
  '#exception-rule',
  '#memorization',
];

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  isOpen,
  onClose,
  chapters,
  materials = [],
  materialId,
  defaultChapterId,
  onLogQuestion,
}) => {
  const [logMode, setLogMode] = useState<'SINGLE' | 'BATCH'>('SINGLE');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [sourceRef, setSourceRef] = useState<string>('');
  const [status, setStatus] = useState<AttemptStatus>('INCORRECT');
  const [errorReason, setErrorReason] = useState<ErrorReason>('ATTENTION');
  const [topicWeight, setTopicWeight] = useState<number>(3);
  const [userNote, setUserNote] = useState<string>('');
  const [quickNum, setQuickNum] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState<string>('');

  // Batch logging state
  const [batchNumbers, setBatchNumbers] = useState<string>('');
  const [batchPrefix, setBatchPrefix] = useState<string>('Q');

  // Determine available materials
  const effectiveMaterials = useMemo(() => {
    if (materials && materials.length > 0) return materials;
    const matMap = new Map<string, Material>();
    chapters.forEach((ch) => {
      if (!matMap.has(ch.materialId)) {
        matMap.set(ch.materialId, {
          id: ch.materialId,
          goalId: 'goal-default',
          title: ch.materialId.replace('mat-', '').toUpperCase(),
          totalUnits: 1,
          unitType: 'CHAPTER',
          chapters: [],
        });
      }
    });
    return Array.from(matMap.values());
  }, [materials, chapters]);

  // Set initial selected material and chapter on open
  useEffect(() => {
    if (isOpen) {
      let initMatId = materialId || '';
      let initChId = defaultChapterId || '';

      if (defaultChapterId) {
        const foundCh = chapters.find((c) => c.id === defaultChapterId);
        if (foundCh) {
          initMatId = foundCh.materialId;
          initChId = foundCh.id;
        }
      }

      if (!initMatId && effectiveMaterials.length > 0) {
        initMatId = effectiveMaterials[0].id;
      }

      setSelectedMaterialId(initMatId);

      const filteredChs = chapters.filter((c) => !initMatId || c.materialId === initMatId);
      if (initChId && filteredChs.some((c) => c.id === initChId)) {
        setSelectedChapterId(initChId);
      } else if (filteredChs.length > 0) {
        const firstUnfinished = filteredChs.find((c) => !c.isCompleted);
        setSelectedChapterId(firstUnfinished ? firstUnfinished.id : filteredChs[0].id);
      } else if (chapters.length > 0) {
        setSelectedChapterId(chapters[0].id);
      }
    }
  }, [isOpen, defaultChapterId, materialId, effectiveMaterials, chapters]);

  const currentMaterialChapters = useMemo(() => {
    if (!selectedMaterialId) return chapters;
    const filtered = chapters.filter((c) => c.materialId === selectedMaterialId);
    return filtered.length > 0 ? filtered : chapters;
  }, [chapters, selectedMaterialId]);

  const handleMaterialChange = (newMatId: string) => {
    setSelectedMaterialId(newMatId);
    const related = chapters.filter((c) => c.materialId === newMatId);
    if (related.length > 0) {
      const firstUnfinished = related.find((c) => !c.isCompleted);
      setSelectedChapterId(firstUnfinished ? firstUnfinished.id : related[0].id);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customTagInput.trim()) {
      e.preventDefault();
      const formatted = customTagInput.startsWith('#')
        ? customTagInput.trim()
        : `#${customTagInput.trim()}`;
      if (!selectedTags.includes(formatted)) {
        setSelectedTags((prev) => [...prev, formatted]);
      }
      setCustomTagInput('');
    }
  };

  // Hotkey support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        if (e.key === 'Escape') {
          onClose();
        }
        return;
      }

      if (e.key === 'c' || e.key === 'C') {
        setStatus('CORRECT');
      } else if (e.key === 'e' || e.key === 'E') {
        setStatus('INCORRECT');
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentChapter = chapters.find((c) => c.id === selectedChapterId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (logMode === 'BATCH') {
      // Parse numbers from batch input (e.g. "4, 12, 17, 23" or "4 12 17")
      const nums = batchNumbers
        .split(/[,\s\n]+/)
        .map((s) => s.trim().replace(/^#|^Q/i, ''))
        .filter((s) => s.length > 0);

      if (nums.length === 0) return;

      nums.forEach((n) => {
        onLogQuestion({
          materialId: selectedMaterialId || currentChapter?.materialId,
          chapterId: selectedChapterId || (chapters[0]?.id ?? 'ch-1'),
          sourceRef: `${currentChapter ? `Ch ${currentChapter.number}` : 'Drill'} · ${batchPrefix}${n}`,
          status: 'INCORRECT',
          errorReason,
          topicWeight,
          userNote: userNote.trim() || undefined,
          subTags: selectedTags.length > 0 ? selectedTags : undefined,
        });
      });

      setBatchNumbers('');
      setUserNote('');
      setSelectedTags([]);
      onClose();
      return;
    }

    // Single logging mode
    let finalRef = sourceRef.trim();
    if (!finalRef) {
      if (quickNum.trim()) {
        finalRef = `${currentChapter ? `Ch ${currentChapter.number}` : 'Unit'} · Q${quickNum.trim()}`;
      } else {
        finalRef = `${currentChapter ? `Ch ${currentChapter.number}` : 'Unit'} · Practice Item`;
      }
    }

    onLogQuestion({
      materialId: selectedMaterialId || currentChapter?.materialId,
      chapterId: selectedChapterId || (chapters[0]?.id ?? 'ch-1'),
      sourceRef: finalRef,
      status,
      errorReason: status === 'INCORRECT' ? errorReason : undefined,
      topicWeight,
      userNote: userNote.trim() || undefined,
      subTags: selectedTags.length > 0 ? selectedTags : undefined,
    });

    setSourceRef('');
    setQuickNum('');
    setUserNote('');
    setSelectedTags([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-2xl shadow-xl p-6 overflow-hidden transition-colors max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-black text-slate-950 dark:text-white tracking-tight">
              {logMode === 'BATCH' ? 'Batch Error Logging' : 'Log Question / Error Entry'}
            </h2>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
              Instant SRS classification & cognitive root-cause diagnosis
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tab */}
        <div className="pt-3">
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setLogMode('SINGLE')}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                logMode === 'SINGLE'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Single Question
            </button>
            <button
              type="button"
              onClick={() => setLogMode('BATCH')}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                logMode === 'BATCH'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span>Batch Log Exam Errors</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Book / Material Selector */}
          {effectiveMaterials.length > 1 && (
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                Book / Textbook Resource
              </label>
              <select
                value={selectedMaterialId}
                onChange={(e) => handleMaterialChange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-600 transition-colors"
              >
                {effectiveMaterials.map((m) => (
                  <option key={m.id} value={m.id}>
                    📚 {m.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Chapter / Topic Selector */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Study Chapter / Topic Unit
            </label>
            <select
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-600 transition-colors"
            >
              {currentMaterialChapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  Chapter {ch.number}: {ch.title} {ch.topic ? `(${ch.topic})` : ''} {ch.isCompleted ? '✓' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* BATCH LOGGING INPUT */}
          {logMode === 'BATCH' ? (
            <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
                <span>Enter Question Numbers Missed:</span>
                <span className="text-slate-500 font-normal">Separated by commas or spaces</span>
              </div>
              <textarea
                rows={2}
                placeholder="e.g. 4, 12, 17, 23, 31, 45"
                value={batchNumbers}
                onChange={(e) => setBatchNumbers(e.target.value)}
                required
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-600"
              />
              <div className="text-[11px] text-blue-800 dark:text-blue-300 font-medium">
                ⚡ Automatically registers separate SRS cards for each missed question number in this section.
              </div>
            </div>
          ) : (
            /* SINGLE QUESTION LOGGING INPUT */
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                  Question No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. 14"
                  value={quickNum}
                  onChange={(e) => setQuickNum(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-950 dark:text-slate-100 font-bold font-mono focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                  Exact Reference / Source
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q14 - Page 120 (or custom ref)"
                  value={sourceRef}
                  onChange={(e) => setSourceRef(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-950 dark:text-slate-100 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Result Segmented Control (Single mode only) */}
          {logMode === 'SINGLE' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">Attempt Result</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Shortcuts: <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono font-bold text-xs text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700">C</kbd> Correct ·{' '}
                  <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono font-bold text-xs text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700">E</kbd> Incorrect
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStatus('CORRECT')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    status === 'CORRECT'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>CORRECT [C]</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('INCORRECT')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    status === 'INCORRECT'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>ERROR [E]</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Taxonomy (if INCORRECT or BATCH) */}
          {(status === 'INCORRECT' || logMode === 'BATCH') && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-900/40 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-rose-900 dark:text-rose-200">
                Root Cause Error Taxonomy
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(ERROR_CATEGORY_DETAILS) as ErrorReason[]).map((cat) => {
                  const details = ERROR_CATEGORY_DETAILS[cat];
                  const isSelected = errorReason === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setErrorReason(cat)}
                      className={`p-2 rounded-lg text-left text-xs transition-all border ${
                        isSelected
                          ? `${details.bg} ${details.border} ${details.color} font-bold shadow-xs ring-1 ring-rose-400`
                          : 'bg-white dark:bg-slate-900/60 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                      }`}
                    >
                      <div className="font-bold">{details.label}</div>
                      <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300 mt-0.5 line-clamp-1">
                        {details.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub-Tags & Diagnostic Flags */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              <span>Diagnostic Sub-Tags (Optional)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              placeholder="Add custom tag (press Enter, e.g. #case-law, #formula-3)"
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              onKeyDown={handleAddCustomTag}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* High-Yield Importance Weight */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                Topic Importance / High-Yield Weight (1 - Low to 5 - Critical)
              </label>
              <span className="text-xs font-mono text-blue-700 dark:text-blue-300 font-black">
                Weight: {topicWeight} / 5
              </span>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setTopicWeight(w)}
                  className={`flex-1 py-1.5 text-xs font-mono font-bold rounded-lg border transition-colors ${
                    topicWeight === w
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:border-slate-400'
                  }`}
                >
                  {w}★
                </button>
              ))}
            </div>
          </div>

          {/* User Notes / Trap Explanation */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Identified Trap / Key Takeaway (optional)
            </label>
            <textarea
              rows={2}
              placeholder="Why was it missed? e.g. 'Overlooked exception in article 5', 'Sign inverted during integration'"
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-950 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-600 transition-colors"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-800 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{logMode === 'BATCH' ? 'Save All Batch Errors' : 'Save & Schedule SRS'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
