import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Zap, Leaf, X, GripVertical, CheckCircle2, Loader2, Play, Grid, Calendar as CalendarIcon } from "lucide-react";
import confetti from "canvas-confetti";
import { useFocusScore } from "@/context/FocusScoreContext";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { TaskDetailsModal } from "@/components/TaskDetailsModal";
import { useNavigate } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  name: string;
  energy: "high" | "low";
  column: string;         // Frontend column ID: backlog | todo | doing | done
  subtasks: number;       // Total subtask count
  subtasksDone: number;   // Completed subtask count
  due_date?: string | null;
}

// ─── Column Definitions ───────────────────────────────────────────────────────

const columns = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "To Do" },
  { id: "doing", label: "Doing" },
  { id: "done", label: "Done" },
];

const backendStatusMap: Record<string, string> = {
  backlog: "Backlog",
  todo: "Ready",
  doing: "Doing",
  done: "Done",
};

// ─── Empty State Illustrations ────────────────────────────────────────────────

const EmptyBacklogIcon = () => (
  <svg className="w-12 h-12 text-current opacity-20 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="13" width="20" height="8" rx="2" />
    <path d="M2 13l2.5-8h15L22 13" />
    <path d="M8 13h8" />
    <path d="M17.5 2l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5z" />
  </svg>
);

const EmptyTodoIcon = () => (
  <svg className="w-12 h-12 text-current opacity-20 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="4" height="4" rx="0.5" />
    <line x1="10" y1="6" x2="21" y2="6" strokeDasharray="2 2" />
    <rect x="3" y="10" width="4" height="4" rx="0.5" />
    <line x1="10" y1="12" x2="21" y2="12" strokeDasharray="2 2" />
    <rect x="3" y="16" width="4" height="4" rx="0.5" />
    <line x1="10" y1="18" x2="18" y2="18" strokeDasharray="2 2" />
  </svg>
);

const EmptyDoingIcon = () => (
  <svg className="w-12 h-12 text-current opacity-20 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="4.5" />
    <line x1="12" y1="19.5" x2="12" y2="22" />
    <line x1="2" y1="12" x2="4.5" y2="12" />
    <line x1="19.5" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="4.93" x2="6.7" y2="6.7" />
    <line x1="17.3" y1="17.3" x2="19.07" y2="19.07" />
    <line x1="19.07" y1="4.93" x2="17.3" y2="6.7" />
    <line x1="6.7" y1="17.3" x2="4.93" y2="19.07" />
    <circle cx="12" cy="12" r="5.5" />
    <polygon points="10.5 9.5 15.5 12 10.5 14.5 10.5 9.5" />
  </svg>
);

