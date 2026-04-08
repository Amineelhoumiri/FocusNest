import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Music2, Loader2, AlertCircle, ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";
import { useYouTubePlayback } from "@/context/YouTubePlaybackContext";
import { useSpotifyPlayback } from "@/context/SpotifyPlaybackContext";
import { useTheme }          from "@/context/ThemeContext";
import { cn }                from "@/lib/utils";
import { MusicWebBottomBar, MusicWebHero } from "@/components/music/MusicWebPlayer";
import { Card } from "@/components/ui/card";
import {
  MUSIC_SOURCE_STORAGE_KEY,
  notifyMusicPageSourceChanged,
} from "@/lib/music-source";
import { useAuth } from "@/context/AuthContext";
import { ConsentModal } from "@/components/ConsentModal";

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

const pickRandom = (arr: CuratedPlaylist[]) =>
  arr[Math.floor(Math.random() * arr.length)];

/** Free mode lists YouTube playlists; strip misleading “Spotify ·” from catalog copy. */
const freePlaylistRowSubtitle = (desc: string | null): string => {
  if (desc == null || !desc.trim()) return "YouTube · Playlist";
  let t = desc.trim();
  t = t.replace(/^\s*spotify\s*[·•]\s*/i, "YouTube · ");
  t = t.replace(/^\s*spotify\s*-\s*/i, "YouTube · ");
  t = t.replace(/^\s*spotify\s+/i, "YouTube · ");
  return t;
};

// ─── Spotify logo SVG ────────────────────────────────────────────────────────

const SpotifyLogo = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.622.622 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.623.623 0 01-.277-1.215c3.809-.87 7.076-.496 9.712 1.115a.622.622 0 01.207.857zm1.223-2.722a.779.779 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 01-.973-.519.779.779 0 01.519-.972c3.632-1.102 8.147-.568 11.234 1.328a.78.78 0 01.257 1.072zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71a.937.937 0 11-.543-1.794c3.532-1.072 9.404-.865 13.115 1.338a.936.936 0 01-1.055 1.553z" />
  </svg>
);

const YouTubeMark = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn("shrink-0", className)} aria-hidden>
    <rect x="2" y="5" width="20" height="14" rx="3.5" fill="#FF0000" />
    <path d="M10 9.2v5.6L15.2 12 10 9.2z" fill="white" />
  </svg>
);

// ─── Source toggle ────────────────────────────────────────────────────────────

