// src/pages/SessionActive.tsx — Full-screen immersive focus session (brain.fm style)
// Implements: FR-C-04 micro-timer modal · FR-C-05 I'm Stuck · FR-C-06 done-by · FR-C-08 no-shame reflection

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Pause, Play, Music, Check,
  SkipBack, SkipForward, ArrowLeft, ChevronUp, Shuffle,
  Zap, Coffee, Battery, Flame, X, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFocusScore } from "@/context/FocusScoreContext";
import { useSpotifyPlayback } from "@/context/SpotifyPlaybackContext";
import { useYouTubePlayback } from "@/context/YouTubePlaybackContext";
import { useTheme } from "@/context/ThemeContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Playlist {
  id: number;
  youtube_playlist_id: string;
  name: string;
}

interface SpotifyCuratedRow {
  id: number;
  playlist_id: string;
  name: string;
  description: string | null;
}

interface BacklogTask {
  task_id: string;
  task_name: string;
  task_status: string;
  priority?: string;
}

// ─── Overlay card shell ───────────────────────────────────────────────────────

const ModalCard = ({
  children,
  onClose,
  isDark,
}: {
  children: React.ReactNode;
  onClose?: () => void;
  isDark: boolean;
}) => (
  <motion.div
    className="fixed inset-0 z-50 flex items-center justify-center px-5"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
  >
    {/* Backdrop */}
    <div
      className={cn(
        "absolute inset-0 backdrop-blur-sm",
        isDark ? "bg-black/70" : "bg-black/35"
      )}
      onClick={onClose}
    />
    {/* Card */}
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.97 }}
      transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
      className="relative z-10 w-full max-w-[400px] rounded-3xl overflow-hidden"
      style={{
        background: isDark ? "rgba(12,8,28,0.88)" : "rgba(255,255,255,0.92)",
        backdropFilter: "blur(36px)",
        WebkitBackdropFilter: "blur(36px)",
        border: isDark ? "0.5px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.08)",
        boxShadow: isDark ? "0 32px 80px rgba(0,0,0,0.6)" : "0 28px 70px rgba(0,0,0,0.18)",
      }}
    >
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full transition-colors"
          style={{
            color: isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.55)",
            background: isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.06)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = isDark ? "rgba(255,255,255,0.85)" : "rgba(15,23,42,0.85)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.55)";
          }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {children}
    </motion.div>
  </motion.div>
);

// ─── Option card (used in both modals) ────────────────────────────────────────

const OptionCard = ({
  icon,
  label,
  sublabel,
  accent,
  onClick,
  isDark,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  accent: string;
  onClick: () => void;
  isDark: boolean;
}) => (
  <button
    onClick={onClick}
    className="flex items-center gap-4 w-full px-4 py-4 rounded-2xl text-left transition-all duration-150 cursor-pointer"
    style={{
      background: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)",
      border: isDark ? "0.5px solid rgba(255,255,255,0.10)" : "1px solid rgba(15,23,42,0.08)",
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.07)";
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)";
    }}
  >
    <div
      className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center"
      style={{ background: accent + "22", border: `0.5px solid ${accent}44` }}
    >
      <span style={{ color: accent }}>{icon}</span>
    </div>
    <div className="min-w-0">
      <p className={cn("text-[14px] font-semibold leading-tight", isDark ? "text-white/90" : "text-slate-900")}>{label}</p>
      {sublabel && (
        <p className={cn("text-[11px] mt-0.5", isDark ? "text-white/45" : "text-slate-600")}>{sublabel}</p>
      )}
    </div>
  </button>
);

// ─── FR-C-08: No-shame reflection modal ───────────────────────────────────────

const ReflectionModal = ({
  onSubmit,
  onResume,
  isDark,
}: {
  onSubmit: (type: string | null, note: string) => void;
  onResume: () => void;
  isDark: boolean;
}) => {
  const [note, setNote] = useState("");
  const trimmed = note.trim();
  return (
    <ModalCard onClose={onResume} isDark={isDark}>
      <div className="px-6 pt-7 pb-6">
        <p className={cn("text-[11px] font-bold uppercase tracking-[0.18em] mb-2", isDark ? "text-white/35" : "text-slate-600")}>
          No pressure
        </p>
        <h2 className={cn("text-[22px] font-extrabold leading-tight mb-1", isDark ? "text-white/92" : "text-slate-950")}>
          What got in the way?
        </h2>
        <p className={cn("text-[13px] mb-6", isDark ? "text-white/45" : "text-slate-600")}>
          This helps you understand your patterns — no judgement.
        </p>

        <div className="flex flex-col gap-2.5 mb-4">
          <OptionCard
            icon={<Zap className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />}
            label="Got distracted"
            sublabel="Phone, notifications, wandering mind"
            accent="#c084fc"
            isDark={isDark}
            onClick={() => onSubmit("Distraction", trimmed)}
          />
          <OptionCard
            icon={<Battery className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />}
            label="Low energy"
            sublabel="Tired, burnt out, hard to focus"
            accent="#60a5fa"
            isDark={isDark}
            onClick={() => onSubmit("Low Energy", trimmed)}
          />
          <OptionCard
            icon={<Flame className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />}
            label="Something came up"
            sublabel="External interruption, urgent task"
            accent="#fb923c"
            isDark={isDark}
            onClick={() => onSubmit("External", trimmed)}
          />
        </div>

        <label className="block mb-5">
          <span className={cn("text-[10px] font-bold uppercase tracking-[0.12em] mb-2 block", isDark ? "text-white/30" : "text-slate-600")}>
            Anything else? (optional)
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="A few words is enough…"
            className={cn(
              "w-full rounded-xl px-3 py-2.5 text-[13px] resize-none",
              isDark ? "text-white/90 placeholder:text-white/25" : "text-slate-900 placeholder:text-slate-400"
            )}
            style={{
              background: isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.04)",
              border: isDark ? "0.5px solid rgba(255,255,255,0.14)" : "1px solid rgba(15,23,42,0.12)",
            }}
          />
        </label>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onSubmit(null, trimmed)}
            className={cn(
              "flex-1 text-[12px] transition-colors py-2",
              isDark ? "text-white/40 hover:text-white/70" : "text-slate-600 hover:text-slate-900"
            )}
          >
            Skip — just leave
          </button>
          <button
            type="button"
            onClick={onResume}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all",
              isDark ? "text-white/80" : "text-slate-900"
            )}
            style={{
              background: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.06)",
              border: isDark ? "0.5px solid rgba(255,255,255,0.14)" : "1px solid rgba(15,23,42,0.10)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.16)" : "rgba(15,23,42,0.10)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.06)";
            }}
          >
            ↩ Resume session
          </button>
        </div>
      </div>
    </ModalCard>
  );
};

