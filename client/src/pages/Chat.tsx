import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  List, Star, Clock, Heart, ArrowUpRight, MapPin, Check, Plus, Paperclip, Globe, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { FinchBird, FinchBirdFlight } from "@/components/finch-bird";

// ─── Data ──────────────────────────────────────────────────────────────────

const MOODS = [
  { label: "Focused",     emoji: "⚡" },
  { label: "Overwhelmed", emoji: "😮" },
  { label: "Stuck",       emoji: "🧱" },
  { label: "Low energy",  emoji: "🔋" },
]

const MOOD_CONTEXT: Record<string, string> = {
  Focused:     "The user is feeling focused and ready to work. Suggest ambitious next steps.",
  Overwhelmed: "The user feels overwhelmed. Be calm, gentle, and help them pick ONE thing only. Never list more than 3 options.",
  Stuck:       "The user is stuck and procrastinating. Give them the smallest possible first action — something that takes under 2 minutes.",
  "Low energy": "The user has low energy. Suggest easy, low-friction tasks. Be encouraging and keep responses short.",
}

const PROMPT_CARDS = [
  {
    title:    "Break down a task",
    subtitle: "Turn one big scary task into manageable steps",
    prompt:   "Help me break down my most overwhelming task into small, concrete steps.",
    icon:     <List className="w-5 h-5 text-violet-600 dark:text-violet-300" style={{width:20,height:20}} />,
    iconBg:   "bg-violet-500/20 dark:bg-violet-500/20",
  },
  {
    title:    "Prioritise my day",
    subtitle: "Figure out what actually matters right now",
    prompt:   "Help me prioritise my tasks for today based on what actually matters.",
    icon:     <Star className="w-5 h-5 text-amber-600" fill="#d97706" style={{width:20,height:20}} />,
    iconBg:   "bg-amber-500/15 dark:bg-amber-500/20",
  },
  {
    title:    "Overcome procrastination",
    subtitle: "Get a tiny nudge to build momentum",
    prompt:   "I'm stuck and procrastinating. Help me get started with the smallest possible step.",
    icon:     <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" style={{width:20,height:20}} />,
    iconBg:   "bg-emerald-500/15 dark:bg-emerald-500/20",
  },
  {
    title:    "I'm feeling overwhelmed",
    subtitle: "Let's slow down and pick just one thing",
    prompt:   "I'm feeling overwhelmed by everything on my plate. Help me slow down and pick just one thing.",
    icon:     <Heart className="w-5 h-5 text-pink-500" fill="#ec4899" style={{width:20,height:20}} />,
    iconBg:   "bg-pink-500/15 dark:bg-pink-500/20",
  },
  {
    title:    "Help me start this task",
    subtitle: "Beat the blank page — let's begin together",
    prompt:   "Help me start a specific task. I know what I need to do but can't begin.",
    icon:     <ArrowUpRight className="w-5 h-5 text-violet-500" style={{width:20,height:20}} />,
    iconBg:   "bg-violet-500/15 dark:bg-violet-500/20",
  },
  {
    title:    "I need a break plan",
    subtitle: "Rest is productive. Let's plan it properly",
    prompt:   "Help me plan a proper break so I can come back refreshed.",
    icon:     <MapPin className="w-5 h-5 text-sky-500 dark:text-sky-400" style={{width:20,height:20}} />,
    iconBg:   "bg-sky-500/15 dark:bg-sky-500/20",
  },
]

// ─── Types ──────────────────────────────────────────────────────────────

interface Task {
  id: string
  title: string
  subtasks: { columnId: string }[]
}

interface Message {
  role: "user" | "ai"
  content: string
  suggestedTask?: { id: string; title: string }
}

interface TaskApiRow {
  task_id: string
  task_name: string
  subtasks?: Array<{ is_completed?: boolean }>
}

interface ChatHistoryRow {
  role: string
  content: string
}

