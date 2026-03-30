import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Plus, X, Loader2,
  Pencil, Trash2, AlertTriangle, Ban, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useFocusScore } from "@/context/FocusScoreContext";
import { useTheme } from "@/context/ThemeContext";
import confetti from "canvas-confetti";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  name: string;
  priority?: "high" | "low";
  tags?: string[];
  notes?: string;
  column: string;
  subtasks: number;
  subtasksDone: number;
  isBlocked?: boolean;
}

// ─── Progress State System ────────────────────────────────────────────────────

type ProgressState = "not_started" | "in_progress" | "almost_done" | "done" | "blocked";

function getProgressState(task: Task): ProgressState {
  if (task.isBlocked) return "blocked";
  const pct = task.subtasks > 0 ? (task.subtasksDone / task.subtasks) * 100 : 0;
  if (task.column === "done" || pct >= 100) return "done";
  if (pct >= 75) return "almost_done";
  if (pct > 0) return "in_progress";
  return "not_started";
}

const STATE_LABELS: Record<ProgressState, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  almost_done: "Almost done",
  done: "Done",
  blocked: "Blocked",
};

interface StateColors {
  border: string;
  fill: string;
  pillBg: string;
  pillText: string;
  cardBg: string;
  cardBorder: string;
  opacity?: number;
}

const DARK_STATE_COLORS: Record<ProgressState, StateColors> = {
  not_started: { border: "rgba(255,255,255,0.15)", fill: "rgba(255,255,255,0.18)", pillBg: "rgba(255,255,255,0.06)", pillText: "rgba(255,255,255,0.30)", cardBg: "#1e1c2e", cardBorder: "rgba(255,255,255,0.07)" },
  in_progress:  { border: "#7c6ff7", fill: "#7c6ff7", pillBg: "rgba(124,111,247,0.15)", pillText: "#a89cf7", cardBg: "#1c1a2e", cardBorder: "rgba(124,111,247,0.25)" },
  almost_done:  { border: "#EF9F27", fill: "#EF9F27", pillBg: "rgba(239,159,39,0.15)", pillText: "#EF9F27", cardBg: "#1e1c18", cardBorder: "rgba(239,159,39,0.20)" },
  done:         { border: "#1D9E75", fill: "#1D9E75", pillBg: "rgba(29,158,117,0.15)", pillText: "#5DCAA5", cardBg: "#141e1c", cardBorder: "rgba(29,158,117,0.20)", opacity: 0.70 },
  blocked:      { border: "#D85A30", fill: "#D85A30", pillBg: "rgba(216,90,48,0.15)", pillText: "#f0997b", cardBg: "#1e1712", cardBorder: "rgba(216,90,48,0.25)" },
};

const LIGHT_STATE_COLORS: Record<ProgressState, StateColors> = {
  not_started: { border: "#c8c6d4", fill: "#d4d2e0", pillBg: "#f0eff8", pillText: "#8884a8", cardBg: "#ffffff", cardBorder: "#e8e6f0" },
  in_progress:  { border: "#7c6ff7", fill: "#7c6ff7", pillBg: "#eeecfe", pillText: "#534AB7", cardBg: "#faf9ff", cardBorder: "#d4d0f5" },
  almost_done:  { border: "#BA7517", fill: "#EF9F27", pillBg: "#faeeda", pillText: "#854F0B", cardBg: "#fefcf5", cardBorder: "#f5e0b0" },
  done:         { border: "#0F6E56", fill: "#1D9E75", pillBg: "#e1f5ee", pillText: "#0F6E56", cardBg: "#f5fdf9", cardBorder: "#b0e5d0", opacity: 0.65 },
  blocked:      { border: "#993C1D", fill: "#D85A30", pillBg: "#faece7", pillText: "#993C1D", cardBg: "#fff8f5", cardBorder: "#f5c4b3" },
};

// ─── Columns ──────────────────────────────────────────────────────────────────

const COLUMNS = [
  { id: "backlog", label: "Backlog", darkDot: "rgba(255,255,255,0.22)", lightDot: "#c8c6d4" },
  { id: "todo",    label: "To Do",   darkDot: "#7c6ff7",                lightDot: "#7c6ff7" },
  { id: "doing",   label: "Doing",   darkDot: "#EF9F27",                lightDot: "#BA7517" },
  { id: "done",    label: "Done",    darkDot: "#1D9E75",                lightDot: "#0F6E56" },
] as const;
type ColumnId = typeof COLUMNS[number]["id"];

