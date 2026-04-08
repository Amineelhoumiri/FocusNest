import { createAuthClient } from "better-auth/react";

/**
 * Base URL for Better Auth client requests.
 * - Dev (`import.meta.env.DEV`): always the page origin (e.g. :8080) so cookies match `fetch("/api")`
 *   via the Vite proxy. `VITE_API_URL=http://localhost:3000` in .env would break sign-in if honored.
 * - Production: `VITE_API_URL` when API is on a different public origin; else current origin.
 */
function resolveAuthBaseUrl(): string {
  if (import.meta.env.DEV) {
    return typeof window !== "undefined" ? window.location.origin : "";
  }
  const fromEnv = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return typeof window !== "undefined" ? window.location.origin : "";
}

const apiBase = resolveAuthBaseUrl();

export const authClient = createAuthClient({
  baseURL: apiBase,
  basePath: "/api/auth",
});

export const { signIn, signUp, signOut, useSession } = authClient;
