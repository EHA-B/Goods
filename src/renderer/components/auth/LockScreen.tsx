import { FormEvent, useEffect, useState } from "react";
import { LockKeyhole, Eye, EyeOff } from "lucide-react";
import StockLiteLogo from "../brand/StockLiteLogo";
import { useAuth } from "../../auth/AuthContext";

const IDLE_MS = 10 * 60 * 1000;

export default function LockScreen() {
  const { user, unlock } = useAuth();
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let timer = window.setTimeout(() => setLocked(true), IDLE_MS);
    const reset = () => {
      if (locked) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setLocked(true), IDLE_MS);
    };
    const events: (keyof WindowEventMap)[] = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((event) => window.addEventListener(event, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [user, locked]);

  if (!locked) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!password) {
      setError("أدخل كلمة المرور");
      return;
    }

    setIsLoading(true);
    try {
      await unlock(password);
      setPassword("");
      setError("");
      setLocked(false);
    } catch {
      setError("كلمة المرور غير صحيحة");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div dir="rtl" className="stocklite-lock fixed inset-0 z-[12000] flex items-center justify-center p-5">
      <form onSubmit={submit} className="w-full max-w-[390px] rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow-lg)]">
        <div className="flex flex-col items-center text-center">
          <StockLiteLogo size="lg" />
          <div className="mt-5 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-[var(--primary)]"><LockKeyhole size={20} /></div>
          <h1 className="mt-4 text-xl font-bold text-[var(--text-primary)]">تم قفل StockLite</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">مرحبًا {user?.full_name}، أدخل كلمة المرور للمتابعة.</p>
        </div>
        <label className="mt-7 block text-sm font-semibold text-[var(--text-secondary)]">كلمة المرور</label>
        <div className="relative mt-2">
          <input autoFocus value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} type={showPassword ? "text" : "password"} className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] px-4 pl-11 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]" placeholder="أدخل كلمة المرور" />
          <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </div>
        {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
        <button type="submit" disabled={isLoading} className="mt-5 h-11 w-full rounded-[var(--radius-md)] bg-[var(--primary)] font-bold text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60">{isLoading ? "جاري التحقق..." : "فتح التطبيق"}</button>
      </form>
    </div>
  );
}
