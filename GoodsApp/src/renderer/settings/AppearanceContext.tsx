import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";
type FontSize = "small" | "medium" | "large";
type Accent = "teal" | "amber" | "blue" | "violet";

type AppearanceSettings = { theme: Theme; fontSize: FontSize; accent: Accent };
type AppearanceContextValue = AppearanceSettings & {
  setTheme: (value: Theme) => void;
  setFontSize: (value: FontSize) => void;
  setAccent: (value: Accent) => void;
};

const STORAGE_KEY = "stocklite.appearance";
const defaults: AppearanceSettings = { theme: "light", fontSize: "medium", accent: "teal" };

function readSettings(): AppearanceSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const accent: Accent = saved.accent === "emerald" ? "amber" : (saved.accent || defaults.accent);
    return { theme: saved.theme || defaults.theme, fontSize: saved.fontSize || defaults.fontSize, accent };
  } catch {
    return defaults;
  }
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppearanceSettings>(readSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.fontSize = settings.fontSize;
    root.dataset.accent = settings.accent;
    root.style.colorScheme = settings.theme;
  }, [settings]);

  const value = useMemo(() => ({
    ...settings,
    setTheme: (theme: Theme) => setSettings((current) => ({ ...current, theme })),
    setFontSize: (fontSize: FontSize) => setSettings((current) => ({ ...current, fontSize })),
    setAccent: (accent: Accent) => setSettings((current) => ({ ...current, accent })),
  }), [settings]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error("useAppearance must be used inside AppearanceProvider");
  return context;
}
