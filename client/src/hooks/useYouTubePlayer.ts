import { useState, useEffect, useRef, useCallback } from "react";

// ─── YouTube IFrame API types ─────────────────────────────────────────────────

declare global {
  interface Window {
    YT: {
      Player: new (elementId: string, options: YTPlayerOptions) => YTPlayer;
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayerOptions {
  height?: number;
  width?: number;
  playerVars?: { autoplay?: number; controls?: number };
  events?: {
    onReady?: () => void;
    onStateChange?: (e: { data: number; target: YTPlayer }) => void;
    onError?: (e: { data: number }) => void;
  };
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  nextVideo(): void;
  previousVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  getDuration(): number;
  getCurrentTime(): number;
  getVideoData(): { title: string; video_id: string; author: string };
  loadPlaylist(opts: { listType: string; list: string; index?: number; startSeconds?: number }): void;
  loadVideoById(videoId: string): void;
  destroy(): void;
}

export interface YouTubePlayerState {
  isPlaying: boolean;
  title: string | null;
  author: string | null;
  videoId: string | null;
  playlistId: string | null;
  currentTime: number;
  duration: number;
}

const PLAYER_DIV_ID = "yt-player-hidden";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useYouTubePlayer() {
  const [playerState, setPlayerState] = useState<YouTubePlayerState | null>(null);
  const [ready, setReady]             = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const playerRef   = useRef<YTPlayer | null>(null);
  const mountedRef  = useRef(true);
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const playlistRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(() => {
      if (!playerRef.current || !mountedRef.current) return;
      try {
        const data = playerRef.current.getVideoData();
        setPlayerState((prev) =>
          prev ? {
            ...prev,
            currentTime: playerRef.current!.getCurrentTime(),
            duration:    playerRef.current!.getDuration(),
            title:       data?.title  || prev.title,
            author:      data?.author || prev.author,
            videoId:     data?.video_id || prev.videoId,
          } : null
        );
      } catch { /* player may not be fully ready */ }
    }, 500);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Ensure hidden player container div exists
    if (!document.getElementById(PLAYER_DIV_ID)) {
      const div = document.createElement("div");
      div.id = PLAYER_DIV_ID;
      div.style.cssText =
        "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;bottom:0;right:0;overflow:hidden;";
      document.body.appendChild(div);
    }

    const initPlayer = () => {
      if (!mountedRef.current) return;
      playerRef.current = new window.YT.Player(PLAYER_DIV_ID, {
        height: 1,
        width: 1,
        playerVars: { autoplay: 0, controls: 0 },
        events: {
          onReady: () => {
            if (mountedRef.current) setReady(true);
          },
          onStateChange: (e) => {
            if (!mountedRef.current) return;
            const { PLAYING, ENDED } = window.YT.PlayerState;
            const isPlaying = e.data === PLAYING;
            const isEnded   = e.data === ENDED;

            if (isPlaying) startPolling(); else stopPolling();

            if (isEnded) { setPlayerState(null); return; }

            try {
              const data = e.target.getVideoData();
              setPlayerState({
                isPlaying,
                title:       data?.title    || null,
                author:      data?.author   || null,
                videoId:     data?.video_id || null,
                playlistId:  playlistRef.current,
                currentTime: e.target.getCurrentTime(),
                duration:    e.target.getDuration(),
              });
            } catch { /* ignore */ }
          },
          onError: (e) => {
            console.error("YouTube player error:", e.data);
            if (mountedRef.current) setError("Playback error — check the playlist ID.");
          },
        },
      });
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
      if (!document.getElementById("youtube-iframe-api")) {
        const script = document.createElement("script");
        script.id  = "youtube-iframe-api";
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      mountedRef.current = false;
      stopPolling();
      playerRef.current?.destroy();
      playerRef.current = null;
      document.getElementById(PLAYER_DIV_ID)?.remove();
    };
  }, [startPolling, stopPolling]);

  // ── Controls ────────────────────────────────────────────────────────────────

  const playPlaylist = useCallback((playlistId: string) => {
    if (!playerRef.current) throw new Error("Player not ready");
    playlistRef.current = playlistId;
    // Playlist IDs start with PL, RD, UU, FL, LL, WL — anything else is a video ID
    const isPlaylist = /^(PL|RD|UU|FL|LL|WL)/i.test(playlistId);
    if (isPlaylist) {
      playerRef.current.loadPlaylist({ listType: "playlist", list: playlistId, index: 0, startSeconds: 0 });
    } else {
      (playerRef.current as unknown as { loadVideoById: (id: string) => void }).loadVideoById(playlistId);
    }
  }, []);

  const pause     = useCallback(() => playerRef.current?.pauseVideo(), []);
  const resume    = useCallback(() => playerRef.current?.playVideo(), []);
  const nextTrack = useCallback(() => playerRef.current?.nextVideo(), []);
  const prevTrack = useCallback(() => playerRef.current?.previousVideo(), []);
  const seek      = useCallback((s: number) => playerRef.current?.seekTo(s, true), []);
  const setVolume = useCallback((v: number) => playerRef.current?.setVolume(v * 100), []);

  return { playerState, ready, error, playPlaylist, pause, resume, nextTrack, prevTrack, seek, setVolume };
}
