/** Persists Music page tab (Free vs Spotify); read by Navbar chip + MusicPage. */
export const MUSIC_SOURCE_STORAGE_KEY = "focusnest:music_source";

export const MUSIC_SOURCE_CHANGED_EVENT = "focusnest:music_source_changed";

export type MusicPageSource = "free" | "spotify";

export function readMusicPageSource(): MusicPageSource {
  try {
    const raw = window.localStorage.getItem(MUSIC_SOURCE_STORAGE_KEY);
    return raw === "spotify" ? "spotify" : "free";
  } catch {
    return "free";
  }
}

/** Call after updating localStorage so Navbar updates in the same tab. */
export function notifyMusicPageSourceChanged() {
  window.dispatchEvent(new Event(MUSIC_SOURCE_CHANGED_EVENT));
}

/**
 * Navbar / chrome only: YouTube channel names often include “Binaural Beats” while the app no longer
 * ships an in-app binaural tone. Keeps the artist line neutral for the chip + dropdown.
 */
export function softenNavbarMusicSubtitle(s: string | null | undefined): string | null {
  if (s == null || !String(s).trim()) return null;
  let t = String(s).trim();
  t = t.replace(/\s*[-–—]\s*binaural\s+beats?\s*/gi, " · Focus sounds");
  t = t.replace(/\bBinaural\s+Beats?\b/gi, "Focus sounds");
  t = t.replace(/\bbinaural\s+beats?\b/gi, "focus sounds");
  t = t.replace(/\bbinaural\b/gi, "focus");
  return t.replace(/\s+/g, " ").trim() || null;
}
