import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, Menu, Maximize2, Minimize2 } from "lucide-react";
import { IconSettings } from "@tabler/icons-react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import { NavbarMusicDropdown } from "@/components/ui/navbar-music-dropdown";
import { useZenMode } from "@/context/ZenModeContext";
import {
  MUSIC_SOURCE_CHANGED_EVENT,
  MUSIC_SOURCE_STORAGE_KEY,
  readMusicPageSource,
  type MusicPageSource,
} from "@/lib/music-source";

// ─── Route Meta ───────────────────────────────────────────────────────────────

const ROUTE_META: Record<string, { title: string; crumb: string }> = {
  "/dashboard": { title: "Dashboard",  crumb: "FocusNest / Dashboard" },
  "/tasks":     { title: "Tasks",      crumb: "FocusNest / Tasks"     },
  "/sessions":  { title: "Sessions",   crumb: "FocusNest / Sessions"  },
  "/chat":      { title: "Finch",      crumb: "FocusNest / Finch"     },
  "/spotify":   { title: "Music",      crumb: "FocusNest / Music"     },
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

function useMusicPageSourceChip() {
  const { pathname } = useLocation();
  const [source, setSource] = useState<MusicPageSource>(() =>
    pathname === "/spotify" ? readMusicPageSource() : "free"
  );

  useEffect(() => {
    if (pathname !== "/spotify") return;
    const sync = () => setSource(readMusicPageSource());
    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === MUSIC_SOURCE_STORAGE_KEY || e.key === null) sync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(MUSIC_SOURCE_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(MUSIC_SOURCE_CHANGED_EVENT, sync);
    };
  }, [pathname]);

  return pathname === "/spotify" ? source : null;
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

interface NavbarProps {
  minimal?: boolean;
  onMenuClick?: () => void;
}

const Navbar = ({ minimal, onMenuClick }: NavbarProps) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { title } = useRouteMeta();
  const musicPageSource = useMusicPageSourceChip();
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
  const { zenMode, toggleZenMode } = useZenMode();

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
      {/* Hamburger — opens nav drawer on mobile only; hidden in zen mode and on md+ screens */}
      {!minimal && !zenMode && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex items-center justify-center shrink-0"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: isDark ? "rgba(255,255,255,0.06)" : "rgba(83,74,183,0.08)",
            color: isDark ? "rgba(255,255,255,0.55)" : "rgba(83,74,183,0.7)",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Menu style={{ width: "18px", height: "18px" }} />
        </motion.button>
      )}

      {/* Left — Page title (min-w-0 so flex row can shrink; avoids pushing profile off-screen on mobile) */}
      <div
        className="min-w-0 flex-1 truncate"
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
        ) : musicPageSource != null ? (
          <span className="inline-flex min-w-0 max-w-[min(100%,520px)] items-center gap-2">
            <span className="truncate">{title}</span>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
              style={{
                background:
                  musicPageSource === "spotify"
                    ? "rgba(29,185,84,0.14)"
                    : isDark
                      ? "rgba(124,111,247,0.2)"
                      : "rgba(83,74,183,0.1)",
                color:
                  musicPageSource === "spotify"
                    ? "#1DB954"
                    : isDark
                      ? "#c4b5fd"
                      : "#534AB7",
                border:
                  musicPageSource === "spotify"
                    ? "1px solid rgba(29,185,84,0.28)"
                    : "1px solid hsl(var(--primary) / 0.22)",
              }}
            >
              {musicPageSource === "spotify" ? "Spotify" : "Free"}
            </span>
          </span>
        ) : (
          title
        )}
      </div>

      {/* Right — action cluster */}
      {!minimal && user && (
        <div className="flex shrink-0 items-center" style={{ gap: "8px" }}>
          {zenMode && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={toggleZenMode}
              title="Exit Zen mode"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 12px", borderRadius: "20px",
                fontSize: "12px", fontWeight: 600,
                background: "rgba(124,111,247,0.15)",
                color: "#7c6ff7", border: "1px solid rgba(124,111,247,0.25)", cursor: "pointer",
              }}
            >
              <Minimize2 style={{ width: "12px", height: "12px" }} />
              Exit Zen
            </motion.button>
          )}
          {!zenMode && <>
          {/* Music chip is wide — hide below sm so profile & sign-out stay visible */}
          <div className="hidden sm:block">
            <NavbarMusicDropdown />
          </div>

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

          {/* Clock pill — desktop only */}
          <div
            className="hidden sm:flex items-center"
            style={{
              padding: "4px 10px",
              borderRadius: "20px",
              background: isDark ? "rgba(255,255,255,0.07)" : "rgba(83,74,183,0.10)",
              color: isDark ? "rgba(255,255,255,0.50)" : "#534AB7",
              gap: "6px",
            }}
          >
            <div
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

          {/* Zen mode toggle — hide on xs to save navbar space */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            onClick={toggleZenMode}
            title="Enter Zen mode — distraction-free focus"
            className="hidden sm:flex items-center justify-center"
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "7px",
              cursor: "pointer",
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(83,74,183,0.08)",
              color: isDark ? "rgba(255,255,255,0.45)" : "rgba(83,74,183,0.6)",
              border: "none",
            }}
          >
            <Maximize2 style={{ width: "13px", height: "13px" }} />
          </motion.button>

          {/* Settings icon button — desktop only */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => navigate("/settings")}
            title="Settings"
            className="hidden sm:flex items-center justify-center"
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

          {/* Profile dropdown */}
          <ProfileDropdown
            variant="compact"
            data={{
              name: user.full_name,
              email: user.email,
              avatarUrl: user.profile_photo_url ?? null,
            }}
            onLogout={async () => {
              await logout();
              navigate("/login");
            }}
          />
          </>}
        </div>
      )}
    </motion.header>
  );
};

export default Navbar;
