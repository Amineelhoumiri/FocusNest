import { useState, useEffect } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useZenMode } from "@/context/ZenModeContext";
import Navbar from "./Navbar";
import AppSidebar from "./AppSidebar";
import CommandPalette from "@/components/CommandPalette";
import { cn } from "@/lib/utils";

const AppLayout = () => {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();
  const { zenMode } = useZenMode();
  const location = useLocation();
  const isLight = theme === "light";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close mobile drawer on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div
        className="flex h-dvh items-center justify-center bg-background text-muted-foreground text-sm"
        role="status"
        aria-live="polite"
      >
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const isChatPage = location.pathname === "/chat";
  const isFullHeightPage = isChatPage || location.pathname === "/sessions" || location.pathname === "/spotify";

  return (
    <div className="bg-background relative overflow-hidden" style={{ height: "100dvh" }}>

      {/* ── Global background ──────────────────────────────────────────────── */}

      {/* Photo — switches per theme */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: isLight ? "url('/bg-light.jpg')" : "url('/bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
          opacity: isLight ? 0.40 : 0.50,
          transition: "opacity 0.6s ease",
        }}
      />

      {/* Colour blend overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: isLight
            ? "linear-gradient(160deg, hsl(35 20% 90%/0.62) 0%, hsl(36 18% 88%/0.52) 50%, hsl(35 20% 90%/0.62) 100%)"
            : "linear-gradient(160deg, hsl(240 22% 7%/0.65) 0%, hsl(258 40% 8%/0.50) 50%, hsl(240 22% 7%/0.65) 100%)",
          transition: "background 0.6s ease",
        }}
      />

      {/* Dot grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--border)/0.5) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          opacity: isLight ? 0.18 : 0.2,
        }}
      />

      {/* Orb 1 — purple top-left */}
      <div aria-hidden="true" className="pointer-events-none fixed z-0" style={{ width: 700, height: 700, borderRadius: "50%", top: -180, left: -120, background: isLight ? "radial-gradient(circle,rgba(139,92,246,0.09) 0%,rgba(124,58,237,0.03) 45%,transparent 70%)" : "radial-gradient(circle,rgba(124,58,237,0.32) 0%,rgba(109,40,217,0.09) 45%,transparent 70%)", filter: "blur(8px)" }} />
      {/* Orb 2 — teal bottom-right */}
      <div aria-hidden="true" className="pointer-events-none fixed z-0" style={{ width: 600, height: 600, borderRadius: "50%", bottom: -100, right: -80, background: isLight ? "radial-gradient(circle,rgba(20,184,166,0.06) 0%,rgba(6,182,212,0.02) 45%,transparent 70%)" : "radial-gradient(circle,rgba(20,184,166,0.18) 0%,rgba(6,182,212,0.06) 45%,transparent 70%)", filter: "blur(8px)" }} />
      {/* Orb 3 — pink mid-right */}
      <div aria-hidden="true" className="pointer-events-none fixed z-0" style={{ width: 380, height: 380, borderRadius: "50%", top: "40%", right: "15%", background: isLight ? "radial-gradient(circle,rgba(236,72,153,0.04) 0%,transparent 65%)" : "radial-gradient(circle,rgba(236,72,153,0.09) 0%,transparent 65%)", filter: "blur(6px)" }} />

      <CommandPalette />

      {/* ── App shell: sidebar left, content column right ─────────────────── */}
      <div className="relative z-10 flex h-full">

        {/* Sidebar — hidden in zen mode */}
        {!zenMode && <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

        {/* Content column */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />

          <main className={cn("flex-1 min-w-0", isFullHeightPage ? "overflow-hidden" : "overflow-y-auto")}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className={
                  isFullHeightPage
                    ? "h-full"
                    : "px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6"
                }
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