const EmptyDoneIcon = () => (
  <svg className="w-12 h-12 text-current opacity-20 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4a2 2 0 000 4c.6 0 2-.4 2-1" />
    <path d="M18 9h2a2 2 0 010 4c-.6 0-2-.4-2-1" />
    <path d="M6 4h12v9a6 6 0 01-12 0V4z" />
    <path d="M9 21h6" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

// ─── Tasks Page ───────────────────────────────────────────────────────────────

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ name: "", energy: "Low" as "High" | "Low" });
  const [blockMsg, setBlockMsg] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<"board" | "today">("board");
  const { addScore } = useFocusScore();
  const navigate = useNavigate();

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();

      const mappedTasks: Task[] = data.map((t: { task_id: string; task_name: string; energy_level: string; task_status: string; total_subtasks: number; completed_subtasks: number; due_date: string | null; }) => ({
        id: t.task_id,
        name: t.task_name,
        energy: t.energy_level.toLowerCase() as "high" | "low",
        column: t.task_status === "Ready" ? "todo" : t.task_status.toLowerCase(),
        subtasks: t.total_subtasks || 0,
        subtasksDone: t.completed_subtasks || 0,
        due_date: t.due_date || null
      }));

      setTasks(mappedTasks);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const sourceCol = source.droppableId;
    const destCol = destination.droppableId;

    const doingTasks = tasks.filter((t) => t.column === "doing" && t.id !== draggableId);
    if (destCol === "doing" && doingTasks.length >= 1) {
      const active = doingTasks[0];
      setBlockMsg(`You're already focused on "${active.name}" 💪 Finish it or move it first.`);
      setTimeout(() => setBlockMsg(""), 3000);
      return;
    }

    if (destCol === "done" && sourceCol !== "done") {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#7C3AED", "#8B5CF6", "#A78BFA", "#3B82F6", "#10B981"],
      });
      addScore(10);
    }

    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === draggableId ? { ...t, column: destCol } : t
      )
    );

    try {
      const res = await fetch(`/api/tasks/${draggableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_status: backendStatusMap[destCol] }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update task status");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update task status");
      fetchTasks();
    }
  };

  const addTask = async () => {
    if (!newTask.name.trim()) return;

    const tempId = Date.now().toString();
    setTasks((ts) => [
      ...ts,
      {
        id: tempId,
        name: newTask.name,
        energy: newTask.energy.toLowerCase() as "high" | "low",
        column: "backlog",
        subtasks: 0,
        subtasksDone: 0,
      },
    ]);
    setShowAdd(false);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_name: newTask.name,
          energy_level: newTask.energy,
          task_status: "Backlog",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create task");
      }

      fetchTasks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create task");
      fetchTasks();
    } finally {
      setNewTask({ name: "", energy: "Low" });
    }
  };

  const handleCompleteTaskToday = async (task: Task) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === task.id ? { ...t, column: "done" } : t
      )
    );

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#7C3AED", "#8B5CF6", "#A78BFA", "#3B82F6", "#10B981"],
    });
    addScore(10);

    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_status: "Done" }),
      });
      fetchTasks();
    } catch (err) {
      toast.error("Failed to update status");
      fetchTasks();
    }
  };

  const handleStartSession = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    localStorage.setItem("activeTaskId", taskId);
    navigate("/sessions");
  };

  const renderEmptyState = (colId: string) => {
    switch (colId) {
      case "backlog":
        return (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center p-6 text-center h-full">
            <EmptyBacklogIcon />
            <h3 className="text-foreground font-semibold mb-1">Your backlog is clear</h3>
            <p className="text-xs text-muted-foreground mb-4">Add tasks you want to tackle soon</p>
            <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 border border-border hover:bg-accent rounded-md text-xs font-medium text-muted-foreground transition-colors">
              + Add Task
            </button>
          </motion.div>
        );
      case "todo":
        return (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center p-6 text-center h-full">
            <EmptyTodoIcon />
            <h3 className="text-foreground font-semibold mb-1">Nothing queued up</h3>
            <p className="text-xs text-muted-foreground">Drag tasks here when you're ready</p>
          </motion.div>
        );
      case "doing":
        return (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center p-6 text-center h-full">
            <EmptyDoingIcon />
            <h3 className="text-foreground font-semibold mb-1">Pick one task to focus on</h3>
            <p className="text-xs text-muted-foreground">Move a single task here to begin</p>
          </motion.div>
        );
      case "done":
        return (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center p-6 text-center h-full">
            <EmptyDoneIcon />
            <h3 className="text-foreground font-semibold mb-1">No wins yet today</h3>
            <p className="text-xs text-muted-foreground">Complete a task to see it here 🎉</p>
          </motion.div>
        );
      default:
        return null;
    }
  };

  // KanbanTask Component Embedded
  const KanbanTask = ({ task, index }: { task: Task; index: number }) => {
    return (
      <Draggable draggableId={task.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className="mb-3"
            style={{ ...provided.draggableProps.style }}
          >
            <div
              onClick={() => setSelectedTask(task)}
              className={`cursor-pointer glass-card p-4 rounded-xl relative shadow-sm border transition-all ${snapshot.isDragging ? "shadow-xl ring-2 ring-primary scale-105 z-50" : "hover:shadow-md"
                } ${task.energy === "high" && task.column !== "done" ? "border-high-energy/30 bg-card/60" :
                  task.energy === "low" && task.column !== "done" ? "border-low-energy/30 bg-card/60" :
                    task.column === "doing" ? "border-primary/40 bg-card/80" : "border-border/50 bg-card/40"
                } ${task.column === "done" ? "opacity-60 grayscale-[0.2] bg-surface-raised/50" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 text-muted-foreground/50 cursor-grab active:cursor-grabbing hover:text-foreground transition-colors">
                  <GripVertical className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium pr-8 ${task.column === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {task.name}
                  </p>

                  {task.subtasks > 0 && (
                    <div className="mt-3">
                      <div className="w-full h-1.5 rounded-full bg-surface-raised overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${(task.subtasksDone / task.subtasks) * 100}%` }}
                        />
                      </div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-1">
                        {task.subtasksDone}/{task.subtasks} subtasks
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    <span
                      className={`flex items-center gap-1 text-[10px] tracking-wide uppercase font-bold px-2 py-0.5 rounded-full
                        ${task.energy === "high"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30"}`}
                    >
                      {task.energy === "high" ? <Zap className="w-3 h-3" /> : <Leaf className="w-3 h-3" />}
                      {task.energy === "high" ? "High Energy" : "Low Energy"}
                    </span>

                    {task.column === "done" && (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 ml-auto">
                        <CheckCircle2 className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Play Button for Doing tasks */}
              <AnimatePresence>
                {task.column === "doing" && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={(e) => handleStartSession(e, task.id)}
                    className="absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 group"
                    style={{ background: "rgba(124, 58, 237, 0.2)", border: "1px solid rgba(124, 58, 237, 0.4)" }}
                    title="Start focus session"
                  >
                    <Play className="w-4 h-4 text-[#7C3AED] fill-[#7C3AED]" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  // Get today tasks
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.due_date?.startsWith(todayDateStr) || t.column === "doing").sort((a, b) => {
    const order: Record<string, number> = { "doing": 1, "todo": 2, "backlog": 3, "done": 4 };
    return (order[a.column] || 99) - (order[b.column] || 99);
  });
  const todayTasksList = viewMode === "today" ? todayTasks : [];

  const allTodayDone = todayTasks.length > 0 && todayTasks.every(t => t.column === "done");

  return (
    <div className="h-full flex flex-col md:overflow-hidden pb-20 md:pb-0">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks Board</h1>
          <p className="text-sm text-muted-foreground mt-1">Stay focused on what matters today.</p>
        </div>

        <div className="flex items-center gap-4">
          {/* View toggle */}
          <div className="flex items-center bg-muted border border-border rounded-full p-1 relative overflow-hidden">
            <div
              className="absolute w-1/2 h-[calc(100%-8px)] top-1 left-1 bg-violet-600 rounded-full transition-transform duration-300 ease-out"
              style={{ transform: viewMode === "today" ? "translateX(calc(100% - 4px))" : "translateX(0)" }}
            />
            <button
              onClick={() => setViewMode("board")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full relative z-10 transition-colors ${viewMode === "board" ? "text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Grid className="w-3.5 h-3.5" /> Board
            </button>
            <button
              onClick={() => setViewMode("today")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full relative z-10 transition-colors ${viewMode === "today" ? "text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              <CalendarIcon className="w-3.5 h-3.5" /> Today
            </button>
          </div>

          {/* Add Task — board only */}
          {viewMode === "board" && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 text-sm font-medium min-h-[44px]"
            >
              <Plus className="w-4 h-4" /> Add Task
            </motion.button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {blockMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card p-4 rounded-xl mb-4 border-amber-500/30 border text-amber-500 bg-amber-500/10 text-sm font-medium shrink-0"
          >
            {blockMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-x-auto overflow-y-auto md:overflow-hidden custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          viewMode === "today" ? (
            <div className="max-w-2xl mx-auto py-2 stagger-container">
              {allTodayDone ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4 opacity-60" />
                  <h2 className="text-xl font-bold text-foreground mb-2">All done for today! 🎉</h2>
                  <p className="text-muted-foreground">Go rest, you've earned it.</p>
                </motion.div>
              ) : todayTasksList.length === 0 ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4 opacity-50" />
                  <h2 className="text-xl font-bold text-foreground mb-2">Nothing due today 🎉</h2>
                  <p className="text-muted-foreground">Enjoy your day or switch to Board to plan ahead.</p>
                </motion.div>
              ) : (
                todayTasksList.map((task) => (
                  <motion.div
                    key={task.id}
                    className="stagger-item group cursor-pointer mb-3 flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/60 hover:bg-card transition-colors"
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-muted-foreground/30" />
                      <span className={`text-sm font-medium ${task.column === "done" ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {task.name}
                      </span>
                      <span
                        className={`flex items-center gap-1 text-[9px] tracking-wide uppercase font-bold px-2 py-0.5 rounded-full
                          ${task.energy === "high"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30"}`}
                      >
                        {task.energy === "high" ? <Zap className="w-3 h-3" /> : <Leaf className="w-3 h-3" />}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground px-2.5 py-1 rounded bg-surface-raised">
                        {columns.find(c => c.id === task.column)?.label || task.column}
                      </span>
                      {task.column === "doing" && (
                        <button
                          onClick={(e) => handleStartSession(e, task.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                          style={{ background: "rgba(124, 58, 237, 0.2)", border: "1px solid rgba(124, 58, 237, 0.4)" }}
                          title="Start focus session"
                        >
                          <Play className="w-3.5 h-3.5 text-[#7C3AED] fill-[#7C3AED]" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCompleteTaskToday(task); }}
                        className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${task.column === "done" ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border text-transparent hover:border-emerald-500/50'}`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex flex-col md:grid md:grid-cols-4 gap-6 h-full pb-6 md:pb-0 min-w-[300px] md:min-w-0">
                {columns.map((col) => {
                  const colTasks = tasks.filter((t) => t.column === col.id);

                  return (
                    <div
                      key={col.id}
                      className={`flex flex-col h-auto min-h-[250px] md:h-full bg-card/20 rounded-2xl border border-border/40 p-3 shadow-inner kanban-col kanban-col-${col.id}`}
                    >
                      <div className="flex items-center justify-between mb-4 px-1">
                        <h2 className="text-sm font-bold text-foreground tracking-wide uppercase">{col.label}</h2>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-raised text-muted-foreground ring-1 ring-border/50">
                          {colTasks.length}
                        </span>
                      </div>

                      <Droppable droppableId={col.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 transition-colors rounded-xl md:overflow-y-auto custom-scrollbar p-1
                              ${snapshot.isDraggingOver ? "bg-primary/5 ring-2 ring-primary/30 ring-inset" : ""}
                              ${col.id === "doing" && colTasks.length > 0 ? "bg-primary/5 border border-primary/20" : ""}
                            `}
                          >
                            {colTasks.map((task, index) => (
                              <KanbanTask key={task.id} task={task} index={index} />
                            ))}
                            {provided.placeholder}

                            {colTasks.length === 0 && !snapshot.isDraggingOver && renderEmptyState(col.id)}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          )
        )}
      </div>

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
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border/50 shadow-2xl p-6 rounded-3xl w-full max-w-md ring-1 ring-border/10"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Plus className="w-6 h-6 text-primary" /> New Task
                </h2>
                <button
                  onClick={() => setShowAdd(false)}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted p-2 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <input
                autoFocus
                value={newTask.name}
                onChange={(e) => setNewTask((n) => ({ ...n, name: e.target.value }))}
                placeholder="What needs to be done?"
                className="w-full px-5 py-4 rounded-2xl bg-surface-raised border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary mb-6 text-base transition-all"
                onKeyDown={(e) => e.key === "Enter" && addTask()}
              />

              <p className="text-sm font-bold text-muted-foreground mb-3 tracking-wide uppercase px-1">
                Energy Required
              </p>
              <div className="grid grid-cols-2 gap-3 mb-8">
                <button
                  onClick={() => setNewTask((n) => ({ ...n, energy: "Low" }))}
                  className={`p-4 rounded-2xl border-2 text-center min-h-[44px] transition-all flex flex-col items-center justify-center gap-2
                    ${newTask.energy === "Low"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm scale-[1.02]"
                      : "border-border text-muted-foreground hover:bg-accent"}`}
                >
                  <Leaf className="w-6 h-6" />
                  <span className="font-semibold text-sm">Low Energy</span>
                </button>
                <button
                  onClick={() => setNewTask((n) => ({ ...n, energy: "High" }))}
                  className={`p-4 rounded-2xl border-2 text-center min-h-[44px] transition-all flex flex-col items-center justify-center gap-2
                    ${newTask.energy === "High"
                      ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm scale-[1.02]"
                      : "border-border text-muted-foreground hover:bg-accent"}`}
                >
                  <Zap className="w-6 h-6" />
                  <span className="font-semibold text-sm">High Energy</span>
                </button>
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={addTask}
                  disabled={!newTask.name.trim()}
                  className={`flex-1 py-4 rounded-2xl font-bold transition-all text-base
                    ${newTask.name.trim()
                      ? "text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 shadow-lg shadow-blue-500/25"
                      : "bg-muted text-muted-foreground cursor-not-allowed"}`}
                >
                  Create Task
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Task Details Modal / Panel */}
        {selectedTask && (
          <TaskDetailsModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onTaskUpdated={fetchTasks}
            onTaskDeleted={() => {
              setSelectedTask(null);
              fetchTasks();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tasks;
