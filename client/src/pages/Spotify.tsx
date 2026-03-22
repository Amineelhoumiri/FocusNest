import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Play, Loader2, LogOut, RefreshCw, ListMusic, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

interface NowPlaying {
  playing: boolean;
  track?: {
    name: string;
    artist: string;
    album: string;
    image: string | null;
    duration: number;
    progress: number;
    uri: string;
  };
}

interface Playlist {
  id: string;
  name: string;
  uri: string;
  tracks: number;
  image: string | null;
}

interface Status {
  connected: boolean;
  display_name?: string | null;
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

const ProgressBar = ({ progress, duration }: { progress: number; duration: number }) => {
  const pct = duration > 0 ? Math.min((progress / duration) * 100, 100) : 0;
  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  return (
    <div className="w-full">
      <div className="h-1 rounded-full bg-muted/60 overflow-hidden mb-1">
        <div className="h-full bg-[#1DB954] rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{fmt(progress)}</span>
        <span>{fmt(duration)}</span>
      </div>
    </div>
  );
};

// ─── Not Connected ────────────────────────────────────────────────────────────

const NotConnected = ({ onConnect, isConnecting }: { onConnect: () => void; isConnecting: boolean }) => (
  <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
      <div className="w-20 h-20 rounded-full bg-[#1DB954]/15 flex items-center justify-center mx-auto mb-6">
        <Music className="w-10 h-10 text-[#1DB954]" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Connect Spotify</h2>
      <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
        Link your Spotify account to browse your playlists and play focus music directly from FocusNest during your sessions.
      </p>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onConnect}
        disabled={isConnecting}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1DB954] hover:bg-[#1aa34a] text-black font-semibold mx-auto min-h-[44px] transition-colors disabled:opacity-60"
      >
        {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Music className="w-5 h-5" />}
        {isConnecting ? "Connecting…" : "Connect Spotify"}
      </motion.button>
      <p className="text-xs text-muted-foreground mt-4">
        You'll be redirected to Spotify to approve access.
      </p>
    </motion.div>
  </div>
);

// ─── Connected View ───────────────────────────────────────────────────────────

