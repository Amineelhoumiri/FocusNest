import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Plus, Trash2, Clock, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatSession {
  chat_session_id: string;
  created_at: string;
  updated_at: string;
  ended_at: string | null;
}

interface GroupedSessions {
  label: string;
  sessions: ChatSession[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function groupSessionsByDate(sessions: ChatSession[]): GroupedSessions[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const thisWeekStart = new Date(today); thisWeekStart.setDate(today.getDate() - 6);

  const groups: Record<string, ChatSession[]> = {};

  for (const s of sessions) {
    const d = new Date(s.updated_at);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    let label: string;
    if (day.getTime() === today.getTime()) label = "Today";
    else if (day.getTime() === yesterday.getTime()) label = "Yesterday";
    else if (day >= thisWeekStart) label = "This week";
    else label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groups[label]) groups[label] = [];
    groups[label].push(s);
  }

  const ORDER = ["Today", "Yesterday", "This week"];
  return Object.entries(groups)
    .sort(([a], [b]) => {
      const ai = ORDER.indexOf(a); const bi = ORDER.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return new Date(b).getTime() - new Date(a).getTime();
    })
    .map(([label, sessions]) => ({ label, sessions }));
}

// ─── Page ────────────────────────────────────────────────────────────────────

const ChatHistory = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSessions = () => {
    fetch("/api/chat", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadSessions(); }, []);

  const handleDelete = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(sid);
    try {
      const r = await fetch(`/api/chat/${sid}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error();
      setSessions(prev => prev.filter(s => s.chat_session_id !== sid));
      toast.success("Conversation deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleNewChat = async () => {
    try {
      const r = await fetch("/api/chat", { method: "POST", credentials: "include" });
      if (!r.ok) return navigate("/chat");
      const d = await r.json();
      navigate(`/chat?session=${d.chat_session_id}`);
    } catch {
      navigate("/chat");
    }
  };

  const grouped = groupSessionsByDate(sessions);

  const cardBase: React.CSSProperties = {
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.80)",
    border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(83,74,183,0.12)",
    borderRadius: "14px",
    backdropFilter: "blur(12px)",
  };

  return (
    <div className="max-w-2xl mx-auto pb-12">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center justify-between mb-8 pt-1"
      >
        <div className="flex items-center gap-3">
          <Link
            to="/chat"
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-xl transition-colors",
              isDark
                ? "text-slate-400 hover:text-slate-200 hover:bg-white/[0.07]"
                : "text-[#534AB7]/60 hover:text-[#534AB7] hover:bg-violet-500/08"
            )}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Chat history
            </h1>
            <p className="text-[12px] mt-0.5" style={{ color: isDark ? "rgba(148,163,184,1)" : "rgba(26,24,48,0.55)" }}>
              {sessions.length} conversation{sessions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleNewChat}
          className="flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-xl text-white transition-all"
          style={{
            background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
            boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          New chat
        </motion.button>
      </motion.div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(83,74,183,0.05)" }} />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 py-20 text-center"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: isDark ? "rgba(124,111,247,0.12)" : "rgba(83,74,183,0.08)", border: "1px solid rgba(124,111,247,0.18)" }}
          >
            <MessageSquare className="w-6 h-6" style={{ color: "#7c6ff7" }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No conversations yet</p>
            <p className="text-[12px] mt-1" style={{ color: isDark ? "rgba(148,163,184,1)" : "rgba(26,24,48,0.50)" }}>
              Start a chat with Finch to see it here.
            </p>
          </div>
          <button
            onClick={handleNewChat}
            className="text-[13px] font-semibold px-5 py-2 rounded-xl text-violet-600 dark:text-violet-300 transition-colors"
            style={{ background: isDark ? "rgba(124,111,247,0.12)" : "rgba(83,74,183,0.08)", border: "1px solid rgba(124,111,247,0.20)" }}
          >
            Start your first chat →
          </button>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map((group, gi) => (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.06, duration: 0.35 }}
            >
              {/* Group label */}
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-2.5 px-1"
                style={{ color: isDark ? "rgba(148,163,184,1)" : "rgba(83,74,183,0.55)" }}>
                {group.label}
              </p>

              {/* Session cards */}
              <div className="flex flex-col gap-1.5">
                <AnimatePresence>
                  {group.sessions.map((s, i) => (
                    <motion.div
                      key={s.chat_session_id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8, height: 0, marginBottom: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.25 }}
                    >
                      <button
                        onClick={() => navigate(`/chat?session=${s.chat_session_id}`)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left group transition-all duration-150"
                        style={{
                          ...cardBase,
                          ...(deletingId === s.chat_session_id ? { opacity: 0.5 } : {}),
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = isDark
                            ? "rgba(255,255,255,0.07)"
                            : "rgba(255,255,255,0.95)";
                          (e.currentTarget as HTMLElement).style.borderColor = isDark
                            ? "rgba(124,111,247,0.22)"
                            : "rgba(83,74,183,0.22)";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(255,255,255,0.80)";
                          (e.currentTarget as HTMLElement).style.borderColor = isDark
                            ? "rgba(255,255,255,0.07)"
                            : "rgba(83,74,183,0.12)";
                        }}
                      >
                        {/* Icon */}
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: isDark ? "rgba(124,111,247,0.12)" : "rgba(83,74,183,0.08)" }}
                        >
                          <MessageSquare className="w-4 h-4" style={{ color: "#7c6ff7" }} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-foreground/90 leading-tight">
                            Conversation
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3 shrink-0" style={{ color: isDark ? "rgba(148,163,184,0.6)" : "rgba(83,74,183,0.40)" }} />
                            <span className="text-[11px]" style={{ color: isDark ? "rgba(148,163,184,1)" : "rgba(26,24,48,0.50)" }}>
                              {formatTime(s.updated_at)}
                              {s.ended_at && (
                                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full"
                                  style={{ background: isDark ? "rgba(29,158,117,0.12)" : "rgba(16,185,129,0.08)", color: isDark ? "#5DCAA5" : "#065F46" }}>
                                  ended
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Delete */}
                        <button
                          onClick={(e) => handleDelete(s.chat_session_id, e)}
                          disabled={deletingId === s.chat_session_id}
                          className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150 disabled:opacity-30"
                          style={{ color: isDark ? "rgba(148,163,184,0.6)" : "rgba(83,74,183,0.45)" }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                          onMouseLeave={e => (e.currentTarget.style.color = isDark ? "rgba(148,163,184,0.6)" : "rgba(83,74,183,0.45)")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Arrow */}
                        <ArrowLeft
                          className="w-3.5 h-3.5 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: isDark ? "rgba(148,163,184,0.7)" : "rgba(83,74,183,0.50)" }}
                        />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatHistory;
