import { useLayoutEffect } from "react";
import StockLiteLogo from "../../components/brand/StockLiteLogo";

const APPEARANCE_STORAGE_KEY = "stocklite.appearance";

type Theme = "light" | "dark";
type FontSize = "small" | "medium" | "large";
type Accent = "teal" | "emerald" | "amber" | "blue" | "violet";

type StoredAppearance = {
  theme?: Theme;
  fontSize?: FontSize;
  accent?: Accent;
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
    const supportedAccents: Accent[] = [
      "teal",
      "emerald",
      "amber",
      "blue",
      "violet",
    ];
    const accent: Accent = supportedAccents.includes(saved.accent as Accent)
      ? (saved.accent as Accent)
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
      <div className="stocklite-splash__backdrop" aria-hidden="true">
        <span className="stocklite-splash__mesh" />
        <span className="stocklite-splash__orb stocklite-splash__orb--top" />
        <span className="stocklite-splash__orb stocklite-splash__orb--bottom" />
        <span className="stocklite-splash__halo" />
        <span className="stocklite-splash__vignette" />
      </div>

      <main className="stocklite-splash__content">
        <div className="stocklite-splash__brand-stage">
          <span className="stocklite-splash__brand-aura" aria-hidden="true" />
          <span className="stocklite-splash__brand-shadow" aria-hidden="true" />
          <StockLiteLogo
            size="xl"
            showWordmark
            animated
            className="stocklite-splash__brand"
          />
        </div>

        <p className="stocklite-splash__subtitle">
          إدارة أبسط، ورؤية أوضح
        </p>

        <div
          className="stocklite-splash__progress"
          role="progressbar"
          aria-label="جاري تحميل التطبيق"
        >
          <span className="stocklite-splash__progress-track">
            <span className="stocklite-splash__progress-value" />
          </span>
        </div>

        <p className="stocklite-splash__loading">
          <span>جاري تجهيز مساحة العمل</span>
          <span className="stocklite-splash__loading-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </p>
      </main>

      <footer className="stocklite-splash__footer">
        نظام إدارة المخزون والمبيعات
      </footer>
    </section>
  );
}
