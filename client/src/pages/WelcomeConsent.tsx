import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ExternalLink, Loader2, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { TERMS_HIGHLIGHTS, PRIVACY_HIGHLIGHTS } from "@/content/welcomeConsentCopy";

/**
 * Shown after OAuth (or if a user reaches the app without core consent recorded).
 * Full legal documents stay on /terms and /privacy; this step is the in-app “read & agree” gate.
 */
const WelcomeConsent = () => {
  const { user, isLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [coreAck, setCoreAck] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [spotifyConsent, setSpotifyConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 32;
    if (nearBottom) setScrolledToEnd(true);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || scrolledToEnd) return;
    if (el.scrollHeight <= el.clientHeight + 8) setScrolledToEnd(true);
  }, [scrolledToEnd]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.is_consented_core === true) {
    return <Navigate to="/dashboard" replace />;
  }

  const canContinue = scrolledToEnd && coreAck;

  const handleContinue = async () => {
    if (!canContinue) return;
    setError(null);
    setSubmitting(true);
    try {
      const consentRes = await fetch("/api/consent/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.user_id,
          is_consented_core: true,
          is_consented_ai: aiConsent,
          is_consented_spotify: spotifyConsent,
          policy_version: "1.0",
        }),
      });
      if (!consentRes.ok) {
        const raw = await consentRes.text();
        let message = `Could not save consent (HTTP ${consentRes.status}). Try again or contact support.`;
        try {
          const errBody = raw ? JSON.parse(raw) : null;
          if (errBody?.message) message = errBody.message;
        } catch {
          if (raw?.trim()) message = `${message} — ${raw.trim().slice(0, 200)}`;
        }
        throw new Error(message);
      }
      await refreshProfile();
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-y-auto bg-background px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, hsl(var(--primary) / 0.22), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, hsl(190 80% 45% / 0.08), transparent)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto w-full max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-consent-title"
      >
        <div
          className="overflow-hidden rounded-[28px] border border-border/55 bg-card/90 shadow-2xl backdrop-blur-md"
          style={{
            boxShadow:
              "0 0 0 1px hsl(var(--border) / 0.35), 0 28px 80px rgba(0,0,0,0.45), 0 0 48px hsl(var(--primary) / 0.12)",
          }}
        >
          <div className="h-1 w-full bg-gradient-to-r from-primary via-violet-400 to-cyan-400" />

          <div className="p-8 sm:p-9">
            <div className="mb-6 flex items-start gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary"
                style={{ boxShadow: "0 0 24px hsl(var(--primary) / 0.2)" }}
              >
                <Shield className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <h1
                  id="welcome-consent-title"
                  className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl"
                >
                  Terms &amp; privacy
                </h1>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  Scroll through the summary below, then confirm to finish setting up your account.
                </p>
              </div>
            </div>

            <div
              ref={scrollRef}
              onScroll={onScroll}
              className="max-h-[min(320px,42svh)] space-y-5 overflow-y-auto rounded-2xl border border-border/50 bg-muted/25 px-4 py-4 text-[13px] leading-relaxed text-muted-foreground sm:max-h-[min(380px,48svh)]"
            >
              <section>
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-foreground/80">
                  Terms — key points
                </h2>
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  {TERMS_HIGHLIGHTS.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-foreground/80">
                  Privacy — key points
                </h2>
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  {PRIVACY_HIGHLIGHTS.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>
            </div>

            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground/70">
              <span>Full documents:</span>
              <Link
                to="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                Terms <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
              </Link>
              <span className="text-muted-foreground/40">·</span>
              <Link
                to="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                Privacy <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
              </Link>
            </p>

            {!scrolledToEnd && (
              <p className="mt-2 text-[11px] text-amber-600/90 dark:text-amber-400/90">
                Scroll to the end of the summary to continue.
              </p>
            )}

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-border/55 bg-foreground/[0.02] p-4 transition-colors hover:bg-foreground/[0.04]">
              <div
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
                style={{
                  background: coreAck ? "hsl(var(--primary) / 0.75)" : "transparent",
                  borderColor: coreAck ? "hsl(var(--primary) / 0.9)" : "hsl(var(--border))",
                }}
              >
                {coreAck && <Check className="h-2.5 w-2.5 text-primary-foreground" aria-hidden />}
              </div>
              <input
                type="checkbox"
                checked={coreAck}
                onChange={(e) => setCoreAck(e.target.checked)}
                className="sr-only"
              />
              <span className="text-[13px] leading-snug text-foreground/90">
                I have read the summary and agree to the{" "}
                <Link to="/terms" target="_blank" className="font-medium text-primary hover:underline">
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link to="/privacy" target="_blank" className="font-medium text-primary hover:underline">
                  Privacy Policy
                </Link>
                . I consent to core data processing required to run FocusNest.
              </span>
            </label>

            <div className="mt-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                Optional
              </p>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/45 p-3.5 transition-colors hover:bg-foreground/[0.02]">
                <div
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                  style={{
                    background: aiConsent ? "hsl(var(--primary) / 0.65)" : "transparent",
                    borderColor: aiConsent ? "hsl(var(--primary))" : "hsl(var(--border))",
                  }}
                >
                  {aiConsent && <Check className="h-2.5 w-2.5 text-white" aria-hidden />}
                </div>
                <input
                  type="checkbox"
                  checked={aiConsent}
                  onChange={(e) => setAiConsent(e.target.checked)}
                  className="sr-only"
                />
                <span className="text-[12px] text-muted-foreground">
                  <strong className="text-foreground/90">AI task breakdown</strong> — send task text to OpenAI when you use the feature.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/45 p-3.5 transition-colors hover:bg-foreground/[0.02]">
                <div
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                  style={{
                    background: spotifyConsent ? "hsl(var(--success) / 0.55)" : "transparent",
                    borderColor: spotifyConsent ? "hsl(var(--success))" : "hsl(var(--border))",
                  }}
                >
                  {spotifyConsent && <Check className="h-2.5 w-2.5 text-white" aria-hidden />}
                </div>
                <input
                  type="checkbox"
                  checked={spotifyConsent}
                  onChange={(e) => setSpotifyConsent(e.target.checked)}
                  className="sr-only"
                />
                <span className="text-[12px] text-muted-foreground">
                  <strong className="text-foreground/90">Spotify</strong> — connect for focus audio only; we don&apos;t read your listening history.
                </span>
              </label>
            </div>

            {error && (
              <p className="mt-4 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                {error}
              </p>
            )}

            <motion.button
              type="button"
              whileTap={{ scale: canContinue && !submitting ? 0.98 : 1 }}
              onClick={handleContinue}
              disabled={!canContinue || submitting}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Agree and continue"
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WelcomeConsent;
