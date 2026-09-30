import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import Sidebar from "../components/common/Sidebar";
import LockScreen from "../components/auth/LockScreen";
import FirstRunTour from "../components/onboarding/FirstRunTour";
import { PATHS } from "../routes/path";

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // ── Ctrl+P → Purchases page ──
      if (e.ctrlKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        navigate(PATHS.PURCHASES);
        return;
      }

      // ── Ctrl+S → Sales page ──
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        navigate(PATHS.SALES);
        return;
      }

      // ── Escape → Go back one step ──
      if (e.key === "Escape") {
        // Don't navigate back if a dialog overlay or dropdown is open — let
        // those components handle Escape on their own.
        const hasOverlay = document.querySelector(
          ".fixed.inset-0, [role='listbox']",
        );
        if (hasOverlay) return;

        // Don't navigate back from the dashboard (root page).
        if (location.pathname === "/") return;

        e.preventDefault();
        navigate(-1);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigate, location.pathname]);

  return (
    <div
      dir="rtl"
      className="flex h-screen overflow-hidden bg-[var(--app-background)]"
    >
      <Sidebar />

      <LockScreen />

      <FirstRunTour />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1600px] p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default MainLayout;