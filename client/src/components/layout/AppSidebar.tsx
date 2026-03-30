import {
  IconLayoutDashboard,
  IconChecklist,
  IconClock,
  IconMessageCircle,
  IconMusic,
  IconShieldExclamation,
} from "@tabler/icons-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useFocusScore } from "@/context/FocusScoreContext";
import { useTheme } from "@/context/ThemeContext";
import { useState } from "react";

// ─── Nav Groups ───────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { to: "/dashboard", icon: IconLayoutDashboard, label: "Dashboard" },
      { to: "/tasks",     icon: IconChecklist,       label: "Tasks"     },
      { to: "/sessions",  icon: IconClock,            label: "Sessions"  },
    ],
  },
  {
    label: "tools",
    items: [
      { to: "/chat",    icon: IconMessageCircle, label: "Finch", ai: true },
      { to: "/spotify", icon: IconMusic,         label: "Music"           },
    ],
  },
];

// ─── Nav Item ─────────────────────────────────────────────────────────────────

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  ai?: boolean;
  active: boolean;
  dark: boolean;
}

const NavItem = ({ to, icon: Icon, label, active, dark }: NavItemProps) => {
  const [hovered, setHovered] = useState(false);

  const baseColor = dark ? "rgba(203,213,225,0.9)" : "rgba(83,74,183,0.65)";
  const activeColor = dark ? "#ffffff" : "#534AB7";
  const hoverBg = dark ? "rgba(255,255,255,0.06)" : "rgba(83,74,183,0.06)";
  const activeBg = dark ? "rgba(124,111,247,0.18)" : "rgba(83,74,183,0.13)";

  const itemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "7px 8px",
    borderRadius: "8px",
    fontSize: "13px",
    cursor: "pointer",
    transition: "background 0.12s",
    color: active ? activeColor : baseColor,
    background: active ? activeBg : hovered ? hoverBg : "transparent",
    fontWeight: active ? 500 : undefined,
    textDecoration: "none",
  };

  return (
    <NavLink
      to={to}
      activeClassName=""
      style={itemStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label === "Finch" ? (
        <svg width="16" height="16" viewBox="0 0 36 36" fill="none"
             style={{ width: 16, height: 16, flexShrink: 0 }}>
          <path d="M18 6C18 6 26 10 27 17C28 22 24 27 18 28C12 27 8 22 9 17C10 10 18 6 18 6Z"
            fill="currentColor" opacity="0.9" />
          <path d="M18 6C18 6 26 10 27 17L18 17Z"
            fill="currentColor" opacity="0.6" />
          <path d="M27 10C27 10 32 9 33 13C31 13 29 12 27 10Z"
            fill="currentColor" opacity="0.7" />
          <circle cx="22" cy="12" r="2" fill="white" />
          <circle cx="22.7" cy="11.7" r="0.75" fill="rgba(0,0,0,0.5)" />
        </svg>
      ) : (
        <Icon
          size={15}
          stroke={1.4}
          style={{ flexShrink: 0 }}
        />
      )}
      <span style={{ whiteSpace: "nowrap" }}>{label}</span>
    </NavLink>
  );
};

// ─── Admin Nav Item ────────────────────────────────────────────────────────────

const AdminNavItem = ({ active, dark }: { active: boolean; dark: boolean }) => {
  const [hovered, setHovered] = useState(false);

  const baseColor = dark ? "rgba(203,213,225,0.9)" : "rgba(83,74,183,0.65)";
  const activeColor = dark ? "#ffffff" : "#534AB7";
  const hoverBg = dark ? "rgba(255,255,255,0.05)" : "rgba(83,74,183,0.06)";
  const activeBg = dark ? "rgba(124,111,247,0.18)" : "rgba(83,74,183,0.13)";

  const itemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "7px 8px",
    borderRadius: "8px",
    fontSize: "13px",
    cursor: "pointer",
    transition: "background 0.12s",
    color: active ? activeColor : baseColor,
    background: active ? activeBg : hovered ? hoverBg : "transparent",
    fontWeight: active ? 500 : undefined,
    textDecoration: "none",
  };

  return (
    <NavLink
      to="/admin"
      activeClassName=""
      style={itemStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <IconShieldExclamation size={15} stroke={1.4} style={{ flexShrink: 0 }} />
      <span style={{ whiteSpace: "nowrap" }}>Admin</span>
    </NavLink>
  );
};

