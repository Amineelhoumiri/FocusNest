// src/pages/Sessions.tsx
// Zen focus session — breath-first, screen-minimal, intention-led.

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Square, Loader2, X, Zap, Leaf } from "lucide-react";
import confetti from "canvas-confetti";
import { useFocusScore } from "@/context/FocusScoreContext";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const moods = [
  { emoji: "😴", label: "Exhausted" },
  { emoji: "😐", label: "Meh" },
  { emoji: "🙂", label: "Okay" },
  { emoji: "😊", label: "Good" },
  { emoji: "⚡", label: "Wired" },
];

const reflections = [
  { emoji: "😵", label: "Distraction", value: "Distraction" },
  { emoji: "😴", label: "Low Energy",  value: "Low Energy"  },
  { emoji: "⚡", label: "External",    value: "External"    },
];

const timerOptions = [
  { label: "5",  sublabel: "micro",    value: 5  * 60 },
  { label: "25", sublabel: "pomodoro", value: 25 * 60 },
  { label: "45", sublabel: "deep",     value: 45 * 60 },
  { label: "60", sublabel: "flow",     value: 60 * 60 },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  task_id: string;
  task_name: string;
  energy_level: string;
  task_status: string;
}

// ─── Timer ring constants ─────────────────────────────────────────────────────

const R    = 110;
const CIRC = 2 * Math.PI * R;

// ─── Sessions Component ───────────────────────────────────────────────────────

