type Props = {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
  light?: boolean;
};

const sizes = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-24 w-24",
};

export default function StockLiteLogo({
  size = "md",
  showWordmark = false,
  className = "",
  light = false,
}: Props) {
  return (
    <div className={["inline-flex items-center gap-3", className].join(" ")}>
      <div
        className={[
          "stocklite-logo-mark relative flex shrink-0 items-center justify-center overflow-hidden rounded-[28%]",
          sizes[size],
        ].join(" ")}
        aria-hidden="true"
      >
        <svg viewBox="0 0 64 64" className="h-[66%] w-[66%]" fill="none">
          <path
            d="M13 22.5 32 12l19 10.5-19 10.7L13 22.5Z"
            fill="currentColor"
            fillOpacity=".94"
          />
          <path
            d="M13 22.5v20L32 53V33.2L13 22.5Z"
            fill="currentColor"
            fillOpacity=".72"
          />
          <path
            d="M51 22.5v20L32 53V33.2l19-10.7Z"
            fill="currentColor"
            fillOpacity=".88"
          />
          <path
            d="m23.5 17.1 18.8 10.7"
            stroke="white"
            strokeOpacity=".72"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M38.5 43.2c4.8-.5 8.4-3.6 9.5-7.8"
            stroke="white"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="m44.8 34.7 3.5.4.7 3.4"
            stroke="white"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="stocklite-logo-glow absolute inset-0" />
      </div>

      {showWordmark && (
        <div dir="ltr" className="text-left leading-none">
          <strong
            className={[
              "block text-xl font-bold tracking-[-0.04em]",
              light ? "text-white" : "text-[var(--text-primary)]",
            ].join(" ")}
          >
            StockLite
          </strong>
          <span
            className={[
              "mt-1 block text-[9px] font-semibold tracking-[0.14em]",
              light ? "text-white/65" : "text-[var(--text-muted)]",
            ].join(" ")}
          >
            SMART INVENTORY
          </span>
        </div>
      )}
    </div>
  );
}
