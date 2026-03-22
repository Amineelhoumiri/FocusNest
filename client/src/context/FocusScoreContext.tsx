import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface FocusScoreContextType {
  score: number;
  streak: number;
  addScore: (points: number) => void;
  refreshScore: () => Promise<void>;
}

const FocusScoreContext = createContext<FocusScoreContextType | undefined>(undefined);

export const FocusScoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  const refreshScore = useCallback(async () => {
    try {
      const res = await fetch("/api/users/me", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setScore(data.focus_score ?? 0);
      setStreak(data.streak ?? 0);
    } catch {
      // silently ignore — user may not be authenticated yet
    }
  }, []);

  useEffect(() => {
    refreshScore();
  }, [refreshScore]);

  const addScore = useCallback(async (points: number) => {
    // Optimistic update
    setScore((s) => s + points);
    try {
      const res = await fetch("/api/users/me/score", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points }),
      });
      if (res.ok) {
        const data = await res.json();
        setScore(data.focus_score);
      }
    } catch {
      // optimistic update stays; will resync on next page load
    }
  }, []);

  return (
    <FocusScoreContext.Provider value={{ score, streak, addScore, refreshScore }}>
      {children}
    </FocusScoreContext.Provider>
  );
};

export const useFocusScore = () => {
  const ctx = useContext(FocusScoreContext);
  if (!ctx) throw new Error("useFocusScore must be used within FocusScoreProvider");
  return ctx;
};
