import { motion } from "framer-motion";
import { Brain, Timer, Sparkles, Clock, Maximize, LifeBuoy, Shield, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { FinchBird } from "@/components/finch-bird";

const FEATURES = [
  { icon: Brain,    title: "Intelligent Kanban",  desc: "One task in focus at a time — enforced by the system, not your willpower.", color: "#7C3AED" },
  { icon: Sparkles, title: "Finch AI",             desc: "AI task breakdown, smart prioritisation, and a companion who never judges.", color: "#8B5CF6" },
  { icon: Timer,    title: "Micro-Timers",         desc: "5, 25, or 60-minute sessions. Start small, build momentum.", color: "#06B6D4" },
  { icon: Clock,    title: "Done-By Calculator",   desc: "See exactly when you'll finish — time becomes concrete and manageable.", color: "#F59E0B" },
  { icon: Maximize, title: "Hyperfocus Mode",      desc: "One task. Full screen. Zero distractions. Pure deep work.", color: "#EC4899" },
  { icon: LifeBuoy, title: "I'm Stuck Button",     desc: "Switch to a low-energy task instantly. No shame, ever.", color: "#10B981" },
  { icon: Shield,   title: "GDPR Encrypted",       desc: "Your data is end-to-end encrypted on AWS KMS. Zero tracking.", color: "#3B82F6" },
  { icon: Brain,    title: "Focus Score & Streaks", desc: "Earn points, build streaks, and watch your productivity compound.", color: "#A855F7" },
];

const Pricing = () => {
  return (
    <div className="min-h-[calc(100vh-8rem)] py-10 px-4 flex flex-col items-center">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-2xl mb-12"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-5"
          style={{ background: "hsl(var(--primary)/0.1)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary)/0.2)" }}
        >
          <Sparkles className="w-3.5 h-3.5" /> Free trial — everything included
        </motion.div>
        <h1 className="font-bold text-4xl md:text-5xl tracking-tight mb-4">
          All features.{" "}
          <span
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), #06B6D4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            No paywalls.
          </span>
        </h1>
        <p className="text-lg text-muted-foreground/70 leading-relaxed">
          FocusNest is free to try — no credit card, no hidden limits, no tricks.
          Every feature below is available right now.
        </p>
      </motion.div>

      {/* Big free badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 280, damping: 22 }}
        className="relative rounded-3xl p-10 mb-12 text-center overflow-hidden max-w-lg w-full"
        style={{
          background: "linear-gradient(135deg, hsl(258 60% 14%) 0%, hsl(240 35% 10%) 100%)",
          border: "1px solid rgba(124,58,237,0.3)",
          boxShadow: "0 8px 60px rgba(124,58,237,0.25)",
        }}
      >
        {/* Animated gradient border */}
        <motion.div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: "linear-gradient(90deg, #7C3AED, #06B6D4, #EC4899, #7C3AED)",
            backgroundSize: "300% 100%",
            opacity: 0.15,
          }}
          animate={{ backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-28 blur-[60px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(124,58,237,0.5) 0%, transparent 70%)" }}
        />
        <div className="relative z-10">
          <p className="text-white/50 text-sm font-semibold uppercase tracking-widest mb-2">Current price</p>
          <div className="flex items-baseline justify-center gap-2 mb-3">
            <span className="text-7xl font-black text-white">$0</span>
            <span className="text-white/40 text-lg">/forever</span>
          </div>
          <p className="text-white/50 text-sm mb-6">No card required · Cancel anytime · Free trial</p>
          <Link to="/dashboard">
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: "0 12px 40px rgba(124,58,237,0.55)" }}
              whileTap={{ scale: 0.97 }}
              className="relative overflow-hidden inline-flex items-center gap-2 text-white font-semibold rounded-xl text-base px-8 py-3.5 transition-all"
              style={{ background: "hsl(var(--primary))", boxShadow: "0 4px 20px rgba(124,58,237,0.35)" }}
            >
              <motion.span
                className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)", backgroundSize: "200% 100%" }}
                animate={{ backgroundPosition: ["-100% 0", "200% 0"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
              />
              Go to Dashboard →
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* Features grid */}
      <div className="w-full max-w-4xl">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center text-sm font-semibold text-muted-foreground/50 uppercase tracking-widest mb-6"
        >
          Everything that's included
        </motion.p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="glass-card rounded-2xl p-5 flex flex-col gap-3 group"
            >
              <div className="flex items-center justify-between">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${f.color}15`, border: `1px solid ${f.color}30` }}
                >
                  {f.title === "Finch AI" ? (
                    <FinchBird size={18} variant="purple" />
                  ) : (
                    <f.icon className="w-4.5 h-4.5" style={{ color: f.color, width: 18, height: 18 }} />
                  )}
                </div>
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.25)" }}
                >
                  <Check className="w-2.5 h-2.5" style={{ color: "#10B981" }} />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">{f.title}</p>
                <p className="text-xs text-muted-foreground/60 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-12 flex items-center gap-2 text-sm text-muted-foreground/40"
      >
        <Shield className="w-4 h-4 text-primary/50" />
        GDPR compliant · End-to-end encrypted · Zero tracking
      </motion.div>

    </div>
  );
};

export default Pricing;
