import React, { useEffect, useState } from 'react';
import { Check, Edit3, Plus, Trash2, X } from 'lucide-react';
import { Chapter, Material } from '../types';

interface ManageChaptersModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material;
  onSaveChapters: (updatedChapters: Chapter[]) => void;
}

export const ManageChaptersModal: React.FC<ManageChaptersModalProps> = ({
  isOpen,
  onClose,
  material,
  onSaveChapters,
}) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    if (isOpen) {
      setChapters(JSON.parse(JSON.stringify(material.chapters)));
    }
  }, [isOpen, material]);

  if (!isOpen) return null;

  const handleUpdateChapter = (id: string, field: 'title' | 'topic' | 'number', val: string | number) => {
    setChapters((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          [field]: val,
        };
      })
    );
  };

  const handleAddChapter = () => {
    const nextNumber = chapters.length > 0 ? Math.max(...chapters.map((c) => c.number)) + 1 : 1;
    const newChapter: Chapter = {
      id: `ch-${material.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      materialId: material.id,
      number: nextNumber,
      title: `Chapter ${nextNumber}: New Topic`,
      topic: '',
      isCompleted: false,
    };
    setChapters((prev) => [...prev, newChapter]);
  };

  const handleDeleteChapter = (id: string) => {
    if (chapters.length <= 1) {
      alert('The book must contain at least one chapter.');
      return;
    }
    setChapters((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveChapters(chapters);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0d1627] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-700 dark:text-blue-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-950 dark:text-white tracking-tight">
                Manage and Rename Chapters
              </h2>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {material.title} ({chapters.length} chapters)
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

        {/* Chapters List Form */}
        <form onSubmit={handleSave} className="p-6 space-y-3 overflow-y-auto flex-1">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              Chapter and Topic List
            </span>
            <button
              type="button"
              onClick={handleAddChapter}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Chapter</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {chapters.map((ch, idx) => (
              <div
                key={ch.id}
                className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 transition-colors"
              >
                {/* Number */}
                <div className="w-16 shrink-0">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 sm:hidden">No.</label>
                  <input
                    type="number"
                    min="1"
                    value={ch.number}
                    onChange={(e) =>
                      handleUpdateChapter(ch.id, 'number', parseInt(e.target.value) || idx + 1)
                    }
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono font-black text-center text-blue-700 dark:text-blue-400 focus:outline-none focus:border-blue-600"
                    title="Chapter Number"
                  />
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 sm:hidden">Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Chapter Title"
                    value={ch.title}
                    onChange={(e) => handleUpdateChapter(ch.id, 'title', e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Topic / Domain */}
                <div className="w-full sm:w-44 shrink-0">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 sm:hidden">Topic / Domain</label>
                  <input
                    type="text"
                    placeholder="Topic (e.g. Algebra)"
                    value={ch.topic || ''}
                    onChange={(e) => handleUpdateChapter(ch.id, 'topic', e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Delete Chapter Button */}
                <div className="flex justify-end sm:justify-center">
                  <button
                    type="button"
                    onClick={() => handleDeleteChapter(ch.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                    title="Delete this chapter"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleAddChapter}
              className="px-3.5 py-2 text-xs font-bold text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-700/60 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Chapter</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
