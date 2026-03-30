import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowLeft, Zap, Leaf, Minus, Plus, Trash2, Sparkles,
  Loader2, Check, X, Pencil, Save, FileText,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
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
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { useFocusScore } from "@/context/FocusScoreContext";
import { useTheme } from "@/context/ThemeContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskMeta {
  id: string;
  name: string;
  column: string;
  notes?: string;
}

interface Subtask {
  subtask_id: string;
  subtask_name: string;
  subtask_status: string; // "Backlog" | "Ready" | "Doing" | "Done"
  energy_level: "High" | "Medium" | "Low";
  notes?: string;
  is_approved: boolean;
}

// ─── Column Definitions ───────────────────────────────────────────────────────

const COLUMNS = [
  { id: "backlog", label: "Backlog", backendValue: "Backlog", darkDot: "rgba(255,255,255,0.22)", lightDot: "#c8c6d4" },
  { id: "todo",    label: "To Do",   backendValue: "Ready",   darkDot: "#7c6ff7",                lightDot: "#7c6ff7" },
  { id: "doing",   label: "Doing",   backendValue: "Doing",   darkDot: "#EF9F27",                lightDot: "#BA7517" },
  { id: "done",    label: "Done",    backendValue: "Done",    darkDot: "#1D9E75",                lightDot: "#0F6E56" },
] as const;

function frontendStatus(backendVal: string): string {
  if (backendVal === "Ready") return "todo";
  return backendVal.toLowerCase();
}

// ─── Subtask Card ─────────────────────────────────────────────────────────────

