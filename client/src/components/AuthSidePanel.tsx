import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Brain, Users, Zap, Timer } from "lucide-react";

const QUOTES = [
  {
    text: "The key is not to prioritize what's on your schedule, but to schedule your priorities.",
    author: "Stephen Covey",
  },
  {
    text: "Focus is the art of knowing what to ignore.",
    author: "James Clear",
  },
  {
    text: "Small consistent steps, taken every day, lead to extraordinary results.",
    author: "FocusNest",
  },
];

const METRICS = [
  { icon: Users, value: "12k+", label: "Focused users", color: "#a78bfa" },
  { icon: Timer, value: "500k+", label: "Sessions done", color: "#34d399" },
  { icon: Zap, value: "4.8★", label: "App rating", color: "#fbbf24" },
];

const CHIP_POSITIONS = [
  { top: -52, left: 14 },
  { top: 82, left: 208 },
  { top: 202, left: 2 },
];

const AuthSidePanel = () => {
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setQuoteIdx((i) => (i + 1) % QUOTES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const stars = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: 0.8 + Math.random() * 1.6,
        opacity: 0.12 + Math.random() * 0.45,
        dur: 2.5 + Math.random() * 4,
        delay: Math.random() * 6,
        purple: i % 6 === 0,
      })),
    []
  );

  return (
    <div
      className="relative flex flex-col overflow-hidden shrink-0 h-full"
      style={{
        width: "420px",
        minHeight: "100%",
        background: "linear-gradient(160deg, hsl(var(--background)) 0%, hsl(258 60% 8%) 48%, hsl(235 55% 10%) 100%)",
      }}
    >
      {/* Stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {stars.map((s) => (
          <motion.div
            key={s.id}
            className="absolute rounded-full"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: s.size,
              height: s.size,
              backgroundColor: s.purple ? "#c4b5fd" : "white",
            }}
            animate={{ opacity: [s.opacity * 0.25, s.opacity, s.opacity * 0.25] }}
            transition={{
              duration: s.dur,
              delay: s.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Central deep glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 340,
          height: 340,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(var(--primary) / 0.20) 0%, hsl(var(--primary) / 0.07) 50%, transparent 70%)",
          filter: "blur(36px)",
        }}
      />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-7 py-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
              boxShadow: "0 0 18px hsl(var(--primary) / 0.55)",
            }}
          >
            <span className="text-white font-bold text-sm font-display">F</span>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">FocusNest</span>
        </Link>

        <Link
          to="/"
          className="flex items-center gap-1 text-white/35 hover:text-white/65 text-[11px] font-medium transition-colors duration-200 rounded-full px-3 py-1.5 bg-white/[0.05] border border-white/[0.08]"
        >
          Back to home →
        </Link>
      </div>

      {/* Main visual */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <div className="relative" style={{ width: 220, height: 220 }}>
          {/* Outer rotating ring */}
          <motion.div
            className="absolute rounded-full"
            style={{
              border: "1px solid hsl(var(--primary) / 0.16)",
              top: -42,
              left: -42,
              width: 304,
              height: 304,
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 44, repeat: Infinity, ease: "linear" }}
          >
            <div
              className="absolute"
              style={{
                top: -3.5,
                left: "50%",
                marginLeft: -3.5,
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "hsl(var(--primary))",
                boxShadow: "0 0 10px hsl(var(--primary) / 0.9)",
              }}
            />
          </motion.div>

          {/* Inner counter-rotating ring */}
          <motion.div
            className="absolute rounded-full"
            style={{
              border: "1px solid hsl(var(--primary-bright) / 0.22)",
              top: -14,
              left: -14,
              width: 248,
              height: 248,
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          >
            <div
              className="absolute"
              style={{
                bottom: -3,
                left: "50%",
                marginLeft: -3,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "hsl(var(--primary-bright))",
                boxShadow: "0 0 8px hsl(var(--primary-bright) / 0.8)",
              }}
            />
          </motion.div>

          {/* Glowing orb */}
          <motion.div
            className="absolute inset-0 rounded-full flex items-center justify-center"
            style={{
              background: "radial-gradient(circle at 38% 32%, hsl(var(--primary-bright) / 0.14), hsl(var(--primary) / 0.22) 55%, hsl(var(--primary) / 0.08) 100%)",
              border: "1px solid hsl(var(--primary) / 0.38)",
              boxShadow: "0 0 70px hsl(var(--primary) / 0.22), inset 0 0 50px hsl(var(--primary) / 0.08)",
            }}
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Brain className="w-16 h-16 text-primary-bright/[0.88]" />
          </motion.div>

          {/* Floating metric chips */}
          {METRICS.map((m, i) => (
            <motion.div
              key={m.label}
              className="absolute flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-medium whitespace-nowrap bg-background/[0.78] border border-primary/[0.22] text-foreground/65"
              style={{
                top: CHIP_POSITIONS[i].top,
                left: CHIP_POSITIONS[i].left,
                backdropFilter: "blur(12px)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, y: [0, -3, 0] }}
              transition={{
                opacity: { delay: 0.4 + i * 0.2, duration: 0.5 },
                y: {
                  duration: 3.2 + i * 0.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.6,
                },
              }}
            >
              <m.icon className="w-3 h-3 shrink-0" style={{ color: m.color }} />
              <span style={{ color: m.color, fontWeight: 700 }}>{m.value}</span>
              <span>{m.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quote rotator */}
      <div className="relative z-10 px-7 pb-8 pt-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={quoteIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-white/50 text-[12.5px] leading-relaxed italic mb-2">
              "{QUOTES[quoteIdx].text}"
            </p>
            <p className="text-[11px] font-semibold tracking-wide text-primary-bright/[0.75]">
              — {QUOTES[quoteIdx].author}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Slide indicators */}
        <div className="flex gap-1.5 mt-4">
          {QUOTES.map((_, i) => (
            <button
              key={i}
              onClick={() => setQuoteIdx(i)}
              className="rounded-full transition-all duration-300"
              style={{
                height: 3,
                width: i === quoteIdx ? 22 : 7,
                background: i === quoteIdx ? "hsl(var(--primary))" : "rgba(255,255,255,0.18)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuthSidePanel;
