import { createContext, useContext, useState } from "react";

const STORAGE_KEY = "focusnest_settings";

interface ZenModeContextType {
  zenMode: boolean;
  toggleZenMode: () => void;
}

const ZenModeContext = createContext<ZenModeContextType>({
  zenMode: false,
  toggleZenMode: () => {},
});

export const ZenModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [zenMode, setZenMode] = useState<boolean>(() => {
    try {
      return !!(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").zenMode);
    } catch { return false; }
  });

  const toggleZenMode = () => {
    setZenMode(prev => {
      const next = !prev;
      try {
        const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, zenMode: next }));
      } catch {
        /* ignore localStorage errors */
      }
      return next;
    });
  };

  return (
    <ZenModeContext.Provider value={{ zenMode, toggleZenMode }}>
      {children}
    </ZenModeContext.Provider>
  );
};

export const useZenMode = () => useContext(ZenModeContext);
