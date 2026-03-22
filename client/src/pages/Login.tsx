import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useSpring } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

// ── Face Component ──
const CursorFace = ({ isPasswordFocused, isHoveringSubmit }: { isPasswordFocused: boolean, isHoveringSubmit: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const springConfig = { stiffness: 150, damping: 15 };

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [faceCenter, setFaceCenter] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const updateCenter = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setFaceCenter({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", updateCenter);
    window.addEventListener("scroll", updateCenter);

    setTimeout(updateCenter, 100);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", updateCenter);
      window.removeEventListener("scroll", updateCenter);
    };
  }, []);

  const dx = mousePos.x - faceCenter.x;
  const dy = mousePos.y - faceCenter.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const maxPupilDist = 4;
  const pupilX = dist > 0 ? (dx / dist) * Math.min(dist / 20, maxPupilDist) : 0;
  const pupilY = dist > 0 ? (dy / dist) * Math.min(dist / 20, maxPupilDist) : 0;

  const tiltX = dist > 0 ? (dy / dist) * Math.min(dist / 50, 8) : 0;
  const tiltY = dist > 0 ? (-dx / dist) * Math.min(dist / 50, 8) : 0;

  const springPupilX = useSpring(pupilX, springConfig);
  const springPupilY = useSpring(pupilY, springConfig);
  const springTiltX = useSpring(tiltX, springConfig);
  const springTiltY = useSpring(tiltY, springConfig);

  return (
    <motion.div
      ref={containerRef}
      className="w-20 h-20 rounded-full flex items-center justify-center relative mx-auto mb-4 overflow-hidden shadow-lg border border-primary/30"
      style={{
        background: "radial-gradient(circle at 30% 30%, #fbbf24, #d97706)",
        rotateX: springTiltX,
        rotateY: springTiltY,
        transformStyle: "preserve-3d"
      }}
    >
      <div className="flex gap-4 absolute top-6 flex-row">
        <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center overflow-hidden relative">
          {isPasswordFocused ? (
            <div className="w-full h-[2px] bg-[#0A0A0F] absolute top-1/2 -translate-y-1/2" />
          ) : (
            <motion.div
              className="w-2 h-2 bg-[#0A0A0F] rounded-full"
              style={{ x: springPupilX, y: springPupilY }}
            />
          )}
        </div>

        <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center overflow-hidden relative">
          {isPasswordFocused ? (
            <div className="w-full h-[2px] bg-[#0A0A0F] absolute top-1/2 -translate-y-1/2" />
          ) : (
            <motion.div
              className="w-2 h-2 bg-[#0A0A0F] rounded-full"
              style={{ x: springPupilX, y: springPupilY }}
            />
          )}
        </div>
      </div>

      <motion.div
        className="w-4 h-1 bg-[#92400e] rounded-full absolute left-[12px] top-[14px]"
        animate={{ y: isPasswordFocused || isHoveringSubmit ? -3 : 0, rotate: isPasswordFocused ? 5 : 0 }}
      />
      <motion.div
        className="w-4 h-1 bg-[#92400e] rounded-full absolute right-[12px] top-[14px]"
        animate={{ y: isPasswordFocused || isHoveringSubmit ? -3 : 0, rotate: isPasswordFocused ? -5 : 0 }}
      />

      <motion.div
        className="absolute bottom-5 bg-[#0A0A0F]"
        initial={false}
        animate={isHoveringSubmit
          ? { width: 16, height: 16, borderRadius: "0px 0px 16px 16px" }
          : { width: 12, height: 4, borderRadius: "4px" }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={isHoveringSubmit ? { top: "auto" } : {}}
      />
    </motion.div>
  );
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);

  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isHoveringSubmit, setIsHoveringSubmit] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSocialLogin = async (provider: "google" | "apple") => {
    const result = await authClient.signIn.social({
      provider,
      callbackURL: "/dashboard",
    });
    if (result?.error) {
      setError(result.error.message || `${provider} sign-in failed`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields.");
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      return;
    }
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch {
      setError("Invalid credentials");
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="fixed pointer-events-none z-0"
        style={{
          width: "600px",
          height: "600px",
          top: "-150px",
          left: "-150px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)",
          filter: "blur(90px)",
          animation: "orb-drift-1 20s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden="true"
        className="fixed pointer-events-none z-0"
        style={{
          width: "500px",
          height: "500px",
          bottom: "-150px",
          right: "-100px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
          filter: "blur(90px)",
          animation: "orb-drift-2 25s ease-in-out infinite",
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0, x: shaking ? [0, -8, 8, -4, 4, 0] : 0 }}
        transition={{ duration: shaking ? 0.4 : 0.4, ease: "easeOut" }}
        className="w-full max-w-[440px] rounded-[24px] relative z-10"
        style={{
          background: "hsl(var(--card) / 0.85)",
          backdropFilter: "blur(24px) saturate(160%)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
          border: "1px solid rgba(124,58,237,0.2)",
          boxShadow: "0 0 60px rgba(124,58,237,0.08), 0 24px 48px rgba(0,0,0,0.4)",
          padding: "48px",
        }}
      >
        <CursorFace isPasswordFocused={isPasswordFocused} isHoveringSubmit={isHoveringSubmit} />

        <div className="flex flex-col items-center justify-center mb-8">
          <h1 className="text-xl font-semibold text-foreground text-center mb-1">Welcome back</h1>
          <p className="text-muted-foreground text-center text-sm">Sign in to continue your focus journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full transition-all duration-200 outline-none text-foreground placeholder:text-muted-foreground/50"
              style={{
                background: "hsl(var(--input) / 0.5)",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                padding: "14px 16px",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(124,58,237,0.6)";
                e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "hsl(var(--border))";
                e.target.style.boxShadow = "none";
              }}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full transition-all duration-200 outline-none text-foreground placeholder:text-muted-foreground/50 pr-12"
                style={{
                  background: "hsl(var(--input) / 0.5)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  padding: "14px 16px",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(124, 58, 237, 0.6)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(124, 58, 237, 0.15)";
                  setIsPasswordFocused(true);
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "hsl(var(--border))";
                  e.target.style.boxShadow = "none";
                  setIsPasswordFocused(false);
                }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-rose-400 text-sm font-medium">
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            onMouseEnter={() => setIsHoveringSubmit(true)}
            onMouseLeave={() => setIsHoveringSubmit(false)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full font-bold rounded-xl flex items-center justify-center mt-2 h-[52px] transition-shadow"
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            boxShadow: "0 4px 20px hsl(var(--primary) / 0.3)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 32px hsl(var(--primary) / 0.55)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px hsl(var(--primary) / 0.3)"; }}
          >
            Sign in
          </motion.button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border/40" />
          <span className="text-muted-foreground/60 text-xs font-medium uppercase tracking-wider">or continue with</span>
          <div className="flex-1 h-px bg-border/40" />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleSocialLogin("google")}
            className="flex-1 flex items-center justify-center gap-2 text-sm text-foreground/80 font-medium transition-colors"
            style={{
              background: "hsl(var(--muted) / 0.5)",
              border: "1px solid hsl(var(--border))",
              borderRadius: "12px",
              height: "48px",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "hsl(var(--muted))"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "hsl(var(--muted) / 0.5)"; }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
            </svg>
            Google
          </button>
          <button
            type="button"
            onClick={() => handleSocialLogin("apple")}
            className="flex-1 flex items-center justify-center gap-2 text-sm text-foreground/80 font-medium transition-colors"
            style={{
              background: "hsl(var(--muted) / 0.5)",
              border: "1px solid hsl(var(--border))",
              borderRadius: "12px",
              height: "48px",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "hsl(var(--muted))"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "hsl(var(--muted) / 0.5)"; }}
          >
            <svg className="w-4 h-4" viewBox="0 0 814 1000" fill="currentColor">
              <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.3-148.2-93.7C27.1 777.1-1.4 703.4-.3 631.7c1.1-88.5 38.7-170.2 96.7-222.7 36.8-32.5 96.4-57.9 159.7-57.9 62.6 0 113.2 40.1 164.7 40.1 50.2 0 111.7-43.4 187.7-43.4zm-162.2-179.5c30.2-35.5 52.5-84.1 52.5-132.7 0-6.7-.4-13.5-1.5-19.9-49.9 1.9-109.1 33.3-144.8 74.3-27.5 31.1-53.6 80.2-53.6 129.5 0 7.2.9 14.4 2.1 20.9 5.5.9 11.2 1.5 17.2 1.5 44.6 0 99.8-29.1 128.1-73.6z"/>
            </svg>
            Apple
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          New to FocusNest?{" "}
          <Link to="/register" className="text-primary hover:text-primary/80 transition-colors font-medium">
            Create account →
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
