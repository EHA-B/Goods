import { notifyError, notifyWarning } from "../../lib/notifications";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, LockKeyhole, LogIn, UserRound } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import StockLiteLogo from "../../components/brand/StockLiteLogo";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useAuth } from "../../auth/AuthContext";
import { PATHS } from "../../routes/path";

export default function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  if (auth.isAuthenticated) {
    return <Navigate to={PATHS.DASHBOARD} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const nextErrors = {
      username: username.trim() ? undefined : "أدخل اسم المستخدم",
      password: password ? undefined : "أدخل كلمة المرور",
    };

    setErrors(nextErrors);

    if (nextErrors.username || nextErrors.password) {
      notifyWarning("يرجى إكمال بيانات تسجيل الدخول");
      return;
    }

    setIsLoading(true);

    try {
      await auth.login({ username, password });
      const from =
        (location.state as { from?: string } | null)?.from ?? PATHS.DASHBOARD;
      navigate(from, { replace: true });
    } catch {
      notifyError({ code: "INVALID_CREDENTIALS" }, { title: "تعذر تسجيل الدخول" });
      setErrors({ password: "تحقق من بيانات الدخول" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="stocklite-auth-page relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-8"
    >
      <div className="stocklite-auth-decoration" aria-hidden="true">
        <span className="stocklite-auth-bubble stocklite-auth-bubble-1" />
        <span className="stocklite-auth-bubble stocklite-auth-bubble-2" />
        <span className="stocklite-auth-bubble stocklite-auth-bubble-3" />
        <span className="stocklite-auth-bubble stocklite-auth-bubble-4" />
      </div>

      <section className="stocklite-login-card relative z-10 w-full max-w-[420px]">
        <div className="mb-7 flex justify-center">
          <StockLiteLogo size="md" showWordmark />
        </div>

        <div className="rounded-[22px] border border-white/80 bg-white/[0.92] px-6 py-7 shadow-[0_20px_65px_rgba(31,94,75,0.12)] backdrop-blur-md sm:px-8 sm:py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">
              تسجيل الدخول
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              أدخل بياناتك للمتابعة إلى StockLite
            </p>
          </div>

          <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">
                اسم المستخدم
              </span>
              <Input
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  if (errors.username) setErrors((current) => ({ ...current, username: undefined }));
                }}
                error={Boolean(errors.username)}
                placeholder="اسم المستخدم"
                startContent={<UserRound size={17} />}
                containerClassName="stocklite-auth-input h-11 rounded-xl"
              />
              {errors.username && (
                <span className="mt-1.5 block text-xs text-[var(--danger)]">
                  {errors.username}
                </span>
              )}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">
                كلمة المرور
              </span>
              <Input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
                }}
                error={Boolean(errors.password)}
                placeholder="كلمة المرور"
                startContent={<LockKeyhole size={17} />}
                containerClassName="stocklite-auth-input h-11 rounded-xl"
                endContent={
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--primary-subtle)] hover:text-[var(--primary)]"
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
              {errors.password && (
                <span className="mt-1.5 block text-xs text-[var(--danger)]">
                  {errors.password}
                </span>
              )}
            </label>

            <Button
              type="submit"
              size="lg"
              fullWidth
              isLoading={isLoading}
              loadingText="جاري تسجيل الدخول..."
              startIcon={<LogIn size={17} />}
              className="mt-1 h-11 rounded-xl text-sm shadow-[0_8px_22px_rgba(15,118,110,0.18)]"
            >
              تسجيل الدخول
            </Button>
          </form>

        </div>
      </section>
    </main>
  );
}
