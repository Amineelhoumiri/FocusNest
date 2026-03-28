import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, SkipForward, SkipBack,
  Volume2, VolumeX, Shuffle, Music2, Loader2, AlertCircle, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useYouTubePlayer }  from "@/hooks/useYouTubePlayer";
import { useSpotifyPlayback } from "@/context/SpotifyPlaybackContext";
import { useTheme }          from "@/context/ThemeContext";
import { cn }                from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CuratedPlaylist {
  id: number;
  youtube_playlist_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
}

type Source = "free" | "spotify";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ytThumb  = (videoId: string | null) =>
  videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

const fmtSec   = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const pickRandom = (arr: CuratedPlaylist[]) =>
  arr[Math.floor(Math.random() * arr.length)];

// ─── Spotify logo SVG ────────────────────────────────────────────────────────

const SpotifyLogo = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.622.622 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.623.623 0 01-.277-1.215c3.809-.87 7.076-.496 9.712 1.115a.622.622 0 01.207.857zm1.223-2.722a.779.779 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 01-.973-.519.779.779 0 01.519-.972c3.632-1.102 8.147-.568 11.234 1.328a.78.78 0 01.257 1.072zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71a.937.937 0 11-.543-1.794c3.532-1.072 9.404-.865 13.115 1.338a.936.936 0 01-1.055 1.553z" />
  </svg>
);

// ─── Equalizer bars ───────────────────────────────────────────────────────────

