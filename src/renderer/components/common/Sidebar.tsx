import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Boxes,
  CircleDollarSign,
  LayoutDashboard,
  Package,
  PanelRightClose,
  PanelRightOpen,
  ReceiptText,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  LogOut,
  History,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import StockLiteLogo from "../brand/StockLiteLogo";
import ConfirmDialog from "../ui/ConfirmDialog";
import { PATHS } from "../../routes/path";

const TOOLTIP_GAP = 10;

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
    label: "سجل النشاط",
    path: PATHS.ACTIVITY_LOGS,
    icon: History,
  },
  {
    label: "الإعدادات",
    path: PATHS.SETTINGS,
    icon: Settings,
  },
];

type TooltipPosition = {
  top: number;
  right: number;
};

type FloatingTooltipProps = {
  isVisible: boolean;
  position: TooltipPosition | null;
  children: ReactNode;
};

function FloatingTooltip({
  isVisible,
  position,
  children,
}: FloatingTooltipProps) {
  if (
    !isVisible ||
    !position ||
    typeof document === "undefined"
  ) {
    return null;
  }

  return createPortal(
    <div
      role="tooltip"
      dir="rtl"
      style={{
        position: "fixed",
        top: position.top,
        right: position.right,
      }}
      className={[
        "pointer-events-none z-[9999]",
        "-translate-y-1/2",
        "animate-in fade-in zoom-in-95",
        "whitespace-nowrap rounded-md",
        "border border-[var(--border)]",
        "bg-[var(--text-primary)] px-3 py-2",
        "text-xs font-medium text-[var(--surface)]",
        "shadow-lg duration-150",
      ].join(" ")}
    >
      {children}

      <span
        className={[
          "absolute right-[-5px] top-1/2",
          "h-2.5 w-2.5 -translate-y-1/2 rotate-45",
          "border-r border-t border-[var(--text-primary)]",
          "bg-[var(--text-primary)]",
        ].join(" ")}
        aria-hidden="true"
      />
    </div>,
    document.body,
  );
}

type TooltipController = {
  isVisible: boolean;
  position: TooltipPosition | null;
  showTooltip: (element: HTMLElement) => void;
  hideTooltip: () => void;
};

function useFloatingTooltip(): TooltipController {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] =
    useState<TooltipPosition | null>(null);

  const activeElementRef = useRef<HTMLElement | null>(null);

  const updatePosition = useCallback(() => {
    const element = activeElementRef.current;

    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();

    setPosition({
      top: rect.top + rect.height / 2,
      right: window.innerWidth - rect.left + TOOLTIP_GAP,
    });
  }, []);

  const showTooltip = useCallback(
    (element: HTMLElement) => {
      activeElementRef.current = element;
      updatePosition();
      setIsVisible(true);
    },
    [updatePosition],
  );

  const hideTooltip = useCallback(() => {
    activeElementRef.current = null;
    setIsVisible(false);
    setPosition(null);
  }, []);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const handlePositionChange = () => {
      updatePosition();
    };

    window.addEventListener("resize", handlePositionChange);
    window.addEventListener(
      "scroll",
      handlePositionChange,
      true,
    );

    return () => {
      window.removeEventListener(
        "resize",
        handlePositionChange,
      );
      window.removeEventListener(
        "scroll",
        handlePositionChange,
        true,
      );
    };
  }, [isVisible, updatePosition]);

  return {
    isVisible,
    position,
    showTooltip,
    hideTooltip,
  };
}