// ─── TaskCard ─────────────────────────────────────────────────────────────────

const TaskCard = ({
  task,
  isLight,
  onNavigate,
  onToggleBlocked,
  onEdit,
  onDelete,
  index,
}: {
  task: Task & { isBlocked?: boolean };
  isLight: boolean;
  onNavigate: (id: string) => void;
  onToggleBlocked: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  index: number;
}) => {
  const progressState = getProgressState({ ...task, isBlocked: task.isBlocked ?? false });
  const colors = isLight ? LIGHT_STATE_COLORS[progressState] : DARK_STATE_COLORS[progressState];
  const progress = task.subtasks > 0 ? (task.subtasksDone / task.subtasks) * 100 : 0;

  const prevStateRef = useRef<ProgressState | null>(null);
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (prevStateRef.current && prevStateRef.current !== "almost_done" && progressState === "almost_done") {
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), 400);
      return () => clearTimeout(t);
    }
    prevStateRef.current = progressState;
  }, [progressState]);

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("click", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", esc);
    };
  }, [ctxMenu]);

  const isDone = progressState === "done";
  const visibleTags = (task.tags ?? []).slice(0, 2);

  return (
    <>
      <motion.div
        layout
        layoutId={`task-${task.id}`}
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={pulsing
          ? { opacity: colors.opacity ?? 1, y: 0, scale: [1, 1.02, 1] as unknown as number }
          : { opacity: colors.opacity ?? 1, y: 0, scale: 1 }
        }
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ delay: index * 0.04, duration: pulsing ? 0.3 : 0.2, ease: [0.4, 0, 0.2, 1] }}
        whileHover={isDone ? {} : { y: -2, boxShadow: isLight ? "0 4px 16px rgba(83,74,183,0.10)" : "0 4px 16px rgba(0,0,0,0.3)" }}
        onClick={() => onNavigate(task.id)}
        onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY }); }}
        className="cursor-pointer group relative rounded-xl overflow-hidden select-none"
        style={{
          padding: "12px 12px 12px 15px",
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderLeft: `3px solid ${colors.border}`,
        }}
      >
        {/* Title */}
        <p style={{
          fontSize: 13, fontWeight: 500, lineHeight: "1.4", marginBottom: 10,
          textDecoration: isDone ? "line-through" : "none",
          color: isDone
            ? (isLight ? "#a0a0a8" : "rgba(255,255,255,0.38)")
            : (isLight ? "#1a1830" : "rgba(255,255,255,0.88)"),
        }}>
          {task.name}
        </p>

        {/* Chip row: priority + tags + state pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {/* Priority chip */}
          {task.priority && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
              background: task.priority === "high"
                ? (isLight ? "rgba(124,58,237,0.10)" : "rgba(124,58,237,0.12)")
                : (isLight ? "rgba(100,116,139,0.10)" : "rgba(100,116,139,0.12)"),
              color: task.priority === "high"
                ? (isLight ? "#534AB7" : "#a89cf7")
                : (isLight ? "#64748b" : "rgba(255,255,255,0.42)"),
            }}>
              {task.priority === "high" ? "High" : "Low"}
            </span>
          )}

          {/* Tags (max 2) */}
          {visibleTags.map((tag) => (
            <span key={tag} style={{
              fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
              background: isLight ? "rgba(83,74,183,0.07)" : "rgba(255,255,255,0.06)",
              color: isLight ? "rgba(83,74,183,0.65)" : "rgba(255,255,255,0.38)",
            }}>
              {tag}
            </span>
          ))}

          {/* State pill */}
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
            background: colors.pillBg, color: colors.pillText,
            display: "inline-flex", alignItems: "center", gap: 3,
          }}>
            {progressState === "blocked" && <AlertTriangle style={{ width: 9, height: 9 }} />}
            {STATE_LABELS[progressState]}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 4, borderRadius: 2,
          background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)",
          marginBottom: task.subtasks > 0 ? 8 : 0, overflow: "hidden",
        }}>
          <motion.div
            style={{ height: "100%", borderRadius: 2, background: colors.fill }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Count row */}
        {task.subtasks > 0 && (
          <p style={{
            fontSize: 10,
            color: isLight ? "rgba(26,24,48,0.38)" : "rgba(255,255,255,0.28)",
          }}>
            {task.subtasksDone}/{task.subtasks} subtasks
          </p>
        )}
      </motion.div>

      {/* Context menu */}
      {ctxMenu && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.12 }}
          className="fixed z-50 rounded-xl overflow-hidden shadow-2xl"
          style={{
            left: Math.min(ctxMenu.x, window.innerWidth - 180),
            top: Math.min(ctxMenu.y, window.innerHeight - 240),
            background: isLight ? "#fff" : "rgba(30,28,46,0.97)",
            border: isLight ? "1px solid rgba(83,74,183,0.15)" : "1px solid rgba(255,255,255,0.09)",
            minWidth: 168,
            backdropFilter: "blur(16px)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors"
            style={{ fontSize: 13, color: isLight ? "#1a1830" : "rgba(255,255,255,0.75)" }}
            onMouseEnter={e => (e.currentTarget.style.background = isLight ? "rgba(83,74,183,0.06)" : "rgba(124,111,247,0.12)")}
            onMouseLeave={e => (e.currentTarget.style.background = "")}
            onClick={() => { setCtxMenu(null); onNavigate(task.id); }}>
            Open subtasks
          </button>

          <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors"
            style={{ fontSize: 13, color: isLight ? "#1a1830" : "rgba(255,255,255,0.75)" }}
            onMouseEnter={e => (e.currentTarget.style.background = isLight ? "rgba(83,74,183,0.06)" : "rgba(124,111,247,0.12)")}
            onMouseLeave={e => (e.currentTarget.style.background = "")}
            onClick={(e) => { e.stopPropagation(); setCtxMenu(null); onEdit(task); }}>
            <Pencil style={{ width: 13, height: 13 }} /> Edit task
          </button>

          <div style={{ height: "0.5px", background: isLight ? "rgba(83,74,183,0.10)" : "rgba(255,255,255,0.07)", margin: "2px 0" }} />

          <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors"
            style={{ fontSize: 13, color: task.isBlocked ? "#5DCAA5" : "#f0997b" }}
            onMouseEnter={e => (e.currentTarget.style.background = task.isBlocked ? "rgba(29,158,117,0.12)" : "rgba(216,90,48,0.12)")}
            onMouseLeave={e => (e.currentTarget.style.background = "")}
            onClick={(e) => { e.stopPropagation(); setCtxMenu(null); onToggleBlocked(task.id); }}>
            {task.isBlocked
              ? <><CheckCircle2 style={{ width: 13, height: 13 }} /> Unblock task</>
              : <><Ban style={{ width: 13, height: 13 }} /> Mark as blocked</>}
          </button>

          <div style={{ height: "0.5px", background: isLight ? "rgba(83,74,183,0.10)" : "rgba(255,255,255,0.07)", margin: "2px 0" }} />

          <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors"
            style={{ fontSize: 13, color: "#f87171" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(248,113,113,0.12)")}
            onMouseLeave={e => (e.currentTarget.style.background = "")}
            onClick={(e) => { e.stopPropagation(); setCtxMenu(null); setShowDeleteConfirm(true); }}>
            <Trash2 style={{ width: 13, height: 13 }} /> Delete task
          </button>
        </motion.div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-card border border-red-500/20 shadow-2xl sm:rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete &ldquo;{task.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription className="text-red-400/80">This will permanently delete the task and all its subtasks.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(task)} className="bg-red-600 text-white hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ─── SortableTaskCard ─────────────────────────────────────────────────────────

const SortableTaskCard = ({
  task,
  isLight,
  onNavigate,
  onToggleBlocked,
  onEdit,
  onDelete,
  index,
}: {
  task: Task & { isBlocked?: boolean };
  isLight: boolean;
  onNavigate: (id: string) => void;
  onToggleBlocked: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  index: number;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
    >
      <TaskCard
        task={task}
        isLight={isLight}
        onNavigate={onNavigate}
        onToggleBlocked={onToggleBlocked}
        onEdit={onEdit}
        onDelete={onDelete}
        index={index}
      />
    </div>
  );
};

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

const KanbanColumn = ({
  colId,
  label,
  dotColor,
  tasks,
  isLight,
  onNavigate,
  onToggleBlocked,
  onEdit,
  onDelete,
  onInlineAdd,
}: {
  colId: string;
  label: string;
  dotColor: string;
  tasks: (Task & { isBlocked?: boolean })[];
  isLight: boolean;
  onNavigate: (id: string) => void;
  onToggleBlocked: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onInlineAdd: (colId: string) => void;
}) => {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: colId });
  return (
    <div style={{
      display: "flex", flexDirection: "column", flex: 1, minWidth: 0,
      borderRadius: 16,
      background: isLight ? "rgba(240,238,255,0.40)" : "rgba(255,255,255,0.025)",
      border: isLight ? "1px solid rgba(83,74,183,0.12)" : "1px solid rgba(255,255,255,0.05)",
    }}>
      {/* Column header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
          <span style={{
            fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
            color: isLight ? "rgba(83,74,183,0.55)" : "rgba(255,255,255,0.32)",
          }}>
            {label}
          </span>
          <span style={{
            fontSize: 11,
            color: isLight ? "rgba(83,74,183,0.38)" : "rgba(255,255,255,0.22)",
          }}>
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onInlineAdd(colId)}
          style={{
            width: 24, height: 24, borderRadius: 7,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: isLight ? "rgba(83,74,183,0.40)" : "rgba(255,255,255,0.22)",
            background: "transparent", border: "none", cursor: "pointer",
            transition: "background 0.12s, color 0.12s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = isLight ? "rgba(83,74,183,0.08)" : "rgba(255,255,255,0.08)";
            (e.currentTarget as HTMLElement).style.color = isLight ? "#534AB7" : "rgba(255,255,255,0.65)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = isLight ? "rgba(83,74,183,0.40)" : "rgba(255,255,255,0.22)";
          }}
        >
          <Plus style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Droppable + cards */}
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setDropRef}
          style={{
            flex: 1, padding: "0 10px 10px", minHeight: 80,
            display: "flex", flexDirection: "column", gap: 8,
            borderRadius: "0 0 16px 16px",
            transition: "background 0.15s",
            background: isOver ? (isLight ? "rgba(83,74,183,0.05)" : "rgba(124,111,247,0.06)") : "transparent",
          }}
        >
          <AnimatePresence initial={false}>
            {tasks.map((task, i) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                isLight={isLight}
                onNavigate={onNavigate}
                onToggleBlocked={onToggleBlocked}
                onEdit={onEdit}
                onDelete={onDelete}
                index={i}
              />
            ))}
          </AnimatePresence>

          {tasks.length === 0 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              height: 64, borderRadius: 10,
              border: `1.5px dashed ${isLight ? "rgba(83,74,183,0.14)" : "rgba(255,255,255,0.07)"}`,
            }}>
              <span style={{
                fontSize: 11,
                color: isLight ? "rgba(83,74,183,0.32)" : "rgba(255,255,255,0.18)",
              }}>
                Drop here
              </span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

// ─── Tasks Page ───────────────────────────────────────────────────────────────

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [blockedTaskIds, setBlockedTaskIds] = useState<Set<string>>(new Set());
  const autoMovedRef = useRef<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [inlineAddCol, setInlineAddCol] = useState<string | null>(null);
  const [inlineValue, setInlineValue] = useState("");
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTask, setNewTask] = useState({ name: "", priority: "low" as "high" | "low", tags: "", notes: "" });

  const { addScore } = useFocusScore();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === "light";
  useReducedMotion();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setTasks(
        data.map((t: {
          task_id: string;
          task_name: string;
          task_status: string;
          total_subtasks: number;
          completed_subtasks: number;
          priority?: string;
          tags?: string[];
          notes?: string;
        }) => ({
          id: t.task_id,
          name: t.task_name,
          priority: (t.priority?.toLowerCase() ?? "low") as "high" | "low",
          tags: t.tags ?? [],
          notes: t.notes,
          column: t.task_status === "Ready" ? "todo" : t.task_status.toLowerCase(),
          subtasks: t.total_subtasks || 0,
          subtasksDone: t.completed_subtasks || 0,
        }))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Auto-move tasks to Done when subtasks reach 100%
  useEffect(() => {
    const candidates = tasks.filter(
      (t) =>
        !blockedTaskIds.has(t.id) &&
        t.subtasks > 0 &&
        t.subtasksDone === t.subtasks &&
        t.column !== "done" &&
        !autoMovedRef.current.has(t.id)
    );
    if (candidates.length === 0) return;
    candidates.forEach(async (task) => {
      autoMovedRef.current.add(task.id);
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, column: "done" } : t));
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ["#7C3AED", "#A78BFA", "#1D9E75"] });
      addScore(10);
      try {
        await fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task_status: "Done" }),
        });
      } catch {
        autoMovedRef.current.delete(task.id);
        fetchTasks();
      }
    });
  }, [tasks, blockedTaskIds, addScore, fetchTasks]);

  const handleToggleBlocked = (taskId: string) => {
    setBlockedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleDeleteTask = async (task: Task) => {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    try {
      await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
      fetchTasks();
    }
  };

  const handleDialogSave = async () => {
    if (editTask) {
      if (!editTask.name.trim()) return;
      const backendStatus = editTask.column === "todo" ? "Ready"
        : editTask.column.charAt(0).toUpperCase() + editTask.column.slice(1);
      try {
        await fetch(`/api/tasks/${editTask.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task_name: editTask.name.trim(),
            task_status: backendStatus,
            notes: editTask.notes || null,
          }),
        });
        setTasks(prev => prev.map(t =>
          t.id === editTask.id
            ? { ...t, name: editTask.name, priority: editTask.priority, tags: editTask.tags, notes: editTask.notes }
            : t
        ));
        toast.success("Task updated");
      } catch {
        toast.error("Failed to update task");
      }
      setEditTask(null);
    } else {
      if (!newTask.name.trim()) return;
      setShowAddDialog(false);
      const tagsArr = newTask.tags
        .split(",")
        .map(t => t.trim())
        .filter(Boolean);
      try {
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task_name: newTask.name.trim(),
            task_status: "Backlog",
            energy_level: newTask.priority === "high" ? "High" : "Low",
            ...(newTask.notes ? { notes: newTask.notes } : {}),
          }),
        });
        fetchTasks();
      } catch {
        toast.error("Failed to create task");
      }
      setNewTask({ name: "", priority: "low", tags: "", notes: "" });
    }
  };

  const commitInlineAdd = async () => {
    if (!inlineValue.trim()) { setInlineAddCol(null); return; }
    const name = inlineValue.trim();
    const currentCol = inlineAddCol;
    setInlineValue("");
    setInlineAddCol(null);
    const backendStatus = currentCol === "todo" ? "Ready"
      : currentCol ? currentCol.charAt(0).toUpperCase() + currentCol.slice(1)
      : "Backlog";
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_name: name, task_status: backendStatus }),
      });
      fetchTasks();
    } catch {
      toast.error("Failed to create task");
    }
  };

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overTask = tasks.find((t) => t.id === over.id);
    const targetColumn = overTask ? overTask.column : (over.id as string);

    if (activeTask.column !== targetColumn && (["backlog", "todo", "doing", "done"] as string[]).includes(targetColumn)) {
      setTasks((prev) => prev.map((t) => t.id === active.id ? { ...t, column: targetColumn } : t));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const movedTask = tasks.find((t) => t.id === active.id);
    if (!movedTask) return;

    const overTask = tasks.find((t) => t.id === over.id);
    const finalColumn = overTask ? overTask.column : (over.id as string);

    if (!(["backlog", "todo", "doing", "done"] as string[]).includes(finalColumn)) return;

    const statusMap: Record<string, string> = {
      backlog: "Backlog",
      todo: "Ready",
      doing: "Doing",
      done: "Done",
    };

    try {
      const res = await fetch(`/api/tasks/${movedTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_status: statusMap[finalColumn] }),
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        throw new Error(err.message || "Failed to update task");
      }
      if (finalColumn === "done" && movedTask.column !== "done") {
        confetti({ particleCount: 80, spread: 60, colors: ["#7C3AED", "#A78BFA", "#10B981"] });
        addScore(10);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move task");
      fetchTasks();
    }
  };

  const tasksWithBlocked = tasks.map((t) => ({ ...t, isBlocked: blockedTaskIds.has(t.id) }));

  const isDialogOpen = showAddDialog || editTask !== null;

  // Helper for dialog field value
  const dialogName = editTask ? editTask.name : newTask.name;
  const dialogPriority = editTask ? (editTask.priority ?? "low") : newTask.priority;
  const dialogTags = editTask ? (editTask.tags ?? []).join(", ") : newTask.tags;
  const dialogNotes = editTask ? (editTask.notes ?? "") : newTask.notes;

  const setDialogName = (v: string) => editTask
    ? setEditTask({ ...editTask, name: v })
    : setNewTask(n => ({ ...n, name: v }));
  const setDialogPriority = (v: "high" | "low") => editTask
    ? setEditTask({ ...editTask, priority: v })
    : setNewTask(n => ({ ...n, priority: v }));
  const setDialogTags = (v: string) => editTask
    ? setEditTask({ ...editTask, tags: v.split(",").map(t => t.trim()).filter(Boolean) })
    : setNewTask(n => ({ ...n, tags: v }));
  const setDialogNotes = (v: string) => editTask
    ? setEditTask({ ...editTask, notes: v })
    : setNewTask(n => ({ ...n, notes: v }));

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 0 20px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: isLight ? "#1a1830" : "rgba(255,255,255,0.90)" }}>
            Tasks
          </h2>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
            background: isLight ? "rgba(83,74,183,0.10)" : "rgba(124,111,247,0.15)",
            color: isLight ? "#534AB7" : "#a89cf7",
            border: isLight ? "1px solid rgba(83,74,183,0.18)" : "1px solid rgba(124,111,247,0.25)",
          }}>
            {tasksWithBlocked.length} task{tasksWithBlocked.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAddDialog(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600,
              background: "#7c6ff7", color: "#fff", border: "none", cursor: "pointer",
              boxShadow: "0 4px 16px rgba(124,111,247,0.35)",
            }}>
            <Plus style={{ width: 15, height: 15 }} /> Add Task
          </motion.button>
        </div>
      </div>

      {/* Board */}
      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
          <Loader2 style={{ width: 32, height: 32, color: "#7c6ff7" }} className="animate-spin" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div style={{ display: "flex", gap: 12, paddingBottom: 24, alignItems: "flex-start" }}>
            {COLUMNS.map((col) => {
              const colTasks = tasksWithBlocked.filter(t => t.column === col.id);
              return (
                <div key={col.id} style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                  <KanbanColumn
                    colId={col.id}
                    label={col.label}
                    dotColor={isLight ? col.lightDot : col.darkDot}
                    tasks={colTasks}
                    isLight={isLight}
                    onNavigate={id => navigate(`/tasks/${id}`)}
                    onToggleBlocked={handleToggleBlocked}
                    onEdit={task => setEditTask(task)}
                    onDelete={handleDeleteTask}
                    onInlineAdd={colId => { setInlineAddCol(colId); setInlineValue(""); }}
                  />
                  {/* Inline add input */}
                  <AnimatePresence>
                    {inlineAddCol === col.id && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        style={{ padding: "4px 10px 10px" }}
                      >
                        <input
                          autoFocus
                          value={inlineValue}
                          onChange={e => setInlineValue(e.target.value)}
                          placeholder="Task name… Enter to add"
                          onKeyDown={e => {
                            if (e.key === "Enter") commitInlineAdd();
                            if (e.key === "Escape") { setInlineAddCol(null); setInlineValue(""); }
                          }}
                          onBlur={() => setTimeout(() => { setInlineAddCol(null); setInlineValue(""); }, 150)}
                          style={{
                            width: "100%", padding: "10px 12px", borderRadius: 12, fontSize: 13,
                            background: isLight ? "#fff" : "rgba(255,255,255,0.07)",
                            border: `1px solid ${isLight ? "rgba(124,111,247,0.4)" : "rgba(124,111,247,0.5)"}`,
                            color: isLight ? "#1a1830" : "rgba(255,255,255,0.88)",
                            outline: "none",
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
            {activeId ? (() => {
              const t = tasksWithBlocked.find(t => t.id === activeId);
              return t ? (
                <div style={{ transform: "rotate(1.5deg) scale(1.03)" }}>
                  <TaskCard
                    task={t}
                    isLight={isLight}
                    onNavigate={() => {}}
                    onToggleBlocked={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    index={0}
                  />
                </div>
              ) : null;
            })() : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Add/Edit dialog modal */}
      <AnimatePresence>
        {isDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
            onClick={() => { setShowAddDialog(false); setEditTask(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: "100%", maxWidth: 420, borderRadius: 20, padding: 24,
                background: isLight ? "#fff" : "rgba(26,24,48,0.97)",
                border: isLight ? "1px solid rgba(83,74,183,0.18)" : "1px solid rgba(124,111,247,0.22)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
              }}
            >
              {/* Dialog title */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: isLight ? "#1a1830" : "rgba(255,255,255,0.92)" }}>
                  {editTask ? "Edit task" : "New task"}
                </span>
                <button
                  onClick={() => { setShowAddDialog(false); setEditTask(null); }}
                  style={{ padding: 4, borderRadius: 8, background: "none", border: "none", cursor: "pointer",
                    color: isLight ? "rgba(83,74,183,0.50)" : "rgba(255,255,255,0.35)" }}
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>

              {/* Form fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Title */}
                <input
                  autoFocus
                  value={dialogName}
                  onChange={e => setDialogName(e.target.value)}
                  placeholder="Task name"
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 12, fontSize: 14,
                    background: isLight ? "rgba(83,74,183,0.04)" : "rgba(255,255,255,0.06)",
                    border: isLight ? "1px solid rgba(83,74,183,0.18)" : "1px solid rgba(255,255,255,0.09)",
                    color: isLight ? "#1a1830" : "rgba(255,255,255,0.90)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onKeyDown={e => e.key === "Enter" && handleDialogSave()}
                />

                {/* Priority */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
                    color: isLight ? "rgba(83,74,183,0.55)" : "rgba(255,255,255,0.30)", marginBottom: 8 }}>
                    Priority
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["high", "low"] as const).map(p => {
                      const isSelected = dialogPriority === p;
                      return (
                        <button
                          key={p}
                          onClick={() => setDialogPriority(p)}
                          style={{
                            flex: 1, padding: "8px", borderRadius: 12, fontSize: 12, fontWeight: 500,
                            cursor: "pointer", transition: "all 0.12s",
                            background: isSelected
                              ? (p === "high" ? "rgba(124,111,247,0.20)" : "rgba(100,116,139,0.12)")
                              : (isLight ? "rgba(83,74,183,0.04)" : "rgba(255,255,255,0.04)"),
                            border: isSelected
                              ? (p === "high" ? "1px solid rgba(124,111,247,0.45)" : "1px solid rgba(100,116,139,0.35)")
                              : (isLight ? "1px solid rgba(83,74,183,0.12)" : "1px solid rgba(255,255,255,0.08)"),
                            color: isSelected
                              ? (p === "high" ? "#a89cf7" : (isLight ? "#64748b" : "rgba(255,255,255,0.55)"))
                              : (isLight ? "rgba(83,74,183,0.55)" : "rgba(255,255,255,0.38)"),
                          }}
                        >
                          {p === "high" ? "High" : "Low"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
                    color: isLight ? "rgba(83,74,183,0.55)" : "rgba(255,255,255,0.30)", marginBottom: 8 }}>
                    Tags
                  </p>
                  <input
                    value={dialogTags}
                    onChange={e => setDialogTags(e.target.value)}
                    placeholder="design, backend, urgent…"
                    style={{
                      width: "100%", padding: "8px 14px", borderRadius: 12, fontSize: 13,
                      background: isLight ? "rgba(83,74,183,0.04)" : "rgba(255,255,255,0.06)",
                      border: isLight ? "1px solid rgba(83,74,183,0.18)" : "1px solid rgba(255,255,255,0.09)",
                      color: isLight ? "#1a1830" : "rgba(255,255,255,0.90)",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Notes */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
                    color: isLight ? "rgba(83,74,183,0.55)" : "rgba(255,255,255,0.30)", marginBottom: 8 }}>
                    Notes
                  </p>
                  <textarea
                    value={dialogNotes}
                    onChange={e => setDialogNotes(e.target.value)}
                    placeholder="Optional notes…"
                    rows={3}
                    style={{
                      width: "100%", padding: "8px 14px", borderRadius: 12, fontSize: 13,
                      background: isLight ? "rgba(83,74,183,0.04)" : "rgba(255,255,255,0.06)",
                      border: isLight ? "1px solid rgba(83,74,183,0.18)" : "1px solid rgba(255,255,255,0.09)",
                      color: isLight ? "#1a1830" : "rgba(255,255,255,0.90)",
                      outline: "none",
                      resize: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
                <button
                  onClick={() => { setShowAddDialog(false); setEditTask(null); }}
                  style={{ padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                    background: "none", border: "none", cursor: "pointer",
                    color: isLight ? "rgba(83,74,183,0.55)" : "rgba(255,255,255,0.40)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDialogSave}
                  disabled={!dialogName.trim()}
                  style={{
                    padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: "#7c6ff7", color: "#fff", border: "none", cursor: "pointer",
                    opacity: dialogName.trim() ? 1 : 0.4,
                    transition: "opacity 0.15s",
                  }}
                >
                  {editTask ? "Save changes" : "Create task"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tasks;
