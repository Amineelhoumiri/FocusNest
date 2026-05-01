import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authClient } from "@/lib/auth-client";
import posthog from "posthog-js";

interface User {
  user_id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  date_of_birth?: string;
  address?: string;
  profile_photo_url?: string;
  is_admin: boolean;
  is_consented_core?: boolean;
  is_consented_ai?: boolean;
  is_consented_spotify?: boolean;
}

interface RegisterData {
  full_name: string;
  email: string;
  password: string;
  date_of_birth: string;
  address?: string;
  is_consented_ai?: boolean;
  is_consented_spotify?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateLocalUser: (data: Partial<User>) => void;
  register: (data: RegisterData) => Promise<{ needsEmailVerification: boolean }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [user, setUser] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Fetch the full app profile from /api/users/me whenever the Better Auth
  // session changes (login, page refresh, OAuth callback, etc.)
  useEffect(() => {
    if (session?.user) {
      setProfileLoading(true);
      fetch("/api/users/me", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            setUser(data);
            posthog.identify(data.user_id, { email: data.email, name: data.full_name });
          } else {
            setUser(null);
          }
        })
        .catch((err) => {
          console.error("Profile fetch failed", err);
          setUser(null);
        })
        .finally(() => setProfileLoading(false));
    } else if (!sessionLoading) {
      setUser(null);
    }
  }, [session, sessionLoading]);

  // Do not use `!!session?.user && !user` here: if /api/users/me fails, that stays true forever
  // and AppLayout returns null (blank screen).
  const isLoading = sessionLoading || profileLoading;

  const refreshProfile = useCallback(async () => {
    const meRes = await fetch("/api/users/me", { credentials: "include" });
    if (meRes.ok) setUser(await meRes.json());
  }, []);

  // ── Email / password login ────────────────────────────────────
  const login = async (email: string, password: string) => {
    const result = await authClient.signIn.email({ email, password });
    if (result.error) throw new Error(result.error.message || "Failed to login");

    // Apply consent choices stored at signup (email/password users who already agreed)
    const pending = localStorage.getItem("pending_consent");
    if (pending) {
      try {
        const choices = JSON.parse(pending);
        await fetch("/api/consent/register", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...choices, policy_version: "1.0" }),
        });
      } catch { /* non-fatal */ }
      localStorage.removeItem("pending_consent");
    }

    const meRes = await fetch("/api/users/me", { credentials: "include" });
    if (meRes.ok) setUser(await meRes.json());
  };

  // ── Email / password registration ────────────────────────────
  const register = async (data: RegisterData) => {
    const verifyCallback =
      typeof window !== "undefined"
        ? `${window.location.origin}/login?verified=1`
        : "/login?verified=1";
    // Better Auth `signUp.email` typings omit our `additionalFields` (full_name, consents, etc.).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- extended client payload
    const result = await (authClient.signUp.email as any)({
      email: data.email,
      password: data.password,
      name: data.full_name,
      callbackURL: verifyCallback,
      // additionalFields — stored in ba_user and mirrored to users via databaseHooks
      full_name: data.full_name,
      date_of_birth: data.date_of_birth,
      is_consented_ai: data.is_consented_ai ?? false,
      is_consented_spotify: data.is_consented_spotify ?? false,
    });
    if (result.error) throw new Error(result.error.message || "Registration failed");

    const payload = result.data as { token?: string | null; user?: { id?: string } } | undefined;
    const sessionToken = payload?.token;
    const signUpUserId = payload?.user?.id;

    // When email verification is required, Better Auth does not issue a session on sign-up.
    // Store consent choices in localStorage so they can be applied automatically on first login.
    if (sessionToken == null || sessionToken === "") {
      localStorage.setItem("pending_consent", JSON.stringify({
        is_consented_core: true,
        is_consented_ai: data.is_consented_ai ?? false,
        is_consented_spotify: data.is_consented_spotify ?? false,
      }));
      return { needsEmailVerification: true };
    }

    const consentRes = await fetch("/api/consent/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(signUpUserId ? { user_id: signUpUserId } : {}),
        is_consented_core: true,
        is_consented_ai: data.is_consented_ai ?? false,
        is_consented_spotify: data.is_consented_spotify ?? false,
        policy_version: "1.0",
      }),
    });
    if (!consentRes.ok) {
      const raw = await consentRes.text();
      let message = `Could not record consent (HTTP ${consentRes.status}). Try signing in, or contact support.`;
      try {
        const errBody = raw ? JSON.parse(raw) : null;
        if (errBody?.message) message = errBody.message;
      } catch {
        if (raw?.trim()) message = `${message} — ${raw.trim().slice(0, 240)}`;
      }
      throw new Error(message);
    }

    const meRes = await fetch("/api/users/me", { credentials: "include" });
    if (meRes.ok) setUser(await meRes.json());
    return { needsEmailVerification: false };
  };

  // ── Logout ───────────────────────────────────────────────────
  const logout = async () => {
    await authClient.signOut();
    posthog.reset();
    setUser(null);
  };

  const updateLocalUser = (data: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, register, updateLocalUser, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
