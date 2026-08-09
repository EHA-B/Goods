import { notifyError } from "./lib/notifications";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "./auth/AuthContext";
import { AppearanceProvider } from "./settings/AppearanceContext";
import SplashScreen from "./pages/auth/SplashScreen";
import AppRouter from "./routes/AppRouter";
import GlobalErrorBoundary from "./components/ui/GlobalErrorBoundary";

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 3600);
    const onError = (event: ErrorEvent) => notifyError(event.error ?? event.message, { title: "حدث خطأ غير متوقع" });
    const onRejection = (event: PromiseRejectionEvent) => notifyError(event.reason, { title: "تعذر إكمال العملية" });
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return (
    <AppearanceProvider>
      <AuthProvider>
        <GlobalErrorBoundary>{showSplash ? <SplashScreen /> : <AppRouter />}</GlobalErrorBoundary>
        <Toaster position="top-center" richColors dir="rtl" expand visibleToasts={4} gap={10} toastOptions={{ className: "stocklite-toast", duration: 4200, style: { direction: "rtl", textAlign: "right" } }} />
      </AuthProvider>
    </AppearanceProvider>
  );
}

export default App;
