import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

const inputClass =
  "w-full rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all";

/**
 * Triggers Better Auth POST /request-password-reset (requires sendResetPassword on the server).
 */
const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter your email.");
      return;
    }
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const res = await (
        authClient as unknown as {
          requestPasswordReset: (args: { email: string; redirectTo: string }) => Promise<{ error?: { message?: string } }>;
        }
      ).requestPasswordReset({
        email: email.trim(),
        redirectTo,
      });
      if (res?.error) {
        toast.error(res.error.message || "Could not send reset email.");
        return;
      }
      toast.success("If an account exists for that email, check your inbox for a reset link.");
      setEmail("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-border/60 bg-card/80 p-8 shadow-lg"
      >
        <h1 className="font-display text-2xl font-bold tracking-tight">Forgot password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the email you use for FocusNest. We’ll send a link to set a new password.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