const Sessions = () => {
  const [phase, setPhase] = useState<"idle" | "mood" | "running" | "paused" | "complete" | "reflect">("idle");
  const [selectedDuration, setSelectedDuration] = useState(timerOptions[0].value);
  const [seconds, setSeconds] = useState(timerOptions[0].value);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [lowEnergyTasks, setLowEnergyTasks] = useState<Task[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoadingTask, setIsLoadingTask] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isPromoting, setIsPromoting] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { addScore, refreshScore } = useFocusScore();

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch("/api/tasks", { credentials: "include" });
        if (!res.ok) throw new Error();
        const data: Task[] = await res.json();

        // ── Bug fix: case-insensitive match so "doing" / "Doing" both work ──
        const doing = data.find((t) => t.task_status?.toLowerCase() === "doing") || null;
        setActiveTask(doing);

        // Tasks the user can pick to start focusing on (non-Done, non-Doing)
        setAvailableTasks(
          data.filter(
            (t) =>
              t.task_status?.toLowerCase() !== "done" &&
              t.task_status?.toLowerCase() !== "doing"
          )
        );

        setLowEnergyTasks(
          data.filter(
            (t) =>
              t.energy_level?.toLowerCase() === "low" &&
              t.task_status?.toLowerCase() !== "done" &&
              t.task_id !== doing?.task_id
          )
        );
      } catch {
        toast.error("Failed to load tasks");
      } finally {
        setIsLoadingTask(false);
      }
    };

    fetchTasks();

    if (localStorage.getItem("stuckMode") === "true") {
      localStorage.removeItem("stuckMode");
      setPhase("reflect");
    }
  }, []);

  // Promote a task from Backlog/Ready → Doing so the user can focus on it
  const pickTask = async (task: Task) => {
    setIsPromoting(task.task_id);
    try {
      const res = await fetch(`/api/tasks/${task.task_id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_status: "Doing" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Could not set task as active");
      }
      const updated: Task = await res.json();
      setActiveTask(updated);
      setAvailableTasks((prev) => prev.filter((t) => t.task_id !== task.task_id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move task to Doing");
    } finally {
      setIsPromoting(null);
    }
  };

  const startSession = () => {
    if (!activeTask) {
      toast.error("Pick a task to focus on first.");
      return;
    }
    setPhase("mood");
  };

  const onMoodSelect = async (emoji: string) => {
    setSelectedMood(emoji);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: activeTask!.task_id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to start session");
      }
      const data = await res.json();
      setSessionId(data.session_id);
      setTimeout(() => {
        setSeconds(selectedDuration);
        setPhase("running");
      }, 500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start session");
      setPhase("idle");
    }
  };

  const tick = useCallback(() => {
    setSeconds((s) => {
      if (s <= 1) {
        setPhase("complete");
        confetti({ particleCount: 60, spread: 55, colors: ["#7C3AED", "#A78BFA", "#06B6D4", "#10B981", "#6EE7B7"], gravity: 0.6 });
        addScore(5);
        return 0;
      }
      return s - 1;
    });
  }, [addScore]);

  useEffect(() => {
    if (phase === "running") {
      intervalRef.current = setInterval(tick, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase, tick]);

  const endSession = async (reflectionType: string, outcome = "") => {
    if (!sessionId) { setPhase("idle"); return; }
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reflection_type: reflectionType, outcome }),
      });
      refreshScore();
    } catch {
      toast.error("Failed to save session");
    } finally {
      setSessionId(null);
      setSeconds(selectedDuration);
      setPhase("idle");
    }
  };

  const handleSwitch = async (targetTaskId: string) => {
    if (!sessionId) return;
    setIsSwitching(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/switch`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_task_id: targetTaskId }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      const data = await res.json();
      const switched = lowEnergyTasks.find((t) => t.task_id === targetTaskId) || null;
      setActiveTask(switched);
      setSessionId(data.session_id);
      setSeconds(selectedDuration);
      setPhase("running");
      toast.success("Switched to a lighter task.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to switch task");
    } finally {
      setIsSwitching(false);
    }
  };

  // Timer math
  const progress  = 1 - seconds / selectedDuration;
  const mins      = Math.floor(seconds / 60);
  const secs      = seconds % 60;
  const finishTime = new Date();
  finishTime.setSeconds(finishTime.getSeconds() + seconds);
  const finishStr = finishTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const isImmersive = phase === "running" || phase === "paused";

  const zenFade  = { duration: 0.5,  ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };
  const zenScale = { duration: 0.42, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };

  const statusLabel = (s: string) => {
    const l = s?.toLowerCase();
    if (l === "ready")   return "To Do";
    if (l === "backlog") return "Backlog";
    if (l === "doing")   return "Doing";
    return s;
  };

  const energyIsHigh = (e: string) => e?.toLowerCase() === "high";

  return (
    <>
      {/* ── Immersive timer overlay ────────────────────────────────────────── */}
      <AnimatePresence>
        {isImmersive && (
          <motion.div
            key="immersive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "hsl(var(--background))" }}
          >
            {/* Ambient breath glow */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={phase === "running"
                ? { opacity: [0, 0.07, 0] }
                : { opacity: 0 }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
              style={{
                background: "radial-gradient(ellipse 55% 50% at 50% 55%, hsl(var(--primary)) 0%, transparent 70%)",
              }}
            />

            {/* Dismiss / stop */}
            <button
              onClick={() => setPhase("reflect")}
              className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center
                text-muted-foreground/40 hover:text-muted-foreground/70
                border border-border/25 hover:border-border/50
                transition-all duration-300"
            >
              <X className="w-4 h-4" />
            </button>

            <motion.div
              key="timer-content"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
              className="text-center flex flex-col items-center select-none"
            >
              {/* Task label */}
              <p className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground/55 mb-1">
                {phase === "paused" ? "paused" : "focusing on"}
              </p>
              <p className="text-base font-light text-foreground/80 mb-12 max-w-[300px] truncate px-6">
                {activeTask?.task_name || "focus"}
              </p>

              {/* Timer ring */}
              <div className="relative mb-12" style={{ width: 280, height: 280 }}>
                {/* Soft glow behind the ring */}
                <motion.div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  animate={phase === "running"
                    ? { opacity: [0.4, 0.75, 0.4] }
                    : { opacity: 0.3 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  style={{ boxShadow: "0 0 48px hsl(var(--primary) / 0.18), 0 0 96px hsl(var(--primary) / 0.08)" }}
                />

                <svg width={280} height={280} style={{ transform: "rotate(-90deg)" }}>
                  {/* Track ring */}
                  <circle
                    cx={140} cy={140} r={R}
                    fill="none"
                    stroke="hsl(var(--muted-foreground) / 0.14)"
                    strokeWidth={2}
                  />
                  {/* Progress ring */}
                  <motion.circle
                    cx={140} cy={140} r={R}
                    fill="none"
                    stroke="hsl(var(--primary) / 0.85)"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    animate={{ strokeDashoffset: CIRC * (1 - progress) }}
                    transition={{ duration: 0.85, ease: "linear" }}
                  />
                </svg>

                {/* Time display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <span className="font-mono-timer text-[72px] leading-none text-foreground/90">
                    {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] text-muted-foreground/45 tracking-widest uppercase">
                    done by {finishStr}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setPhase(phase === "running" ? "paused" : "running")}
                  className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-medium transition-all duration-400"
                  style={{
                    background: "hsl(var(--primary) / 0.9)",
                    color: "hsl(var(--primary-foreground))",
                    boxShadow: "0 2px 24px hsl(var(--primary) / 0.3)",
                  }}
                >
                  {phase === "running"
                    ? <><Pause className="w-3.5 h-3.5" /> Pause</>
                    : <><Play  className="w-3.5 h-3.5" /> Resume</>
                  }
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setPhase("reflect")}
                  className="px-5 py-3.5 rounded-2xl text-sm
                    text-muted-foreground/60 hover:text-foreground/75
                    border border-border/35 hover:border-border/55
                    transition-all duration-400"
                >
                  😵 stuck
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setPhase("reflect")}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center
                    text-muted-foreground/45 hover:text-foreground/65
                    border border-border/25 hover:border-border/45
                    transition-all duration-400"
                >
                  <Square className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </motion.div>

            {/* Breathing guide — bottom right */}
            <div className="absolute bottom-8 right-8 flex flex-col items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.32, 1], opacity: [0.25, 0.5, 0.25] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
                className="w-10 h-10 rounded-full"
                style={{
                  background: "hsl(var(--zen-teal) / 0.18)",
                  border: "1px solid hsl(var(--zen-teal) / 0.3)",
                }}
              />
              <motion.p
                animate={{ opacity: [0.25, 0.55, 0.25] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
                className="text-[9px] text-muted-foreground/40 tracking-widest uppercase"
              >
                breathe
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Normal layout ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] px-4">
        <AnimatePresence mode="wait">

          {/* ────────────── IDLE ────────────── */}
          {phase === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={zenFade}
              className="w-full max-w-[420px]"
            >
              {/* Header */}
              <div className="text-center mb-7">
                <h2 className="text-2xl font-light text-foreground/85 mb-1.5 tracking-tight">
                  {activeTask ? "Ready to focus." : "What are you working on?"}
                </h2>
                <p className="text-sm text-muted-foreground/60 tracking-wide">
                  {activeTask
                    ? "Your active task is set — choose a duration."
                    : "Pick a task below to begin your session."}
                </p>
              </div>

              {/* ── Task area ── */}
              {isLoadingTask ? (
                <div className="flex items-center justify-center h-24 mb-7">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/35" />
                </div>

              ) : activeTask ? (
                /* Active task card */
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-7 rounded-2xl p-5"
                  style={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--primary) / 0.25)",
                    boxShadow: "0 0 0 3px hsl(var(--primary) / 0.06), var(--card-shadow)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Pulsing dot */}
                    <div className="mt-[5px] shrink-0 relative">
                      <motion.div
                        className="absolute inset-0 rounded-full bg-primary/40"
                        animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
                      />
                      <div className="w-2 h-2 rounded-full bg-primary/70 relative" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-primary/60 uppercase tracking-[0.14em] mb-1 font-medium">
                        currently doing
                      </p>
                      <p className="text-foreground/85 font-light leading-snug truncate">
                        {activeTask.task_name}
                      </p>
                    </div>

                    <span className={`shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      energyIsHigh(activeTask.energy_level)
                        ? "bg-primary/10 text-primary/75"
                        : "bg-blue-500/10 text-blue-400"
                    }`}>
                      {energyIsHigh(activeTask.energy_level)
                        ? <><Zap className="w-2.5 h-2.5" /> High</>
                        : <><Leaf className="w-2.5 h-2.5" /> Low</>
                      }
                    </span>
                  </div>
                </motion.div>

              ) : availableTasks.length > 0 ? (
                /* Task picker */
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-7 rounded-2xl overflow-hidden"
                  style={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border) / 0.5)",
                    boxShadow: "var(--card-shadow)",
                  }}
                >
                  <div className="px-4 py-2.5 border-b border-border/25">
                    <p className="text-[10px] text-muted-foreground/55 uppercase tracking-[0.15em] font-medium">
                      tap a task to focus on it
                    </p>
                  </div>

                  <div className="divide-y divide-border/20 max-h-[220px] overflow-y-auto">
                    {availableTasks.map((t) => (
                      <motion.button
                        key={t.task_id}
                        whileHover={{ backgroundColor: "hsl(var(--primary) / 0.04)" }}
                        whileTap={{ scale: 0.995 }}
                        onClick={() => pickTask(t)}
                        disabled={isPromoting !== null}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left
                          transition-colors duration-200 disabled:opacity-60"
                      >
                        {/* Energy dot */}
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          energyIsHigh(t.energy_level)
                            ? "bg-primary/55"
                            : "bg-blue-400/55"
                        }`} />

                        <span className="flex-1 text-sm text-foreground/75 font-light truncate">
                          {t.task_name}
                        </span>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] text-muted-foreground/40 uppercase tracking-wide">
                            {statusLabel(t.task_status)}
                          </span>
                          {isPromoting === t.task_id
                            ? <Loader2 className="w-3 h-3 animate-spin text-primary/50" />
                            : <span className="text-muted-foreground/30">→</span>
                          }
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

              ) : (
                /* No tasks */
                <div
                  className="mb-7 rounded-2xl p-6 text-center"
                  style={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border) / 0.45)",
                  }}
                >
                  <p className="text-muted-foreground/60 text-sm leading-relaxed">
                    No tasks yet.{" "}
                    <span className="text-primary/70 font-medium">Create one on the Tasks page</span>{" "}
                    to start a session.
                  </p>
                </div>
              )}

              {/* Duration picker */}
              <div className="flex items-end justify-center gap-2 mb-7">
                {timerOptions.map((opt) => {
                  const active = selectedDuration === opt.value;
                  return (
                    <motion.button
                      key={opt.value}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setSelectedDuration(opt.value); setSeconds(opt.value); }}
                      className="flex flex-col items-center px-4 py-3.5 rounded-2xl transition-all duration-400 min-w-[68px]"
                      style={active ? {
                        background: "hsl(var(--primary) / 0.09)",
                        border: "1px solid hsl(var(--primary) / 0.28)",
                        boxShadow: "0 0 0 2px hsl(var(--primary) / 0.07)",
                      } : {
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border) / 0.5)",
                      }}
                    >
                      <span className={`text-xl font-light leading-none ${
                        active ? "text-primary/85" : "text-foreground/55"
                      }`}>
                        {opt.label}
                      </span>
                      <span className={`text-[9px] tracking-widest uppercase mt-1.5 ${
                        active ? "text-primary/55" : "text-muted-foreground/40"
                      }`}>
                        {opt.sublabel}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Begin button */}
              <motion.button
                whileTap={{ scale: 0.99 }}
                onClick={startSession}
                disabled={!activeTask || isLoadingTask || isPromoting !== null}
                className="w-full py-4 rounded-2xl text-sm font-medium transition-all duration-400 tracking-wide"
                style={activeTask && !isLoadingTask && isPromoting === null ? {
                  background: "hsl(var(--primary) / 0.9)",
                  color: "hsl(var(--primary-foreground))",
                  boxShadow: "0 4px 24px hsl(var(--primary) / 0.28), inset 0 1px 0 hsl(var(--primary-foreground) / 0.1)",
                } : {
                  background: "hsl(var(--muted) / 0.7)",
                  color: "hsl(var(--muted-foreground) / 0.45)",
                  border: "1px solid hsl(var(--border) / 0.3)",
                  cursor: "not-allowed",
                }}
              >
                {isPromoting !== null ? "Setting task…" : "Begin Session"}
              </motion.button>
            </motion.div>
          )}

          {/* ────────────── MOOD ────────────── */}
          {phase === "mood" && (
            <motion.div
              key="mood"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={zenScale}
              className="text-center px-4 max-w-sm w-full"
            >
              <h2 className="text-2xl font-light text-foreground/85 mb-1.5 tracking-tight">
                How are you, really?
              </h2>
              <p className="text-muted-foreground/55 text-sm mb-10 tracking-wide">
                just a quick check-in.
              </p>

              <div className="flex gap-3 justify-center mb-6">
                {moods.map((m) => (
                  <motion.button
                    key={m.emoji}
                    whileHover={{ scale: 1.1, y: -3 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => onMoodSelect(m.emoji)}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className={`w-[58px] h-[58px] rounded-2xl text-[26px] flex items-center justify-center
                      transition-all duration-400 ${
                      selectedMood === m.emoji
                        ? "ring-2 ring-primary/40"
                        : "border border-border/40 hover:border-primary/25"
                    }`}
                    style={selectedMood === m.emoji ? {
                      background: "hsl(var(--primary) / 0.1)",
                      boxShadow: "0 0 16px hsl(var(--primary) / 0.18)",
                    } : {
                      background: "hsl(var(--card))",
                    }}
                    title={m.label}
                  >
                    {m.emoji}
                  </motion.button>
                ))}
              </div>

              <p className="text-[10px] text-muted-foreground/40 tracking-widest uppercase">
                tap to continue
              </p>
            </motion.div>
          )}

          {/* ────────────── COMPLETE ────────────── */}
          {phase === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={zenScale}
              className="text-center px-4 max-w-sm w-full"
            >
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.1 }}
                className="text-5xl mb-8"
              >
                🌿
              </motion.div>

              <h2 className="text-3xl font-light text-foreground/85 mb-2 tracking-tight">
                Session complete.
              </h2>
              <p className="text-primary/65 text-sm mb-10 tracking-wide font-medium">
                +5 focus points earned
              </p>

              <div className="flex gap-3 justify-center">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={async () => {
                    await endSession("External", "Session completed naturally");
                    setSeconds(selectedDuration);
                    setPhase("mood");
                  }}
                  className="px-7 py-3.5 rounded-2xl text-sm font-medium transition-all duration-400"
                  style={{
                    background: "hsl(var(--primary) / 0.9)",
                    color: "hsl(var(--primary-foreground))",
                    boxShadow: "0 2px 20px hsl(var(--primary) / 0.25)",
                  }}
                >
                  Another round
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => endSession("External", "Session completed naturally")}
                  className="px-7 py-3.5 rounded-2xl text-sm
                    border border-border/45 bg-card
                    text-muted-foreground/65 hover:text-foreground/75 hover:border-border/65
                    transition-all duration-400"
                >
                  Rest
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ────────────── REFLECT ────────────── */}
          {phase === "reflect" && (
            <motion.div
              key="reflect"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={zenScale}
              className="text-center max-w-sm w-full px-4"
            >
              <h2 className="text-2xl font-light text-foreground/85 mb-1.5 tracking-tight">
                What interrupted you?
              </h2>
              <p className="text-muted-foreground/55 text-sm mb-8 tracking-wide">
                no judgment. just awareness.
              </p>

              <div className="flex gap-3 justify-center mb-8">
                {reflections.map((r) => (
                  <motion.button
                    key={r.label}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => endSession(r.value)}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center gap-2 px-4 py-4 rounded-2xl
                      border border-border/40 bg-card
                      hover:border-primary/25 hover:bg-primary/[0.03]
                      transition-all duration-400 min-w-[96px]"
                  >
                    <span className="text-2xl">{r.emoji}</span>
                    <span className="text-[10px] text-muted-foreground/60 tracking-wide uppercase font-medium">
                      {r.label}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Switch to lighter task */}
              {lowEnergyTasks.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] text-muted-foreground/45 uppercase tracking-[0.14em] mb-3">
                    or switch to something lighter
                  </p>
                  <div className="space-y-2">
                    {lowEnergyTasks.slice(0, 3).map((t) => (
                      <motion.button
                        key={t.task_id}
                        whileTap={{ scale: 0.99 }}
                        whileHover={{ x: 3 }}
                        onClick={() => handleSwitch(t.task_id)}
                        disabled={isSwitching}
                        className="w-full px-4 py-3 rounded-xl
                          border border-border/35 bg-card
                          text-foreground/65 hover:text-foreground/85 hover:border-border/55
                          text-sm flex items-center justify-between
                          transition-all duration-400 disabled:opacity-50"
                      >
                        <span className="font-light truncate">{t.task_name}</span>
                        {isSwitching
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary/40 ml-2" />
                          : <span className="text-muted-foreground/35 ml-2">→</span>
                        }
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              <motion.button
                whileTap={{ scale: 0.99 }}
                onClick={() => endSession("Distraction")}
                className="w-full py-3.5 rounded-2xl text-sm
                  border border-border/35 bg-card
                  text-muted-foreground/55 hover:text-foreground/70 hover:border-border/55
                  transition-all duration-400"
              >
                That's okay — done for now
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </>
  );
};

export default Sessions;
