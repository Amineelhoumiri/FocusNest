import {
  motion,
  AnimatePresence,
  useMotionValue,
  animate,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import {
  Play,
  CheckCircle2,
  Clock,
  Flame,
  Zap,
  Leaf,
  Plus,
  X,
  Sparkles,
  ListChecks,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { useFocusScore } from "@/context/FocusScoreContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import CountUp from "react-countup";
import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
  XAxis,
} from "recharts";

// ─── Animated number ──────────────────────────────────────────────────────────

const AnimatedNumber = ({
  value,
  suffix,
}: {
  value: number;
  suffix?: string;
}) => {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const c = animate(mv, value, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.floor(v)),
    });
    return c.stop;
  }, [value]);
  return (
    <>
      {display}
      {suffix && (
        <span className="text-sm font-normal text-muted-foreground ml-0.5">
          {suffix}
        </span>
      )}
    </>
  );
};

// ─── Entrance variants ────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE, delay: i * 0.07 },
  }),
};

// ─── Focus Now Banner ─────────────────────────────────────────────────────────

interface FocusTask {
  task_id: string;
  task_name: string;
  task_status: string;
  energy_level: string;
  total_subtasks: number;
  completed_subtasks: number;
}

const FocusNowBanner = ({ tasks, isLight }: { tasks: FocusTask[]; isLight: boolean }) => {
  const navigate = useNavigate();

  // Surface highest-priority incomplete subtask across in-progress tasks
  // Priority: High energy first, then by task order
  const inProgressTasks = tasks.filter(t => t.task_status !== "Done");
  const highEnergy = inProgressTasks.filter(t => t.energy_level === "High");
  const focusTask = highEnergy.length > 0 ? highEnergy[0] : inProgressTasks[0];

  if (!focusTask) return null;

  const handleStart = () => {
    localStorage.setItem("activeTaskId", focusTask.task_id);
    navigate("/sessions");
  };

  return (
    <AnimatePresence>
      <motion.div
        key={focusTask.task_id}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35 }}
        className="flex items-center gap-3 rounded-[10px]"
        style={{
          padding: "12px 14px",
          border: "1px solid rgba(124,111,247,0.30)",
          background: isLight ? "rgba(238,236,254,0.75)" : "rgba(26,24,42,0.70)",
        }}
      >
        {/* Left icon box */}
        <div
          className="shrink-0 flex items-center justify-center"
          style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(124,111,247,0.18)" }}
        >
          <Clock className="w-4 h-4" style={{ color: "#9d91fa" }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.06em] mb-0.5"
            style={{ color: isLight ? "rgba(83,74,183,0.65)" : "rgba(148,163,184,1)" }}>
            Focus now
          </p>
          <p className="text-[13px] font-medium truncate"
            style={{ color: isLight ? "#1a1830" : "rgba(255,255,255,0.92)" }}>
            {focusTask.task_name}
          </p>
          <p className="text-[11px] mt-0.5"
            style={{ color: isLight ? "rgba(26,24,48,0.55)" : "rgba(148,163,184,1)" }}>
            {focusTask.total_subtasks > 0
              ? `${focusTask.completed_subtasks}/${focusTask.total_subtasks} subtasks done`
              : "No subtasks yet"}
          </p>
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          className="shrink-0 font-medium text-white transition-opacity hover:opacity-90"
          style={{ padding: "6px 14px", borderRadius: 20, background: "#7c6ff7", fontSize: 12 }}
        >
          Start focus
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Quick add modal ──────────────────────────────────────────────────────────

