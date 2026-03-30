import { createAuthClient } from "better-auth/react";

// Dev: Vite proxy — use explicit API origin. Prod (Docker / same host): use current origin when unset.
const apiBase =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:3000" : (typeof window !== "undefined" ? window.location.origin : ""));

export const authClient = createAuthClient({
  baseURL: apiBase,
  basePath: "/api/auth",
});

export const { signIn, signUp, signOut, useSession } = authClient;
