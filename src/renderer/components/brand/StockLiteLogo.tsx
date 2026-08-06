import { useId } from "react";

type LogoSize = "sm" | "md" | "lg" | "xl";

type Props = {
  size?: LogoSize;
  showWordmark?: boolean;
  className?: string;
  light?: boolean;
  animated?: boolean;
  compact?: boolean;
};

const sizeClasses: Record<
  LogoSize,
  { mark: string; title: string; subtitle: string; gap: string }
> = {
  sm: {
    mark: "h-9 w-9",
    title: "text-base",
    subtitle: "text-[7px]",
    gap: "gap-2",
  },
  md: {
    mark: "h-12 w-12",
    title: "text-xl",
    subtitle: "text-[8px]",
    gap: "gap-3",
  },
  lg: {
    mark: "h-24 w-24",
    title: "text-3xl",
    subtitle: "text-[10px]",
    gap: "gap-4",
  },
  xl: {
    mark: "h-28 w-28",
    title: "text-4xl",
    subtitle: "text-[11px]",
    gap: "gap-5",
  },
};

export default function StockLiteLogo({
  size = "md",
  showWordmark = false,
  className = "",
  light = false,
  animated = false,
  compact = false,
}: Props) {
  const styles = sizeClasses[size];
  const gradientId = useId().replace(/:/g, "");

  return (
    <div
      dir="ltr"
      role="img"
      aria-label={showWordmark ? "StockLite Smart Inventory" : "StockLite"}
      className={[
        "stocklite-brand inline-flex select-none items-center",
        compact ? "gap-2" : styles.gap,
        className,
      ].join(" ")}
    >
      <div
        className={[
          "stocklite-logo-mark relative isolate flex shrink-0 items-center justify-center overflow-hidden rounded-[29%]",
          styles.mark,
          animated ? "stocklite-logo-mark--animated" : "",
        ].join(" ")}
        aria-hidden="true"
      >
        <span className="stocklite-logo-surface absolute inset-0" />
        <span className="stocklite-logo-orbit absolute inset-[-28%]" />
        <span className="stocklite-logo-grid absolute inset-0" />

        <svg
          viewBox="0 0 64 64"
          className="stocklite-logo-symbol relative z-10 h-[68%] w-[68%]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient
              id={`${gradientId}-top`}
              x1="14"
              y1="12"
              x2="50"
              y2="35"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="white" stopOpacity="0.99" />
              <stop offset="1" stopColor="white" stopOpacity="0.76" />
            </linearGradient>
            <linearGradient
              id={`${gradientId}-left`}
              x1="13"
              y1="23"
              x2="34"
              y2="54"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="white" stopOpacity="0.76" />
              <stop offset="1" stopColor="white" stopOpacity="0.44" />
            </linearGradient>
            <linearGradient
              id={`${gradientId}-right`}
              x1="51"
              y1="23"
              x2="31"
              y2="54"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="white" stopOpacity="0.94" />
              <stop offset="1" stopColor="white" stopOpacity="0.65" />
            </linearGradient>
          </defs>

          <path
            d="M12.5 22.3 32 11.5l19.5 10.8L32 33.4 12.5 22.3Z"
            fill={`url(#${gradientId}-top)`}
          />
          <path
            d="M12.5 22.3v20.2L32 53.2V33.4L12.5 22.3Z"
            fill={`url(#${gradientId}-left)`}
          />
          <path
            d="M51.5 22.3v20.2L32 53.2V33.4l19.5-11.1Z"
            fill={`url(#${gradientId}-right)`}
          />

          <path
            d="M23.2 17 42.5 27.8"
            stroke="white"
            strokeOpacity="0.66"
            strokeWidth="2.35"
            strokeLinecap="round"
          />
          <path
            d="M38.3 43.4c4.9-.5 8.6-3.5 9.9-7.9"
            stroke="white"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="m44.9 34.7 3.6.3.6 3.5"
            stroke="white"
            strokeWidth="2.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16.5 27.5 32 36.3l15.5-8.8"
            stroke="white"
            strokeOpacity="0.13"
            strokeWidth="1.2"
          />
        </svg>

        <span className="stocklite-logo-shine absolute inset-0 z-20" />
        <span className="stocklite-logo-outline absolute inset-0 z-30 rounded-[inherit]" />
      </div>

      {showWordmark && (
        <div
          className={[
            "stocklite-wordmark min-w-0 text-left leading-none",
            animated ? "stocklite-wordmark--animated" : "",
          ].join(" ")}
        >
          <strong
            className={[
              "block whitespace-nowrap font-extrabold tracking-[-0.055em]",
              styles.title,
              light ? "text-white" : "text-[var(--text-primary)]",
            ].join(" ")}
          >
            Stock
            <span
              className={
                light ? "text-white/72" : "stocklite-wordmark-accent"
              }
            >
              Lite
            </span>
          </strong>

          {!compact && (
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className={[
                  "block h-px w-5 rounded-full",
                  light ? "bg-white/35" : "stocklite-wordmark-line",
                ].join(" ")}
              />
              <span
                className={[
                  "block whitespace-nowrap font-bold uppercase tracking-[0.22em]",
                  styles.subtitle,
                  light ? "text-white/58" : "text-[var(--text-muted)]",
                ].join(" ")}
              >
                Smart Inventory
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