const SubtaskCard = ({
  subtask,
  onApprove,
  onDelete,
  onFocus,
  isLight,
  index,
}: {
  subtask: Subtask;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  onFocus: (id: string) => void;
  isLight: boolean;
  index: number;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subtask.subtask_id,
  });
  const isPending = subtask.is_approved === false;
  const isDone = subtask.subtask_status === "Done";

  const energyColor = subtask.energy_level === "High"
    ? { bg: isLight ? "rgba(124,58,237,0.08)" : "rgba(124,58,237,0.12)", text: isLight ? "#534AB7" : "#a89cf7" }
    : subtask.energy_level === "Medium"
    ? { bg: isLight ? "rgba(239,159,39,0.08)" : "rgba(239,159,39,0.12)", text: isLight ? "#854F0B" : "#EF9F27" }
    : { bg: isLight ? "rgba(29,158,117,0.08)" : "rgba(29,158,117,0.12)", text: isLight ? "#0F6E56" : "#5DCAA5" };

  const energyIcon = subtask.energy_level === "High"
    ? <Zap style={{ width: 8, height: 8 }} />
    : subtask.energy_level === "Medium"
    ? <Minus style={{ width: 8, height: 8 }} />
    : <Leaf style={{ width: 8, height: 8 }} />;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: isDone ? 0.6 : 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ delay: index * 0.03, duration: 0.18 }}
        className="group"
        style={{
          borderRadius: 12,
          padding: "10px 12px",
          background: isLight ? "#ffffff" : "rgba(30,28,46,1)",
          border: isPending
            ? `1px solid ${isLight ? "rgba(124,111,247,0.22)" : "rgba(124,111,247,0.22)"}`
            : `1px solid ${isLight ? "rgba(83,74,183,0.09)" : "rgba(255,255,255,0.07)"}`,
          cursor: "grab",
          position: "relative",
          userSelect: "none" as const,
        }}
      >
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
          {isPending ? (
            <button
              onClick={(e) => { e.stopPropagation(); onApprove(subtask.subtask_id); }}
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                flexShrink: 0,
                marginTop: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(124,111,247,0.15)",
                border: "1px solid rgba(124,111,247,0.40)",
                cursor: "pointer",
              }}
            >
              <Check style={{ width: 9, height: 9, color: "#a89cf7" }} />
            </button>
          ) : null}

          <p
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: 500,
              lineHeight: "1.4",
              textDecoration: isDone ? "line-through" : "none",
              color: isPending
                ? "rgba(124,111,247,0.55)"
                : isDone
                  ? (isLight ? "#a0a0a8" : "rgba(255,255,255,0.38)")
                  : (isLight ? "#1a1830" : "rgba(255,255,255,0.88)"),
              fontStyle: isPending ? "italic" : "normal",
            }}
          >
            {subtask.subtask_name}
            {isPending && (
              <span style={{ fontSize: 10, marginLeft: 6, color: "rgba(124,111,247,0.55)", fontStyle: "normal" }}>
                AI · tap ✓ to approve
              </span>
            )}
          </p>
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Energy chip */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 20,
              background: energyColor.bg,
              color: energyColor.text,
            }}
          >
            {energyIcon}
            {subtask.energy_level}
          </span>

          {/* Notes hint */}
          {subtask.notes && (
            <FileText
              style={{
                width: 11,
                height: 11,
                color: isLight ? "rgba(83,74,183,0.38)" : "rgba(255,255,255,0.25)",
              }}
            />
          )}

          {/* Focus shortcut — only in Doing column */}
          {subtask.subtask_status === "Doing" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); onFocus(subtask.subtask_id); }}
                  className="opacity-0 group-hover:opacity-100"
                  style={{
                    marginLeft: "auto",
                    height: 26,
                    padding: "0 10px",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: `1px solid ${isLight ? "rgba(124,111,247,0.28)" : "rgba(124,111,247,0.28)"}`,
                    background: isLight ? "rgba(124,111,247,0.08)" : "rgba(124,111,247,0.14)",
                    color: isLight ? "#534AB7" : "#c4bbff",
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isLight ? "rgba(124,111,247,0.16)" : "rgba(124,111,247,0.24)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isLight ? "rgba(124,111,247,0.08)" : "rgba(124,111,247,0.14)";
                  }}
                >
                  Focus
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Start a session on this subtask</TooltipContent>
            </Tooltip>
          )}

          {/* Delete button */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(subtask.subtask_id); }}
            className="opacity-0 group-hover:opacity-100"
            style={{
              marginLeft: subtask.subtask_status === "Doing" ? 0 : "auto",
              padding: 3,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: isLight ? "rgba(83,74,183,0.35)" : "rgba(255,255,255,0.22)",
              transition: "color 0.12s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
            onMouseLeave={(e) => (e.currentTarget.style.color = isLight ? "rgba(83,74,183,0.35)" : "rgba(255,255,255,0.22)")}
          >
            <Trash2 style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Subtask Column ───────────────────────────────────────────────────────────

const SubtaskColumn = ({
  colId,
  label,
  dotColor,
  items,
  isLight,
  onApprove,
  onDelete,
  onFocus,
  onAddClick,
}: {
  colId: string;
  label: string;
  dotColor: string;
  items: Subtask[];
  isLight: boolean;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  onFocus: (id: string) => void;
  onAddClick: (colId: string) => void;
}) => {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `col-${colId}` });
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minWidth: 0,
        borderRadius: 16,
        background: isLight ? "rgba(240,238,255,0.40)" : "rgba(255,255,255,0.025)",
        border: isLight ? "1px solid rgba(83,74,183,0.10)" : "1px solid rgba(255,255,255,0.05)",
        minHeight: 200,
      }}
    >
      {/* Column header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 12px 8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor }} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: isLight ? "rgba(83,74,183,0.55)" : "rgba(255,255,255,0.32)",
            }}
          >
            {label}
          </span>
          <span style={{ fontSize: 11, color: isLight ? "rgba(83,74,183,0.35)" : "rgba(255,255,255,0.20)" }}>
            {items.filter((s) => s.is_approved !== false).length}
          </span>
        </div>
        <button
          onClick={() => onAddClick(colId)}
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            color: isLight ? "rgba(83,74,183,0.38)" : "rgba(255,255,255,0.20)",
          }}
        >
          <Plus style={{ width: 13, height: 13 }} />
        </button>
      </div>

      {/* Cards */}
      <SortableContext items={items.map((s) => s.subtask_id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setDropRef}
          style={{
            flex: 1,
            padding: "0 8px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            minHeight: 60,
            borderRadius: "0 0 16px 16px",
            transition: "background 0.15s",
            background: isOver ? (isLight ? "rgba(83,74,183,0.05)" : "rgba(124,111,247,0.06)") : "transparent",
          }}
        >
          <AnimatePresence initial={false}>
            {items.map((sub, i) => (
              <SubtaskCard
                key={sub.subtask_id}
                subtask={sub}
                index={i}
                isLight={isLight}
                onApprove={onApprove}
                onDelete={onDelete}
                onFocus={onFocus}
              />
            ))}
          </AnimatePresence>

          {/* Empty state */}
          {items.length === 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 50,
                borderRadius: 10,
                border: `1.5px dashed ${isLight ? "rgba(83,74,183,0.12)" : "rgba(255,255,255,0.07)"}`,
              }}
            >
              <span style={{ fontSize: 11, color: isLight ? "rgba(83,74,183,0.28)" : "rgba(255,255,255,0.15)" }}>
                Drop here
              </span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

