import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

type AuthUser = { username: string; displayName: string };
type LoginInput = { username: string; password: string; remember: boolean };
type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
};

const AUTH_STORAGE_KEY = "stocklite.auth.user";
const AUTH_SESSION_KEY = "stocklite.auth.session";

function readStoredUser(): AuthUser | null {
  try {
    const value = localStorage.getItem(AUTH_STORAGE_KEY) ?? sessionStorage.getItem(AUTH_SESSION_KEY);
    return value ? (JSON.parse(value) as AuthUser) : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user),
    async login({ username, password, remember }) {
      await new Promise((resolve) => window.setTimeout(resolve, 850));
      if (username.trim() !== "admin" || password !== "admin123") {
        throw new Error("INVALID_CREDENTIALS");
      }
      const nextUser = { username: "admin", displayName: "مدير النظام" };
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      (remember ? localStorage : sessionStorage).setItem(
        remember ? AUTH_STORAGE_KEY : AUTH_SESSION_KEY,
        JSON.stringify(nextUser),
      );
      setUser(nextUser);
    },
    logout() {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      setUser(null);
    },
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
