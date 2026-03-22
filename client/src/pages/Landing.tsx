import {
  motion, useScroll, useTransform, useSpring,
  useInView, useMotionValue, animate, useReducedMotion,
} from "framer-motion";
import {
  ArrowRight, Brain, Timer, Sparkles, Clock, Maximize,
  LifeBuoy, ShieldCheck, Star, CheckSquare, MessageCircle, Check,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useRef, useEffect, useState } from "react";

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

const PRICING_FEATURES = [
  "Unlimited tasks & subtasks",
  "AI task breakdown with Finch",
  "Focus sessions & timer",
  "Kanban board with drag & drop",
  "Focus score & streaks",
  "GDPR compliant & encrypted",
];

// ─── App mockup (hero right panel) ───────────────────────────────────────────

const AppMockup = () => (
  <div className="relative w-full">
    {/* Purple glow underneath */}
    <div
      className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-4/5 h-20 blur-[50px] pointer-events-none"
      style={{ background: "radial-gradient(ellipse, rgba(124,58,237,0.55) 0%, transparent 70%)" }}
    />
    {/* Teal secondary glow */}
    <div
      className="absolute -bottom-2 right-0 w-1/2 h-12 blur-[40px] pointer-events-none"
      style={{ background: "radial-gradient(ellipse, rgba(6,182,212,0.3) 0%, transparent 70%)" }}
    />

    {/* Browser window */}
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: "hsl(240 22% 9%)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {/* Chrome bar */}
      <div
        className="flex items-center gap-2 px-4 h-9 shrink-0"
        style={{ background: "hsl(240 22% 7%)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {["#EF4444", "#F59E0B", "#22C55E"].map((c, i) => (
          <div key={i} className="w-2.5 h-2.5 rounded-full opacity-50" style={{ background: c }} />
        ))}
        <div
          className="mx-auto px-6 py-0.5 rounded text-[10px]"
          style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.2)" }}
        >
          focusnest.app/dashboard
        </div>
      </div>

      {/* App body */}
      <div className="flex" style={{ height: 320 }}>
        {/* Sidebar */}
        <div
          className="flex flex-col items-center py-4 gap-3 shrink-0"
          style={{ width: 44, background: "hsl(240 22% 7%)", borderRight: "1px solid rgba(255,255,255,0.05)" }}
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
                style={{ background: i === 0 ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.06)", opacity: o }}
              />
            ))}
          </div>
        </div>

        {/* Main dashboard */}
        <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden" style={{ background: "hsl(240 22% 8%)" }}>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] mb-0.5" style={{ color: "rgba(255,255,255,0.22)" }}>Mon, March 17</p>
              <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.82)" }}>Good morning, Alex 👋</p>
            </div>
            <div className="flex items-center gap-1.5">
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "hsl(var(--primary))" }}
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.22)" }}>14:22</span>
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
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="text-sm font-bold" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Active task */}
          <div
            className="rounded-xl p-3"
            style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <motion.div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: "#7C3AED", boxShadow: "0 0 6px rgba(124,58,237,0.7)" }}
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <p className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>Design homepage mockup</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(124,58,237,0.25)", color: "#A78BFA" }}
              >Doing</span>
              <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>High energy · 3 subtasks</span>
            </div>
          </div>

          {/* Kanban columns */}
          <div className="flex gap-2 mt-auto">
            {[
              { col: "Backlog", n: 5, c: "rgba(255,255,255,0.04)" },
              { col: "To Do",   n: 3, c: "rgba(124,58,237,0.1)" },
              { col: "Done",    n: 8, c: "rgba(16,185,129,0.1)" },
            ].map((k) => (
              <div
                key={k.col}
                className="flex-1 rounded-xl p-2.5"
                style={{ background: k.c, border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <p className="text-[9px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>{k.col}</p>
                <p className="text-lg font-bold mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{k.n}</p>
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
    <div ref={containerRef} className="min-h-screen bg-background text-foreground overflow-x-hidden scroll-smooth">

      {/* Scroll progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] z-[100] origin-left"
        style={{ scaleX: scrollYProgress, background: "linear-gradient(90deg, #7C3AED, #06B6D4)" }}
      />

      {/* ── Background: 3 radial orbs + grain ──────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {/* Hero orb — mouse-tracked */}
        <motion.div
          className="absolute rounded-full blur-[130px]"
          style={{
            width: 800, height: 800,
            top: -250, left: "40%", x: "-50%",
            opacity: 0.13,
            background: "radial-gradient(ellipse, #7C3AED 0%, transparent 70%)",
            translateX: springX,
            translateY: springY,
          }}
        />
        {/* Mid teal orb */}
        <div
          className="absolute rounded-full blur-[120px] opacity-[0.09]"
          style={{ width: 600, height: 600, top: "45%", right: -100, background: "#06B6D4" }}
        />
        {/* Bottom purple orb */}
        <div
          className="absolute rounded-full blur-[100px] opacity-[0.10]"
          style={{ width: 700, height: 700, bottom: -200, left: "20%", background: "#7C3AED" }}
        />
        {/* Grain texture */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.025]" style={{ mixBlendMode: "overlay" }}>
          <filter id="grain-landing">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain-landing)" />
        </svg>
      </div>

      {/* ─── Navbar ────────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 transition-all duration-300"
        style={{
          background: scrolled ? "hsl(var(--background) / 0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(20px) saturate(150%)" : "none",
          borderBottom: scrolled ? "0.5px solid hsl(var(--border) / 0.5)" : "0.5px solid transparent",
          boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.15)" : "none",
        }}
      >
        <div className="flex items-center gap-2.5">
          <motion.div
            animate={prefersReducedMotion ? {} : { scale: [1, 1.06, 1] }}
            transition={{ delay: 0.4, duration: 0.7, ease: "easeInOut" }}
            whileHover={{ rotate: 6, scale: 1.08, transition: { type: "spring", stiffness: 400 } }}
            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
            style={{ background: "hsl(var(--primary))", boxShadow: "0 4px 14px rgba(124,58,237,0.4)" }}
          >
            <span className="text-white font-bold text-sm">F</span>
          </motion.div>
          <span className="font-bold text-[15px] tracking-tight">
            Focus<span className="text-primary">Nest</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-0.5">
          {[
            { label: "Features", href: "#features" },
            { label: "How It Works", href: "#how-it-works" },
            { label: "Pricing", href: "#pricing" },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="px-3.5 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/5"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login" className="hidden md:block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
            Sign in
          </Link>
          <Link to="/register">
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0 6px 28px rgba(124,58,237,0.45)" }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 text-white font-semibold rounded-xl text-sm px-4 py-2.5 transition-all"
              style={{ background: "hsl(var(--primary))", boxShadow: "0 2px 12px rgba(124,58,237,0.3)" }}
            >
              Get started free <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </Link>
        </div>
      </motion.nav>

      {/* ─── Hero — asymmetric split ────────────────────────────────────────── */}
      <section className="relative z-10 px-6 md:px-12 pt-16 pb-8 max-w-7xl mx-auto">
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
              No credit card · Free forever plan
            </motion.p>
          </div>

          {/* Right: tilted app mockup */}
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
            className="hidden lg:block"
          >
            <motion.div
              animate={prefersReducedMotion ? {} : { y: [0, -9, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            >
              <AppMockup />
            </motion.div>
          </motion.div>

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
      </section>

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
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "auto" }}
          >
            {BENTO.map((f, i) => (
              <Link
                key={f.title}
                to={f.to}
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
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderTop: `2px solid ${f.accent}`,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.08)",
                    minHeight: "100%",
                  }}
                >
                  {/* Hover glow */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                    style={{ background: `radial-gradient(circle at 30% 40%, ${f.accent}18 0%, transparent 60%)` }}
                  />

                  {/* Ghost number */}
                  <span
                    className="absolute bottom-2 right-4 font-mono font-black select-none pointer-events-none leading-none"
                    style={{ fontSize: 64, color: `${f.accent}07` }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

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

      {/* ─── Pricing ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 md:px-12 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex justify-center"
            >
              <SectionBadge>Simple pricing</SectionBadge>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 }}
              className="text-3xl md:text-4xl font-bold mb-3"
            >
              Always free. No tricks.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground"
            >
              FocusNest's core features are free forever. No credit card, no trial, no nonsense.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">

            {/* Free tier */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              transition={{ duration: 0.45 }}
              className="rounded-2xl p-8"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
              }}
            >
              <p className="text-sm font-semibold text-muted-foreground mb-1">Free</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-foreground">$0</span>
                <span className="text-muted-foreground text-sm">/forever</span>
              </div>
              <div className="space-y-3 mb-8">
                {PRICING_FEATURES.map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.2)" }}>
                      <Check className="w-2.5 h-2.5" style={{ color: "#10B981" }} />
                    </div>
                    <span className="text-sm text-foreground/80">{f}</span>
                  </div>
                ))}
              </div>
              <Link to="/register" className="block">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all"
                  style={{ background: "hsl(var(--primary))", boxShadow: "0 4px 14px rgba(124,58,237,0.25)" }}
                >
                  Get started free
                </motion.button>
              </Link>
            </motion.div>

            {/* Pro tier — animated gradient border */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="relative rounded-[18px] p-[1.5px]"
              style={{ boxShadow: "0 8px 60px rgba(124,58,237,0.4), 0 0 0 1px rgba(124,58,237,0.2)" }}
            >
              {/* Animated gradient border */}
              <motion.div
                className="absolute inset-0 rounded-[18px]"
                style={{ background: "linear-gradient(90deg, #7C3AED, #06B6D4, #EC4899, #7C3AED)", backgroundSize: "300% 100%" }}
                animate={{ backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              />
              {/* Inner card */}
              <div
                className="relative rounded-2xl p-8 overflow-hidden h-full"
                style={{ background: "linear-gradient(135deg, hsl(258 60% 18%) 0%, hsl(240 35% 12%) 100%)" }}
              >
                {/* Top glow */}
                <div
                  className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
                  style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.35) 0%, transparent 70%)" }}
                />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-white/80">Pro</p>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}>
                      Coming soon
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold text-white">$8</span>
                    <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>/month</span>
                  </div>
                  <div className="space-y-3 mb-8">
                    {["Everything in Free", "Priority AI responses", "Advanced analytics", "Team workspaces", "Custom integrations", "Priority support"].map((f) => (
                      <div key={f} className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.12)" }}>
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                        <span className="text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    disabled
                    className="w-full py-3 rounded-xl font-semibold text-sm transition-all cursor-not-allowed"
                    style={{ background: "rgba(255,255,255,0.9)", color: "#7C3AED" }}
                  >
                    Coming soon
                  </button>
                </div>
              </div>
            </motion.div>

          </div>
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
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
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
