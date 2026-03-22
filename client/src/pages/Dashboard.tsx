import { motion, AnimatePresence, useMotionValue, animate, useReducedMotion } from "framer-motion";
import {
  Play, CheckCircle2, Clock, Flame, Zap, Leaf, Plus, X,
  ChevronUp, Sparkles, ListChecks,
} from "lucide-react";
import { useFocusScore } from "@/context/FocusScoreContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// ─── Animated number ──────────────────────────────────────────────────────────

const AnimatedNumber = ({ value, suffix }: { value: number; suffix?: string }) => {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const c = animate(mv, value, { duration: 1.2, ease: "easeOut", onUpdate: (v) => setDisplay(Math.floor(v)) });
    return c.stop;
  }, [value]);
  return <>{display}{suffix && <span className="text-sm font-normal text-muted-foreground ml-0.5">{suffix}</span>}</>;
};

// ─── Entrance animation variants ──────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: i * 0.07 },
  }),
};

// ─── Bento card wrapper ───────────────────────────────────────────────────────

const BentoCard = ({
  title,
  children,
  className = "",
  actions,
  defaultOpen = true,
  cardStyle,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  defaultOpen?: boolean;
  cardStyle?: React.CSSProperties;
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <motion.div
      className={`overflow-hidden flex flex-col ${className}`}
      style={{
        background: "hsl(var(--card))",
        borderRadius: "1.25rem",
        border: "1px solid hsl(var(--border) / 0.6)",
        boxShadow: "var(--card-shadow)",
        ...cardStyle,
      }}
      whileHover={{
        borderColor: "hsl(var(--primary) / 0.35)",
        boxShadow: "var(--card-shadow-hover)",
      }}
      transition={{ duration: 0.25 }}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between px-6 py-4 cursor-pointer select-none shrink-0"
        style={{ borderBottom: "0.5px solid hsl(var(--border) / 0.35)" }}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em]">{title}</span>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {actions}
          <button onClick={() => setOpen((v) => !v)} className="p-0.5 text-muted-foreground/25 hover:text-muted-foreground/60 transition-colors duration-300">
            <motion.div animate={{ rotate: open ? 0 : 180 }} transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}>
              <ChevronUp className="w-3.5 h-3.5" />
            </motion.div>
          </button>
        </div>
      </div>

      {/* Card body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden flex-1"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Quick add modal ──────────────────────────────────────────────────────────

const QuickAddModal = ({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) => {
  const [name, setName] = useState("");
  const [energy, setEnergy] = useState<"Low" | "High">("Low");
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_name: name, energy_level: energy }),
      });
      if (!res.ok) throw new Error();
      toast.success("Task added!");
      onAdded(); onClose();
    } catch { toast.error("Failed."); setLoading(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border) / 0.6)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <span className="text-sm font-medium text-foreground/70">new task</span>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded-full transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <input
          ref={ref} value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="What needs to get done?"
          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-4"
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button onClick={() => setEnergy("Low")} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${energy === "Low" ? "bg-emerald-500/15 text-emerald-500" : "text-muted-foreground hover:bg-accent"}`}>🌿 Low</button>
            <button onClick={() => setEnergy("High")} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${energy === "High" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent"}`}>⚡ High</button>
          </div>
          <button
            onClick={handleAdd} disabled={!name.trim() || loading}
            className="text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg disabled:opacity-40 transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add →"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const Dashboard = () => {
  const { user } = useAuth();
  const { score, streak } = useFocusScore();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const prefersReducedMotion = useReducedMotion();

  const [tasks, setTasks] = useState<{
    task_id: string;
    task_name: string;
    task_status: string;
    energy_level: string;
    total_subtasks: number;
    completed_subtasks: number;
  }[]>([]);
  const [sessionsData, setSessionsData] = useState<{ start_time: string; end_time: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchData = async () => {
    try {
      const [tr, sr] = await Promise.all([fetch("/api/tasks"), fetch("/api/sessions")]);
      if (!tr.ok || !sr.ok) throw new Error();
      setTasks(await tr.json());
      setSessionsData(await sr.json());
    } catch { toast.error("Failed to load dashboard data."); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const completedSessions = sessionsData.filter((s) => s.end_time);
  const todaySessions = completedSessions.filter(
    (s) => new Date(s.start_time).toDateString() === new Date().toDateString()
  );
  const totalFocusTime = todaySessions.reduce((acc, s) =>
    acc + Math.floor((new Date(s.end_time!).getTime() - new Date(s.start_time).getTime()) / 60000), 0);

  const activeTask = tasks.find((t) => t.task_status === "Doing");
  const doneCount  = tasks.filter((t) => t.task_status === "Done").length;
  const backlogCount = tasks.filter((t) => t.task_status === "Backlog").length;
  const activeTasks  = tasks.filter((t) => t.task_status !== "Done");

  const hour = clock.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  const clockStr = clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const dateStr  = clock.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const scoreNorm   = Math.min(score / 500, 1);
  const circumference = 2 * Math.PI * 36;

  const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
    Doing:   { label: "Doing",   bg: isLight ? "#EDE9FE" : "hsl(var(--primary) / 0.15)",        color: isLight ? "#5B21B6" : "hsl(var(--primary))" },
    Ready:   { label: "To Do",   bg: isLight ? "#FEF3C7" : "hsl(221 83% 53% / 0.15)",           color: isLight ? "#92400E" : "hsl(221 83% 65%)" },
    Backlog: { label: "Backlog", bg: isLight ? "#E8E6F0" : "hsl(var(--muted))",                  color: isLight ? "#6B6890" : "hsl(var(--muted-foreground))" },
    Done:    { label: "Done",    bg: isLight ? "#D1FAE5" : "hsl(152 60% 36% / 0.15)",            color: isLight ? "#065F46" : "hsl(152 60% 50%)" },
  };
  const energyConfig: Record<string, { label: string; bg: string; color: string; icon: typeof Zap }> = {
    High: { label: "High", bg: isLight ? "#FFE4E6" : "hsl(var(--primary) / 0.10)", color: isLight ? "#BE123C" : "hsl(var(--primary))", icon: Zap  },
    Low:  { label: "Low",  bg: isLight ? "#E0F2FE" : "hsl(152 60% 36% / 0.10)",   color: isLight ? "#0369A1" : "hsl(152 60% 50%)",    icon: Leaf },
  };

  return (
    <div className="relative max-w-6xl mx-auto pb-8">

      {/* ── Ambient background ────────────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 10%, hsl(var(--primary) / 0.06) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 80%, hsl(174 48% 42% / 0.04) 0%, transparent 60%)
          `,
        }}
      />
      {/* Grain overlay */}
      <svg className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]" style={{ width: "100vw", height: "100vh" }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        custom={0}
        className="relative z-10 flex items-end justify-between mb-8"
      >
        <div>
          <p className="text-[10px] text-muted-foreground/35 tracking-[0.18em] uppercase mb-2">{dateStr}</p>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2 flex-wrap">
            {greeting},{" "}
            <span className="text-primary/80">{firstName}</span>
            <motion.span
              animate={prefersReducedMotion ? {} : { y: [0, -5, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              className="inline-block select-none"
            >
              {hour < 12 ? "🌅" : hour < 17 ? "☀️" : "🌙"}
            </motion.span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="font-mono text-xs flex items-center gap-1.5 tabular-nums" style={{ color: isLight ? "#6B6890" : "hsl(var(--muted-foreground) / 0.6)" }}>
            <motion.div
              className="w-1 h-1 rounded-full bg-primary/50"
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <span>{clockStr.slice(0, -3)}</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={clock.getSeconds()}
                initial={prefersReducedMotion ? undefined : { opacity: 0.2, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="inline-block"
              >
                :{String(clock.getSeconds()).padStart(2, "0")}
              </motion.span>
            </AnimatePresence>
          </div>

          <Link to="/pricing">
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="text-xs text-muted-foreground/40 hover:text-muted-foreground/70 px-3 py-1.5 rounded-xl border border-border/25 hover:border-border/45 transition-all duration-500"
            >
              ✦ Upgrade
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="relative z-10 flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="relative z-10 flex flex-col gap-4">

          {/* ── Active task indicator ──────────────────────────────────────── */}
          {activeTask && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={1}
              className="flex items-center gap-4 px-5 py-3.5 rounded-2xl"
              style={{
                background: "linear-gradient(90deg, hsl(var(--primary) / 0.06), hsl(var(--primary) / 0.02))",
                border: "0.5px solid hsl(var(--primary) / 0.2)",
                boxShadow: "0 2px 12px hsl(var(--primary) / 0.08)",
              }}
            >
              <div className="zen-dot shrink-0" />
              <p className="text-sm text-muted-foreground/60 font-light flex-1 min-w-0">
                Currently on —{" "}
                <span className="text-foreground/70 font-medium">{activeTask.task_name}</span>
              </p>
              <Link to="/sessions">
                <span className="text-xs text-primary/50 hover:text-primary/80 transition-colors duration-300 tracking-wide">
                  focus →
                </span>
              </Link>
            </motion.div>
          )}

          {/* ── Main bento grid: row 1 ─────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-4">

            {/* Tasks table — full width */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={2}
              className="col-span-3"
            >
              <BentoCard
                title="Assigned to Me"
                className="h-full"
                actions={
                  <Link to="/tasks">
                    <button className="text-xs text-primary hover:underline font-semibold" onClick={(e) => e.stopPropagation()}>
                      View Board
                    </button>
                  </Link>
                }
              >
                <div className="overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-[1.5rem_1fr_5rem_5rem] gap-3 px-5 pt-3 pb-2 border-b border-border/20">
                    <div />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Task Name</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Energy</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Status</span>
                  </div>

                  {/* Task rows */}
                  <div className="divide-y divide-border/15">
                    {activeTasks.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45 }}
                        className="px-5 py-10 flex flex-col items-center gap-3"
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ background: "hsl(var(--primary) / 0.08)", border: "1px solid hsl(var(--primary) / 0.15)" }}
                        >
                          <CheckCircle2 className="w-5 h-5 text-primary/50" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-foreground/60">You're all caught up ✨</p>
                          <p className="text-xs text-muted-foreground/40 mt-1">No active tasks — enjoy the calm.</p>
                        </div>
                        <button
                          onClick={() => setShowQuickAdd(true)}
                          className="text-xs text-primary/60 hover:text-primary border border-primary/20 hover:border-primary/40 px-4 py-1.5 rounded-lg transition-all duration-300 mt-1"
                        >
                          + Add a task
                        </button>
                      </motion.div>
                    ) : (
                      activeTasks.slice(0, 5).map((task, i) => {
                        const eCfg = energyConfig[task.energy_level] ?? energyConfig.Low;
                        const sCfg = statusConfig[task.task_status] ?? statusConfig.Backlog;
                        const EIcon = eCfg.icon;
                        const isDoing = task.task_status === "Doing";
                        const badgeStyle: React.CSSProperties = { borderRadius: "999px", padding: "4px 10px", fontWeight: 500 };
                        return (
                          <motion.div
                            key={task.task_id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.12 + i * 0.05, duration: 0.4 }}
                            className={`grid grid-cols-[1.5rem_1fr_5rem_5rem] gap-3 px-5 py-3 items-center group transition-colors duration-200 ${
                              isDoing ? "bg-primary/[0.04]" : "hover:bg-primary/[0.025]"
                            }`}
                          >
                            {/* Checkbox */}
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isDoing ? "border-primary/60 bg-primary/20" : "border-border/50 group-hover:border-primary/30"}`}>
                              {isDoing && (
                                <motion.div
                                  className="w-1.5 h-1.5 rounded-full bg-primary"
                                  animate={{ scale: [1, 1.3, 1] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                />
                              )}
                            </div>

                            {/* Task name */}
                            <Link to="/tasks" className="min-w-0">
                              <p className={`text-sm font-medium truncate transition-colors ${isDoing ? "text-foreground" : "text-foreground/75 group-hover:text-foreground/90"}`} style={{ lineHeight: 1.5 }}>
                                {task.task_name}
                              </p>
                              {task.total_subtasks > 0 && (
                                <p className="text-[10px] text-muted-foreground/40 mt-0.5 font-mono">
                                  {task.completed_subtasks}/{task.total_subtasks} subtasks
                                </p>
                              )}
                            </Link>

                            {/* Energy */}
                            <div>
                              <span
                                className="inline-flex items-center gap-1 text-[10px]"
                                style={{ ...badgeStyle, background: eCfg.bg, color: eCfg.color }}
                              >
                                <EIcon className="w-2.5 h-2.5" />
                                {eCfg.label}
                              </span>
                            </div>

                            {/* Status */}
                            <div>
                              <span
                                className="inline-flex items-center text-[10px]"
                                style={{ ...badgeStyle, background: sCfg.bg, color: sCfg.color }}
                              >
                                {sCfg.label}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>

                  {/* Table footer */}
                  <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: "0.5px solid hsl(var(--border) / 0.25)" }}>
                    <span className="text-[10px] text-muted-foreground/30 tracking-wide">{activeTasks.length} active</span>
                    <Link to="/chat">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-1 text-[11px] text-ai-purple/50 hover:text-ai-purple/80 transition-colors duration-400"
                      >
                        <Sparkles className="w-3 h-3" /> prioritize
                      </motion.button>
                    </Link>
                  </div>
                </div>
              </BentoCard>
            </motion.div>

          </div>

          {/* ── Bento grid: row 2 ──────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-4">

            {/* Focus Score */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={4}
            >
              <BentoCard
                title="Focus Score"
                className="h-full"
                cardStyle={isLight ? { background: "linear-gradient(135deg, #F0EDFB 0%, #E8E3F8 100%)" } : undefined}
              >
                <div className="px-5 pb-5 pt-3 flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    {/* Ember ring */}
                    <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
                      {!prefersReducedMotion && (
                        <motion.div
                          className="absolute inset-0 rounded-full pointer-events-none"
                          animate={{ boxShadow: ["0 0 0 0 hsl(var(--primary) / 0.4)", "0 0 0 6px hsl(var(--primary) / 0)", "0 0 0 0 hsl(var(--primary) / 0)"] }}
                          transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
                        />
                      )}
                      <svg width={80} height={80} style={{ transform: "rotate(-90deg)" }}>
                        <circle cx={40} cy={40} r={36} fill="none" stroke="hsl(var(--border) / 0.3)" strokeWidth={2} />
                        <motion.circle
                          cx={40} cy={40} r={36} fill="none"
                          stroke="url(#scoreGrad)" strokeWidth={2} strokeLinecap="round"
                          strokeDasharray={circumference}
                          initial={{ strokeDashoffset: circumference }}
                          animate={{ strokeDashoffset: circumference * (1 - scoreNorm) }}
                          transition={{ duration: 2, ease: [0.4, 0, 0.2, 1] }}
                        />
                        <defs>
                          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
                            <stop offset="100%" stopColor="hsl(var(--primary-bright))" stopOpacity="1" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-mono text-base font-light text-foreground/75 leading-none tabular-nums">
                          <AnimatedNumber value={score} />
                        </span>
                        <span className="text-[8px] text-muted-foreground/35 tracking-widest uppercase">pts</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 flex-1">
                      <div className="flex items-center gap-1.5 text-primary/55 text-sm font-light">
                        <Flame className="w-3 h-3" />
                        {streak > 0 ? `${streak} day${streak !== 1 ? "s" : ""}` : "—"}
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-muted-foreground/30 mb-1 tabular-nums">
                          <span>next 500</span>
                          <span>{score % 500}</span>
                        </div>
                        <div className="h-[2px] rounded-full overflow-hidden" style={{ background: isLight ? "#E5E3EE" : "hsl(var(--border) / 0.3)" }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: "linear-gradient(90deg, hsl(var(--primary) / 0.6), hsl(var(--primary-bright) / 0.8))" }}
                            initial={{ width: 0 }}
                            animate={{ width: `${((score % 500) / 500) * 100}%` }}
                            transition={{ duration: 1.2 }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Start Session CTA */}
                  <div className="relative">
                    {!prefersReducedMotion && (
                      <>
                        {/* Pulse ring */}
                        <motion.div
                          className="absolute inset-0 rounded-xl pointer-events-none"
                          animate={{ boxShadow: ["0 0 0 0 rgba(124,58,237,0.5)", "0 0 0 10px rgba(124,58,237,0)", "0 0 0 0 rgba(124,58,237,0)"] }}
                          transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
                        />
                        {/* Rotating gradient border */}
                        <motion.div
                          className="absolute -inset-[1.5px] rounded-[13px] pointer-events-none"
                          style={{
                            background: "linear-gradient(90deg, hsl(var(--primary)), hsl(258 90% 75%), hsl(var(--primary)), hsl(258 90% 75%), hsl(var(--primary)))",
                            backgroundSize: "300% 100%",
                            opacity: 0.6,
                          }}
                          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                          transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
                        />
                      </>
                    )}
                    <Link to="/sessions">
                      <motion.button
                        whileHover={{ scale: 1.02, boxShadow: "0 10px 36px rgba(124,58,237,0.55)" }}
                        whileTap={{ scale: 0.97 }}
                        className="btn-shine relative w-full flex items-center justify-center gap-2 text-white text-sm font-semibold py-2.5 rounded-xl"
                        style={{
                          background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
                          boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
                        }}
                      >
                        <motion.div
                          animate={prefersReducedMotion ? {} : { scale: [1, 1.2, 1] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </motion.div>
                        {activeTask ? "Focus Now" : "Start Session"}
                      </motion.button>
                    </Link>
                  </div>
                </div>
              </BentoCard>
            </motion.div>

            {/* Today's Stats */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={5}
            >
              <BentoCard title="Today's Stats" className="h-full">
                <div className="px-5 pb-5 pt-3 grid grid-cols-2 gap-3">
                  {[
                    { label: "Done",     value: doneCount,            icon: CheckCircle2, color: isLight ? "#059669" : "rgb(52,211,153)", bg: isLight ? "#D1FAE5" : "hsl(152 60% 36% / 0.08)",  border: "#10B981", glowColor: "rgba(16,185,129,0.2)" },
                    { label: "Sessions", value: todaySessions.length, icon: Play,         color: isLight ? "#5B21B6" : "hsl(var(--primary))", bg: isLight ? "#EDE9FE" : "hsl(var(--primary) / 0.08)", border: "hsl(var(--primary))", glowColor: "rgba(124,58,237,0.2)" },
                    { label: "Focus",    value: totalFocusTime,       icon: Clock,        color: isLight ? "#1D4ED8" : "rgb(96,165,250)", bg: isLight ? "#DBEAFE" : "hsl(221 83% 53% / 0.08)",   border: "#3B82F6", glowColor: "rgba(59,130,246,0.2)", suffix: "m" },
                    { label: "Backlog",  value: backlogCount,         icon: ListChecks,   color: isLight ? "#92400E" : "rgb(251,191,36)", bg: isLight ? "#FEF3C7" : "hsl(38 92% 50% / 0.08)",    border: "#F59E0B", glowColor: "rgba(245,158,11,0.2)" },
                  ].map((s) => (
                    <motion.div
                      key={s.label}
                      className="relative rounded-xl p-3 flex flex-col gap-1.5 cursor-default overflow-hidden"
                      style={{
                        background: s.bg,
                        borderTop: `2px solid ${s.border}66`,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      }}
                      whileHover={prefersReducedMotion ? {} : {
                        scale: 1.025,
                        boxShadow: `0 4px 20px ${s.glowColor}`,
                      }}
                      transition={{ duration: 0.18 }}
                    >
                      {/* Icon — top right */}
                      <s.icon className="absolute top-2.5 right-2.5 w-3.5 h-3.5 opacity-40" style={{ color: s.color }} />
                      {/* Gradient bleed */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: `linear-gradient(135deg, ${s.border}10 0%, transparent 60%)` }}
                      />
                      <p className="font-mono text-xl font-light leading-none relative" style={{ color: s.color }}>
                        <AnimatedNumber value={s.value} suffix={s.suffix} />
                      </p>
                      <p className="text-[10px] font-medium relative" style={{ color: isLight ? "#6B6890" : "hsl(var(--muted-foreground) / 0.7)" }}>{s.label}</p>
                    </motion.div>
                  ))}
                </div>
              </BentoCard>
            </motion.div>

            {/* Board overview */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={6}
            >
              <BentoCard
                title="Board Overview"
                className="h-full"
                actions={
                  <Link to="/tasks">
                    <button className="text-xs text-primary hover:underline font-semibold" onClick={(e) => e.stopPropagation()}>
                      Open
                    </button>
                  </Link>
                }
              >
                <div className="px-5 pb-5 pt-3 flex flex-col gap-3.5">
                  {(["Backlog", "Ready", "Doing", "Done"] as const).map((col) => {
                    const label = col === "Ready" ? "To Do" : col;
                    const count = tasks.filter((t) => t.task_status === col).length;
                    const total = tasks.length || 1;
                    const pct = Math.round((count / total) * 100);
                    const barColors: Record<string, string> = {
                      Backlog: "linear-gradient(90deg, #64748B, #94A3B8)",
                      Ready:   "linear-gradient(90deg, #3B82F6, #60A5FA)",
                      Doing:   "linear-gradient(90deg, #7C3AED, #A78BFA)",
                      Done:    "linear-gradient(90deg, #10B981, #34D399)",
                    };
                    const dotColors: Record<string, string> = {
                      Backlog: "bg-slate-400",
                      Ready:   "bg-blue-400",
                      Doing:   "bg-primary",
                      Done:    "bg-emerald-500",
                    };
                    return (
                      <div key={col}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${dotColors[col]} opacity-70`} />
                            <span className="text-xs text-muted-foreground/70 font-medium">{label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground/40 font-mono">{pct}%</span>
                            <span className="text-xs font-bold font-mono text-foreground/80">{count}</span>
                          </div>
                        </div>
                        <div className="h-[6px] rounded-full overflow-hidden" style={{ background: isLight ? "#E5E3EE" : "hsl(var(--border) / 0.3)" }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: barColors[col] }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-3 mt-1 border-t border-border/20">
                    <button
                      onClick={() => setShowQuickAdd(true)}
                      className="flex items-center gap-2 text-xs text-muted-foreground/50 hover:text-primary transition-colors duration-300 font-medium group"
                    >
                      <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300" />
                      Quick add task
                    </button>
                  </div>
                </div>
              </BentoCard>
            </motion.div>
          </div>

        </div>
      )}

      {/* Quick Add */}
      <AnimatePresence>
        {showQuickAdd && (
          <QuickAddModal onClose={() => setShowQuickAdd(false)} onAdded={() => { fetchData(); setShowQuickAdd(false); }} />
        )}
      </AnimatePresence>

      {/* FAB */}
      <AnimatePresence>
        {!showQuickAdd && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            whileHover={{ scale: 1.08, boxShadow: "0 0 28px hsl(258 76% 58% / 0.5)" }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowQuickAdd(true)}
            className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center z-40"
            style={{ boxShadow: "0 4px 20px rgba(124,58,237,0.45), 0 1px 6px rgba(124,58,237,0.25)" }}
            aria-label="Quick add task"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
