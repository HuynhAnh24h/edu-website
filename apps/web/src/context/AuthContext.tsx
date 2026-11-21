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

export interface LoginResult {
  ok: boolean;
  error?: string;
  requires_2fa?: boolean;
  temp_token?: string;
  user?: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  isStudent: boolean;
  isTeacher: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verify2faLogin: (tempToken: string, code: string) => Promise<{ ok: boolean; error?: string; user?: AuthUser }>;
  completeOAuthExchange: (code: string) => Promise<{ ok: boolean; error?: string; user?: AuthUser }>;
  register: (payload: {
    email: string;
    password: string;
    full_name: string;
    role: string;
    current_grade?: number;
    school_name?: string;
  }) => Promise<{ ok: boolean; error?: string; user?: AuthUser }>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "eduk12_access_token";
const REFRESH_KEY = "eduk12_refresh_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persistSession = useCallback((data: { access_token: string; refresh_token?: string; user: AuthUser }) => {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token);
    setAccessToken(data.access_token);
    setUser(data.user);
  }, []);

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

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
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
        if (data.requires_2fa && data.temp_token) {
          return { ok: false, requires_2fa: true, temp_token: data.temp_token };
        }
        persistSession(data);
        return { ok: true, user: data.user as AuthUser };
      } catch {
        return { ok: false, error: "Không thể kết nối máy chủ xác thực" };
      }
    },
    [persistSession]
  );

  const verify2faLogin = useCallback(
    async (tempToken: string, code: string) => {
      try {
        const res = await fetch(`${CORE_API_URL}/api/v1/auth/2fa/verify-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ temp_token: tempToken, code }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { ok: false, error: data.error || "Mã 2FA không hợp lệ" };
        }
        persistSession(data);
        return { ok: true, user: data.user as AuthUser };
      } catch {
        return { ok: false, error: "Không thể xác thực mã 2FA" };
      }
    },
    [persistSession]
  );

  const completeOAuthExchange = useCallback(
    async (code: string) => {
      try {
        const res = await fetch(`${CORE_API_URL}/api/v1/auth/oauth/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { ok: false, error: data.error || "Đăng nhập mạng xã hội thất bại" };
        }
        persistSession(data);
        return { ok: true, user: data.user as AuthUser };
      } catch {
        return { ok: false, error: "Không thể hoàn tất đăng nhập OAuth" };
      }
    },
    [persistSession]
  );

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
        persistSession(data);
        return { ok: true, user: data.user as AuthUser };
      } catch {
        return { ok: false, error: "Không thể kết nối máy chủ xác thực" };
      }
    },
    [persistSession]
  );

  const refreshUser = useCallback(async () => {
    const token = accessToken || (typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null);
    if (!token) return;
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) setUser(data.user as AuthUser);
      }
    } catch {
      // ignore transient
    }
  }, [accessToken]);

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

  const isStudent = user?.role === "student" || user?.role === "parent";
  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "super_admin" || user?.role === "content_admin";
  const isStaff = isTeacher || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        isStudent,
        isTeacher,
        isStaff,
        isAdmin,
        login,
        verify2faLogin,
        completeOAuthExchange,
        register,
        refreshUser,
        logout,
      }}
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
