// components/StarField.tsx
// Parallax star field background for the Landing page.
// 100 stars divided into 3 depth layers with different scroll and cursor offsets.
// All motion flows through Framer Motion MotionValues — zero React re-renders.

import { useEffect, useMemo } from "react";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StarData {
  id: number;
  top: string;
  left: string;
  size: number;
  initialOpacity: number;
  duration: number;
  depth: "far" | "mid" | "near";
}

interface StarProps {
  top: string;
  left: string;
  size: number;
  initialOpacity: number;
  duration: number;
}

// ─── Star ─────────────────────────────────────────────────────────────────────

// Individual star with Framer Motion twinkle (opacity keyframes).
// Positioned absolutely within its depth-layer container.
const Star = ({ top, left, size, initialOpacity, duration }: StarProps) => (
  <motion.div
    style={{
      position: "absolute",
      top,
      left,
      width: size,
      height: size,
      borderRadius: "50%",
      backgroundColor: "white",
    }}
    animate={{ opacity: [initialOpacity, 1, initialOpacity] }}
    transition={{
      duration,
      repeat: Infinity,
      ease: "easeInOut",
      repeatType: "loop",
    }}
  />
);

// ─── StarField ────────────────────────────────────────────────────────────────

const StarField = () => {
  const { scrollY } = useScroll();

  // ── Mouse tracking ───────────────────────────────────────────────────────
  // Raw centered mouse position (origin = screen center) updated via DOM event.
  // useMotionValue avoids setState — no re-renders on mousemove.
  const rawMouseX = useMotionValue(0);
  const rawMouseY = useMotionValue(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      rawMouseX.set(e.clientX - window.innerWidth  / 2);
      rawMouseY.set(e.clientY - window.innerHeight / 2);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [rawMouseX, rawMouseY]);

  // Spring-smooth the mouse values for a soft, floating-in-space feel.
  const mouseX = useSpring(rawMouseX, { stiffness: 60, damping: 20 });
  const mouseY = useSpring(rawMouseY, { stiffness: 60, damping: 20 });

  // ── Combined transforms per depth layer ──────────────────────────────────
  // useTransform([...motionValues], transformer) subscribes to multiple sources
  // and derives a new MotionValue — still zero React re-renders on update.
  //
  // Scroll : far -0.1x, mid -0.2x, near -0.3x  (depth parallax)
  // Mouse  : far ±0.02x, mid ±0.04x, near ±0.06x (cursor parallax)
  const xFar  = useTransform(mouseX,              (mx)         =>  mx * 0.02);
  const yFar  = useTransform([scrollY, mouseY],   ([s, my])    => -s  * 0.1 + my * 0.02);

  const xMid  = useTransform(mouseX,              (mx)         =>  mx * 0.04);
  const yMid  = useTransform([scrollY, mouseY],   ([s, my])    => -s  * 0.2 + my * 0.04);

  const xNear = useTransform(mouseX,              (mx)         =>  mx * 0.06);
  const yNear = useTransform([scrollY, mouseY],   ([s, my])    => -s  * 0.3 + my * 0.06);

  // Generate all 100 stars exactly once. Properties are randomized per spec:
  //   top / left : 0% – 100%
  //   size       : 1px – 3px
  //   opacity    : 0.2 – 0.8 (initial twinkle keyframe value)
  //   duration   : 2s – 5s
  //   depth      : index-bucketed into far / mid / near thirds
  const stars = useMemo<StarData[]>(() => {
    return Array.from({ length: 100 }, (_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: 1 + Math.random() * 2,
      initialOpacity: 0.2 + Math.random() * 0.6,
      duration: 2 + Math.random() * 3,
      depth: i < 34 ? "far" : i < 67 ? "mid" : "near",
    }));
  }, []);

  const farStars  = stars.filter((s) => s.depth === "far");
  const midStars  = stars.filter((s) => s.depth === "mid");
  const nearStars = stars.filter((s) => s.depth === "near");

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Far layer — slowest parallax (most distant) */}
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={{ x: xFar, y: yFar }}
      >
        {farStars.map((s) => (
          <Star
            key={s.id}
            top={s.top}
            left={s.left}
            size={s.size}
            initialOpacity={s.initialOpacity}
            duration={s.duration}
          />
        ))}
      </motion.div>

      {/* Mid layer */}
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={{ x: xMid, y: yMid }}
      >
        {midStars.map((s) => (
          <Star
            key={s.id}
            top={s.top}
            left={s.left}
            size={s.size}
            initialOpacity={s.initialOpacity}
            duration={s.duration}
          />
        ))}
      </motion.div>

      {/* Near layer — fastest parallax (closest) */}
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={{ x: xNear, y: yNear }}
      >
        {nearStars.map((s) => (
          <Star
            key={s.id}
            top={s.top}
            left={s.left}
            size={s.size}
            initialOpacity={s.initialOpacity}
            duration={s.duration}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default StarField;
