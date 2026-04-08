import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Music2, Pause, Play, Radar, SkipBack, SkipForward, Square } from "lucide-react";

export type MusicPlayerCardProps = {
  className?: string;
  /** `youtube` = red accent; `default` = FocusNest primary (violet). */
  skin?: "default" | "youtube";
  /** `hero` = Music page; `compact` = navbar dropdown. */
  density?: "default" | "hero" | "compact";
  title: string;
  artist?: string | null;
  artworkUrl?: string | null;
  isPlaying: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  /** Pause playback (navbar / compact player). */
  onStop?: () => void;
  onTogglePlay: () => void;
  onRadar?: () => void;
  /** Seek / volume / extra controls rendered inside the card below transport (one “deck”). */
  deck?: React.ReactNode;
  /** No track loaded: placeholder art + copy (e.g. navbar dropdown idle). */
  emptyPlayer?: boolean;
};

const FALLBACK_ART =
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=240&h=240&q=80";

const EqBar = ({ delay, color }: { delay: number; color: string; isPlaying: boolean }) => (
  <motion.div
    style={{
      width: 3,
      borderRadius: 999,
      background: color,
      minHeight: 3,
    }}
    animate={{
      height: ["4px", "18px", "7px", "15px", "4px"],
    }}
    transition={{
      duration: 1.4,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

const StaticBar = ({ color }: { color: string }) => (
  <div style={{ width: 3, height: 4, borderRadius: 999, background: color, opacity: 0.4 }} />
);

export default function MusicPlayerCard({
  className,
  skin = "default",
  density = "default",
  title,
  artist,
  artworkUrl,
  isPlaying,
  onPrev,
  onNext,
  onStop,
  onTogglePlay,
  onRadar,
  deck,
  emptyPlayer = false,
}: MusicPlayerCardProps) {
  const art = emptyPlayer ? null : (artworkUrl ?? FALLBACK_ART);
  const isYoutube = skin === "youtube";
  const isHero = density === "hero";
  const isCompact = density === "compact";

  const accentGlow = isYoutube
    ? "0 16px 48px rgba(220,38,38,0.40), 0 0 0 1px rgba(255,255,255,0.06)"
    : "0 16px 48px rgba(124,58,237,0.40), 0 0 0 1px rgba(255,255,255,0.06)";

  const playBtnBg = isYoutube
    ? "linear-gradient(145deg, #e53935, #b71c1c)"
    : "hsl(var(--primary))";

  const playBtnShadow = isYoutube
    ? "0 10px 32px rgba(198,40,40,0.50)"
    : "0 10px 32px hsl(var(--primary)/0.50)";

  const eqColor = isYoutube ? "#ff6b6b" : "#c4b5fd";

  const ctrlHover = isYoutube
    ? { background: "rgba(255,59,48,0.12)", borderColor: "rgba(255,59,48,0.28)" }
    : { background: "rgba(124,58,237,0.12)", borderColor: "rgba(124,58,237,0.28)" };

  const ringColor = isYoutube ? "rgba(255,59,48,0.45)" : "rgba(124,58,237,0.45)";

  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-2xl select-none", className)}
      style={{
        background: isYoutube
          ? "linear-gradient(180deg, rgba(10,3,3,0.94) 0%, rgba(5,1,1,0.97) 100%)"
          : "linear-gradient(180deg, rgba(10,7,18,0.94) 0%, rgba(5,3,12,0.97) 100%)",
        border: isYoutube
          ? "1px solid rgba(255,59,48,0.20)"
          : "1px solid rgba(124,58,237,0.20)",
        boxShadow: isYoutube
          ? "0 24px 64px rgba(0,0,0,0.55), 0 0 80px -20px rgba(220,38,38,0.20)"
          : "0 24px 64px rgba(0,0,0,0.55), 0 0 80px -20px rgba(124,58,237,0.20)",
      }}
    >
      {/* Blurred artwork ambient background */}
      {art ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url(${art})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(48px) saturate(2)",
            transform: "scale(1.6)",
            opacity: isPlaying ? (isYoutube ? 0.20 : 0.15) : 0.08,
            transition: "opacity 1s ease",
          }}
        />
      ) : null}

      {/* Gradient scrim over ambient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: isYoutube
            ? "linear-gradient(180deg, rgba(6,1,1,0.72) 0%, rgba(3,0,0,0.88) 100%)"
            : "linear-gradient(180deg, rgba(6,3,12,0.72) 0%, rgba(3,1,8,0.88) 100%)",
        }}
      />

      {/* Content */}
      <div
        className={cn(
          "relative z-10 flex flex-col items-center",
          isHero ? "gap-6 p-7 sm:p-8" : isCompact ? "gap-3 px-3 py-3.5" : "gap-5 p-6"
        )}
      >

        {/* Album art with glow ring */}
        <div className="relative">
          <motion.div
            animate={isPlaying ? { scale: [1, 1.025, 1] } : { scale: 1 }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <div
              className={cn(
                "overflow-hidden shrink-0",
                isHero
                  ? "rounded-2xl w-[196px] h-[196px] sm:w-[220px] sm:h-[220px]"
                  : isCompact
                    ? "rounded-xl w-[104px] h-[104px]"
                    : "rounded-2xl w-[148px] h-[148px]"
              )}
              style={{ boxShadow: emptyPlayer ? undefined : accentGlow }}
            >
              {emptyPlayer ? (
                <div
                  className={cn(
                    "flex h-full w-full items-center justify-center border border-dashed bg-white/[0.06]",
                    isCompact ? "rounded-xl border-white/18" : "rounded-2xl border-white/15"
                  )}
                >
                  <Music2
                    className={cn("text-white/40", isCompact ? "h-7 w-7" : isHero ? "h-14 w-14" : "h-10 w-10")}
                    aria-hidden
                  />
                </div>
              ) : (
                <img
                  src={art as string}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
          </motion.div>

          {/* Animated ring when playing */}
          <AnimatePresence>
            {isPlaying && (
              <motion.div
                key="ring"
                className={cn("absolute pointer-events-none", isCompact ? "rounded-[14px]" : "rounded-[24px]")}
                style={{
                  inset: isCompact ? -4 : -6,
                  border: `1.5px solid ${ringColor}`,
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: [0.5, 0.9, 0.5], scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Track info + EQ bars */}
        <div className={cn("w-full text-center space-y-2", isHero && "space-y-2.5", isCompact && "space-y-1")}>
          {/* EQ visualizer */}
          <div
            className={cn(
              "flex items-end justify-center gap-[3px] mb-0.5",
              isHero ? "h-[24px]" : isCompact ? "h-[14px]" : "h-[20px]"
            )}
          >
            {isPlaying ? (
              [0, 0.18, 0.36, 0.54, 0.72].map((delay) => (
                <EqBar key={delay} delay={delay} color={eqColor} isPlaying={isPlaying} />
              ))
            ) : (
              [0, 1, 2, 3, 4].map((i) => (
                <StaticBar key={i} color={eqColor} />
              ))
            )}
          </div>

          <p
            className={cn(
              "leading-tight truncate px-2",
              isHero
                ? "text-[21px] sm:text-[23px] font-bold tracking-tight"
                : isCompact
                  ? "text-[13px] font-semibold"
                  : "text-[16px] font-semibold"
            )}
            style={{ color: "rgba(255,255,255,0.96)" }}
          >
            {title}
          </p>
          <p
            className={cn(
              "truncate px-2",
              isHero ? "text-[13px]" : isCompact ? "text-[10px]" : "text-[12px]"
            )}
            style={{ color: "rgba(255,255,255,0.42)" }}
          >
            {artist ?? "FocusNest"}
          </p>
        </div>

        {/* Transport controls */}
        <div className={cn("flex items-center", isHero ? "gap-3.5" : isCompact ? "gap-1.5" : "gap-3")}>
          <ControlButton
            onClick={onPrev}
            disabled={!onPrev}
            hoverStyle={ctrlHover}
            compact={isCompact}
          >
            <SkipBack className={isCompact ? "w-3.5 h-3.5" : "w-[17px] h-[17px]"} />
          </ControlButton>

          <motion.button
            type="button"
            onClick={onTogglePlay}
            whileTap={{ scale: 0.93 }}
            aria-label={isPlaying ? "Pause" : "Play"}
            className={cn(
              "flex items-center justify-center text-white shrink-0 cursor-pointer",
              isHero
                ? "rounded-[18px] w-[60px] h-[60px] sm:w-16 sm:h-16"
                : isCompact
                  ? "rounded-[14px] w-11 h-11"
                  : "rounded-[18px] w-14 h-14"
            )}
            style={{
              background: playBtnBg,
              boxShadow: playBtnShadow,
              border: "none",
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isPlaying ? (
                <motion.span
                  key="pause"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="flex items-center justify-center"
                >
                  <Pause className={isCompact ? "w-4 h-4" : "w-[22px] h-[22px]"} />
                </motion.span>
              ) : (
                <motion.span
                  key="play"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="flex items-center justify-center"
                >
                  <Play className={cn(isCompact ? "w-4 h-4 ml-0.5" : "w-[22px] h-[22px] ml-0.5")} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {onStop != null ? (
            <ControlButton
              onClick={onStop}
              hoverStyle={ctrlHover}
              compact={isCompact}
              aria-label="Stop playback"
              title="Stop"
            >
              <Square className={isCompact ? "w-3 h-3" : "w-4 h-4"} />
            </ControlButton>
          ) : null}

          <ControlButton
            onClick={onNext}
            disabled={!onNext}
            hoverStyle={ctrlHover}
            compact={isCompact}
          >
            <SkipForward className={isCompact ? "w-3.5 h-3.5" : "w-[17px] h-[17px]"} />
          </ControlButton>

          {onRadar && (

            <ControlButton
              onClick={onRadar}
              hoverStyle={ctrlHover}
              compact={isCompact}
              title={isCompact ? "Open Music" : undefined}
              aria-label={isCompact ? "Open Music page" : undefined}
            >
              <Radar className={isCompact ? "w-3.5 h-3.5" : "w-[17px] h-[17px]"} />
            </ControlButton>
          )}
        </div>

        {deck != null ? (
          <div className={cn("w-full border-t border-white/[0.08] mt-1", isCompact ? "pt-2" : "pt-4")}>
            {deck}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Shared control button ────────────────────────────────────────────────────

function ControlButton({
  children,
  onClick,
  disabled,
  hoverStyle,
  dimmed,
  compact,
  title,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  hoverStyle: React.CSSProperties;
  dimmed?: boolean;
  compact?: boolean;
  title?: string;
  "aria-label"?: string;
}) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "flex items-center justify-center rounded-[13px] cursor-pointer transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed",
        compact ? "w-9 h-9" : "w-11 h-11"
      )}
      style={{
        background: hovered && !disabled ? hoverStyle.background as string : "rgba(255,255,255,0.06)",
        border: `1px solid ${hovered && !disabled ? hoverStyle.borderColor : "rgba(255,255,255,0.08)"}`,
        color: dimmed ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.72)",
      }}
    >
      {children}
    </button>
  );
}
