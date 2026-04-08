import { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, ExternalLink } from "lucide-react";
import { NavbarNowPlaying } from "@/components/ui/navbar-now-playing";
import { useSpotifyPlayback } from "@/context/SpotifyPlaybackContext";
import { useYouTubePlayback } from "@/context/YouTubePlaybackContext";
import { softenNavbarMusicSubtitle } from "@/lib/music-source";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

type Display =
  | { source: "spotify"; title: string; subtitle: string | null; art: string | null }
  | { source: "youtube"; title: string; subtitle: string | null; art: string | null }
  | null;

function computeDisplay(
  spotify: ReturnType<typeof useSpotifyPlayback>,
  yt: ReturnType<typeof useYouTubePlayback>
): Display {
  const spotifyTrack = spotify.playerState?.track_window?.current_track;
  const hasYt = Boolean(yt.playerState?.videoId || yt.playerState?.title);

  if (spotifyTrack) {
    return {
      source: "spotify",
      title: spotifyTrack.name ?? "Spotify",
      subtitle: softenNavbarMusicSubtitle(
        spotifyTrack.artists?.map((a) => a.name).join(", ") ?? null
      ),
      art: spotifyTrack.album?.images?.[0]?.url ?? null,
    };
  }

  if (hasYt) {
    return {
      source: "youtube",
      title: yt.playerState?.title ?? "YouTube",
      subtitle: softenNavbarMusicSubtitle(yt.playerState?.author ?? null),
      art: yt.playerState?.videoId
        ? `https://img.youtube.com/vi/${yt.playerState.videoId}/default.jpg`
        : null,
    };
  }

  return null;
}

