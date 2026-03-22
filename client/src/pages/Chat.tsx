import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Brain, ListTodo, Paperclip, X, FileText, CheckCheck,
  Loader2 as SpinnerIcon, ArrowUp, Plus, MessageSquare, Clock,
  ChevronLeft, Trash2, HeartHandshake, Zap, Coffee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedSubtask {
  subtask_name: string;
  energy_level: string;
}

interface Message {
  role: "user" | "ai";
  content: string;
  attachments?: { file: File; previewUrl: string; type: "image" | "pdf" | "document" }[];
  subtasks?: ParsedSubtask[];
  taskPrompt?: string;
  addedToBoard?: boolean;
}

interface HistorySession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHAT_TEMPLATES = [
  {
    title: "Break down a task",
    subtitle: "Turn one big scary task into manageable steps",
    icon: ListTodo,
    prompt: "I have a task I'm feeling overwhelmed by and need help breaking it down. The task is: ",
  },
  {
    title: "Prioritize my day",
    subtitle: "Figure out what actually matters right now",
    icon: Sparkles,
    prompt: "I have too many things to do and don't know where to start. Can you help me prioritize?",
  },
  {
    title: "Overcome procrastination",
    subtitle: "Get a tiny nudge to build momentum",
    icon: Brain,
    prompt: "I'm frozen and can't get started. I need a tiny nudge to build momentum.",
  },
  {
    title: "I'm feeling overwhelmed",
    subtitle: "Let's slow down and pick just one thing",
    icon: HeartHandshake,
    prompt: "I'm feeling really overwhelmed right now. Everything feels urgent and I don't know where to start. Can you help me slow down and pick just one thing?",
  },
  {
    title: "Help me start this task",
    subtitle: "Beat the blank page — let's begin together",
    icon: Zap,
    prompt: "I need help starting a task but I keep putting it off. Can you help me beat the blank page and just begin?",
  },
  {
    title: "I need a break plan",
    subtitle: "Rest is productive. Let's plan it properly",
    icon: Coffee,
    prompt: "I need to take a break but I feel guilty about it. Can you help me plan a proper restorative break?",
  },
];

const LS_KEY        = "fn_chat_titles";
const LS_HIDDEN_KEY = "fn_chat_hidden";

function loadTitles(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
}
function saveTitle(id: string, title: string) {
  const titles = loadTitles();
  titles[id] = title;
  localStorage.setItem(LS_KEY, JSON.stringify(titles));
}
function loadHidden(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LS_HIDDEN_KEY) || "[]")); } catch { return new Set(); }
}
function markHidden(id: string) {
  const h = loadHidden(); h.add(id);
  localStorage.setItem(LS_HIDDEN_KEY, JSON.stringify([...h]));
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const TypingDots = () => (
  <div className="flex items-center gap-1 px-1 py-0.5">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-ai-purple/60"
        animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity, ease: "easeInOut" }}
      />
    ))}
  </div>
);

