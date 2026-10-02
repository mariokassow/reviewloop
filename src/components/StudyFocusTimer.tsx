import React, { useEffect, useRef, useState } from 'react';
import { Check, Clock, Pause, Play, RotateCcw, Sparkles, X } from 'lucide-react';

export const StudyFocusTimer: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [mode, setMode] = useState<'POMODORO_25' | 'DEEP_50' | 'STOPWATCH' | 'CUSTOM'>('POMODORO_25');
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [customMinutes, setCustomMinutes] = useState<number>(15);
  const [stopwatchSeconds, setStopwatchSeconds] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Switch preset mode
  const handleSelectMode = (newMode: 'POMODORO_25' | 'DEEP_50' | 'STOPWATCH' | 'CUSTOM') => {
    setMode(newMode);
    setIsActive(false);
    setIsFinished(false);
    if (newMode === 'POMODORO_25') {
      setSecondsLeft(25 * 60);
    } else if (newMode === 'DEEP_50') {
      setSecondsLeft(50 * 60);
    } else if (newMode === 'CUSTOM') {
      setSecondsLeft((customMinutes || 15) * 60);
    } else {
      setStopwatchSeconds(0);
    }
  };

  const handleReset = () => {
    setIsActive(false);
    setIsFinished(false);
    if (mode === 'POMODORO_25') {
      setSecondsLeft(25 * 60);
    } else if (mode === 'DEEP_50') {
      setSecondsLeft(50 * 60);
    } else if (mode === 'CUSTOM') {
      setSecondsLeft((customMinutes || 15) * 60);
    } else {
      setStopwatchSeconds(0);
    }
  };

  // Timer tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive) {
      interval = setInterval(() => {
        if (mode === 'STOPWATCH') {
          setStopwatchSeconds((prev) => prev + 1);
        } else {
          setSecondsLeft((prev) => {
            if (prev <= 1) {
              setIsActive(false);
              setIsFinished(true);
              try {
                const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
                osc.start();
                osc.stop(ctx.currentTime + 1.2);
              } catch {
                // Ignore audio restriction if browser requires interaction
              }
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, mode]);

  // Format mm:ss or hh:mm:ss
  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const displayTime = mode === 'STOPWATCH' ? formatTime(stopwatchSeconds) : formatTime(secondsLeft);
  const isTimerInUse = isActive || (mode === 'STOPWATCH' ? stopwatchSeconds > 0 : (mode === 'POMODORO_25' ? secondsLeft < 25 * 60 : (mode === 'DEEP_50' ? secondsLeft < 50 * 60 : secondsLeft < customMinutes * 60)));

  return (
    <div className="relative" ref={containerRef}>
      {/* If timer is not in use, show minimal clock button */}
      {!isTimerInUse ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 ${
            isOpen
              ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-xs'
              : 'bg-white dark:bg-[#0d1627] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-2xs'
          }`}
          title="Open Focus Timer & Stopwatch"
          aria-label="Open Focus Timer & Stopwatch"
        >
          <Clock className="w-4 h-4 stroke-[2.2]" />
        </button>
      ) : (
        /* If timer is active or running, show clean dynamic tab */
        <div className="flex items-center gap-1.5 bg-blue-50/90 dark:bg-[#0d1627] border border-blue-300 dark:border-blue-800 rounded-xl px-2.5 py-1 shadow-xs transition-all animate-in fade-in duration-150">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 text-xs focus:outline-none"
            title="Configure Focus Timer"
          >
            <Clock className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${isActive ? 'animate-pulse' : ''}`} />
            <span className="font-mono text-xs sm:text-sm font-black text-blue-950 dark:text-blue-200 tabular-nums">
              {displayTime}
            </span>
          </button>

          {/* Quick Play/Pause */}
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`p-1 rounded-md text-xs font-bold transition-colors ${
              isActive
                ? 'bg-amber-200/80 dark:bg-amber-950 text-amber-800 dark:text-amber-300 hover:bg-amber-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            title={isActive ? 'Pause' : 'Resume'}
          >
            {isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
          </button>
        </div>
      )}

      {/* FLOATING OPTIONS DROPDOWN */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Study Focus Timer
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-3 gap-1.5 pt-3 pb-3">
            <button
              type="button"
              onClick={() => handleSelectMode('POMODORO_25')}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                mode === 'POMODORO_25'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              25m Pomodoro
            </button>
            <button
              type="button"
              onClick={() => handleSelectMode('DEEP_50')}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                mode === 'DEEP_50'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              50m Deep
            </button>
            <button
              type="button"
              onClick={() => handleSelectMode('STOPWATCH')}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                mode === 'STOPWATCH'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Count
            </button>
          </div>

          {/* Big Time Display */}
          <div className="py-3 text-center bg-slate-50 dark:bg-slate-900/70 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <span className="font-mono text-3xl font-black text-slate-950 dark:text-white tabular-nums tracking-tight">
              {displayTime}
            </span>
            {isFinished && (
              <div className="mt-1 flex items-center justify-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-bounce">
                <Sparkles className="w-3.5 h-3.5" /> Session Complete!
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                isActive
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isActive ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Focus</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 transition-colors"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
