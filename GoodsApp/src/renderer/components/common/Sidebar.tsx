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
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-[#1e293b] text-white">
      <div className="border-b border-white/10 px-6 py-5">
        <h1 className="text-2xl font-bold">StockLite</h1>
        <p className="mt-1 text-sm text-slate-300">إدارة بسيطة وواضحة</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === PATHS.DASHBOARD}
              className={({ isActive }) =>
                [
                  "flex min-h-12 items-center gap-3 rounded-xl px-4 py-3",
                  "text-base font-medium transition-colors",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-200 hover:bg-white/10 hover:text-white",
                ].join(" ")
              }
            >
              <Icon size={21} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;