const EqBars = ({ playing, color = "hsl(var(--primary))" }: { playing: boolean; color?: string }) => (
  <div className="flex items-end gap-[2px] h-3">
    {[0.3, 0.6, 0.45, 0.75, 0.5].map((h, i) => (
      <motion.div
        key={i}
        className="w-[2px] rounded-full"
        style={{ background: color, minHeight: 3 }}
        animate={playing ? { height: [`${h * 12}px`, "12px", `${h * 8}px`] } : { height: "3px" }}
        transition={{ duration: 0.6 + i * 0.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
      />
    ))}
  </div>
);

// ─── Seek bar ─────────────────────────────────────────────────────────────────

const SeekBar = ({ current, duration, onSeek }: { current: number; duration: number; onSeek: (s: number) => void }) => {
  const ref  = useRef<HTMLDivElement>(null);
  const pct  = duration > 0 ? (current / duration) * 100 : 0;
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration);
  };

  return (
    <div className="w-full group">
      <div
        ref={ref}
        onClick={handleClick}
        className="relative h-1.5 rounded-full cursor-pointer"
        style={{ background: isDark ? "rgba(255,255,255,0.10)" : "rgba(83,74,183,0.12)" }}
      >
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ width: `${pct}%`, background: "hsl(var(--primary))" }}
          transition={{ duration: 0.5 }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${pct}% - 6px)`, background: "white", boxShadow: "0 0 8px rgba(255,255,255,0.4)" }}
        />
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] tabular-nums text-muted-foreground/65">
        <span>{fmtSec(current)}</span>
        <span>{fmtSec(duration)}</span>
      </div>
    </div>
  );
};

// ─── Source toggle ────────────────────────────────────────────────────────────

const SourceToggle = ({ active, onChange }: { active: Source; onChange: (s: Source) => void }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className="flex items-center gap-0.5 p-1 rounded-xl"
      style={{
        background: isDark ? "rgba(255,255,255,0.05)" : "rgba(83,74,183,0.07)",
        border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(83,74,183,0.12)",
      }}
    >
      {(["free", "spotify"] as Source[]).map((src) => {
        const isActive = active === src;
        return (
          <motion.button
            key={src}
            onClick={() => onChange(src)}
            className="relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
            style={{
              background: isActive ? (isDark ? "rgba(124,111,247,0.22)" : "#fff") : "transparent",
              color: isActive
                ? (src === "spotify" ? "#1DB954" : isDark ? "#c4b5fd" : "#534AB7")
                : (isDark ? "rgba(148,163,184,0.75)" : "rgba(83,74,183,0.55)"),
              boxShadow: isActive && !isDark ? "0 1px 6px rgba(83,74,183,0.12)" : undefined,
              border: isActive ? (isDark ? "1px solid rgba(124,111,247,0.25)" : "1px solid rgba(83,74,183,0.15)") : "1px solid transparent",
            }}
          >
            {src === "free" ? (
              <Music2 className="w-3.5 h-3.5" style={{ width: 14, height: 14 }} />
            ) : (
              <SpotifyLogo size={14} />
            )}
            {src === "free" ? "Free" : "Spotify"}
          </motion.button>
        );
      })}
    </div>
  );
};

// ─── Free player (YouTube) ────────────────────────────────────────────────────

const FreePlayer = () => {
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId,  setActiveId]  = useState<string | null>(null);
  const [volume,    setVolVol]    = useState(70);
  const [muted,     setMuted]     = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { ready, error, playerState, pause, resume, nextTrack, prevTrack, seek, setVolume, playPlaylist } =
    useYouTubePlayer();

  useEffect(() => {
    fetch("/api/music/curated", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setPlaylists(Array.isArray(d) ? d : []); })
      .catch(() => setPlaylists([]))
      .finally(() => setIsLoading(false));
  }, []);

  const handlePlay = useCallback((id: string) => {
    setActiveId(id);
    try { playPlaylist(id); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Playback failed"); }
  }, [playPlaylist]);

  const handleRandom = useCallback(() => {
    if (!playlists.length) return;
    const pick = pickRandom(playlists);
    handlePlay(pick.youtube_playlist_id);
  }, [playlists, handlePlay]);

  const handleVolume = (v: number) => {
    setVolVol(v);
    setMuted(v === 0);
    setVolume(v / 100);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setVolume(next ? 0 : volume / 100);
  };

  const isPlaying  = playerState?.isPlaying ?? false;
  const thumb      = ytThumb(playerState?.videoId ?? null);
  const activeName = playlists.find(p => p.youtube_playlist_id === activeId)?.name ?? null;

  const cardStyle: React.CSSProperties = {
    background:     isDark ? "rgba(26,24,46,0.65)" : "rgba(255,255,255,0.80)",
    border:         isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(83,74,183,0.12)",
    backdropFilter: "blur(20px)",
    borderRadius:   "1.25rem",
  };

  return (
    <div className="flex flex-col gap-5">

      {/* Ambient background */}
      <AnimatePresence>
        {thumb && (
          <motion.div
            key={playerState?.videoId}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 0 }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${thumb})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(80px) saturate(1.8)",
                opacity: 0.07,
                transform: "scale(1.2)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Now playing + controls ── */}
      <div className="flex gap-5 items-start flex-col sm:flex-row">

        {/* Artwork + controls */}
        <div className="flex-1 overflow-hidden flex flex-col" style={{ ...cardStyle, minHeight: 380 }}>

          {/* Artwork */}
          <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
            <AnimatePresence mode="wait">
              {thumb ? (
                <motion.img
                  key={playerState?.videoId}
                  src={thumb} alt=""
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                  style={{ background: "hsl(var(--primary) / 0.04)" }}
                >
                  {!ready ? (
                    <>
                      <Loader2 className="w-7 h-7 animate-spin" style={{ color: "hsl(var(--primary) / 0.4)" }} />
                      <p className="text-xs text-muted-foreground/65">Loading player…</p>
                    </>
                  ) : error ? (
                    <>
                      <AlertCircle className="w-7 h-7 text-destructive/50" />
                      <p className="text-xs text-destructive/60 max-w-[200px] text-center">{error}</p>
                    </>
                  ) : (
                    <>
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{ background: "hsl(var(--primary) / 0.08)", border: "1px solid hsl(var(--primary) / 0.12)" }}
                      >
                        <Music2 className="w-6 h-6" style={{ color: "hsl(var(--primary) / 0.35)" }} />
                      </div>
                      <p className="text-xs text-muted-foreground/65 tracking-wide">
                        {playlists.length ? "Pick a playlist to begin" : "No playlists yet"}
                      </p>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {isPlaying && (
              <div className="absolute top-3 right-3 flex items-end gap-[2px] h-5 px-2 py-1.5 rounded-lg"
                style={{ background: "rgba(0,0,0,0.52)", backdropFilter: "blur(8px)" }}>
                <EqBars playing={isPlaying} color="white" />
              </div>
            )}
          </div>

          {/* Track info + controls */}
          <div className="flex flex-col p-5 gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={playerState?.title || "idle"}
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm font-semibold text-foreground truncate leading-tight"
                  >
                    {playerState?.title || activeName || "Nothing playing"}
                  </motion.p>
                </AnimatePresence>
                {playerState?.author && (
                  <p className="text-[11px] text-muted-foreground/65 truncate mt-0.5">{playerState.author}</p>
                )}
              </div>
            </div>

            {playerState
              ? <SeekBar current={playerState.currentTime} duration={playerState.duration} onSeek={seek} />
              : <div className="w-full h-1.5 rounded-full" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(83,74,183,0.08)" }} />
            }

            {/* Controls row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={prevTrack}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                  style={{ color: "hsl(var(--foreground) / 0.45)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground) / 0.9)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--foreground) / 0.45)")}
                >
                  <SkipBack className="w-4 h-4" />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={isPlaying ? pause : resume}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-all"
                  style={{
                    background: "hsl(var(--primary))",
                    boxShadow: "0 4px 24px hsl(var(--primary) / 0.45)",
                  }}
                >
                  {isPlaying
                    ? <Pause className="w-5 h-5 fill-white" />
                    : <Play  className="w-5 h-5 fill-white ml-0.5" />}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={nextTrack}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                  style={{ color: "hsl(var(--foreground) / 0.45)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground) / 0.9)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--foreground) / 0.45)")}
                >
                  <SkipForward className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="transition-colors"
                  style={{ color: "hsl(var(--foreground) / 0.40)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground) / 0.8)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--foreground) / 0.40)")}
                >
                  {muted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <div
                  className="relative w-20 h-1.5 rounded-full cursor-pointer group"
                  style={{ background: isDark ? "rgba(255,255,255,0.10)" : "rgba(83,74,183,0.12)" }}
                  onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    handleVolume(Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 100));
                  }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${muted ? 0 : volume}%`, background: "hsl(var(--primary) / 0.7)" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Playlist sidebar ── */}
        <div
          className="w-full sm:w-56 overflow-hidden flex flex-col shrink-0"
          style={{ ...cardStyle, maxHeight: 440 }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderBottom: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(83,74,183,0.10)" }}
          >
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/65">
              Playlists
            </p>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleRandom}
              disabled={!ready || !playlists.length}
              className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg transition-all disabled:opacity-40"
              style={{
                background: "hsl(var(--primary) / 0.08)",
                color: "hsl(var(--primary))",
              }}
            >
              <Shuffle className="w-2.5 h-2.5" />
              Shuffle
            </motion.button>
          </div>

          <div className="flex-1 overflow-y-auto py-1.5 px-1.5 flex flex-col gap-0.5">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/40" />
              </div>
            ) : playlists.length === 0 ? (
              <p className="text-[10px] text-muted-foreground/65 text-center py-10 px-3">No playlists yet.</p>
            ) : (
              playlists.map(pl => {
                const active = activeId === pl.youtube_playlist_id;
                return (
                  <motion.button
                    key={pl.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePlay(pl.youtube_playlist_id)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all"
                    style={{
                      background: active ? "hsl(var(--primary) / 0.10)" : "transparent",
                      border: active ? "1px solid hsl(var(--primary) / 0.20)" : "1px solid transparent",
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = "hsl(var(--foreground) / 0.04)"; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                      style={{ background: "hsl(var(--primary) / 0.08)" }}
                    >
                      {pl.image_url
                        ? <img src={pl.image_url} alt="" className="w-full h-full object-cover" />
                        : <Music2 className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary) / 0.45)" }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: active ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.85)" }}>
                        {pl.name}
                      </p>
                      {pl.description && (
                        <p className="text-[9px] truncate mt-0.5 text-muted-foreground/55">{pl.description}</p>
                      )}
                    </div>
                    {active && isPlaying && <EqBars playing />}
                  </motion.button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-[9px] text-muted-foreground/45 tracking-widest uppercase">
        Powered by YouTube · Free · No account required
      </p>
    </div>
  );
};

// ─── Spotify player view (when connected + Premium) ───────────────────────────

const SpotifyPlayerView = () => {
  const { playerState, ready, error, pause, resume, nextTrack, prevTrack, seek, playPlaylist } = useSpotifyPlayback();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [curated, setCurated] = useState<{ id: number; playlist_id: string; name: string; description: string | null }[]>([]);
  const [loadingCurated, setLoadingCurated] = useState(true);

  const [playingUri, setPlayingUri] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/music/curated?source=spotify", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        setCurated(
          list.map((row: { id: number; playlist_id?: string; youtube_playlist_id?: string; name: string; description: string | null }) => ({
            id: row.id,
            playlist_id: row.playlist_id ?? row.youtube_playlist_id ?? "",
            name: row.name,
            description: row.description,
          })).filter((x: { playlist_id: string }) => x.playlist_id)
        );
      })
      .catch(() => setCurated([]))
      .finally(() => setLoadingCurated(false));
  }, []);

  const handlePlay = useCallback(async (uri: string) => {
    setPlayingUri(uri);
    try {
      await playPlaylist(uri);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Playback failed — make sure Spotify is open on a device.");
      setPlayingUri(null);
    }
  }, [playPlaylist]);

  const track  = playerState?.track_window?.current_track;
  const art    = track?.album?.images?.[0]?.url ?? null;
  const isPlay = !playerState?.paused;
  const pos    = playerState ? playerState.position / 1000 : 0;
  const dur    = playerState ? playerState.duration / 1000 : 0;

  const cardStyle: React.CSSProperties = {
    background:     isDark ? "rgba(26,24,46,0.65)" : "rgba(255,255,255,0.80)",
    border:         isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(83,74,183,0.12)",
    backdropFilter: "blur(20px)",
    borderRadius:   "1.25rem",
  };

  if (!ready && !error) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  if (error) {
    const isPremiumError = error.toLowerCase().includes("premium") || error.toLowerCase().includes("account");
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 py-16 text-center px-6"
        style={cardStyle}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)" }}
        >
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {isPremiumError ? "Spotify Premium required" : "Playback error"}
          </p>
          <p className="text-[12px] mt-1.5 max-w-[300px] mx-auto" style={{ color: isDark ? "rgba(148,163,184,1)" : "rgba(26,24,48,0.55)" }}>
            {isPremiumError
              ? "In-browser playback requires a Spotify Premium subscription."
              : error}
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
          {isPremiumError && (
            <a
              href="https://spotify.com/premium"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[12px] font-semibold px-4 py-2 rounded-xl transition-colors"
              style={{ background: "#1DB954", color: "#fff" }}
            >
              <SpotifyLogo size={14} />
              Explore Premium
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <button
            onClick={async () => {
              const res = await fetch("/api/spotify/auth", { credentials: "include" }).catch(() => null);
              if (res?.ok) {
                const { url } = await res.json();
                window.location.href = url;
              }
            }}
            className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-2 transition-colors"
          >
            Reconnect Spotify account
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5"
    >
      {/* Connected badge + hint */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl w-fit"
          style={{
            background: isDark ? "rgba(29,185,84,0.08)" : "rgba(29,185,84,0.06)",
            border: "1px solid rgba(29,185,84,0.18)",
          }}
        >
          <div className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse shrink-0" />
          <span className="text-[12px] font-semibold" style={{ color: "#1DB954" }}>Spotify connected</span>
        </div>
        <p className="text-[11px] text-muted-foreground max-w-md leading-relaxed">
          Focus-only mode: you can start playlists curated for concentration and binaural-style listening.
          Keep Spotify or this tab active and choose <strong className="text-foreground/80">FocusNest</strong> as the playback device when prompted.
        </p>
      </div>

      {/* Compact now-playing row */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex gap-4 p-4 md:p-5 items-stretch" style={cardStyle}>
          {/* Cover */}
          <div
            className="relative w-[120px] h-[120px] md:w-[140px] md:h-[140px] shrink-0 rounded-xl overflow-hidden"
            style={{ background: "rgba(29,185,84,0.06)" }}
          >
            <AnimatePresence mode="wait">
              {art ? (
                <motion.img
                  key={track?.id}
                  src={art}
                  alt=""
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2">
                  <SpotifyLogo size={36} className="text-[#1DB954]" />
                  <p className="text-[10px] text-center text-muted-foreground leading-tight px-1">
                    Pick a focus playlist below
                  </p>
                </div>
              )}
            </AnimatePresence>
            {isPlay && (
              <div
                className="absolute top-2 right-2 flex items-end gap-[2px] h-4 px-1.5 py-1 rounded-md"
                style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
              >
                <EqBars playing color="#1DB954" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center gap-3">
            <div className="min-w-0">
              <AnimatePresence mode="wait">
                <motion.p
                  key={track?.id ?? "idle"}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-base font-semibold text-foreground truncate"
                >
                  {track?.name ?? "Nothing playing"}
                </motion.p>
              </AnimatePresence>
              {track?.artists?.[0] ? (
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {track.artists.map((a: { name: string }) => a.name).join(", ")}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Select a curated focus playlist to start
                </p>
              )}
            </div>

            {playerState ? (
              <SeekBar current={pos} duration={dur} onSeek={(s) => seek(s * 1000)} />
            ) : (
              <div
                className="w-full h-1.5 rounded-full"
                style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(83,74,183,0.08)" }}
              />
            )}

            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={prevTrack}
                className="w-9 h-9 rounded-full flex items-center justify-center text-foreground/50 hover:text-foreground/90 transition-colors"
                type="button"
              >
                <SkipBack className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={isPlay ? pause : resume}
                className="w-11 h-11 rounded-full flex items-center justify-center text-white"
                style={{ background: "#1DB954", boxShadow: "0 3px 16px rgba(29,185,84,0.35)" }}
                type="button"
              >
                {isPlay ? (
                  <Pause className="w-5 h-5 fill-white" />
                ) : (
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                )}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={nextTrack}
                className="w-9 h-9 rounded-full flex items-center justify-center text-foreground/50 hover:text-foreground/90 transition-colors"
                type="button"
              >
                <SkipForward className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Focus & binaural — single list */}
        <div className="w-full md:w-[min(100%,320px)] shrink-0 rounded-2xl overflow-hidden flex flex-col max-h-[min(60vh,420px)]" style={cardStyle}>
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{
              borderBottom: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(83,74,183,0.10)",
            }}
          >
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/65">
                Focus and binaural
              </p>
              <p className="text-[10px] text-muted-foreground/55 mt-0.5">Curated Spotify playlists</p>
            </div>
            <SpotifyLogo size={14} className="text-[#1DB954] opacity-70" />
          </div>
          <div className="flex-1 overflow-y-auto py-1 min-h-[120px]">
            {loadingCurated ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/40" />
              </div>
            ) : curated.length === 0 ? (
              <p className="text-[11px] text-muted-foreground/65 text-center py-8 px-4 leading-relaxed">
                No Spotify playlists configured yet. Ask an admin to add focus playlists in the catalog.
              </p>
            ) : (
              curated.map((pl) => {
                const uri = `spotify:playlist:${pl.playlist_id}`;
                const isActive = playingUri === uri;
                return (
                  <motion.button
                    key={pl.id}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePlay(uri)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                    style={{
                      background: isActive ? "rgba(29,185,84,0.10)" : "transparent",
                      border: "none",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
                      style={{
                        background: "rgba(29,185,84,0.10)",
                        border: isActive ? "1px solid rgba(29,185,84,0.35)" : "1px solid rgba(29,185,84,0.12)",
                      }}
                    >
                      <SpotifyLogo size={14} className="text-[#1DB954]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[12px] font-medium truncate"
                        style={{ color: isActive ? "#1DB954" : "hsl(var(--foreground) / 0.88)" }}
                      >
                        {pl.name}
                      </p>
                      {pl.description ? (
                        <p className="text-[10px] text-muted-foreground/55 truncate mt-0.5">{pl.description}</p>
                      ) : null}
                    </div>
                    {isActive && <EqBars playing={!playerState?.paused} color="#1DB954" />}
                  </motion.button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Spotify connect CTA ─────────────────────────────────────────────────────

const SpotifyConnect = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/spotify/auth", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to get auth URL");
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not connect to Spotify");
      setConnecting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6 py-16 text-center px-4"
    >
      {/* Logo orb */}
      <div className="relative">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #1DB954, #1ed760)",
            boxShadow: "0 12px 40px rgba(29,185,84,0.40)",
          }}
        >
          <SpotifyLogo size={48} className="text-white" />
        </div>
        <motion.div
          className="absolute inset-[-8px] rounded-[28px] border border-[#1DB954]/20 pointer-events-none"
          animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.02, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="max-w-[320px]">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">
          Connect Spotify
        </h2>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: isDark ? "rgba(148,163,184,1)" : "rgba(26,24,48,0.58)" }}>
          Link your Spotify Premium account to control playback directly from FocusNest while you focus.
        </p>
      </div>

      {/* Feature list */}
      <div className="flex flex-col gap-2 text-left w-full max-w-[280px]">
        {[
          "Control Spotify from this tab",
          "See current track and album art",
          "Listen to admin-curated focus and binaural playlists only",
        ].map((f) => (
          <div key={f} className="flex items-center gap-2.5">
            <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(29,185,84,0.15)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#1DB954]" />
            </div>
            <span className="text-[12px]" style={{ color: isDark ? "rgba(203,213,225,0.9)" : "rgba(26,24,48,0.65)" }}>
              {f}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleConnect}
          disabled={connecting}
          className="flex items-center gap-2 text-[14px] font-semibold px-7 py-3 rounded-2xl text-white transition-all disabled:opacity-70"
          style={{
            background: "#1DB954",
            boxShadow: "0 4px 20px rgba(29,185,84,0.40)",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 28px rgba(29,185,84,0.55)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(29,185,84,0.40)"; }}
        >
          {connecting ? <Loader2 size={18} className="animate-spin" /> : <SpotifyLogo size={18} />}
          {connecting ? "Connecting…" : "Connect with Spotify"}
        </motion.button>
        <p className="text-[10px]" style={{ color: isDark ? "rgba(148,163,184,0.65)" : "rgba(26,24,48,0.38)" }}>
          Requires Spotify Premium · OAuth 2.0 secured
        </p>
      </div>
    </motion.div>
  );
};

// ─── Spotify tab (checks connection, renders accordingly) ─────────────────────

const SpotifyTab = () => {
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/spotify/token", { credentials: "include" })
      .then(r => setConnected(r.ok))
      .catch(() => setConnected(false));
  }, []);

  if (connected === null) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  if (!connected) return <SpotifyConnect />;
  return <SpotifyPlayerView />;
};

// ─── Main page ────────────────────────────────────────────────────────────────

const MusicPage = () => {
  const [source, setSource] = useState<Source>("free");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Handle OAuth redirect params (?connected=true or ?error=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      setSource("spotify");
      toast.success("Spotify connected! Premium playback is ready.");
      window.history.replaceState({}, "", "/spotify");
    } else if (params.get("error")) {
      const err = params.get("error");
      toast.error(err === "access_denied"
        ? "Spotify connection cancelled."
        : `Spotify connection failed: ${err}`);
      window.history.replaceState({}, "", "/spotify");
    }
  }, []);

  return (
    <div className="relative max-w-5xl mx-auto pb-10">
      <div className="relative z-10 flex flex-col gap-6">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center justify-between pt-1"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: source === "spotify" ? "rgba(29,185,84,0.12)" : "hsl(var(--primary) / 0.12)",
                border: source === "spotify" ? "1px solid rgba(29,185,84,0.20)" : "1px solid hsl(var(--primary) / 0.18)",
              }}
            >
              {source === "spotify"
                ? <SpotifyLogo size={18} className="text-[#1DB954]" />
                : <Music2 className="w-4.5 h-4.5" style={{ color: "hsl(var(--primary))", width: 18, height: 18 }} />}
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground tracking-tight">Focus Sounds</h1>
              <p className="text-[10px] text-muted-foreground/65 tracking-widest uppercase">
                {source === "spotify" ? "Spotify Connect" : "Binaural · Deep Focus"}
              </p>
            </div>
          </div>

          <SourceToggle active={source} onChange={setSource} />
        </motion.div>

        {/* ── Content ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={source}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            {source === "free" ? <FreePlayer /> : <SpotifyTab />}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
};

export default MusicPage;
