// Thin context wrapper around useYouTubePlayer so any component in the tree can
// access the YouTube player state and controls without prop-drilling.
// The hook owns all player logic; this file just makes it globally available.
import React, { createContext, useContext } from "react";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";

type YouTubePlaybackValue = ReturnType<typeof useYouTubePlayer>;

const YouTubePlaybackContext = createContext<YouTubePlaybackValue | null>(null);

export const YouTubePlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useYouTubePlayer();
  return <YouTubePlaybackContext.Provider value={value}>{children}</YouTubePlaybackContext.Provider>;
};

export function useYouTubePlayback(): YouTubePlaybackValue {
  const ctx = useContext(YouTubePlaybackContext);
  if (!ctx) throw new Error("useYouTubePlayback must be used within YouTubePlaybackProvider");
  return ctx;
}