// ─── FR-C-04: Micro-timer completion modal ────────────────────────────────────

const MicroTimerModal = ({
  onContinue,
  onBreak,
  onSwitch,
  isDark,
}: {
  onContinue: () => void;
  onBreak: () => void;
  onSwitch: () => void;
  isDark: boolean;
}) => (
  <ModalCard isDark={isDark}>
    <div className="px-6 pt-7 pb-6">
      {/* Celebration badge */}
      <div className="flex justify-center mb-5">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ background: "rgba(124,111,247,0.18)", border: "0.5px solid rgba(124,111,247,0.35)" }}
        >
          <motion.span
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ duration: 0.6, repeat: 3, repeatType: "mirror" }}
          >
            ⚡
          </motion.span>
          <span className="text-[12px] font-bold text-violet-300">5 minutes in!</span>
        </div>
      </div>

      <h2 className={cn("text-[22px] font-extrabold leading-tight mb-1 text-center", isDark ? "text-white/92" : "text-slate-950")}>
        You started — great.
      </h2>
      <p className={cn("text-[13px] mb-6 text-center", isDark ? "text-white/45" : "text-slate-600")}>
        The hardest part is done. What feels right?
      </p>

      <div className="flex flex-col gap-2.5">
        <OptionCard
          icon={<Flame style={{ width: 18, height: 18 }} />}
          label="Keep the momentum"
          sublabel="Continue for 25 more minutes"
          accent="#a78bfa"
          isDark={isDark}
          onClick={onContinue}
        />
        <OptionCard
          icon={<Coffee style={{ width: 18, height: 18 }} />}
          label="Take a breather"
          sublabel="You earned it — celebrate this win"
          accent="#34d399"
          isDark={isDark}
          onClick={onBreak}
        />
        <OptionCard
          icon={<Shuffle style={{ width: 18, height: 18 }} />}
          label="Switch tasks"
          sublabel="Try something different"
          accent="#60a5fa"
          isDark={isDark}
          onClick={onSwitch}
        />
      </div>
    </div>
  </ModalCard>
);

// ─── FR-C-05: I'm Stuck — task switcher panel ─────────────────────────────────

const StuckPanel = ({
  tasks,
  loading,
  currentTaskId,
  onSwitch,
  onClose,
}: {
  tasks: BacklogTask[];
  loading: boolean;
  currentTaskId: string;
  onSwitch: (t: BacklogTask) => void;
  onClose: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-40"
  >
    {/* Backdrop */}
    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

    {/* Panel */}
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 32, stiffness: 300 }}
      className="absolute bottom-0 left-0 right-0 max-h-[60vh] overflow-y-auto rounded-t-3xl"
      style={{
        background: "rgba(8,4,20,0.94)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        border: "0.5px solid rgba(255,255,255,0.1)",
      }}
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
      </div>

      <div className="px-5 pt-3 pb-6">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-[17px] font-extrabold text-white/90">Switch to a low-energy task</h3>
            <p className="text-[12px] text-white/38 mt-0.5">Timer keeps running — no pressure</p>
          </div>
          <button onClick={onClose} className="mt-1 text-white/35 hover:text-white/65 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="my-4" style={{ height: "0.5px", background: "rgba(255,255,255,0.08)" }} />

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-white/35 text-[13px]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading tasks…
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-8 text-center px-2">
            <p className="text-[30px] mb-3">🔋</p>
            <p className="text-[13px] font-semibold text-white/50 mb-1">No low-energy tasks yet</p>
            <p className="text-[12px] text-white/28 leading-relaxed">
              Go to your task board and set a task's priority to{" "}
              <span className="text-blue-400/70 font-semibold">Low</span> — it'll appear here next time.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map((task) => (
                <button
                  key={task.task_id}
                  onClick={() => onSwitch(task)}
                  disabled={task.task_id === currentTaskId}
                  className={cn(
                    "flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-left transition-all duration-150",
                    "disabled:opacity-30 disabled:cursor-not-allowed"
                  )}
                  style={{
                    background: "rgba(96,165,250,0.06)",
                    border: "0.5px solid rgba(96,165,250,0.22)",
                  }}
                  onMouseEnter={(e) => {
                    if (task.task_id !== currentTaskId)
                      (e.currentTarget as HTMLElement).style.background = "rgba(96,165,250,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(96,165,250,0.06)";
                  }}
                >
                  <div
                    className="w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-[11px] font-bold"
                    style={{ background: "rgba(96,165,250,0.18)", color: "#93c5fd" }}
                  >
                    {task.task_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white/80 truncate">{task.task_name}</p>
                    <span className="text-[10px] text-white/35">
                      {task.task_status === "Ready" ? "To Do" : task.task_status}
                    </span>
                  </div>
                  <Shuffle className="w-3.5 h-3.5 shrink-0" style={{ color: "rgba(96,165,250,0.45)" }} />
                </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  </motion.div>
);

