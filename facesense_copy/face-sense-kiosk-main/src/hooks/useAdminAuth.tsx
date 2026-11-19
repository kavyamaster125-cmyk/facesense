import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi, TOKEN_KEY, USER_ROLE_KEY } from "@/lib/api";

type AdminAuth = {
  token: string | null;
  email: string | null;
  isAuthenticated: boolean;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AdminAuthContext = createContext<AdminAuth | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(window.localStorage.getItem(TOKEN_KEY));
    setEmail("admin@college.edu");
    setReady(true);
  }, []);

  const login = useCallback(async (nextEmail: string, password: string) => {
    const res = await authApi.adminLogin(nextEmail, password);
    window.localStorage.setItem(TOKEN_KEY, res.access_token);
    window.localStorage.setItem(USER_ROLE_KEY, "SUPER_ADMIN");
    setToken(res.access_token);
    setEmail(nextEmail);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_ROLE_KEY);
    setToken(null);
    setEmail(null);
  }, []);

  const value = useMemo<AdminAuth>(
    () => ({ token, email, isAuthenticated: Boolean(token), ready, login, logout }),
    [token, email, ready, login, logout],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuth {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
}