const AcceptBreakdown = ({
  msgIdx, subtasks, taskPrompt, addedToBoard, onAccept,
}: {
  msgIdx: number;
  subtasks: ParsedSubtask[];
  taskPrompt: string;
  addedToBoard: boolean;
  onAccept: (idx: number, name: string, subtasks: ParsedSubtask[]) => Promise<void>;
}) => {
  const defaultName = (() => {
    const match = taskPrompt.match(/the task is[:\s]+(.+)/i);
    return (match ? match[1] : taskPrompt).trim().slice(0, 80);
  })();
  const [taskName, setTaskName] = useState(defaultName);
  const [isAdding, setIsAdding] = useState(false);

  if (addedToBoard) {
    return (
      <div className="flex items-center gap-2 mt-2 text-xs text-emerald-500 font-semibold">
        <CheckCheck className="w-3.5 h-3.5" />Added to your board
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 flex flex-col gap-2.5 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3"
    >
      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Add to your board</p>
      <div className="flex gap-2">
        <input
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          placeholder="Task name…"
          className="flex-1 text-sm bg-background border border-border/70 rounded-lg px-3 py-1.5 outline-none focus:border-ai-purple/50 text-foreground placeholder:text-muted-foreground"
        />
        <button
          disabled={!taskName.trim() || isAdding}
          onClick={async () => { setIsAdding(true); await onAccept(msgIdx, taskName, subtasks); setIsAdding(false); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ai-purple hover:bg-ai-purple/90 text-white text-sm font-semibold transition-colors disabled:opacity-50 shrink-0"
        >
          {isAdding ? <SpinnerIcon className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
          {isAdding ? "Adding…" : "Accept"}
        </button>
      </div>
    </motion.div>
  );
};

// ─── History Sidebar ──────────────────────────────────────────────────────────

const HistorySidebar = ({
  sessions,
  currentId,
  isLoading,
  onSelect,
  onNew,
  onDelete,
  collapsed,
  onToggle,
}: {
  sessions: HistorySession[];
  currentId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}) => {
  const { theme } = useTheme();
  return (
  <motion.aside
    initial={false}
    animate={{ width: collapsed ? 0 : 240 }}
    transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    className="hidden md:flex flex-col overflow-hidden shrink-0 h-full"
    style={{
      borderRight: collapsed ? "none" : "0.5px solid hsl(var(--border) / 0.5)",
      background: theme === "dark" ? "hsl(var(--card) / 0.6)" : "hsl(var(--sidebar-background))",
    }}
  >
    <AnimatePresence>
      {!collapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col h-full"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 shrink-0" style={{ borderBottom: "0.5px solid hsl(var(--border) / 0.3)" }}>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-ai-purple/15 flex items-center justify-center">
                <MessageSquare className="w-3 h-3 text-ai-purple" />
              </div>
              <span className="text-xs font-semibold text-foreground/70">History</span>
            </div>
            <button
              onClick={onToggle}
              className="p-1 rounded-lg text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* New chat */}
          <div className="px-3 pt-3 pb-2 shrink-0">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={onNew}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm shadow-primary/20 hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New conversation
            </motion.button>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <SpinnerIcon className="w-4 h-4 text-muted-foreground/40 animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <p className="text-xs text-muted-foreground/40">No past conversations</p>
              </div>
            ) : (
              sessions.map((s) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`group relative flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    currentId === s.id
                      ? "bg-ai-purple/10 text-foreground"
                      : "hover:bg-muted/50 text-muted-foreground"
                  }`}
                  onClick={() => onSelect(s.id)}
                >
                  <MessageSquare className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${currentId === s.id ? "text-ai-purple" : "text-muted-foreground/40"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate leading-snug text-foreground/80">{s.title}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5 text-muted-foreground/30" />
                      <span className="text-[9px] text-muted-foreground/40">{relativeTime(s.updatedAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-muted-foreground/30 hover:text-red-400 transition-all shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.aside>
  );
};

// ─── Chat Page ────────────────────────────────────────────────────────────────

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [attachments, setAttachments] = useState<{ file: File; previewUrl: string; type: "image" | "pdf" | "document" }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Load session list — filters out hidden (deleted) and empty sessions
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const r = await fetch("/api/chat", { credentials: "include" });
      if (!r.ok) return;
      const rows: { chat_session_id: string; created_at: string; updated_at: string; ended_at: string | null }[] = await r.json();
      const titles  = loadTitles();
      const hidden  = loadHidden();
      setSessions(
        rows
          // Remove user-hidden (deleted) sessions
          .filter((row) => !hidden.has(row.chat_session_id))
          // Remove empty sessions: updated_at === created_at means no messages were ever sent
          .filter((row) => new Date(row.updated_at).getTime() > new Date(row.created_at).getTime()
            || titles[row.chat_session_id])
          .map((row) => ({
            id: row.chat_session_id,
            title: titles[row.chat_session_id] || "New conversation",
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }))
      );
    } catch {}
    finally { setSessionsLoading(false); }
  }, []);

  // Start new session
  const startNewSession = useCallback(async () => {
    try {
      const r = await fetch("/api/chat", { method: "POST", credentials: "include" });
      if (!r.ok) return;
      const d = await r.json();
      setChatSessionId(d.chat_session_id);
      return d.chat_session_id as string;
    } catch { return null; }
  }, []);

  useEffect(() => {
    loadSessions();
    // No session created on mount — sessions are created lazily on first message send
  }, []);

  const handleNewChat = async () => {
    // End the current session if it had messages
    if (chatSessionId && messages.length > 0) {
      fetch(`/api/chat/${chatSessionId}`, { method: "PATCH", credentials: "include" }).catch(() => {});
    }
    setMessages([]);
    setInputValue("");
    setAttachments([]);
    setViewingHistoryId(null);
    setChatSessionId(null); // will be created lazily on first message
    await loadSessions();
  };

  const handleSelectSession = async (id: string) => {
    if (id === (viewingHistoryId || chatSessionId)) return;
    setViewingHistoryId(id);
    setMessages([]);
    setIsLoading(true);
    try {
      const r = await fetch(`/api/chat/${id}`, { credentials: "include" });
      if (!r.ok) throw new Error();
      const rows: { role: string; content: string }[] = await r.json();
      setMessages(rows.map((row) => ({
        role: row.role === "user" ? "user" : "ai",
        content: row.content,
      })));
    } catch { toast.error("Could not load conversation"); }
    finally { setIsLoading(false); }
  };

  const handleDeleteSession = async (id: string) => {
    // Mark hidden locally so it won't reappear after reload
    markHidden(id);
    // End the session on the backend (best-effort)
    fetch(`/api/chat/${id}`, { method: "PATCH", credentials: "include" }).catch(() => {});
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (id === (viewingHistoryId || chatSessionId)) {
      setMessages([]);
      setViewingHistoryId(null);
      setChatSessionId(null);
    }
  };

  const persistMessage = async (sid: string, role: "user" | "assistant", content: string) => {
    fetch(`/api/chat/${sid}/messages`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content }),
    }).catch(() => {});
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const newAtts = Array.from(e.target.files).map((file) => ({
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      type: (file.type.startsWith("image/") ? "image" : file.type === "application/pdf" ? "pdf" : "document") as "image" | "pdf" | "document",
    }));
    setAttachments((prev) => [...prev, ...newAtts]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const next = [...prev];
      if (next[index].previewUrl) URL.revokeObjectURL(next[index].previewUrl);
      next.splice(index, 1);
      return next;
    });
  };

  const isReadOnly = viewingHistoryId !== null;

  const handleSend = async () => {
    if (isReadOnly || (!inputValue.trim() && attachments.length === 0)) return;
    const userMessage = inputValue.trim();
    const currentMessages = messages;
    const isFirstMessage = currentMessages.length === 0;

    setMessages((prev) => [...prev, { role: "user", content: userMessage, attachments: [...attachments] }]);
    setInputValue("");
    setAttachments([]);
    setIsLoading(true);

    // ── Lazy session creation — only create a DB session on the first message ──
    let sid = chatSessionId;
    if (!sid) {
      sid = await startNewSession();
      if (!sid) {
        toast.error("Failed to start chat session");
        setIsLoading(false);
        return;
      }
    }

    // Persist the user message and save a title on the first exchange
    persistMessage(sid, "user", userMessage);
    if (isFirstMessage) {
      const title = userMessage.slice(0, 45) + (userMessage.length > 45 ? "…" : "");
      saveTitle(sid, title);
      const now = new Date().toISOString();
      setSessions((prev) => {
        const exists = prev.some((s) => s.id === sid);
        if (exists) return prev.map((s) => s.id === sid ? { ...s, title, updatedAt: now } : s);
        return [{ id: sid!, title, createdAt: now, updatedAt: now }, ...prev];
      });
    }

    const apiHistory = [
      ...currentMessages.map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
      { role: "user", content: userMessage },
    ];

    try {
      const response = await fetch("/api/ai/converse", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiHistory }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      const result = data.result;
      const type: string = result?.type ?? "text";

      let aiText = "";
      let parsedSubtasks: ParsedSubtask[] | undefined;

      if (type === "question") {
        aiText = result.content ?? "";
      } else if (type === "breakdown") {
        parsedSubtasks = result.subtasks as ParsedSubtask[];
        aiText =
          (result.chat_opening ? result.chat_opening + "\n\n" : "") +
          parsedSubtasks.map((st, i) => `${i + 1}. **${st.subtask_name}** _(${st.energy_level} energy)_`).join("\n") +
          (result.chat_closing ? "\n\n" + result.chat_closing : "");
      } else if (type === "prioritize") {
        aiText =
          (result.chat_opening ? result.chat_opening + "\n\n" : "") +
          `**Focus Now:** ${result.focus_now}\n\n` +
          `**Do First:** ${result.matrix?.do_first?.join(", ")}\n` +
          `**Schedule:** ${result.matrix?.schedule?.join(", ")}\n` +
          `**Simplify:** ${result.matrix?.simplify?.join(", ")}\n` +
          `**Defer:** ${result.matrix?.defer?.join(", ")}` +
          (result.chat_closing ? "\n\n" + result.chat_closing : "");
      } else if (type === "momentum") {
        aiText = result.content ?? "";
      } else {
        aiText = typeof result === "string" ? result : JSON.stringify(result, null, 2);
      }

      const firstUserMsg = apiHistory.find((m) => m.role === "user")?.content ?? userMessage;
      setMessages((prev) => [...prev, {
        role: "ai", content: aiText,
        subtasks: parsedSubtasks,
        taskPrompt: parsedSubtasks ? firstUserMsg : undefined,
      }]);
      persistMessage(sid, "assistant", aiText);
      // Update the session's updatedAt in the sidebar
      setSessions((prev) =>
        prev.map((s) => s.id === sid ? { ...s, updatedAt: new Date().toISOString() } : s)
      );
    } catch {
      setMessages((prev) => [...prev, { role: "ai", content: "Sorry, I ran into an issue. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToBoard = async (msgIdx: number, taskName: string, subtasks: ParsedSubtask[]) => {
    if (!taskName.trim()) return;
    try {
      const taskRes = await fetch("/api/tasks", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_name: taskName.trim(), task_status: "Backlog", energy_level: subtasks[0]?.energy_level === "High" ? "High" : "Low" }),
      });
      if (!taskRes.ok) throw new Error();
      const task = await taskRes.json();
      await Promise.all(subtasks.map((st) =>
        fetch(`/api/tasks/${task.task_id}/subtasks`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subtask_name: st.subtask_name, energy_level: st.energy_level, is_approved: true }),
        })
      ));
      setMessages((prev) => prev.map((m, i) => i === msgIdx ? { ...m, addedToBoard: true } : m));
      toast.success(`"${taskName.trim()}" added to your board!`);
    } catch { toast.error("Failed to add task to board"); }
  };

  const isEmpty = messages.length === 0 && !isLoading;
  const activeSessionId = viewingHistoryId || chatSessionId;

  return (
    <div className="flex h-[calc(100vh-3.75rem)] -m-6 md:-m-8 overflow-hidden">

      {/* ── History Sidebar ──────────────────────────────────────────────── */}
      <HistorySidebar
        sessions={sessions}
        currentId={activeSessionId}
        isLoading={sessionsLoading}
        onSelect={handleSelectSession}
        onNew={handleNewChat}
        onDelete={handleDeleteSession}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />

      {/* ── Main Chat Area ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: "0.5px solid hsl(var(--border) / 0.3)" }}
        >
          <div className="flex items-center gap-3">
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="hidden md:flex p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              title={sidebarCollapsed ? "Show history" : "Hide history"}
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {/* Finch branding */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-ai-purple" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Finch AI</p>
                {viewingHistoryId && (
                  <p className="text-[10px] text-muted-foreground/50">Viewing past conversation</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {viewingHistoryId && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleNewChat}
                className="text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border/40 hover:border-border/70 transition-colors"
              >
                ← Back to current
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleNewChat}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
            >
              <Plus className="w-3.5 h-3.5" />
              New chat
            </motion.button>
          </div>
        </div>

        {/* Chat body */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Empty state */}
          <AnimatePresence>
            {isEmpty && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="flex-1 flex flex-col items-center overflow-y-auto"
              >
                {/* Brand — flexible spacer above + centered */}
                <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 min-h-0">
                  <motion.div
                    className="relative mb-5"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 280, damping: 20 }}
                  >
                    <motion.div
                      className="absolute inset-0 rounded-full bg-ai-purple/15"
                      animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-full bg-ai-purple/10"
                      animate={{ scale: [1, 1.55, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ duration: 3.5, delay: 0.4, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <div className="relative w-14 h-14 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-ai-purple" />
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center">
                    <h2 className="text-xl font-bold text-foreground mb-1">
                      Hi, I'm <span className="text-ai-purple">Finch.</span>
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-xs">Your ADHD-aware focus companion. Ask me anything — I won't judge.</p>
                  </motion.div>
                </div>

                {/* Cards + input — cohesive bottom unit */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="w-full max-w-2xl px-4 md:px-6 pb-4 flex flex-col gap-3 shrink-0"
                >
                  {/* 2×3 card grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {CHAT_TEMPLATES.map((t, i) => (
                      <motion.button
                        key={i}
                        onClick={() => { setInputValue(t.prompt); inputRef.current?.focus(); }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="group flex flex-col gap-2.5 w-full text-left px-4 py-3.5 rounded-xl border border-border/50 bg-card/60 hover:border-primary/30 hover:shadow-[0_0_0_3px_rgba(124,58,237,0.08)] transition-all"
                      >
                        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                          <t.icon className="w-3.5 h-3.5 text-ai-purple" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground leading-snug">{t.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t.subtitle}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  {/* Input bar — inline with cards */}
                  <AnimatePresence>
                    {attachments.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex gap-2 overflow-x-auto"
                      >
                        {attachments.map((att, i) => (
                          <div key={i} className="relative group shrink-0 w-16 h-16 rounded-xl bg-card border border-border overflow-hidden flex items-center justify-center">
                            <button
                              onClick={() => removeAttachment(i)}
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md z-10 scale-0 group-hover:scale-100 transition-transform"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            {att.type === "image" ? (
                              <img src={att.previewUrl} alt="preview" className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center text-muted-foreground p-1">
                                <FileText className="w-5 h-5 mb-0.5 text-ai-purple/70" />
                                <span className="text-[8px] truncate w-full text-center">{att.file.name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="relative rounded-2xl border border-border/60 bg-card shadow-sm focus-within:border-primary/30 focus-within:shadow-[0_0_0_3px_hsl(258_76%_58%/0.08)] transition-all">
                    <textarea
                      ref={inputRef}
                      rows={1}
                      className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none px-4 pt-3.5 pb-12 max-h-40 leading-relaxed"
                      placeholder="Ask Finch anything…"
                      value={inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = e.target.scrollHeight + "px";
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept="image/*,.pdf,.doc,.docx" />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent transition-colors"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] text-muted-foreground/30 font-mono ml-1">Shift+Enter for newline</span>
                      </div>
                      <Button
                        onClick={handleSend}
                        disabled={!inputValue.trim() && attachments.length === 0}
                        size="icon"
                        className={`h-8 w-8 rounded-xl shrink-0 transition-all ${
                          inputValue.trim() || attachments.length > 0
                            ? "bg-ai-purple hover:bg-ai-purple/90 text-white shadow-md shadow-ai-purple/25"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                        }`}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          {!isEmpty && (
            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-5 min-h-0">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "ai" && (
                    <div className="shrink-0 w-7 h-7 rounded-lg bg-ai-purple/10 border border-ai-purple/20 flex items-center justify-center mr-3 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-ai-purple" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2 max-w-[78%]">
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className={`flex flex-wrap gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        {msg.attachments.map((att, i) => (
                          <div key={i} className={`rounded-xl overflow-hidden border border-border/50 shadow-sm ${att.type === "image" ? "w-32 md:w-48" : "w-48 p-3 bg-card flex flex-col"}`}>
                            {att.type === "image" ? (
                              <img src={att.previewUrl} alt="attachment" className="w-full h-auto object-cover max-h-32" />
                            ) : (
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0"><FileText className="w-5 h-5" /></div>
                                <div className="overflow-hidden">
                                  <p className="text-xs font-medium truncate text-foreground">{att.file.name}</p>
                                  <p className="text-[10px] text-muted-foreground uppercase">{att.type}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.content && (
                      <div className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm shadow-md shadow-primary/15"
                          : "bg-card text-foreground rounded-2xl rounded-tl-sm border border-border/50"
                      }`}>
                        {msg.content}
                      </div>
                    )}
                    {msg.subtasks && msg.subtasks.length > 0 && (
                      <AcceptBreakdown
                        msgIdx={idx}
                        subtasks={msg.subtasks}
                        taskPrompt={msg.taskPrompt ?? ""}
                        addedToBoard={msg.addedToBoard ?? false}
                        onAccept={handleAddToBoard}
                      />
                    )}
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start items-start">
                  <div className="shrink-0 w-7 h-7 rounded-lg bg-ai-purple/10 border border-ai-purple/20 flex items-center justify-center mr-3 mt-0.5">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                      <Sparkles className="w-3.5 h-3.5 text-ai-purple" />
                    </motion.div>
                  </div>
                  <div className="px-4 py-3 bg-card rounded-2xl rounded-tl-sm border border-border/50">
                    <TypingDots />
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Composition area — only shown when conversation is active */}
          {!isEmpty && !isReadOnly && (
            <div className="shrink-0 pb-4 pt-2 px-4 md:px-6">
              <AnimatePresence>
                {attachments.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2 overflow-x-auto pb-3"
                  >
                    {attachments.map((att, i) => (
                      <div key={i} className="relative group shrink-0 w-16 h-16 rounded-xl bg-card border border-border overflow-hidden flex items-center justify-center">
                        <button
                          onClick={() => removeAttachment(i)}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md z-10 scale-0 group-hover:scale-100 transition-transform"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {att.type === "image" ? (
                          <img src={att.previewUrl} alt="preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center text-muted-foreground p-1">
                            <FileText className="w-5 h-5 mb-0.5 text-ai-purple/70" />
                            <span className="text-[8px] truncate w-full text-center">{att.file.name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative rounded-2xl border border-border/60 bg-card shadow-sm focus-within:border-primary/30 focus-within:shadow-[0_0_0_3px_hsl(258_76%_58%/0.08)] transition-all">
                <textarea
                  ref={inputRef}
                  rows={1}
                  className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none px-4 pt-3.5 pb-12 max-h-40 leading-relaxed"
                  placeholder="Ask Finch anything…"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept="image/*,.pdf,.doc,.docx" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent transition-colors"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] text-muted-foreground/30 font-mono ml-1">Shift+Enter for newline</span>
                  </div>
                  <Button
                    onClick={handleSend}
                    disabled={!inputValue.trim() && attachments.length === 0}
                    size="icon"
                    className={`h-8 w-8 rounded-xl shrink-0 transition-all ${
                      inputValue.trim() || attachments.length > 0
                        ? "bg-ai-purple hover:bg-ai-purple/90 text-white shadow-md shadow-ai-purple/25"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Read-only banner */}
          {isReadOnly && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="shrink-0 pb-4 pt-2 px-4 md:px-6"
            >
              <div
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
                style={{ background: "hsl(var(--muted) / 0.5)", border: "0.5px solid hsl(var(--border) / 0.4)" }}
              >
                <span className="text-muted-foreground text-xs">You're viewing a past conversation.</span>
                <button
                  onClick={handleNewChat}
                  className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Start new chat →
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
