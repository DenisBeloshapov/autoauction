"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export type Role = "ADMIN" | "CLIENT";

export interface AuthUser {
  id: string;
  username: string;
  name: string | null;
  role: Role;
  email: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const stored = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      if (!stored) { setLoading(false); return; }
      try {
        const res = await fetch("/api/auth/verify", { headers: { Authorization: `Bearer ${stored}` } });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setToken(stored);
        } else {
          localStorage.removeItem("auth_token");
        }
      } catch {
        localStorage.removeItem("auth_token");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.error || "Login failed" };
      }
      const data = await res.json();
      localStorage.setItem("auth_token", data.token);
      setToken(data.token);
      setUser(data.user);
      router.refresh();
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
    router.refresh();
  }, [router]);

  return <AuthContext.Provider value={{ user, token, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
