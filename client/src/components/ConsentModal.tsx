import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Music, Lock, ExternalLink, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";

export type ConsentFeature = "ai" | "spotify";

interface Props {
  feature: ConsentFeature;
  /** Called when the modal should close (user declined OR after granting consent) */
  onClose: () => void;
  /** Called after consent was successfully granted */
  onGranted?: () => void;
}

const META = {
  ai: {
    icon: Brain,
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-400",
    accentColor: "#7c6ff7",
    accentBg: "hsl(var(--primary))",
    title: "AI Features",
    subtitle: "Powered by OpenAI",
    what: "FocusNest will send your task names and session context to OpenAI to generate personalised breakdowns and coaching suggestions.",
    dataPoints: [
      "Task names and descriptions",
      "Session mood and focus context",
      "Chat history within the app",
    ],
    cta: "Enable AI Features",
    consentKey: "is_consented_ai" as const,
  },
  spotify: {
    icon: Music,
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    accentColor: "#1DB954",
    accentBg: "#1DB954",
    title: "Spotify Integration",
    subtitle: "Requires Spotify Premium",
    what: "FocusNest will connect to your Spotify account via the Web Playback SDK to stream focus playlists during your sessions.",
    dataPoints: [
      "Spotify account identity (OAuth token)",
      "Playback state (current track, progress)",
      "Playlist selection preferences",
    ],
    cta: "Enable Spotify",
    consentKey: "is_consented_spotify" as const,
  },
} as const;

export function ConsentModal({ feature, onClose, onGranted }: Props) {
  const { user, updateLocalUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const meta = META[feature];
  const Icon = meta.icon;

  if (!user) return null;

  const handleGrant = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/consent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [meta.consentKey]: true }),
      });
      if (!res.ok) throw new Error();
      updateLocalUser({ [meta.consentKey]: true });
      setDone(true);
      setTimeout(() => {
        onGranted?.();
        onClose();
      }, 900);
    } catch {
      toast.error("Could not update consent. Try again or use Settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="consent-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ backdropFilter: "blur(18px)", background: "rgba(8,6,18,0.72)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md rounded-2xl overflow-hidden"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border) / 0.6)",
            boxShadow: `0 0 60px ${meta.accentColor}22, 0 30px 60px rgba(0,0,0,0.5)`,
          }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground hover:bg-foreground/[0.06] transition-all duration-150 z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Top accent bar */}
          <div className="h-1 w-full" style={{ background: meta.accentBg }} />

          <div className="p-7">
            {/* Icon + lock badge */}
            <div className="flex items-start gap-4 mb-5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${meta.iconBg}`}>
                <Icon className={`w-6 h-6 ${meta.iconColor}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-[17px] font-bold tracking-tight">{meta.title}</h2>
                  <div className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                    <Lock className="w-2.5 h-2.5" />
                    Locked
                  </div>
                </div>
                <p className="text-[12px] text-muted-foreground/60">{meta.subtitle}</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-[13.5px] text-foreground/80 leading-relaxed mb-4">
              {meta.what}
            </p>

            {/* Data processed */}
            <div
              className="rounded-xl p-4 mb-5 space-y-2"
              style={{ background: "hsl(var(--muted) / 0.4)", border: "1px solid hsl(var(--border) / 0.4)" }}
            >
              <p className="text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
                Data processed
              </p>
              {meta.dataPoints.map((point) => (
                <div key={point} className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: meta.accentColor }}
                  />
                  <span className="text-[12.5px] text-foreground/70">{point}</span>
                </div>
              ))}
            </div>

            {/* Privacy link */}
            <p className="text-[11.5px] text-muted-foreground/50 mb-5">
              Your data is handled according to our{" "}
              <Link
                to="/privacy"
                target="_blank"
                className="underline underline-offset-2 hover:text-muted-foreground transition-colors inline-flex items-center gap-0.5"
              >
                Privacy Policy
                <ExternalLink className="w-3 h-3" />
              </Link>
              . You can revoke consent at any time in{" "}
              <Link to="/settings" className="underline underline-offset-2 hover:text-muted-foreground transition-colors">
                Settings → Data & Privacy
              </Link>
              .
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 h-[44px] rounded-xl text-[13.5px] font-medium text-muted-foreground bg-foreground/[0.04] border border-foreground/[0.08] hover:bg-foreground/[0.07] transition-all duration-200"
              >
                Maybe later
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleGrant}
                disabled={loading || done}
                className="flex-1 h-[44px] rounded-xl text-[13.5px] font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-80"
                style={{ background: meta.accentBg }}
              >
                {done ? (
                  <>
                    <Check className="w-4 h-4" />
                    Enabled!
                  </>
                ) : loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  meta.cta
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
