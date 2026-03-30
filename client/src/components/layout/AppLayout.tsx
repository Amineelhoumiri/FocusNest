import { Outlet, Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import Navbar from "./Navbar";
import AppSidebar from "./AppSidebar";
import CommandPalette from "@/components/CommandPalette";

const AppLayout = () => {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const isLight = theme === "light";

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col relative">

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
          opacity: isLight ? 0.55 : 0.50,
          transition: "opacity 0.6s ease",
        }}
      />

      {/* Colour blend overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: isLight
            ? "linear-gradient(160deg, hsl(252 30% 94%/0.60) 0%, hsl(258 40% 88%/0.40) 50%, hsl(252 30% 94%/0.55) 100%)"
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
          opacity: isLight ? 0.5 : 0.2,
        }}
      />

      {/* Orb 1 — purple top-left */}
      <div aria-hidden="true" className="pointer-events-none fixed z-0" style={{ width: 700, height: 700, borderRadius: "50%", top: -180, left: -120, background: isLight ? "radial-gradient(circle,rgba(139,92,246,0.22) 0%,rgba(124,58,237,0.08) 45%,transparent 70%)" : "radial-gradient(circle,rgba(124,58,237,0.32) 0%,rgba(109,40,217,0.09) 45%,transparent 70%)", filter: "blur(8px)" }} />
      {/* Orb 2 — teal bottom-right */}
      <div aria-hidden="true" className="pointer-events-none fixed z-0" style={{ width: 600, height: 600, borderRadius: "50%", bottom: -100, right: -80, background: isLight ? "radial-gradient(circle,rgba(20,184,166,0.15) 0%,rgba(6,182,212,0.06) 45%,transparent 70%)" : "radial-gradient(circle,rgba(20,184,166,0.18) 0%,rgba(6,182,212,0.06) 45%,transparent 70%)", filter: "blur(8px)" }} />
      {/* Orb 3 — pink mid-right */}
      <div aria-hidden="true" className="pointer-events-none fixed z-0" style={{ width: 380, height: 380, borderRadius: "50%", top: "40%", right: "15%", background: isLight ? "radial-gradient(circle,rgba(236,72,153,0.10) 0%,transparent 65%)" : "radial-gradient(circle,rgba(236,72,153,0.09) 0%,transparent 65%)", filter: "blur(6px)" }} />

      <CommandPalette />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        <div className="flex flex-1">
          <AppSidebar />

          <main className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="p-6 md:p-8"
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