interface BreakdownSubtaskRow {
  subtask_name: string
  energy_level: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function buildSystemPrompt(mood: string, tasks: Task[]): string {
  const taskContext = tasks.length > 0
    ? `The user currently has these active tasks:\n${tasks.map(t =>
        `- ${t.title} (${t.subtasks.filter(s => s.columnId !== 'done').length} subtasks remaining)`
      ).join('\n')}`
    : "The user has no active tasks yet."

  return `You are Finch, an ADHD-aware focus companion inside FocusNest — a productivity app built for how ADHD brains work.

Your personality:
- Warm, direct, and non-judgmental. You never make users feel bad for struggling.
- You understand that ADHD brains need: one clear next action, not lists of options. Concrete micro-steps. Positive reinforcement. Low-friction starts.
- Keep responses concise. ADHD users lose focus in long paragraphs. Use short sentences. Break things up.
- Never say "I understand your frustration" or other generic AI phrases. Respond like a knowledgeable friend.

Current user mood: ${mood}
Mood guidance: ${MOOD_CONTEXT[mood]}

${taskContext}

When suggesting a specific task to work on, format it exactly as:
SUGGEST_TASK: [subtask title] | [subtaskId]

This will render as a clickable "Start session" button in the UI.

Never suggest more than one task at a time. One thing. That's the whole point.`
}

// ─── Chat Page Component ────────────────────────────────────────────────

const Chat = () => {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const router = useNavigate()
  const prefersReducedMotion = useReducedMotion()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeMood, setActiveMood] = useState("Focused")
  const [tasks, setTasks] = useState<Task[]>([])
  const [chatSessionId, setChatSessionId] = useState<string | null>(null)
  const [searchParams] = useSearchParams()

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  // Fetch tasks for AI context
  useEffect(() => {
    fetch("/api/tasks", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: TaskApiRow[]) =>
        setTasks(
          data.map((t) => ({
            id: t.task_id,
            title: t.task_name,
            subtasks:
              t.subtasks?.map((st) => ({ columnId: st.is_completed ? "done" : "todo" })) || [],
          })),
        ),
      )
      .catch(() => {})
  }, [])

  // Load session from URL param (navigated from /chat/history)
  useEffect(() => {
    const sid = searchParams.get("session")
    if (!sid) return
    fetch(`/api/chat/${sid}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((data: ChatHistoryRow[]) => {
        const loaded: Message[] = data
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role === "assistant" ? "ai" : "user", content: m.content }))
        setMessages(loaded)
        setChatSessionId(sid)
      })
      .catch(() => {})
  }, [searchParams])

  const startNewSession = useCallback(async () => {
    try {
      const r = await fetch("/api/chat", { method: "POST", credentials: "include" })
      if (!r.ok) return null
      const d = await r.json()
      setChatSessionId(d.chat_session_id)
      return d.chat_session_id as string
    } catch { return null }
  }, [])

  const startNewChat = useCallback(() => {
    if (chatSessionId && messages.length > 0) {
      fetch(`/api/chat/${chatSessionId}`, { method: "PATCH", credentials: "include" }).catch(() => {})
    }
    setMessages([])
    setInput("")
    setChatSessionId(null)
  }, [chatSessionId, messages.length])

  const sendMessage = async (userText: string) => {
    if (!userText.trim()) return

    const currentMessages = messages
    setMessages(prev => [...prev, { role: "user", content: userText }])
    setInput("")
    setIsLoading(true)

    let sid = chatSessionId
    if (!sid) {
      sid = await startNewSession()
      if (!sid) {
        toast.error("Failed to start chat session")
        setIsLoading(false)
        return
      }
    }

    fetch(`/api/chat/${sid}/messages`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "user", content: userText }),
    }).catch(() => {})

    const systemPromptMessage = { role: "system", content: buildSystemPrompt(activeMood, tasks) }
    const apiHistory = [
      systemPromptMessage,
      ...currentMessages.map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
      { role: "user", content: userText },
    ]

    try {
      const response = await fetch("/api/ai/converse", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiHistory }),
      })
      if (!response.ok) throw new Error()
      const data = await response.json()
      const result = data.result
      const type = result?.type ?? "text"

      let aiText = ""
      if (typeof result === "string") {
        aiText = result
      } else if (type === "question" || type === "momentum") {
        aiText = result.content ?? ""
      } else if (type === "breakdown") {
        aiText = (result.chat_opening ? result.chat_opening + "\n\n" : "") +
          (result.subtasks || [])
            .map((st: BreakdownSubtaskRow, i: number) => `${i + 1}. **${st.subtask_name}** _(${st.energy_level})_`)
            .join("\n") +
          (result.chat_closing ? "\n\n" + result.chat_closing : "")
      } else if (type === "prioritize") {
        aiText = (result.chat_opening ? result.chat_opening + "\n\n" : "") +
          `**Focus Now:** ${result.focus_now}\n\n` +
          `**Do First:** ${result.matrix?.do_first?.join(", ")}\n` +
          (result.chat_closing ? "\n\n" + result.chat_closing : "")
      } else {
        aiText = JSON.stringify(result, null, 2)
      }

      let suggestedTaskObj = undefined
      const taskMatch = aiText.match(/SUGGEST_TASK:\s*(.+?)\s*\|\s*([^\n\r]+)/)
      if (taskMatch) {
        suggestedTaskObj = { title: taskMatch[1].trim(), id: taskMatch[2].trim() }
        aiText = aiText.replace(/SUGGEST_TASK:.*$/m, "").trim()
      }

      setMessages(prev => [...prev, { role: "ai", content: aiText, suggestedTask: suggestedTaskObj }])

      fetch(`/api/chat/${sid}/messages`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "assistant", content: aiText }),
      }).catch(() => {})

    } catch {
      setMessages(prev => [...prev, { role: "ai", content: "Sorry, I ran into an issue. Please try again." }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = () => { sendMessage(input) }
  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col min-h-[calc(100vh-3rem)] -m-6 md:-m-8 bg-transparent">

      {/* ── Top action bar ── */}
      <div className={cn(
        "flex items-center justify-between px-5 py-2.5 shrink-0",
        "border-b border-violet-200/15 dark:border-white/[0.06]",
        "bg-white/[0.25] dark:bg-transparent backdrop-blur-sm"
      )}>
        <Link
          to="/chat/history"
          className="flex items-center gap-1.5 text-[12px] text-[#1a1830]/55 dark:text-slate-400 hover:text-violet-600 dark:hover:text-slate-200 transition-colors"
        >
          <Clock className="w-3.5 h-3.5" style={{width:14,height:14}} />
          History
        </Link>
        <AnimatePresence>
          {messages.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              onClick={startNewChat}
              className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors
                         bg-violet-500/10 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300
                         hover:bg-violet-500/16 dark:hover:bg-violet-500/22
                         border border-violet-400/20 dark:border-violet-400/25"
            >
              <Plus className="w-3 h-3" style={{width:12,height:12}} />
              New chat
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Main chat column ── */}
      <div className="flex flex-col flex-1 min-w-0">

        <div className="flex-1 flex flex-col overflow-y-auto min-h-0 relative z-10">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center
                            flex-1 px-6 pt-10 pb-6 text-center">

              {/* Avatar */}
              <div className="relative mb-6">
                <div className="w-[88px] h-[88px] rounded-full flex items-center justify-center
                                bg-gradient-to-br from-violet-500 to-[#3d2e9e]
                                shadow-[0_14px_36px_rgba(124,111,247,0.40)] relative z-10">
                  <FinchBirdFlight size={52} variant="white" />
                </div>
                <motion.div
                  className="absolute inset-[-8px] rounded-full
                             border-[1.5px] border-violet-400/25
                             dark:border-violet-400/28 pointer-events-none"
                  animate={prefersReducedMotion ? {} : { opacity: [0.3, 1, 0.3], scale: [1, 1.015, 1] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} />
                <motion.div
                  className="absolute inset-[-16px] rounded-full
                             border border-violet-400/12
                             dark:border-violet-400/14 pointer-events-none"
                  animate={prefersReducedMotion ? {} : { opacity: [0.3, 1, 0.3], scale: [1, 1.015, 1] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.7 }} />
              </div>

              <motion.h2
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-[28px] font-extrabold tracking-tight mb-1.5"
                style={{ color: isDark ? "#ffffff" : "#1a1830" }}>
                Hi, I'm{" "}
                <span style={{ color: isDark ? "#a78bfa" : "#7c3aed" }}>Finch.</span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-[13px] leading-relaxed mb-3 max-w-[300px]"
                style={{ color: isDark ? "rgba(148,163,184,1)" : "rgba(26,24,48,0.60)" }}>
                Your ADHD-aware focus companion.<br />
                Ask me anything — I won't judge.
              </motion.p>

              {/* Mood selector */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex gap-2 flex-wrap justify-center mb-7">
                {MOODS.map((mood) => (
                  <button
                    key={mood.label}
                    onClick={() => setActiveMood(mood.label)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-[12px] font-[600] border-[1.5px] transition-all duration-150",
                      activeMood === mood.label
                        ? "bg-violet-500/10 dark:bg-violet-500/20 border-violet-400/42 dark:border-violet-400/50 text-violet-600 dark:text-violet-300 ring-2 ring-violet-400/20 dark:ring-violet-500/30"
                        : "bg-white/50 dark:bg-white/[0.05] border-violet-300/20 dark:border-slate-700/60 text-[#1a1830]/60 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-white/[0.10] hover:border-violet-400/40 dark:hover:border-slate-500/80 hover:text-violet-600 dark:hover:text-slate-200 hover:ring-2 hover:ring-violet-400/20 dark:hover:ring-violet-500/25"
                    )}>
                    {mood.emoji} {mood.label}
                  </button>
                ))}
              </motion.div>

              {/* Prompt cards */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="grid grid-cols-2 gap-2 w-full max-w-[520px] mb-5">
                {PROMPT_CARDS.map((card) => (
                  <button
                    key={card.title}
                    onClick={() => sendMessage(card.prompt)}
                    className={cn(
                      "group flex flex-col gap-0 p-5 rounded-2xl text-left cursor-pointer",
                      "border transition-all duration-150",
                      "bg-white/70 dark:bg-white/[0.05]",
                      "border-violet-200/20 dark:border-slate-700/50",
                      "hover:bg-white/95 dark:hover:bg-white/[0.10]",
                      "hover:shadow-lg hover:border-violet-300/40 dark:hover:border-slate-600/60",
                      "hover:-translate-y-[2px]",
                    )}>
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      card.iconBg
                    )}>
                      {card.icon}
                    </div>
                    <h3 className="text-[13px] font-[700] mb-0.5 mt-3"
                        style={{ color: isDark ? "rgba(226,232,240,1)" : "#1a1830" }}>
                      {card.title}
                    </h3>
                    <p className="text-[11px] leading-snug"
                       style={{ color: isDark ? "rgba(148,163,184,1)" : "rgba(26,24,48,0.55)" }}>
                      {card.subtitle}
                    </p>
                  </button>
                ))}
              </motion.div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto py-8">
              <div className="max-w-3xl mx-auto px-4 md:px-6 space-y-7">
                {messages.map((message, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {message.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[72%] px-4 py-3 rounded-[18px_18px_4px_18px]
                                        text-[13px] leading-relaxed
                                        bg-violet-500/18 border border-violet-400/28"
                             style={{ color: isDark ? "rgba(255,255,255,0.90)" : "#1a1830" }}>
                          {message.content}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-violet-500
                                        to-[#3d2e9e] flex items-center justify-center
                                        shrink-0 mt-0.5">
                          <FinchBird size={14} variant="white" />
                        </div>
                        <div className="max-w-[82%] px-4 py-3 rounded-[4px_18px_18px_18px]
                                        text-[13px] leading-relaxed
                                        bg-white/[0.04] border border-white/[0.08]
                                        backdrop-blur-sm whitespace-pre-wrap"
                             style={{ color: isDark ? "rgba(226,232,240,1)" : "rgba(26,24,48,0.88)" }}>
                          {message.content}
                          {message.suggestedTask && (
                            <button
                              onClick={() => router(`/sessions?subtaskId=${message.suggestedTask!.id}&autostart=true`)}
                              className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl
                                         bg-violet-500/15 border border-violet-400/28
                                         text-[12px] font-[600] text-violet-600 dark:text-violet-300
                                         hover:bg-violet-500/25 transition-all duration-150 w-full">
                              <Check className="w-3.5 h-3.5 shrink-0" style={{width:14,height:14}} />
                              {message.suggestedTask.title} → Start session
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-violet-500
                                    to-[#3d2e9e] flex items-center justify-center shrink-0">
                      <FinchBird size={14} variant="white" />
                    </div>
                    <div className="flex gap-1.5 px-4 py-3.5 rounded-[4px_18px_18px_18px]
                                    bg-white/[0.04] border border-white/[0.08]">
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <motion.div key={i}
                          className="w-1.5 h-1.5 rounded-full bg-violet-400/60"
                          animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay }} />
                      ))}
                    </div>
                  </motion.div>
                )}
                <div ref={bottomRef} className="h-4" />
              </div>
            </div>
          )}
        </div>

        {/* ── Input bar ── */}
        <div className="sticky bottom-0 z-20 px-5 py-4
                        border-t border-violet-200/12 dark:border-white/[0.05]">
          <div className="max-w-2xl mx-auto">
            <div className={cn(
              "rounded-[18px] px-4 pt-3 pb-2.5",
              "bg-white/80 dark:bg-white/[0.04]",
              "border-[1.5px] border-violet-300/20 dark:border-white/[0.09]",
              "backdrop-blur-[14px]",
              "focus-within:border-violet-400/48 dark:focus-within:border-violet-500/42",
              "transition-colors duration-150"
            )}>
              <textarea
                ref={inputRef}
                rows={1}
                placeholder="Ask Finch anything..."
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = "auto"
                  e.target.style.height = e.target.scrollHeight + "px"
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                className="w-full bg-transparent border-none outline-none resize-none
                           text-[14px] leading-relaxed min-h-[20px] max-h-[120px]
                           text-[#1a1830] dark:text-slate-100
                           placeholder:text-[#1a1830]/40 dark:placeholder:text-slate-500" />

              <div className="flex items-center justify-between mt-2.5">
                <div className="flex items-center gap-1.5">
                  <button className="w-7 h-7 rounded-lg flex items-center justify-center
                                     bg-violet-500/07 dark:bg-white/[0.06]
                                     text-violet-500/50 dark:text-slate-400
                                     hover:bg-violet-500/14 dark:hover:bg-white/[0.11]
                                     hover:text-violet-600 dark:hover:text-slate-200
                                     border-none transition-all duration-150">
                    <Paperclip className="w-3.5 h-3.5" style={{width:14,height:14}} />
                  </button>
                  <button className="w-7 h-7 rounded-lg flex items-center justify-center
                                     bg-violet-500/07 dark:bg-white/[0.06]
                                     text-violet-500/50 dark:text-slate-400
                                     hover:bg-violet-500/14 dark:hover:bg-white/[0.11]
                                     hover:text-violet-600 dark:hover:text-slate-200
                                     border-none transition-all duration-150">
                    <Globe className="w-3.5 h-3.5" style={{width:14,height:14}} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl
                                  bg-violet-500/10 dark:bg-violet-500/15
                                  border border-violet-400/18 dark:border-violet-400/22
                                  text-[11px] font-[600]
                                  text-violet-600 dark:text-violet-300 cursor-pointer
                                  hover:bg-violet-500/16 dark:hover:bg-violet-500/22
                                  transition-colors duration-150">
                    <FinchBird size={14} variant={isDark ? "purple" : "light"} />
                    Finch 1.0
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      "transition-all duration-150 border-none",
                      input.trim() && !isLoading
                        ? "bg-violet-500 hover:bg-violet-600 hover:scale-[1.08] active:scale-[0.95]"
                        : "bg-violet-500/20 dark:bg-white/[0.06] cursor-not-allowed"
                    )}>
                    <ArrowRight className="w-3.5 h-3.5 text-white" style={{width:14,height:14}} />
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-center mt-2.5"
               style={{ color: isDark ? "rgba(100,116,139,1)" : "rgba(26,24,48,0.45)" }}>
              Finch can make mistakes. Use good judgement.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Chat
