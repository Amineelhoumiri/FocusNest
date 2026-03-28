// src/pages/SessionActive.tsx — Full-screen active session (no sidebar, no navbar)

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Pause, Play, ChevronUp, Music, Plus, Check,
  SkipBack, SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusScore } from "@/context/FocusScoreContext";
import { useSpotifyPlayback } from "@/context/SpotifyPlaybackContext";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";

// ─── Timer constants ──────────────────────────────────────────────────────────

const RING_SIZE    = 300;
const RADIUS       = 128;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 804

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ─── Purple background ────────────────────────────────────────────────────────

const PurpleBackground = ({ reduced }: { reduced: boolean }) => (
  <motion.div
    className="absolute inset-0 pointer-events-none"
    animate={reduced ? undefined : { opacity: [0.88, 1, 0.88], scale: [1, 1.03, 1] }}
    transition={{ duration: 8, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
    style={{
      background: `
        radial-gradient(ellipse 90% 75% at 50% 45%, rgba(109,40,217,0.50) 0%, transparent 55%),
        radial-gradient(ellipse 60% 50% at 15% 75%, rgba(79,20,180,0.30) 0%, transparent 50%),
        radial-gradient(ellipse 55% 45% at 85% 20%, rgba(124,111,247,0.25) 0%, transparent 48%)
      `,
    }}
  />
);

// ─── Curated playlist type ────────────────────────────────────────────────────

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

// ─── SessionActive ────────────────────────────────────────────────────────────

const SessionActive = () => {
  const navigate  = useNavigate();
  const reduced   = useReducedMotion() ?? false;
  const [params]  = useSearchParams();
  const { addScore } = useFocusScore();

  const taskId       = params.get("taskId")       ?? "";
  const taskTitle    = params.get("taskTitle")    ?? "Focus Session";
  const subtaskId    = params.get("subtaskId")    ?? "";
  const subtaskTitle = params.get("subtaskTitle") ?? "";
  const duration     = Number(params.get("duration") ?? "25");
  const totalSeconds = duration * 60;

  // ── Timer state ─────────────────────────────────────────────────────────────
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [isRunning,   setIsRunning]   = useState(true);
  const [isPaused,    setIsPaused]    = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const completedRef = useRef(false);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const doneByTime = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + duration);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  }, [duration]);

  const progress     = secondsLeft / totalSeconds;
  const musicProgress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const musicElapsed  = totalSeconds - secondsLeft;

  // ── Music state ─────────────────────────────────────────────────────────────
  const {
    playerState, ready: musicReady,
    pause: musicPause, resume: musicResume,
    nextTrack, prevTrack, playPlaylist,
  } = useYouTubePlayer();

  const spotify = useSpotifyPlayback();

  const [playlists, setPlaylists]               = useState<Playlist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [expanded, setExpanded]                 = useState(false);
  const [sessionMusicSource, setSessionMusicSource] = useState<"youtube" | "spotify" | null>(null);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyCurated, setSpotifyCurated]     = useState<SpotifyCuratedRow[]>([]);
  const [activeSpotifyUri, setActiveSpotifyUri] = useState<string | null>(null);

  // ── Create session on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!taskId) return;
    fetch("/api/sessions", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId, duration_minutes: duration }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.session_id) sessionIdRef.current = d.session_id; })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch curated YouTube playlists (focus / binaural) ─────────────────────
  useEffect(() => {
    fetch("/api/music/curated?source=youtube", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { id: number; youtube_playlist_id?: string; name: string }[]) => {
        const list = Array.isArray(rows) ? rows : [];
        setPlaylists(
          list
            .filter((x) => x.youtube_playlist_id)
            .map((x) => ({
              id: x.id,
              youtube_playlist_id: x.youtube_playlist_id as string,
              name: x.name,
            }))
        );
      })
      .catch(() => setPlaylists([]));
  }, []);

  // ── Spotify: connection + curated focus playlists ───────────────────────────
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
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Navigate to complete ─────────────────────────────────────────────────────
  const goToComplete = useCallback((xp: number, mins: number) => {
    const p = new URLSearchParams({
      duration:  String(duration),
      taskTitle,
      xp:        String(xp),
      minutes:   String(mins),
    });
    if (subtaskId)    p.set("subtaskId",    subtaskId);
    if (subtaskTitle) p.set("subtaskTitle", subtaskTitle);
    if (taskId)       p.set("taskId",       taskId);
    navigate(`/sessions/complete?${p}`);
  }, [duration, taskTitle, subtaskId, subtaskTitle, taskId, navigate]);

  // ── Timer countdown ─────────────────────────────────────────────────────────
  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => {
    if (!isRunning) { clearTimer(); return; }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) return 0;
        return s - 1;
      });
    }, 1000);
    return clearTimer;
  }, [isRunning, clearTimer]);

  // ── On natural completion ───────────────────────────────────────────────────
  useEffect(() => {
    if (secondsLeft === 0 && !completedRef.current) {
      completedRef.current = true;
      clearTimer();
      const xp   = duration * 2;
      const mins = duration;
      addScore(xp);
      if (sessionIdRef.current) {
        fetch(`/api/sessions/${sessionIdRef.current}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ end_time: new Date().toISOString() }),
        }).catch(() => {});
      }
      goToComplete(xp, mins);
    }
  }, [secondsLeft, clearTimer, addScore, duration, goToComplete]);

  // ── Controls ─────────────────────────────────────────────────────────────────
  const togglePause = () => {
    setIsRunning((r) => !r);
    setIsPaused((p) => !p);
  };

  const handleSubtaskDone = async () => {
    clearTimer();
    setIsRunning(false);

    const minutesFocused = Math.max(1, Math.ceil((totalSeconds - secondsLeft) / 60));
    const xpGained       = minutesFocused * 2;

    // Mark subtask as Done
    if (subtaskId && taskId) {
      fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtask_status: "Done" }),
      }).catch(() => {});
    }

    // End session record
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

  const handlePlayPlaylist = (pl: Playlist) => {
    try {
      playPlaylist(pl.youtube_playlist_id);
      setActivePlaylistId(pl.youtube_playlist_id);
      setSessionMusicSource("youtube");
      setActiveSpotifyUri(null);
    } catch { /* player may not be ready */ }
  };

  const handleSpotifyPlay = async (pl: SpotifyCuratedRow) => {
    const uri = `spotify:playlist:${pl.playlist_id}`;
    setActiveSpotifyUri(uri);
    setSessionMusicSource("spotify");
    setActivePlaylistId(null);
    try {
      await spotify.playPlaylist(uri);
    } catch { /* toast optional */ }
  };

  const spotifyTrack = spotify.playerState?.track_window?.current_track;

  const togglePlayPause = () => {
    if (sessionMusicSource === "spotify") {
      if (spotify.playerState?.paused === false) spotify.pause();
      else spotify.resume();
      return;
    }
    if (playerState?.isPlaying) musicPause();
    else musicResume();
  };

  const handlePrevCombined = () => {
    if (sessionMusicSource === "spotify") spotify.prevTrack();
    else prevTrack();
  };

  const handleNextCombined = () => {
    if (sessionMusicSource === "spotify") spotify.nextTrack();
    else nextTrack();
  };

  const dockTitle =
    sessionMusicSource === "spotify" && spotifyTrack
      ? spotifyTrack.name
      : (playerState?.title ?? "No music playing");
  const dockSubtitle =
    sessionMusicSource === "spotify" && spotifyTrack
      ? spotifyTrack.artists.map((a) => a.name).join(", ")
      : sessionMusicSource === "youtube" || sessionMusicSource === null
        ? (playerState?.author ?? (musicReady ? "Tap to expand playlist" : "Loading…"))
        : (spotify.ready ? "Spotify · focus playlists" : "Spotify…");

  const dockPlaying =
    sessionMusicSource === "spotify"
      ? Boolean(spotify.playerState && !spotify.playerState.paused)
      : Boolean(playerState?.isPlaying);

  const dashOffset = CIRCUMFERENCE * (1 - progress);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#060410] flex flex-col">
      <PurpleBackground reduced={reduced} />

      {/* ── Top bar — subtask context (left) + Done by (right) ── */}
      <div className="relative z-10 flex items-start justify-between px-6 pt-5 shrink-0">

        {/* Left — subtask context */}
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-violet-400/45 mb-1">
            Subtask
          </p>
          <p className="text-[14px] font-bold text-white/82 max-w-[260px] leading-snug line-clamp-2">
            {subtaskTitle || taskTitle}
          </p>
        </div>

        {/* Right — Done by */}
        <div className="bg-[#06030f]/65 border border-violet-400/20 backdrop-blur-[12px]
                        rounded-2xl px-4 py-2.5 text-right shrink-0">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.10em] text-violet-400/45 mb-1">
            Done by
          </p>
          <p className="text-[22px] font-extrabold text-white/92 tracking-tight leading-none">
            {doneByTime}
          </p>
        </div>
      </div>

      {/* ── Timer center ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-7 px-6">
        {/* Ring */}
        <div className="relative flex items-center justify-center"
             style={{ width: RING_SIZE, height: RING_SIZE }}>
          <svg
            width={RING_SIZE} height={RING_SIZE}
            className="absolute inset-0"
            style={{ transform: "rotate(-90deg)" }}
          >
            {/* Track */}
            <circle
              cx={150} cy={150} r={RADIUS}
              fill="none"
              stroke="rgba(109,40,217,0.10)"
              strokeWidth={3}
            />
            {/* Glow arc */}
            <circle
              cx={150} cy={150} r={RADIUS}
              fill="none"
              stroke="rgba(139,92,246,0.25)"
              strokeWidth={14}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{
                transition: reduced ? "none" : "stroke-dashoffset 1s ease",
                filter: "blur(2px)",
              }}
            />
            {/* Sharp ring */}
            <circle
              cx={150} cy={150} r={RADIUS}
              fill="none"
              stroke="rgba(196,181,253,0.72)"
              strokeWidth={2.5}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: reduced ? "none" : "stroke-dashoffset 1s ease" }}
            />
          </svg>

          <div className="relative z-10 text-center">
            <p className="text-[80px] font-[100] text-white tracking-[-5px] tabular-nums leading-none">
              {formatTime(secondsLeft)}
            </p>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-violet-400/40 mt-2.5">
              {isRunning ? "Focusing" : isPaused ? "Paused" : "Complete"}
            </p>
          </div>
        </div>

        {/* Progress text */}
        <p className="text-[12px] text-white/25 text-center mb-7">
          <span className="text-violet-300/55 font-semibold">
            {Math.round((1 - progress) * 100)}%
          </span>
          {" "}complete · {Math.floor((totalSeconds - secondsLeft) / 60)} min focused so far
        </p>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* + 5 min */}
          <button
            onClick={() => setSecondsLeft((s) => s + 300)}
            className="px-6 py-3.5 rounded-full text-[13px] font-semibold cursor-pointer
                       bg-violet-500/14 border-[1.5px] border-violet-400/30
                       text-violet-200/90
                       hover:bg-violet-500/25 transition-all duration-150"
          >
            + 5 min
          </button>

          {/* Pause / Play */}
          <button
            onClick={togglePause}
            className="w-[58px] h-[58px] rounded-full flex items-center justify-center cursor-pointer
                       bg-violet-500/22 border-[2.5px] border-violet-400/52
                       hover:bg-violet-500/38 hover:scale-[1.07]
                       active:scale-[0.94] transition-all duration-150"
          >
            {isRunning
              ? <Pause style={{ width: 20, height: 20 }} className="text-violet-200/92" />
              : <Play  style={{ width: 20, height: 20 }} className="text-violet-200/92" />}
          </button>

          {/* Subtask done — teal, clearly the primary positive action */}
          <button
            onClick={handleSubtaskDone}
            className="flex items-center gap-2 px-6 py-3.5 rounded-full
                       text-[13px] font-bold cursor-pointer
                       bg-teal-500/16 border-[1.5px] border-teal-400/40
                       text-teal-300/90
                       hover:bg-teal-500/28 hover:scale-[1.03]
                       active:scale-[0.97] transition-all duration-200"
          >
            <div className="w-2 h-2 rounded-full bg-teal-400/80 shrink-0" />
            Subtask done
          </button>
        </div>
      </div>

      {/* ── Music dock ── */}
      <motion.div
        animate={{ height: expanded ? (spotifyConnected ? 420 : 320) : 64 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-20 shrink-0 overflow-hidden
                   bg-[#03010a]/88 border-t border-violet-500/[0.15]
                   backdrop-blur-[20px]"
      >
        {/* Collapsed row — always visible */}
        <div
          className="h-16 flex items-center gap-3 px-5 cursor-pointer"
          onClick={() => setExpanded((e) => !e)}
        >
          {/* Art placeholder */}
          <div className="w-[38px] h-[38px] rounded-[10px] shrink-0
                          bg-violet-500/20 flex items-center justify-center">
            <Music style={{ width: 16, height: 16 }} className="text-violet-300/60" />
          </div>

          {/* Track info */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white/72 truncate">
              {dockTitle}
            </p>
            <p className="text-[11px] text-violet-500/62 mt-0.5 truncate">
              {dockSubtitle}
            </p>
          </div>

          <span className="text-[10px] font-extrabold uppercase tracking-[0.07em] px-2.5 py-1 rounded-full
                           bg-violet-500/18 text-violet-400/45 shrink-0">
            Music
          </span>

          {/* Play/pause */}
          <button
            onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
            className="w-9 h-9 rounded-full shrink-0 cursor-pointer
                       bg-violet-500/22 flex items-center justify-center
                       hover:bg-violet-500/35 transition-colors duration-150"
          >
            {dockPlaying
              ? <Pause style={{ width: 14, height: 14 }} className="text-violet-200/85" />
              : <Play  style={{ width: 14, height: 14 }} className="text-violet-200/85" />}
          </button>

          {/* Expand chevron */}
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.22 }}>
            <ChevronUp style={{ width: 16, height: 16 }} className="text-white/22" />
          </motion.div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, delay: 0.1 }}
              className="px-5 pb-5"
            >
              {/* Progress bar (tied to session timer) */}
              <div className="mb-4">
                <div className="h-[3px] rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-1000"
                    style={{ width: `${musicProgress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-white/22">{formatTime(musicElapsed)}</span>
                  <span className="text-[10px] text-white/22">{formatTime(totalSeconds)}</span>
                </div>
              </div>

              {/* Playback controls */}
              {(playerState || spotify.playerState) && (
                <div className="flex items-center justify-center gap-4 mb-4">
                  <button type="button" onClick={handlePrevCombined} className={musicBtnCn}>
                    <SkipBack style={{ width: 13, height: 13 }} />
                  </button>
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    className={cn(musicBtnCn, "w-9 h-9 bg-violet-500/30")}
                  >
                    {dockPlaying
                      ? <Pause style={{ width: 14, height: 14 }} />
                      : <Play  style={{ width: 14, height: 14 }} />}
                  </button>
                  <button type="button" onClick={handleNextCombined} className={musicBtnCn}>
                    <SkipForward style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              )}

              {/* YouTube · curated focus */}
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/20 mb-2.5">
                Free focus (YouTube)
              </p>
              {playlists.length > 0 ? (
                <div className="flex flex-col gap-0.5 mb-5">
                  {playlists.slice(0, 6).map((pl) => (
                    <button
                      type="button"
                      key={pl.id}
                      onClick={() => handlePlayPlaylist(pl)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer",
                        "transition-all duration-150 text-left w-full",
                        activePlaylistId === pl.youtube_playlist_id
                          ? "bg-violet-500/12"
                          : "hover:bg-white/[0.04]"
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg shrink-0 bg-violet-500/15 flex items-center justify-center">
                        <Music style={{ width: 12, height: 12 }} className="text-violet-400/55" />
                      </div>
                      <p className={cn(
                        "text-[12px] font-medium truncate flex-1",
                        activePlaylistId === pl.youtube_playlist_id ? "text-violet-300" : "text-white/55"
                      )}>
                        {pl.name}
                      </p>
                      {activePlaylistId === pl.youtube_playlist_id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-white/25 text-center py-2 mb-5">
                  {musicReady ? "No YouTube playlists configured." : "Loading…"}
                </p>
              )}

              {/* Spotify · curated focus */}
              {spotifyConnected && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/20 mb-2.5">
                    Spotify · focus only
                  </p>
                  {spotifyCurated.length === 0 ? (
                    <p className="text-[11px] text-white/30 text-center py-2">
                      No Spotify focus playlists in catalog.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto pr-1">
                      {spotifyCurated.map((pl) => {
                        const uri = `spotify:playlist:${pl.playlist_id}`;
                        const active = activeSpotifyUri === uri;
                        return (
                          <button
                            type="button"
                            key={pl.id}
                            onClick={() => handleSpotifyPlay(pl)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-left w-full transition-all",
                              active ? "bg-emerald-500/15" : "hover:bg-white/[0.04]"
                            )}
                          >
                            <div
                              className={cn(
                                "w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold",
                                active ? "bg-emerald-500/25 text-emerald-300" : "bg-emerald-500/10 text-emerald-400/70"
                              )}
                            >
                              S
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={cn("text-[12px] font-medium truncate", active ? "text-emerald-200" : "text-white/55")}>
                                {pl.name}
                              </p>
                              {pl.description && (
                                <p className="text-[10px] text-white/35 truncate">{pl.description}</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

const musicBtnCn =
  "w-8 h-8 rounded-full border border-white/15 bg-white/[0.06] " +
  "flex items-center justify-center cursor-pointer text-white/70 " +
  "hover:bg-white/[0.12] transition-colors duration-150";

export default SessionActive;
