import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  user_id: string;
  full_name: string;
  email: string;
  is_admin: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: { full_name: string; email: string; password: string; date_of_birth: string; address?: string; is_consented_ai?: boolean; is_consented_spotify?: boolean }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Automatically fetch user context on load via cookies!
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (err) {
        console.error("Session check failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMe();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to login");
    }

    // Once login succeeds, fetch the user's data dynamically!
    const meRes = await fetch("/api/users/me");
    if (meRes.ok) {
      const userData = await meRes.json();
      setUser(userData);
    }
  };

  const register = async (data: { full_name: string; email: string; password: string; date_of_birth: string; address?: string; is_consented_ai?: boolean; is_consented_spotify?: boolean }) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Registration failed");
    }

    // Immediately log them in
    await login(data.email, data.password);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }); // Ask backend to wipe cookies
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
