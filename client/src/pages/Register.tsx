import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { authClient } from "@/lib/auth-client";
import AuthSidePanel from "@/components/AuthSidePanel";

// ─── Password strength ─────────────────────────────────────────────────────────
const getPasswordStrength = (pw: string) => {
  let s = 0;
  if (pw.length > 0) s++;
  if (pw.length >= 8) s++;
  if (/[0-9]/.test(pw) || /[^a-zA-Z0-9]/.test(pw)) s++;
  if (
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^a-zA-Z0-9]/.test(pw) &&
    pw.length >= 8
  )
    s = 4;
  return s;
};
const strengthMeta = [
  { label: "", color: "transparent" },
  { label: "Weak", color: "#ef4444" },
  { label: "Fair", color: "#f97316" },
  { label: "Good", color: "#eab308" },
  { label: "Strong", color: "#22c55e" },
];

const steps = ["Account", "Privacy"];

// ─── Input class ─────────────────────────────────────────────────────────────
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
    className="flex-1 flex items-center justify-center gap-2 text-[13px] font-medium rounded-[11px] h-[44px] bg-foreground/[0.04] border border-foreground/[0.08] text-foreground/70 hover:bg-foreground/[0.07] hover:border-primary/30 transition-all duration-200"
  >
    {children}
  </button>
);

