import { createAuthClient } from "better-auth/react";

// Point at the Express server. In dev the Vite proxy forwards /api/* to localhost:3000,
// so we use an absolute URL here so Better Auth can resolve its own callbacks.
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  basePath: "/api/auth",
});

export const { signIn, signUp, signOut, useSession } = authClient;
