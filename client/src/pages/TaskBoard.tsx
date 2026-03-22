import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowLeft, Zap, Leaf, GripVertical, Plus, Trash2, Sparkles,
  Loader2, Check, Play, CheckCircle2, X, Trophy,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { useFocusScore } from "@/context/FocusScoreContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskMeta {
  id: string;
  name: string;
  energy: "high" | "low";
  column: string;
  due_date?: string | null;
  notes?: string;
}

interface Subtask {
  subtask_id: string;
  subtask_name: string;
  subtask_status: string;
  energy_level: "High" | "Low";
  is_approved: boolean;
}

// ─── Column Definitions ───────────────────────────────────────────────────────

const columns = [
  { id: "backlog", label: "Backlog", backendValue: "Backlog" },
  { id: "todo",    label: "To Do",   backendValue: "Ready"   },
  { id: "doing",   label: "Doing",   backendValue: "Doing"   },
  { id: "done",    label: "Done",    backendValue: "Done"    },
];

const columnMeta: Record<string, {
  accent: string;
  accentDim: string;
  badgeBg: string;
  headerBg: string;
  colBg: string;
  colBorder: string;
}> = {
  backlog: {
    accent:     "#64748B",
    accentDim:  "#94A3B8",
    badgeBg:    "rgba(100,116,139,0.18)",
    headerBg:   "rgba(100,116,139,0.06)",
    colBg:      "rgba(100,116,139,0.025)",
    colBorder:  "rgba(100,116,139,0.18)",
  },
  todo: {
    accent:     "#3B82F6",
    accentDim:  "#60A5FA",
    badgeBg:    "rgba(59,130,246,0.18)",
    headerBg:   "rgba(59,130,246,0.06)",
    colBg:      "rgba(59,130,246,0.025)",
    colBorder:  "rgba(59,130,246,0.18)",
  },
  doing: {
    accent:     "#F59E0B",
    accentDim:  "#FBBF24",
    badgeBg:    "rgba(245,158,11,0.18)",
    headerBg:   "rgba(245,158,11,0.06)",
    colBg:      "rgba(245,158,11,0.025)",
    colBorder:  "rgba(245,158,11,0.18)",
  },
  done: {
    accent:     "#10B981",
    accentDim:  "#34D399",
    badgeBg:    "rgba(16,185,129,0.18)",
    headerBg:   "rgba(16,185,129,0.06)",
    colBg:      "rgba(16,185,129,0.025)",
    colBorder:  "rgba(16,185,129,0.18)",
  },
};

const frontendStatus = (backendVal: string) => {
  if (backendVal === "Ready") return "todo";
  return backendVal.toLowerCase();
};

const energyBorderColor = (energy: "High" | "Low") =>
  energy === "High" ? "#7C3AED" : "#3B82F6";

// ─── Subtask Card ─────────────────────────────────────────────────────────────

