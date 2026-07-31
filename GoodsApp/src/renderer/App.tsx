import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "./auth/AuthContext";
import { AppearanceProvider } from "./settings/AppearanceContext";
import SplashScreen from "./pages/auth/SplashScreen";
import AppRouter from "./routes/AppRouter";

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 3600);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AppearanceProvider>
      <AuthProvider>
        {showSplash ? <SplashScreen /> : <AppRouter />}
        <Toaster position="top-center" richColors dir="rtl" toastOptions={{ className: "stocklite-toast", duration: 3000 }} />
      </AuthProvider>
    </AppearanceProvider>
  );
}

export default App;
