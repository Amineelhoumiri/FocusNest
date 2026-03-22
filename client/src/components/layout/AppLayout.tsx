import { Outlet, Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import Navbar from "./Navbar";
import AppSidebar from "./AppSidebar";

const AppLayout = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Ambient light orbs — intensity controlled by .dark CSS class */}
      <div
        aria-hidden="true"
        className="orb-1 fixed pointer-events-none z-0"
        style={{
          width: "900px", height: "900px",
          top: "-300px", left: "-200px",
          borderRadius: "50%",
          filter: "blur(80px)",
          animation: "orb-drift-1 30s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden="true"
        className="orb-2 fixed pointer-events-none z-0"
        style={{
          width: "700px", height: "700px",
          bottom: "-200px", right: "-150px",
          borderRadius: "50%",
          filter: "blur(80px)",
          animation: "orb-drift-2 38s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden="true"
        className="orb-3 fixed pointer-events-none z-0"
        style={{
          width: "500px", height: "500px",
          top: "-50px", right: "-100px",
          borderRadius: "50%",
          filter: "blur(70px)",
          animation: "orb-drift-1 44s ease-in-out infinite reverse",
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <main className="flex-1 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                className="h-full p-6 md:p-8"
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
