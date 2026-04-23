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
  const wantsPlaybackRef = useRef(false);

  const isSafari = useCallback(() => {
    // iOS Safari and macOS Safari both report "Safari" but not "Chrome"/"Chromium"/"Android".
    const ua = navigator.userAgent;
    return /Safari/i.test(ua) && !/Chrome|Chromium|Android/i.test(ua);
  }, []);

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

    // Use a pre-configured <iframe> instead of a <div> so the allow="autoplay"
    // attribute is already present when YouTube sets the src. Chrome evaluates
    // the Permissions Policy at iframe navigation time — setting it via
    // MutationObserver (after the element is created) is too late for Chrome.
    // Safari also needs the attribute but is more lenient about when it's set.
    if (!document.getElementById(PLAYER_DIV_ID)) {
      const iframe = document.createElement("iframe");
      iframe.id = PLAYER_DIV_ID;
      iframe.allow = "autoplay; encrypted-media";
      iframe.style.cssText =
        "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;pointer-events:none;border:0;";
      document.body.appendChild(iframe);
    }

    const initPlayer = () => {
      if (!mountedRef.current) return;

      playerRef.current = new window.YT.Player(PLAYER_DIV_ID, {
        height: 1,
        width: 1,
        playerVars: { autoplay: 0, controls: 0 },
        events: {
          onReady: () => {
            if (!mountedRef.current) return;
            setReady(true);
          },
          onStateChange: (e) => {
            if (!mountedRef.current) return;
            const { PLAYING, ENDED, CUED } = window.YT.PlayerState;
            const isPlaying = e.data === PLAYING;
            const isEnded   = e.data === ENDED;

            // Safari sometimes gets stuck in CUED after a user gesture; nudge it to start.
            if (e.data === CUED && wantsPlaybackRef.current && isSafari()) {
              setTimeout(() => {
                try {
                  playerRef.current?.playVideo();
                } catch { /* ignore */ }
              }, 0);
            }

            if (isPlaying) startPolling(); else stopPolling();

            if (isPlaying) wantsPlaybackRef.current = false;
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
            console.error("YouTube player error code:", e.data);
            const msg =
              e.data === 150 || e.data === 101
                ? "This video doesn't allow embedding — try a different playlist."
                : e.data === 5
                  ? "HTML5 player error — try a different video."
                  : `Playback error (code ${e.data}) — check the playlist ID.`;
            if (mountedRef.current) setError(msg);
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

  const playPlaylist = useCallback((rawId: string) => {
    if (!playerRef.current) throw new Error("Player not ready");
    setError(null);
    wantsPlaybackRef.current = true;

    // Normalise: extract ID from full YouTube URLs if needed
    let id = rawId.trim();
    if (id.includes("youtube.com") || id.includes("youtu.be")) {
      try {
        const url = new URL(id);
        // Playlist takes priority over video
        id = url.searchParams.get("list") ?? url.searchParams.get("v") ?? id;
        // Short URL: youtu.be/<videoId>
        if (!url.searchParams.get("list") && !url.searchParams.get("v")) {
          id = url.pathname.replace("/", "");
        }
      } catch { /* malformed URL — use as-is */ }
    }

    playlistRef.current = id;
    // YouTube video IDs are exactly 11 base64url chars. Everything else is a playlist ID.
    const isVideoId = /^[A-Za-z0-9_-]{11}$/.test(id);
    if (isVideoId) {
      playerRef.current.loadVideoById(id);
    } else {
      playerRef.current.loadPlaylist({ listType: "playlist", list: id, index: 0, startSeconds: 0 });
    }
    // Safari requires playVideo() to be called synchronously within the user gesture handler.
    // loadPlaylist/loadVideoById alone won't autoplay in Safari — calling playVideo() here
    // grants the player Safari's autoplay permission before the async load completes.
    try { playerRef.current.playVideo(); } catch { /* ignore if player not fully ready */ }
  }, []);

  const pause     = useCallback(() => { wantsPlaybackRef.current = false; playerRef.current?.pauseVideo(); }, []);
  const resume    = useCallback(() => { wantsPlaybackRef.current = true; playerRef.current?.playVideo(); }, []);
  const nextTrack = useCallback(() => playerRef.current?.nextVideo(), []);
  const prevTrack = useCallback(() => playerRef.current?.previousVideo(), []);
  const seek      = useCallback((s: number) => playerRef.current?.seekTo(s, true), []);
  const setVolume = useCallback((v: number) => playerRef.current?.setVolume(v * 100), []);

  return { playerState, ready, error, playPlaylist, pause, resume, nextTrack, prevTrack, seek, setVolume };
}
