import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import DashboardPage from "../pages/dashboard/DashboardPage";
import { PATHS } from "./path";


function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<DashboardPage />} />

          <Route
            path="*"
            element={<Navigate to={PATHS.DASHBOARD} replace />}
          />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default AppRouter;