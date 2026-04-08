import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

// ─── Spotify SDK types ────────────────────────────────────────────────────────

declare global {
  interface Window {
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifySDKPlayer;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

interface SpotifySDKPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: string, cb: (data: never) => void): void;
  removeListener(event: string): void;
  getCurrentState(): Promise<SpotifyPlayerState | null>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
}

export interface SpotifyPlayerState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: {
      id: string;
      name: string;
      uri: string;
      duration_ms: number;
      artists: { name: string }[];
      album: { name: string; images: { url: string }[] };
    };
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSpotifyPlayer() {
  const { user } = useAuth();
  const spotifyAllowed = user?.is_consented_spotify === true;

  const [deviceId, setDeviceId]       = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<SpotifyPlayerState | null>(null);
  const [ready, setReady]             = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const playerRef    = useRef<SpotifySDKPlayer | null>(null);
  const deviceIdRef  = useRef<string | null>(null);
  const mountedRef   = useRef(true);

  useEffect(() => {
    deviceIdRef.current = deviceId;
  }, [deviceId]);

  // Fetch a fresh (auto-refreshed) access token from the backend
  const fetchToken = useCallback(async (): Promise<string> => {
    const res = await fetch("/api/spotify/token", { credentials: "include" });
    if (!res.ok) throw new Error("Spotify not connected");
    const data = await res.json();
    return data.access_token as string;
  }, []);

  useEffect(() => {
    if (!spotifyAllowed) {
      mountedRef.current = false;
      playerRef.current?.disconnect();
      playerRef.current = null;
      deviceIdRef.current = null;
      setDeviceId(null);
      setPlayerState(null);
      setReady(false);
      setError(null);
      return;
    }

    mountedRef.current = true;

    const initPlayer = () => {
      if (!mountedRef.current || !spotifyAllowed) return;

      const player = new window.Spotify.Player({
        name: "FocusNest",
        getOAuthToken: (cb) => {
          fetchToken().then(cb).catch(() => cb(""));
        },
        volume: 0.7,
      });

      player.addListener("ready", (({ device_id }: { device_id: string }) => {
        if (!mountedRef.current) return;
        setDeviceId(device_id);
        setReady(true);
        setError(null);
      }) as never);

      player.addListener("not_ready", (() => {
        if (!mountedRef.current) return;
        setReady(false);
      }) as never);

      player.addListener("player_state_changed", ((state: SpotifyPlayerState | null) => {
        if (!mountedRef.current) return;
        setPlayerState(state);
      }) as never);

      player.addListener("initialization_error", (({ message }: { message: string }) => {
        setError("Playback init error: " + message);
      }) as never);

      player.addListener("authentication_error", (({ message }: { message: string }) => {
        setError("Auth error — Spotify Premium is required: " + message);
      }) as never);

      player.addListener("account_error", (() => {
        setError("Spotify Premium is required for in-browser playback.");
      }) as never);

      player.connect();
      playerRef.current = player;
    };

    // If SDK is already loaded (e.g. HMR), init immediately
    if (window.Spotify) {
      initPlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initPlayer;
      if (!document.getElementById("spotify-sdk")) {
        const s = document.createElement("script");
        s.id = "spotify-sdk";
        s.src = "https://sdk.scdn.co/spotify-player.js";
        s.async = true;
        document.body.appendChild(s);
      }
    }

    return () => {
      mountedRef.current = false;
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, [fetchToken, spotifyAllowed]);

  // ── Controls ────────────────────────────────────────────────────────────────

  const pause      = useCallback((): Promise<void> => playerRef.current?.pause()     ?? Promise.resolve(), []);
  const resume     = useCallback((): Promise<void> => playerRef.current?.resume()    ?? Promise.resolve(), []);
  const nextTrack  = useCallback((): Promise<void> => playerRef.current?.nextTrack() ?? Promise.resolve(), []);
  const prevTrack  = useCallback((): Promise<void> => playerRef.current?.previousTrack() ?? Promise.resolve(), []);
  const seek       = useCallback((ms: number): Promise<void> => playerRef.current?.seek(ms) ?? Promise.resolve(), []);
  const setVolume  = useCallback((v: number): Promise<void> => playerRef.current?.setVolume(v) ?? Promise.resolve(), []);

  // Play a playlist via the backend. Waits briefly for the Web Playback SDK device
  // (common right after navigating to focus mode), then falls back to Spotify’s active device.
  const playPlaylist = useCallback(async (contextUri: string) => {
    let dev = deviceIdRef.current;
    if (!dev) {
      for (let i = 0; i < 25; i++) {
        await new Promise((r) => setTimeout(r, 200));
        dev = deviceIdRef.current;
        if (dev) break;
      }
    }

    const res = await fetch("/api/spotify/play", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context_uri: contextUri, device_id: dev ?? null }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message || "Playback failed");
    }
  }, []);

  return { deviceId, playerState, ready, error, pause, resume, nextTrack, prevTrack, seek, setVolume, playPlaylist };
}
