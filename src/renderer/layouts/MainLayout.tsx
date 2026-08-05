import { Outlet } from "react-router-dom";

import Sidebar from "../components/common/Sidebar";
import LockScreen from "../components/auth/LockScreen";

function MainLayout() {
  return (
    <div
      dir="rtl"
      className="flex h-screen overflow-hidden bg-[var(--background)]"
    >
      <Sidebar />
      <LockScreen />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1600px] p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default MainLayout;
