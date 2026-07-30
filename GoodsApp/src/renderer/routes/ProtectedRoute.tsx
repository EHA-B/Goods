import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { PATHS } from "./path";

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to={PATHS.LOGIN} replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
