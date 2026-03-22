import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Moon, Sun, Maximize, Headphones } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useFocusScore } from "@/context/FocusScoreContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";


const ROUTE_META: Record<string, { title: string; crumb: string }> = {
  "/dashboard": { title: "Dashboard",  crumb: "FocusNest / Dashboard" },
  "/tasks":     { title: "Tasks",      crumb: "FocusNest / Tasks"     },
  "/sessions":  { title: "Sessions",   crumb: "FocusNest / Sessions"  },
  "/chat":      { title: "Finch AI",   crumb: "FocusNest / Finch AI"  },
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
      leftOsc.frequency.value  = 200;  // 200 Hz left
      rightOsc.frequency.value = 210;  // 210 Hz right → 10 Hz alpha beat
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

interface NavbarProps {
  minimal?: boolean;
}

const Navbar = ({ minimal }: NavbarProps) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { streak } = useFocusScore();
  const navigate = useNavigate();
  const { active: soundActive, toggle: toggleSound } = useBinauralBeat();

  return (
    <motion.header
      initial={{ y: -6, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="h-[3.5rem] flex items-center justify-between px-5 z-50 shrink-0"
      style={theme === "dark" ? {
        background: "hsl(240 22% 7% / 0.85)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        borderBottom: "0.5px solid rgba(124,58,237,0.15)",
      } : {
        background: "linear-gradient(135deg, hsl(258 76% 58% / 0.22) 0%, hsl(252 50% 92% / 0.92) 55%, hsl(230 40% 93% / 0.88) 100%)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderBottom: "1px solid transparent",
        backgroundClip: "padding-box",
        boxShadow: "0 1px 0 hsl(258 76% 58% / 0.18), 0 4px 24px hsl(258 76% 58% / 0.08)",
      }}
    >
      {/* Left — mobile-only wordmark (desktop has sidebar logo) */}
      <div className="flex items-center gap-3">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #7C3AED 0%, #9D5FF3 100%)",
              boxShadow: "0 2px 8px rgba(124,58,237,0.45)",
            }}
          >
            <span className="text-white font-bold text-xs">F</span>
          </div>
          <span className="font-bold text-foreground text-sm tracking-tight">
            Focus<span className="text-primary">Nest</span>
          </span>
        </Link>
      </div>

      {/* Right — minimal action cluster */}
      {!minimal && user && (
        <div className="flex items-center gap-1">
          {/* Binaural beats — subtle */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={toggleSound}
            title={soundActive ? "Stop focus beats" : "10 Hz alpha focus beats — use headphones"}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-500 ${
              soundActive
                ? "text-primary/80 bg-primary/10"
                : "text-muted-foreground/35 hover:text-muted-foreground/60"
            }`}
          >
            <Headphones className={`w-3.5 h-3.5 ${soundActive ? "animate-pulse" : ""}`} />
          </motion.button>

          {/* Hyperfocus shortcut */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate("/sessions")}
            title="Start focus session"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground/35 hover:text-muted-foreground/60 text-xs transition-all duration-500"
          >
            <Maximize className="w-3.5 h-3.5" />
          </motion.button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-all duration-300"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Streak — quiet */}
          {streak > 0 && (
            <div className="flex items-center gap-1 text-primary/50 text-xs px-1">
              <Flame className="w-3 h-3" />
              <span className="font-medium">{streak}</span>
            </div>
          )}

          {/* Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-primary/20 hover:ring-primary/40 transition-all duration-500 ml-1"
                style={{ background: "hsl(var(--primary) / 0.12)" }}
              >
                {user.profile_photo_url ? (
                  <img src={user.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="flex items-center justify-center w-full h-full text-primary/70 font-semibold text-xs">
                    {user.full_name[0]?.toUpperCase()}
                  </span>
                )}
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 border-border/30"
              style={{ background: "hsl(var(--card) / 0.95)", backdropFilter: "blur(16px)" }}
            >
              <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer text-sm text-foreground/80">
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/30" />
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-sm text-red-400/80 focus:text-red-400 focus:bg-red-500/10">
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
