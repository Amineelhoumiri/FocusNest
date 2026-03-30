import { useState, useEffect, useRef, useCallback } from "react";

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
  const [deviceId, setDeviceId]       = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<SpotifyPlayerState | null>(null);
  const [ready, setReady]             = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const playerRef  = useRef<SpotifySDKPlayer | null>(null);
  const mountedRef = useRef(true);

  // Fetch a fresh (auto-refreshed) access token from the backend
  const fetchToken = useCallback(async (): Promise<string> => {
    const res = await fetch("/api/spotify/token", { credentials: "include" });
    if (!res.ok) throw new Error("Spotify not connected");
    const data = await res.json();
    return data.access_token as string;
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const initPlayer = () => {
      if (!mountedRef.current) return;

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

      player.addListener("not_ready", (({ device_id }: { device_id: string }) => {
        console.warn("Spotify player device went offline:", device_id);
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
  }, [fetchToken]);

  // ── Controls ────────────────────────────────────────────────────────────────

  const pause      = useCallback(() => playerRef.current?.pause(),            []);
  const resume     = useCallback(() => playerRef.current?.resume(),           []);
  const nextTrack  = useCallback(() => playerRef.current?.nextTrack(),        []);
  const prevTrack  = useCallback(() => playerRef.current?.previousTrack(),    []);
  const seek       = useCallback((ms: number) => playerRef.current?.seek(ms), []);
  const setVolume  = useCallback((v: number) => playerRef.current?.setVolume(v), []);

  // Play a playlist on this device via the backend
  const playPlaylist = useCallback(async (contextUri: string) => {
    if (!deviceId) throw new Error("Player not ready");
    const res = await fetch("/api/spotify/play", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context_uri: contextUri, device_id: deviceId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message || "Playback failed");
    }
  }, [deviceId]);

  return { deviceId, playerState, ready, error, pause, resume, nextTrack, prevTrack, seek, setVolume, playPlaylist };
}