// ─── Task Board Page ──────────────────────────────────────────────────────────

const TaskBoard = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { addScore } = useFocusScore();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const prefersReducedMotion = useReducedMotion();

  // ── Data state ──
  const [task, setTask] = useState<TaskMeta | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [isLoadingTask, setIsLoadingTask] = useState(true);
  const [blockMsg, setBlockMsg] = useState("");

  // ── Inline edit (parent task) ──
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editColumn, setEditColumn] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // ── Add Subtask dialog ──
  const [showSubtaskDialog, setShowSubtaskDialog] = useState(false);
  const [subtaskDialogCol, setSubtaskDialogCol] = useState<string | null>(null);
  const [newSubtask, setNewSubtask] = useState({ name: "", energy: "Low" as "High" | "Medium" | "Low", notes: "" });

  // ── DnD ──
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);

  // ── Sensors ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ── Data fetching ──
  const fetchSubtasks = useCallback(async () => {
    if (!taskId) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`);
      if (res.ok) setSubtasks(await res.json());
    } catch {
      toast.error("Failed to load subtasks");
    }
  }, [taskId]);

  const fetchTask = useCallback(async () => {
    if (!taskId) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) { navigate("/tasks"); return; }
      const t = await res.json();
      setTask({
        id: t.task_id,
        name: t.task_name,
        column: t.task_status === "Ready" ? "todo" : (t.task_status?.toLowerCase() ?? "backlog"),
        notes: t.notes,
      });
    } catch {
      navigate("/tasks");
    } finally {
      setIsLoadingTask(false);
    }
  }, [taskId, navigate]);

  useEffect(() => {
    fetchTask();
    fetchSubtasks();
  }, [fetchTask, fetchSubtasks]);

  // ── Auto-complete parent when all subtasks done ──
  useEffect(() => {
    const approved = subtasks.filter((s) => s.is_approved !== false);
    const allDone = approved.length > 0 && approved.every((s) => s.subtask_status === "Done");
    if (allDone && task && task.column !== "done") {
      fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_status: "Done" }),
      }).catch(() => {});
      setTask((prev) => (prev ? { ...prev, column: "done" } : prev));
      toast.success(`All subtasks done! "${task.name}" moved to Done.`, { duration: 3500 });
    }
  }, [subtasks, task, taskId]);

  // ── DnD handlers ──
  const handleDragStart = (event: DragStartEvent) => {
    setDragActiveId(event.active.id as string);
  };

  const handleDragOver = (_event: DragOverEvent) => {};

  const handleDragEnd = async (result: DragEndEvent) => {
    const { active, over } = result;
    setDragActiveId(null);
    if (!over) return;

    const draggableId = active.id as string;
    const overId = over.id as string;

    const overSubtask = subtasks.find((s) => s.subtask_id === overId);
    const overColId = overSubtask
      ? frontendStatus(overSubtask.subtask_status)
      : overId.replace("col-", "");
    const targetCol = COLUMNS.find((c) => c.id === overColId);
    if (!targetCol) return;

    const movedSub = subtasks.find((s) => s.subtask_id === draggableId);
    if (!movedSub) return;
    if (frontendStatus(movedSub.subtask_status) === overColId) return;

    // Block: only 1 doing
    if (overColId === "doing") {
      const alreadyDoing = subtasks.find(
        (s) => s.subtask_status === "Doing" && s.subtask_id !== draggableId,
      );
      if (alreadyDoing) {
        const msg = `Already focused on "${alreadyDoing.subtask_name}" — finish it first.`;
        setBlockMsg(msg);
        toast.error(msg);
        setTimeout(() => setBlockMsg(""), 3000);
        return;
      }
    }

    if (overColId === "done" && frontendStatus(movedSub.subtask_status) !== "done") {
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 }, colors: ["#7c6ff7", "#1D9E75"] });
      addScore(5);
    }

    setSubtasks((prev) =>
      prev.map((s) =>
        s.subtask_id === draggableId ? { ...s, subtask_status: targetCol.backendValue } : s,
      ),
    );

    try {
      await fetch(`/api/tasks/${taskId}/subtasks/${draggableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtask_status: targetCol.backendValue }),
      });
    } catch {
      toast.error("Failed to move subtask");
      fetchSubtasks();
    }
  };

  // ── Subtask dialog handlers ──
  const handleAddClick = (colId: string) => {
    setSubtaskDialogCol(colId);
    setNewSubtask({ name: "", energy: "Low", notes: "" });
    setShowSubtaskDialog(true);
  };

  const handleSubtaskDialogSave = async () => {
    if (!newSubtask.name.trim() || !subtaskDialogCol) return;
    const col = COLUMNS.find((c) => c.id === subtaskDialogCol);
    const tempId = `temp-${Date.now()}`;
    const tempSub: Subtask = {
      subtask_id: tempId,
      subtask_name: newSubtask.name.trim(),
      subtask_status: col?.backendValue ?? "Backlog",
      energy_level: newSubtask.energy,
      notes: newSubtask.notes || undefined,
      is_approved: true,
    };
    setSubtasks((prev) => [...prev, tempSub]);
    setShowSubtaskDialog(false);
    setNewSubtask({ name: "", energy: "Low", notes: "" });

    try {
      await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtask_name: newSubtask.name.trim(),
          energy_level: newSubtask.energy,
          notes: newSubtask.notes || null,
          is_approved: true,
          subtask_status: col?.backendValue ?? "Backlog",
        }),
      });
      fetchSubtasks();
    } catch {
      toast.error("Failed to create subtask");
      setSubtasks((prev) => prev.filter((s) => s.subtask_id !== tempId));
    }
  };

  // ── Approve/Delete/Generate handlers ──
  const handleApprove = async (subtaskId: string) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.subtask_id === subtaskId ? { ...s, is_approved: true } : s)),
    );
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

  const handleDeleteTask = async () => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      toast.success("Task deleted");
      navigate("/tasks");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  // ── Focus shortcut ──
  const handleFocusSubtask = (subtaskId: string) => {
    const p = new URLSearchParams({
      taskId:    taskId ?? "",
      subtaskId,
      autostart: "true",
    });
    navigate(`/sessions?${p}`);
  };

  // ── Inline edit handlers ──
  const handleStartEdit = () => {
    if (!task) return;
    setEditName(task.name);
    setEditColumn(task.column);
    setEditNotes(task.notes ?? "");
    setIsEditing(true);
  };

  const handleSaveTask = async () => {
    if (!editName.trim() || !task) return;
    setIsSaving(true);
    const backendStatus =
      editColumn === "todo"
        ? "Ready"
        : editColumn.charAt(0).toUpperCase() + editColumn.slice(1);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_name: editName.trim(),
          task_status: backendStatus,
          notes: editNotes || null,
        }),
      });
      if (!res.ok) throw new Error();
      setTask((prev) =>
        prev
          ? {
              ...prev,
              name: editName.trim(),
              column: editColumn,
              notes: editNotes || undefined,
            }
          : prev,
      );
      setIsEditing(false);
      toast.success("Task updated");
    } catch {
      toast.error("Failed to update task");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Loading/null guard ──
  if (isLoadingTask) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 256 }}>
        <Loader2 style={{ width: 32, height: 32, color: "#7c6ff7", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!task) return null;

  const approvedSubtasks = subtasks.filter((s) => s.is_approved !== false);
  const doneSubtasks = subtasks.filter((s) => s.subtask_status === "Done");
  const donePct = approvedSubtasks.length > 0 ? (doneSubtasks.length / approvedSubtasks.length) * 100 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 0 16px 0",
          flexShrink: 0,
          gap: 12,
        }}
      >
        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
          {/* Back button */}
          <button
            onClick={() => navigate("/tasks")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 13,
              fontWeight: 500,
              color: isLight ? "rgba(83,74,183,0.50)" : "rgba(255,255,255,0.38)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px 6px",
              borderRadius: 8,
              flexShrink: 0,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = isLight ? "#534AB7" : "rgba(255,255,255,0.80)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = isLight ? "rgba(83,74,183,0.50)" : "rgba(255,255,255,0.38)")}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
            Tasks
          </button>

          <span style={{ color: isLight ? "rgba(83,74,183,0.25)" : "rgba(255,255,255,0.18)", fontSize: 14 }}>
            /
          </span>

          {isEditing ? (
            /* ── Edit form ── */
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0 }}
            >
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTask();
                  if (e.key === "Escape") setIsEditing(false);
                }}
                placeholder="Task name…"
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  background: "transparent",
                  border: "none",
                  borderBottom: `1px solid ${isLight ? "rgba(124,111,247,0.40)" : "rgba(124,111,247,0.50)"}`,
                  outline: "none",
                  color: isLight ? "#1a1830" : "rgba(255,255,255,0.90)",
                  paddingBottom: 2,
                  width: "100%",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {/* Status select */}
                <select
                  value={editColumn}
                  onChange={(e) => setEditColumn(e.target.value)}
                  style={{
                    fontSize: 11, fontWeight: 600, borderRadius: 8, padding: "3px 8px",
                    background: isLight ? "rgba(240,238,255,0.70)" : "rgba(255,255,255,0.08)",
                    border: isLight ? "1px solid rgba(83,74,183,0.18)" : "1px solid rgba(255,255,255,0.12)",
                    color: isLight ? "#534AB7" : "rgba(255,255,255,0.75)",
                    outline: "none", cursor: "pointer",
                  }}
                >
                  <option value="backlog">Backlog</option>
                  <option value="todo">To Do</option>
                  <option value="doing">Doing</option>
                  <option value="done">Done</option>
                </select>

                {/* Notes textarea */}
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  placeholder="Notes (optional)…"
                  style={{
                    width: "100%", fontSize: 11, borderRadius: 8, padding: "6px 10px",
                    background: isLight ? "rgba(240,238,255,0.60)" : "rgba(255,255,255,0.06)",
                    border: isLight ? "1px solid rgba(83,74,183,0.15)" : "1px solid rgba(255,255,255,0.10)",
                    color: isLight ? "#1a1830" : "rgba(255,255,255,0.80)",
                    outline: "none", resize: "none", boxSizing: "border-box" as const,
                  }}
                />
              </div>

              {/* Save / Cancel */}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={handleSaveTask}
                  disabled={isSaving || !editName.trim()}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: isLight ? "rgba(124,111,247,0.12)" : "rgba(124,111,247,0.18)",
                    color: isLight ? "#534AB7" : "#a89cf7",
                    border: "none", cursor: "pointer",
                    opacity: (isSaving || !editName.trim()) ? 0.5 : 1,
                  }}
                >
                  {isSaving ? <Loader2 style={{ width: 12, height: 12 }} /> : <Save style={{ width: 12, height: 12 }} />}
                  {isSaving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                    background: "transparent", border: "none", cursor: "pointer",
                    color: isLight ? "rgba(83,74,183,0.45)" : "rgba(255,255,255,0.32)",
                  }}
                >
                  <X style={{ width: 12, height: 12 }} /> Cancel
                </button>
              </div>
            </motion.div>
          ) : (
            /* ── View mode ── */
            <>
              <h1
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: isLight ? "#1a1830" : "rgba(255,255,255,0.90)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                  flex: 1,
                }}
              >
                {task.name}
              </h1>

              {/* Progress pill */}
              {approvedSubtasks.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: isLight ? "rgba(240,238,255,0.70)" : "rgba(124,111,247,0.08)",
                    border: isLight ? "1px solid rgba(83,74,183,0.12)" : "1px solid rgba(124,111,247,0.15)",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 3,
                      borderRadius: 2,
                      background: isLight ? "rgba(83,74,183,0.12)" : "rgba(255,255,255,0.10)",
                      overflow: "hidden",
                    }}
                  >
                    <motion.div
                      style={{ height: "100%", background: "#7c6ff7" }}
                      animate={{ width: `${donePct}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                  <span style={{ fontSize: 11, color: isLight ? "rgba(83,74,183,0.55)" : "rgba(255,255,255,0.35)" }}>
                    {doneSubtasks.length}/{approvedSubtasks.length}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {!isEditing && (
            <button
              onClick={handleStartEdit}
              title="Edit task"
              style={{
                width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "transparent",
                color: isLight ? "rgba(83,74,183,0.35)" : "rgba(255,255,255,0.22)",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isLight ? "rgba(83,74,183,0.08)" : "rgba(124,111,247,0.12)";
                e.currentTarget.style.color = isLight ? "#534AB7" : "#a89cf7";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = isLight ? "rgba(83,74,183,0.35)" : "rgba(255,255,255,0.22)";
              }}
            >
              <Pencil style={{ width: 14, height: 14 }} />
            </button>
          )}

          {/* AI Generate → /chat */}
          <motion.button
            whileHover={prefersReducedMotion ? {} : { scale: 1.03, boxShadow: "0 4px 20px rgba(124,58,237,0.30)" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/chat")}
            style={{
              position: "relative",
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: isLight
                ? "linear-gradient(135deg, rgba(124,58,237,0.10), rgba(124,58,237,0.06))"
                : "linear-gradient(135deg, rgba(124,58,237,0.18), rgba(124,58,237,0.10))",
              color: isLight ? "#534AB7" : "#a89cf7",
              border: isLight ? "1px solid rgba(124,58,237,0.22)" : "1px solid rgba(124,58,237,0.35)",
              cursor: "pointer",
              overflow: "hidden",
            }}
          >
            <motion.div
              style={{
                position: "absolute", inset: 0, borderRadius: 10,
                background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.12), transparent)",
                backgroundSize: "200% 100%",
                pointerEvents: "none",
              }}
              animate={{ backgroundPosition: ["-100% 0", "200% 0"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            />
            <Sparkles style={{ width: 13, height: 13 }} />
            AI Generate
          </motion.button>

          {/* Delete task */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                style={{
                  width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "transparent",
                  color: isLight ? "rgba(83,74,183,0.35)" : "rgba(255,255,255,0.22)",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(248,113,113,0.10)";
                  e.currentTarget.style.color = "#f87171";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = isLight ? "rgba(83,74,183,0.35)" : "rgba(255,255,255,0.22)";
                }}
              >
                <Trash2 style={{ width: 14, height: 14 }} />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the task and all its subtasks. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteTask}
                  style={{ background: "#dc2626", color: "#fff" }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* ── Block message ── */}
      <AnimatePresence>
        {blockMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              marginBottom: 10,
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(239,159,39,0.10)",
              border: "1px solid rgba(239,159,39,0.30)",
              color: "#EF9F27",
              fontSize: 13,
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            {blockMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Kanban Board ── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "4px 0 24px",
            alignItems: "flex-start",
          }}
        >
          {COLUMNS.map((col) => {
            const colItems = subtasks.filter((s) => frontendStatus(s.subtask_status) === col.id);
            const dotColor = isLight ? col.lightDot : col.darkDot;
            return (
              <SubtaskColumn
                key={col.id}
                colId={col.id}
                label={col.label}
                dotColor={dotColor}
                items={colItems}
                isLight={isLight}
                onApprove={handleApprove}
                onDelete={handleDelete}
                onFocus={handleFocusSubtask}
                onAddClick={handleAddClick}
              />
            );
          })}
        </div>

        <DragOverlay>
          {dragActiveId
            ? (() => {
                const sub = subtasks.find((s) => s.subtask_id === dragActiveId);
                return sub ? (
                  <div style={{ transform: "rotate(1.5deg)" }}>
                    <SubtaskCard
                      subtask={sub}
                      index={0}
                      isLight={isLight}
                      onApprove={() => {}}
                      onDelete={() => {}}
                      onFocus={() => {}}
                    />
                  </div>
                ) : null;
              })()
            : null}
        </DragOverlay>
      </DndContext>

      {/* ── Add Subtask dialog ── */}
      <AnimatePresence>
        {showSubtaskDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
            onClick={() => setShowSubtaskDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%", maxWidth: 400, borderRadius: 20, padding: 24,
                background: isLight ? "#fff" : "rgba(26,24,48,0.97)",
                border: isLight ? "1px solid rgba(83,74,183,0.18)" : "1px solid rgba(124,111,247,0.22)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
              }}
            >
              {/* Title bar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: isLight ? "#1a1830" : "rgba(255,255,255,0.92)" }}>
                  New subtask
                </span>
                <button
                  onClick={() => setShowSubtaskDialog(false)}
                  style={{ padding: 4, borderRadius: 8, background: "none", border: "none", cursor: "pointer",
                    color: isLight ? "rgba(83,74,183,0.50)" : "rgba(255,255,255,0.35)" }}
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Title */}
                <input
                  autoFocus
                  value={newSubtask.name}
                  onChange={(e) => setNewSubtask(s => ({ ...s, name: e.target.value }))}
                  placeholder="Subtask name"
                  onKeyDown={(e) => e.key === "Enter" && handleSubtaskDialogSave()}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 12, fontSize: 14,
                    background: isLight ? "rgba(83,74,183,0.04)" : "rgba(255,255,255,0.06)",
                    border: isLight ? "1px solid rgba(83,74,183,0.18)" : "1px solid rgba(255,255,255,0.09)",
                    color: isLight ? "#1a1830" : "rgba(255,255,255,0.90)",
                    outline: "none", boxSizing: "border-box",
                  }}
                />

                {/* Energy */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
                    color: isLight ? "rgba(83,74,183,0.55)" : "rgba(255,255,255,0.30)", marginBottom: 8 }}>
                    Energy level
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["High", "Medium", "Low"] as const).map(e => {
                      const isSelected = newSubtask.energy === e;
                      const selBg = e === "High"
                        ? "rgba(124,111,247,0.20)"
                        : e === "Medium"
                        ? "rgba(239,159,39,0.18)"
                        : "rgba(29,158,117,0.15)";
                      const selBorder = e === "High"
                        ? "1px solid rgba(124,111,247,0.45)"
                        : e === "Medium"
                        ? "1px solid rgba(239,159,39,0.40)"
                        : "1px solid rgba(29,158,117,0.35)";
                      const selColor = e === "High"
                        ? "#a89cf7"
                        : e === "Medium"
                        ? "#EF9F27"
                        : "#5DCAA5";
                      return (
                        <button
                          key={e}
                          onClick={() => setNewSubtask(s => ({ ...s, energy: e }))}
                          style={{
                            flex: 1, padding: "8px", borderRadius: 12, fontSize: 12, fontWeight: 500,
                            cursor: "pointer", transition: "all 0.12s",
                            background: isSelected ? selBg : (isLight ? "rgba(83,74,183,0.04)" : "rgba(255,255,255,0.04)"),
                            border: isSelected ? selBorder : (isLight ? "1px solid rgba(83,74,183,0.12)" : "1px solid rgba(255,255,255,0.08)"),
                            color: isSelected ? selColor : (isLight ? "rgba(83,74,183,0.55)" : "rgba(255,255,255,0.38)"),
                          }}
                        >
                          {e}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
                    color: isLight ? "rgba(83,74,183,0.55)" : "rgba(255,255,255,0.30)", marginBottom: 8 }}>
                    Notes
                  </p>
                  <textarea
                    value={newSubtask.notes}
                    onChange={(e) => setNewSubtask(s => ({ ...s, notes: e.target.value }))}
                    placeholder="Optional notes…"
                    rows={3}
                    style={{
                      width: "100%", padding: "8px 14px", borderRadius: 12, fontSize: 13,
                      background: isLight ? "rgba(83,74,183,0.04)" : "rgba(255,255,255,0.06)",
                      border: isLight ? "1px solid rgba(83,74,183,0.18)" : "1px solid rgba(255,255,255,0.09)",
                      color: isLight ? "#1a1830" : "rgba(255,255,255,0.90)",
                      outline: "none", resize: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowSubtaskDialog(false)}
                  style={{ padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                    background: "none", border: "none", cursor: "pointer",
                    color: isLight ? "rgba(83,74,183,0.55)" : "rgba(255,255,255,0.40)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubtaskDialogSave}
                  disabled={!newSubtask.name.trim()}
                  style={{
                    padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: "#7c6ff7", color: "#fff", border: "none", cursor: "pointer",
                    opacity: newSubtask.name.trim() ? 1 : 0.4,
                    transition: "opacity 0.15s",
                  }}
                >
                  Add subtask
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskBoard;
