import { useLayoutEffect } from "react";
import StockLiteLogo from "../../components/brand/StockLiteLogo";

const APP_NAME = "StockLite".split("");
const APPEARANCE_STORAGE_KEY = "stocklite.appearance";

type Theme = "light" | "dark";
type FontSize = "small" | "medium" | "large";
type Accent = "teal" | "amber" | "blue" | "violet";

type StoredAppearance = {
  theme?: Theme;
  fontSize?: FontSize;
  accent?: Accent | "emerald";
};

function applyStoredAppearance() {
  if (typeof window === "undefined") return;

  const root = document.documentElement;

  try {
    const saved = JSON.parse(
      localStorage.getItem(APPEARANCE_STORAGE_KEY) || "{}",
    ) as StoredAppearance;

    const theme: Theme = saved.theme === "dark" ? "dark" : "light";
    const fontSize: FontSize =
      saved.fontSize === "small" || saved.fontSize === "large"
        ? saved.fontSize
        : "medium";
    const accent: Accent =
      saved.accent === "amber" ||
      saved.accent === "blue" ||
      saved.accent === "violet"
        ? saved.accent
        : saved.accent === "emerald"
          ? "amber"
          : "teal";

    root.dataset.theme = theme;
    root.dataset.fontSize = fontSize;
    root.dataset.accent = accent;
    root.style.colorScheme = theme;
  } catch {
    root.dataset.theme = "light";
    root.dataset.fontSize = "medium";
    root.dataset.accent = "teal";
    root.style.colorScheme = "light";
  }
}

export default function SplashScreen() {
  useLayoutEffect(() => {
    applyStoredAppearance();
  }, []);

  return (
    <section
      dir="rtl"
      className="stocklite-splash"
      aria-label="جاري تشغيل StockLite"
      aria-busy="true"
    >
      <div
        className="stocklite-splash__glow stocklite-splash__glow--primary"
        aria-hidden="true"
      />

      <div
        className="stocklite-splash__glow stocklite-splash__glow--secondary"
        aria-hidden="true"
      />

      <div className="stocklite-splash__pattern" aria-hidden="true" />

      <div className="stocklite-splash__content">
        <div className="stocklite-splash__logo">
          <div className="stocklite-splash__logo-ring">
            <StockLiteLogo size="lg" />
          </div>
        </div>

        <h1
          dir="ltr"
          aria-label="StockLite"
          className="stocklite-splash__title"
        >
          {APP_NAME.map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              aria-hidden="true"
              className="stocklite-splash__letter"
              style={{ animationDelay: `${420 + index * 65}ms` }}
            >
              {letter}
            </span>
          ))}
        </h1>

        <p className="stocklite-splash__subtitle">
          إدارة أبسط، ورؤية أوضح
        </p>

        <div className="stocklite-splash__progress" aria-hidden="true">
          <span className="stocklite-splash__progress-bar" />
        </div>

        <p className="stocklite-splash__loading">
          جاري تجهيز مساحة العمل
        </p>
      </div>
    </section>
  );
}