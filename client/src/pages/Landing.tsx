import {
  motion, useScroll, useSpring, useInView,
  useMotionValue, animate, useReducedMotion, useAnimationFrame,
} from "framer-motion";
import {
  ArrowRight, Brain, Timer, Sparkles, Clock, Maximize,
  LifeBuoy, ShieldCheck, Star, Zap, Heart, Shield,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { FinchBird } from "@/components/finch-bird";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";

// ─── Animated counter ─────────────────────────────────────────────────────────

const Counter = ({ to, suffix = "" }: { to: number; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(mv, to, { duration: 1.8, ease: "easeOut", onUpdate: (v) => setDisplay(Math.floor(v)) });
    return c.stop;
  }, [inView]);
  return <span ref={ref}>{display.toLocaleString()}{suffix}</span>;
};

// ─── HeroBackground ───────────────────────────────────────────────────────────

interface HeroDot {
  ox: number; oy: number;
  cx: number; cy: number;
  phase: number; speed: number;
  r: number; colorIdx: number;
}
interface HeroRipple { x: number; y: number; outerR: number; alpha: number; }

const DARK_DOT_COLORS = [[130, 118, 255], [80, 200, 160], [160, 120, 255]] as const;
const LIGHT_DOT_COLORS = [[83, 74, 183], [29, 158, 117], [127, 119, 221]] as const;

const HeroBackground = ({ isLight }: { isLight: boolean }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const dotsRef    = useRef<HeroDot[]>([]);
  const ripplesRef = useRef<HeroRipple[]>([]);

  const rawX    = useMotionValue(-999);
  const rawY    = useMotionValue(-999);
  const smoothX = useSpring(rawX, { stiffness: 80, damping: 20 });
  const smoothY = useSpring(rawY, { stiffness: 80, damping: 20 });

  // Glow — motion values so position updates never trigger React re-renders
  const glowLeft    = useMotionValue(-160);
  const glowTop     = useMotionValue(-160);
  const glowOpacity = useMotionValue(0);

  // Build dot grid
  useEffect(() => {
    const canvas  = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const build = (W: number, H: number) => {
      const dots: HeroDot[] = [];
      for (let r = 0; r <= Math.ceil(H / 32); r++) {
        for (let c = 0; c <= Math.ceil(W / 32); c++) {
          dots.push({
            ox: c * 32, oy: r * 32,
            cx: c * 32, cy: r * 32,
            phase: Math.random() * Math.PI * 2,
            speed: 0.6 + Math.random() * 0.8,
            r:     1.0 + Math.random() * 0.5,
            colorIdx: Math.floor(Math.random() * 3),
          });
        }
      }
      dotsRef.current = dots;
    };

    const ro = new ResizeObserver(() => {
      const { width, height } = wrapper.getBoundingClientRect();
      canvas.width  = width;
      canvas.height = height;
      build(width, height);
    });
    ro.observe(wrapper);

    const { width, height } = wrapper.getBoundingClientRect();
    canvas.width  = width;
    canvas.height = height;
    build(width, height);

    return () => ro.disconnect();
  }, []);

  // Document-level mouse tracking (works even when cursor is over hero content)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        rawX.set(x);
        rawY.set(y);
        glowLeft.set(x - 160);
        glowTop.set(y - 160);
        animate(glowOpacity, 1, { duration: 0.4 });
      } else {
        rawX.set(-999);
        rawY.set(-999);
        animate(glowOpacity, 0, { duration: 0.4 });
      }
    };

    const onClick = (e: MouseEvent) => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        ripplesRef.current.push({ x, y, outerR: 0, alpha: 0.7 });
      }
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("click", onClick);
    };
  }, [rawX, rawY, glowLeft, glowTop, glowOpacity]);

  // Render loop
  useAnimationFrame((time) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W  = canvas.width;
    const H  = canvas.height;
    const cx = smoothX.get();
    const cy = smoothY.get();
    const t  = time / 1000;

    ctx.clearRect(0, 0, W, H);

    const palette   = isLight ? LIGHT_DOT_COLORS : DARK_DOT_COLORS;
    const baseAlpha = isLight ? 0.08 : 0.10;
    const peakAlpha = isLight ? 0.45 : 0.60;

    for (const dot of dotsRef.current) {
      const breathAlpha = baseAlpha + Math.sin(t * dot.speed + dot.phase) * 0.022;
      const dx   = dot.ox - cx;
      const dy   = dot.oy - cy;
      const dist = Math.hypot(dx, dy);

      let targetX = dot.ox;
      let targetY = dot.oy;
      let alpha   = breathAlpha;
      let radius  = dot.r;

      if (cx > -900 && dist < 90) {
        const tension = Math.pow(1 - dist / 90, 1.8);
        const angle   = Math.atan2(dy, dx);
        targetX = dot.ox + Math.cos(angle) * tension * 12;
        targetY = dot.oy + Math.sin(angle) * tension * 12;
        alpha   = breathAlpha + tension * (peakAlpha - baseAlpha);
        radius  = dot.r + tension * 1.8;
      }

      // Lerp towards target — springs back when cursor leaves
      dot.cx += (targetX - dot.cx) * 0.14;
      dot.cy += (targetY - dot.cy) * 0.14;

      const [r, g, b] = palette[dot.colorIdx];
      ctx.beginPath();
      ctx.arc(dot.cx, dot.cy, Math.max(radius, 0.5), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
      ctx.fill();
    }

    // Ripples — two concentric expanding rings
    const alive: HeroRipple[] = [];
    for (const rip of ripplesRef.current) {
      rip.outerR += 2.5;
      rip.alpha  *= 0.96;
      if (rip.alpha < 0.01) continue;

      const innerR = rip.outerR * 0.55;

      ctx.beginPath();
      ctx.arc(rip.x, rip.y, rip.outerR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(140,130,255,${rip.alpha.toFixed(3)})`;
      ctx.lineWidth   = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(rip.x, rip.y, innerR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(80,200,160,${(rip.alpha * 0.8).toFixed(3)})`;
      ctx.lineWidth   = 0.8;
      ctx.stroke();

      if (rip.outerR < 140) alive.push(rip);
    }
    ripplesRef.current = alive;
  });

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0, willChange: "transform" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
      {/* Cursor glow — follows mouse without React re-renders */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 320, height: 320,
          left: glowLeft,
          top:  glowTop,
          opacity: glowOpacity,
          background: isLight
            ? "radial-gradient(circle, rgba(83,74,183,0.06) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(124,111,247,0.07) 0%, transparent 70%)",
        }}
      />
    </div>
  );
};