const QuickAddModal = ({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) => {
  const [name, setName] = useState("");
  const [energy, setEnergy] = useState<"Low" | "High">("Low");
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();
  const isLight = theme === "light";
  useEffect(() => {
    ref.current?.focus();
  }, []);

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
      onAdded();
      onClose();
    } catch {
      toast.error("Failed.");
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          background: isLight ? "hsl(0 0% 100% / 0.92)" : "hsl(var(--card) / 0.78)",
          border: "1px solid hsl(var(--border) / 0.5)",
          boxShadow: isLight ? "0 4px 24px rgba(0,0,0,0.08)" : "var(--card-shadow)",
          backdropFilter: "blur(16px) saturate(160%)",
          WebkitBackdropFilter: "blur(16px) saturate(160%)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <span className="text-sm font-semibold text-foreground/80">
            New Task
          </span>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <input
          ref={ref}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="What needs to get done?"
          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-4"
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setEnergy("Low")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                energy === "Low"
                  ? "bg-emerald-500/15 text-emerald-500"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              🌿 Low
            </button>
            <button
              onClick={() => setEnergy("High")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                energy === "High"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              ⚡ High
            </button>
          </div>
          <button
            onClick={handleAdd}
            disabled={!name.trim() || loading}
            className="text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg disabled:opacity-40 transition-all"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Add →"
            )}
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

  const [tasks, setTasks] = useState<
    {
      task_id: string;
      task_name: string;
      task_status: string;
      energy_level: string;
      total_subtasks: number;
      completed_subtasks: number;
    }[]
  >([]);
  const [sessionsData, setSessionsData] = useState<
    { start_time: string; end_time: string | null }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchData = async () => {
    try {
      const [tr, sr] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/sessions"),
      ]);
      if (!tr.ok || !sr.ok) throw new Error();
      setTasks(await tr.json());
      setSessionsData(await sr.json());
    } catch {
      toast.error("Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const completedSessions = sessionsData.filter((s) => s.end_time);
  const todaySessions = completedSessions.filter(
    (s) =>
      new Date(s.start_time).toDateString() === new Date().toDateString()
  );
  const totalFocusTime = todaySessions.reduce(
    (acc, s) =>
      acc +
      Math.floor(
        (new Date(s.end_time!).getTime() -
          new Date(s.start_time).getTime()) /
          60000
      ),
    0
  );

  const activeTask = tasks.find((t) => t.task_status === "Doing");
  const doneCount = tasks.filter((t) => t.task_status === "Done").length;
  const backlogCount = tasks.filter(
    (t) => t.task_status === "Backlog"
  ).length;
  const activeTasks = tasks.filter((t) => t.task_status !== "Done");
  const taskCompletionPct =
    tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  const hour = clock.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.full_name?.split(" ")[0] ?? "there";
  const initials =
    user?.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  const clockStr = clock.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const dateStr = clock.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const scoreNorm = Math.min(score / 500, 1);
  const circumference = 2 * Math.PI * 38;

  const sevenDayData = React.useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const ds = d.toDateString();
      const daySessions = sessionsData.filter(
        (s) => s.end_time && new Date(s.start_time).toDateString() === ds
      );
      return {
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        score: daySessions.length * 5 + Math.floor(Math.random() * 15),
        sessions: daySessions.length,
      };
    });
    return days;
  }, [sessionsData]);

  const statusConfig: Record<
    string,
    { label: string; bg: string; color: string }
  > = {
    Doing: {
      label: "Doing",
      bg: isLight ? "#EDE9FE" : "hsl(var(--primary) / 0.15)",
      color: isLight ? "#5B21B6" : "hsl(var(--primary))",
    },
    Ready: {
      label: "To Do",
      bg: isLight ? "#DBEAFE" : "hsl(221 83% 53% / 0.15)",
      color: isLight ? "#1E40AF" : "hsl(221 83% 65%)",
    },
    Backlog: {
      label: "Backlog",
      bg: isLight ? "#F1F5F9" : "hsl(var(--muted))",
      color: isLight ? "#475569" : "hsl(var(--muted-foreground))",
    },
    Done: {
      label: "Done",
      bg: isLight ? "#D1FAE5" : "hsl(152 60% 36% / 0.15)",
      color: isLight ? "#065F46" : "hsl(152 60% 50%)",
    },
  };

  const energyConfig: Record<
    string,
    { label: string; bg: string; color: string; icon: typeof Zap }
  > = {
    High: {
      label: "High",
      bg: isLight ? "#FEE2E2" : "hsl(var(--primary) / 0.10)",
      color: isLight ? "#991B1B" : "hsl(var(--primary))",
      icon: Zap,
    },
    Low: {
      label: "Low",
      bg: isLight ? "#D1FAE5" : "hsl(152 60% 36% / 0.10)",
      color: isLight ? "#065F46" : "hsl(152 60% 50%)",
      icon: Leaf,
    },
  };

  // ─── Card base style ───────────────────────────────────────────────────────
  const cardBase: React.CSSProperties = {
    background: isLight ? "rgba(255,255,255,0.72)" : "rgba(26,24,46,0.75)",
    border: isLight ? "0.5px solid rgba(83,74,183,0.12)" : "0.5px solid rgba(255,255,255,0.07)",
    borderRadius: "1.25rem",
    boxShadow: isLight
      ? "0 2px 20px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)"
      : "var(--card-shadow)",
    backdropFilter: "blur(16px) saturate(160%)",
    WebkitBackdropFilter: "blur(16px) saturate(160%)",
  };

  return (
    <div className="relative max-w-7xl mx-auto pb-10">

      {/* Background is handled globally by AppLayout */}

      {isLoading ? (
        <div className="relative z-10 flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="relative z-10">

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0}
            className="flex items-center justify-between mb-8 pt-1"
          >
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {greeting},{" "}
                <span style={{ color: isLight ? "#534AB7" : "#9d91fa" }}>
                  {firstName}
                </span>
                {" "}
                <span className="inline-block">
                  {hour < 12 ? "🌅" : hour < 17 ? "☀️" : "🌙"}
                </span>
              </h1>
              <p style={{ fontSize: 12, color: isLight ? "rgba(26,24,48,0.55)" : "rgba(148,163,184,1)", marginTop: 4 }}>
                {dateStr} — your personal focus dashboard
              </p>
            </div>
          </motion.div>

          {/* ── Main 2-col layout ────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

            {/* ╔══════════════════════ LEFT COLUMN ══════════════════════════╗ */}
            <div className="flex flex-col gap-5 min-w-0">

              {/* ── Metrics row — 4 cards ──────────────────────────────────────────── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

                {/* Streak card */}
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1}
                  className="rounded-[8px] p-3"
                  style={{
                    background: isLight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.04)",
                    border: isLight ? "0.5px solid rgba(83,74,183,0.10)" : undefined,
                  }}
                >
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-[22px] font-semibold leading-none" style={{ color: isLight ? "#1a1830" : "#fff" }}>
                      {streak}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground/80">Streak</span>
                  </div>
                  {/* 7 day dots Mon–Sun */}
                  <div className="flex gap-1">
                    {["M","T","W","T","F","S","S"].map((d, i) => {
                      const now = new Date();
                      const dayOfWeek = now.getDay(); // 0=Sun
                      const mondayOffset = (dayOfWeek + 6) % 7;
                      const isCompleted = i <= mondayOffset && streak > (mondayOffset - i);
                      return (
                        <div key={i} className="flex flex-col items-center gap-0.5" style={{ flex: 1 }}>
                          <div
                            className="flex items-center justify-center text-[8px] font-medium"
                            style={{
                              width: "100%", aspectRatio: "1", borderRadius: 4,
                              background: isCompleted
                                ? (isLight ? "rgba(83,74,183,0.15)" : "rgba(124,111,247,0.25)")
                                : (isLight ? "rgba(83,74,183,0.05)" : "rgba(255,255,255,0.04)"),
                              color: isCompleted
                                ? (isLight ? "#534AB7" : "#9d91fa")
                                : (isLight ? "rgba(83,74,183,0.40)" : "rgba(148,163,184,0.55)"),
                            }}
                          >
                            {d}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Done today card */}
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2}
                  className="rounded-[8px] p-3"
                  style={{
                    background: isLight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.04)",
                    border: isLight ? "0.5px solid rgba(83,74,183,0.10)" : undefined,
                  }}
                >
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-[22px] font-semibold leading-none" style={{ color: isLight ? "#1a1830" : "#fff" }}>
                      {doneCount}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground/80">Done today</span>
                  </div>
                  <div className="h-[3px] rounded-full overflow-hidden"
                    style={{ background: isLight ? "rgba(83,74,183,0.10)" : "rgba(255,255,255,0.07)" }}>
                    <motion.div className="h-full rounded-full" style={{ background: "#7c6ff7" }}
                      initial={{ width: 0 }}
                      animate={{ width: tasks.length > 0 ? `${(doneCount / tasks.length) * 100}%` : "0%" }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>

                {/* Focus time card */}
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}
                  className="rounded-[8px] p-3"
                  style={{
                    background: isLight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.04)",
                    border: isLight ? "0.5px solid rgba(83,74,183,0.10)" : undefined,
                  }}
                >
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-[22px] font-semibold leading-none" style={{ color: "#5DCAA5" }}>
                      {totalFocusTime >= 60
                        ? `${Math.floor(totalFocusTime / 60)}h ${totalFocusTime % 60}m`
                        : `${totalFocusTime}m`}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground/80">Focus time</span>
                  </div>
                  <div className="h-[3px] rounded-full overflow-hidden"
                    style={{ background: isLight ? "rgba(83,74,183,0.10)" : "rgba(255,255,255,0.07)" }}>
                    <motion.div className="h-full rounded-full" style={{ background: "#1D9E75" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((totalFocusTime / 90) * 100, 100)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>

                {/* Sessions card */}
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4}
                  className="rounded-[8px] p-3"
                  style={{
                    background: isLight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.04)",
                    border: isLight ? "0.5px solid rgba(83,74,183,0.10)" : undefined,
                  }}
                >
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-[22px] font-semibold leading-none" style={{ color: "#EF9F27" }}>
                      {todaySessions.length}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground/80">Sessions</span>
                  </div>
                  {/* Energy strip */}
                  <div className="flex gap-1">
                    {[
                      { label: "High", bg: "rgba(216,90,48,0.20)", color: "#f0997b" },
                      { label: "Med",  bg: "rgba(239,159,39,0.15)", color: "#EF9F27" },
                      { label: "Low",  bg: "rgba(29,158,117,0.15)", color: "#5DCAA5" },
                    ].map((e) => (
                      <div key={e.label} className="flex-1 flex items-center justify-center rounded text-[9px] font-medium"
                        style={{ padding: "4px 0", background: e.bg, color: e.color, borderRadius: 5 }}>
                        {e.label}
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* ── Focus Now banner ── */}
              <FocusNowBanner tasks={tasks} isLight={isLight} />

              {/* ── Active task banner ────────────────────────────────────────── */}
              <AnimatePresence>
                {activeTask && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35 }}
                    className="flex items-center gap-4 px-5 py-3.5 rounded-[1.25rem]"
                    style={{
                      background:
                        "linear-gradient(90deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03))",
                      border: "1px solid hsl(var(--primary) / 0.2)",
                    }}
                  >
                    <motion.div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: "hsl(var(--primary))" }}
                      animate={{
                        boxShadow: [
                          "0 0 0 0 hsl(var(--primary) / 0.5)",
                          "0 0 0 6px hsl(var(--primary) / 0)",
                        ],
                      }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                    />
                    <p className="text-sm text-muted-foreground/70 flex-1 min-w-0">
                      Currently on —{" "}
                      <span className="text-foreground font-medium">
                        {activeTask.task_name}
                      </span>
                    </p>
                    <Link to="/sessions">
                      <motion.span
                        whileHover={{ x: 3 }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        style={{
                          background: "hsl(var(--primary)/0.12)",
                          color: "hsl(var(--primary))",
                          border: "1px solid hsl(var(--primary)/0.2)",
                        }}
                      >
                        Focus →
                      </motion.span>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Tasks table ───────────────────────────────────────────────── */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                custom={4}
                className="rounded-[1.25rem] overflow-hidden"
                style={cardBase}
              >
                {/* Card header */}
                <div
                  className="flex items-center justify-between px-6 py-4"
                  style={{
                    borderBottom: "1px solid hsl(var(--border)/0.35)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <ListChecks
                      className="w-4 h-4"
                      style={{ color: "hsl(var(--primary))" }}
                    />
                    <span className="text-sm font-semibold text-foreground">
                      Assigned to Me
                    </span>
                    {activeTasks.length > 0 && (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: "hsl(var(--primary) / 0.1)",
                          color: "hsl(var(--primary))",
                        }}
                      >
                        {activeTasks.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to="/chat">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
                        style={{
                          background: "hsl(var(--primary)/0.07)",
                          color: "hsl(var(--primary)/0.75)",
                          border: "1px solid hsl(var(--primary)/0.15)",
                        }}
                      >
                        <Sparkles className="w-3 h-3" />
                        Prioritize
                      </motion.button>
                    </Link>
                    <Link to="/tasks">
                      <motion.button
                        whileHover={{ scale: 1.03, boxShadow: "0 2px 12px hsl(var(--primary)/0.22)" }}
                        whileTap={{ scale: 0.97 }}
                        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg text-white transition-all"
                        style={{
                          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-bright)))",
                        }}
                      >
                        View Board →
                      </motion.button>
                    </Link>
                  </div>
                </div>

                {/* Table head */}
                <div
                  className="grid grid-cols-[1.5rem_1fr_5rem_5rem] gap-3 px-6 py-2.5"
                  style={{
                    borderBottom: "1px solid hsl(var(--border)/0.2)",
                    background: "hsl(var(--muted)/0.3)",
                  }}
                >
                  <div />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                    Task
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                    Energy
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                    Status
                  </span>
                </div>

                {/* Rows */}
                <div className="divide-y" style={{ borderColor: "hsl(var(--border)/0.15)" }}>
                  {activeTasks.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-6 py-12 flex flex-col items-center gap-3"
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{
                          background: "hsl(var(--primary) / 0.08)",
                          border: "1px solid hsl(var(--primary) / 0.15)",
                        }}
                      >
                        <CheckCircle2
                          className="w-6 h-6"
                          style={{ color: "hsl(var(--primary) / 0.5)" }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground/70">
                          You're all caught up ✨
                        </p>
                        <p className="text-xs text-muted-foreground/80 mt-1">
                          No active tasks — enjoy the calm.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowQuickAdd(true)}
                        className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-all duration-200 mt-1"
                        style={{
                          border: "1px solid hsl(var(--primary)/0.25)",
                          color: "hsl(var(--primary))",
                        }}
                      >
                        + Add a task
                      </button>
                    </motion.div>
                  ) : (
                    activeTasks.slice(0, 6).map((task, i) => {
                      const eCfg = energyConfig[task.energy_level] ?? energyConfig.Low;
                      const sCfg = statusConfig[task.task_status] ?? statusConfig.Backlog;
                      const EIcon = eCfg.icon;
                      const isDoing = task.task_status === "Doing";
                      return (
                        <motion.div
                          key={task.task_id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + i * 0.05, duration: 0.38 }}
                          className="grid grid-cols-[1.5rem_1fr_5rem_5rem] gap-3 px-6 py-3.5 items-center group transition-colors duration-200"
                          style={{
                            background: isDoing
                              ? "hsl(var(--primary)/0.04)"
                              : undefined,
                          }}
                        >
                          {/* Dot/checkbox */}
                          <div
                            className="w-4 h-4 rounded border flex items-center justify-center transition-colors"
                            style={{
                              borderColor: isDoing
                                ? "hsl(var(--primary)/0.5)"
                                : "hsl(var(--border)/0.6)",
                              background: isDoing
                                ? "hsl(var(--primary)/0.12)"
                                : undefined,
                            }}
                          >
                            {isDoing && (
                              <motion.div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: "hsl(var(--primary))" }}
                                animate={{ scale: [1, 1.4, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                            )}
                          </div>

                          {/* Name */}
                          <Link to="/tasks" className="min-w-0">
                            <p
                              className="text-sm font-medium truncate transition-colors group-hover:text-foreground"
                              style={{
                                color: isDoing
                                  ? "hsl(var(--foreground))"
                                  : "hsl(var(--foreground)/0.75)",
                              }}
                            >
                              {task.task_name}
                            </p>
                            {task.total_subtasks > 0 && (
                              <p className="text-[10px] text-muted-foreground/75 mt-0.5 font-mono">
                                {task.completed_subtasks}/{task.total_subtasks}{" "}
                                subtasks
                              </p>
                            )}
                          </Link>

                          {/* Energy badge */}
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full"
                            style={{
                              background: eCfg.bg,
                              color: eCfg.color,
                            }}
                          >
                            <EIcon className="w-2.5 h-2.5" />
                            {eCfg.label}
                          </span>

                          {/* Status badge */}
                          <span
                            className="inline-flex items-center text-[10px] font-medium px-2.5 py-1 rounded-full"
                            style={{
                              background: sCfg.bg,
                              color: sCfg.color,
                            }}
                          >
                            {sCfg.label}
                          </span>
                        </motion.div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div
                  className="flex items-center justify-between px-6 py-3"
                  style={{
                    borderTop: "1px solid hsl(var(--border)/0.2)",
                    background: "hsl(var(--muted)/0.2)",
                  }}
                >
                  <span className="text-[11px] text-muted-foreground/65">
                    {activeTasks.length} active task{activeTasks.length !== 1 ? "s" : ""}
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setShowQuickAdd(true)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                    style={{
                      background: "hsl(var(--primary)/0.1)",
                      color: "hsl(var(--primary))",
                      border: "1px solid hsl(var(--primary)/0.18)",
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    Quick add
                  </motion.button>
                </div>
              </motion.div>

            </div>

            {/* ╔══════════════════════ RIGHT SIDEBAR ═════════════════════════╗ */}
            <div className="flex flex-col gap-4">

              {/* ── Focus Score card ──────────────────────────────────────────── */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                custom={2}
                className="rounded-[1.25rem] p-5 flex flex-col gap-4"
                style={cardBase}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    Focus Score
                  </span>
                  {streak > 0 && (
                    <div
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{
                        background: "rgba(251,146,60,0.12)",
                        color: "#F97316",
                      }}
                    >
                      <Flame className="w-3 h-3" />
                      {streak}d
                    </div>
                  )}
                </div>

                {/* Score ring + number */}
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0" style={{ width: 84, height: 84 }}>
                    {!prefersReducedMotion && (
                      <motion.div
                        className="absolute inset-0 rounded-full pointer-events-none"
                        animate={{
                          boxShadow: [
                            "0 0 0 0 hsl(var(--primary) / 0.4)",
                            "0 0 0 8px hsl(var(--primary) / 0)",
                          ],
                        }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                      />
                    )}
                    <svg width={84} height={84} style={{ transform: "rotate(-90deg)" }}>
                      <circle
                        cx={42}
                        cy={42}
                        r={38}
                        fill="none"
                        stroke="hsl(var(--border)/0.3)"
                        strokeWidth={3}
                      />
                      <motion.circle
                        cx={42}
                        cy={42}
                        r={38}
                        fill="none"
                        stroke="url(#ringGrad)"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{
                          strokeDashoffset: circumference * (1 - scoreNorm),
                        }}
                        transition={{ duration: 2, ease: [0.4, 0, 0.2, 1] }}
                      />
                      <defs>
                        <linearGradient
                          id="ringGrad"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="0%"
                        >
                          <stop
                            offset="0%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity="0.9"
                          />
                          <stop
                            offset="100%"
                            stopColor="hsl(var(--primary-bright))"
                          />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span
                        className="text-lg font-bold leading-none"
                        style={{
                          background:
                            "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-bright)))",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}
                      >
                        <CountUp end={score} duration={1.4} />
                      </span>
                      <span className="text-[9px] text-muted-foreground/65 uppercase tracking-widest mt-0.5">
                        pts
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 flex-1">
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground/65 mb-1.5">
                        <span>Next 500</span>
                        <span className="tabular-nums">{score % 500}</span>
                      </div>
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ background: "hsl(var(--border)/0.3)" }}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background:
                              "linear-gradient(90deg, hsl(var(--primary)/0.7), hsl(var(--primary-bright)))",
                          }}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${((score % 500) / 500) * 100}%`,
                          }}
                          transition={{ duration: 1.2 }}
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground/80">
                      {score} total points earned
                    </p>
                  </div>
                </div>

                {/* Today stats row */}
                <div
                  className="grid grid-cols-2 gap-2.5"
                  style={{
                    borderTop: "1px solid hsl(var(--border)/0.3)",
                    paddingTop: "0.75rem",
                  }}
                >
                  {[
                    {
                      label: "Done",
                      value: doneCount,
                      color: "#10B981",
                      bg: isLight ? "#D1FAE5" : "rgba(16,185,129,0.1)",
                    },
                    {
                      label: "Sessions",
                      value: todaySessions.length,
                      color: "hsl(var(--primary))",
                      bg: "hsl(var(--primary)/0.1)",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl px-3 py-2.5 flex flex-col gap-0.5"
                      style={{ background: s.bg }}
                    >
                      <span
                        className="text-lg font-bold leading-none tabular-nums"
                        style={{ color: s.color }}
                      >
                        <CountUp end={s.value} duration={1.2} />
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground/60">
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Link to="/sessions">
                  <motion.button
                    whileHover={{ scale: 1.03, boxShadow: "0 8px 28px rgba(124,58,237,0.55)" }}
                    whileTap={{ scale: 0.96 }}
                    className="relative overflow-hidden w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl text-white"
                    style={{
                      background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
                      boxShadow: "0 4px 18px rgba(124,58,237,0.38)",
                    }}
                  >
                    {/* Shine sweep */}
                    <motion.span
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: "linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.2) 50%, transparent 75%)",
                        backgroundSize: "200% 100%",
                      }}
                      animate={{ backgroundPosition: ["-100% 0", "200% 0"] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                    />
                    <motion.div
                      animate={prefersReducedMotion ? {} : { scale: [1, 1.25, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </motion.div>
                    {activeTask ? "Focus Now" : "Start Session"}
                  </motion.button>
                </Link>
              </motion.div>

              {/* ── Board Overview ─────────────────────────────────────────────── */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                custom={3}
                className="rounded-[1.25rem] p-5 flex flex-col gap-1"
                style={cardBase}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-semibold text-foreground">
                      Board Overview
                    </span>
                    <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                      Task distribution
                    </p>
                  </div>
                  <Link to="/tasks">
                    <motion.span
                      whileHover={{ x: 2 }}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all inline-block"
                      style={{
                        background: "hsl(var(--primary)/0.08)",
                        color: "hsl(var(--primary))",
                        border: "1px solid hsl(var(--primary)/0.15)",
                      }}
                    >
                      Open →
                    </motion.span>
                  </Link>
                </div>

                <div className="flex flex-col gap-4">
                  {(
                    [
                      {
                        col: "Backlog",
                        label: "Backlog",
                        bar: "linear-gradient(90deg,#64748B,#94A3B8)",
                        dot: isLight ? "#c8c6d4" : "rgba(255,255,255,0.22)",
                      },
                      {
                        col: "Ready",
                        label: "To Do",
                        bar: "linear-gradient(90deg,#3B82F6,#60A5FA)",
                        dot: "#7c6ff7",
                      },
                      {
                        col: "Doing",
                        label: "Doing",
                        bar: "linear-gradient(90deg,hsl(var(--primary)),#A78BFA)",
                        dot: "#EF9F27",
                      },
                      {
                        col: "Done",
                        label: "Done",
                        bar: "linear-gradient(90deg,#10B981,#34D399)",
                        dot: "#1D9E75",
                      },
                    ]
                  ).map(({ col, label, bar, dot }) => {
                    const count = tasks.filter(
                      (t) => t.task_status === col
                    ).length;
                    const total = tasks.length || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={col}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ background: dot }}
                            />
                            <span className="text-xs font-medium text-foreground/75">
                              {label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground/65 tabular-nums">
                              {pct}%
                            </span>
                            <span className="text-xs font-bold text-foreground/80 tabular-nums w-4 text-right">
                              {count}
                            </span>
                          </div>
                        </div>
                        <div
                          className="h-[7px] rounded-full overflow-hidden"
                          style={{
                            background: "hsl(var(--border)/0.3)",
                          }}
                        >
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: bar }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{
                              duration: 0.9,
                              ease: [0.4, 0, 0.2, 1],
                              delay: 0.15,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setShowQuickAdd(true)}
                  className="flex items-center gap-1.5 text-[11px] font-medium mt-3 transition-colors group"
                  style={{ color: "hsl(var(--muted-foreground)/0.5)" }}
                >
                  <Plus
                    className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300"
                  />
                  Quick add task
                </button>
              </motion.div>
            </div>
          </div>

          {/* ── Focus trend chart ─────────────────────────────────────────── */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={5}
            className="rounded-[1.25rem] overflow-hidden mt-5"
            style={cardBase}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{
                borderBottom: "1px solid hsl(var(--border)/0.35)",
              }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3
                    className="w-4 h-4"
                    style={{ color: "hsl(var(--primary))" }}
                  />
                  <span className="text-sm font-semibold text-foreground">
                    Focusing
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/80 mt-0.5 ml-6">
                  Productivity analytics — last 7 days
                </p>
              </div>
              <span
                className="text-xs font-medium px-3 py-1 rounded-lg"
                style={{
                  background: "hsl(var(--muted))",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                Last 7 days
              </span>
            </div>

            <div className="px-4 pt-4 pb-5">
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={sevenDayData}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="areaGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(258, 76%, 58%)"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(258, 76%, 58%)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                        opacity: 0.6,
                      }}
                      dy={6}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border)/0.5)",
                        borderRadius: "10px",
                        fontSize: "11px",
                        boxShadow: "var(--card-shadow)",
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      labelStyle={{
                        color: "hsl(var(--muted-foreground))",
                        fontWeight: 600,
                      }}
                      cursor={{
                        stroke: "hsl(var(--primary)/0.3)",
                        strokeWidth: 1,
                        strokeDasharray: "3 3",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(258, 76%, 58%)"
                      strokeWidth={2}
                      fill="url(#areaGrad)"
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: "hsl(258, 76%, 58%)",
                        stroke: "hsl(var(--card))",
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-2 px-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-0.5 rounded-full"
                    style={{ background: "hsl(258, 76%, 58%)" }}
                  />
                  <span className="text-[10px] text-muted-foreground/55">
                    Focus score
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Quick Add Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showQuickAdd && (
          <QuickAddModal
            onClose={() => setShowQuickAdd(false)}
            onAdded={() => {
              fetchData();
              setShowQuickAdd(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── FAB ─────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!showQuickAdd && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            whileHover={{
              scale: 1.08,
              boxShadow: "0 0 28px hsl(258 76% 58% / 0.5)",
            }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowQuickAdd(true)}
            className="fixed bottom-6 right-6 w-12 h-12 rounded-full text-white flex items-center justify-center z-40"
            style={{
              background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
              boxShadow: "0 4px 20px rgba(124,58,237,0.45)",
            }}
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
