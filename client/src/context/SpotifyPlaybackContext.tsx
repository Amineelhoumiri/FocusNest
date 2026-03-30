import React, { createContext, useContext } from "react";
import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer";

type SpotifyPlaybackValue = ReturnType<typeof useSpotifyPlayer>;

const SpotifyPlaybackContext = createContext<SpotifyPlaybackValue | null>(null);

export const SpotifyPlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useSpotifyPlayer();
  return (
    <SpotifyPlaybackContext.Provider value={value}>
      {children}
    </SpotifyPlaybackContext.Provider>
  );
};

export function useSpotifyPlayback(): SpotifyPlaybackValue {
  const ctx = useContext(SpotifyPlaybackContext);
  if (!ctx) {
    throw new Error("useSpotifyPlayback must be used within SpotifyPlaybackProvider");
  }
  return ctx;
}