function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

  const navigationTooltip = useFloatingTooltip();
  const toggleTooltip = useFloatingTooltip();

  const [navigationTooltipLabel, setNavigationTooltipLabel] =
    useState("");

  const toggleLabel = isCollapsed
    ? "انقر لإظهار القائمة الجانبية"
    : "انقر لتصغير القائمة الجانبية";

  const requestLogout = () => {
    navigationTooltip.hideTooltip();
    toggleTooltip.hideTooltip();
    setIsLogoutDialogOpen(true);
  };

  const handleLogout = async () => {
    setIsLogoutDialogOpen(false);
    await auth.logout();
    navigate(PATHS.LOGIN, { replace: true });
  };

  const handleToggle = () => {
    toggleTooltip.hideTooltip();
    navigationTooltip.hideTooltip();

    setIsCollapsed((current) => !current);
  };

  return (
    <>
      <aside
        className={[
          "app-sidebar flex h-screen shrink-0 flex-col",
          "border-l border-[var(--border)]",
          "bg-[var(--surface)]",
          "transition-[width] duration-300 ease-in-out",
          isCollapsed ? "w-[72px]" : "w-[260px]",
        ].join(" ")}
      >
        <SidebarHeader
          isCollapsed={isCollapsed}
          toggleLabel={toggleLabel}
          onToggle={handleToggle}
          onToggleMouseEnter={(element) => {
            toggleTooltip.showTooltip(element);
          }}
          onToggleMouseLeave={toggleTooltip.hideTooltip}
        />

        <nav
          className={[
            "min-h-0 flex-1 overflow-y-auto overflow-x-hidden",
            "py-5 transition-[padding] duration-300",
            isCollapsed ? "px-2" : "px-3",
          ].join(" ")}
        >
          {!isCollapsed && (
            <p
              className={[
                "mb-2 whitespace-nowrap px-3",
                "text-[11px] font-bold tracking-wide",
                "text-[var(--text-muted)]",
              ].join(" ")}
            >
              القائمة الرئيسية
            </p>
          )}

          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === PATHS.DASHBOARD}
                  aria-label={item.label}
                  onMouseEnter={(event) => {
                    if (!isCollapsed) {
                      return;
                    }

                    setNavigationTooltipLabel(item.label);

                    navigationTooltip.showTooltip(
                      event.currentTarget,
                    );
                  }}
                  onMouseLeave={() => {
                    navigationTooltip.hideTooltip();
                  }}
                  onClick={() => {
                    navigationTooltip.hideTooltip();
                  }}
                  className={({ isActive }) =>
                    [
                      "group relative flex h-11 items-center",
                      "rounded-md text-sm font-medium",
                      "transition-colors duration-150",
                      "focus-visible:outline-none",
                      "focus-visible:ring-2",
                      "focus-visible:ring-[var(--primary)]",
                      "focus-visible:ring-offset-2",
                      "focus-visible:ring-offset-[var(--surface)]",
                      isCollapsed
                        ? "justify-center px-0"
                        : "gap-3 px-3",
                      isActive
                        ? [
                            "bg-[var(--primary-subtle)]",
                            "text-[var(--primary)]",
                          ].join(" ")
                        : [
                            "text-[var(--text-secondary)]",
                            "hover:bg-[var(--surface-hover)]",
                            "hover:text-[var(--text-primary)]",
                          ].join(" "),
                    ].join(" ")
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          className={[
                            "absolute bottom-2 right-0 top-2",
                            "w-[3px] rounded-l-full",
                            "bg-[var(--primary)]",
                          ].join(" ")}
                          aria-hidden="true"
                        />
                      )}

                      <Icon
                        size={19}
                        strokeWidth={isActive ? 2.1 : 1.8}
                        className={[
                          "shrink-0 transition-colors",
                          isActive
                            ? "text-[var(--primary)]"
                            : [
                                "text-[var(--text-muted)]",
                                "group-hover:text-[var(--text-primary)]",
                              ].join(" "),
                        ].join(" ")}
                        aria-hidden="true"
                      />

                      {!isCollapsed && (
                        <span className="min-w-0 flex-1 truncate whitespace-nowrap">
                          {item.label}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        <SidebarFooter isCollapsed={isCollapsed} onLogout={requestLogout} />
      </aside>

      <FloatingTooltip
        isVisible={
          isCollapsed && navigationTooltip.isVisible
        }
        position={navigationTooltip.position}
      >
        {navigationTooltipLabel}
      </FloatingTooltip>

      <FloatingTooltip
        isVisible={toggleTooltip.isVisible}
        position={toggleTooltip.position}
      >
        {toggleLabel}
      </FloatingTooltip>

      <ConfirmDialog
        open={isLogoutDialogOpen}
        title="تسجيل الخروج"
        message="هل أنت متأكد أنك تريد تسجيل الخروج من StockLite؟"
        confirmText="تسجيل الخروج"
        cancelText="إلغاء"
        onCancel={() => setIsLogoutDialogOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}

type SidebarHeaderProps = {
  isCollapsed: boolean;
  toggleLabel: string;
  onToggle: () => void;
  onToggleMouseEnter: (element: HTMLElement) => void;
  onToggleMouseLeave: () => void;
};

function SidebarHeader({
  isCollapsed,
  toggleLabel,
  onToggle,
  onToggleMouseEnter,
  onToggleMouseLeave,
}: SidebarHeaderProps) {
  return (
    <header
      className={[
        "shrink-0 border-b border-[var(--border)]",
        "transition-[padding] duration-300",
        isCollapsed ? "px-2 py-4" : "px-4 py-4",
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center",
          isCollapsed
            ? "flex-col gap-3"
            : "justify-between gap-3",
        ].join(" ")}
      >
        <div
          className={[
            "flex min-w-0 items-center",
            isCollapsed ? "justify-center" : "gap-3",
          ].join(" ")}
        >
          <StockLiteLogo
            size={isCollapsed ? "sm" : "md"}
            className="shrink-0"
          />

          {!isCollapsed && (
            <div className="min-w-0">
              <h1
                dir="ltr"
                className={[
                  "truncate text-lg font-bold",
                  "tracking-[-0.02em]",
                  "text-[var(--text-primary)]",
                ].join(" ")}
              >
                StockLite
              </h1>

              <p
                className={[
                  "mt-0.5 truncate whitespace-nowrap",
                  "text-xs text-[var(--text-muted)]",
                ].join(" ")}
              >
                إدارة المخزون والمبيعات
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggle}
          onMouseEnter={(event) => {
            onToggleMouseEnter(event.currentTarget);
          }}
          onMouseLeave={onToggleMouseLeave}
          aria-label={toggleLabel}
          aria-expanded={!isCollapsed}
          className={[
            "flex h-9 w-9 shrink-0",
            "items-center justify-center rounded-md",
            "border border-[var(--border)]",
            "text-[var(--text-secondary)]",
            "transition-colors duration-150",
            "hover:border-[var(--primary)]",
            "hover:bg-[var(--primary-subtle)]",
            "hover:text-[var(--primary)]",
            "focus-visible:outline-none",
            "focus-visible:ring-2",
            "focus-visible:ring-[var(--primary)]",
            "focus-visible:ring-offset-2",
            "focus-visible:ring-offset-[var(--surface)]",
          ].join(" ")}
        >
          {isCollapsed ? (
            <PanelRightOpen
              size={18}
              aria-hidden="true"
            />
          ) : (
            <PanelRightClose
              size={18}
              aria-hidden="true"
            />
          )}
        </button>
      </div>
    </header>
  );
}

type SidebarFooterProps = {
  isCollapsed: boolean;
  onLogout: () => void;
};

function SidebarFooter({
  isCollapsed,
  onLogout,
}: SidebarFooterProps) {
  return (
    <footer
      className={[
        "shrink-0 border-t border-[var(--border)]",
        isCollapsed ? "p-2.5" : "px-3 py-3",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onLogout}
        aria-label="تسجيل الخروج"
        className={[
          "group flex h-9 w-full items-center rounded-lg",
          "border border-transparent text-sm font-semibold",
          "text-[var(--text-secondary)] transition-colors",
          "hover:border-[var(--danger)]/15",
          "hover:bg-[var(--danger-subtle)]",
          "hover:text-[var(--danger)]",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-[var(--danger)]/25",
          isCollapsed ? "justify-center px-0" : "justify-center gap-2 px-3",
        ].join(" ")}
      >
        <LogOut size={16} strokeWidth={1.9} aria-hidden="true" />
        {!isCollapsed && <span>تسجيل الخروج</span>}
      </button>
    </footer>
  );
}

export default Sidebar;