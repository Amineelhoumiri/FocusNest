import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { authClient } from "@/lib/auth-client";
import AuthSidePanel from "@/components/AuthSidePanel";
import { toast } from "sonner";

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
  const [searchParams] = useSearchParams();
  const verifiedBanner = searchParams.get("verified") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/dashboard" replace />;

  const shake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const handleSocialLogin = async (provider: "google") => {
    const callbackURL = `${window.location.origin}/welcome/consent`;
    const result = await authClient.signIn.social({ provider, callbackURL });
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
      setShowResendVerification(false);
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sign-in failed";
      setError(msg);
      setShowResendVerification(/verify|verified|verification/i.test(msg));
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
            <p className="mt-2 text-[12px] text-muted-foreground/80 leading-snug max-w-[340px]">
              Email &amp; password sign-in only works after you open the verification link we send when you register.
            </p>
            {verifiedBanner && (
              <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-700 dark:text-emerald-400">
                Email verified. You can sign in below.
              </p>
            )}
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
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-medium text-primary/65 hover:text-primary transition-colors duration-200"
                >
                  Forgot password?
                </Link>
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
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12.5px] font-medium bg-destructive/[0.08] border border-destructive/20 text-destructive">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                    {error}
                  </div>
                  {showResendVerification && email.trim() && (
                    <button
                      type="button"
                      className="w-full rounded-lg border border-border bg-muted/30 py-2 text-[12px] font-medium text-foreground hover:bg-muted/50"
                      onClick={async () => {
                        try {
                          const callbackURL = `${window.location.origin}/login?verified=1`;
                          const res = await (
                            authClient as unknown as {
                              sendVerificationEmail: (args: { email: string; callbackURL: string }) => Promise<{ error?: { message?: string } }>;
                            }
                          ).sendVerificationEmail({ email: email.trim(), callbackURL });
                          if (res?.error) {
                            toast.error(res.error.message || "Could not send email.");
                            return;
                          }
                          toast.success("If that account exists and is unverified, we sent a new link.");
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Request failed.");
                        }
                      }}
                    >
                      Resend verification email
                    </button>
                  )}
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
          <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground/45">
            <Link
              to="/terms"
              className="underline-offset-2 hover:text-muted-foreground/70 hover:underline"
            >
              Terms of Service
            </Link>
            <span className="mx-1.5 opacity-50">·</span>
            <Link
              to="/privacy"
              className="underline-offset-2 hover:text-muted-foreground/70 hover:underline"
            >
              Privacy Policy
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
