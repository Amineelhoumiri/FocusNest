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
  playerVars?: {
    autoplay?: number;
    controls?: number;
    playsinline?: number;
    rel?: number;
    modestbranding?: number;
  };
  events?: {
    onReady?: (e: { target: YTPlayer }) => void;
    onStateChange?: (e: { data: number; target: YTPlayer }) => void;
    onError?: (e: { data: number; target: YTPlayer }) => void;
  };
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo?(): void;
  nextVideo(): void;
  previousVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  getDuration(): number;
  getCurrentTime(): number;
  getVideoData(): { title: string; video_id: string; author: string };
  getIframe?(): HTMLIFrameElement;
  loadPlaylist(opts: { listType: string; list: string; index?: number; startSeconds?: number }): void;
  cuePlaylist?(opts: { listType: string; list: string; index?: number; startSeconds?: number }): void;
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
const VIDEOSERIES_IFRAME_ID = "yt-videoseries-fallback";

let globalYouTubePlayer: YTPlayer | null = null;
let bridgeActive = false;
/** IFrame API path failed — audio comes from a hidden embed/videoseries iframe instead. */
let embedPlaylistActive = false;
let lastVideoseriesUrl: string | null = null;

function clearVideoseriesFallback() {
  const el = document.getElementById(VIDEOSERIES_IFRAME_ID) as HTMLIFrameElement | null;
  if (el) {
    el.src = "about:blank";
  }
  embedPlaylistActive = false;
  lastVideoseriesUrl = null;
}

