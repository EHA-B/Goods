import {
  Boxes,
  CircleDollarSign,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { PATHS } from "../../routes/path";

const navigationItems = [
  {
    label: "لوحة التحكم",
    path: PATHS.DASHBOARD,
    icon: LayoutDashboard,
  },
  {
    label: "المنتجات",
    path: PATHS.PRODUCTS,
    icon: Package,
  },
  {
    label: "المخزون",
    path: PATHS.INVENTORY,
    icon: Warehouse,
  },
  {
    label: "العملاء",
    path: PATHS.CUSTOMERS,
    icon: Users,
  },
  {
    label: "الموردون",
    path: PATHS.SUPPLIERS,
    icon: Truck,
  },
  {
    label: "المبيعات",
    path: PATHS.SALES,
    icon: ShoppingCart,
  },
  {
    label: "المشتريات",
    path: PATHS.PURCHASES,
    icon: Boxes,
  },
  {
    label: "الصناديق",
    path: PATHS.CASHBOXES,
    icon: CircleDollarSign,
  },
  {
    label: "المعاملات المالية",
    path: PATHS.TRANSACTIONS,
    icon: ReceiptText,
  },
  {
    label: "الإعدادات",
    path: PATHS.SETTINGS,
    icon: Settings,
  },
];

function Sidebar() {
  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface)]">
      <SidebarHeader />

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-2 px-3 text-[11px] font-bold tracking-wide text-[var(--text-muted)]">
          القائمة الرئيسية
        </p>

        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === PATHS.DASHBOARD}
                className={({ isActive }) =>
                  [
                    "group relative flex h-11 items-center gap-3 rounded-md px-3",
                    "text-sm font-medium transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
                    isActive
                      ? "bg-[var(--primary-subtle)] text-[var(--primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute right-0 top-2 bottom-2 w-[3px] rounded-l-full bg-[var(--primary)]" />
                    )}

                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.1 : 1.8}
                      className={[
                        "shrink-0 transition-colors",
                        isActive
                          ? "text-[var(--primary)]"
                          : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]",
                      ].join(" ")}
                      aria-hidden="true"
                    />

                    <span className="flex-1 truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      <SidebarFooter />
    </aside>
  );
}

function SidebarHeader() {
  return (
    <header className="border-b border-[var(--border)] px-5 py-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--primary)] text-white">
          <Boxes size={21} strokeWidth={2} aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <h1
            dir="ltr"
            className="truncate text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)]"
          >
            StockLite
          </h1>

          <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
            إدارة المخزون والمبيعات
          </p>
        </div>
      </div>
    </header>
  );
}

function SidebarFooter() {
  return (
    <footer className="border-t border-[var(--border)] p-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <p
            dir="ltr"
            className="text-xs font-bold text-[var(--text-secondary)]"
          >
            StockLite
          </p>

          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            الإصدار 1.0.0
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#47745e]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#5d8d72]" />
          متصل
        </span>
      </div>
    </footer>
  );
}

export default Sidebar;