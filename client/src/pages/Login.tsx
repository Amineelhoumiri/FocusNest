import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { authClient } from "@/lib/auth-client";
import AuthSidePanel from "@/components/AuthSidePanel";

// ─── Input class ───────────────────────────────────────────────────────────────
const inputClass =
  "w-full rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all";

// ─── Social button ─────────────────────────────────────────────────────────────
const SocialBtn = ({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex-1 flex items-center justify-center gap-2 text-[13px] font-medium rounded-[11px] h-[46px] bg-foreground/[0.04] border border-foreground/[0.08] text-foreground/70 hover:bg-foreground/[0.07] hover:border-primary/30 transition-all duration-200"
  >
    {children}
  </button>
);

// ─── Login ─────────────────────────────────────────────────────────────────────
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const shake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const handleSocialLogin = async (provider: "google" | "apple") => {
    const result = await authClient.signIn.social({ provider, callbackURL: "/dashboard" });
    if (result?.error) setError(result.error.message || `${provider} sign-in failed`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields.");
      shake();
      return;
    }
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch {
      setError("Invalid credentials");
      shake();
    }
  };

  return (
    <div className="h-screen flex items-center justify-center px-4 py-10 bg-background relative overflow-hidden">

      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute rounded-full blur-[120px]"
          style={{ width: 700, height: 700, top: -200, left: "30%", background: "radial-gradient(ellipse, #7C3AED 0%, transparent 70%)" }}
          animate={{ opacity: [0.08, 0.15, 0.08], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute rounded-full blur-[100px]"
          style={{ width: 500, height: 500, bottom: -100, right: -50, background: "#06B6D4" }}
          animate={{ opacity: [0.05, 0.10, 0.05], scale: [1, 1.12, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <motion.div
          className="absolute rounded-full blur-[80px]"
          style={{ width: 300, height: 300, top: "60%", left: "5%", background: "#EC4899" }}
          animate={{ opacity: [0.03, 0.07, 0.03], y: [0, -30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[860px] flex rounded-[28px] overflow-hidden"
        style={{
          boxShadow: "0 0 90px hsl(var(--primary) / 0.1), 0 40px 80px rgba(0,0,0,0.5)",
          border: "1px solid hsl(var(--primary) / 0.12)",
          minHeight: 560,
        }}
      >
        {/* ── Left panel ── */}
        <div className="hidden lg:flex self-stretch">
          <AuthSidePanel />
        </div>

        {/* ── Right panel — form ── */}
        <motion.div
          className="flex-1 flex flex-col justify-center px-10 py-12 lg:px-12"
          style={{
            background: "hsl(var(--card) / 0.82)",
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
          }}
          animate={{ x: shaking ? [-7, 7, -5, 5, -2, 2, 0] : 0 }}
          transition={{ duration: 0.45 }}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.75))",
                boxShadow: "0 0 14px hsl(var(--primary) / 0.45)",
              }}
            >
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="font-semibold text-sm tracking-tight">FocusNest</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-[26px] font-bold tracking-tight mb-1.5 font-display">
              Welcome back
            </h1>
            <p className="text-[13.5px] text-muted-foreground">
              Sign in to continue your focus journey
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2 text-muted-foreground/55">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/55">
                  Password
                </label>
                <button
                  type="button"
                  className="text-[11px] font-medium text-primary/65 hover:text-primary transition-colors duration-200"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-muted-foreground/65 transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12.5px] font-medium bg-destructive/[0.08] border border-destructive/20 text-destructive"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full h-[50px] rounded-xl font-semibold text-[14px] text-primary-foreground tracking-wide bg-primary hover:bg-primary/90 btn-glow transition-all duration-200"
            >
              Sign in
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-[10.5px] uppercase tracking-widest font-medium text-muted-foreground/40">
              or continue with
            </span>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {/* Social */}
          <div className="flex gap-3">
            <SocialBtn onClick={() => handleSocialLogin("google")}>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                />
              </svg>
              Google
            </SocialBtn>
            <SocialBtn onClick={() => handleSocialLogin("apple")}>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 814 1000" fill="currentColor">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.3-148.2-93.7C27.1 777.1-1.4 703.4-.3 631.7c1.1-88.5 38.7-170.2 96.7-222.7 36.8-32.5 96.4-57.9 159.7-57.9 62.6 0 113.2 40.1 164.7 40.1 50.2 0 111.7-43.4 187.7-43.4zm-162.2-179.5c30.2-35.5 52.5-84.1 52.5-132.7 0-6.7-.4-13.5-1.5-19.9-49.9 1.9-109.1 33.3-144.8 74.3-27.5 31.1-53.6 80.2-53.6 129.5 0 7.2.9 14.4 2.1 20.9 5.5.9 11.2 1.5 17.2 1.5 44.6 0 99.8-29.1 128.1-73.6z" />
              </svg>
              Apple
            </SocialBtn>
          </div>

          {/* Footer */}
          <p className="text-center text-[13px] mt-7 text-muted-foreground/50">
            New to FocusNest?{" "}
            <Link
              to="/register"
              className="font-semibold text-primary/75 hover:text-primary transition-colors duration-200"
            >
              Create account →
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
