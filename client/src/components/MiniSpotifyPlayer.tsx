// MiniMusicPlayer — compact ambient music strip using YouTube IFrame API.
// overlay={true} → absolute bottom-left corner inside the immersive timer overlay.
// overlay={false} (default) → card section in the idle phase.

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, Music2, ListMusic, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { useYouTubePlayback } from "@/context/YouTubePlaybackContext";
import MusicPlayerCard from "@/components/ui/music-player-card";

interface CuratedPlaylist {
  id: number;
  youtube_playlist_id: string;
  name: string;
  description?: string;
  image_url?: string;
}

interface Props {
  overlay?: boolean;
}

const ytThumb = (videoId: string | null) =>
  videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;

const MiniMusicPlayer = ({ overlay = false }: Props) => {
  const { playerState, ready, error, pause, resume, nextTrack, prevTrack, playPlaylist } =
    useYouTubePlayback();

  const [curated, setCurated]       = useState<CuratedPlaylist[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);

  useEffect(() => {
    fetch("/api/music/curated", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCurated(Array.isArray(d) ? d : []))
      .catch(() => setCurated([]));
  }, []);

  const handlePlay = useCallback(
    async (pl: CuratedPlaylist) => {
      setIsLoading(true);
      setShowPicker(false);
      try {
        playPlaylist(pl.youtube_playlist_id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Playback failed");
      } finally {
        setIsLoading(false);
      }
    },
    [playPlaylist]
  );

  const handleRandom = useCallback(async () => {
    if (!curated.length) return;
    const pl = curated[Math.floor(Math.random() * curated.length)];
    await handlePlay(pl);
  }, [curated, handlePlay]);

  const isPlaying = playerState?.isPlaying ?? false;
  const thumbUrl  = ytThumb(playerState?.videoId ?? null);

  if (error) return null;

  // ── Overlay (immersive timer) mode ────────────────────────────────────────
  if (overlay) {
    return (
      <div className="absolute bottom-8 left-8 flex flex-col items-start gap-2">
        {/* Playlist picker (above the strip) */}
        <AnimatePresence>
          {showPicker && curated.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="rounded-xl overflow-hidden max-h-44 overflow-y-auto w-52"
              style={{
                background: "hsl(var(--card) / 0.92)",
                border: "1px solid hsl(var(--border) / 0.3)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 32px hsl(0 0% 0% / 0.18)",
              }}
            >
              <div className="p-1.5">
                {curated.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => handlePlay(pl)}
                    className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-foreground/65
                      hover:text-foreground/90 hover:bg-primary/10 transition-all duration-200 truncate"
                  >
                    {pl.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compact strip */}
        <div className="flex items-center gap-2">
          {thumbUrl ? (
            <img src={thumbUrl} alt="" className="w-7 h-7 rounded-md object-cover" style={{ opacity: 0.75 }} />
          ) : (
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center"
              style={{ background: "hsl(var(--primary) / 0.1)" }}
            >
              <Music2 className="w-3 h-3" style={{ color: "hsl(var(--primary) / 0.45)" }} />
            </div>
          )}

          {playerState?.title ? (
            <span className="text-[10px] text-foreground/50 truncate max-w-[96px] leading-tight">
              {playerState.title}
            </span>
          ) : (
            <span className="text-[10px] tracking-widest uppercase" style={{ color: "hsl(var(--muted-foreground) / 0.35)" }}>
              {ready ? "no music" : "…"}
            </span>
          )}

          <div className="flex items-center gap-0.5">
            {playerState && (
              <button
                onClick={() => prevTrack()}
                className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: "hsl(var(--muted-foreground) / 0.35)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(var(--foreground) / 0.65)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(var(--muted-foreground) / 0.35)")}
              >
                <SkipBack className="w-3 h-3" />
              </button>
            )}

            <button
              onClick={() => (isPlaying ? pause() : playerState ? resume() : handleRandom())}
              disabled={isLoading}
              className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40"
              style={{ color: "hsl(var(--muted-foreground) / 0.45)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(var(--foreground) / 0.75)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(var(--muted-foreground) / 0.45)")}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>

            {playerState && (
              <button
                onClick={() => nextTrack()}
                className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: "hsl(var(--muted-foreground) / 0.35)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(var(--foreground) / 0.65)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(var(--muted-foreground) / 0.35)")}
              >
                <SkipForward className="w-3 h-3" />
              </button>
            )}

            {curated.length > 0 && (
              <button
                onClick={() => setShowPicker((p) => !p)}
                className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: showPicker ? "hsl(var(--primary) / 0.6)" : "hsl(var(--muted-foreground) / 0.3)" }}
                onMouseEnter={(e) =>
                  !showPicker && (e.currentTarget.style.color = "hsl(var(--foreground) / 0.6)")
                }
                onMouseLeave={(e) =>
                  !showPicker && (e.currentTarget.style.color = "hsl(var(--muted-foreground) / 0.3)")
                }
              >
                <ListMusic className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Idle / full mode ──────────────────────────────────────────────────────
  return (
    <div className="mt-5">
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Music2 className="w-3 h-3 text-muted-foreground/40" />
          <span className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.14em] font-medium">
            focus music
          </span>
        </div>

        <MusicPlayerCard
          title={playerState?.title ?? (ready ? "Nothing playing" : "Loading player…")}
          artist={playerState?.author ?? null}
          artworkUrl={thumbUrl}
          isPlaying={isPlaying}
          onPrev={playerState ? () => prevTrack() : undefined}
          onNext={playerState ? () => nextTrack() : undefined}
          onTogglePlay={() => (isPlaying ? pause() : playerState ? resume() : handleRandom())}
          onRadar={curated.length > 0 ? () => setShowPicker((p) => !p) : undefined}
        />

        {!playerState && curated.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleRandom}
              disabled={!ready || isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all duration-300 disabled:opacity-40"
              style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary) / 0.85)" }}
            >
              <Shuffle className="w-3 h-3" />
              Random playlist
            </button>
            <button
              onClick={() => setShowPicker((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium text-muted-foreground/55 hover:text-foreground/70 border border-border/40 transition-all duration-300"
            >
              <ListMusic className="w-3 h-3" />
              Choose playlist
            </button>
          </div>
        )}
      </div>

        {/* Expandable playlist picker */}
        <AnimatePresence>
          {showPicker && curated.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden border-t border-border/25"
            >
              <div className="p-2">
                {curated.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => { handlePlay(pl); setShowPicker(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-primary/[0.04] transition-colors duration-200"
                  >
                    {pl.image_url ? (
                      <img src={pl.image_url} alt="" className="w-8 h-8 rounded-lg shrink-0" style={{ opacity: 0.85 }} />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                        style={{ background: "hsl(var(--primary) / 0.1)" }}
                      >
                        <Music2 className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary) / 0.5)" }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground/75 font-light truncate">{pl.name}</p>
                      {pl.description && (
                        <p className="text-[10px] text-muted-foreground/45 truncate">{pl.description}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
};

export default MiniMusicPlayer;
