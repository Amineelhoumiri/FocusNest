import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Plus, Zap, Leaf, X, Loader2, CheckCircle2, Play, Grid,
  Calendar as CalendarIcon, ChevronRight, ChevronDown, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useFocusScore } from "@/context/FocusScoreContext";
import confetti from "canvas-confetti";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  name: string;
  energy: "high" | "low";
  column: string;
  subtasks: number;
  subtasksDone: number;
  due_date?: string | null;
}

// ─── Status config ─────────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  backlog: "bg-slate-500/15 text-slate-400",
  todo:    "bg-blue-500/15 text-blue-400",
  doing:   "bg-primary/15 text-primary",
  done:    "bg-emerald-500/15 text-emerald-400",
};
const statusLabels: Record<string, string> = {
  backlog: "Backlog",
  todo:    "To Do",
  doing:   "Doing",
  done:    "Done",
};

// Section color palette
const sectionMeta: Record<string, { label: string; borderColor: string; badgeBg: string; badgeText: string; dotColor: string }> = {
  doing:   { label: "Doing",   borderColor: "#7C3AED", badgeBg: "rgba(124,58,237,0.15)", badgeText: "#A78BFA", dotColor: "#7C3AED" },
  todo:    { label: "To Do",   borderColor: "#3B82F6", badgeBg: "rgba(59,130,246,0.15)",  badgeText: "#60A5FA", dotColor: "#3B82F6" },
  backlog: { label: "Backlog", borderColor: "#64748B", badgeBg: "rgba(100,116,139,0.15)", badgeText: "#94A3B8", dotColor: "#64748B" },
  done:    { label: "Done",    borderColor: "#10B981", badgeBg: "rgba(16,185,129,0.15)",  badgeText: "#34D399", dotColor: "#10B981" },
};

// Energy left-border colors
const energyBorderColor = (energy: string) =>
  energy === "high" ? "#7C3AED" : "#3B82F6";

// ─── Task Card ────────────────────────────────────────────────────────────────