const SubtaskCard = ({
  subtask,
  index,
  colId,
  onApprove,
  onDelete,
}: {
  subtask: Subtask;
  index: number;
  colId: string;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const isDone    = subtask.subtask_status === "Done";
  const isPending = subtask.is_approved === false;
  const border    = energyBorderColor(subtask.energy_level);

  return (
    <Draggable draggableId={subtask.subtask_id} index={index} isDragDisabled={isPending}>
      {(provided, snapshot) => (
        <motion.div
          ref={provided.innerRef as any}
          {...(provided.draggableProps as any)}
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="mb-2"
          style={{ ...provided.draggableProps.style }}
        >
          <motion.div
            whileHover={snapshot.isDragging ? {} : { y: -2, boxShadow: "var(--card-shadow-hover)" }}
            transition={{ duration: 0.2 }}
            className="relative group"
            style={{
              borderRadius: "0.75rem",
              padding: "0.75rem 0.75rem 0.75rem 1rem",
              background: snapshot.isDragging
                ? "hsl(var(--accent))"
                : isPending
                ? "hsl(var(--primary) / 0.06)"
                : "hsl(var(--card))",
              border: snapshot.isDragging
                ? "1px solid hsl(var(--primary) / 0.5)"
                : isPending
                ? "1px solid hsl(var(--primary) / 0.25)"
                : "1px solid hsl(var(--border) / 0.55)",
              borderLeft: `3px solid ${isPending ? "#7C3AED" : isDone ? "#10B981" : border}`,
              boxShadow: snapshot.isDragging ? "0 16px 48px rgba(0,0,0,0.4)" : "var(--card-shadow)",
              opacity: isDone ? 0.55 : 1,
            }}
          >
            <div className="flex items-start gap-2">
              {/* Drag handle / pending approve */}
              {isPending ? (
                <button
                  onClick={() => onApprove(subtask.subtask_id)}
                  title="Approve and add to board"
                  className="mt-0.5 w-4 h-4 rounded border border-violet-400/50 flex items-center justify-center text-violet-400 hover:bg-violet-500/20 shrink-0 transition-colors"
                >
                  <Check className="w-2.5 h-2.5" />
                </button>
              ) : (
                <div
                  {...(provided.dragHandleProps as any)}
                  className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing transition-opacity opacity-0 group-hover:opacity-40 hover:!opacity-70"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium leading-snug ${
                  isPending ? "text-violet-300/70 italic" : isDone ? "line-through text-muted-foreground" : "text-foreground/90"
                }`}>
                  {subtask.subtask_name}
                  {isPending && <span className="ml-2 text-[10px] text-violet-400/60 not-italic">AI · tap ✓ to approve</span>}
                </p>

                <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold uppercase mt-1.5 px-1.5 py-0.5 rounded-full
                  ${subtask.energy_level === "High"
                    ? "bg-primary/10 text-primary/80"
                    : "bg-blue-500/10 text-blue-400"}`}
                >
                  {subtask.energy_level === "High" ? <Zap className="w-2 h-2" /> : <Leaf className="w-2 h-2" />}
                  {subtask.energy_level}
                </span>
              </div>

              {/* Delete */}
              <button
                onClick={() => onDelete(subtask.subtask_id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground/40 hover:text-red-400 transition-all rounded shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </Draggable>
  );
};

// ─── Task Board Page ──────────────────────────────────────────────────────────

const TaskBoard = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { addScore } = useFocusScore();
  const prefersReducedMotion = useReducedMotion();

  const [task, setTask] = useState<TaskMeta | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [isLoadingTask, setIsLoadingTask] = useState(true);
  const [isLoadingSubtasks, setIsLoadingSubtasks] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [blockMsg, setBlockMsg] = useState("");

  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [newSubtaskName, setNewSubtaskName] = useState("");
  const [newSubtaskEnergy, setNewSubtaskEnergy] = useState<"High" | "Low">("Low");

  const fetchTask = useCallback(async () => {
    if (!taskId) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) { navigate("/tasks"); return; }
      const t = await res.json();
      setTask({
        id: t.task_id,
        name: t.task_name,
        energy: t.energy_level?.toLowerCase() as "high" | "low",
        column: t.task_status === "Ready" ? "todo" : t.task_status?.toLowerCase(),
        due_date: t.due_date,
        notes: t.notes,
      });
    } catch {
      navigate("/tasks");
    } finally {
      setIsLoadingTask(false);
    }
  }, [taskId, navigate]);

  const fetchSubtasks = useCallback(async () => {
    if (!taskId) return;
    setIsLoadingSubtasks(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`);
      if (res.ok) setSubtasks(await res.json());
    } catch {
      toast.error("Failed to load subtasks");
    } finally {
      setIsLoadingSubtasks(false);
    }
  }, [taskId]);

  useEffect(() => { fetchTask(); fetchSubtasks(); }, [fetchTask, fetchSubtasks]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const destColId = destination.droppableId;
    const targetCol = columns.find((c) => c.id === destColId);
    if (!targetCol) return;

    if (destColId === "doing") {
      const alreadyDoing = subtasks.find((s) => s.subtask_status === "Doing" && s.subtask_id !== draggableId);
      if (alreadyDoing) {
        setBlockMsg(`Already focused on "${alreadyDoing.subtask_name}" — finish it first.`);
        setTimeout(() => setBlockMsg(""), 3000);
        return;
      }
    }

    if (destColId === "done" && source.droppableId !== "done") {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ["#7C3AED", "#8B5CF6", "#A78BFA", "#10B981"] });
      addScore(5);
    }

    setSubtasks((prev) =>
      prev.map((s) => s.subtask_id === draggableId ? { ...s, subtask_status: targetCol.backendValue } : s)
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks/${draggableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtask_status: targetCol.backendValue }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move subtask");
      fetchSubtasks();
    }
  };

  const handleCreateSubtask = async (colId: string) => {
    if (!newSubtaskName.trim()) return;
    const col = columns.find((c) => c.id === colId);
    const tempId = `temp-${Date.now()}`;
    const tempSubtask: Subtask = {
      subtask_id: tempId,
      subtask_name: newSubtaskName.trim(),
      subtask_status: col?.backendValue ?? "Backlog",
      energy_level: newSubtaskEnergy,
      is_approved: true,
    };
    setSubtasks((prev) => [...prev, tempSubtask]);
    setNewSubtaskName("");
    setAddingIn(null);

    try {
      await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtask_name: newSubtaskName.trim(), energy_level: newSubtaskEnergy, is_approved: true }),
      });
      fetchSubtasks();
    } catch {
      toast.error("Failed to create subtask");
      setSubtasks((prev) => prev.filter((s) => s.subtask_id !== tempId));
    }
  };

  const handleApprove = async (subtaskId: string) => {
    setSubtasks((prev) => prev.map((s) => s.subtask_id === subtaskId ? { ...s, is_approved: true } : s));
    try {
      await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_approved: true }),
      });
    } catch {
      toast.error("Failed to approve subtask");
      fetchSubtasks();
    }
  };

  const handleDelete = async (subtaskId: string) => {
    setSubtasks((prev) => prev.filter((s) => s.subtask_id !== subtaskId));
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Failed to delete subtask");
      fetchSubtasks();
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks/generate`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      fetchSubtasks();
      toast.success("AI subtasks generated! Review and approve below.");
    } catch {
      toast.error("Failed to generate subtasks");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteTask = async () => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      toast.success("Task deleted");
      navigate("/tasks");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const handleStartSession = () => {
    if (taskId) localStorage.setItem("activeTaskId", taskId);
    navigate("/sessions");
  };

  if (isLoadingTask) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!task) return null;

  const approvedSubtasks = subtasks.filter((s) => s.is_approved !== false);
  const doneSubtasks     = subtasks.filter((s) => s.subtask_status === "Done");
  const donePct          = approvedSubtasks.length > 0 ? (doneSubtasks.length / approvedSubtasks.length) * 100 : 0;

  return (
    <div className="h-full flex flex-col pb-20 md:pb-0 relative">

      {/* ── Background orbs ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Purple blob — top-left */}
        <motion.div
          animate={prefersReducedMotion ? {} : {
            x: [0, 30, 0], y: [0, 20, 0], scale: [1, 1.06, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-24 w-96 h-96 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        {/* Teal blob — bottom-right */}
        <motion.div
          animate={prefersReducedMotion ? {} : {
            x: [0, -25, 0], y: [0, -20, 0], scale: [1, 1.04, 1],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute -bottom-32 -right-24 w-96 h-96 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        {/* Grain */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.02]">
          <filter id="board-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#board-grain)" />
        </svg>
      </div>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 shrink-0 mb-6"
      >
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate("/tasks")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground/50 hover:text-foreground transition-colors duration-300"
          >
            <ArrowLeft className="w-4 h-4" /> Tasks
          </button>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title with animated underline */}
            <div className="relative inline-block">
              <h1 className="text-2xl font-bold text-foreground truncate">{task.name}</h1>
              <motion.div
                className="absolute bottom-0 left-0 h-[2px] rounded-full"
                style={{ background: "linear-gradient(90deg, hsl(var(--primary)), transparent)" }}
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
              />
            </div>

            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {/* Energy badge */}
              <span className={`flex items-center gap-1 text-[10px] tracking-wide uppercase font-bold px-2.5 py-1 rounded-full
                ${task.energy === "high"
                  ? "bg-primary/10 text-primary/80 ring-1 ring-primary/20"
                  : "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20"}`}
              >
                {task.energy === "high" ? <Zap className="w-3 h-3" /> : <Leaf className="w-3 h-3" />}
                {task.energy === "high" ? "High Energy" : "Low Energy"}
              </span>

              {task.column === "doing" && (
                <button
                  onClick={handleStartSession}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all"
                  style={{ background: "rgba(124,58,237,0.15)", color: "#A78BFA", border: "1px solid rgba(124,58,237,0.3)" }}
                >
                  <Play className="w-3 h-3 fill-current" /> Start Session
                </button>
              )}

              {/* Progress mini-bar */}
              {approvedSubtasks.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-24 h-[3px] rounded-full bg-border/30 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary-bright)))" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${donePct}%` }}
                      transition={{ duration: 1, ease: [0.4, 0, 0.2, 1], delay: 0.5 }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground/50 font-mono">
                    {doneSubtasks.length}/{approvedSubtasks.length} done
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* AI Generate button */}
            <motion.button
              whileHover={prefersReducedMotion ? {} : {
                scale: 1.04,
                boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
              }}
              whileTap={{ scale: 0.97 }}
              onClick={handleGenerate}
              disabled={isGenerating}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(124,58,237,0.08))",
                color: "#A78BFA",
                border: "1px solid rgba(124,58,237,0.3)",
              }}
            >
              {/* Animated gradient border shimmer */}
              {!isGenerating && (
                <motion.div
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.15), transparent)",
                    backgroundSize: "200% 100%",
                  }}
                  animate={{ backgroundPosition: ["-100% 0", "200% 0"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                />
              )}
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {isGenerating ? "Generating…" : "AI Generate"}
            </motion.button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="p-2 text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border border-red-500/20 shadow-2xl sm:rounded-2xl max-w-sm">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground">Delete this task?</AlertDialogTitle>
                  <AlertDialogDescription className="text-red-400/80">
                    This will permanently delete the task and all its subtasks.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4">
                  <AlertDialogCancel className="bg-muted/50 text-foreground/70 border-border/30 hover:bg-muted hover:text-foreground">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteTask} className="bg-red-600 text-white hover:bg-red-700">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </motion.div>

      {/* ── Block message ── */}
      <AnimatePresence>
        {blockMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative z-10 p-3 rounded-xl mb-4 border-amber-500/30 border text-amber-400 text-sm font-medium shrink-0"
            style={{ background: "rgba(245,158,11,0.08)" }}
          >
            {blockMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Kanban Board ── */}
      <div className="relative z-10 flex-1 overflow-x-auto overflow-y-auto md:overflow-hidden">
        {isLoadingSubtasks ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex flex-col md:grid md:grid-cols-4 gap-3 h-full pb-6 md:pb-0 min-w-[300px] md:min-w-0">
              {columns.map((col, colIndex) => {
                const meta = columnMeta[col.id];
                const colSubtasks = subtasks.filter(
                  (s) => frontendStatus(s.subtask_status) === col.id
                );
                const approvedCount = colSubtasks.filter((s) => s.is_approved !== false).length;

                return (
                  <motion.div
                    key={col.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: colIndex * 0.07, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    className="flex flex-col h-auto min-h-[200px] md:h-full"
                    style={{
                      borderRadius: "0.875rem",
                      background: meta.colBg,
                      border: `1px solid ${meta.colBorder}`,
                      borderTop: `3px solid ${meta.accent}`,
                      overflow: "hidden",
                    }}
                  >
                    {/* Column header */}
                    <div
                      className="flex items-center justify-between px-3 py-3 shrink-0"
                      style={{ background: meta.headerBg, borderBottom: `1px solid ${meta.colBorder}` }}
                    >
                      <h2
                        className="text-xs font-bold tracking-wide uppercase"
                        style={{ color: meta.accentDim }}
                      >
                        {col.label}
                      </h2>
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums"
                        style={{ background: meta.badgeBg, color: meta.accentDim }}
                      >
                        {approvedCount}
                      </span>
                    </div>

                    {/* Droppable */}
                    <Droppable droppableId={col.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="flex-1 p-2 transition-colors md:overflow-y-auto"
                          style={{
                            background: snapshot.isDraggingOver
                              ? `${meta.accent}10`
                              : "transparent",
                            outline: snapshot.isDraggingOver
                              ? `2px solid ${meta.accent}30`
                              : "none",
                            outlineOffset: "-2px",
                            borderRadius: "0 0 0.75rem 0.75rem",
                          }}
                        >
                          {colSubtasks.map((st, idx) => (
                            <SubtaskCard
                              key={st.subtask_id}
                              subtask={st}
                              index={idx}
                              colId={col.id}
                              onApprove={handleApprove}
                              onDelete={handleDelete}
                            />
                          ))}
                          {provided.placeholder}

                          {/* Empty state */}
                          {colSubtasks.length === 0 && !snapshot.isDraggingOver && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.3 }}
                              className="flex flex-col items-center justify-center py-8 text-center"
                            >
                              {col.id === "done" ? (
                                <>
                                  <motion.div
                                    animate={prefersReducedMotion ? {} : { y: [0, -4, 0] }}
                                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                  >
                                    <Trophy className="w-7 h-7 mb-2" style={{ color: `${meta.accent}50` }} />
                                  </motion.div>
                                  <p className="text-[10px] font-medium" style={{ color: `${meta.accent}60` }}>
                                    Completions will appear here 🏆
                                  </p>
                                </>
                              ) : col.id === "doing" ? (
                                <>
                                  <div
                                    className="relative w-8 h-8 rounded-lg mb-2 flex items-center justify-center"
                                    style={{ border: `1.5px dashed ${meta.accent}50` }}
                                  >
                                    {!prefersReducedMotion && (
                                      <motion.div
                                        className="absolute inset-0 rounded-lg"
                                        animate={{ boxShadow: [`0 0 0 0 ${meta.accent}40`, `0 0 0 6px ${meta.accent}00`] }}
                                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                                      />
                                    )}
                                  </div>
                                  <p className="text-[10px] font-medium" style={{ color: `${meta.accent}60` }}>
                                    Drag a task here 🎯
                                  </p>
                                </>
                              ) : (
                                <>
                                  <div
                                    className="w-7 h-7 rounded-lg mb-2"
                                    style={{ border: `1.5px dashed ${meta.accent}40` }}
                                  />
                                  <p className="text-[10px] font-medium" style={{ color: `${meta.accent}50` }}>
                                    {col.id === "backlog" ? "No subtasks yet" : "Nothing queued"}
                                  </p>
                                </>
                              )}
                            </motion.div>
                          )}
                        </div>
                      )}
                    </Droppable>

                    {/* Add subtask */}
                    <div className="p-2 shrink-0" style={{ borderTop: `1px solid ${meta.colBorder}` }}>
                      {addingIn === col.id ? (
                        <div className="flex flex-col gap-2">
                          <input
                            autoFocus
                            value={newSubtaskName}
                            onChange={(e) => setNewSubtaskName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCreateSubtask(col.id);
                              if (e.key === "Escape") { setAddingIn(null); setNewSubtaskName(""); }
                            }}
                            placeholder="Subtask name…"
                            className="text-xs rounded-lg px-3 py-2 outline-none text-foreground placeholder:text-muted-foreground/40 w-full"
                            style={{
                              background: "hsl(var(--muted) / 0.5)",
                              border: `1px solid ${meta.accent}55`,
                            }}
                          />
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1 flex-1">
                              <button
                                onClick={() => setNewSubtaskEnergy("Low")}
                                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-semibold transition-colors ${newSubtaskEnergy === "Low" ? "bg-blue-500/20 text-blue-400" : "text-muted-foreground hover:text-foreground"}`}
                              >
                                <Leaf className="w-3 h-3" /> Low
                              </button>
                              <button
                                onClick={() => setNewSubtaskEnergy("High")}
                                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-semibold transition-colors ${newSubtaskEnergy === "High" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                              >
                                <Zap className="w-3 h-3" /> High
                              </button>
                            </div>
                            <button onClick={() => handleCreateSubtask(col.id)} className="p-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { setAddingIn(null); setNewSubtaskName(""); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddingIn(col.id); setNewSubtaskName(""); }}
                          className="flex items-center gap-1.5 text-[11px] px-2 py-1.5 rounded-lg w-full transition-colors duration-200"
                          style={{ color: `${meta.accent}70` }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${meta.accent}10`; (e.currentTarget as HTMLElement).style.color = meta.accentDim; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = `${meta.accent}70`; }}
                        >
                          <Plus className="w-3.5 h-3.5" /> Add subtask
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </div>
    </div>
  );
};

export default TaskBoard;