// ─── Focus Score Widget ────────────────────────────────────────────────────────

const FocusScoreWidget = ({
  score,
  streak,
  dark,
}: {
  score: number;
  streak: number;
  dark: boolean;
}) => {
  const containerStyle: React.CSSProperties = {
    borderRadius: "10px",
    padding: "10px 10px",
    marginBottom: "8px",
    background: dark ? "rgba(124,111,247,0.08)" : "rgba(83,74,183,0.08)",
    border: dark
      ? "0.5px solid rgba(124,111,247,0.15)"
      : "0.5px solid rgba(83,74,183,0.15)",
  };

  const labelColor = dark ? "rgba(148,163,184,1)" : "rgba(83,74,183,0.65)";
  const subtitleColor = dark ? "rgba(148,163,184,1)" : "rgba(83,74,183,0.65)";

  const subtitle =
    score < 500
      ? `Next: ${500 - (score % 500)} pts`
      : streak > 0
      ? `${streak} day streak`
      : "Keep going!";

  return (
    <div style={containerStyle}>
      <div
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: labelColor,
          marginBottom: "2px",
        }}
      >
        FOCUS SCORE
      </div>
      <div
        style={{
          fontSize: "18px",
          fontWeight: 600,
          color: "#7c6ff7",
          lineHeight: 1.2,
        }}
      >
        {score} pts
      </div>
      <div
        style={{
          fontSize: "11px",
          color: subtitleColor,
          marginTop: "2px",
        }}
      >
        {subtitle}
      </div>
    </div>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const AppSidebar = ({ overlay = false }: { overlay?: boolean }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { score, streak } = useFocusScore();
  const { theme } = useTheme();

  const dark = theme === "dark";

  const isActive = (to: string) => {
    if (to === "/tasks") return location.pathname.startsWith("/tasks");
    return location.pathname === to;
  };

  const sidebarStyle: React.CSSProperties = {
    width: "158px",
    height: "calc(100vh - 3rem)",
    position: "sticky",
    top: "3rem",
    display: "flex",
    flexDirection: "column",
    padding: "16px 10px",
    gap: "2px",
    flexShrink: 0,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    background: dark
      ? "rgba(13,11,24,0.72)"
      : "rgba(240,235,255,0.78)",
    borderRight: overlay
      ? "none"
      : dark
      ? "0.5px solid rgba(255,255,255,0.06)"
      : "0.5px solid rgba(83,74,183,0.12)",
    boxShadow: overlay ? "8px 0 32px rgba(0,0,0,0.18)" : "none",
    overflowY: "auto",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "10px",
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    padding: "8px 8px 4px",
    marginTop: "6px",
    color: dark ? "rgba(148,163,184,1)" : "rgba(83,74,183,0.55)",
  };

  const logoTextStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: 600,
    color: dark ? "rgba(255,255,255,0.92)" : "#1a1830",
  };

  return (
    <aside style={sidebarStyle}>
      {/* ── Logo area ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "8px",
          marginBottom: "14px",
          padding: "0 2px",
        }}
      >
        <div
          style={{
            width: "26px",
            height: "26px",
            borderRadius: "7px",
            background: "#7c6ff7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "13px",
              lineHeight: 1,
            }}
          >
            F
          </span>
        </div>
        <span style={logoTextStyle}>FocusNest</span>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && (
              <div style={{
                height: "0.5px",
                margin: "6px 8px 4px",
                background: dark ? "rgba(255,255,255,0.06)" : "rgba(83,74,183,0.10)",
              }} />
            )}
            {group.label && (
              <div style={labelStyle}>{group.label}</div>
            )}
            {group.items.map((link) => (
              <NavItem
                key={link.to}
                to={link.to}
                icon={link.icon}
                label={link.label}
                ai={link.ai}
                active={isActive(link.to)}
                dark={dark}
              />
            ))}
          </div>
        ))}

        {/* Admin */}
        {user?.is_admin && (
          <AdminNavItem
            active={location.pathname === "/admin"}
            dark={dark}
          />
        )}
      </nav>

      {/* ── Focus Score widget (pushed to bottom) ── */}
      <div style={{ marginTop: "auto" }}>
        <FocusScoreWidget score={score} streak={streak} dark={dark} />
      </div>
    </aside>
  );
};

export default AppSidebar;