function startVideoseriesFallback(playlistId: string) {
  const base = "https://www.youtube.com/embed/videoseries";
  const u = new URL(base);
  u.searchParams.set("list", playlistId);
  u.searchParams.set("autoplay", "1");
  u.searchParams.set("playsinline", "1");
  u.searchParams.set("modestbranding", "1");
  u.searchParams.set("rel", "0");
  const url = u.toString();
  lastVideoseriesUrl = url;
  let el = document.getElementById(VIDEOSERIES_IFRAME_ID) as HTMLIFrameElement | null;
  if (!el) {
    el = document.createElement("iframe");
    el.id = VIDEOSERIES_IFRAME_ID;
    el.setAttribute("title", "YouTube playlist (fallback)");
    el.style.cssText =
      "position:fixed;left:-9999px;width:1px;height:1px;border:0;pointer-events:none;opacity:0;";
    el.allow = "autoplay; encrypted-media; fullscreen";
    document.body.appendChild(el);
  }
  el.src = url;
  embedPlaylistActive = true;
  if (import.meta.env.DEV) {
    console.warn("[FocusNest YT] Using videoseries embed fallback for playlist (IFrame loadPlaylist path unavailable or failed).");
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useYouTubePlayer() {
  const [playerState, setPlayerState] = useState<YouTubePlayerState | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setPlayerStateRef = useRef(setPlayerState);
  const setErrorRef         = useRef(setError);
  setPlayerStateRef.current = setPlayerState;
  setErrorRef.current       = setError;

  const playerRef   = useRef<YTPlayer | null>(null);
  const mountedRef  = useRef(true);
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const playlistRef = useRef<string | null>(null);
  const wantsPlaybackRef = useRef(false);
  const apiReadyRef    = useRef(false);
  const pendingPlayRef = useRef<string | null>(null);

  const isSafari = useCallback(() => {
    const ua = navigator.userAgent;
    return /Safari/i.test(ua) && !/Chrome|Chromium|Android/i.test(ua);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(() => {
      if (!bridgeActive || !globalYouTubePlayer || embedPlaylistActive) return;
      try {
        const data = globalYouTubePlayer.getVideoData();
        setPlayerStateRef.current((prev) =>
          prev ? {
            ...prev,
            currentTime: globalYouTubePlayer!.getCurrentTime(),
            duration:    globalYouTubePlayer!.getDuration(),
            title:       data?.title  || prev.title,
            author:      data?.author || prev.author,
            videoId:     data?.video_id || prev.videoId,
          } : null
        );
      } catch { /* */ }
    }, 500);
  }, []);

  const applyPlaylistLoad = useCallback((rawId: string) => {
    const p = globalYouTubePlayer;
    if (!p) return;
    setErrorRef.current(null);
    wantsPlaybackRef.current = true;

    let id = rawId.trim();
    if (id.includes("youtube.com") || id.includes("youtu.be")) {
      try {
        const url = new URL(id);
        id = url.searchParams.get("list") ?? url.searchParams.get("v") ?? id;
        if (!url.searchParams.get("list") && !url.searchParams.get("v")) {
          id = url.pathname.replace("/", "");
        }
      } catch { /* */ }
    }

    playlistRef.current = id;
    const isVideoId = /^[A-Za-z0-9_-]{11}$/.test(id);

    if (isVideoId) {
      clearVideoseriesFallback();
      if (typeof p.loadVideoById !== "function") return;
      p.loadVideoById(id);
      try { p.playVideo(); } catch { /* */ }
      return;
    }

    // Playlist — always use the videoseries embed (loadPlaylist is unreliable in embedded players)
    try { p.stopVideo?.(); } catch { /* */ }
    startVideoseriesFallback(id);
    setPlayerStateRef.current({
      isPlaying: true,
      title:       "Radio / playlist (simple playback)",
      author:      "YouTube",
      videoId:     null,
      playlistId:  id,
      currentTime: 0,
      duration:    0,
    });
  }, []);

  const applyPlaylistLoadRef = useRef(applyPlaylistLoad);
  applyPlaylistLoadRef.current = applyPlaylistLoad;

  useEffect(() => {
    mountedRef.current = true;
    bridgeActive = true;

    const connectExisting = () => {
      if (globalYouTubePlayer) {
        playerRef.current = globalYouTubePlayer;
        apiReadyRef.current = true;
        setReady(true);
        const pending = pendingPlayRef.current;
        if (pending) {
          pendingPlayRef.current = null;
          applyPlaylistLoadRef.current(pending);
        }
      }
    };

    if (globalYouTubePlayer) {
      connectExisting();
    } else {
      if (!document.getElementById(PLAYER_DIV_ID)) {
        // Use an <iframe> (not <div>) so the allow="autoplay" attribute is present
        // BEFORE the YT API sets the src — Chrome requires this for autoplay permission.
        const iframe = document.createElement("iframe");
        iframe.id = PLAYER_DIV_ID;
        iframe.allow = "autoplay; encrypted-media";
        iframe.style.cssText =
          "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;pointer-events:none;border:0;";
        document.body.appendChild(iframe);
      }

      const initPlayer = () => {
        if (globalYouTubePlayer) {
          connectExisting();
          return;
        }
        if (!bridgeActive) return;

        new window.YT.Player(PLAYER_DIV_ID, {
          height: 1,
          width: 1,
          playerVars: { autoplay: 0, controls: 0, playsinline: 1, rel: 0, modestbranding: 1 },
          events: {
            onReady: (ev) => {
              const pl = ev.target;
              globalYouTubePlayer = pl;
              playerRef.current = pl;
              apiReadyRef.current = true;
              try {
                const ifr = pl.getIframe?.();
                ifr?.setAttribute("allow", "autoplay; encrypted-media");
              } catch { /* */ }
              setReady(true);
              const pending = pendingPlayRef.current;
              if (pending) {
                pendingPlayRef.current = null;
                applyPlaylistLoadRef.current(pending);
              }
            },
            onStateChange: (e) => {
              if (!bridgeActive || embedPlaylistActive) return;
              const { PLAYING, ENDED, CUED } = window.YT.PlayerState;
              const isPlaying = e.data === PLAYING;
              const isEnded   = e.data === ENDED;

              if (e.data === CUED && wantsPlaybackRef.current && isSafari()) {
                setTimeout(() => {
                  try { globalYouTubePlayer?.playVideo(); } catch { /* */ }
                }, 0);
              }

              if (isPlaying) startPolling(); else stopPolling();
              if (isPlaying) wantsPlaybackRef.current = false;
              if (isEnded) { setPlayerStateRef.current(null); return; }

              try {
                const data = e.target.getVideoData();
                setPlayerStateRef.current({
                  isPlaying,
                  title:       data?.title    || null,
                  author:      data?.author   || null,
                  videoId:     data?.video_id || null,
                  playlistId:  playlistRef.current,
                  currentTime: e.target.getCurrentTime(),
                  duration:    e.target.getDuration(),
                });
              } catch { /* */ }
            },
            onError: (e) => {
              console.error("YouTube player error code:", e.data);
              const msg =
                e.data === 150 || e.data === 101
                  ? "This video doesn't allow embedding — try a different playlist."
                  : e.data === 5
                    ? "HTML5 player error — try a different video."
                    : `Playback error (code ${e.data}) — check the playlist ID.`;
              if (bridgeActive) setErrorRef.current(msg);
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
    }

    return () => {
      mountedRef.current = false;
      bridgeActive = false;
      apiReadyRef.current = false;
      pendingPlayRef.current = null;
      stopPolling();
    };
  }, [startPolling, stopPolling, isSafari]);

  const playPlaylist = useCallback(
    (rawId: string) => {
      if (!globalYouTubePlayer && !playerRef.current) {
        throw new Error("Player not ready");
      }
      if (!apiReadyRef.current) {
        pendingPlayRef.current = rawId;
        return;
      }
      applyPlaylistLoad(rawId);
    },
    [applyPlaylistLoad]
  );

  const pause = useCallback(() => {
    wantsPlaybackRef.current = false;
    if (embedPlaylistActive) {
      clearVideoseriesFallback();
      setPlayerStateRef.current(null);
      return;
    }
    globalYouTubePlayer?.pauseVideo();
  }, []);

  const resume = useCallback(() => {
    wantsPlaybackRef.current = true;
    if (embedPlaylistActive && lastVideoseriesUrl) {
      const el = document.getElementById(VIDEOSERIES_IFRAME_ID) as HTMLIFrameElement | null;
      if (el) {
        el.src = lastVideoseriesUrl;
        setPlayerStateRef.current((s) => (s ? { ...s, isPlaying: true } : s));
      }
      return;
    }
    globalYouTubePlayer?.playVideo();
  }, []);

  const nextTrack = useCallback(() => {
    if (embedPlaylistActive) return;
    globalYouTubePlayer?.nextVideo();
  }, []);
  const prevTrack = useCallback(() => {
    if (embedPlaylistActive) return;
    globalYouTubePlayer?.previousVideo();
  }, []);
  const seek = useCallback((s: number) => {
    if (embedPlaylistActive) return;
    globalYouTubePlayer?.seekTo(s, true);
  }, []);
  const setVolume = useCallback((v: number) => {
    if (embedPlaylistActive) return;
    globalYouTubePlayer?.setVolume(v * 100);
  }, []);

  return { playerState, ready, error, playPlaylist, pause, resume, nextTrack, prevTrack, seek, setVolume };
}
