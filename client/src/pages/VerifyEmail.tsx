import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type Status = "verifying" | "success" | "error";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const callbackURL = searchParams.get("callbackURL") || "/login?verified=1";

  const [status, setStatus] = useState<Status>("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("No verification token found. Use the link from your email.");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await (
          authClient as unknown as {
            verifyEmail: (args: { query: { token: string } }) => Promise<{ error?: { message?: string } }>;
          }
        ).verifyEmail({ query: { token } });

        if (cancelled) return;

        if (res?.error) {
          setErrorMsg(res.error.message || "Verification failed. The link may have expired.");
          setStatus("error");
          return;
        }

        setStatus("success");
        // Brief pause so the user sees the success state, then redirect.
        setTimeout(() => {
          const dest = decodeURIComponent(callbackURL);
          window.location.href = dest;
        }, 2000);
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
        setStatus("error");
      }
    })();

    return () => { cancelled = true; };
  }, [token, callbackURL]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-border/60 bg-card/80 p-8 shadow-lg text-center"
      >
        {status === "verifying" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <h1 className="mt-4 font-display text-xl font-bold tracking-tight">Verifying your email…</h1>
            <p className="mt-2 text-sm text-muted-foreground">Just a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="mx-auto h-10 w-10 text-green-500" />
            <h1 className="mt-4 font-display text-xl font-bold tracking-tight">Email verified!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your address has been confirmed. Redirecting you to sign in…
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 font-display text-xl font-bold tracking-tight">Verification failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                to="/register"
                className="h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center"
              >
                Sign up again to get a new link
              </Link>
              <Link
                to="/login"
                className="text-sm font-medium text-primary hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
