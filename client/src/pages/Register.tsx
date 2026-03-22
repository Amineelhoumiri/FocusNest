import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, ArrowLeft, Eye, EyeOff, User, Calendar, Mail } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { authClient } from "@/lib/auth-client";

const steps = ["Registration", "Privacy"];

const getPasswordStrength = (password: string) => {
  let strength = 0;
  if (password.length > 0) strength += 1;
  if (password.length >= 8) strength += 1;
  if (/[0-9]/.test(password) || /[^a-zA-Z0-9]/.test(password)) strength += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password) && password.length >= 8) strength = 4;
  return strength;
};

const getStrengthDetails = (strength: number) => {
  switch (strength) {
    case 0: return { label: "", color: "transparent" };
    case 1: return { label: "Weak", color: "#ef4444" }; // red
    case 2: return { label: "Fair", color: "#f97316" }; // orange
    case 3: return { label: "Good", color: "#eab308" }; // yellow
    case 4: return { label: "Strong", color: "#22c55e" }; // green
    default: return { label: "", color: "transparent" };
  }
};

const Register = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ full_name: "", dob: "", email: "", password: "", confirmPassword: "", aiConsent: false, spotifyConsent: false });
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [shaking, setShaking] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSocialSignUp = async (provider: "google" | "apple") => {
    await authClient.signIn.social({
      provider,
      callbackURL: "/dashboard",
    });
  };

  const update = (key: string, val: string | boolean) => setForm((f) => ({ ...f, [key]: val }));

  const passwordStrength = getPasswordStrength(form.password);
  const strengthDetails = getStrengthDetails(passwordStrength);
  const doPasswordsMatch = form.password && form.confirmPassword && form.password === form.confirmPassword;

  const next = async () => {
    setError(null);

    if (step === 0) {
      if (!form.full_name || !form.dob || !form.email || !form.password || !form.confirmPassword) {
        setError("Please fill in all fields.");
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
        return;
      }
      if (passwordStrength < 4) {
        setError("Please choose a stronger password");
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
        return;
      }
      if (!doPasswordsMatch) {
        setError("Passwords don't match");
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
        return;
      }
    }

    if (step < 1) setStep(step + 1);
    else {
      try {
        await register({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          date_of_birth: form.dob,
          is_consented_ai: form.aiConsent,
          is_consented_spotify: form.spotifyConsent
        });
        setDone(true);
        setTimeout(() => navigate("/dashboard"), 2000);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message || "Something went wrong during registration.");
        } else {
          setError("Something went wrong during registration.");
        }
        setStep(0);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden py-12">

      {/* ── Ambient Background Orbs ── */}
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
          filter: "blur(80px)",
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
          filter: "blur(80px)",
          animation: "orb-drift-2 25s ease-in-out infinite",
        }}
      />

      {/* ── Registration Card ── */}
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
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/20">
              <span className="text-primary-foreground font-bold text-lg">F</span>
            </div>
            <span className="font-bold text-xl text-foreground tracking-tight">
              Focus<span className="text-gradient-primary">Nest</span>
            </span>
          </div>
        </div>

        {done ? (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
              className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-5 border border-emerald-500/30"
            >
              <Check className="w-8 h-8 text-emerald-400" />
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to FocusNest 🎉</h2>
            <p className="text-muted-foreground text-sm">Redirecting to your dashboard...</p>
          </motion.div>
        ) : (
          <>
            <div className="flex gap-2 mb-8">
              {steps.map((s, i) => (
                <div key={s} className="flex-1">
                  <div className="h-1.5 rounded-full overflow-hidden bg-border/40">
                    <motion.div
                      initial={false}
                      animate={{ width: i <= step ? "100%" : "0%" }}
                      className="h-full rounded-full bg-primary"
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className={`text-[10px] uppercase tracking-wider font-bold mt-2 text-center ${i <= step ? "text-primary" : "text-muted-foreground/30"}`}>{s}</p>
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="min-h-[220px]"
              >
                {step === 0 && (
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold text-foreground">Create your account</h2>
                      <p className="text-muted-foreground text-sm mt-1">Start your focus journey today.</p>
                    </div>
                    {error && <p className="text-rose-400 text-sm mb-4 font-medium text-center">{error}</p>}

                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        value={form.full_name}
                        onChange={(e) => update("full_name", e.target.value)}
                        placeholder="Full name"
                        className="w-full outline-none text-foreground placeholder:text-muted-foreground/50 transition-all duration-200 pl-12"
                        style={{ background: "hsl(var(--input) / 0.5)", border: "1px solid hsl(var(--border))", borderRadius: "12px", padding: "14px 16px 14px 48px" }}
                        onFocus={(e) => { e.target.style.borderColor = "rgba(124,58,237,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)"; }}
                        onBlur={(e) => { e.target.style.borderColor = "hsl(var(--border))"; e.target.style.boxShadow = "none"; }}
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <input
                        value={form.dob}
                        onChange={(e) => update("dob", e.target.value)}
                        type="date"
                        className="w-full outline-none text-foreground placeholder:text-muted-foreground/50 transition-all duration-200 pl-12"
                        style={{ background: "hsl(var(--input) / 0.5)", border: "1px solid hsl(var(--border))", borderRadius: "12px", padding: "14px 16px 14px 48px", colorScheme: "light dark" }}
                        onFocus={(e) => { e.target.style.borderColor = "rgba(124,58,237,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)"; }}
                        onBlur={(e) => { e.target.style.borderColor = "hsl(var(--border))"; e.target.style.boxShadow = "none"; }}
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Mail className="w-5 h-5" />
                      </div>
                      <input
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        type="email"
                        placeholder="Email"
                        className="w-full outline-none text-foreground placeholder:text-muted-foreground/50 transition-all duration-200 pl-12"
                        style={{ background: "hsl(var(--input) / 0.5)", border: "1px solid hsl(var(--border))", borderRadius: "12px", padding: "14px 16px 14px 48px" }}
                        onFocus={(e) => { e.target.style.borderColor = "rgba(124,58,237,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)"; }}
                        onBlur={(e) => { e.target.style.borderColor = "hsl(var(--border))"; e.target.style.boxShadow = "none"; }}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          value={form.password}
                          onChange={(e) => update("password", e.target.value)}
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          className="w-full outline-none text-foreground placeholder:text-muted-foreground/50 transition-all duration-200 pr-12"
                          style={{ background: "hsl(var(--input) / 0.5)", border: "1px solid hsl(var(--border))", borderRadius: "12px", padding: "14px 16px" }}
                          onFocus={(e) => { e.target.style.borderColor = "rgba(124,58,237,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)"; }}
                          onBlur={(e) => { e.target.style.borderColor = "hsl(var(--border))"; e.target.style.boxShadow = "none"; }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>

                      {/* 4-Segment Password Strength Meter */}
                      {form.password.length > 0 && (
                        <div className="px-1 mt-2">
                          <div className="grid grid-cols-4 gap-1 h-1.5 w-full rounded-full overflow-hidden">
                            {[1, 2, 3, 4].map((seg) => (
                              <div key={seg} className="h-full bg-border/50 relative overflow-hidden">
                                <motion.div
                                  className="absolute inset-0"
                                  initial={{ opacity: 0 }}
                                  animate={{
                                    opacity: passwordStrength >= seg ? 1 : 0,
                                    backgroundColor: strengthDetails.color
                                  }}
                                  transition={{ duration: 0.2 }}
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center mt-2 text-xs">
                            <span className="text-muted-foreground/60">8+ chars, upper, lower, number & symbol</span>
                            <span style={{ color: strengthDetails.color }} className="font-medium tracking-wide uppercase">{strengthDetails.label}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative mt-4">
                      <input
                        value={form.confirmPassword}
                        onChange={(e) => update("confirmPassword", e.target.value)}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm password"
                        className="w-full outline-none text-foreground placeholder:text-muted-foreground/50 transition-all duration-200 pr-12"
                        style={{
                          background: "hsl(var(--input) / 0.5)",
                          border: `1px solid ${form.confirmPassword ? (doPasswordsMatch ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)') : 'rgba(255, 255, 255, 0.08)'}`,
                          borderRadius: "12px",
                          padding: "14px 16px"
                        }}
                        onFocus={(e) => { e.target.style.boxShadow = form.confirmPassword ? (doPasswordsMatch ? '0 0 0 3px rgba(34, 197, 94, 0.15)' : '0 0 0 3px rgba(239, 68, 68, 0.15)') : "0 0 0 3px rgba(124,58,237,0.12)"; }}
                        onBlur={(e) => { e.target.style.boxShadow = "none"; }}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {form.confirmPassword && doPasswordsMatch && <Check className="w-4 h-4 text-emerald-500 mr-1" />}
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold text-foreground">Your privacy, your choice</h2>
                      <p className="text-muted-foreground text-sm mt-1">Control your data integrations.</p>
                    </div>
                    <div className="p-4 rounded-xl flex items-start gap-3 bg-muted/30 border border-border/30">
                      <input type="checkbox" checked disabled className="mt-1 accent-primary rounded border-border" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Core Data</p>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">Required to run FocusNest. Tasks, sessions, and settings.</p>
                      </div>
                    </div>
                    <label className="p-4 rounded-xl flex items-start gap-3 cursor-pointer transition-colors hover:bg-accent bg-card border border-border/50">
                      <input type="checkbox" checked={form.aiConsent} onChange={(e) => update("aiConsent", e.target.checked)} className="mt-1 accent-primary w-4 h-4 rounded border-border" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">AI Processing</p>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">Let AI break down tasks and give personalized suggestions.</p>
                      </div>
                    </label>
                    <label className="p-4 rounded-xl flex items-start gap-3 cursor-pointer transition-colors hover:bg-accent bg-card border border-border/50">
                      <input type="checkbox" checked={form.spotifyConsent} onChange={(e) => update("spotifyConsent", e.target.checked)} className="mt-1 accent-primary w-4 h-4 rounded border-border" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Spotify Integration</p>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">Connect Spotify for focus playlists during sessions.</p>
                      </div>
                    </label>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center gap-3 mt-8">
              {step > 0 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStep(step - 1)}
                  className="w-[52px] h-[52px] rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors bg-muted/50 border border-border/50"
                >
                  <ArrowLeft className="w-5 h-5" />
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={next}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold rounded-xl h-[52px] shadow-lg shadow-primary/25 hover:bg-primary/90 transition-colors"
              >
                {step === 1 ? "Create Account" : "Continue"}
                {step !== 1 && <ArrowRight className="w-5 h-5" />}
              </motion.button>
            </div>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-muted-foreground/60 text-xs font-medium uppercase tracking-wider">or sign up with</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleSocialSignUp("google")}
                className="flex-1 flex items-center justify-center gap-2 text-sm text-foreground font-medium transition-colors"
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
                onClick={() => handleSocialSignUp("apple")}
                className="flex-1 flex items-center justify-center gap-2 text-sm text-foreground font-medium transition-colors"
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
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">Sign in →</Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Register;