// ─── Register ──────────────────────────────────────────────────────────────────
const Register = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    full_name: "",
    dob: "",
    email: "",
    password: "",
    confirmPassword: "",
    aiConsent: false,
    spotifyConsent: false,
  });
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [shaking, setShaking] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (key: string, val: string | boolean) =>
    setForm((f) => ({ ...f, [key]: val }));

  const shake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const strength = getPasswordStrength(form.password);
  const meta = strengthMeta[strength];
  const passwordsMatch =
    form.password && form.confirmPassword && form.password === form.confirmPassword;

  const handleSocialSignUp = async (provider: "google" | "apple") => {
    await authClient.signIn.social({ provider, callbackURL: "/dashboard" });
  };

  const next = async () => {
    setError(null);
    if (step === 0) {
      if (!form.full_name || !form.dob || !form.email || !form.password || !form.confirmPassword) {
        setError("Please fill in all fields.");
        shake();
        return;
      }
      if (strength < 4) {
        setError("Please choose a stronger password");
        shake();
        return;
      }
      if (!passwordsMatch) {
        setError("Passwords don't match");
        shake();
        return;
      }
    }

    if (step < 1) {
      setStep(step + 1);
    } else {
      try {
        await register({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          date_of_birth: form.dob,
          is_consented_ai: form.aiConsent,
          is_consented_spotify: form.spotifyConsent,
        });
        setDone(true);
        setTimeout(() => navigate("/dashboard"), 2000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setStep(0);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[920px] flex rounded-[28px] overflow-hidden"
        style={{
          boxShadow: "0 0 90px hsl(var(--primary) / 0.1), 0 40px 80px rgba(0,0,0,0.5)",
          border: "1px solid hsl(var(--primary) / 0.12)",
        }}
      >
        {/* ── Left panel ── */}
        <div className="hidden lg:flex self-stretch">
          <AuthSidePanel />
        </div>

        {/* ── Right panel ── */}
        <motion.div
          className="flex-1 flex flex-col px-10 py-10 lg:px-12 bg-card overflow-y-auto"
          style={{ maxHeight: "92vh" }}
          animate={{ x: shaking ? [-7, 7, -5, 5, -2, 2, 0] : 0 }}
          transition={{ duration: 0.45 }}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
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

          {done ? (
            /* ── Success state ── */
            <div className="flex-1 flex flex-col items-center justify-center py-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 280, delay: 0.1 }}
                className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-success/10 border border-success/25"
                style={{ boxShadow: "0 0 40px hsl(var(--success) / 0.15)" }}
              >
                <Check className="w-9 h-9 text-emerald-400" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2 font-display">Welcome to FocusNest 🎉</h2>
              <p className="text-muted-foreground text-sm">
                Redirecting to your dashboard…
              </p>
            </div>
          ) : (
            <>
              {/* Heading */}
              <div className="mb-6">
                <h1 className="text-[24px] font-bold tracking-tight mb-1 font-display">
                  {step === 0 ? "Create your account" : "Your privacy, your choice"}
                </h1>
                <p className="text-muted-foreground text-[13.5px]">
                  {step === 0
                    ? "Start your focus journey today."
                    : "Control how your data is used."}
                </p>
              </div>

              {/* Step progress */}
              <div className="flex gap-2 mb-7">
                {steps.map((s, i) => (
                  <div key={s} className="flex-1">
                    <div className="h-[3px] rounded-full overflow-hidden bg-foreground/[0.07]">
                      <motion.div
                        className="h-full rounded-full"
                        initial={false}
                        animate={{ width: i <= step ? "100%" : "0%" }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        style={{
                          background:
                            i <= step
                              ? "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary-bright)))"
                              : "transparent",
                        }}
                      />
                    </div>
                    <p
                      className={`text-[9.5px] uppercase tracking-widest font-bold mt-1.5 text-center transition-colors duration-300 ${
                        i <= step ? "text-primary/75" : "text-muted-foreground/25"
                      }`}
                    >
                      {s}
                    </p>
                  </div>
                ))}
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-medium mb-4 bg-destructive/[0.08] border border-destructive/20 text-destructive"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Steps */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ x: 16, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -16, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  {step === 0 && (
                    <div className="space-y-3.5">
                      {/* Full name + DOB row */}
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-[10.5px] font-semibold uppercase tracking-widest mb-1.5 text-muted-foreground/55">
                            Full name
                          </label>
                          <input
                            type="text"
                            value={form.full_name}
                            onChange={(e) => update("full_name", e.target.value)}
                            placeholder="Full name"
                            className={inputClass}
                          />
                        </div>
                        <div className="w-[160px] shrink-0">
                          <label className="block text-[10.5px] font-semibold uppercase tracking-widest mb-1.5 text-muted-foreground/55">
                            Date of birth
                          </label>
                          <input
                            value={form.dob}
                            onChange={(e) => update("dob", e.target.value)}
                            type="date"
                            className={inputClass}
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-[10.5px] font-semibold uppercase tracking-widest mb-1.5 text-muted-foreground/55">
                          Email
                        </label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => update("email", e.target.value)}
                          placeholder="Email"
                          className={inputClass}
                        />
                      </div>

                      {/* Password */}
                      <div>
                        <label className="block text-[10.5px] font-semibold uppercase tracking-widest mb-1.5 text-muted-foreground/55">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={form.password}
                            onChange={(e) => update("password", e.target.value)}
                            placeholder="Password"
                            className={`${inputClass} pr-11`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-muted-foreground/65 transition-colors duration-200"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Strength meter */}
                        {form.password.length > 0 && (
                          <div className="mt-2">
                            <div className="grid grid-cols-4 gap-1 h-[3px]">
                              {[1, 2, 3, 4].map((seg) => (
                                <div
                                  key={seg}
                                  className="rounded-full transition-all duration-300"
                                  style={{
                                    background:
                                      strength >= seg ? meta.color : "hsl(var(--border) / 0.5)",
                                  }}
                                />
                              ))}
                            </div>
                            <div className="flex justify-between mt-1.5">
                              <span className="text-[10px] text-muted-foreground/40">
                                8+ chars, upper, lower, number & symbol
                              </span>
                              {meta.label && (
                                <span
                                  className="text-[10px] font-semibold uppercase tracking-wide"
                                  style={{ color: meta.color }}
                                >
                                  {meta.label}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Confirm password */}
                      <div>
                        <label className="block text-[10.5px] font-semibold uppercase tracking-widest mb-1.5 text-muted-foreground/55">
                          Confirm password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirm ? "text" : "password"}
                            value={form.confirmPassword}
                            onChange={(e) => update("confirmPassword", e.target.value)}
                            placeholder="Confirm password"
                            className={`${inputClass} pr-12 ${
                              form.confirmPassword
                                ? passwordsMatch
                                  ? "border-emerald-500/45 focus:border-emerald-500/60"
                                  : "border-red-500/40 focus:border-red-500/60"
                                : ""
                            }`}
                          />
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                            {form.confirmPassword && passwordsMatch && (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                            <button
                              type="button"
                              onClick={() => setShowConfirm(!showConfirm)}
                              className="text-muted-foreground/30 hover:text-muted-foreground/65 transition-colors duration-200"
                            >
                              {showConfirm ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="space-y-3">
                      {/* Core data (required) */}
                      <div className="flex items-start gap-3 rounded-xl p-4 bg-primary/[0.06] border border-primary/[0.14]">
                        <div className="w-4 h-4 rounded flex items-center justify-center mt-0.5 shrink-0 bg-primary/60 border border-primary/80">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold mb-0.5">
                            Core Data
                            <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/[0.18] text-primary/80">
                              Required
                            </span>
                          </p>
                          <p className="text-[12px] text-muted-foreground/60">
                            Tasks, sessions, and settings to run FocusNest.
                          </p>
                        </div>
                      </div>

                      {/* AI consent */}
                      <label
                        className={`flex items-start gap-3 rounded-xl p-4 cursor-pointer transition-all duration-200 border ${
                          form.aiConsent
                            ? "bg-primary/[0.06] border-primary/[0.22]"
                            : "bg-foreground/[0.025] border-foreground/[0.07]"
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded flex items-center justify-center mt-0.5 shrink-0 transition-all duration-200"
                          style={{
                            background: form.aiConsent ? "hsl(var(--primary) / 0.6)" : "transparent",
                            border: form.aiConsent
                              ? "1px solid hsl(var(--primary) / 0.8)"
                              : "1px solid hsl(var(--border))",
                          }}
                        >
                          {form.aiConsent && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          checked={form.aiConsent}
                          onChange={(e) => update("aiConsent", e.target.checked)}
                          className="sr-only"
                        />
                        <div>
                          <p className="text-[13px] font-semibold mb-0.5">AI Processing</p>
                          <p className="text-[12px] text-muted-foreground/60">
                            Let AI break down tasks and give personalized suggestions.
                          </p>
                        </div>
                      </label>

                      {/* Music consent */}
                      <label
                        className={`flex items-start gap-3 rounded-xl p-4 cursor-pointer transition-all duration-200 border ${
                          form.spotifyConsent
                            ? "bg-success/[0.05] border-success/[0.22]"
                            : "bg-foreground/[0.025] border-foreground/[0.07]"
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded flex items-center justify-center mt-0.5 shrink-0 transition-all duration-200"
                          style={{
                            background: form.spotifyConsent
                              ? "hsl(var(--success) / 0.55)"
                              : "transparent",
                            border: form.spotifyConsent
                              ? "1px solid hsl(var(--success) / 0.7)"
                              : "1px solid hsl(var(--border))",
                          }}
                        >
                          {form.spotifyConsent && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          checked={form.spotifyConsent}
                          onChange={(e) => update("spotifyConsent", e.target.checked)}
                          className="sr-only"
                        />
                        <div>
                          <p className="text-[13px] font-semibold mb-0.5">Music Integration</p>
                          <p className="text-[12px] text-muted-foreground/60">
                            Enable focus playlists during your work sessions.
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Action buttons */}
              <div className="flex items-center gap-3 mt-6">
                {step > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setStep(step - 1)}
                    className="w-[48px] h-[48px] rounded-xl flex items-center justify-center shrink-0 bg-foreground/[0.04] border border-foreground/[0.09] text-muted-foreground/50 hover:text-muted-foreground hover:border-border transition-all duration-200"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={next}
                  className="flex-1 h-[48px] rounded-xl font-semibold text-[14px] text-primary-foreground flex items-center justify-center gap-2 tracking-wide bg-primary hover:bg-primary/90 btn-glow transition-all duration-200"
                >
                  {step === 1 ? "Create Account" : "Continue"}
                  {step !== 1 && <ArrowRight className="w-4 h-4" />}
                </motion.button>
              </div>

              {/* Social — only on step 0 */}
              {step === 0 && (
                <>
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-border/50" />
                    <span className="text-[10.5px] uppercase tracking-widest font-medium text-muted-foreground/40">
                      or sign up with
                    </span>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>
                  <div className="flex gap-3">
                    <SocialBtn onClick={() => handleSocialSignUp("google")}>
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                        />
                      </svg>
                      Google
                    </SocialBtn>
                    <SocialBtn onClick={() => handleSocialSignUp("apple")}>
                      <svg
                        className="w-4 h-4 shrink-0"
                        viewBox="0 0 814 1000"
                        fill="currentColor"
                      >
                        <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.3-148.2-93.7C27.1 777.1-1.4 703.4-.3 631.7c1.1-88.5 38.7-170.2 96.7-222.7 36.8-32.5 96.4-57.9 159.7-57.9 62.6 0 113.2 40.1 164.7 40.1 50.2 0 111.7-43.4 187.7-43.4zm-162.2-179.5c30.2-35.5 52.5-84.1 52.5-132.7 0-6.7-.4-13.5-1.5-19.9-49.9 1.9-109.1 33.3-144.8 74.3-27.5 31.1-53.6 80.2-53.6 129.5 0 7.2.9 14.4 2.1 20.9 5.5.9 11.2 1.5 17.2 1.5 44.6 0 99.8-29.1 128.1-73.6z" />
                      </svg>
                      Apple
                    </SocialBtn>
                  </div>
                </>
              )}

              {/* Footer */}
              <p className="text-center text-[13px] mt-6 text-muted-foreground/50">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-primary/75 hover:text-primary transition-colors duration-200"
                >
                  Sign in →
                </Link>
              </p>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Register;