export function NavbarMusicDropdown() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const spotify = useSpotifyPlayback();
  const yt = useYouTubePlayback();
  const display = useMemo(() => computeDisplay(spotify, yt), [spotify.playerState, yt.playerState]);

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Derived playback state
  const isSpotifyPlaying = display?.source === "spotify" && !spotify.playerState?.paused;
  const isYtPlaying = display?.source === "youtube" && (yt.playerState?.isPlaying ?? false);
  const isPlaying = isSpotifyPlaying || isYtPlaying;

  const handlePlayPause = () => {
    if (display?.source === "spotify") {
      if (spotify.playerState?.paused) spotify.resume();
      else spotify.pause();
    } else if (display?.source === "youtube") {
      if (yt.playerState?.isPlaying) yt.pause();
      else yt.resume();
    }
  };

  const handlePrev = () => {
    if (display?.source === "spotify") spotify.prevTrack();
    else if (display?.source === "youtube") yt.prevTrack();
  };

  const handleNext = () => {
    if (display?.source === "spotify") spotify.nextTrack();
    else if (display?.source === "youtube") yt.nextTrack();
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Chip — toggles dropdown */}
      <NavbarNowPlaying
        active={!!display}
        title={display?.title ?? "Music"}
        subtitle={display?.subtitle ?? "Open Music"}
        artworkUrl={display?.art ?? null}
        onClick={() => setOpen((v) => !v)}
      />

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="absolute right-0 top-[calc(100%+8px)] z-[200] w-64 rounded-2xl overflow-hidden"
            style={{
              background: isDark ? "rgb(18,16,30)" : "rgb(248,246,255)",
              border: isDark
                ? "0.5px solid rgba(255,255,255,0.12)"
                : "0.5px solid rgba(83,74,183,0.20)",
              boxShadow: isDark
                ? "0 16px 48px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)"
                : "0 16px 48px rgba(83,74,183,0.10), 0 2px 8px rgba(83,74,183,0.06)",
            }}
          >
            {/* Artwork + track info */}
            <div className="p-3 pb-2">
              <div className="flex items-center gap-3">
                {/* Art */}
                <div className="relative w-12 h-12 shrink-0 rounded-xl overflow-hidden"
                  style={{ background: isDark ? "rgba(124,111,247,0.18)" : "rgba(83,74,183,0.14)" }}>
                  {display?.art ? (
                    <img
                      src={display.art}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ color: isDark ? "rgba(255,255,255,0.3)" : "rgba(83,74,183,0.4)" }}>
                        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "truncate text-[13px] font-semibold leading-tight",
                    isDark ? "text-white/90" : "text-gray-900"
                  )}>
                    {display?.title ?? "Nothing playing"}
                  </p>
                  {display?.subtitle && (
                    <p className="truncate text-[11px] mt-0.5"
                      style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(83,74,183,0.6)" }}>
                      {display.subtitle}
                    </p>
                  )}
                  {/* Source badge */}
                  {display && (
                    <span
                      className="inline-block mt-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                      style={{
                        background: display.source === "spotify"
                          ? "rgba(29,185,84,0.14)"
                          : isDark ? "rgba(124,111,247,0.2)" : "rgba(83,74,183,0.1)",
                        color: display.source === "spotify"
                          ? "#1DB954"
                          : isDark ? "#c4b5fd" : "#534AB7",
                        border: display.source === "spotify"
                          ? "1px solid rgba(29,185,84,0.28)"
                          : "1px solid hsl(var(--primary) / 0.22)",
                      }}
                    >
                      {display.source === "spotify" ? "Spotify" : "Free"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="px-3 py-2 flex items-center justify-center gap-1">
              <button
                onClick={handlePrev}
                disabled={!display}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all disabled:opacity-30"
                style={{
                  background: isDark ? "rgba(255,255,255,0.05)" : "rgba(83,74,183,0.06)",
                  color: isDark ? "rgba(255,255,255,0.55)" : "rgba(83,74,183,0.7)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = isDark
                    ? "rgba(255,255,255,0.1)" : "rgba(83,74,183,0.12)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = isDark
                    ? "rgba(255,255,255,0.05)" : "rgba(83,74,183,0.06)";
                }}
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handlePlayPause}
                disabled={!display}
                className="w-10 h-10 flex items-center justify-center rounded-xl transition-all disabled:opacity-30"
                style={{
                  background: isDark ? "rgba(124,111,247,0.22)" : "rgba(83,74,183,0.14)",
                  color: isDark ? "#c4b5fd" : "#534AB7",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = isDark
                    ? "rgba(124,111,247,0.32)" : "rgba(83,74,183,0.22)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = isDark
                    ? "rgba(124,111,247,0.22)" : "rgba(83,74,183,0.14)";
                }}
              >
                {isPlaying
                  ? <Pause className="w-4 h-4" />
                  : <Play className="w-4 h-4 translate-x-[1px]" />}
              </button>

              <button
                onClick={handleNext}
                disabled={!display}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all disabled:opacity-30"
                style={{
                  background: isDark ? "rgba(255,255,255,0.05)" : "rgba(83,74,183,0.06)",
                  color: isDark ? "rgba(255,255,255,0.55)" : "rgba(83,74,183,0.7)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = isDark
                    ? "rgba(255,255,255,0.1)" : "rgba(83,74,183,0.12)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = isDark
                    ? "rgba(255,255,255,0.05)" : "rgba(83,74,183,0.06)";
                }}
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Divider */}
            <div style={{
              height: "0.5px",
              margin: "0 12px",
              background: isDark ? "rgba(255,255,255,0.07)" : "rgba(83,74,183,0.1)",
            }} />

            {/* Go to Music page */}
            <button
              onClick={() => { setOpen(false); navigate("/spotify"); }}
              className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
              style={{ color: isDark ? "rgba(255,255,255,0.55)" : "rgba(83,74,183,0.7)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = isDark
                  ? "rgba(255,255,255,0.04)" : "rgba(83,74,183,0.05)";
                (e.currentTarget as HTMLElement).style.color = isDark
                  ? "rgba(255,255,255,0.8)" : "#534AB7";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = isDark
                  ? "rgba(255,255,255,0.55)" : "rgba(83,74,183,0.7)";
              }}
            >
              <span className="text-[12px] font-medium">Open Music page</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
