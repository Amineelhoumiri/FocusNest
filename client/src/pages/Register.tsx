// src/pages/Register.tsx
// Multi-step animated registration flow for FocusNest.
// Securely compiles required user data (including GDPR consent states)
// and handles HTTP transaction pipeline to the backend database.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const steps = ["About You", "Location", "Privacy"];

const Register = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", dob: "", address: "", aiConsent: false, spotifyConsent: false });
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (key: string, val: string | boolean) => setForm((f) => ({ ...f, [key]: val }));

  const next = async () => {
    setError(null);
    if (step < 2) setStep(step + 1);
    else {
      try {
        await register({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          date_of_birth: form.dob,
          address: form.address,
          is_consented_ai: form.aiConsent,
          is_consented_spotify: form.spotifyConsent
        });
        setDone(true);
        setTimeout(() => navigate("/dashboard"), 2000);
      } catch (err: any) {
        setError(err.message || "Something went wrong during registration.");
        setStep(0); // Take them back to input proper values
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[150px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 w-full max-w-md rounded-2xl relative z-10"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">F</span>
          </div>
          <span className="font-semibold text-xl">Focus<span className="text-gradient-primary">Nest</span></span>
        </div>

        {done ? (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4"
            >
              <Check className="w-8 h-8 text-success" />
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to FocusNest 🎉</h2>
            <p className="text-muted-foreground">Redirecting to your dashboard...</p>
          </motion.div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="flex gap-2 mb-8">
              {steps.map((s, i) => (
                <div key={s} className="flex-1">
                  <div className="h-1.5 rounded-full overflow-hidden bg-surface-raised">
                    <motion.div
                      initial={false}
                      animate={{ width: i <= step ? "100%" : "0%" }}
                      className="h-full bg-primary rounded-full"
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className={`text-xs mt-1.5 ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</p>
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -30, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {step === 0 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-foreground">Tell us about you</h2>
                    {error && <p className="text-high-energy text-sm mb-2 font-bold">{error}</p>}
                    <input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="Full name" className="w-full px-4 py-3 rounded-lg bg-surface-raised border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]" />
                    <input value={form.email} onChange={(e) => update("email", e.target.value)} type="email" placeholder="Email" className="w-full px-4 py-3 rounded-lg bg-surface-raised border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]" />
                    <input value={form.dob} onChange={(e) => update("dob", e.target.value)} type="date" placeholder="Date of Birth" className="w-full px-4 py-3 rounded-lg bg-surface-raised border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]" />
                    <input value={form.password} onChange={(e) => update("password", e.target.value)} type="password" placeholder="Password" className="w-full px-4 py-3 rounded-lg bg-surface-raised border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]" />
                  </div>
                )}
                {step === 1 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-foreground">Where are you based?</h2>
                    <p className="text-sm text-muted-foreground">This is completely optional.</p>
                    <input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="City, Country" className="w-full px-4 py-3 rounded-lg bg-surface-raised border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]" />
                  </div>
                )}
                {step === 2 && (
                  <div className="space-y-5">
                    <h2 className="text-xl font-bold text-foreground">Your privacy, your choice</h2>
                    <div className="glass-card p-4 rounded-lg flex items-start gap-3">
                      <input type="checkbox" checked disabled className="mt-1 accent-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Core Data</p>
                        <p className="text-xs text-muted-foreground">Required to run FocusNest. Tasks, sessions, and settings.</p>
                      </div>
                    </div>
                    <label className="glass-card p-4 rounded-lg flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.aiConsent} onChange={(e) => update("aiConsent", e.target.checked)} className="mt-1 accent-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">AI Processing</p>
                        <p className="text-xs text-muted-foreground">Let AI break down tasks and give personalized suggestions.</p>
                      </div>
                    </label>
                    <label className="glass-card p-4 rounded-lg flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.spotifyConsent} onChange={(e) => update("spotifyConsent", e.target.checked)} className="mt-1 accent-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Spotify Integration</p>
                        <p className="text-xs text-muted-foreground">Connect Spotify for focus playlists during sessions.</p>
                      </div>
                    </label>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center gap-3 mt-8">
              {step > 0 && (
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep(step - 1)} className="px-4 py-3 rounded-lg border border-border text-foreground hover:bg-accent min-h-[44px]">
                  <ArrowLeft className="w-4 h-4" />
                </motion.button>
              )}
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} onClick={next} className="flex-1 py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold btn-glow min-h-[44px] flex items-center justify-center gap-2">
                {step === 2 ? "Create Account" : "Continue"}
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:text-primary-bright font-medium">Sign in →</Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Register;
