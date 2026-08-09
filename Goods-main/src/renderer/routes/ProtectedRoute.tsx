import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { LoadingSpinner } from "../components/ui";
import { PATHS } from "./path";

export default function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <LoadingSpinner label="جاري التحقق من الجلسة..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={PATHS.LOGIN} replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
