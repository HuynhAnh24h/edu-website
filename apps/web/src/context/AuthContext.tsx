"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CORE_API_URL } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: "student" | "teacher" | "parent" | "content_admin" | "super_admin";
  tier: string;
  current_grade?: number;
  school_name?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (payload: {
    email: string;
    password: string;
    full_name: string;
    role: string;
    current_grade?: number;
    school_name?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "eduk12_access_token";
const REFRESH_KEY = "eduk12_refresh_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!saved) {
      setLoading(false);
      return;
    }
    setAccessToken(saved);
    fetch(`${CORE_API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${saved}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user as AuthUser);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_KEY);
          setAccessToken(null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || "Đăng nhập thất bại" };
      }
      localStorage.setItem(TOKEN_KEY, data.access_token);
      if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token);
      setAccessToken(data.access_token);
      setUser(data.user as AuthUser);
      return { ok: true };
    } catch {
      return { ok: false, error: "Không thể kết nối máy chủ xác thực (:8080)" };
    }
  }, []);

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      full_name: string;
      role: string;
      current_grade?: number;
      school_name?: string;
    }) => {
      try {
        const res = await fetch(`${CORE_API_URL}/api/v1/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          return { ok: false, error: data.error || "Đăng ký thất bại" };
        }
        localStorage.setItem(TOKEN_KEY, data.access_token);
        if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token);
        setAccessToken(data.access_token);
        setUser(data.user as AuthUser);
        return { ok: true };
      } catch {
        return { ok: false, error: "Không thể kết nối máy chủ xác thực (:8080)" };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (refresh) {
      void fetch(`${CORE_API_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setAccessToken(null);
    setUser(null);
  }, []);

  const isStaff =
    user?.role === "teacher" ||
    user?.role === "content_admin" ||
    user?.role === "super_admin";
  const isAdmin = user?.role === "super_admin";

  return (
    <AuthContext.Provider
      value={{ user, accessToken, loading, isStaff, isAdmin, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
