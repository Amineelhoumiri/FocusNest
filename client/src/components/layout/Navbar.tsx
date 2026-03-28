import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, Headphones, Play, Pause, SkipBack, SkipForward, Music2 } from "lucide-react";
import { IconSettings } from "@tabler/icons-react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSpotifyPlayback } from "@/context/SpotifyPlaybackContext";

// ─── Route Meta ───────────────────────────────────────────────────────────────

const ROUTE_META: Record<string, { title: string; crumb: string }> = {
  "/dashboard": { title: "Dashboard",  crumb: "FocusNest / Dashboard" },
  "/tasks":     { title: "Tasks",      crumb: "FocusNest / Tasks"     },
  "/sessions":  { title: "Sessions",   crumb: "FocusNest / Sessions"  },
  "/chat":      { title: "Finch",      crumb: "FocusNest / Finch"     },
  "/spotify":   { title: "Spotify",    crumb: "FocusNest / Spotify"   },
  "/pricing":   { title: "Plans",      crumb: "FocusNest / Plans"     },
  "/settings":  { title: "Settings",   crumb: "FocusNest / Settings"  },
  "/profile":   { title: "Profile",    crumb: "FocusNest / Profile"   },
  "/admin":     { title: "Admin",      crumb: "FocusNest / Admin"     },
};

function useRouteMeta() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/tasks/")) return { title: "Task Board", crumb: "FocusNest / Tasks / Board" };
  return ROUTE_META[pathname] ?? { title: "FocusNest", crumb: "FocusNest" };
}

// ─── Binaural Beat Hook ────────────────────────────────────────────────────────

function useBinauralBeat() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [active, setActive] = useState(false);
  const toggle = () => {
    if (active) {
      ctxRef.current?.close();
      ctxRef.current = null;
      setActive(false);
    } else {
      const ctx = new AudioContext();
      const leftOsc  = ctx.createOscillator();
      const rightOsc = ctx.createOscillator();
      const gainL    = ctx.createGain();
      const gainR    = ctx.createGain();
      const merger   = ctx.createChannelMerger(2);
      leftOsc.frequency.value  = 200;
      rightOsc.frequency.value = 210;
      gainL.gain.value = 0.06;
      gainR.gain.value = 0.06;
      leftOsc.connect(gainL);
      rightOsc.connect(gainR);
      gainL.connect(merger, 0, 0);
      gainR.connect(merger, 0, 1);
      merger.connect(ctx.destination);
      leftOsc.start();
      rightOsc.start();
      ctxRef.current = ctx;
      setActive(true);
    }
  };
  return { active, toggle };
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

interface NavbarProps {
  minimal?: boolean;
}

