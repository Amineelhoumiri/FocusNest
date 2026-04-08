import * as React from "react";
import { motion } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";

const fmtSec = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export type MusicWebAccent = "violet" | "spotify";

const FALLBACK_HERO =
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&h=1200&q=80";

function fillForAccent(accent: MusicWebAccent) {
  return accent === "spotify"
    ? "linear-gradient(90deg, #1DB954, #1ED760)"
    : "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary-bright)))";
}

// ─── Hero (large art + bottom glass stack, reference-style) ─────────────────

export function MusicWebHero({
  artworkUrl,
  isPlaying,
  accent = "violet",
  className,
  /** Edge-to-edge hero (no outer radius) for full-bleed layouts */
  flush = false,
}: {
  artworkUrl: string | null;
  isPlaying: boolean;
  accent?: MusicWebAccent;
  className?: string;
  flush?: boolean;
}) {
  const art = artworkUrl ?? FALLBACK_HERO;
  const ring =
    accent === "spotify" ? "rgba(29, 185, 84, 0.45)" : "hsl(var(--primary) / 0.45)";

  return (
    <div
      className={cn(
        "relative flex w-full flex-1 overflow-hidden",
        flush
          ? "min-h-0 rounded-none"
          : "min-h-[220px] rounded-2xl lg:min-h-[320px]",
        className
      )}
    >
      <img src={art} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/20"
        aria-hidden
      />
      {isPlaying && (
        <motion.div
          className={cn("pointer-events-none absolute inset-0", flush ? "rounded-none" : "rounded-2xl")}
          style={{
            boxShadow: `inset 0 0 0 1.5px ${ring}`,
          }}
          animate={{ opacity: [0.55, 0.95, 0.55] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

// ─── Bottom dock (thumb, transport, seek, volume — reference-style) ────────

export function MusicWebBottomBar({
  artworkUrl,
  title,
  subtitle,
  isPlaying,
  onTogglePlay,
  onPrev,
  onNext,
  currentSec,
  durationSec,
  onSeek,
  seekDisabled,
  volume,
  muted,
  onVolume,
  onToggleMute,
  accent = "violet",
  showShuffle,
  onShuffle,
  shuffleDisabled,
  shuffleTitle,
}: {
  artworkUrl: string | null;
  title: string;
  subtitle: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  currentSec: number;
  durationSec: number;
  onSeek: (sec: number) => void;
  seekDisabled?: boolean;
  volume: number;
  muted: boolean;
  onVolume: (v: number) => void;
  onToggleMute: () => void;
  accent?: MusicWebAccent;
  showShuffle?: boolean;
  onShuffle?: () => void;
  shuffleDisabled?: boolean;
  shuffleTitle?: string;
}) {
  const seekRef = React.useRef<HTMLDivElement>(null);
  const pct = durationSec > 0 ? (currentSec / durationSec) * 100 : 0;
  const art = artworkUrl ?? FALLBACK_HERO;
  const fill = fillForAccent(accent);
  const btnBg = accent === "spotify" ? "#1DB954" : "hsl(var(--primary))";
  const btnShadow =
    accent === "spotify"
      ? "0 8px 28px rgba(29,185,84,0.35)"
      : "0 8px 28px hsl(var(--primary) / 0.35)";

  const onSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (seekDisabled || !seekRef.current || durationSec <= 0) return;
    const rect = seekRef.current.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * durationSec);
  };

  return (
    <div
      className="shrink-0 border-t border-white/[0.08] px-3 py-3 sm:px-5 sm:py-3.5"
      style={{ background: "rgba(5,5,7,0.97)" }}
    >
      <div className="flex w-full flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {/* Now playing */}
          <div className="flex min-w-0 flex-[0.85] items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg sm:h-14 sm:w-14">
              <img src={art} alt="" className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white sm:text-sm">{title}</p>
              <p className="truncate text-[11px] text-white/45 sm:text-xs">{subtitle}</p>
            </div>
          </div>

          {/* Transport + seek (center) */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-4 sm:gap-5">
              <button
                type="button"
                onClick={onPrev}
                disabled={!onPrev}
                className="rounded-full p-1.5 text-white/55 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-25"
                aria-label="Previous"
              >
                <SkipBack className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              </button>
              <motion.button
                type="button"
                onClick={onTogglePlay}
                whileTap={{ scale: 0.94 }}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white sm:h-11 sm:w-11"
                style={{ background: btnBg, boxShadow: btnShadow, border: "none" }}
              >
                {isPlaying ? (
                  <Pause className="h-[18px] w-[18px]" />
                ) : (
                  <Play className="ml-0.5 h-[18px] w-[18px]" />
                )}
              </motion.button>
              <button
                type="button"
                onClick={onNext}
                disabled={!onNext}
                className="rounded-full p-1.5 text-white/55 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-25"
                aria-label="Next"
              >
                <SkipForward className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              </button>
            </div>
            <div className="flex w-full max-w-md items-center gap-2 px-1">
              <span className="w-9 shrink-0 tabular-nums text-[10px] text-white/45 sm:text-[11px]">
                {fmtSec(currentSec)}
              </span>
              <div
                ref={seekRef}
                role="slider"
                aria-valuenow={Math.round(currentSec)}
                aria-valuemin={0}
                aria-valuemax={Math.max(0, Math.floor(durationSec))}
                tabIndex={seekDisabled ? -1 : 0}
                className={cn(
                  "relative h-1 flex-1 rounded-full bg-white/12",
                  seekDisabled || durationSec <= 0 ? "cursor-not-allowed opacity-40" : "cursor-pointer"
                )}
                onClick={onSeekClick}
                onKeyDown={(e) => {
                  if (seekDisabled || durationSec <= 0) return;
                  const step = Math.max(5, durationSec * 0.02);
                  if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    onSeek(Math.max(0, currentSec - step));
                  } else if (e.key === "ArrowRight") {
                    e.preventDefault();
                    onSeek(Math.min(durationSec, currentSec + step));
                  }
                }}
              >
                <motion.div
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{ width: `${pct}%`, background: fill }}
                  transition={{ duration: 0.35 }}
                />
              </div>
              <span className="w-9 shrink-0 text-right tabular-nums text-[10px] text-white/45 sm:text-[11px]">
                {fmtSec(durationSec)}
              </span>
            </div>
          </div>

          {/* Volume + shuffle */}
          <div className="flex flex-[0.75] items-center justify-end gap-2 sm:gap-3">
            {showShuffle && (
              <button
                type="button"
                title={shuffleTitle}
                onClick={onShuffle}
                disabled={shuffleDisabled}
                className="rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
                aria-label="Shuffle"
              >
                <Shuffle className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onToggleMute}
              className="shrink-0 rounded-full p-1.5 text-white/45 hover:bg-white/10 hover:text-white/85"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <div
              className="relative h-1 w-14 cursor-pointer rounded-full bg-white/12 sm:w-24"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                onVolume(Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 100));
              }}
              role="presentation"
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${muted ? 0 : volume}%`,
                  background: fill,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
