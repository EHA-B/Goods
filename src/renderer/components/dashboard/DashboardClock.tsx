import { useEffect, useState } from "react";

export default function DashboardClock() {
  const [date, setDate] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDate(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const formattedDate = new Intl.DateTimeFormat("ar-SY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

  const formattedTime = new Intl.DateTimeFormat("ar-SY", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);

  return (
    <div className="border-r-2 border-[var(--primary)] pr-4">
      <p className="font-bold text-[var(--text-primary)]">
        {formattedDate}
      </p>

      <p
        dir="ltr"
        className="mt-1 text-xs text-[var(--text-muted)]"
      >
        {formattedTime}
      </p>
    </div>
  );
}