const Navbar = ({ minimal }: NavbarProps) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { active: soundActive, toggle: toggleSound } = useBinauralBeat();
  const spotify = useSpotifyPlayback();
  const { title } = useRouteMeta();
  const [spotifyConnected, setSpotifyConnected] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch("/api/spotify/status", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { connected?: boolean }) => setSpotifyConnected(!!d.connected))
      .catch(() => setSpotifyConnected(false));
  }, [user, pathname]);
  // Clock state
  const [time, setTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // User initials
  const getInitials = () => {
    if (!user?.full_name) return "U";
    const parts = user.full_name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const isDark = theme === "dark";

  const spotifyTrack = spotify.playerState?.track_window?.current_track;
  const spotifyPlaying = Boolean(spotify.playerState && !spotify.playerState.paused);

  return (
    <motion.header
      initial={{ y: -6, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="h-12 flex items-center px-5 z-50 shrink-0"
      style={{
        gap: "12px",
        background: isDark
          ? "rgba(13,11,24,0.55)"
          : "rgba(240,235,255,0.65)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: isDark
          ? "0.5px solid rgba(255,255,255,0.06)"
          : "0.5px solid rgba(83,74,183,0.10)",
      }}
    >
      {/* Left — Page title */}
      <div
        className="flex-1"
        style={{
          fontSize: "15px",
          fontWeight: 600,
          color: isDark ? "rgba(255,255,255,0.88)" : "#1a1830",
        }}
      >
        {title === "Finch AI" || title === "Finch" ? (
          <span style={{ fontSize: "15px", fontWeight: 800, letterSpacing: "-0.02em", color: isDark ? "rgba(255,255,255,0.92)" : "#1a1830" }}>
            Finch
            <span style={{ color: isDark ? "#a78bfa" : "#7c3aed" }}>.</span>
          </span>
        ) : (
          title
        )}
      </div>

      {/* Right — action cluster */}
      {!minimal && user && (
        <div className="flex items-center" style={{ gap: "8px" }}>
          {/* Music & focus sounds — popover (sm+) */}
          <Popover>
            <PopoverTrigger asChild>
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                title="Music and focus sounds"
                className="hidden sm:flex items-center justify-center"
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "7px",
                  cursor: "pointer",
                  background: soundActive || spotifyPlaying
                    ? "rgba(124,111,247,0.18)"
                    : isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(83,74,183,0.08)",
                  color: soundActive || spotifyPlaying
                    ? "#7c6ff7"
                    : isDark
                      ? "rgba(255,255,255,0.45)"
                      : "rgba(83,74,183,0.6)",
                  border: "none",
                }}
              >
                <Headphones style={{ width: "14px", height: "14px" }} />
              </motion.button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[min(100vw-2rem,20rem)] rounded-xl border-border/30 p-0 shadow-xl overflow-hidden"
              style={{
                background: isDark ? "hsl(240 22% 9% / 0.96)" : "hsl(var(--card) / 0.96)",
                backdropFilter: "blur(16px)",
              }}
            >
              <div className="px-3 pt-3 pb-2 border-b border-border/20">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Music
                </p>
                <p className="text-xs text-muted-foreground/80 mt-0.5 leading-snug">
                  Spotify (curated focus only) or free sounds on the Music page.
                </p>
              </div>

              <div className="p-3 space-y-3">
                {/* Spotify mini transport */}
                {spotifyConnected && !spotify.error && !spotify.ready ? (
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Starting Spotify player… Open the Music page if this hangs.
                  </p>
                ) : spotifyConnected && !spotify.error && spotify.ready ? (
                  <div className="rounded-lg border border-border/25 bg-muted/30 px-2.5 py-2 space-y-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">
                        {spotifyTrack?.name ?? "Nothing playing"}
                      </p>
                      {spotifyTrack?.artists?.[0] && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {spotifyTrack.artists.map((a) => a.name).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => spotify.prevTrack()}
                        className="h-8 w-8 rounded-full flex items-center justify-center text-foreground/60 hover:bg-muted/80"
                        aria-label="Previous track"
                      >
                        <SkipBack className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => (spotifyPlaying ? spotify.pause() : spotify.resume())}
                        className="h-9 w-9 rounded-full flex items-center justify-center text-white bg-[#1DB954] hover:opacity-90"
                        aria-label={spotifyPlaying ? "Pause" : "Play"}
                      >
                        {spotifyPlaying ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => spotify.nextTrack()}
                        className="h-8 w-8 rounded-full flex items-center justify-center text-foreground/60 hover:bg-muted/80"
                        aria-label="Next track"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : spotifyConnected && spotify.error ? (
                  <p className="text-[11px] text-destructive/90 leading-snug">{spotify.error}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Connect Spotify Premium on the Music page to control playback here.
                  </p>
                )}

                <Link
                  to="/spotify"
                  className="flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium bg-primary/12 text-primary hover:bg-primary/18 transition-colors"
                >
                  <Music2 className="w-3.5 h-3.5" />
                  Open Focus Sounds
                </Link>

                <div className="rounded-lg border border-border/25 bg-muted/20 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-medium text-foreground">Binaural focus tones</p>
                      <p className="text-[10px] text-muted-foreground">10 Hz · use headphones</p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleSound}
                      className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-md border transition-colors ${
                        soundActive
                          ? "border-primary/40 bg-primary/15 text-primary"
                          : "border-border/40 text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      {soundActive ? "Stop" : "Start"}
                    </button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Theme toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            onClick={toggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="flex items-center justify-center"
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "7px",
              cursor: "pointer",
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(83,74,183,0.08)",
              color: isDark ? "rgba(255,255,255,0.45)" : "rgba(83,74,183,0.6)",
              border: "none",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = isDark
                ? "rgba(255,255,255,0.11)"
                : "rgba(83,74,183,0.15)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(83,74,183,0.08)";
            }}
          >
            {isDark
              ? <Sun style={{ width: "14px", height: "14px" }} />
              : <Moon style={{ width: "14px", height: "14px" }} />}
          </motion.button>

          {/* Clock pill */}
          <div
            className="flex items-center"
            style={{
              padding: "4px 10px",
              borderRadius: "20px",
              background: isDark ? "rgba(255,255,255,0.07)" : "rgba(83,74,183,0.10)",
              color: isDark ? "rgba(255,255,255,0.50)" : "#534AB7",
              gap: "6px",
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#7c6ff7",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "13px",
                fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {time}
            </span>
          </div>

          {/* Settings icon button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => navigate("/settings")}
            title="Settings"
            className="flex items-center justify-center"
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              cursor: "pointer",
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(83,74,183,0.08)",
              color: isDark ? "rgba(255,255,255,0.45)" : "rgba(83,74,183,0.6)",
              border: "none",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = isDark
                ? "rgba(255,255,255,0.11)"
                : "rgba(83,74,183,0.15)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(83,74,183,0.08)";
            }}
          >
            <IconSettings size={15} stroke={1.4} />
          </motion.button>

          {/* Avatar with dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                className="flex items-center justify-center overflow-hidden"
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  background: "#7c6ff7",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {user.profile_photo_url ? (
                  <img
                    src={user.profile_photo_url}
                    alt="Profile"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span>{getInitials()}</span>
                )}
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 rounded-xl border-border/20 shadow-xl"
              style={{
                background: isDark
                  ? "hsl(240 22% 9% / 0.92)"
                  : "hsl(var(--card) / 0.92)",
                backdropFilter: "blur(20px)",
              }}
            >
              <DropdownMenuItem
                onClick={() => navigate("/profile")}
                className="cursor-pointer text-sm text-foreground/80 rounded-lg focus:bg-primary/8 focus:text-primary"
              >
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/20" />
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-sm text-red-400/80 rounded-lg focus:text-red-400 focus:bg-red-500/10"
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </motion.header>
  );
};

export default Navbar;