// ─── SessionActive ────────────────────────────────────────────────────────────

const SessionActive = () => {
  const navigate  = useNavigate();
  const reduced   = useReducedMotion() ?? false;
  const [params]  = useSearchParams();
  const { addScore } = useFocusScore();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const taskId       = params.get("taskId")       ?? "";
  const taskTitle    = params.get("taskTitle")    ?? "Focus Session";
  const subtaskId    = params.get("subtaskId")    ?? "";
  const subtaskTitle = params.get("subtaskTitle") ?? "";
  const duration     = Number(params.get("duration") ?? "5");
  const totalSeconds = duration * 60;

  // ── Timer state ─────────────────────────────────────────────────────────────
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [isRunning,   setIsRunning]   = useState(true);
  const [isPaused,    setIsPaused]    = useState(false);

  const sessionIdRef  = useRef<string | null>(null);
  const completedRef  = useRef(false);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Feature state ────────────────────────────────────────────────────────────
  const [showReflection, setShowReflection] = useState(false);
  const [showMicroModal, setShowMicroModal] = useState(false);
  const [showStuckPanel, setShowStuckPanel] = useState(false);
  const [stuckTasks,     setStuckTasks]     = useState<BacklogTask[]>([]);
  const [stuckLoading,   setStuckLoading]   = useState(false);
  // Live task label — can change after an "I'm Stuck" switch
  const [liveTaskTitle, setLiveTaskTitle]   = useState(subtaskTitle || taskTitle);
  const [liveTaskId,    setLiveTaskId]      = useState(taskId);

  // ── FR-C-06: Done-by calculator ──────────────────────────────────────────────
  const doneByTime = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + duration);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  }, [duration]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const progress = secondsLeft / totalSeconds;

  // ── Music state ─────────────────────────────────────────────────────────────
  const {
    playerState, ready: musicReady,
    pause: musicPause, resume: musicResume,
    nextTrack, prevTrack, playPlaylist,
  } = useYouTubePlayback();

  const spotify = useSpotifyPlayback();

  const [playlists,         setPlaylists]         = useState<Playlist[]>([]);
  const [activePlaylistId,  setActivePlaylistId]  = useState<string | null>(null);
  const [pickerOpen,        setPickerOpen]        = useState(false);
  const [sessionMusicSource, setSessionMusicSource] = useState<"youtube" | "spotify" | null>(null);
  const [spotifyConnected,  setSpotifyConnected]  = useState(false);
  const [spotifyCurated,    setSpotifyCurated]    = useState<SpotifyCuratedRow[]>([]);
  const [activeSpotifyUri,  setActiveSpotifyUri]  = useState<string | null>(null);
  // FR-C-07: audio mode toggle
  const [audioMode, setAudioMode] = useState<"focus" | "masking">("focus");

  // ── FR-C-07: keyword-based playlist categorisation ───────────────────────────
  const MASKING_KEYWORDS = ["brown", "white noise", "pink noise", "rain", "thunder", "masking", "noise"];
  const isMaskingPlaylist = (name: string, description?: string | null) => {
    const haystack = `${name} ${description ?? ""}`.toLowerCase();
    return MASKING_KEYWORDS.some((kw) => haystack.includes(kw));
  };
  const filteredYoutubePlaylists = playlists.filter((pl) =>
    audioMode === "masking" ? isMaskingPlaylist(pl.name) : !isMaskingPlaylist(pl.name)
  );
  const filteredSpotifyCurated = spotifyCurated.filter((pl) =>
    audioMode === "masking" ? isMaskingPlaylist(pl.name, pl.description) : !isMaskingPlaylist(pl.name, pl.description)
  );

  // ── Create session on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!taskId) return;
    fetch("/api/sessions", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId, duration_minutes: duration }),
    })
      .then(async (r) => {
        if (r.status === 409) {
          const d = await r.json().catch(() => null) as null | {
            active_session_id?: string;
            active_task_id?: string;
          };

          // If the active session is for a different task, don't silently "resume" the wrong context.
          if (d?.active_task_id && d.active_task_id !== taskId) {
            toast.error("You already have a focus session open for another task. Resume it from Sessions.");
            navigate("/sessions");
            return null;
          }

          if (d?.active_session_id) {
            sessionIdRef.current = d.active_session_id;
            toast.message("Resumed your active focus session.");
            return { session_id: d.active_session_id };
          }

          toast.error("You already have a focus session open. Resume it from Sessions.");
          navigate("/sessions");
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((d) => { if (d?.session_id) sessionIdRef.current = d.session_id; })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch curated YouTube playlists ────────────────────────────────────────
  useEffect(() => {
    fetch("/api/music/curated?source=youtube", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { id: number; youtube_playlist_id?: string; name: string }[]) => {
        const list = Array.isArray(rows) ? rows : [];
        setPlaylists(
          list
            .filter((x) => x.youtube_playlist_id)
            .map((x) => ({ id: x.id, youtube_playlist_id: x.youtube_playlist_id as string, name: x.name }))
        );
      })
      .catch(() => setPlaylists([]));
  }, []);

  // ── Spotify status + curated ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetch("/api/spotify/status", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { connected?: boolean }) => {
        if (cancelled || !d.connected) return;
        setSpotifyConnected(true);
        return fetch("/api/music/curated?source=spotify", { credentials: "include" }).then((r2) =>
          r2.ok ? r2.json() : []
        );
      })
      .then((rows) => {
        if (cancelled || !rows) return;
        const list = Array.isArray(rows) ? rows : [];
        setSpotifyCurated(
          list
            .map((row: { id: number; playlist_id?: string; youtube_playlist_id?: string; name: string; description: string | null }) => ({
              id: row.id,
              playlist_id: row.playlist_id ?? row.youtube_playlist_id ?? "",
              name: row.name,
              description: row.description,
            }))
            .filter((x: SpotifyCuratedRow) => x.playlist_id)
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // ── Timer logic ─────────────────────────────────────────────────────────────
  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const goToComplete = useCallback((xp: number, mins: number) => {
    const p = new URLSearchParams({ duration: String(duration), taskTitle, xp: String(xp), minutes: String(mins) });
    if (subtaskId)    p.set("subtaskId",    subtaskId);
    if (subtaskTitle) p.set("subtaskTitle", subtaskTitle);
    if (taskId)       p.set("taskId",       taskId);
    navigate(`/sessions/complete?${p}`);
  }, [duration, taskTitle, subtaskId, subtaskTitle, taskId, navigate]);

  // ── FR-C-08: No-shame leave — opens reflection modal instead of confirm ─────
  const leaveFocusMode = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setShowReflection(true);
  }, [clearTimer]);

  // Resume session from the reflection modal (user changed their mind)
  const resumeFromReflection = useCallback(() => {
    setShowReflection(false);
    if (!completedRef.current) {
      setIsRunning(true);
      setIsPaused(false);
    }
  }, []);

  // Submit reflection and leave
  const submitReflection = useCallback((reflectionType: string | null, reflectionNote: string) => {
    completedRef.current = true;
    clearTimer();
    if (sessionIdRef.current) {
      fetch(`/api/sessions/${sessionIdRef.current}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          end_time: new Date().toISOString(),
          ...(reflectionType && { reflection_type: reflectionType }),
          ...(reflectionNote.trim() && { reflection_content: reflectionNote.trim() }),
        }),
      }).catch(() => {});
    }
    setShowReflection(false);
    navigate("/sessions");
  }, [clearTimer, navigate]);

  useEffect(() => {
    if (!isRunning) { clearTimer(); return; }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return clearTimer;
  }, [isRunning, clearTimer]);

  // ── On natural completion — FR-C-04 micro-modal branch ──────────────────────
  useEffect(() => {
    if (secondsLeft === 0 && !completedRef.current) {
      clearTimer();
      setIsRunning(false);

      // FR-C-04: Micro-timer (5 min) → show choices modal instead of auto-completing
      if (duration === 5) {
        setShowMicroModal(true);
        return;
      }

      completedRef.current = true;
      const xp = duration * 2;
      addScore(xp);
      if (sessionIdRef.current) {
        fetch(`/api/sessions/${sessionIdRef.current}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ end_time: new Date().toISOString() }),
        }).catch(() => {});
      }
      goToComplete(xp, duration);
    }
  }, [secondsLeft, clearTimer, addScore, duration, goToComplete]);

  // ── FR-C-04: Micro-timer modal handlers ──────────────────────────────────────
  const handleMicroContinue = useCallback(() => {
    setShowMicroModal(false);
    setSecondsLeft(25 * 60);
    setIsRunning(true);
    setIsPaused(false);
    toast.success("Timer extended — keep it up!");
  }, []);

  const handleMicroBreak = useCallback(() => {
    setShowMicroModal(false);
    completedRef.current = true;
    const xp = 5 * 2;
    addScore(xp);
    if (sessionIdRef.current) {
      fetch(`/api/sessions/${sessionIdRef.current}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ end_time: new Date().toISOString() }),
      }).catch(() => {});
    }
    goToComplete(xp, 5);
  }, [addScore, goToComplete]);

  const handleMicroSwitch = useCallback(() => {
    setShowMicroModal(false);
    completedRef.current = true;
    if (sessionIdRef.current) {
      fetch(`/api/sessions/${sessionIdRef.current}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ end_time: new Date().toISOString() }),
      }).catch(() => {});
    }
    navigate("/sessions");
  }, [navigate]);

  // ── Controls ─────────────────────────────────────────────────────────────────
  const togglePause = () => {
    const nowPausing = isRunning; // true → we're about to pause the timer
    setIsRunning((r) => !r);
    setIsPaused((p) => !p);

    // Keep music in sync with the session timer
    if (nowPausing) {
      if (sessionMusicSource === "spotify" && spotify.playerState && !spotify.playerState.paused) {
        spotify.pause().catch(() => {});
      } else if (sessionMusicSource !== "spotify" && playerState?.isPlaying) {
        musicPause();
      }
    } else {
      if (sessionMusicSource === "spotify" && spotify.playerState) {
        spotify.resume().catch(() => {});
      } else if (sessionMusicSource !== "spotify" && playerState) {
        musicResume();
      }
    }
  };

  const handleSubtaskDone = async () => {
    clearTimer();
    setIsRunning(false);
    const minutesFocused = Math.max(1, Math.ceil((totalSeconds - secondsLeft) / 60));
    const xpGained = minutesFocused * 2;
    if (subtaskId && taskId) {
      fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtask_status: "Done" }),
      }).catch(() => {});
    }
    if (sessionIdRef.current) {
      fetch(`/api/sessions/${sessionIdRef.current}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ end_time: new Date().toISOString() }),
      }).catch(() => {});
    }
    addScore(xpGained);
    goToComplete(xpGained, minutesFocused);
  };

  // ── FR-C-05: I'm Stuck ───────────────────────────────────────────────────────
  const openStuckPanel = useCallback(async () => {
    setShowStuckPanel(true);
    setStuckLoading(true);
    try {
      const res = await fetch("/api/tasks", { credentials: "include" });
      const data: BacklogTask[] = await res.json();
      // FR-C-05: only show low-priority (low-energy) tasks that aren't the current one
      const available = data.filter(
        (t) =>
          t.task_id !== liveTaskId &&
          t.priority === "low" &&
          (t.task_status === "Backlog" || t.task_status === "Ready")
      );
      setStuckTasks(available);
    } catch {
      setStuckTasks([]);
    } finally {
      setStuckLoading(false);
    }
  }, [liveTaskId]);

  const handleStuckSwitch = useCallback(async (task: BacklogTask) => {
    if (!sessionIdRef.current) return;
    try {
      const res = await fetch(`/api/sessions/${sessionIdRef.current}/switch`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_task_id: task.task_id }),
      });
      if (!res.ok) throw new Error("Switch failed");
      setLiveTaskTitle(task.task_name);
      setLiveTaskId(task.task_id);
      setShowStuckPanel(false);
      toast.success(`Switched to "${task.task_name}"`);
    } catch {
      toast.error("Couldn't switch task — try again.");
    }
  }, []);

  // ── Music controls ────────────────────────────────────────────────────────────
  const spotifyTrack = spotify.playerState?.track_window?.current_track;
  // useRef for the actual in-flight guard — synchronous, never stale across rapid clicks
  // useState only for the visual disabled state on buttons
  const musicInFlightRef = useRef(false);
  const [isMusicSwitching, setIsMusicSwitching] = useState(false);

  const acquireMusicLock = () => {
    if (musicInFlightRef.current) return false;
    musicInFlightRef.current = true;
    setIsMusicSwitching(true);
    return true;
  };
  const releaseMusicLock = () => {
    musicInFlightRef.current = false;
    setIsMusicSwitching(false);
  };

  const handlePlayPlaylist = async (pl: Playlist) => {
    if (!acquireMusicLock()) return;
    const prevSource = sessionMusicSource;
    const prevPlaylistId = activePlaylistId;
    // Only pause Spotify if it is actually connected and playing
    if (sessionMusicSource === "spotify" && spotify.playerState && !spotify.playerState.paused) {
      try { await spotify.pause(); } catch { /* ignore */ }
    }
    setActivePlaylistId(pl.youtube_playlist_id);
    setSessionMusicSource("youtube");
    setActiveSpotifyUri(null);
    try {
      await playPlaylist(pl.youtube_playlist_id);
    } catch {
      setActivePlaylistId(prevPlaylistId);
      setSessionMusicSource(prevSource);
      toast.error("Couldn't start playlist — try again.");
    } finally {
      releaseMusicLock();
    }
  };

  const handleSpotifyPlay = async (pl: SpotifyCuratedRow) => {
    if (!acquireMusicLock()) return;
    const uri = `spotify:playlist:${pl.playlist_id}`;
    const prevSource = sessionMusicSource;
    const prevUri = activeSpotifyUri;
    // Only pause YouTube if it is actually playing
    if (playerState?.isPlaying) musicPause();
    setActiveSpotifyUri(uri);
    setSessionMusicSource("spotify");
    setActivePlaylistId(null);
    try {
      await spotify.playPlaylist(uri);
    } catch (e) {
      setActiveSpotifyUri(prevUri);
      setSessionMusicSource(prevSource);
      toast.error(e instanceof Error ? e.message : "Spotify playback failed.");
    } finally {
      releaseMusicLock();
    }
  };

  const togglePlayPause = async () => {
    if (!acquireMusicLock()) return;
    try {
      if (sessionMusicSource === "spotify") {
        if (spotify.playerState?.paused === false) await spotify.pause();
        else await spotify.resume();
      } else {
        if (playerState?.isPlaying) musicPause();
        else musicResume();
      }
    } catch {
      toast.error("Playback control failed — try again.");
    } finally {
      releaseMusicLock();
    }
  };

  const handlePrevCombined = async () => {
    if (!acquireMusicLock()) return;
    try {
      if (sessionMusicSource === "spotify") {
        const list = filteredSpotifyCurated;
        if (list.length === 0) return;
        const curIdx = list.findIndex((pl) => `spotify:playlist:${pl.playlist_id}` === activeSpotifyUri);
        const prevPl = list[(curIdx <= 0 ? list.length : curIdx) - 1];
        releaseMusicLock(); // handleSpotifyPlay acquires its own lock
        await handleSpotifyPlay(prevPl);
      } else {
        const list = filteredYoutubePlaylists;
        if (list.length === 0) return;
        const curIdx = list.findIndex((pl) => pl.youtube_playlist_id === activePlaylistId);
        const prevPl = list[(curIdx <= 0 ? list.length : curIdx) - 1];
        releaseMusicLock(); // handlePlayPlaylist acquires its own lock
        await handlePlayPlaylist(prevPl);
      }
    } catch {
      toast.error("Couldn't go to previous playlist.");
      releaseMusicLock();
    }
  };

  const handleNextCombined = async () => {
    if (!acquireMusicLock()) return;
    try {
      if (sessionMusicSource === "spotify") {
        const list = filteredSpotifyCurated;
        if (list.length === 0) return;
        const curIdx = list.findIndex((pl) => `spotify:playlist:${pl.playlist_id}` === activeSpotifyUri);
        const nextPl = list[(curIdx + 1) % list.length];
        releaseMusicLock();
        await handleSpotifyPlay(nextPl);
      } else {
        const list = filteredYoutubePlaylists;
        if (list.length === 0) return;
        const curIdx = list.findIndex((pl) => pl.youtube_playlist_id === activePlaylistId);
        const nextPl = list[(curIdx + 1) % list.length];
        releaseMusicLock();
        await handlePlayPlaylist(nextPl);
      }
    } catch {
      toast.error("Couldn't go to next playlist.");
      releaseMusicLock();
    }
  };

  // ── Dock display ─────────────────────────────────────────────────────────────
  const dockTitle =
    sessionMusicSource === "spotify" && spotifyTrack
      ? spotifyTrack.name
      : (playerState?.title ?? "No music");

  const dockSubtitle =
    sessionMusicSource === "spotify" && spotifyTrack
      ? spotifyTrack.artists.map((a) => a.name).join(", ")
      : playerState?.author ?? (musicReady ? "Pick a playlist" : "Loading…");

  const dockArt = useMemo(() => {
    if (sessionMusicSource === "spotify" && spotifyTrack?.album?.images?.[0]?.url)
      return spotifyTrack.album.images[0].url;
    if (playerState?.videoId)
      return `https://img.youtube.com/vi/${playerState.videoId}/mqdefault.jpg`;
    return null;
  }, [sessionMusicSource, spotifyTrack, playerState?.videoId]);

  const dockPlaying =
    sessionMusicSource === "spotify"
      ? Boolean(spotify.playerState && !spotify.playerState.paused)
      : Boolean(playerState?.isPlaying);

  const statusLabel = isRunning ? "Focusing…" : isPaused ? "Paused" : "Complete";
  const percentDone = Math.round((1 - progress) * 100);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-screen h-screen overflow-hidden select-none">

      {/* ── Background ──────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${isDark ? "/bg.jpg" : "/bg-light.jpg"}')` }}
      />
      <div className={cn("absolute inset-0", isDark ? "bg-black/58" : "bg-white/18")} />
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 35%, rgba(0,0,0,0.45) 100%)"
            : "radial-gradient(ellipse 70% 70% at 50% 45%, rgba(255,255,255,0.28) 0%, transparent 100%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
        style={{
          background: isDark
            ? "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)"
            : "linear-gradient(to top, rgba(255,255,255,0.55) 0%, transparent 100%)",
        }}
      />

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 pt-4 gap-4">
        <button
          type="button"
          onClick={leaveFocusMode}
          className="flex items-center gap-1.5 transition-colors"
          style={{ color: isDark ? "rgba(255,255,255,0.65)" : "rgba(15,23,42,0.70)" }}
          title="Leave focus mode"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Task name chip */}
        <div className="flex-1 flex justify-center">
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full max-w-[280px] truncate"
            style={{
              background: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.60)",
              backdropFilter: "blur(12px)",
              border: isDark ? "0.5px solid rgba(255,255,255,0.14)" : "0.5px solid rgba(15,23,42,0.14)",
            }}
          >
            <span
              className="text-[12px] font-semibold truncate"
              style={{ color: isDark ? "rgba(255,255,255,0.80)" : "rgba(15,23,42,0.82)" }}
            >
              {liveTaskTitle}
            </span>
          </div>
        </div>

        {/* Subtask done */}
        <div className="flex items-center gap-2">
          {subtaskId && (
            <button
              type="button"
              onClick={handleSubtaskDone}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
              style={{ background: "rgba(20,184,166,0.18)", border: "0.5px solid rgba(20,184,166,0.35)", color: isDark ? "rgba(94,234,212,0.92)" : "rgba(13,148,136,0.95)" }}
            >
              <Check className="w-3 h-3" />
              Done
            </button>
          )}
        </div>
      </div>

      {/* ── Center: Status + Timer + Mode + Done-by + I'm Stuck ─────────── */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6">

        <motion.p
          key={statusLabel}
          initial={reduced ? undefined : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] font-bold uppercase tracking-[0.22em]"
          style={{ color: isDark ? "rgba(255,255,255,0.50)" : "rgba(15,23,42,0.55)" }}
        >
          {statusLabel}
        </motion.p>

        <motion.p
          className="font-bold tabular-nums leading-none"
          style={{
            fontSize: "clamp(92px, 16vw, 176px)",
            letterSpacing: "-0.04em",
            color: isDark ? "#ffffff" : "rgba(15,23,42,0.90)",
            textShadow: isDark ? "0 4px 60px rgba(0,0,0,0.55)" : "0 2px 24px rgba(255,255,255,0.70)",
          }}
          animate={reduced ? undefined : { opacity: isRunning ? 1 : 0.65 }}
          transition={{ duration: 0.4 }}
        >
          {formatTime(secondsLeft)}
        </motion.p>

        {/* Mode / duration pill */}
        <div
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-full mt-1"
          style={{
            background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.55)",
            backdropFilter: "blur(12px)",
            border: isDark ? "0.5px solid rgba(255,255,255,0.13)" : "0.5px solid rgba(15,23,42,0.12)",
          }}
        >
          <span className="text-[13px] font-semibold" style={{ color: isDark ? "rgba(255,255,255,0.70)" : "rgba(15,23,42,0.78)" }}>{duration} min</span>
          <span style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(15,23,42,0.28)" }}>·</span>
          <span className="text-[13px]" style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.55)" }}>{percentDone}% complete</span>
        </div>

        {/* FR-C-06: Done-by time */}
        <p className="text-[12px] font-medium" style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.50)" }}>
          Done by{" "}
          <span className="font-semibold tabular-nums" style={{ color: isDark ? "rgba(255,255,255,0.60)" : "rgba(15,23,42,0.72)" }}>{doneByTime}</span>
        </p>

        {/* + 5 min */}
        <button
          type="button"
          onClick={() => setSecondsLeft((s) => s + 300)}
          className="text-[12px] font-medium transition-colors"
          style={{ color: isDark ? "rgba(255,255,255,0.28)" : "rgba(15,23,42,0.42)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = isDark ? "rgba(255,255,255,0.60)" : "rgba(15,23,42,0.72)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = isDark ? "rgba(255,255,255,0.28)" : "rgba(15,23,42,0.42)"; }}
        >
          + 5 min
        </button>

        {/* FR-C-05: I'm Stuck button */}
        <button
          type="button"
          onClick={openStuckPanel}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold transition-all mt-1"
          style={{
            background: isDark ? "rgba(251,191,36,0.10)" : "rgba(180,120,0,0.10)",
            border: isDark ? "0.5px solid rgba(251,191,36,0.30)" : "0.5px solid rgba(180,120,0,0.40)",
            color: isDark ? "rgba(251,191,36,0.85)" : "rgba(120,70,0,0.90)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(251,191,36,0.18)" : "rgba(180,120,0,0.16)";
            (e.currentTarget as HTMLElement).style.color = isDark ? "rgba(251,191,36,1)" : "rgba(120,70,0,1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(251,191,36,0.10)" : "rgba(180,120,0,0.10)";
            (e.currentTarget as HTMLElement).style.color = isDark ? "rgba(251,191,36,0.85)" : "rgba(120,70,0,0.90)";
          }}
        >
          <Shuffle className="w-3.5 h-3.5" />
          I'm stuck — switch task
        </button>
      </div>

      {/* ── Playlist picker panel ────────────────────────────────────────── */}
      <AnimatePresence>
        {pickerOpen && (
          <>
            <motion.div
              key="picker-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              onClick={() => setPickerOpen(false)}
            />
            <motion.div
              key="picker-panel"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 300 }}
              className="absolute bottom-[80px] left-0 right-0 z-40 max-h-[55vh] overflow-y-auto"
              style={{
                background: isDark ? "rgba(6,3,18,0.92)" : "rgba(255,255,255,0.88)",
                backdropFilter: "blur(28px)",
                borderTop: isDark ? "0.5px solid rgba(255,255,255,0.09)" : "1px solid rgba(15,23,42,0.10)",
              }}
            >
              <div className="px-5 py-4">

                {(playerState || spotify.playerState) && (
                  <div className="flex items-center justify-center gap-3 mb-5 pt-1">
                    <button type="button" onClick={handlePrevCombined} disabled={isMusicSwitching} className={cn(musicBtnCn, isMusicSwitching && "opacity-40 cursor-not-allowed")}><SkipBack style={{ width: 13, height: 13 }} /></button>
                    <button type="button" onClick={togglePlayPause} disabled={isMusicSwitching} className={cn(musicBtnCn, "w-10 h-10 bg-white/12", isMusicSwitching && "opacity-40 cursor-not-allowed")}>
                      {isMusicSwitching ? <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> : dockPlaying ? <Pause style={{ width: 15, height: 15 }} /> : <Play style={{ width: 15, height: 15 }} />}
                    </button>
                    <button type="button" onClick={handleNextCombined} disabled={isMusicSwitching} className={cn(musicBtnCn, isMusicSwitching && "opacity-40 cursor-not-allowed")}><SkipForward style={{ width: 13, height: 13 }} /></button>
                  </div>
                )}

                {/* FR-C-07: 40Hz Focus / Brown Noise toggle */}
                <div
                  className="flex items-center gap-1 p-1 rounded-xl mb-4"
                  style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)" }}
                >
                  <button
                    type="button"
                    onClick={() => setAudioMode("focus")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all duration-150",
                      audioMode === "focus"
                        ? isDark
                          ? "bg-violet-500/30 text-violet-200"
                          : "bg-violet-600/10 text-violet-800"
                        : isDark
                          ? "text-white/35 hover:text-white/55"
                          : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Zap style={{ width: 11, height: 11 }} />
                    40Hz Focus
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioMode("masking")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all duration-150",
                      audioMode === "masking"
                        ? isDark
                          ? "bg-teal-500/25 text-teal-200"
                          : "bg-teal-600/10 text-teal-800"
                        : isDark
                          ? "text-white/35 hover:text-white/55"
                          : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Coffee style={{ width: 11, height: 11 }} />
                    Brown Noise
                  </button>
                </div>

                {/* YouTube playlists — filtered by mode */}
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.08em] mb-2"
                  style={{ color: isDark ? "rgba(255,255,255,0.22)" : "rgba(15,23,42,0.55)" }}
                >
                  Free · YouTube
                </p>
                {filteredYoutubePlaylists.length > 0 ? (
                  <div className="flex flex-col gap-0.5 mb-5">
                    {filteredYoutubePlaylists.slice(0, 6).map((pl) => (
                      <button
                        type="button"
                        key={pl.id}
                        onClick={() => { handlePlayPlaylist(pl); setPickerOpen(false); }}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-left w-full transition-all duration-150",
                          activePlaylistId === pl.youtube_playlist_id
                            ? isDark ? "bg-violet-500/12" : "bg-violet-600/10"
                            : isDark ? "hover:bg-white/[0.04]" : "hover:bg-slate-900/[0.04]"
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" style={{ background: "rgba(124,111,247,0.15)" }}>
                          <Music style={{ width: 12, height: 12, color: "rgba(196,181,253,0.55)" }} />
                        </div>
                        <p
                          className={cn(
                            "text-[12px] font-medium truncate flex-1",
                            activePlaylistId === pl.youtube_playlist_id
                              ? isDark ? "text-violet-300" : "text-violet-800"
                              : isDark ? "text-white/70" : "text-slate-800"
                          )}
                        >
                          {pl.name}
                        </p>
                        {activePlaylistId === pl.youtube_playlist_id && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#7c6ff7" }} />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-center py-2 mb-5" style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(15,23,42,0.55)" }}>
                    {musicReady
                      ? `No ${audioMode === "focus" ? "40Hz" : "Brown Noise"} playlists. Add them in Admin → Playlists.`
                      : "Loading…"}
                  </p>
                )}

                {/* Spotify playlists — filtered by mode */}
                {spotifyConnected && (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: isDark ? "rgba(255,255,255,0.22)" : "rgba(15,23,42,0.55)" }}>Spotify</p>
                    {spotify.error && <p className="text-[11px] leading-snug mb-3 px-0.5" style={{ color: "rgba(252,211,77,0.9)" }}>{spotify.error}</p>}
                    {!spotify.error && !spotify.ready && <p className="text-[11px] leading-snug mb-3 px-0.5" style={{ color: isDark ? "rgba(255,255,255,0.38)" : "rgba(15,23,42,0.60)" }}>Connecting Spotify… Premium required.</p>}
                    {filteredSpotifyCurated.length > 0 && (
                      <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto pr-1">
                        {filteredSpotifyCurated.map((pl) => {
                          const uri = `spotify:playlist:${pl.playlist_id}`;
                          const active = activeSpotifyUri === uri;
                          return (
                            <button
                              type="button"
                              key={pl.id}
                              onClick={() => { handleSpotifyPlay(pl); setPickerOpen(false); }}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-left w-full transition-all",
                                active
                                  ? isDark ? "bg-emerald-500/15" : "bg-emerald-600/10"
                                  : isDark ? "hover:bg-white/[0.04]" : "hover:bg-slate-900/[0.04]"
                              )}
                            >
                              <div className={cn("w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold", active ? "bg-emerald-500/25 text-emerald-300" : "bg-emerald-500/10 text-emerald-400/70")}>S</div>
                              <div className="min-w-0 flex-1">
                                <p className={cn("text-[12px] font-medium truncate", active ? (isDark ? "text-emerald-200" : "text-emerald-800") : (isDark ? "text-white/70" : "text-slate-800"))}>{pl.name}</p>
                                {pl.description && <p className="text-[10px] truncate" style={{ color: isDark ? "rgba(255,255,255,0.30)" : "rgba(15,23,42,0.55)" }}>{pl.description}</p>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {filteredSpotifyCurated.length === 0 && spotify.ready && (
                      <p className="text-[12px] text-center py-2" style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(15,23,42,0.55)" }}>
                        No {audioMode === "focus" ? "40Hz" : "Brown Noise"} Spotify playlists.
                      </p>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Bottom dock ─────────────────────────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-3 px-5"
        style={{
          height: "80px",
          background: isDark ? "rgba(0,0,0,0.52)" : "rgba(255,255,255,0.70)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          borderTop: isDark ? "0.5px solid rgba(255,255,255,0.07)" : "1px solid rgba(15,23,42,0.10)",
        }}
      >
        <button type="button" className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => setPickerOpen((v) => !v)}>
          <div className="w-11 h-11 shrink-0 rounded-xl overflow-hidden" style={{ background: "rgba(124,111,247,0.18)" }}>
            {dockArt ? (
              <img src={dockArt} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-4 h-4" style={{ color: "rgba(196,181,253,0.45)" }} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold truncate" style={{ color: isDark ? "rgba(255,255,255,0.80)" : "rgba(15,23,42,0.88)" }}>{dockTitle}</p>
            <p className="text-[11px] truncate" style={{ color: isDark ? "rgba(255,255,255,0.40)" : "rgba(15,23,42,0.55)" }}>{dockSubtitle}</p>
          </div>
        </button>

        <div className="flex items-center gap-3 shrink-0">
          <button type="button" onClick={handlePrevCombined} className="w-8 h-8 flex items-center justify-center transition-colors" style={{ color: isDark ? "rgba(255,255,255,0.50)" : "rgba(15,23,42,0.55)" }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = isDark ? "rgba(255,255,255,0.85)" : "rgba(15,23,42,0.90)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = isDark ? "rgba(255,255,255,0.50)" : "rgba(15,23,42,0.55)"; }}>
            <SkipBack className="w-4 h-4" />
          </button>
          <button type="button" onClick={togglePause} className="w-14 h-14 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
            {isRunning ? <Pause className="w-[18px] h-[18px] text-black" /> : <Play className="w-[18px] h-[18px] text-black translate-x-[1px]" />}
          </button>
          <button type="button" onClick={handleNextCombined} className="w-8 h-8 flex items-center justify-center transition-colors" style={{ color: isDark ? "rgba(255,255,255,0.50)" : "rgba(15,23,42,0.55)" }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = isDark ? "rgba(255,255,255,0.85)" : "rgba(15,23,42,0.90)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = isDark ? "rgba(255,255,255,0.50)" : "rgba(15,23,42,0.55)"; }}>
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-end gap-3">
          <svg width="28" height="28" className="shrink-0" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="14" cy="14" r="11" fill="none" stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.12)"} strokeWidth="2" />
            <circle cx="14" cy="14" r="11" fill="none" stroke="rgba(196,181,253,0.65)" strokeWidth="2"
              strokeDasharray={`${2 * Math.PI * 11}`}
              strokeDashoffset={`${2 * Math.PI * 11 * progress}`}
              strokeLinecap="round"
              style={{ transition: reduced ? "none" : "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <button type="button" onClick={() => setPickerOpen((v) => !v)} className="transition-colors" style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.55)" }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = isDark ? "rgba(255,255,255,0.70)" : "rgba(15,23,42,0.90)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.55)"; }}>
            <ChevronUp className={cn("w-4 h-4 transition-transform duration-200", pickerOpen && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* ── FR-C-08: Reflection modal ────────────────────────────────────── */}
      <AnimatePresence>
        {showReflection && (
          <ReflectionModal
            onSubmit={submitReflection}
            onResume={resumeFromReflection}
            isDark={isDark}
          />
        )}
      </AnimatePresence>

      {/* ── FR-C-04: Micro-timer modal ───────────────────────────────────── */}
      <AnimatePresence>
        {showMicroModal && (
          <MicroTimerModal
            onContinue={handleMicroContinue}
            onBreak={handleMicroBreak}
            onSwitch={handleMicroSwitch}
            isDark={isDark}
          />
        )}
      </AnimatePresence>

      {/* ── FR-C-05: I'm Stuck panel ─────────────────────────────────────── */}
      <AnimatePresence>
        {showStuckPanel && (
          <StuckPanel
            tasks={stuckTasks}
            loading={stuckLoading}
            currentTaskId={liveTaskId}
            onSwitch={handleStuckSwitch}
            onClose={() => setShowStuckPanel(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const musicBtnCn =
  "w-8 h-8 rounded-full border border-white/15 bg-white/[0.06] " +
  "flex items-center justify-center cursor-pointer text-white/65 " +
  "hover:bg-white/[0.12] transition-colors duration-150";

export default SessionActive;
