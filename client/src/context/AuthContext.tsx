import React, { createContext, useContext, useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";

interface User {
  user_id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  date_of_birth?: string;
  address?: string;
  profile_photo_url?: string;
  is_admin: boolean;
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
  register: (data: RegisterData) => Promise<void>;
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
        .then((data) => { if (data) setUser(data); })
        .catch((err) => console.error("Profile fetch failed", err))
        .finally(() => setProfileLoading(false));
    } else if (!sessionLoading) {
      setUser(null);
    }
  }, [session, sessionLoading]);

  const isLoading = sessionLoading || profileLoading || (!!session?.user && !user);

  // ── Email / password login ────────────────────────────────────
  const login = async (email: string, password: string) => {
    const result = await authClient.signIn.email({ email, password });
    if (result.error) throw new Error(result.error.message || "Failed to login");
    const meRes = await fetch("/api/users/me", { credentials: "include" });
    if (meRes.ok) setUser(await meRes.json());
  };

  // ── Email / password registration ────────────────────────────
  const register = async (data: RegisterData) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (authClient.signUp.email as any)({
      email: data.email,
      password: data.password,
      name: data.full_name,
      // additionalFields — stored in ba_user and mirrored to users via databaseHooks
      full_name: data.full_name,
      date_of_birth: data.date_of_birth,
      is_consented_ai: data.is_consented_ai ?? false,
      is_consented_spotify: data.is_consented_spotify ?? false,
    });
    if (result.error) throw new Error(result.error.message || "Registration failed");
    const meRes = await fetch("/api/users/me", { credentials: "include" });
    if (meRes.ok) setUser(await meRes.json());
  };

  // ── Logout ───────────────────────────────────────────────────
  const logout = async () => {
    await authClient.signOut();
    setUser(null);
  };

  const updateLocalUser = (data: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register, updateLocalUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