const TaskCard = ({
  task,
  index,
  onNavigate,
  onStartSession,
}: {
  task: Task;
  index: number;
  onNavigate: (id: string) => void;
  onStartSession: (e: React.MouseEvent, id: string) => void;
}) => {
  const progress = task.subtasks > 0 ? (task.subtasksDone / task.subtasks) * 100 : 0;
  const allDone = task.column === "done";
  const borderColor = energyBorderColor(task.energy);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -3, boxShadow: "var(--card-shadow-hover)" }}
      onClick={() => onNavigate(task.id)}
      className="cursor-pointer group relative"
      style={{
        background: "hsl(var(--card))",
        borderRadius: "0.875rem",
        padding: "1rem 1rem 1rem 1.25rem",
        border: "1px solid hsl(var(--border) / 0.55)",
        borderLeft: `3px solid ${allDone ? "#10B981" : borderColor}`,
        boxShadow: "var(--card-shadow)",
        opacity: allDone ? 0.5 : 1,
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className={`text-sm font-medium leading-snug flex-1 transition-colors ${allDone ? "line-through text-muted-foreground/40" : "text-foreground/85 group-hover:text-foreground"}`}>
          {task.name}
        </p>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/50 shrink-0 mt-0.5 transition-all duration-300 group-hover:translate-x-0.5" />
      </div>

      {/* Subtask progress */}
      {task.subtasks > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] tracking-[0.12em] uppercase text-muted-foreground/30">subtasks</span>
            <span className="text-[9px] text-muted-foreground/30 tabular-nums">{task.subtasksDone}/{task.subtasks}</span>
          </div>
          <div className="h-[2px] rounded-full bg-border/20 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `${borderColor}88` }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Bottom row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Energy badge */}
        <span className={`flex items-center gap-1 text-[10px] tracking-wide font-bold px-2 py-0.5 rounded-full
          ${task.energy === "high"
            ? "bg-primary/10 text-primary/80 ring-1 ring-primary/20"
            : "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20"}`}
        >
          {task.energy === "high" ? <Zap className="w-2.5 h-2.5" /> : <Leaf className="w-2.5 h-2.5" />}
          {task.energy === "high" ? "High" : "Low"}
        </span>

        {/* Status badge */}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyles[task.column] ?? "bg-muted text-muted-foreground"}`}>
          {statusLabels[task.column] ?? task.column}
        </span>

        {task.due_date && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground/40 ml-auto">
            <CalendarIcon className="w-3 h-3" />
            {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}

        {task.column === "doing" && (
          <button
            onClick={(e) => onStartSession(e, task.id)}
            title="Start focus session"
            className="ml-auto w-6 h-6 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
            style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.35)" }}
          >
            <Play className="w-3 h-3 text-primary fill-primary" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader = ({
  status,
  count,
  open,
  onToggle,
}: {
  status: string;
  count: number;
  open: boolean;
  onToggle: () => void;
}) => {
  const meta = sectionMeta[status];
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-3 w-full mb-4 group"
    >
      {/* Colored left accent */}
      <div className="w-[3px] h-5 rounded-full shrink-0" style={{ background: meta.borderColor }} />

      <span className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: meta.badgeText }}>
        {meta.label}
      </span>

      {/* Count badge */}
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={{ background: meta.badgeBg, color: meta.badgeText }}
      >
        {count}
      </span>

      {/* Fade-out divider */}
      <div
        className="flex-1 h-px"
        style={{ background: `linear-gradient(90deg, ${meta.borderColor}30, transparent)` }}
      />

      <motion.div
        animate={{ rotate: open ? 0 : -90 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="shrink-0 opacity-40 group-hover:opacity-70 transition-opacity"
      >
        <ChevronDown className="w-3.5 h-3.5" style={{ color: meta.badgeText }} />
      </motion.div>
    </button>
  );
};

// ─── Today view ───────────────────────────────────────────────────────────────

const TodayView = ({
  tasks,
  onNavigate,
  onStartSession,
  onComplete,
}: {
  tasks: Task[];
  onNavigate: (id: string) => void;
  onStartSession: (e: React.MouseEvent, id: string) => void;
  onComplete: (task: Task) => void;
}) => {
  const todayStr = new Date().toISOString().split("T")[0];
  const todayTasks = tasks
    .filter((t) => t.due_date?.startsWith(todayStr) || t.column === "doing")
    .sort((a, b) => {
      const order: Record<string, number> = { doing: 1, todo: 2, backlog: 3, done: 4 };
      return (order[a.column] ?? 99) - (order[b.column] ?? 99);
    });

  const allDone = todayTasks.length > 0 && todayTasks.every((t) => t.column === "done");

  if (allDone) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4 opacity-60" />
        <h2 className="text-xl font-bold text-foreground mb-2">All done for today! 🎉</h2>
        <p className="text-muted-foreground">Go rest, you've earned it.</p>
      </motion.div>
    );
  }

  if (todayTasks.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2">Nothing due today 🎉</h2>
        <p className="text-muted-foreground">Enjoy your day or switch to Board to plan ahead.</p>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-2">
      {todayTasks.map((task, i) => {
        const borderColor = energyBorderColor(task.energy);
        return (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group cursor-pointer flex items-center justify-between p-4 transition-all"
            style={{
              borderRadius: "0.875rem",
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border) / 0.55)",
              borderLeft: `3px solid ${borderColor}`,
              boxShadow: "var(--card-shadow)",
            }}
            onClick={() => onNavigate(task.id)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`text-sm font-medium truncate transition-colors ${task.column === "done" ? "line-through text-muted-foreground" : "text-foreground group-hover:text-foreground/90"}`}>
                {task.name}
              </span>
              <span className={`flex items-center gap-1 text-[9px] tracking-wide uppercase font-bold px-2 py-0.5 rounded-full shrink-0
                ${task.energy === "high" ? "bg-primary/10 text-primary/80" : "bg-blue-500/10 text-blue-400"}`}
              >
                {task.energy === "high" ? <Zap className="w-2.5 h-2.5" /> : <Leaf className="w-2.5 h-2.5" />}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-lg ${statusStyles[task.column]}`}>
                {statusLabels[task.column] ?? task.column}
              </span>
              {task.column === "doing" && (
                <button
                  onClick={(e) => onStartSession(e, task.id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)" }}
                >
                  <Play className="w-3.5 h-3.5 text-primary fill-primary" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onComplete(task); }}
                className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                  task.column === "done"
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-border/50 text-transparent hover:border-emerald-500/50 hover:bg-emerald-500/10"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// ─── Tasks Page ───────────────────────────────────────────────────────────────

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ name: "", energy: "Low" as "High" | "Low" });
  const [viewMode, setViewMode] = useState<"board" | "today">("board");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const { addScore } = useFocusScore();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setTasks(
        data.map((t: { task_id: string; task_name: string; energy_level: string; task_status: string; total_subtasks: number; completed_subtasks: number; due_date: string | null }) => ({
          id: t.task_id,
          name: t.task_name,
          energy: t.energy_level.toLowerCase() as "high" | "low",
          column: t.task_status === "Ready" ? "todo" : t.task_status.toLowerCase(),
          subtasks: t.total_subtasks || 0,
          subtasksDone: t.completed_subtasks || 0,
          due_date: t.due_date || null,
        }))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const addTask = async () => {
    if (!newTask.name.trim()) return;
    setShowAdd(false);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_name: newTask.name, energy_level: newTask.energy, task_status: "Backlog" }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      fetchTasks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setNewTask({ name: "", energy: "Low" });
    }
  };

  const handleStartSession = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    localStorage.setItem("activeTaskId", taskId);
    navigate("/sessions");
  };

  const handleCompleteTask = async (task: Task) => {
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, column: "done" } : t));
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ["#7C3AED", "#8B5CF6", "#A78BFA", "#3B82F6", "#10B981"] });
    addScore(10);
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_status: "Done" }),
      });
      fetchTasks();
    } catch {
      toast.error("Failed to update task");
      fetchTasks();
    }
  };

  const toggleSection = (status: string) =>
    setCollapsedSections((prev) => ({ ...prev, [status]: !prev[status] }));

  const groups = {
    backlog: tasks.filter((t) => t.column === "backlog"),
    todo:    tasks.filter((t) => t.column === "todo"),
    doing:   tasks.filter((t) => t.column === "doing"),
    done:    tasks.filter((t) => t.column === "done"),
  };

  const statusOrder: (keyof typeof groups)[] = ["doing", "todo", "backlog", "done"];
  const totalTasks = tasks.length;
  const doneTasks  = groups.done.length;

  return (
    <div className="h-full flex flex-col pb-20 md:pb-0">

      {/* ── Background ambient ── */}
      <div className="pointer-events-none fixed inset-0 z-0" style={{
        background: "radial-gradient(ellipse 70% 40% at 15% 5%, hsl(var(--primary) / 0.05) 0%, transparent 60%)",
      }} />

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 flex items-center justify-between mb-7 shrink-0"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Tasks</h1>
          {totalTasks > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full"
              style={{
                background: "hsl(var(--primary) / 0.12)",
                color: "hsl(var(--primary) / 0.9)",
                border: "1px solid hsl(var(--primary) / 0.25)",
                boxShadow: "0 0 12px hsl(var(--primary) / 0.12)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-pulse" />
              {totalTasks} task{totalTasks !== 1 ? "s" : ""}{doneTasks > 0 ? ` · ${doneTasks} done` : ""}
            </motion.span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle — pill tabs */}
          <div
            className="flex items-center rounded-full p-1 gap-1"
            style={{ background: "hsl(var(--muted) / 0.7)", border: "1px solid hsl(var(--border) / 0.5)" }}
          >
            <button
              onClick={() => setViewMode("board")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-full transition-all duration-300"
              style={viewMode === "board"
                ? { background: "hsl(var(--primary))", color: "#fff", boxShadow: "0 2px 8px hsl(var(--primary) / 0.4)" }
                : { color: "hsl(var(--muted-foreground))" }}
            >
              <Grid className="w-3 h-3" /> Board
            </button>
            <button
              onClick={() => setViewMode("today")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-full transition-all duration-300"
              style={viewMode === "today"
                ? { background: "hsl(var(--primary))", color: "#fff", boxShadow: "0 2px 8px hsl(var(--primary) / 0.4)" }
                : { color: "hsl(var(--muted-foreground))" }}
            >
              <CalendarIcon className="w-3 h-3" /> Today
            </button>
          </div>

          {viewMode === "board" && (
            <motion.button
              whileHover={prefersReducedMotion ? {} : { scale: 1.04, boxShadow: "0 6px 24px rgba(124,58,237,0.45)" }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{
                background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
                boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
              }}
            >
              <motion.div
                animate={prefersReducedMotion ? {} : { rotate: [0, 0, 15, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
              >
                <Plus className="w-4 h-4" />
              </motion.div>
              Add Task
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* ── Content ── */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : viewMode === "today" ? (
          <TodayView
            tasks={tasks}
            onNavigate={(id) => navigate(`/tasks/${id}`)}
            onStartSession={handleStartSession}
            onComplete={handleCompleteTask}
          />
        ) : tasks.length === 0 ? (
          /* ── Empty state ── */
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            {/* Illustrated focus icon */}
            <motion.div
              animate={prefersReducedMotion ? {} : { y: [0, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="relative mb-6"
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))",
                  border: "1px solid hsl(var(--primary) / 0.2)",
                  boxShadow: "0 0 40px hsl(var(--primary) / 0.12)",
                }}
              >
                <Sparkles className="w-9 h-9 text-primary/60" />
              </div>
              {/* Orbit ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{ border: "1px dashed hsl(var(--primary) / 0.15)" }}
              />
            </motion.div>
            <h3 className="text-lg font-semibold mb-2 text-foreground/80">Your plate is clear ✨</h3>
            <p className="text-sm text-muted-foreground/50 mb-6 max-w-xs">
              Add a task to get started — each one gets its own personal Kanban board.
            </p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                border: "1px solid hsl(var(--primary) / 0.3)",
                color: "hsl(var(--primary) / 0.8)",
                background: "hsl(var(--primary) / 0.06)",
              }}
            >
              <Plus className="w-4 h-4" /> Add your first task
            </motion.button>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {statusOrder.map((status) => {
              const group = groups[status];
              if (group.length === 0) return null;
              const isOpen = collapsedSections[status] !== true;
              return (
                <div key={status}>
                  <SectionHeader
                    status={status}
                    count={group.length}
                    open={isOpen}
                    onToggle={() => toggleSection(status)}
                  />
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="section-body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                        style={{ overflow: "hidden" }}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-1">
                          <AnimatePresence>
                            {group.map((task, i) => (
                              <TaskCard
                                key={task.id}
                                task={task}
                                index={i}
                                onNavigate={(id) => navigate(`/tasks/${id}`)}
                                onStartSession={handleStartSession}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add Task Modal ── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="p-6 rounded-2xl w-full max-w-md"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border) / 0.6)",
                boxShadow: "var(--card-shadow)",
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-semibold text-foreground/80">New Task</h2>
                <button onClick={() => setShowAdd(false)} className="text-muted-foreground/30 hover:text-muted-foreground/70 p-1.5 rounded-full transition-colors duration-300">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                autoFocus
                value={newTask.name}
                onChange={(e) => setNewTask((n) => ({ ...n, name: e.target.value }))}
                placeholder="What needs to get done?"
                className="w-full px-4 py-3 rounded-xl text-foreground/80 placeholder:text-muted-foreground/30 focus:outline-none text-sm mb-5"
                style={{
                  background: "hsl(var(--muted) / 0.5)",
                  border: "1px solid hsl(var(--border) / 0.5)",
                }}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
              />

              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/30 mb-3 px-1">energy required</p>
              <div className="grid grid-cols-2 gap-3 mb-7">
                <button
                  onClick={() => setNewTask((n) => ({ ...n, energy: "Low" }))}
                  className="p-4 rounded-xl text-center min-h-[44px] transition-all duration-300 flex flex-col items-center justify-center gap-2"
                  style={newTask.energy === "Low"
                    ? { background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.35)", color: "#3B82F6" }
                    : { border: "1px solid hsl(var(--border) / 0.5)", color: "hsl(var(--muted-foreground))" }}
                >
                  <Leaf className="w-5 h-5" />
                  <span className="text-xs font-light">Low energy</span>
                </button>
                <button
                  onClick={() => setNewTask((n) => ({ ...n, energy: "High" }))}
                  className="p-4 rounded-xl text-center min-h-[44px] transition-all duration-300 flex flex-col items-center justify-center gap-2"
                  style={newTask.energy === "High"
                    ? { background: "rgba(124,58,237,0.10)", border: "1px solid rgba(124,58,237,0.35)", color: "#7C3AED" }
                    : { border: "1px solid hsl(var(--border) / 0.5)", color: "hsl(var(--muted-foreground))" }}
                >
                  <Zap className="w-5 h-5" />
                  <span className="text-xs font-light">High energy</span>
                </button>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={prefersReducedMotion ? {} : { scale: 1.02, boxShadow: "0 8px 28px rgba(124,58,237,0.4)" }}
                onClick={addTask}
                disabled={!newTask.name.trim()}
                className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
                  boxShadow: "0 4px 20px rgba(124,58,237,0.3)",
                }}
              >
                Create Task
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tasks;
