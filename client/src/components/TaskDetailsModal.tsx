import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar as CalendarIcon, Trash2, Zap, Leaf, Sparkles, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface Subtask {
  subtask_id: string; // The backend uses this ID
  id?: string;
  subtask_name: string;
  subtask_status: string;
  energy_level?: string;
  is_approved?: boolean;
}

interface Task {
  id: string;
  name: string;
  energy: "high" | "low";
  column: string;
  due_date?: string | null;
}

export const TaskDetailsModal = ({
  task,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
}: {
  task: Task;
  onClose: () => void;
  onTaskUpdated: () => void;
  onTaskDeleted: () => void;
}) => {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [taskName, setTaskName] = useState(task.name);
  const [energyLevel, setEnergyLevel] = useState(task.energy);
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(task.due_date ? new Date(task.due_date) : undefined);
  const [newSubtaskName, setNewSubtaskName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ opening?: string; closing?: string } | null>(null);
  const [status, setStatus] = useState<string>(
    task.column === "todo" ? "Ready" : task.column.charAt(0).toUpperCase() + task.column.slice(1)
  );

  useEffect(() => {
    fetchSubtasks();
    fetchTaskDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  const fetchTaskDetails = async () => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.notes) setNotes(data.notes);
      }
    } catch (err) {
      console.error("Failed to fetch notes", err);
    }
  };

  const fetchSubtasks = async () => {
    try {
      const res = await fetch(`/api/tasks/${task.id}/subtasks`);
      if (!res.ok) throw new Error("Failed to fetch subtasks");
      const data = await res.json();
      setSubtasks(data);
    } catch (err) {
      toast.error("Failed to load subtasks");
    }
  };

  const handleUpdateTaskName = async () => {
    if (!taskName.trim()) return;
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_name: taskName }),
      });
      onTaskUpdated();
    } catch (err) {
      toast.error("Failed to update task name");
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setStatus(newStatus);
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_status: newStatus }),
      });
      onTaskUpdated();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const toggleEnergy = async () => {
    const newEnergy = energyLevel === "high" ? "low" : "high";
    setEnergyLevel(newEnergy);
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ energy_level: newEnergy === "high" ? "High" : "Low" }),
      });
      onTaskUpdated();
    } catch (err) {
      toast.error("Failed to update energy level");
    }
  };

  const handleUpdateNotes = async () => {
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
    } catch (err) {
      toast.error("Failed to save notes");
    }
  };

  const handleUpdateDueDate = async (date: Date | undefined) => {
    setDueDate(date);
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          due_date: date ? format(date, "yyyy-MM-dd") : null,
        }),
      });
      onTaskUpdated();
    } catch (err) {
      toast.error("Failed to update due date");
    }
  };

  const handleDeleteTask = async () => {
    try {
      await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      toast.success("Task deleted");
      onTaskDeleted();
      onClose();
    } catch (err) {
      toast.error("Failed to delete task");
    }
  };

  const toggleSubtaskDone = async (subtask: Subtask) => {
    const isCompleted = subtask.subtask_status !== "Done";
    // Optimistic Update
    setSubtasks(prev => prev.map(s => s.subtask_id === subtask.subtask_id ? { ...s, subtask_status: isCompleted ? "Done" : "Backlog" } : s));
    try {
      // First try the specific requested endpoint
      const res = await fetch(`/api/subtasks/${subtask.subtask_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: isCompleted }),
      });

      if (!res.ok) {
        // Fallback to old format if strictly requested endpoint doesn't exist
        await fetch(`/api/tasks/${task.id}/subtasks/${subtask.subtask_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subtask_status: isCompleted ? "Done" : "Backlog" }),
        });
      }
      onTaskUpdated();
    } catch (err) {
      toast.error("Error updating subtask");
      fetchSubtasks(); // Revert
    }
  };

  const deleteSubtask = async (subtaskId: string) => {
    setSubtasks((prev) => prev.filter((s) => s.subtask_id !== subtaskId));
    try {
      const res = await fetch(`/api/tasks/${task.id}/subtasks/${subtaskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onTaskUpdated();
    } catch {
      toast.error("Failed to delete subtask");
      fetchSubtasks();
    }
  };

  const handleGenerateSubtasks = async () => {
    setIsGenerating(true);
    setAiMessage(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}/subtasks/generate`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate subtasks");
      const data = await res.json();
      if (data.chat_opening || data.chat_closing) {
        setAiMessage({ opening: data.chat_opening, closing: data.chat_closing });
      }
      fetchSubtasks();
      toast.success("Subtasks generated! Review and approve below.");
    } catch {
      toast.error("Failed to generate subtasks");
    } finally {
      setIsGenerating(false);
    }
  };

  const approveSubtask = async (subtaskId: string) => {
    try {
      await fetch(`/api/tasks/${task.id}/subtasks/${subtaskId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_approved: true }),
      });
      setSubtasks(prev => prev.map(s => s.subtask_id === subtaskId ? { ...s, is_approved: true } : s));
    } catch {
      toast.error("Failed to approve subtask");
    }
  };

  const createSubtask = async () => {
    if (!newSubtaskName.trim()) return;
    try {
      await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtask_name: newSubtaskName, is_approved: true }),
      });
      setNewSubtaskName("");
      fetchSubtasks();
      onTaskUpdated();
    } catch (err) {
      toast.error("Failed to create subtask");
    }
  };

  const completedSubtasks = subtasks.filter((s) => s.subtask_status === "Done").length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Slide-in Panel */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full md:w-[380px] h-full flex flex-col items-stretch overflow-y-auto custom-scrollbar"
        style={{
          background: "hsl(var(--card) / 0.97)",
          backdropFilter: "blur(24px)",
          borderLeft: "0.5px solid hsl(var(--border) / 0.4)",
          boxShadow: "-20px 0 60px rgba(0, 0, 0, 0.12), -4px 0 20px rgba(0, 0, 0, 0.06)",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-muted-foreground/40 hover:text-foreground transition-colors rounded-full hover:bg-muted/50 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 flex-1 flex flex-col gap-8 pb-32">

          {/* TOP SECTION */}
          <div className="space-y-4">
            <input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              onBlur={handleUpdateTaskName}
              className="text-2xl font-semibold text-foreground bg-transparent outline-none w-[90%] border-b border-transparent hover:border-border/30 focus:border-primary/40 transition-colors"
            />

            <div className="flex items-center gap-3">
              <button
                onClick={toggleEnergy}
                className={`flex items-center gap-1 text-[10px] tracking-wide uppercase font-bold px-2 py-1 rounded-full border transition-colors
                  ${energyLevel === "high"
                    ? "bg-amber-500/15 text-amber-500 border-amber-500/30 hover:bg-amber-500/25"
                    : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/25"}`}
              >
                {energyLevel === "high" ? <Zap className="w-3 h-3" /> : <Leaf className="w-3 h-3" />}
                {energyLevel === "high" ? "High Energy" : "Low Energy"}
              </button>

              <Select value={status} onValueChange={handleUpdateStatus}>
                <SelectTrigger className="h-7 text-xs font-semibold rounded-full w-[110px] text-foreground/70" style={{ background: "hsl(var(--muted)/0.5)", border: "0.5px solid hsl(var(--border)/0.4)" }}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent style={{ background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border)/0.5)" }} className="text-foreground">
                  <SelectItem value="Backlog" className="focus:bg-muted/60">Backlog</SelectItem>
                  <SelectItem value="Ready" className="focus:bg-muted/60">Ready</SelectItem>
                  <SelectItem value="Doing" className="focus:bg-muted/60">Doing</SelectItem>
                  <SelectItem value="Done" className="focus:bg-muted/60">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SUBTASKS SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 font-medium">Subtasks</h3>
                <span className="text-xs text-muted-foreground/40 bg-muted/40 px-2 rounded-full py-0.5">{completedSubtasks}/{subtasks.filter(s => s.is_approved !== false).length}</span>
              </div>
              <button
                onClick={handleGenerateSubtasks}
                disabled={isGenerating}
                className="flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {isGenerating ? "Generating…" : "Generate with AI"}
              </button>
            </div>

            {aiMessage?.opening && (
              <p className="text-xs text-violet-300/80 italic bg-violet-500/5 rounded-lg px-3 py-2">{aiMessage.opening}</p>
            )}

            <div className="space-y-2">
              {subtasks.map((st) => (
                <div key={st.subtask_id} className={`flex items-start gap-3 p-2 rounded-lg group transition-colors ${st.is_approved === false ? "bg-ai-purple/5 border border-ai-purple/15" : "hover:bg-muted/30"}`}>
                  {st.is_approved === false ? (
                    <button
                      onClick={() => approveSubtask(st.subtask_id)}
                      title="Approve subtask"
                      className="mt-0.5 w-4 h-4 rounded border border-violet-400/50 flex items-center justify-center text-violet-400 hover:bg-violet-500/20 shrink-0 transition-colors"
                    >
                      <Check className="w-2.5 h-2.5" />
                    </button>
                  ) : (
                    <Checkbox
                      checked={st.subtask_status === "Done"}
                      onCheckedChange={() => toggleSubtaskDone(st)}
                      className="mt-1 border-border/40 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary"
                    />
                  )}
                  <span className={`text-sm flex-1 pt-0.5 ${st.is_approved === false ? "text-ai-purple/70 italic" : st.subtask_status === "Done" ? "text-muted-foreground/40 line-through" : "text-foreground/75"}`}>
                    {st.subtask_name}
                    {st.is_approved === false && <span className="ml-2 text-[10px] text-violet-400/60 not-italic">AI · tap ✓ to approve</span>}
                  </span>
                  <button
                    onClick={() => deleteSubtask(st.subtask_id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground/30 hover:text-red-400 transition-all rounded shrink-0"
                    title="Delete subtask"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {aiMessage?.closing && (
              <p className="text-xs text-violet-300/80 italic bg-violet-500/5 rounded-lg px-3 py-2">{aiMessage.closing}</p>
            )}

            <div className="pt-2">
              <input
                value={newSubtaskName}
                onChange={(e) => setNewSubtaskName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createSubtask()}
                placeholder="Add subtask and press Enter"
                className="w-full text-sm bg-transparent border-none outline-none text-foreground/80 placeholder:text-muted-foreground/30 p-2 border-b border-transparent focus:border-primary/30 transition-colors font-light"
              />
            </div>
          </div>

          {/* NOTES SECTION */}
          <div className="space-y-3">
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 font-medium">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleUpdateNotes}
              placeholder="Add notes about this task..."
              className="w-full min-h-[120px] resize-y outline-none text-sm text-foreground/75 placeholder:text-muted-foreground/30 transition-all font-light"
              style={{
                background: "hsl(var(--muted) / 0.3)",
                border: "0.5px solid hsl(var(--border) / 0.35)",
                borderRadius: "12px",
                padding: "12px",
              }}
            />
          </div>

          {/* DUE DATE SECTION */}
          <div className="space-y-3">
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 font-medium">Due Date</h3>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal rounded-xl h-12 text-foreground/70 hover:text-foreground transition-colors`}
                  style={{ background: "hsl(var(--muted)/0.4)", border: "0.5px solid hsl(var(--border)/0.4)" }}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "No due date set"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-xl shadow-2xl overflow-hidden" style={{ background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border)/0.5)" }}>
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={handleUpdateDueDate}
                  initialFocus
                  className="bg-transparent text-foreground"
                />
              </PopoverContent>
            </Popover>
          </div>

        </div>

        {/* DANGER SECTION */}
        <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-center">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-xs font-semibold text-red-500/80 hover:text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors border border-transparent hover:border-red-500/20">
                Delete task
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border border-red-500/20 shadow-2xl shadow-red-500/10 sm:rounded-2xl max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">Delete this task?</AlertDialogTitle>
                <AlertDialogDescription className="text-red-400/80">
                  Are you sure? This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4">
                <AlertDialogCancel className="bg-muted/50 text-foreground/70 border-border/30 hover:bg-muted hover:text-foreground">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteTask} className="bg-red-600 text-white hover:bg-red-700">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

      </motion.div>
    </div>
  );
};
