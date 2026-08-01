import {
  CheckCircle2,
  Code2,
  Cpu,
  Database,
  FolderOpen,
  MonitorCog,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import StockLiteLogo from "../../components/brand/StockLiteLogo";
import {
  BackButton,
  Button,
  Card,
  PageHeader,
  Skeleton,
} from "../../components/ui";
import { PATHS } from "../../routes/path";

type AppInfo = {
  appName: string;
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
  chromiumVersion: string;
  databaseEngine: string;
  databasePath: string;
  platform: string;
  architecture: string;
  environment: "development" | "production";
};

function platformLabel(platform: string) {
  if (platform === "win32") return "Windows";
  if (platform === "darwin") return "macOS";
  if (platform === "linux") return "Linux";
  return platform || "—";
}

export default function AboutSettingsPage() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAppInfo() {
    setIsLoading(true);
    setError("");

    try {
      const info = await window.stockliteApi.system.getAppInfo();
      setAppInfo(info);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "تعذر تحميل معلومات البرنامج.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAppInfo();
  }, []);

  const info = useMemo(
    () => [
      {
        label: "اسم البرنامج",
        value: appInfo?.appName ?? "StockLite",
        icon: MonitorCog,
        ltr: true,
      },
      {
        label: "إصدار البرنامج",
        value: appInfo?.appVersion ?? "—",
        icon: Code2,
        ltr: true,
      },
      {
        label: "محرك قاعدة البيانات",
        value: appInfo?.databaseEngine ?? "—",
        icon: Database,
        ltr: true,
      },
      {
        label: "بيئة التشغيل",
        value:
          appInfo?.environment === "production" ? "نسخة إنتاج" : "وضع تطوير",
        icon: CheckCircle2,
        ltr: false,
      },
      {
        label: "Electron",
        value: appInfo?.electronVersion ?? "—",
        icon: Cpu,
        ltr: true,
      },
      {
        label: "Node.js / Chromium",
        value: appInfo
          ? `${appInfo.nodeVersion} / ${appInfo.chromiumVersion}`
          : "—",
        icon: Code2,
        ltr: true,
      },
      {
        label: "نظام التشغيل",
        value: appInfo
          ? `${platformLabel(appInfo.platform)} (${appInfo.architecture})`
          : "—",
        icon: MonitorCog,
        ltr: true,
      },
    ],
    [appInfo],
  );

  return (
    <>
      <PageHeader
        title="حول البرنامج"
        description="معلومات الإصدار وبيئة التشغيل وقاعدة بيانات StockLite."
        actions={<BackButton to={PATHS.SETTINGS} />}
      />

      <div className="mx-auto max-w-4xl space-y-5">
        <Card>
          <div className="flex flex-col items-center py-5 text-center">
            <StockLiteLogo size="lg" />

            <h2
              dir="ltr"
              className="mt-5 text-2xl font-bold tracking-[-0.02em] text-[var(--text-primary)]"
            >
              StockLite
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
              نظام متكامل وبسيط لإدارة المنتجات والمخزون والمبيعات والمشتريات
              والعملاء والموردين والعمليات المالية.
            </p>
          </div>
        </Card>

        <Card header="معلومات النظام">
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-[74px]" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--danger)]/25 bg-[var(--danger)]/5 p-5 text-center">
              <p className="text-sm font-medium text-[var(--danger)]">{error}</p>
              <Button className="mt-4" variant="secondary" onClick={loadAppInfo}>
                إعادة المحاولة
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {info.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface)] text-[var(--primary)]">
                      <Icon size={19} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs text-[var(--text-muted)]">
                        {item.label}
                      </p>
                      <p
                        dir={item.ltr ? "ltr" : "rtl"}
                        className="mt-1 truncate text-sm font-bold text-[var(--text-primary)]"
                        title={item.value}
                      >
                        {item.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card header="موقع قاعدة البيانات">
          <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface)] text-[var(--primary)]">
              <FolderOpen size={19} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--text-muted)]">
                المسار الفعلي لملف SQLite
              </p>
              {isLoading ? (
                <Skeleton className="mt-2 h-5 w-full" />
              ) : (
                <p
                  dir="ltr"
                  className="mt-1 break-all text-left text-sm font-medium text-[var(--text-secondary)]"
                >
                  {appInfo?.databasePath ?? "—"}
                </p>
              )}
            </div>
          </div>
        </Card>

        <p className="pb-3 text-center text-xs text-[var(--text-muted)]">
          © 2026 StockLite. جميع الحقوق محفوظة.
        </p>
      </div>
    </>
  );
}
