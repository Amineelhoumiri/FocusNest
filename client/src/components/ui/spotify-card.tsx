import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, Heart, Plus, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Song {
  title: string;
  artists: string;
  duration: number;
  albumArt: string;
}

/** When provided, Web Playback SDK (or parent) drives transport + progress */
export interface SpotifyCardPlayback {
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  title: string;
  artists: string;
  albumArt: string;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeekPercent: (percent: number) => void;
  volume01: number;
  onVolume01: (v: number) => void;
}

interface SpotifyCardProps {
  songs: Song[];
  playback?: SpotifyCardPlayback | null;
  className?: string;
}

export function SpotifyCard({ songs, playback, className }: SpotifyCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [volume, setVolume] = useState(75);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  const cardRef = useRef<HTMLDivElement>(null);
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const demoSong = songs[currentSongIndex] ?? {
    title: "Nothing playing",
    artists: "Spotify",
    duration: 180,
    albumArt:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&h=400&q=80",
  };

  const display = useMemo(() => {
    if (playback) {
      return {
        title: playback.title,
        artists: playback.artists,
        albumArt: playback.albumArt,
        duration: Math.max(playback.durationSec, 1),
      };
    }
    return {
      title: demoSong.title,
      artists: demoSong.artists,
      albumArt: demoSong.albumArt,
      duration: demoSong.duration,
    };
  }, [playback, demoSong]);

  const effectivePlaying = playback ? playback.isPlaying : isPlaying;
  const progressPct = playback && playback.durationSec > 0
    ? Math.min(100, (playback.positionSec / playback.durationSec) * 100)
    : animationProgress;

  useEffect(() => {
    if (playback) {
      setVolume(Math.round(playback.volume01 * 100));
      setIsMuted(playback.volume01 === 0);
    }
  }, [playback?.volume01, playback]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNextSong = useCallback(() => {
    if (playback) {
      playback.onNext();
      return;
    }
    const next = (currentSongIndex + 1) % Math.max(songs.length, 1);
    setCurrentSongIndex(next);
    setAnimationProgress(0);
    if (!isPlaying) setIsPlaying(true);
  }, [playback, currentSongIndex, songs.length, isPlaying]);

  useEffect(() => {
    if (playback || !isPlaying || isDraggingProgress) return;
    const songDuration = demoSong.duration;
    const id = window.setInterval(() => {
      setAnimationProgress((prev) => {
        if (prev >= 100) {
          handleNextSong();
          return 0;
        }
        return prev + 100 / (songDuration * 10);
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [playback, isPlaying, isDraggingProgress, demoSong.duration, handleNextSong]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handleVolumeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDraggingVolume(true);
    if (playback) {
      const rect = volumeBarRef.current?.getBoundingClientRect();
      if (rect) {
        let pct = ((e.clientX - rect.left) / rect.width) * 100;
        pct = Math.max(0, Math.min(100, pct));
        setVolume(pct);
        setIsMuted(pct === 0);
        playback.onVolume01(pct / 100);
      }
    } else {
      handleVolumeChange(e);
    }

    const onMove = (ev: MouseEvent) => {
      if (!volumeBarRef.current) return;
      const rect = volumeBarRef.current.getBoundingClientRect();
      let pct = ((ev.clientX - rect.left) / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      setVolume(pct);
      setIsMuted(pct === 0);
      if (playback) playback.onVolume01(pct / 100);
    };
    const onUp = () => {
      setIsDraggingVolume(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const handleVolumeChange = (e: MouseEvent | React.MouseEvent) => {
    if (!volumeBarRef.current || playback) return;
    const rect = volumeBarRef.current.getBoundingClientRect();
    let newVolume = ((e.clientX - rect.left) / rect.width) * 100;
    newVolume = Math.max(0, Math.min(100, newVolume));
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDraggingProgress(true);
    if (playback) {
      const rect = progressBarRef.current?.getBoundingClientRect();
      if (rect) {
        let pct = ((e.clientX - rect.left) / rect.width) * 100;
        pct = Math.max(0, Math.min(100, pct));
        playback.onSeekPercent(pct);
      }
    } else {
      handleProgressChange(e);
    }

    const onMove = (ev: MouseEvent) => {
      if (!progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      let pct = ((ev.clientX - rect.left) / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      if (playback) playback.onSeekPercent(pct);
      else setAnimationProgress(pct);
    };
    const onUp = () => {
      setIsDraggingProgress(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const handleProgressChange = (e: MouseEvent | React.MouseEvent) => {
    if (!progressBarRef.current || playback) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    let newProgress = ((e.clientX - rect.left) / rect.width) * 100;
    newProgress = Math.max(0, Math.min(100, newProgress));
    setAnimationProgress(newProgress);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playback) {
      if (isMuted || volume === 0) {
        const next = volume === 0 ? 75 : volume;
        setIsMuted(false);
        setVolume(next);
        playback.onVolume01(next / 100);
      } else {
        setIsMuted(true);
        playback.onVolume01(0);
      }
      return;
    }
    if (isMuted) {
      setIsMuted(false);
      setVolume(volume === 0 ? 75 : volume);
    } else {
      setIsMuted(true);
    }
  };

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (playback) {
      playback.onTogglePlay();
      return;
    }
    setIsPlaying(!isPlaying);
  };

  const handlePreviousSong = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (playback) {
      playback.onPrev();
      return;
    }
    const next = currentSongIndex === 0 ? Math.max(songs.length - 1, 0) : currentSongIndex - 1;
    setCurrentSongIndex(next);
    setAnimationProgress(0);
    if (!isPlaying) setIsPlaying(true);
  };

  const handleNextSongClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    handleNextSong();
  };

  const formatTime = (seconds: number): string => {
    const s = Math.max(0, seconds);
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentTimeSec = playback
    ? playback.positionSec
    : (animationProgress / 100) * display.duration;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu(true);
  };

  const VolumeIcon = () => {
    if (isMuted || volume === 0) {
      return <Volume2 size={16} className="text-gray-400 opacity-50" />;
    }
    return <Volume2 size={16} className="text-gray-400" />;
  };

  return (
    <div
      ref={cardRef}
      className={cn(
        "spotify-card-root w-full max-w-sm rounded-2xl overflow-hidden relative mx-auto select-none",
        className
      )}
      style={{
        background: "linear-gradient(180deg, rgba(5,18,11,0.96) 0%, rgba(2,7,4,0.98) 100%)",
        border: "1px solid rgba(30,215,96,0.14)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 0 80px -20px rgba(29,185,84,0.16)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowContextMenu(false); }}
      onMouseMove={handleMouseMove}
      onContextMenu={handleContextMenu}
    >
      {/* Ambient background from album art */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${display.albumArt})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(50px) saturate(2)",
          transform: "scale(1.6)",
          opacity: effectivePlaying ? 0.18 : 0.08,
          transition: "opacity 1s ease",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(3,12,7,0.82) 0%, rgba(2,6,4,0.94) 100%)" }}
      />

      {/* Mouse-follow glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(30,215,96,0.08) 0%, transparent 55%)`,
          opacity: isHovered ? 1 : 0,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4 p-5">

        {/* Spotify badge */}
        <div className="flex items-center gap-1.5 self-start">
          <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: "#1ED760", flexShrink: 0 }}>
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", color: "#1ED760", textTransform: "uppercase" }}>
            Spotify
          </span>
        </div>

        {/* Album art */}
        <div className="relative">
          <motion.div
            animate={effectivePlaying ? { scale: [1, 1.02, 1] } : { scale: 1 }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                width: 200,
                height: 200,
                boxShadow: isHovered
                  ? "0 20px 48px rgba(0,0,0,0.5), 0 0 14px rgba(30,215,96,0.22)"
                  : "0 12px 36px rgba(0,0,0,0.45)",
                transition: "box-shadow 0.6s ease",
              }}
            >
              <img
                src={display.albumArt}
                alt=""
                className="w-full h-full object-cover transition-transform duration-700"
                style={{ transform: isHovered ? "scale(1.03)" : "scale(1)" }}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>

          {/* Pulsing ring when playing */}
          <AnimatePresence>
            {effectivePlaying && (
              <motion.div
                key="ring"
                className="absolute pointer-events-none rounded-[20px]"
                style={{ inset: -5, border: "1.5px solid rgba(30,215,96,0.45)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* EQ + track info */}
        <div className="w-full text-center space-y-1.5">
          <div className="flex items-end justify-center gap-[3px] h-[16px]">
            {effectivePlaying ? (
              [0, 0.18, 0.36, 0.54, 0.72].map((delay, i) => (
                <motion.div
                  key={i}
                  style={{ width: 3, borderRadius: 999, background: "#1ED760", minHeight: 3 }}
                  animate={{ height: ["3px", "16px", "5px", "13px", "3px"] }}
                  transition={{ duration: 1.4, delay, repeat: Infinity, ease: "easeInOut" }}
                />
              ))
            ) : (
              [0, 1, 2, 3, 4].map((i) => (
                <div key={i} style={{ width: 3, height: 4, borderRadius: 999, background: "#1ED760", opacity: 0.22 }} />
              ))
            )}
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.93)", lineHeight: 1.3 }}
            className="truncate px-2">
            {display.title}
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.44)" }} className="truncate px-2">
            {display.artists}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full space-y-1">
          <div
            ref={progressBarRef}
            className="w-full rounded-full cursor-pointer relative overflow-hidden"
            style={{ height: 6, background: "rgba(255,255,255,0.10)" }}
            onMouseDown={handleProgressMouseDown}
          >
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, rgba(30,215,96,0.8), #1ED760)",
                boxShadow: "0 0 6px rgba(30,215,96,0.40)",
              }}
            />
          </div>
          <div className="flex justify-between tabular-nums" style={{ fontSize: 10, color: "rgba(255,255,255,0.32)" }}>
            <span>{formatTime(currentTimeSec)}</span>
            <span>{formatTime(display.duration)}</span>
          </div>
        </div>

        {/* Transport controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center justify-center w-11 h-11 rounded-xl transition-colors duration-200 hover:bg-white/10 cursor-pointer"
            style={{ color: "rgba(255,255,255,0.62)" }}
            onClick={() => handlePreviousSong()}
          >
            <SkipBack size={18} />
          </button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={togglePlay}
            className="flex items-center justify-center w-14 h-14 rounded-[18px] cursor-pointer"
            style={{
              background: "#1DB954",
              boxShadow: "0 10px 32px rgba(29,185,84,0.50)",
              border: "none",
              color: "#000",
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {effectivePlaying ? (
                <motion.span key="pause" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.12 }} className="flex items-center justify-center">
                  <Pause size={22} className="text-black" />
                </motion.span>
              ) : (
                <motion.span key="play" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.12 }} className="flex items-center justify-center">
                  <Play size={22} className="text-black ml-0.5" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <button
            type="button"
            className="flex items-center justify-center w-11 h-11 rounded-xl transition-colors duration-200 hover:bg-white/10 cursor-pointer"
            style={{ color: "rgba(255,255,255,0.62)" }}
            onClick={() => handleNextSongClick()}
          >
            <SkipForward size={18} />
          </button>

          <button
            type="button"
            className="flex items-center justify-center w-11 h-11 rounded-xl transition-colors duration-200 hover:bg-white/10 cursor-pointer"
            style={{ color: isLiked ? "#1ED760" : "rgba(255,255,255,0.40)" }}
            onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked); }}
            aria-label={isLiked ? "Unlike" : "Like"}
          >
            <Heart size={18} fill={isLiked ? "#1ED760" : "none"} stroke={isLiked ? "#1ED760" : "currentColor"} />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2.5 w-full">
          <button
            type="button"
            onClick={toggleMute}
            className="shrink-0 cursor-pointer transition-colors hover:text-white/75"
            style={{ color: "rgba(255,255,255,0.42)" }}
          >
            <VolumeIcon />
          </button>
          <div
            ref={volumeBarRef}
            className="flex-1 rounded-full cursor-pointer relative"
            style={{ height: 6, background: "rgba(255,255,255,0.14)" }}
            onMouseDown={handleVolumeMouseDown}
          >
            <div
              className="h-full rounded-full transition-colors duration-300"
              style={{
                width: `${isMuted ? 0 : volume}%`,
                background: isHovered || isDraggingVolume ? "#1DB954" : "rgba(255,255,255,0.55)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Context menu */}
      {showContextMenu && (
        <div
          ref={contextMenuRef}
          className="absolute right-4 bottom-24 rounded-xl overflow-hidden border border-white/10 z-30"
          style={{
            width: 190,
            background: "rgba(10,30,18,0.96)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          }}
        >
          <div className="py-1.5">
            <button type="button" className="w-full text-left px-4 py-2.5 text-sm text-white/85 hover:bg-green-900/40 transition-colors flex items-center gap-3">
              <Heart size={14} fill={isLiked ? "rgba(30,215,96,0.7)" : "none"} stroke={isLiked ? "#1ED760" : "currentColor"} />
              <span className="font-medium">{isLiked ? "Remove from Liked" : "Add to Liked"}</span>
            </button>
            <button type="button" className="w-full text-left px-4 py-2.5 text-sm text-white/85 hover:bg-green-900/40 transition-colors flex items-center gap-3">
              <Plus size={14} />
              <span className="font-medium">Add to playlist</span>
            </button>
            <div className="h-px bg-white/[0.07] my-1" />
            <button type="button" className="w-full text-left px-4 py-2.5 text-sm text-white/85 hover:bg-green-900/40 transition-colors flex items-center gap-3" onClick={() => handleNextSongClick()}>
              <SkipForward size={14} />
              <span className="font-medium">Next in queue</span>
            </button>
            <button type="button" className="w-full text-left px-4 py-2.5 text-sm text-white/85 hover:bg-green-900/40 transition-colors flex items-center gap-3" onClick={() => handlePreviousSong()}>
              <SkipBack size={14} />
              <span className="font-medium">Previous in queue</span>
            </button>
          </div>
        </div>
      )}

      {/* Hover border glow */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-700"
        style={{ border: "1px solid rgba(30,215,96,0.28)", opacity: isHovered ? 1 : 0 }}
      />
    </div>
  );
}
