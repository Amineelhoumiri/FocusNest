// src/pages/Sessions.tsx — Pre-session step flow (Task → Subtask → Duration)

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, Check, Clock, Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionTask {
  task_id: string;
  task_name: string;
  task_status: string;
  priority?: string;
}

interface SessionSubtask {
  subtask_id: string;
  subtask_name: string;
  subtask_status: string; // "Backlog" | "Ready" | "Doing" | "Done"
  energy_level: "High" | "Medium" | "Low";
}

type Step = 1 | 2 | 3;

interface Duration { mins: number; label: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = ["Task", "Subtask", "Duration"] as const;

const DURATIONS: Duration[] = [
  { mins: 5,  label: "Micro"    },
  { mins: 25, label: "Pomodoro" },
  { mins: 45, label: "Deep"     },
  { mins: 60, label: "Flow"     },
];

// ─── StepTrack ───────────────────────────────────────────────────────────────

const StepTrack = ({ step, reduced, isDark }: { step: Step; reduced: boolean; isDark: boolean }) => (
  <div className="flex items-center gap-0 mb-8 px-2">
    {STEP_LABELS.map((label, i) => {
      const done   = step > i + 1;
      const active = step === i + 1;
      const dotBg  = done   ? "#7c6ff7"
                   : active ? (isDark ? "#ffffff" : "#534AB7")
                   : (isDark ? "rgba(255,255,255,0.18)" : "rgba(83,74,183,0.20)");
      const labelColor = done   ? (isDark ? "rgba(167,139,250,0.7)" : "#7c6ff7")
                       : active ? (isDark ? "rgba(255,255,255,0.78)" : "#534AB7")
                       : (isDark ? "rgba(255,255,255,0.22)" : "rgba(83,74,183,0.30)");
      return (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-1.5">
            <motion.div
              animate={reduced ? undefined : { background: dotBg, scale: active ? 1.15 : 1 }}
              style={{
                width: 10, height: 10, borderRadius: "50%",
                background: dotBg,
                boxShadow: active
                  ? isDark ? "0 0 0 3px rgba(255,255,255,0.15)" : "0 0 0 3px rgba(83,74,183,0.18)"
                  : undefined,
              }}
              transition={{ duration: 0.2 }}
            />
            <span className="text-[10px] font-bold uppercase tracking-[0.07em]" style={{ color: labelColor }}>
              {label}
            </span>
          </div>
          {i < 2 && (
            <div
              className="flex-1 h-px mb-4 mx-2"
              style={{ background: isDark ? "rgba(255,255,255,0.1)" : "rgba(83,74,183,0.12)" }}
            />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Step 1 — Task picker ─────────────────────────────────────────────────────

const StepTask = ({
  tasks, loading, selectedTask, setSelectedTask, onNext, isDark,
}: {
  tasks: SessionTask[];
  loading: boolean;
  selectedTask: SessionTask | null;
  setSelectedTask: (t: SessionTask) => void;
  onNext: () => void;
  isDark: boolean;
}) => (
  <div>
    <h2 className={cn("text-[26px] font-extrabold leading-tight tracking-tight mb-1.5",
      isDark ? "text-white" : "text-[#1a1830]")}>
      What are you{" "}
      <span className={isDark ? "text-violet-400" : "text-[#534AB7]"}>working on?</span>
    </h2>
    <p className={cn("text-[13px] mb-6", isDark ? "text-white/35" : "text-[#1a1830]/45")}>
      Pick the task for today's session.
    </p>

    {loading ? (
      <div className="flex items-center justify-center gap-2 py-8 text-[13px]"
           style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(26,24,48,0.45)" }}>
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading tasks…
      </div>
    ) : tasks.length === 0 ? (
      <div className="py-8 text-center text-[13px]"
           style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(26,24,48,0.45)" }}>
        No active tasks. Create some tasks first.
      </div>
    ) : (
      <div className="flex flex-col gap-2.5 mb-6 max-h-[320px] overflow-y-auto
                      scrollbar-thin scrollbar-thumb-violet-500/30 scrollbar-track-transparent pr-0.5">
        {tasks.map((task) => {
          const sel = selectedTask?.task_id === task.task_id;
          return (
            <button
              key={task.task_id}
              onClick={() => setSelectedTask(task)}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer",
                "border-[1.5px] transition-all duration-150 text-left w-full",
                sel
                  ? isDark
                    ? "bg-violet-500/10 border-violet-500/45"
                    : "bg-violet-500/[0.08] border-violet-500/45"
                  : isDark
                  ? "bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.06] hover:border-white/[0.13]"
                  : "bg-white/60 border-violet-300/18 hover:bg-white/90 hover:border-violet-400/30"
              )}
            >
              {/* Radio dot */}
              <div className={cn(
                "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
                sel
                  ? isDark ? "bg-violet-500 border-violet-500" : "bg-violet-600 border-violet-600"
                  : isDark ? "border-white/20" : "border-violet-300/40"
              )}>
                {sel && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn("text-[14px] font-semibold truncate",
                  isDark ? "text-white/88" : "text-[#1a1830]")}>
                  {task.task_name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-lg ml-auto",
                    task.priority === "high"
                      ? isDark ? "bg-red-500/15 text-red-400" : "bg-red-500/10 text-red-600"
                      : isDark ? "bg-violet-500/15 text-violet-400" : "bg-violet-500/12 text-violet-700"
                  )}>
                    {task.priority === "high" ? "High" : "Low"}
                  </span>
                  <span className={cn("text-[11px]", isDark ? "text-white/28" : "text-[#1a1830]/38")}>
                    {task.task_status === "Ready" ? "To Do" : task.task_status}
                  </span>
                </div>
              </div>

              <ChevronRight
                className="shrink-0"
                style={{ width: 16, height: 16, color: isDark ? "rgba(255,255,255,0.20)" : "rgba(83,74,183,0.30)" }}
              />
            </button>
          );
        })}
      </div>
    )}

    <button
      onClick={() => selectedTask && onNext()}
      className={cn(
        "w-full py-4 rounded-2xl text-[14px] font-extrabold",
        "flex items-center justify-center gap-2 transition-all duration-200",
        selectedTask
          ? isDark
            ? "bg-violet-500 hover:bg-violet-600 text-white hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
            : "bg-[#534AB7] hover:bg-[#4338a8] text-white hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer hover:shadow-[0_8px_24px_rgba(83,74,183,0.3)]"
          : isDark
          ? "bg-white/[0.06] text-white/20 cursor-not-allowed"
          : "bg-violet-500/08 text-violet-700/30 cursor-not-allowed"
      )}
    >
      Next — Pick a subtask
      <ChevronRight style={{ width: 16, height: 16 }} />
    </button>
  </div>
);

// ─── Step 2 — Subtask picker ──────────────────────────────────────────────────

const StepSubtask = ({
  selectedTask, subtasks, loading, selectedSubtask, setSelectedSubtask,
  onBack, onNext, isDark,
}: {
  selectedTask: SessionTask | null;
  subtasks: SessionSubtask[];
  loading: boolean;
  selectedSubtask: SessionSubtask | null;
  setSelectedSubtask: (s: SessionSubtask) => void;
  onBack: () => void;
  onNext: () => void;
  isDark: boolean;
}) => {
  const active = subtasks.filter((s) => s.subtask_status !== "Done");
  const canNext = active.length === 0 || !!selectedSubtask;

  return (
    <div>
      <h2 className={cn("text-[26px] font-extrabold leading-tight tracking-tight mb-1",
        isDark ? "text-white" : "text-[#1a1830]")}>
        Pick one{" "}
        <span className={isDark ? "text-violet-400" : "text-[#534AB7]"}>subtask</span>
      </h2>
      <p className="text-[11px] mb-1 truncate"
         style={{ color: isDark ? "rgba(139,92,246,0.55)" : "#7c6ff7" }}>
        {selectedTask?.task_name}
      </p>
      <p className={cn("text-[13px] mb-5", isDark ? "text-white/35" : "text-[#1a1830]/45")}>
        One thing. What exactly are you doing right now?
      </p>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-[13px]"
             style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(26,24,48,0.45)" }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading subtasks…
        </div>
      ) : active.length === 0 ? (
        <div className="py-5 text-center mb-5">
          <p className="text-[13px] mb-1"
             style={{ color: isDark ? "rgba(255,255,255,0.40)" : "rgba(26,24,48,0.45)" }}>
            No subtasks yet
          </p>
          <p className="text-[11px]"
             style={{ color: isDark ? "rgba(255,255,255,0.22)" : "rgba(26,24,48,0.30)" }}>
            You can still run a session focused on this task.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 mb-5 max-h-[280px] overflow-y-auto
                        scrollbar-thin scrollbar-thumb-violet-500/30 scrollbar-track-transparent pr-0.5">
          {active.map((subtask) => {
            const sel = selectedSubtask?.subtask_id === subtask.subtask_id;
            return (
              <button
                key={subtask.subtask_id}
                onClick={() => setSelectedSubtask(subtask)}
                className={cn(
                  "flex items-start gap-2.5 px-4 py-3 rounded-xl cursor-pointer",
                  "border-[1.5px] transition-all duration-150 text-left w-full",
                  sel
                    ? isDark
                      ? "bg-violet-500/10 border-violet-500/40"
                      : "bg-violet-500/[0.08] border-violet-500/38"
                    : isDark
                    ? "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.11]"
                    : "bg-white/55 border-violet-300/14 hover:bg-white/90 hover:border-violet-400/25"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-[4px] border-[1.5px] mt-0.5 shrink-0",
                  "flex items-center justify-center transition-all",
                  sel ? "bg-violet-500 border-violet-500" : isDark ? "border-white/18" : "border-violet-300/40"
                )}>
                  {sel && <Check className="text-white" style={{ width: 10, height: 10 }} />}
                </div>

                <p className={cn("text-[13px] flex-1 leading-[1.45] line-clamp-2",
                  isDark ? "text-white/72" : "text-[#1a1830]/70")}>
                  {subtask.subtask_name}
                </p>

                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-lg shrink-0 mt-0.5",
                  subtask.energy_level === "High"
                    ? isDark ? "bg-red-500/15 text-red-400" : "bg-red-500/10 text-red-600"
                    : isDark ? "bg-violet-500/15 text-violet-400" : "bg-violet-500/12 text-violet-700"
                )}>
                  {subtask.energy_level}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onBack}
          className={cn(
            "px-5 py-3.5 rounded-xl text-[13px] font-semibold cursor-pointer",
            "border transition-all duration-150",
            isDark
              ? "bg-white/[0.05] text-white/40 border-white/[0.08] hover:bg-white/[0.09] hover:text-white/65"
              : "bg-violet-500/[0.08] text-violet-700/50 border-violet-400/14 hover:bg-violet-500/14"
          )}
        >
          ← Back
        </button>
        <button
          onClick={() => canNext && onNext()}
          className={cn(
            "flex-1 py-3.5 rounded-xl text-[13px] font-bold transition-all duration-150",
            canNext
              ? isDark
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/32 hover:bg-violet-500/30 cursor-pointer"
                : "bg-violet-500/15 text-[#534AB7] border border-violet-500/22 hover:bg-violet-500/22 cursor-pointer"
              : isDark
              ? "bg-white/[0.04] text-white/18 cursor-not-allowed"
              : "bg-violet-500/05 text-violet-700/20 cursor-not-allowed border border-transparent"
          )}
        >
          {active.length === 0 ? "Skip — Set duration →" : "Next — Set duration →"}
        </button>
      </div>
    </div>
  );
};

// ─── Step 3 — Duration + Begin ────────────────────────────────────────────────

const StepDuration = ({
  selectedTask, selectedSubtask, duration, setDuration, onBack, onBegin, isDark,
}: {
  selectedTask:    SessionTask | null;
  selectedSubtask: SessionSubtask | null;
  duration:        Duration;
  setDuration:     (d: Duration) => void;
  onBack:          () => void;
  onBegin:         () => void;
  isDark:          boolean;
}) => (
  <div>
    <h2 className={cn("text-[26px] font-extrabold leading-tight tracking-tight mb-1.5",
      isDark ? "text-white" : "text-[#1a1830]")}>
      How long will you{" "}
      <span className={isDark ? "text-violet-400" : "text-[#534AB7]"}>focus?</span>
    </h2>
    <p className={cn("text-[13px] mb-6", isDark ? "text-white/35" : "text-[#1a1830]/45")}>
      Pick a duration that feels achievable right now.
    </p>

    {/* Duration grid */}
    <div className="grid grid-cols-4 gap-2 mb-5">
      {DURATIONS.map((d) => {
        const sel = duration.mins === d.mins;
        return (
          <button
            key={d.mins}
            onClick={() => setDuration(d)}
            className={cn(
              "flex flex-col items-center py-4 rounded-2xl cursor-pointer",
              "border-[1.5px] transition-all duration-150",
              sel
                ? isDark
                  ? "bg-violet-500/[0.18] border-violet-500/55"
                  : "bg-violet-500/10 border-violet-600/45"
                : isDark
                ? "bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.07] hover:border-white/[0.14]"
                : "bg-white/60 border-violet-300/18 hover:bg-white/90 hover:border-violet-400/30"
            )}
          >
            <span className={cn(
              "text-[26px] font-extrabold leading-none",
              sel
                ? isDark ? "text-white" : "text-[#534AB7]"
                : isDark ? "text-white/55" : "text-[#1a1830]/45"
            )}>
              {d.mins}
            </span>
            <span className={cn(
              "text-[9px] font-bold uppercase tracking-[0.08em] mt-1.5",
              sel
                ? isDark ? "text-violet-300/70" : "text-violet-700/60"
                : isDark ? "text-white/20" : "text-[#1a1830]/22"
            )}>
              {d.label}
            </span>
          </button>
        );
      })}
    </div>

    {/* Confirm summary */}
    <div className={cn(
      "flex items-start gap-2.5 px-4 py-3.5 rounded-xl mb-5",
      isDark
        ? "bg-violet-500/[0.08] border border-violet-400/18"
        : "bg-violet-500/[0.07] border border-violet-400/16"
    )}>
      <Clock
        className="mt-0.5 shrink-0"
        style={{ width: 14, height: 14, color: isDark ? "#a78bfa" : "#534AB7" }}
      />
      <div>
        <p className={cn("text-[12px] leading-relaxed", isDark ? "text-white/55" : "text-[#1a1830]/50")}>
          <span className={cn("font-bold", isDark ? "text-violet-300" : "text-[#534AB7]")}>
            {duration.mins} min
          </span>
          {" focused on "}
          <span className={cn("font-medium", isDark ? "text-white/78" : "text-[#1a1830]/75")}>
            {selectedSubtask?.subtask_name ?? selectedTask?.task_name}
          </span>
        </p>
        {selectedSubtask && (
          <p className={cn("text-[11px] mt-0.5", isDark ? "text-violet-400/42" : "text-violet-700/40")}>
            {selectedTask?.task_name}
          </p>
        )}
      </div>
    </div>

    {/* Begin CTA */}
    <button
      onClick={onBegin}
      className={cn(
        "w-full py-4 rounded-2xl text-[15px] font-extrabold cursor-pointer",
        "flex items-center justify-center gap-2",
        "hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 mb-2",
        isDark
          ? "bg-violet-500 hover:bg-violet-600 text-white"
          : "bg-[#534AB7] hover:bg-[#4338a8] text-white hover:shadow-[0_8px_24px_rgba(83,74,183,0.3)]"
      )}
    >
      <Play style={{ width: 16, height: 16 }} />
      Begin Focus Session
    </button>

    <button
      onClick={onBack}
      className={cn(
        "w-full py-3 rounded-xl text-[13px] font-semibold cursor-pointer",
        "border transition-all duration-150",
        isDark
          ? "bg-white/[0.05] text-white/38 border-white/[0.07] hover:bg-white/[0.09] hover:text-white/60"
          : "bg-violet-500/[0.08] text-violet-700/50 border-violet-400/14 hover:bg-violet-500/14"
      )}
    >
      ← Change subtask
    </button>
  </div>
);

// ─── Sessions ─────────────────────────────────────────────────────────────────

const Sessions = () => {
  const navigate         = useNavigate();
  const [searchParams]   = useSearchParams();
  const reduced          = useReducedMotion() ?? false;
  const { theme }        = useTheme();
  const isDark           = theme === "dark";

  const [step, setStep]                 = useState<Step>(1);
  const [tasks, setTasks]               = useState<SessionTask[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selectedTask, setSelectedTask] = useState<SessionTask | null>(null);
  const [subtasks, setSubtasks]         = useState<SessionSubtask[]>([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [selectedSubtask, setSelectedSubtask] = useState<SessionSubtask | null>(null);
  const [duration, setDuration]         = useState<Duration>({ mins: 25, label: "Pomodoro" });

  // Fetch tasks
  useEffect(() => {
    fetch("/api/tasks", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data: SessionTask[]) =>
        setTasks(data.filter((t) => t.task_status?.toLowerCase() !== "done"))
      )
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

  // Handle autostart (from kanban "Focus" shortcut)
  useEffect(() => {
    if (loading) return;
    const autostart = searchParams.get("autostart");
    const qTaskId   = searchParams.get("taskId");
    const qSubtaskId = searchParams.get("subtaskId");
    if (autostart !== "true" || !qTaskId) return;

    const task = tasks.find((t) => t.task_id === qTaskId);
    if (!task) return;
    setSelectedTask(task);

    // Fetch subtasks then pre-select and jump to step 3
    fetch(`/api/tasks/${qTaskId}/subtasks`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((subs: SessionSubtask[]) => {
        setSubtasks(subs);
        if (qSubtaskId) {
          const sub = subs.find((s) => s.subtask_id === qSubtaskId);
          if (sub) setSelectedSubtask(sub);
        }
        setStep(3);
      })
      .catch(() => { setStep(3); });
  }, [loading, tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch subtasks when task changes (manual navigation)
  useEffect(() => {
    if (!selectedTask) { setSubtasks([]); return; }
    setLoadingSubtasks(true);
    fetch(`/api/tasks/${selectedTask.task_id}/subtasks`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then(setSubtasks)
      .catch(() => setSubtasks([]))
      .finally(() => setLoadingSubtasks(false));
  }, [selectedTask]);

  const beginSession = () => {
    if (!selectedTask) return;
    const p = new URLSearchParams({
      taskId:    selectedTask.task_id,
      taskTitle: selectedTask.task_name,
      duration:  String(duration.mins),
    });
    if (selectedSubtask) {
      p.set("subtaskId",    selectedSubtask.subtask_id);
      p.set("subtaskTitle", selectedSubtask.subtask_name);
    }
    navigate(`/sessions/active?${p}`);
  };

  const cardVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: -10 },
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-48px)] items-center justify-center px-6 py-12">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={reduced ? undefined : cardVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="w-full max-w-[440px]"
        >
          <StepTrack step={step} reduced={reduced} isDark={isDark} />

          {/* Frosted card — only dark treatment on the page */}
          <div className={cn(
            "rounded-2xl overflow-hidden backdrop-blur-xl p-7",
            isDark
              ? "bg-[#0a0618]/72 border border-white/[0.09]"
              : "bg-white/82 border border-violet-300/25 shadow-[0_8px_32px_rgba(124,111,247,0.12)]"
          )}>
            {step === 1 && (
              <StepTask
                tasks={tasks}
                loading={loading}
                selectedTask={selectedTask}
                setSelectedTask={(t) => { setSelectedTask(t); setSelectedSubtask(null); }}
                onNext={() => setStep(2)}
                isDark={isDark}
              />
            )}
            {step === 2 && (
              <StepSubtask
                selectedTask={selectedTask}
                subtasks={subtasks}
                loading={loadingSubtasks}
                selectedSubtask={selectedSubtask}
                setSelectedSubtask={setSelectedSubtask}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
                isDark={isDark}
              />
            )}
            {step === 3 && (
              <StepDuration
                selectedTask={selectedTask}
                selectedSubtask={selectedSubtask}
                duration={duration}
                setDuration={setDuration}
                onBack={() => setStep(2)}
                onBegin={beginSession}
                isDark={isDark}
              />
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Sessions;