const SourceToggle = ({ active, onChange }: { active: Source; onChange: (s: Source) => void }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className="flex items-center gap-0.5 p-1 rounded-xl"
      style={{
        background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
        border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.07)",
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
                : (isDark ? "rgba(148,163,184,0.75)" : "rgba(0,0,0,0.45)"),
              boxShadow: isActive && !isDark ? "0 1px 4px rgba(0,0,0,0.08)" : undefined,
              border: isActive ? (isDark ? "1px solid rgba(124,111,247,0.25)" : "1px solid rgba(0,0,0,0.08)") : "1px solid transparent",
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
    useYouTubePlayback();

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

  const displayTitle =
    playerState?.title || activeName || (ready ? "Nothing playing" : "Loading player…");
  const displayArtist =
    !ready
      ? "Preparing playback…"
      : playerState?.author
        ? playerState.author
        : !playerState?.title && !activeName
          ? "Pick a playlist or tap shuffle"
          : activeName
            ? "Tap play to start"
            : null;

  const [playlistSearch, setPlaylistSearch] = useState("");
  const filteredPlaylists = useMemo(() => {
    const q = playlistSearch.trim().toLowerCase();
    if (!q) return playlists;
    return playlists.filter(
      (pl) =>
        pl.name.toLowerCase().includes(q) ||
        (pl.description?.toLowerCase().includes(q) ?? false)
    );
  }, [playlists, playlistSearch]);

  /** FocusNest “Free” hub — violet ambient; same dark chrome in light app theme. */
  const freeFocusShell: React.CSSProperties = {
    background: isDark
      ? `radial-gradient(ellipse 120% 90% at 50% -28%, hsl(var(--primary) / 0.20), transparent 54%),
         radial-gradient(ellipse 52% 44% at 94% 100%, hsl(var(--primary) / 0.11), transparent 50%),
         linear-gradient(168deg, #100c1a 0%, #080612 42%, #040308 100%)`
      : `radial-gradient(ellipse 120% 90% at 50% -28%, hsl(var(--primary) / 0.14), transparent 54%),
         linear-gradient(168deg, #14101f 0%, #0a0812 100%)`,
    border: `1px solid hsl(var(--primary) / 0.14)`,
    boxShadow: isDark
      ? `0 24px 80px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.4) inset`
      : `0 20px 60px -24px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.06) inset`,
    backdropFilter: "blur(28px)",
    borderRadius: "1.25rem",
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">

      {/* Ambient background — scoped to main column, not sidebar/navbar */}
      <AnimatePresence>
        {thumb && (
          <motion.div
            key={playerState?.videoId}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="pointer-events-none absolute inset-0"
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

      <div
        className="relative z-[1] flex min-h-0 w-full flex-1 flex-col overflow-hidden text-white"
        style={freeFocusShell}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.45]"
          style={{
            background:
              "radial-gradient(circle at 18% 108%, hsl(var(--primary) / 0.14), transparent 52%)",
          }}
        />

        <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            {/* Hero: large artwork */}
            <div
              className={cn(
                "flex min-h-0 min-w-0 flex-1 flex-col",
                "border-b border-primary/12 lg:border-b-0 lg:border-r lg:border-primary/12",
                "bg-[linear-gradient(180deg,rgba(10,10,12,0.92)_0%,rgba(6,6,8,0.96)_100%)]",
                "p-3 sm:p-4 lg:p-5"
              )}
            >
              <MusicWebHero
                artworkUrl={thumb}
                isPlaying={isPlaying}
                accent="violet"
              />
            </div>

            {/* Queue column: search + tabs + list */}
            <div
              className={cn(
                "relative z-[1] flex min-h-0 w-full max-w-full flex-col overflow-hidden",
                "md:w-[min(100%,380px)] md:shrink-0 xl:w-[min(100%,440px)]",
                "bg-[linear-gradient(180deg,rgba(12,12,14,0.94)_0%,rgba(4,4,6,0.98)_100%)]"
              )}
            >
              <div className="shrink-0 border-b border-white/10 px-4 pt-3">
                <div className="mb-3 flex items-center gap-2">
                  <YouTubeMark size={16} />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                    Free listening
                  </span>
                </div>
                <div className="-mb-px flex gap-6">
                  <span className="border-b-2 border-primary pb-2.5 text-[13px] font-semibold text-white">
                    Playlists
                  </span>
                </div>
              </div>

              <div className="shrink-0 px-4 py-3">
                <label className="sr-only" htmlFor="youtube-playlist-search">
                  Search playlists
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35"
                    aria-hidden
                  />
                  <input
                    id="youtube-playlist-search"
                    type="search"
                    autoComplete="off"
                    placeholder="Search artists, playlists…"
                    value={playlistSearch}
                    onChange={(e) => setPlaylistSearch(e.target.value)}
                    className={cn(
                      "w-full rounded-full border border-white/[0.08] bg-white/[0.06] py-2.5 pl-10 pr-4",
                      "text-[13px] text-white placeholder:text-white/35",
                      "outline-none transition-shadow focus:border-primary/35 focus:ring-2 focus:ring-primary/20"
                    )}
                  />
                </div>
              </div>

              <div className="relative min-h-0 flex-1 w-full">
                <div className="max-h-full space-y-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-0 [scrollbar-gutter:stable]">
                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-4 w-4 animate-spin text-primary/45" />
                    </div>
                  ) : playlists.length === 0 ? (
                    <p className="px-3 py-10 text-center text-[12px] leading-relaxed text-white/40">
                      No playlists yet.
                    </p>
                  ) : filteredPlaylists.length === 0 ? (
                    <p className="px-4 py-8 text-center text-[12px] leading-relaxed text-white/40">
                      No playlists match “{playlistSearch.trim()}”.
                    </p>
                  ) : (
                    filteredPlaylists.map((pl, idx) => {
                      const active = activeId === pl.youtube_playlist_id;
                      return (
                        <motion.button
                          key={pl.id}
                          type="button"
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handlePlay(pl.youtube_playlist_id)}
                          aria-pressed={active}
                          className={cn(
                            "group grid w-full grid-cols-[2rem_40px_1fr_auto] items-center gap-2 rounded-xl border px-2 py-2 text-left transition-colors",
                            "border-white/[0.06] bg-white/[0.03] hover:border-white/12 hover:bg-white/[0.06]",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45",
                            active && "border-primary/40 bg-primary/[0.12] ring-1 ring-primary/20"
                          )}
                        >
                          <span className="text-center text-[11px] tabular-nums text-white/35">
                            {idx + 1}
                          </span>
                          <div
                            className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md"
                            style={
                              pl.image_url
                                ? undefined
                                : {
                                    background:
                                      "linear-gradient(145deg, hsl(var(--primary) / 0.35), rgba(32, 24, 56, 0.92))",
                                  }
                            }
                          >
                            {pl.image_url ? (
                              <img src={pl.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-white/85">
                                <Music2 className="h-4 w-4" aria-hidden />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-semibold text-white">{pl.name}</p>
                            <p className="truncate text-[10px] text-white/40">
                              {freePlaylistRowSubtitle(pl.description)}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 pr-1 text-[9px] font-semibold uppercase tracking-wider",
                              active ? "text-primary-bright" : "text-white/30 group-hover:text-white/50"
                            )}
                          >
                            {active ? "▶" : " "}
                          </span>
                        </motion.button>
                      );
                    })
                  )}
                </div>
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-6 bg-gradient-to-b from-[#0a0a0c] to-transparent"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-6 bg-gradient-to-t from-[#0a0a0c] to-transparent"
                  aria-hidden
                />
              </div>
            </div>
          </div>

          <MusicWebBottomBar
            artworkUrl={thumb}
            title={displayTitle}
            subtitle={displayArtist ?? "Pick a playlist or tap shuffle"}
            isPlaying={isPlaying}
            onTogglePlay={playerState ? (isPlaying ? pause : resume) : handleRandom}
            onPrev={playerState ? prevTrack : undefined}
            onNext={playerState ? nextTrack : undefined}
            currentSec={playerState?.currentTime ?? 0}
            durationSec={playerState?.duration ?? 0}
            onSeek={seek}
            seekDisabled={!playerState}
            volume={volume}
            muted={muted}
            onVolume={handleVolume}
            onToggleMute={toggleMute}
            accent="violet"
            showShuffle
            onShuffle={handleRandom}
            shuffleDisabled={!ready || !playlists.length}
            shuffleTitle={
              !ready
                ? "Player is still loading"
                : !playlists.length
                  ? "No playlists available"
                  : "Shuffle a random playlist"
            }
          />
        </div>

        <div
          className="relative z-[1] shrink-0 border-t border-white/[0.06] px-4 py-2.5 text-center"
          style={{ background: "rgba(0,0,0,0.35)" }}
        >
          <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/40">
            Powered by YouTube · Free · No account required
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Spotify player view (when connected + Premium) ───────────────────────────

const SPOTIFY_CARD_FALLBACK_ART =
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&h=400&q=80";

const SpotifyPlayerView = () => {
  const { playerState, ready, error, pause, resume, nextTrack, prevTrack, seek, setVolume, playPlaylist } =
    useSpotifyPlayback();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [curated, setCurated] = useState<{ id: number; playlist_id: string; name: string; description: string | null }[]>([]);
  const [loadingCurated, setLoadingCurated] = useState(true);

  const [playingUri, setPlayingUri] = useState<string | null>(null);
  const [uiVolume, setUiVolume] = useState(0.7);
  const [playlistSearch, setPlaylistSearch] = useState("");

  const filteredCurated = useMemo(() => {
    const q = playlistSearch.trim().toLowerCase();
    if (!q) return curated;
    return curated.filter(
      (pl) =>
        pl.name.toLowerCase().includes(q) ||
        (pl.description?.toLowerCase().includes(q) ?? false)
    );
  }, [curated, playlistSearch]);

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

  const spotifyPlayback = React.useMemo(() => {
    const durSec = Math.max(dur, 1);
    const title = track?.name ?? (curated[0]?.name ?? "Nothing playing");
    const artists =
      track?.artists?.map((a: { name: string }) => a.name).join(", ") ??
      (curated[0]?.description || "Pick a playlist to play");
    const albumArt = art ?? SPOTIFY_CARD_FALLBACK_ART;
    return {
      isPlaying: isPlay,
      positionSec: pos,
      durationSec: durSec,
      title,
      artists,
      albumArt,
      onTogglePlay: () => {
        if (isPlay) void pause();
        else void resume();
      },
      onPrev: () => void prevTrack(),
      onNext: () => void nextTrack(),
    };
  }, [
    isPlay,
    pos,
    dur,
    track,
    art,
    curated,
    playerState?.duration,
    pause,
    resume,
    prevTrack,
    nextTrack,
  ]);

  const cardStyle: React.CSSProperties = {
    background:     isDark ? "rgba(26,24,46,0.65)" : "rgba(255,255,255,0.80)",
    border:         isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.07)",
    backdropFilter: "blur(20px)",
    borderRadius:   "1.25rem",
  };

  /** Single shell for player + playlist: Spotify black / green (not purple app chrome). */
  const spotifyUnifiedShell: React.CSSProperties = {
    background: isDark
      ? `linear-gradient(165deg, #0c0f0e 0%, #060807 38%, #030403 100%)`
      : `linear-gradient(165deg, #121714 0%, #0a0d0b 100%)`,
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: isDark
      ? "0 24px 80px -20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(29,185,84,0.06)"
      : "0 20px 60px -24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(29,185,84,0.08)",
    backdropFilter: "blur(20px)",
    borderRadius: "1.25rem",
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
      className="flex h-full min-h-0 flex-1 flex-col"
    >
      <div
        className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden text-white"
        style={spotifyUnifiedShell}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 0%, rgba(29, 185, 84, 0.07), transparent 50%), radial-gradient(ellipse 70% 50% at 100% 100%, rgba(29, 185, 84, 0.05), transparent 45%)",
          }}
        />
        <div className="relative z-[1] flex min-h-0 flex-1 flex-col md:flex-row md:items-stretch">
        <div
          className={cn(
            "relative z-[1] flex min-h-0 w-full shrink-0 flex-col p-3 sm:p-4 md:p-5",
            "md:h-full md:min-h-0 md:flex-1",
            "border-b border-white/[0.06] md:border-b-0 md:border-r md:border-white/[0.06]",
            "bg-black/20"
          )}
        >
          <MusicWebHero
            artworkUrl={spotifyPlayback.albumArt}
            isPlaying={spotifyPlayback.isPlaying}
            accent="spotify"
          />
        </div>

        <div
          className={cn(
            "relative z-[1] flex min-h-0 w-full flex-1 flex-col md:h-full md:w-[min(100%,400px)] md:flex-none md:shrink-0 lg:w-[min(100%,420px)]",
            "border-t border-white/[0.05] md:border-t-0 bg-black/25"
          )}
        >
          {/* Single panel header: status + search (no duplicate page chrome) */}
          <div className="shrink-0 space-y-3 border-b border-white/[0.06] px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1DB954] opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1DB954]" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-white">Playlists</p>
                  <p className="truncate text-[10px] text-white/40" title="Pick FocusNest in Spotify Connect when asked">
                    Spotify · select device below if audio is quiet
                  </p>
                </div>
              </div>
              <SpotifyLogo size={16} className="shrink-0 text-[#1ED760]" />
            </div>
            <label className="sr-only" htmlFor="spotify-playlist-search">
              Search playlists
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30"
                aria-hidden
              />
              <input
                id="spotify-playlist-search"
                type="search"
                autoComplete="off"
                placeholder="Search playlists…"
                value={playlistSearch}
                onChange={(e) => setPlaylistSearch(e.target.value)}
                className={cn(
                  "w-full rounded-full border border-white/[0.08] bg-white/[0.05] py-2 pl-9 pr-3",
                  "text-[12px] text-white placeholder:text-white/30",
                  "outline-none transition-shadow focus:border-[#1DB954]/40 focus:ring-1 focus:ring-[#1DB954]/30"
                )}
              />
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-2 pb-3 [scrollbar-gutter:stable]">
            {loadingCurated ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-4 w-4 animate-spin text-[#1DB954]/50" />
              </div>
            ) : curated.length === 0 ? (
              <p className="px-2 py-8 text-center text-[11px] leading-relaxed text-white/45">
                No playlists in the catalog yet.
              </p>
            ) : filteredCurated.length === 0 ? (
              <p className="px-2 py-8 text-center text-[11px] leading-relaxed text-white/45">
                No match for “{playlistSearch.trim()}”.
              </p>
            ) : (
              filteredCurated.map((pl, idx) => {
                const uri = `spotify:playlist:${pl.playlist_id}`;
                const isActive = playingUri === uri;
                return (
                  <motion.button
                    key={pl.id}
                    type="button"
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handlePlay(uri)}
                    aria-pressed={isActive}
                    className={cn(
                      "group grid w-full grid-cols-[1.75rem_36px_1fr_auto] items-center gap-2 rounded-lg border px-2 py-2 text-left transition-colors",
                      "border-white/[0.06] bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.06]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DB954]/35",
                      isActive && "border-[#1DB954]/40 bg-[#1DB954]/10 ring-1 ring-[#1DB954]/20"
                    )}
                  >
                    <span className="text-center text-[10px] tabular-nums text-white/30">{idx + 1}</span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-black/40">
                      <SpotifyLogo size={12} className="text-[#1ED760]" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-white">{pl.name}</p>
                      <p className="truncate text-[10px] text-white/38">
                        {pl.description ?? "Spotify playlist"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "pr-0.5 text-[9px] font-semibold uppercase tracking-wider",
                        isActive ? "text-[#1ED760]" : "text-white/28 group-hover:text-white/45"
                      )}
                    >
                      {isActive ? "▶" : ""}
                    </span>
                  </motion.button>
                );
              })
            )}
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-6 bg-gradient-to-b from-[#080908] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-6 bg-gradient-to-t from-[#080908] to-transparent" />
          </div>
        </div>
        </div>

        <MusicWebBottomBar
          artworkUrl={spotifyPlayback.albumArt}
          title={spotifyPlayback.title}
          subtitle={spotifyPlayback.artists}
          isPlaying={spotifyPlayback.isPlaying}
          onTogglePlay={spotifyPlayback.onTogglePlay}
          onPrev={spotifyPlayback.onPrev}
          onNext={spotifyPlayback.onNext}
          currentSec={spotifyPlayback.positionSec}
          durationSec={spotifyPlayback.durationSec}
          onSeek={(sec) => {
            if (!playerState?.duration) return;
            void seek(sec * 1000);
          }}
          seekDisabled={!playerState}
          volume={Math.round(uiVolume * 100)}
          muted={uiVolume === 0}
          onVolume={(v) => {
            const n = v / 100;
            setUiVolume(n);
            void setVolume(n);
          }}
          onToggleMute={() => {
            if (uiVolume === 0) {
              setUiVolume(0.7);
              void setVolume(0.7);
            } else {
              setUiVolume(0);
              void setVolume(0);
            }
          }}
          accent="spotify"
        />
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
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4 py-12 text-center sm:px-6"
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
      <div className="flex h-full min-h-0 flex-1 items-center justify-center px-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  if (!connected) return <SpotifyConnect />;
  return <SpotifyPlayerView />;
};

