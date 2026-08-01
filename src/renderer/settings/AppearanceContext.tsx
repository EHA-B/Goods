import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Theme = "light" | "dark";
export type FontSize = "small" | "medium" | "large";
export type Accent = "teal" | "amber" | "blue" | "violet";

type AppearanceSettings = {
  theme: Theme;
  fontSize: FontSize;
  accent: Accent;
};

type AppearanceContextValue = AppearanceSettings & {
  setTheme: (value: Theme) => void;
  setFontSize: (value: FontSize) => void;
  setAccent: (value: Accent) => void;
  resetAppearance: () => void;
};

const STORAGE_KEY = "stocklite.appearance";

export const defaultAppearance: AppearanceSettings = {
  theme: "light",
  fontSize: "medium",
  accent: "teal",
};

const THEMES = new Set<Theme>(["light", "dark"]);
const FONT_SIZES = new Set<FontSize>(["small", "medium", "large"]);
const ACCENTS = new Set<Accent>(["teal", "amber", "blue", "violet"]);

function readSettings(): AppearanceSettings {
  if (typeof window === "undefined") {
    return defaultAppearance;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return defaultAppearance;
    }

    const saved = JSON.parse(raw) as Record<string, unknown>;
    const storedAccent = typeof saved.accent === "string" ? saved.accent : "";
    const migratedAccent = storedAccent === "emerald" ? "teal" : storedAccent;

    return {
      theme: THEMES.has(saved.theme as Theme)
        ? (saved.theme as Theme)
        : defaultAppearance.theme,
      fontSize: FONT_SIZES.has(saved.fontSize as FontSize)
        ? (saved.fontSize as FontSize)
        : defaultAppearance.fontSize,
      accent: ACCENTS.has(migratedAccent as Accent)
        ? (migratedAccent as Accent)
        : defaultAppearance.accent,
    };
  } catch {
    return defaultAppearance;
  }
}

function applyAppearance(settings: AppearanceSettings) {
  const root = document.documentElement;

  root.dataset.theme = settings.theme;
  root.dataset.fontSize = settings.fontSize;
  root.dataset.accent = settings.accent;
  root.classList.toggle("dark", settings.theme === "dark");
  root.style.colorScheme = settings.theme;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppearanceSettings>(readSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    applyAppearance(settings);
  }, [settings]);

  const value = useMemo<AppearanceContextValue>(
    () => ({
      ...settings,
      setTheme: (theme) =>
        setSettings((current) => ({ ...current, theme })),
      setFontSize: (fontSize) =>
        setSettings((current) => ({ ...current, fontSize })),
      setAccent: (accent) =>
        setSettings((current) => ({ ...current, accent })),
      resetAppearance: () => setSettings(defaultAppearance),
    }),
    [settings],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);

  if (!context) {
    throw new Error("useAppearance must be used inside AppearanceProvider");
  }

  return context;
}