// ─── Marquee ticker ───────────────────────────────────────────────────────────

const TICKER_ITEMS = [
  { icon: Zap,       text: "ADHD-friendly by design" },
  { icon: Heart,     text: "No shame, ever" },
  { icon: Sparkles,  text: "AI task breakdown" },
  { icon: Shield,    text: "GDPR encrypted" },
  { icon: Brain,     text: "Built for your brain" },
  { icon: Zap,       text: "One task at a time" },
  { icon: Heart,     text: "Micro-timers that work" },
  { icon: Sparkles,  text: "Finch AI companion" },
  { icon: Shield,    text: "Zero tracking" },
  { icon: Brain,     text: "Focus score & streaks" },
];

const Marquee = () => {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="overflow-hidden py-4 relative">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none" style={{ background: "linear-gradient(90deg, hsl(var(--background)), transparent)" }} />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none" style={{ background: "linear-gradient(-90deg, hsl(var(--background)), transparent)" }} />
      <motion.div
        className="flex gap-4 w-max"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 28, ease: "linear", repeat: Infinity }}
      >
        {doubled.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-full shrink-0 select-none"
            style={{
              background: "hsl(var(--card) / 0.6)",
              border: "1px solid hsl(var(--border) / 0.4)",
              backdropFilter: "blur(8px)",
            }}
          >
            {item.text.includes("Finch") ? (
              <FinchBird size={14} variant="purple" />
            ) : (
              <item.icon className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(var(--primary) / 0.7)" }} />
            )}
            <span className="text-xs font-medium text-foreground/60 whitespace-nowrap">{item.text}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

// ─── Floating hero badge ───────────────────────────────────────────────────────

const FloatingBadge = ({
  children, style, delay = 0,
}: {
  children: React.ReactNode;
  style: React.CSSProperties;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
    transition={{
      opacity: { delay, duration: 0.5 },
      scale: { delay, duration: 0.5, type: "spring", stiffness: 300 },
      y: { delay: delay + 0.5, duration: 3.5 + delay, repeat: Infinity, ease: "easeInOut" },
    }}
    className="absolute hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold pointer-events-none select-none"
    style={{
      backdropFilter: "blur(12px)",
      border: "1px solid hsl(var(--primary) / 0.2)",
      background: "hsl(var(--primary) / 0.08)",
      color: "hsl(var(--primary) / 0.85)",
      ...style,
    }}
  >
    {children}
  </motion.div>
);

// ─── How it works step ────────────────────────────────────────────────────────

const HOW_STEPS = [
  {
    n: "01", title: "Add a task",
    desc: "Drop anything on your mind into the Backlog. Let Finch AI break it into steps if it feels too big.",
    color: "#7C3AED",
  },
  {
    n: "02", title: "Start a session",
    desc: "Pick a duration — 5 min, 25 min, or 60 min. See exactly when you'll be done.",
    color: "#06B6D4",
  },
  {
    n: "03", title: "Build momentum",
    desc: "Earn focus points, keep your streak, and watch your productivity compound day over day.",
    color: "#10B981",
  },
];

// ─── Feature data — each with unique accent ───────────────────────────────────

const BENTO = [
  {
    icon: Brain,    title: "Intelligent Kanban",  accent: "#7C3AED",
    desc: "One task in focus at a time — enforced by the system, not your willpower.",
    gridCol: "1 / 3", gridRow: "1 / 2", to: "/tasks",
  },
  {
    icon: Sparkles, title: "AI Task Breakdown",   accent: "#8B5CF6",
    desc: "Overwhelmed? Finch AI splits any task into actionable, bite-sized steps. Ask it anything.",
    gridCol: "3 / 4", gridRow: "1 / 3", to: "/chat",
  },
  {
    icon: Timer,    title: "Micro-Timer",          accent: "#06B6D4",
    desc: "5-minute focus sessions. Start small, stay moving, build real momentum.",
    gridCol: "1 / 2", gridRow: "2 / 3", to: "/sessions",
  },
  {
    icon: Clock,    title: "Done-By Calculator",  accent: "#F59E0B",
    desc: "See exactly when you'll finish. Time becomes concrete and manageable.",
    gridCol: "2 / 3", gridRow: "2 / 3", to: "/sessions",
  },
  {
    icon: Maximize, title: "Hyperfocus Mode",     accent: "#EC4899",
    desc: "One task. Full screen. Zero distractions. Pure deep work.",
    gridCol: "1 / 2", gridRow: "3 / 4", to: "/sessions",
  },
  {
    icon: LifeBuoy, title: "I'm Stuck Button",    accent: "#10B981",
    desc: "Switch to a low-energy task instantly. No shame, ever.",
    gridCol: "2 / 4", gridRow: "3 / 4", to: "/sessions",
  },
];


// ─── App mockup (hero right panel) ───────────────────────────────────────────

const AppMockup = ({ isLight = false }: { isLight?: boolean }) => (
  <div className="relative w-full">
    {/* Glow underneath */}
    <div
      className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-4/5 h-20 blur-[50px] pointer-events-none"
      style={{ background: isLight
        ? "radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 70%)"
        : "radial-gradient(ellipse, rgba(124,58,237,0.55) 0%, transparent 70%)" }}
    />
    <div
      className="absolute -bottom-2 right-0 w-1/2 h-12 blur-[40px] pointer-events-none"
      style={{ background: isLight
        ? "radial-gradient(ellipse, rgba(6,182,212,0.10) 0%, transparent 70%)"
        : "radial-gradient(ellipse, rgba(6,182,212,0.3) 0%, transparent 70%)" }}
    />

    {/* Browser window */}
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: isLight ? "hsl(252 30% 97%)" : "hsl(240 22% 9%)",
        border: isLight ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.07)",
        boxShadow: isLight
          ? "0 24px 80px rgba(124,58,237,0.12), 0 4px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)"
          : "0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {/* Chrome bar */}
      <div
        className="flex items-center gap-2 px-4 h-9 shrink-0"
        style={{
          background: isLight ? "hsl(252 30% 93%)" : "hsl(240 22% 7%)",
          borderBottom: isLight ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {["#EF4444", "#F59E0B", "#22C55E"].map((c, i) => (
          <div key={i} className="w-2.5 h-2.5 rounded-full opacity-60" style={{ background: c }} />
        ))}
        <div
          className="mx-auto px-6 py-0.5 rounded text-[10px]"
          style={{
            background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)",
            color: isLight ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.2)",
          }}
        >
          focusnest.app/dashboard
        </div>
      </div>

      {/* App body */}
      <div className="flex" style={{ height: 320 }}>
        {/* Sidebar */}
        <div
          className="flex flex-col items-center py-4 gap-3 shrink-0"
          style={{
            width: 44,
            background: isLight ? "hsl(252 30% 93%)" : "hsl(240 22% 7%)",
            borderRight: isLight ? "1px solid rgba(0,0,0,0.06)" : "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
            style={{ background: "hsl(var(--primary))" }}
          >F</div>
          <div className="mt-2 flex flex-col gap-2">
            {[0.9, 0.3, 0.2, 0.2].map((o, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-md"
                style={{
                  background: i === 0
                    ? "rgba(124,58,237,0.25)"
                    : isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)",
                  opacity: o,
                }}
              />
            ))}
          </div>
        </div>

        {/* Main dashboard */}
        <div
          className="flex-1 p-4 flex flex-col gap-3 overflow-hidden"
          style={{ background: isLight ? "hsl(252 30% 96%)" : "hsl(240 22% 8%)" }}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] mb-0.5" style={{ color: isLight ? "rgba(0,0,0,0.38)" : "rgba(255,255,255,0.22)" }}>Mon, March 17</p>
              <p className="text-sm font-semibold" style={{ color: isLight ? "rgba(0,0,0,0.82)" : "rgba(255,255,255,0.82)" }}>Good morning, Alex 👋</p>
            </div>
            <div className="flex items-center gap-1.5">
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "hsl(var(--primary))" }}
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-[10px] font-mono" style={{ color: isLight ? "rgba(0,0,0,0.38)" : "rgba(255,255,255,0.22)" }}>14:22</span>
            </div>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Score", val: "1,240", color: "#7C3AED" },
              { label: "Done",  val: "4",     color: "#22C55E" },
              { label: "Focus", val: "47m",   color: "#06B6D4" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl p-2.5"
                style={{
                  background: isLight ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.04)",
                  border: isLight ? "1px solid rgba(0,0,0,0.06)" : "1px solid rgba(255,255,255,0.06)",
                  boxShadow: isLight ? "0 1px 4px rgba(0,0,0,0.04)" : "none",
                }}
              >
                <p className="text-sm font-bold" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: isLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.28)" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Active task */}
          <div
            className="rounded-xl p-3"
            style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.18)" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <motion.div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: "#7C3AED", boxShadow: "0 0 6px rgba(124,58,237,0.7)" }}
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <p className="text-[11px] font-semibold" style={{ color: isLight ? "rgba(30,10,60,0.85)" : "rgba(255,255,255,0.8)" }}>Design homepage mockup</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(124,58,237,0.18)", color: "#7C3AED" }}
              >Doing</span>
              <span className="text-[9px]" style={{ color: isLight ? "rgba(0,0,0,0.38)" : "rgba(255,255,255,0.25)" }}>High energy · 3 subtasks</span>
            </div>
          </div>

          {/* Kanban columns */}
          <div className="flex gap-2 mt-auto">
            {[
              { col: "Backlog", n: 5, darkBg: "rgba(255,255,255,0.04)", lightBg: "rgba(0,0,0,0.04)" },
              { col: "To Do",   n: 3, darkBg: "rgba(124,58,237,0.1)",   lightBg: "rgba(124,58,237,0.08)" },
              { col: "Done",    n: 8, darkBg: "rgba(16,185,129,0.1)",   lightBg: "rgba(16,185,129,0.08)" },
            ].map((k) => (
              <div
                key={k.col}
                className="flex-1 rounded-xl p-2.5"
                style={{
                  background: isLight ? k.lightBg : k.darkBg,
                  border: isLight ? "1px solid rgba(0,0,0,0.06)" : "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <p className="text-[9px] font-medium" style={{ color: isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.35)" }}>{k.col}</p>
                <p className="text-lg font-bold mt-0.5" style={{ color: isLight ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.45)" }}>{k.n}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ─── Section badge (replaces ── LABEL ──) ────────────────────────────────────

const SectionBadge = ({ children, color = "primary" }: { children: React.ReactNode; color?: string }) => (
  <span
    className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
    style={{
      background: color === "teal" ? "rgba(6,182,212,0.1)" : "hsl(var(--primary) / 0.1)",
      border: `1px solid ${color === "teal" ? "rgba(6,182,212,0.2)" : "hsl(var(--primary) / 0.2)"}`,
      color: color === "teal" ? "#06B6D4" : "hsl(var(--primary))",
    }}
  >
    {children}
  </span>
);

// ─── Landing ──────────────────────────────────────────────────────────────────

const Landing = () => {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const prefersReducedMotion = useReducedMotion();

  // Navbar scroll detection
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  // Mouse parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 40, damping: 22 });
  const springY = useSpring(mouseY, { stiffness: 40, damping: 22 });
  useEffect(() => {
    const h = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth - 0.5) * 70);
      mouseY.set((e.clientY / window.innerHeight - 0.5) * 50);
    };
    window.addEventListener("mousemove", h, { passive: true });
    return () => window.removeEventListener("mousemove", h);
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-background text-foreground overflow-x-hidden scroll-smooth">

      {/* Scroll progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] z-[100] origin-left"
        style={{ scaleX: scrollYProgress, background: "linear-gradient(90deg, #7C3AED, #06B6D4)" }}
      />

      {/* ── Background: animated orbs + grain ──────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {/* Hero orb — mouse-tracked + slow pulse */}
        <motion.div
          className="absolute rounded-full blur-[130px]"
          style={{
            width: 800, height: 800,
            top: -250, left: "40%", x: "-50%",
            background: isLight
              ? "radial-gradient(ellipse, #C4B5FD 0%, transparent 70%)"
              : "radial-gradient(ellipse, #7C3AED 0%, transparent 70%)",
            translateX: springX,
            translateY: springY,
          }}
          animate={prefersReducedMotion ? {} : {
            opacity: isLight ? [0.18, 0.28, 0.18] : [0.10, 0.18, 0.10],
            scale: [1, 1.08, 1],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Mid teal orb — oscillates */}
        <motion.div
          className="absolute rounded-full blur-[120px]"
          style={{ width: 600, height: 600, top: "45%", right: -100, background: isLight ? "#A5F3FC" : "#06B6D4" }}
          animate={prefersReducedMotion
            ? { opacity: isLight ? 0.25 : 0.09 }
            : { opacity: isLight ? [0.15, 0.25, 0.15] : [0.06, 0.13, 0.06], scale: [1, 1.12, 1], x: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        {/* Bottom purple orb — oscillates opposite phase */}
        <motion.div
          className="absolute rounded-full blur-[100px]"
          style={{ width: 700, height: 700, bottom: -200, left: "20%", background: isLight ? "#DDD6FE" : "#7C3AED" }}
          animate={prefersReducedMotion
            ? { opacity: isLight ? 0.30 : 0.10 }
            : { opacity: isLight ? [0.20, 0.32, 0.20] : [0.07, 0.14, 0.07], scale: [1, 1.1, 1], x: [0, 30, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
        />
        {/* Accent pink orb — mid-left */}
        <motion.div
          className="absolute rounded-full blur-[110px]"
          style={{ width: 400, height: 400, top: "30%", left: "-5%", background: isLight ? "#FBCFE8" : "#EC4899" }}
          animate={prefersReducedMotion
            ? { opacity: isLight ? 0.22 : 0.05 }
            : { opacity: isLight ? [0.12, 0.22, 0.12] : [0.03, 0.08, 0.03], y: [0, -50, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />
        {/* Small bright particle — top right */}
        <motion.div
          className="absolute rounded-full blur-[60px]"
          style={{ width: 200, height: 200, top: "15%", right: "20%", background: isLight ? "#C4B5FD" : "#A78BFA" }}
          animate={prefersReducedMotion
            ? { opacity: isLight ? 0.20 : 0.07 }
            : { opacity: isLight ? [0.12, 0.22, 0.12] : [0.04, 0.12, 0.04], scale: [0.8, 1.3, 0.8] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
        {/* Small teal particle — lower right */}
        <motion.div
          className="absolute rounded-full blur-[50px]"
          style={{ width: 160, height: 160, bottom: "25%", right: "12%", background: isLight ? "#99F6E4" : "#06B6D4" }}
          animate={prefersReducedMotion
            ? { opacity: isLight ? 0.25 : 0.07 }
            : { opacity: isLight ? [0.15, 0.28, 0.15] : [0.05, 0.14, 0.05], y: [0, 25, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        />
        {/* Hero section has its own HeroBackground canvas — see below */}

        {/* Grain texture */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.025]" style={{ mixBlendMode: "overlay" }}>
          <filter id="grain-landing">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain-landing)" />
        </svg>
      </div>

      {/* ─── Navbar (iPhone SE / 375px: tight padding, Sign in visible, logged-in → Dashboard + profile) ─── */}
      <div className="sticky top-0 z-50 px-2 sm:px-4 md:px-8 pt-3 sm:pt-4 pb-2 pointer-events-none">
        <motion.nav
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto flex items-center justify-between gap-2 px-3 sm:px-5 md:px-7 py-3 sm:py-4 rounded-2xl mx-auto max-w-[1280px] transition-all duration-500"
          style={{
            background: scrolled
              ? "hsl(var(--background) / 0.90)"
              : "hsl(var(--background) / 0.60)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: scrolled
              ? "1px solid hsl(var(--border) / 0.4)"
              : "1px solid rgba(255,255,255,0.07)",
            boxShadow: scrolled
              ? "0 8px 32px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.04)"
              : "0 4px 24px rgba(0,0,0,0.15)",
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
            <motion.div
              animate={prefersReducedMotion ? {} : { scale: [1, 1.06, 1] }}
              transition={{ delay: 0.4, duration: 0.7, ease: "easeInOut" }}
              whileHover={{ rotate: 6, scale: 1.1, transition: { type: "spring", stiffness: 400 } }}
              className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: "hsl(var(--primary))", boxShadow: "0 4px 14px rgba(124,58,237,0.45)" }}
            >
              <span className="text-white font-bold text-xs sm:text-sm">F</span>
            </motion.div>
            <span className="font-bold text-[14px] sm:text-[16px] tracking-tight truncate">
              Focus<span className="text-primary">Nest</span>
            </span>
          </div>

          {/* Center links */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
            {[
              { label: "Features", href: "#features" },
              { label: "How It Works", href: "#how-it-works" },
            ].map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="relative px-5 py-2 text-[14px] font-medium text-muted-foreground/75 hover:text-foreground rounded-lg transition-all duration-200 hover:bg-white/[0.06]"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="flex items-center h-9 sm:h-10 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold text-muted-foreground/80 hover:text-foreground hover:bg-white/[0.06] transition-all duration-200 whitespace-nowrap"
                >
                  Dashboard
                </Link>
                <ProfileDropdown
                  variant="compact"
                  data={{
                    name: user.full_name,
                    email: user.email,
                    avatarUrl: user.profile_photo_url ?? null,
                  }}
                  onLogout={async () => {
                    await logout();
                    navigate("/");
                  }}
                />
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center h-9 sm:h-10 px-2 sm:px-4 rounded-xl text-xs sm:text-[14px] font-medium text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.06] transition-all duration-200 whitespace-nowrap"
                >
                  Sign in
                </Link>
                <div className="hidden md:block w-px h-5 shrink-0" style={{ background: "rgba(255,255,255,0.12)" }} />
                <Link to="/register" className="shrink-0">
                  <motion.button
                    whileHover={{ scale: 1.04, boxShadow: "0 6px 24px rgba(124,58,237,0.5)" }}
                    whileTap={{ scale: 0.97 }}
                    className="relative overflow-hidden flex items-center gap-1.5 sm:gap-2 text-white font-semibold rounded-xl text-xs sm:text-[14px] h-9 sm:h-10 px-3 sm:px-5 transition-all max-w-[11rem] sm:max-w-none"
                    style={{ background: "hsl(var(--primary))", boxShadow: "0 2px 12px rgba(124,58,237,0.35)" }}
                  >
                    <motion.span
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)", backgroundSize: "200% 100%" }}
                      animate={{ backgroundPosition: ["-100% 0", "200% 0"] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                    />
                    <span className="truncate sm:max-w-none">
                      <span className="sm:hidden">Start free</span>
                      <span className="hidden sm:inline">Get started free</span>
                    </span>
                    <ArrowRight className="hidden sm:inline-block w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  </motion.button>
                </Link>
              </>
            )}
          </div>
        </motion.nav>
      </div>

      {/* ─── Hero — asymmetric split ────────────────────────────────────────── */}
      <section className="relative overflow-hidden z-10" style={{ cursor: "none" }}>
        {/* Interactive canvas bg — dots, repel, ripples, glow */}
        {!prefersReducedMotion && <HeroBackground isLight={isLight} />}

        <div className="relative px-6 md:px-12 pt-16 pb-8 max-w-7xl mx-auto" style={{ zIndex: 1, cursor: "auto" }}>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

          {/* Left: text + CTAs */}
          <div className="flex flex-col">

            {/* Stars badge */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="self-start mb-8"
            >
              <motion.div
                animate={prefersReducedMotion ? {} : { y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
              >
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.07, type: "spring", stiffness: 350 }}
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    </motion.div>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  <span className="text-foreground font-semibold">1,200+</span> focused humans
                </span>
              </motion.div>
            </motion.div>

            {/* Headline with bloom behind it */}
            <div className="relative mb-6">
              {/* Bloom */}
              <div
                className="absolute -left-12 -top-8 w-64 h-40 blur-[80px] pointer-events-none opacity-25"
                style={{ background: "radial-gradient(ellipse, #7C3AED 0%, transparent 70%)" }}
              />
              <div
                className="relative font-bold leading-[1.08] tracking-tight"
                style={{ fontSize: "clamp(2.4rem, 5.5vw, 4rem)" }}
              >
                <div className="mb-1">
                  {["The", "productivity", "app", "built"].map((word, i) => (
                    <motion.span
                      key={word}
                      initial={{ opacity: 0, y: 22 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.18 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="inline-block mr-[0.27em]"
                    >
                      {word}
                    </motion.span>
                  ))}
                </div>
                <motion.span
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.54, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="block text-gradient-primary"
                  style={{ backgroundImage: "linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)" }}
                >
                  for how your brain works
                </motion.span>
              </div>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.5 }}
              className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-lg"
            >
              AI, micro-timers, and behavioral science — streamline your workflow,
              reduce cognitive load, and build momentum one step at a time.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.44, duration: 0.4 }}
              className="flex flex-wrap items-center gap-3 mb-6"
            >
              <Link to="/register">
                <div className="relative">
                  {/* Animated gradient border */}
                  <motion.div
                    className="absolute -inset-[1.5px] rounded-xl pointer-events-none"
                    style={{
                      background: "linear-gradient(90deg, #7C3AED, #06B6D4, #EC4899, #7C3AED)",
                      backgroundSize: "300% 100%",
                    }}
                    animate={prefersReducedMotion ? {} : { backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.04, boxShadow: "0 14px 44px rgba(124,58,237,0.55)" }}
                    whileTap={{ scale: 0.97 }}
                    className="relative flex items-center gap-2 text-white font-semibold rounded-xl text-base px-7 py-3.5 transition-all"
                    style={{ background: "hsl(var(--primary))", boxShadow: "0 4px 20px rgba(124,58,237,0.3)" }}
                  >
                    Get started for free
                    <motion.span animate={{ x: [0, 3, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
                      <ArrowRight className="w-4 h-4" />
                    </motion.span>
                  </motion.button>
                </div>
              </Link>
              <a
                href="#features"
                className="group text-sm text-muted-foreground hover:text-foreground transition-colors font-medium px-4 py-3.5 flex items-center gap-1"
              >
                See how it works
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  className="inline-block"
                >
                  →
                </motion.span>
              </a>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.58 }}
              className="text-xs text-muted-foreground/40"
            >
              No credit card · No paywalls · Free to try
            </motion.p>
          </div>

          {/* Right: tilted app mockup + floating badges */}
          <div className="relative hidden lg:block">
            <FloatingBadge style={{ top: "8%", right: "5%" }} delay={1.0}>
              <Sparkles className="w-3 h-3" /> AI-powered
            </FloatingBadge>
            <FloatingBadge style={{ top: "55%", left: "4%" }} delay={1.4}>
              <Zap className="w-3 h-3" /> ADHD-friendly
            </FloatingBadge>
            <FloatingBadge style={{ bottom: "14%", right: "8%" }} delay={1.8}>
              <Heart className="w-3 h-3" /> No shame, ever
            </FloatingBadge>
          <motion.div
            initial={{ opacity: 0, x: 40, rotateY: -12 }}
            animate={{ opacity: 1, x: 0, rotateY: -6 }}
            transition={{ delay: 0.55, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            style={{
              perspective: 1200,
              perspectiveOrigin: "50% 50%",
              transform: "perspective(1200px) rotateY(-6deg) rotateX(2deg)",
              transformStyle: "preserve-3d",
            }}
            whileHover={{
              rotateY: -2,
              rotateX: 0,
              transition: { duration: 0.6, ease: "easeOut" },
            }}
          >
            <motion.div
              animate={prefersReducedMotion ? {} : { y: [0, -9, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            >
              <AppMockup isLight={isLight} />
            </motion.div>
          </motion.div>
          </div>

          {/* Mobile mockup (no perspective) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="lg:hidden"
          >
            <AppMockup />
          </motion.div>
        </div>
        </div>
      </section>

      {/* ─── Marquee ticker ──────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-7xl mx-auto px-0 pb-4">
        <Marquee />
      </div>

      {/* ─── Features — bento grid ───────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 md:px-12 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex justify-center"
            >
              <SectionBadge>Built different</SectionBadge>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.06 }}
              className="text-3xl md:text-5xl font-bold leading-tight mb-4"
            >
              Everything your brain needs
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.12 }}
              className="text-muted-foreground max-w-lg mx-auto"
            >
              Every feature reduces friction between intention and action — no more paralysis, no more shame.
            </motion.p>
          </div>

          {/* Bento grid */}
          <div
            className="bento-grid grid gap-3"
            style={{ gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "auto" }}
          >
            {BENTO.map((f, i) => (
              <Link
                key={f.title}
                to={f.to}
                className="bento-cell"
                style={{ gridColumn: f.gridCol, gridRow: f.gridRow }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5, transition: { duration: 0.22 } }}
                  whileTap={{ scale: 0.98 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative rounded-2xl p-6 overflow-hidden cursor-pointer h-full"
                  style={{
                    background: `linear-gradient(135deg, ${f.accent}08 0%, transparent 60%), hsl(var(--card))`,
                    border: `1px solid ${f.accent}22`,
                    borderTop: `2px solid ${f.accent}`,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.08)",
                    minHeight: "100%",
                  }}
                >
                  {/* Animated gradient sweep */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{
                      background: `linear-gradient(90deg, ${f.accent}, #06B6D4, #EC4899, ${f.accent})`,
                      backgroundSize: "300% 100%",
                      opacity: isLight ? 0.05 : 0.10,
                    }}
                    animate={{ backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"] }}
                    transition={{ duration: 6 + i * 0.8, repeat: Infinity, ease: "linear" }}
                  />

                  {/* Hover glow */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                    style={{ background: `radial-gradient(circle at 30% 40%, ${f.accent}18 0%, transparent 60%)` }}
                  />

                  {/* "Try it →" label — slides in on hover */}
                  <span
                    className="absolute top-4 right-4 text-[11px] font-semibold px-2.5 py-1 rounded-full
                      opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0
                      transition-all duration-300"
                    style={{ background: `${f.accent}20`, color: f.accent }}
                  >
                    Try it →
                  </span>

                  <div className="relative z-10">
                    <motion.div
                      whileHover={{ scale: 1.12, rotate: 4 }}
                      transition={{ type: "spring", stiffness: 350, damping: 18 }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                      style={{
                        background: `${f.accent}15`,
                        border: `1px solid ${f.accent}30`,
                      }}
                    >
                      <f.icon className="w-5 h-5" style={{ color: f.accent }} />
                    </motion.div>
                    <h3 className="font-semibold text-foreground text-base mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Stats ─────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-6 md:px-12 relative z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
            style={{
              background: "hsl(var(--card))",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 4px 40px rgba(0,0,0,0.12)",
            }}
          >
            {/* Orb inside card */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 blur-[80px] pointer-events-none opacity-20"
              style={{ background: "radial-gradient(ellipse, #7C3AED 0%, transparent 70%)" }}
            />
            <div className="absolute inset-0 dot-grid opacity-[0.15] rounded-3xl" />
            <div className="relative z-10">
              <div className="flex justify-center mb-4">
                <SectionBadge>By the numbers</SectionBadge>
              </div>
              <div className="grid grid-cols-3 gap-8 mb-10">
                {[
                  { num: 1200, suffix: "+", label: "Focused humans", color: "#7C3AED" },
                  { num: 98,   suffix: "%", label: "Say less friction", color: "#06B6D4" },
                  { num: 3,    suffix: "x",  label: "More tasks done", color: "#10B981" },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.12 }}
                    className="flex flex-col items-center"
                  >
                    <span className="text-3xl md:text-5xl font-bold tabular-nums" style={{ color: s.color }}>
                      <Counter to={s.num} suffix={s.suffix} />
                    </span>
                    <span className="text-sm text-muted-foreground mt-1.5">{s.label}</span>
                  </motion.div>
                ))}
              </div>
              <Link to="/register">
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: "0 12px 40px rgba(124,58,237,0.45)" }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 text-white font-semibold rounded-xl text-base px-8 py-3.5 transition-all"
                  style={{ background: "hsl(var(--primary))", boxShadow: "0 4px 20px rgba(124,58,237,0.3)" }}
                >
                  Join them for free <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── How it works ───────────────────────────────────────────────────── */}
      <section className="py-24 px-6 md:px-12 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex justify-center"
            >
              <SectionBadge color="teal">Simple by design</SectionBadge>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.06 }}
              className="text-3xl md:text-5xl font-bold leading-tight mb-4"
            >
              Three steps to actual focus
            </motion.h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* Connector lines (desktop only) */}
            <div className="hidden md:block absolute top-10 left-[33%] right-[33%] h-px" style={{ background: "linear-gradient(90deg, #7C3AED40, #06B6D440)" }} />
            <div className="hidden md:block absolute top-10 left-[66%] right-0 h-px" style={{ background: "linear-gradient(90deg, #06B6D440, #10B98140)" }} />

            {HOW_STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="relative rounded-2xl p-7 overflow-hidden group"
                style={{
                  background: `linear-gradient(135deg, ${step.color}08 0%, transparent 60%), hsl(var(--card) / 0.7)`,
                  border: `1px solid ${step.color}20`,
                  backdropFilter: "blur(12px)",
                }}
                whileHover={{ y: -5, transition: { duration: 0.22 } }}
              >
                {/* Hover glow */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                  style={{ background: `radial-gradient(circle at 30% 30%, ${step.color}15 0%, transparent 65%)` }}
                />

                {/* Step number */}
                <span
                  className="block font-mono font-black mb-5 leading-none select-none"
                  style={{ fontSize: 42, color: `${step.color}25` }}
                >
                  {step.n}
                </span>

                <div
                  className="w-2 h-2 rounded-full mb-4"
                  style={{ background: step.color, boxShadow: `0 0 10px ${step.color}60` }}
                />

                <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Free CTA banner ────────────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-12 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl p-12 overflow-hidden"
            style={{
              background: isLight
                ? "linear-gradient(135deg, hsl(258 80% 97%) 0%, hsl(240 60% 94%) 100%)"
                : "linear-gradient(135deg, hsl(258 60% 14%) 0%, hsl(240 35% 10%) 100%)",
              border: isLight
                ? "1px solid rgba(124,58,237,0.18)"
                : "1px solid rgba(124,58,237,0.25)",
              boxShadow: isLight
                ? "0 8px 60px rgba(124,58,237,0.12), inset 0 1px 0 rgba(255,255,255,0.9)"
                : "0 8px 60px rgba(124,58,237,0.25)",
            }}
          >
            {/* Animated gradient border */}
            <motion.div
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{
                background: "linear-gradient(90deg, #7C3AED, #06B6D4, #EC4899, #7C3AED)",
                backgroundSize: "300% 100%",
                opacity: isLight ? 0.08 : 0.18,
              }}
              animate={{ backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />
            {/* Top glow */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-36 blur-[70px] pointer-events-none"
              style={{ background: isLight
                ? "radial-gradient(ellipse, rgba(124,58,237,0.15) 0%, transparent 70%)"
                : "radial-gradient(ellipse, rgba(124,58,237,0.45) 0%, transparent 70%)" }}
            />
            <div className="relative z-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6"
                style={isLight
                  ? { background: "rgba(124,58,237,0.1)", color: "#5B21B6", border: "1px solid rgba(124,58,237,0.2)" }
                  : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <Sparkles className="w-3.5 h-3.5" /> Free trial — no card needed
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.06 }}
                className="text-3xl md:text-4xl font-bold mb-4 leading-tight"
                style={{ color: isLight ? "#1E1040" : "#ffffff" }}
              >
                Everything included.<br />
                <span style={{ background: "linear-gradient(90deg, #7C3AED, #06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Completely free to try.
                </span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.12 }}
                className="mb-8 max-w-lg mx-auto"
                style={{ color: isLight ? "rgba(55,30,100,0.6)" : "rgba(255,255,255,0.5)" }}
              >
                No credit card. No paywalls. Just focus tools that work — for your brain, your way.
              </motion.p>
              <Link to="/register">
                <motion.button
                  whileHover={{ scale: 1.04, boxShadow: "0 14px 44px rgba(124,58,237,0.6)" }}
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
                  Start for free
                  <motion.span animate={{ x: [0, 3, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
                    <ArrowRight className="w-4 h-4" />
                  </motion.span>
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer
        className="py-12 relative z-10"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="max-w-6xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "hsl(var(--primary))", boxShadow: "0 2px 8px rgba(124,58,237,0.35)" }}
            >
              <span className="text-white text-xs font-bold">F</span>
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">FocusNest</p>
              <p className="text-xs text-muted-foreground/50">© 2026 · Your brain is not broken.</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-foreground transition-colors">Sign in</Link>
            <Link to="/register" className="hover:text-foreground transition-colors">Register</Link>
            <div className="flex items-center gap-1.5 font-medium text-xs" style={{ color: "#10B981" }}>
              <ShieldCheck className="w-3.5 h-3.5" />GDPR
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Landing;
