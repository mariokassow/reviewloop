import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Lightbulb,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react';
import { Chapter, ErrorReason, Material, Question, SRSStage, StudyGoal } from '../types';
import {
  ERROR_CATEGORY_DETAILS,
  calculatePriorityScore,
  generateAnkiTSV,
  generateQuestionsCSV,
  getTodayDateString,
  isLeechQuestion,
} from '../lib/srsEngine';
import {
  extractGoalSubjects,
  getQuestionResolvedSubject,
  getSubjectStyle,
} from '../lib/subjectUtils';

interface ErrorLogAnalyticsViewProps {
  questions: Question[];
  chapters: Chapter[];
  materials?: Material[];
  allGoals?: StudyGoal[];
  activeGoalId?: string;
  onOpenQuickLog: () => void;
  onDeleteQuestion: (questionId: string) => void;
  onResetSeedData: () => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function getQuestionErrorReason(q: Question): ErrorReason {
  for (let i = q.attempts.length - 1; i >= 0; i--) {
    if (q.attempts[i].errorReason) {
      return q.attempts[i].errorReason as ErrorReason;
    }
  }
  return q.attempts[0]?.errorReason || 'ATTENTION';
}

export const ErrorLogAnalyticsView: React.FC<ErrorLogAnalyticsViewProps> = ({
  questions,
  chapters,
  materials = [],
  allGoals = [],
  activeGoalId,
  onOpenQuickLog,
  onDeleteQuestion,
  onExportData,
  onImportData,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedGoal, setSelectedGoal] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('ALL');
  const [selectedChapter, setSelectedChapter] = useState<string>('ALL');
  const [selectedErrorCategory, setSelectedErrorCategory] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [showOnlyLeeches, setShowOnlyLeeches] = useState<boolean>(false);
  const [analyticsTab, setAnalyticsTab] = useState<'DISTRIBUTION' | 'COMPARISON'>('DISTRIBUTION');

  const todayStr = getTodayDateString();

  // Distinct subjects discovered across materials and questions
  const distinctSubjects = useMemo(() => {
    const fromGoal = extractGoalSubjects(materials, chapters);
    const fromQuestions = questions.map((q) => getQuestionResolvedSubject(q, materials, chapters));
    const merged = Array.from(new Set([...fromGoal, ...fromQuestions])).filter(Boolean);
    return merged.length > 0 ? merged : ['General Curriculum'];
  }, [materials, chapters, questions]);

  // Distinct sub-tags discovered
  const distinctTags = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      q.subTags?.forEach((t) => set.add(t));
      q.attempts.forEach((a) => a.subTags?.forEach((t) => set.add(t)));
    });
    return Array.from(set);
  }, [questions]);

  const chronicLeechCount = useMemo(() => questions.filter(isLeechQuestion).length, [questions]);

  const handleExportAnki = () => {
    const listToExport = filteredQuestions.length > 0 ? filteredQuestions : questions;
    const tsv = generateAnkiTSV(listToExport);
    const blob = new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `error_vault_anki_${todayStr}.tsv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const listToExport = filteredQuestions.length > 0 ? filteredQuestions : questions;
    const csv = generateQuestionsCSV(listToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `error_vault_spreadsheet_${todayStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const availableMaterials = useMemo(() => {
    let list = materials;
    if (selectedGoal !== 'ALL') {
      list = list.filter((m) => m.goalId === selectedGoal);
    }
    if (selectedSubject !== 'ALL') {
      list = list.filter((m) => {
        const hasMatchingQuestion = questions.some(
          (q) => q.materialId === m.id && getQuestionResolvedSubject(q, materials, chapters) === selectedSubject
        );
        if (hasMatchingQuestion) return true;
        if (m.subject === selectedSubject) return true;
        return false;
      });
    }
    return list;
  }, [materials, selectedGoal, selectedSubject, questions, chapters]);

  // Scoped questions
  const scopedQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (selectedGoal !== 'ALL') {
        const mat = materials.find((m) => m.id === q.materialId);
        if (mat && mat.goalId !== selectedGoal) return false;
      }

      if (selectedSubject !== 'ALL') {
        const subj = getQuestionResolvedSubject(q, materials, chapters);
        if (subj !== selectedSubject) return false;
      }

      if (selectedMaterial !== 'ALL' && q.materialId !== selectedMaterial) {
        return false;
      }

      if (selectedChapter !== 'ALL' && q.chapterId !== selectedChapter) {
        return false;
      }

      if (selectedTag !== 'ALL') {
        const hasTag = q.subTags?.includes(selectedTag) || q.attempts.some((a) => a.subTags?.includes(selectedTag));
        if (!hasTag) return false;
      }

      if (showOnlyLeeches && !isLeechQuestion(q)) {
        return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesRef = q.sourceRef.toLowerCase().includes(term);
        const matchesNotes = (q.notes || '').toLowerCase().includes(term);
        const matchesTags = q.subTags?.some((t) => t.toLowerCase().includes(term));
        if (!matchesRef && !matchesNotes && !matchesTags) return false;
      }

      return true;
    });
  }, [questions, selectedGoal, selectedSubject, selectedMaterial, selectedChapter, selectedTag, showOnlyLeeches, searchTerm, materials, chapters]);

  // Filtered questions for table
  const filteredQuestions = useMemo(() => {
    return scopedQuestions.filter((q) => {
      if (selectedErrorCategory !== 'ALL') {
        const reason = getQuestionErrorReason(q);
        if (reason !== selectedErrorCategory) return false;
      }

      if (selectedStage !== 'ALL') {
        if (selectedStage === 'SAME_DAY') {
          if (!q.srsItem.isSameDayPending) return false;
        } else if (q.srsItem.stage !== selectedStage) {
          return false;
        }
      }

      return true;
    });
  }, [scopedQuestions, selectedErrorCategory, selectedStage]);

  const computeStatsForQuestions = (questionSet: Question[]) => {
    let totalErrors = 0;
    const counts: Record<ErrorReason, number> = {
      THEORY: 0,
      ATTENTION: 0,
      CALCULATION: 0,
      TIME: 0,
    };

    questionSet.forEach((q) => {
      const reason = getQuestionErrorReason(q);
      if (reason) {
        counts[reason]++;
        totalErrors++;
      }
    });

    return {
      totalErrors,
      counts,
      percentages: {
        THEORY: totalErrors > 0 ? Math.round((counts.THEORY / totalErrors) * 100) : 0,
        ATTENTION: totalErrors > 0 ? Math.round((counts.ATTENTION / totalErrors) * 100) : 0,
        CALCULATION: totalErrors > 0 ? Math.round((counts.CALCULATION / totalErrors) * 100) : 0,
        TIME: totalErrors > 0 ? Math.round((counts.TIME / totalErrors) * 100) : 0,
      },
    };
  };

  const errorStats = useMemo(() => computeStatsForQuestions(scopedQuestions), [scopedQuestions]);
  const globalStats = useMemo(() => computeStatsForQuestions(questions), [questions]);

  const dominantCategory = useMemo(() => {
    let topCat: ErrorReason = 'ATTENTION';
    let max = -1;
    (Object.keys(errorStats.counts) as ErrorReason[]).forEach((cat) => {
      if (errorStats.counts[cat] > max) {
        max = errorStats.counts[cat];
        topCat = cat;
      }
    });
    return topCat;
  }, [errorStats]);

  const activeScopeTitle = useMemo(() => {
    const parts: string[] = [];
    if (selectedSubject !== 'ALL') parts.push(selectedSubject);
    if (selectedMaterial !== 'ALL') {
      const mat = materials.find((m) => m.id === selectedMaterial);
      if (mat) parts.push(mat.title.split('—')[0].trim());
    }
    if (selectedChapter !== 'ALL') {
      const ch = chapters.find((c) => c.id === selectedChapter);
      if (ch) parts.push(`Ch ${ch.number}`);
    }
    if (selectedTag !== 'ALL') parts.push(selectedTag);

    if (parts.length === 0) return 'Entire Error Vault';
    return parts.join(' · ');
  }, [selectedSubject, selectedMaterial, selectedChapter, selectedTag, materials, chapters]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedGoal('ALL');
    setSelectedSubject('ALL');
    setSelectedMaterial('ALL');
    setSelectedChapter('ALL');
    setSelectedErrorCategory('ALL');
    setSelectedStage('ALL');
    setSelectedTag('ALL');
  };

  const hasActiveFilters =
    selectedGoal !== 'ALL' ||
    selectedSubject !== 'ALL' ||
    selectedMaterial !== 'ALL' ||
    selectedChapter !== 'ALL' ||
    selectedErrorCategory !== 'ALL' ||
    selectedStage !== 'ALL' ||
    selectedTag !== 'ALL' ||
    searchTerm.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
            Error Log & Cognitive Analytics
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
            Diagnostic breakdown of conceptual gaps, careless traps, and execution slips across any subject
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="cursor-pointer px-3 py-1.5 text-xs font-semibold text-slate-800 hover:text-slate-950 bg-white hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs">
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
            <input type="file" accept=".json" onChange={onImportData} className="hidden" />
          </label>

          <button
            onClick={handleExportAnki}
            className="px-3 py-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 dark:text-blue-300 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            title="Export error bank formatted for Anki flashcards (.tsv file)"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Export Anki (.tsv)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            title="Export error bank to CSV for Excel, Google Sheets, or Notion"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onExportData}
            className="px-3 py-1.5 text-xs font-semibold text-slate-800 hover:text-slate-950 bg-white hover:bg-slate-100 dark:text-slate-300 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            title="Download full JSON state backup"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup</span>
          </button>
        </div>
      </div>

      {/* DYNAMIC SUBJECT & FILTER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-100 dark:bg-[#0b1220] rounded-xl border border-slate-300 dark:border-slate-800/80">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 px-2 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Subject:
          </span>

          <button
            onClick={() => {
              setSelectedSubject('ALL');
              setSelectedMaterial('ALL');
              setSelectedChapter('ALL');
              setShowOnlyLeeches(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedSubject === 'ALL' && !showOnlyLeeches
                ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-xs border border-blue-300 dark:border-blue-700'
                : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 hover:bg-white/60'
            }`}
          >
            <span>🌐 All Subjects</span>
            <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700/70 text-slate-800 dark:text-slate-200">
              {globalStats.totalErrors}
            </span>
          </button>

          {/* DYNAMIC USER-DEFINED SUBJECT BUTTONS */}
          {distinctSubjects.map((subj) => {
            const isSelected = selectedSubject === subj && !showOnlyLeeches;
            const style = getSubjectStyle(subj);
            const subjQuestions = questions.filter(
              (q) => getQuestionResolvedSubject(q, materials, chapters) === subj
            );
            const subjStats = computeStatsForQuestions(subjQuestions);

            return (
              <button
                key={subj}
                onClick={() => {
                  setSelectedSubject(subj);
                  setSelectedMaterial('ALL');
                  setSelectedChapter('ALL');
                  setShowOnlyLeeches(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? `${style.accentBar} text-white shadow-xs`
                    : `text-slate-700 dark:text-slate-300 hover:${style.bg}`
                }`}
              >
                <span>{subj}</span>
                <span
                  className={`font-mono text-[11px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-black/30 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {subjStats.totalErrors}
                </span>
              </button>
            );
          })}

          {/* Chronic Leeches Filter Button */}
          <button
            onClick={() => setShowOnlyLeeches(!showOnlyLeeches)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              showOnlyLeeches
                ? 'bg-amber-500 text-white shadow-xs border border-amber-600'
                : 'text-amber-800 dark:text-amber-300 hover:bg-amber-100/70'
            }`}
            title="Filter view exclusively to questions missed 2 or more times"
          >
            <span>⚠️ Leeches (2+ Misses)</span>
            <span
              className={`font-mono text-[11px] px-1.5 py-0.2 rounded-full ${
                showOnlyLeeches ? 'bg-amber-700 text-white' : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200'
              }`}
            >
              {chronicLeechCount}
            </span>
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 self-end sm:self-auto bg-slate-200/80 dark:bg-slate-900 p-1 rounded-lg">
          <button
            onClick={() => setAnalyticsTab('DISTRIBUTION')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
              analyticsTab === 'DISTRIBUTION'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Scope Analysis</span>
          </button>

          <button
            onClick={() => setAnalyticsTab('COMPARISON')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
              analyticsTab === 'COMPARISON'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Compare Subjects</span>
          </button>
        </div>
      </div>

      {/* SUB-TAGS FILTER PILLS (IF PRESENT) */}
      {distinctTags.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 font-bold flex items-center gap-1 shrink-0">
            <Tag className="w-3 h-3 text-blue-500" />
            Tags:
          </span>
          <button
            onClick={() => setSelectedTag('ALL')}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${
              selectedTag === 'ALL'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            All Tags
          </button>
          {distinctTags.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTag(selectedTag === t ? 'ALL' : t)}
              className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${
                selectedTag === t
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* SECTION 1: ERROR TAXONOMY ANALYTICS */}
      {analyticsTab === 'DISTRIBUTION' ? (
        <section className="bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Error Taxonomy & Diagnostic Breakdown</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 font-bold">
                    {errorStats.totalErrors} errors logged
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Active Scope: <strong className="text-slate-800 dark:text-slate-200 font-bold">{activeScopeTitle}</strong>
                </p>
              </div>
            </div>

            {selectedErrorCategory !== 'ALL' && (
              <button
                onClick={() => setSelectedErrorCategory('ALL')}
                className="px-2 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded border border-rose-200 dark:border-rose-900 transition-colors"
              >
                Clear ({ERROR_CATEGORY_DETAILS[selectedErrorCategory as ErrorReason]?.label}) ×
              </button>
            )}
          </div>

          {errorStats.totalErrors === 0 ? (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs space-y-2">
              <p className="font-bold text-slate-700 dark:text-slate-300">
                No error questions match the current scope ({activeScopeTitle}).
              </p>
              <button
                onClick={handleClearFilters}
                className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                Clear Scope Filters to View All Errors
              </button>
            </div>
          ) : (
            <>
              {/* Stacked Proportional Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-4 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden flex p-0.5 border border-slate-300 dark:border-slate-800">
                  {errorStats.percentages.ATTENTION > 0 && (
                    <div
                      className="bg-rose-500 h-full rounded-l-full transition-all duration-300"
                      style={{ width: `${errorStats.percentages.ATTENTION}%` }}
                      title={`Attention: ${errorStats.percentages.ATTENTION}%`}
                    />
                  )}
                  {errorStats.percentages.THEORY > 0 && (
                    <div
                      className="bg-amber-500 h-full transition-all duration-300"
                      style={{ width: `${errorStats.percentages.THEORY}%` }}
                      title={`Theory: ${errorStats.percentages.THEORY}%`}
                    />
                  )}
                  {errorStats.percentages.CALCULATION > 0 && (
                    <div
                      className="bg-sky-500 h-full transition-all duration-300"
                      style={{ width: `${errorStats.percentages.CALCULATION}%` }}
                      title={`Calculation: ${errorStats.percentages.CALCULATION}%`}
                    />
                  )}
                  {errorStats.percentages.TIME > 0 && (
                    <div
                      className="bg-blue-600 h-full rounded-r-full transition-all duration-300"
                      style={{ width: `${errorStats.percentages.TIME}%` }}
                      title={`Time: ${errorStats.percentages.TIME}%`}
                    />
                  )}
                </div>
              </div>

              {/* Category Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(Object.keys(ERROR_CATEGORY_DETAILS) as ErrorReason[]).map((cat) => {
                  const details = ERROR_CATEGORY_DETAILS[cat];
                  const count = errorStats.counts[cat];
                  const pct = errorStats.percentages[cat];
                  const isDominant = dominantCategory === cat && errorStats.totalErrors > 0;
                  const isFiltered = selectedErrorCategory === cat;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() =>
                        setSelectedErrorCategory(selectedErrorCategory === cat ? 'ALL' : cat)
                      }
                      className={`p-4 rounded-xl border text-left transition-all relative ${
                        isFiltered
                          ? 'ring-2 ring-blue-600 dark:ring-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-500'
                          : isDominant
                          ? 'bg-blue-50/60 dark:bg-[#0f1d38] border-2 border-blue-500/80'
                          : 'bg-slate-50 dark:bg-slate-950/60 border-slate-300 dark:border-slate-800 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs pb-1">
                        <span className={`font-black text-sm ${details.color}`}>
                          {details.label}
                        </span>
                        <span className="font-mono text-xs text-slate-950 dark:text-white font-black tabular-nums">
                          {pct}%
                        </span>
                      </div>
                      <div className="text-2xl font-black font-mono text-slate-950 dark:text-white mt-1 tabular-nums">
                        {count} <span className="text-xs font-bold text-slate-700 dark:text-slate-300">errors</span>
                      </div>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2 line-clamp-2">
                        {details.description}
                      </div>

                      {isDominant && (
                        <div className="mt-2.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          Primary Vulnerability
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Actionable Cognitive Prescription */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800/40 rounded-xl flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5 stroke-[2.5]" />
                <div>
                  <div className="text-xs sm:text-sm font-black text-blue-950 dark:text-blue-200">
                    Recommended Cognitive Directive (Root Cause: {ERROR_CATEGORY_DETAILS[dominantCategory].label})
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {ERROR_CATEGORY_DETAILS[dominantCategory].remediationTip}
                  </p>
                </div>
              </div>
            </>
          )}
        </section>
      ) : (
        /* SECTION 2: DYNAMIC SUBJECT COMPARISON */
        <section className="bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Comparative Analysis Across All Registered Subjects
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Side-by-side contrast of cognitive error patterns between every domain in your curriculum
                </p>
              </div>
            </div>

            <button
              onClick={() => setAnalyticsTab('DISTRIBUTION')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>Back to Scope View</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* DYNAMIC SUBJECT COMPARISON GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {distinctSubjects.map((subj) => {
              const subjQuestions = questions.filter(
                (q) => getQuestionResolvedSubject(q, materials, chapters) === subj
              );
              const subjStats = computeStatsForQuestions(subjQuestions);
              const style = getSubjectStyle(subj);

              return (
                <div
                  key={subj}
                  className={`p-5 rounded-2xl border ${style.border} ${style.bg} space-y-4 flex flex-col justify-between`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {subj}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {subjQuestions.length} recorded items
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-lg font-black text-slate-900 dark:text-white">
                          {subjStats.totalErrors}
                        </span>
                        <span className="text-xs text-slate-500 ml-1">errors</span>
                      </div>
                    </div>

                    {/* Proportional Mini Bar */}
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden flex border border-slate-200 dark:border-slate-800">
                      {subjStats.percentages.ATTENTION > 0 && (
                        <div
                          className="bg-rose-500 h-full"
                          style={{ width: `${subjStats.percentages.ATTENTION}%` }}
                          title={`Attention: ${subjStats.percentages.ATTENTION}%`}
                        />
                      )}
                      {subjStats.percentages.THEORY > 0 && (
                        <div
                          className="bg-amber-500 h-full"
                          style={{ width: `${subjStats.percentages.THEORY}%` }}
                          title={`Theory: ${subjStats.percentages.THEORY}%`}
                        />
                      )}
                      {subjStats.percentages.CALCULATION > 0 && (
                        <div
                          className="bg-sky-500 h-full"
                          style={{ width: `${subjStats.percentages.CALCULATION}%` }}
                          title={`Calculation: ${subjStats.percentages.CALCULATION}%`}
                        />
                      )}
                      {subjStats.percentages.TIME > 0 && (
                        <div
                          className="bg-blue-600 h-full"
                          style={{ width: `${subjStats.percentages.TIME}%` }}
                          title={`Time: ${subjStats.percentages.TIME}%`}
                        />
                      )}
                    </div>

                    {/* Taxonomy stats */}
                    <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                      <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                        <div className="text-rose-600 text-[10px] font-bold">Attn</div>
                        <div className="font-mono font-black text-slate-900 dark:text-white text-xs mt-0.5">
                          {subjStats.percentages.ATTENTION}%
                        </div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                        <div className="text-amber-600 text-[10px] font-bold">Theory</div>
                        <div className="font-mono font-black text-slate-900 dark:text-white text-xs mt-0.5">
                          {subjStats.percentages.THEORY}%
                        </div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                        <div className="text-sky-600 text-[10px] font-bold">Calc</div>
                        <div className="font-mono font-black text-slate-900 dark:text-white text-xs mt-0.5">
                          {subjStats.percentages.CALCULATION}%
                        </div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                        <div className="text-blue-600 text-[10px] font-bold">Time</div>
                        <div className="font-mono font-black text-slate-900 dark:text-white text-xs mt-0.5">
                          {subjStats.percentages.TIME}%
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedSubject(subj);
                      setSelectedMaterial('ALL');
                      setSelectedChapter('ALL');
                      setAnalyticsTab('DISTRIBUTION');
                    }}
                    className="w-full py-1.5 text-xs font-bold bg-white dark:bg-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5 mt-2"
                  >
                    <span>Filter to {subj}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* QUESTION INVENTORY & LOG TABLE */}
      <section className="bg-white dark:bg-[#0d1627] border border-slate-300 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Question Inventory & SRS Trajectory</span>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                {filteredQuestions.length} of {questions.length} questions
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Filterable inventory of practiced questions, cognitive taxonomy tags, and spaced review schedules
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenQuickLog}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Log Question / Error</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-2">
          {/* Goal Filter */}
          {allGoals.length > 1 && (
            <select
              value={selectedGoal}
              onChange={(e) => {
                setSelectedGoal(e.target.value);
                setSelectedMaterial('ALL');
                setSelectedChapter('ALL');
              }}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 focus:outline-none focus:border-blue-600 transition-colors"
            >
              <option value="ALL">🎯 All Goals</option>
              {allGoals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          )}

          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ref, notes, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-600 transition-colors"
            />
          </div>

          {/* Book / Material Filter */}
          <select
            value={selectedMaterial}
            onChange={(e) => {
              setSelectedMaterial(e.target.value);
              setSelectedChapter('ALL');
            }}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-600 transition-colors"
          >
            <option value="ALL">📚 All Books ({availableMaterials.length})</option>
            {availableMaterials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>

          {/* Chapter Filter */}
          <div className="relative">
            <select
              value={selectedChapter}
              disabled={selectedMaterial === 'ALL'}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none transition-colors ${
                selectedMaterial === 'ALL'
                  ? 'bg-slate-100 dark:bg-slate-950/70 border-slate-300 dark:border-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus:border-blue-600'
              }`}
            >
              {selectedMaterial === 'ALL' ? (
                <option value="ALL">Select a resource to filter chapters</option>
              ) : (
                <>
                  <option value="ALL">
                    All Units — {availableMaterials.find((m) => m.id === selectedMaterial)?.title.split('—')[0].trim() || 'Resource'}
                  </option>
                  {availableMaterials
                    .find((m) => m.id === selectedMaterial)
                    ?.chapters.map((c) => (
                      <option key={c.id} value={c.id}>
                        Unit {c.number}: {c.title}
                      </option>
                    ))}
                </>
              )}
            </select>
          </div>

          {/* Error Taxonomy Filter */}
          <select
            value={selectedErrorCategory}
            onChange={(e) => setSelectedErrorCategory(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-600 transition-colors"
          >
            <option value="ALL">All Error Taxonomies</option>
            <option value="THEORY">Theoretical Gap (Theory)</option>
            <option value="ATTENTION">Carelessness / Misread (Attention)</option>
            <option value="CALCULATION">Calculation / Execution Slip</option>
            <option value="TIME">Time Management / Guess</option>
          </select>

          {/* SRS Stage Filter */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-600 transition-colors"
          >
            <option value="ALL">All SRS Stages</option>
            <option value="SAME_DAY">Same-Day Remediation Pool</option>
            <option value="INTERVAL_3">D+3 Intensive Spacing</option>
            <option value="INTERVAL_7">D+7 Graduated Check</option>
            <option value="GRADUATED">Mastered / Graduated</option>
          </select>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Question Reference</th>
                <th className="py-3.5 px-4">Subject & Unit</th>
                <th className="py-3.5 px-4">Error Taxonomy</th>
                <th className="py-3.5 px-4">SRS Stage</th>
                <th className="py-3.5 px-4">Next Review</th>
                <th className="py-3.5 px-4 text-right">Priority</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-900/40">
              {filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center">
                    <div className="space-y-3 max-w-md mx-auto">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {questions.length === 0
                          ? 'No questions recorded in the database.'
                          : `No questions match the current filters (${questions.length} total in vault).`}
                      </p>
                      {questions.length === 0 ? (
                        <button
                          onClick={onOpenQuickLog}
                          className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Log Your First Question / Error</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleClearFilters}
                          className="px-4 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-lg border border-blue-300 dark:border-blue-800 transition-colors"
                        >
                          Clear all filters ({questions.length} questions)
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredQuestions.map((q) => {
                  const ch = chapters.find((c) => c.id === q.chapterId);
                  const mat = materials.find((m) => m.id === q.materialId);
                  const subjName = getQuestionResolvedSubject(q, materials, chapters);
                  const subjStyle = getSubjectStyle(subjName);
                  const errorReason = getQuestionErrorReason(q);
                  const errorTaxonomy = errorReason ? ERROR_CATEGORY_DETAILS[errorReason] : null;

                  const priorityInfo = calculatePriorityScore(q, todayStr);
                  const isOverdue = priorityInfo.overdueDays > 0;
                  const dateStr = q.createdAt ? q.createdAt.slice(0, 10) : '—';

                  return (
                    <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap text-xs font-semibold">
                        {dateStr}
                      </td>

                      {/* Ref & Tags */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-950 dark:text-white font-mono text-xs">
                            {q.sourceRef}
                          </span>
                          {q.topicWeight && q.topicWeight >= 4 && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-1 rounded border border-amber-300">
                              {q.topicWeight}★ High-Yield
                            </span>
                          )}
                          {isLeechQuestion(q) && (
                            <span
                              className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300"
                              title={`Missed ${q.attempts.filter((a) => a.status === 'INCORRECT').length} times`}
                            >
                              ⚠️ Leech
                            </span>
                          )}
                        </div>

                        {/* Sub-tags */}
                        {q.subTags && q.subTags.length > 0 && (
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            {q.subTags.map((t, idx) => (
                              <span key={idx} className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        {q.notes && (
                          <div className="text-xs font-medium text-slate-600 dark:text-slate-300 line-clamp-1 max-w-xs mt-0.5">
                            {q.notes}
                          </div>
                        )}
                      </td>

                      {/* Subject & Book */}
                      <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${subjStyle.bg} ${subjStyle.text} ${subjStyle.border}`}
                          >
                            {subjName}
                          </span>
                          {mat && (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                              {mat.title.split('—')[0].trim()}
                            </span>
                          )}
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {ch ? `Unit ${ch.number}` : 'Unit -'}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate max-w-[160px] mt-0.5">
                          {ch?.title}
                        </div>
                      </td>

                      {/* Error Taxonomy */}
                      <td className="py-3.5 px-4">
                        {errorTaxonomy ? (
                          <span
                            className={`px-2.5 py-1 rounded text-xs font-bold ${errorTaxonomy.bg} ${errorTaxonomy.color} border ${errorTaxonomy.border}`}
                          >
                            {errorTaxonomy.label}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-500">None</span>
                        )}
                      </td>

                      {/* Stage */}
                      <td className="py-3.5 px-4">
                        {q.srsItem.isSameDayPending ? (
                          <span className="font-mono text-rose-700 dark:text-rose-300 font-bold text-xs">
                            Same-Day Remediation
                          </span>
                        ) : q.srsItem.stage === 'INTERVAL_3' ? (
                          <span className="font-mono text-blue-700 dark:text-blue-300 font-bold text-xs">
                            D+3 Intensive
                          </span>
                        ) : q.srsItem.stage === 'INTERVAL_7' ? (
                          <span className="font-mono text-sky-700 dark:text-sky-300 font-bold text-xs">
                            D+7 Spaced
                          </span>
                        ) : (
                          <span className="font-mono text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                            Mastered ✓
                          </span>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 font-mono tabular-nums">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {q.srsItem.dueDate}
                        </div>
                        {isOverdue && (
                          <div className="text-xs text-rose-700 dark:text-rose-400 font-bold">
                            {priorityInfo.overdueDays}d overdue
                          </div>
                        )}
                      </td>

                      {/* Priority Score */}
                      <td className="py-3.5 px-4 text-right font-mono font-black tabular-nums">
                        <span
                          className={`text-sm ${
                            priorityInfo.priorityScore >= 75
                              ? 'text-rose-700 dark:text-rose-400'
                              : priorityInfo.priorityScore >= 50
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {priorityInfo.priorityScore}
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold"> / 100</span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onDeleteQuestion(q.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-700 dark:hover:text-rose-400 transition-colors"
                          title="Delete question from error vault"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