const ConnectedView = ({
  displayName,
  nowPlaying,
  playlists,
  isLoadingPlaylists,
  isLoadingNow,
  onPlay,
  onDisconnect,
  onRefreshNow,
}: {
  displayName: string | null | undefined;
  nowPlaying: NowPlaying | null;
  playlists: Playlist[];
  isLoadingPlaylists: boolean;
  isLoadingNow: boolean;
  onPlay: (uri: string) => void;
  onDisconnect: () => void;
  onRefreshNow: () => void;
}) => (
  <div className="max-w-4xl mx-auto space-y-6 pb-20">

    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Music className="w-6 h-6 text-[#1DB954]" /> Spotify
        </h1>
        {displayName && (
          <p className="text-sm text-muted-foreground mt-0.5">
            Connected as <span className="text-[#1DB954] font-medium">{displayName}</span>
          </p>
        )}
      </div>
      <button
        onClick={onDisconnect}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors px-3 py-2 rounded-lg hover:bg-destructive/10"
      >
        <LogOut className="w-4 h-4" /> Disconnect
      </button>
    </div>

    {/* Now Playing */}
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Now Playing</h2>
        <button onClick={onRefreshNow} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
          <RefreshCw className={`w-4 h-4 ${isLoadingNow ? "animate-spin" : ""}`} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isLoadingNow ? (
          <div key="loading" className="flex items-center justify-center h-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : nowPlaying?.playing && nowPlaying.track ? (
          <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4">
            {nowPlaying.track.image ? (
              <img src={nowPlaying.track.image} alt={nowPlaying.track.album} className="w-14 h-14 rounded-lg shadow-md object-cover shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-[#1DB954]/20 flex items-center justify-center shrink-0">
                <Music className="w-6 h-6 text-[#1DB954]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{nowPlaying.track.name}</p>
              <p className="text-xs text-muted-foreground truncate">{nowPlaying.track.artist} · {nowPlaying.track.album}</p>
              <div className="mt-2">
                <ProgressBar progress={nowPlaying.track.progress} duration={nowPlaying.track.duration} />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 text-muted-foreground">
            <div className="w-10 h-10 rounded-lg bg-surface-raised flex items-center justify-center">
              <Music className="w-5 h-5 opacity-40" />
            </div>
            <p className="text-sm">Nothing playing right now — pick a playlist below to start.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>

    {/* Playlists */}
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <div className="flex items-center gap-2 mb-4">
        <ListMusic className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Your Playlists</h2>
      </div>

      {isLoadingPlaylists ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-3 animate-pulse">
              <div className="w-full aspect-square rounded-lg bg-surface-raised mb-3" />
              <div className="h-3 bg-surface-raised rounded w-3/4 mb-1" />
              <div className="h-2.5 bg-surface-raised rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <p className="text-muted-foreground text-sm">No playlists found in your Spotify library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {playlists.map((pl) => (
            <motion.div
              key={pl.id}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              className="glass-card rounded-xl p-3 cursor-pointer group transition-colors hover:bg-card/80"
              onClick={() => onPlay(pl.uri)}
            >
              <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-3 bg-surface-raised">
                {pl.image ? (
                  <img src={pl.image} alt={pl.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg">
                    <Play className="w-5 h-5 text-black fill-black" />
                  </div>
                </div>
              </div>
              <p className="text-sm font-medium text-foreground truncate">{pl.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{pl.tracks} tracks</p>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>

    <p className="text-xs text-center text-muted-foreground pt-2 flex items-center justify-center gap-1">
      Playback requires Spotify to be open on a device.
      <a href="https://open.spotify.com" target="_blank" rel="noopener noreferrer" className="text-[#1DB954] hover:underline inline-flex items-center gap-0.5">
        Open Spotify <ExternalLink className="w-3 h-3" />
      </a>
    </p>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const SpotifyPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [status, setStatus] = useState<Status | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [isLoadingNow, setIsLoadingNow] = useState(false);

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  // Handle redirect back from Spotify OAuth
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected === "true") {
      toast.success("Spotify connected successfully!");
      setSearchParams({}, { replace: true });
    } else if (error) {
      const msg =
        error === "access_denied"
          ? "Spotify access denied — make sure your account is added as a test user in the Spotify Dashboard."
          : error === "invalid_client"
          ? "Spotify config error — check that the Redirect URI in your Spotify Dashboard matches exactly."
          : error === "missing_params"
          ? "Spotify callback received no code — check server logs."
          : `Spotify error: ${error}`;
      toast.error(msg, { duration: 8000 });
      setSearchParams({}, { replace: true });
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify/status", { credentials: "include" });
      if (res.ok) setStatus(await res.json());
      else setStatus({ connected: false });
    } catch {
      setStatus({ connected: false });
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  const fetchNowPlaying = useCallback(async () => {
    setIsLoadingNow(true);
    try {
      const res = await fetch("/api/spotify/now-playing", { credentials: "include" });
      if (res.ok) setNowPlaying(await res.json());
    } catch {
      // Silently fail
    } finally {
      setIsLoadingNow(false);
    }
  }, []);

  const fetchPlaylists = useCallback(async () => {
    setIsLoadingPlaylists(true);
    try {
      const res = await fetch("/api/spotify/playlists", { credentials: "include" });
      if (res.ok) setPlaylists(await res.json());
      else toast.error("Failed to load playlists.");
    } catch {
      toast.error("Failed to load playlists.");
    } finally {
      setIsLoadingPlaylists(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  useEffect(() => {
    if (!status?.connected) return;
    fetchNowPlaying();
    fetchPlaylists();
    const interval = setInterval(fetchNowPlaying, 30_000);
    return () => clearInterval(interval);
  }, [status?.connected]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const res = await fetch("/api/spotify/auth", { credentials: "include" });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast.error("Failed to start Spotify connection.");
      setIsConnecting(false);
    }
  };

  const handlePlay = async (contextUri: string) => {
    try {
      const res = await fetch("/api/spotify/play", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context_uri: contextUri }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      setTimeout(fetchNowPlaying, 1500);
    } catch (err: any) {
      toast.error(err.message || "Playback failed. Make sure Spotify is open on a device.");
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/spotify/disconnect", { method: "DELETE", credentials: "include" });
      setStatus({ connected: false });
      setNowPlaying(null);
      setPlaylists([]);
      toast.success("Spotify disconnected.");
    } catch {
      toast.error("Failed to disconnect.");
    }
  };

  if (isLoadingStatus) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1DB954]" />
      </div>
    );
  }

  if (!status?.connected) {
    return <NotConnected onConnect={handleConnect} isConnecting={isConnecting} />;
  }

  return (
    <ConnectedView
      displayName={status.display_name}
      nowPlaying={nowPlaying}
      playlists={playlists}
      isLoadingPlaylists={isLoadingPlaylists}
      isLoadingNow={isLoadingNow}
      onPlay={handlePlay}
      onDisconnect={handleDisconnect}
      onRefreshNow={fetchNowPlaying}
    />
  );
};

export default SpotifyPage;
