import {
  LayoutDashboard, CheckSquare, Timer, MessageCircle, Music,
  Settings as SettingsIcon, Crown, ShieldAlert, Flame,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useFocusScore } from "@/context/FocusScoreContext";
import { useTheme } from "@/context/ThemeContext";

// ─── Nav Groups ───────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/tasks",     icon: CheckSquare,     label: "Tasks"     },
      { to: "/sessions",  icon: Timer,           label: "Sessions"  },
    ],
  },
  {
    label: "tools",
    items: [
      { to: "/chat",    icon: MessageCircle, label: "Finch", ai: true },
      { to: "/spotify", icon: Music,         label: "Spotify"         },
      { to: "/pricing", icon: Crown,         label: "Plans"           },
    ],
  },
  {
    label: "account",
    items: [
      { to: "/settings", icon: SettingsIcon, label: "Settings" },
    ],
  },
];

// ─── Ember Ring — focus score ─────────────────────────────────────────────────

const EmberRing = ({ score, collapsed }: { score: number; collapsed: boolean }) => {
  const size = 34;
  const stroke = 2;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const progress = Math.min((score % 500) / 500, 1);
  const dash = circ * progress;
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        {!prefersReducedMotion && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{ boxShadow: ["0 0 0 0 rgba(124,58,237,0.35)", "0 0 0 5px rgba(124,58,237,0)", "0 0 0 0 rgba(124,58,237,0)"] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--primary) / 0.1)" strokeWidth={stroke} />
          <circle
            cx={size/2} cy={size/2} r={r}
            fill="none"
            stroke="hsl(var(--primary) / 0.75)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[8px] font-medium text-primary/70 leading-none tracking-tight">
            {score > 999 ? "∞" : score}
          </span>
        </div>
      </div>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col leading-tight"
          >
            <span className="text-[10px] font-medium text-primary/80 tracking-wide">Focus Score</span>
            <span className="text-[11px] text-muted-foreground/60">{score} pts</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const AppSidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { score, streak } = useFocusScore();
  const { theme } = useTheme();

  const isActive = (to: string) => {
    if (to === "/tasks") return location.pathname.startsWith("/tasks");
    return location.pathname === to;
  };

  return (
    <aside
      className="hidden md:flex w-[210px] h-[calc(100vh-3.75rem)] flex-col overflow-hidden shrink-0"
      style={{
        borderRight: "0.5px solid hsl(var(--border) / 0.5)",
        background: "hsl(var(--sidebar-background) / 0.6)",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* ── Navigation ── */}
      <nav className="flex flex-col flex-1 overflow-y-auto pt-3 pb-4" style={{ gap: "2px" }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-5" : ""}>
            {group.label && (
              <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/50 font-medium mb-2 px-5">
                {group.label}
              </p>
            )}

            {group.items.map((link) => {
              const active = isActive(link.to);
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  activeClassName=""
                  className={`
                    relative flex items-center gap-3 mx-2 px-3 rounded-xl text-sm
                    transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                    min-h-[40px] overflow-hidden
                    ${active
                      ? "text-white"
                      : "text-foreground/65 hover:text-foreground/85"
                    }
                  `}
                  style={active ? {
                    background: "hsl(var(--primary))",
                    boxShadow: "0 2px 12px hsl(var(--primary) / 0.35)",
                  } : {}}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = theme === "dark" ? "hsl(var(--primary) / 0.06)" : "rgba(124,58,237,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = "";
                  }}
                >
                  {active && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: "hsl(var(--primary))" }}
                      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                    />
                  )}

                  <link.icon
                    style={{ width: "16px", height: "16px", flexShrink: 0, position: "relative", zIndex: 1 }}
                    className={
                      active
                        ? "text-white/90"
                        : link.ai
                        ? "text-ai-purple/60"
                        : "text-foreground/50"
                    }
                  />

                  <span style={{ position: "relative", zIndex: 1 }} className={`whitespace-nowrap font-normal tracking-wide text-[13px] ${link.ai && !active ? "text-ai-purple/70" : ""}`}>
                    {link.label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        ))}

        {/* Admin */}
        {user?.is_admin && (
          <div className="mt-3">
            <NavLink
              to="/admin"
              activeClassName=""
              className={`relative flex items-center gap-3 mx-2 px-3 rounded-xl text-[13px] transition-all duration-300 min-h-[40px]
                ${location.pathname === "/admin"
                  ? "text-primary/70 bg-primary/5"
                  : "text-primary/35 hover:text-primary/60"
                }`}
            >
              <ShieldAlert style={{ width: "16px", height: "16px", flexShrink: 0 }} />
              <span className="whitespace-nowrap">Admin</span>
            </NavLink>
          </div>
        )}
      </nav>

      {/* ── Footer — score + streak ── */}
      <div
        className="px-3 py-4 flex flex-col gap-3"
        style={{ borderTop: "0.5px solid hsl(var(--border) / 0.3)" }}
      >
        <EmberRing score={score} collapsed={false} />

        {streak > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-foreground/50">
            <Flame className="w-3 h-3 text-primary/60" />
            <span>{streak} day{streak !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
