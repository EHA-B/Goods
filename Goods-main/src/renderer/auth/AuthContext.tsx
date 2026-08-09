import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AuthUser = {
  id: number;
  username: string;
  full_name: string;
  role: string;
  isActive: boolean;
  last_login: string | null;
};

type LoginInput = { username: string; password: string };
type ChangePasswordInput = { currentPassword: string; newPassword: string };

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  unlock: (password: string) => Promise<void>;
  changePassword: (input: ChangePasswordInput) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const currentUser = (await window.stockliteApi.auth.getCurrentUser()) as AuthUser | null;
        if (isMounted) setUser(currentUser);
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    }

    void restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const authenticatedUser = (await window.stockliteApi.auth.login({
      username: input.username.trim(),
      password: input.password,
    })) as AuthUser;
    setUser(authenticatedUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await window.stockliteApi.auth.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const unlock = useCallback(
    async (password: string) => {
      if (!user) throw new Error("UNAUTHENTICATED");
      const authenticatedUser = (await window.stockliteApi.auth.login({
        username: user.username,
        password,
      })) as AuthUser;
      setUser(authenticatedUser);
    },
    [user],
  );

  const changePassword = useCallback(async (input: ChangePasswordInput) => {
    await window.stockliteApi.auth.changePassword(input);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      login,
      logout,
      unlock,
      changePassword,
    }),
    [user, isInitializing, login, logout, unlock, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