// ─── Main page ────────────────────────────────────────────────────────────────

const MusicPage = () => {
  const { user } = useAuth();
  const [source, setSource] = useState<Source>(() => {
    try {
      const raw = window.localStorage.getItem(MUSIC_SOURCE_STORAGE_KEY);
      return raw === "spotify" || raw === "free" ? raw : "free";
    } catch {
      return "free";
    }
  });
  const [showConsentModal, setShowConsentModal] = useState(false);

  const setSourcePersisted = useCallback((next: Source) => {
    setSource(next);
    try {
      window.localStorage.setItem(MUSIC_SOURCE_STORAGE_KEY, next);
      notifyMusicPageSourceChanged();
    } catch {
      // ignore storage errors (private mode, disabled, etc.)
    }
  }, []);

  const handleSourceChange = useCallback((next: Source) => {
    if (next === "spotify" && !user?.is_consented_spotify) {
      setShowConsentModal(true);
      return;
    }
    setSourcePersisted(next);
  }, [user, setSourcePersisted]);

  // OAuth errors (incl. consent_required from callback if user lacked consent)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (!err) return;
    window.history.replaceState({}, "", "/spotify");
    if (err === "consent_required") {
      toast.error(
        "Enable Spotify integration in Settings or use the prompt here before connecting your account."
      );
      return;
    }
    if (err === "access_denied") {
      toast.error("Spotify connection cancelled.");
      return;
    }
    toast.error(`Spotify connection failed: ${err}`);
  }, []);

  // OAuth success — only switch to Spotify tab if the user has consented
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") !== "true") return;
    window.history.replaceState({}, "", "/spotify");
    if (user.is_consented_spotify) {
      setSourcePersisted("spotify");
      toast.success("Spotify connected! Premium playback is ready.");
    } else {
      setSourcePersisted("free");
      setShowConsentModal(true);
      toast.info("Enable Spotify integration to use Premium playback.");
    }
  }, [user, setSourcePersisted]);

  // localStorage may still say "spotify" after consent was revoked
  useEffect(() => {
    if (user && !user.is_consented_spotify && source === "spotify") {
      setSourcePersisted("free");
    }
  }, [user, source, setSourcePersisted]);

  return (
    <>
    <div className="flex h-full min-h-0 flex-col">
      {/* Centered column: breathing room on wide screens */}
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 pb-6 pt-3 sm:px-6 sm:pb-8 sm:pt-4 md:px-8 md:pb-10">

      {/* ── Compact page header: Free / Spotify (shadcn Card) ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-4 w-full shrink-0 sm:mb-5"
      >
        <Card className="!rounded-[1.25rem]">
          <div className="flex flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2 sm:px-4 sm:py-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
              {source === "spotify" ? (
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9"
                  style={{
                    background: "rgba(29,185,84,0.12)",
                    border: "1px solid rgba(29,185,84,0.22)",
                  }}
                >
                  <SpotifyLogo size={16} className="text-[#1DB954]" />
                </div>
              ) : (
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9"
                  style={{
                    background: "hsl(var(--primary) / 0.12)",
                    border: "1px solid hsl(var(--primary) / 0.18)",
                  }}
                >
                  <Music2 className="h-4 w-4 sm:h-[17px] sm:w-[17px]" style={{ color: "hsl(var(--primary))" }} />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold tracking-tight text-foreground sm:text-lg">
                  Focus Sounds
                </h1>
                <p className="truncate text-[10px] text-muted-foreground sm:text-[11px]">
                  {source === "spotify"
                    ? "Spotify · Premium · in-browser"
                    : "Free · YouTube playlists · no account"}
                </p>
              </div>
            </div>
            <SourceToggle active={source} onChange={handleSourceChange} />
          </div>
        </Card>
      </motion.div>

      {/* ── Player card (centered with parent max-width) ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={source}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="flex min-h-0 flex-1 flex-col"
        >
          {source === "free" ? <FreePlayer /> : <SpotifyTab />}
        </motion.div>
      </AnimatePresence>

      </div>
    </div>

    {showConsentModal && (
      <ConsentModal
        feature="spotify"
        onClose={() => setShowConsentModal(false)}
        onGranted={() => setSourcePersisted("spotify")}
      />
    )}
    </>
  );
};

export default MusicPage;
