import { useEffect, useState } from "react";
import {
  AlertTriangle,
  DatabaseBackup,
  FolderOpen,
  RotateCcw,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import {
  BackButton,
  Button,
  Card,
  Input,
  PageHeader,
  Switch,
} from "../../components/ui";
import { PATHS } from "../../routes/path";

type BackupInterval = "daily" | "weekly";

type AutoBackupConfig = {
  enabled: boolean;
  interval: BackupInterval;
  directory: string;
  lastBackup: string | null;
};

const DEFAULT_CONFIG: AutoBackupConfig = {
  enabled: false,
  interval: "daily",
  directory: "",
  lastBackup: null,
};

function readableError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "حدث خطأ غير متوقع";
}

export default function BackupSettingsPage() {
  const [config, setConfig] = useState<AutoBackupConfig>(DEFAULT_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);

  useEffect(() => {
    let active = true;

    window.stockliteApi.system
      .getAutoBackupConfig()
      .then((result) => {
        if (active) setConfig(result as AutoBackupConfig);
      })
      .catch((error) => {
        toast.error(`فشل تحميل إعدادات النسخ الاحتياطي: ${readableError(error)}`);
      })
      .finally(() => {
        if (active) setLoadingConfig(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleManualBackup() {
    try {
      setCreatingBackup(true);
      const selection = await window.stockliteApi.system.selectSaveFile();
      if (selection.canceled || !selection.path) return;

      const result = (await window.stockliteApi.system.backup(selection.path)) as {
        destination?: string;
      };

      toast.success(
        result.destination
          ? `تم إنشاء النسخة الاحتياطية بنجاح في: ${result.destination}`
          : "تم إنشاء النسخة الاحتياطية بنجاح.",
      );
    } catch (error) {
      toast.error(`فشل النسخ الاحتياطي: ${readableError(error)}`);
    } finally {
      setCreatingBackup(false);
    }
  }

  async function handleManualRestore() {
    try {
      const selection = await window.stockliteApi.system.selectOpenFile();
      if (selection.canceled || !selection.path) return;

      const confirmed = window.confirm(
        "سيتم التحقق من النسخة وإنشاء نسخة طوارئ من البيانات الحالية، ثم استبدال قاعدة البيانات وإعادة تشغيل التطبيق.\n\nهل تريد المتابعة؟",
      );
      if (!confirmed) return;

      const typedConfirmation = window.prompt(
        'للتأكيد النهائي اكتب كلمة "استعادة" ثم اضغط موافق:',
      );
      if (typedConfirmation?.trim() !== "استعادة") {
        toast.info("تم إلغاء عملية الاستعادة.");
        return;
      }

      setRestoringBackup(true);
      toast.loading("جارٍ فحص النسخة واستعادة البيانات...", {
        id: "database-restore",
      });
      await window.stockliteApi.system.restore(selection.path);
    } catch (error) {
      toast.dismiss("database-restore");
      toast.error(`فشل استعادة البيانات: ${readableError(error)}`);
      setRestoringBackup(false);
    }
  }

  async function saveAutoBackupConfig() {
    if (config.enabled && !config.directory.trim()) {
      toast.error("الرجاء اختيار مجلد الحفظ للنسخ التلقائي.");
      return;
    }

    try {
      setSavingConfig(true);
      const result = await window.stockliteApi.system.setAutoBackupConfig({
        ...config,
        directory: config.directory.trim(),
      });
      setConfig(result as AutoBackupConfig);
      toast.success("تم حفظ إعدادات النسخ التلقائي بنجاح.");
    } catch (error) {
      toast.error(`فشل حفظ الإعدادات: ${readableError(error)}`);
    } finally {
      setSavingConfig(false);
    }
  }

  async function selectAutoDirectory() {
    try {
      const selection = await window.stockliteApi.system.selectDirectory();
      if (!selection.canceled && selection.path) {
        setConfig((previous) => ({
          ...previous,
          directory: selection.path ?? "",
        }));
      }
    } catch (error) {
      toast.error(readableError(error));
    }
  }

  function formatDate(value: string | null): string {
    if (!value) return "لم يتم إجراء نسخ تلقائي بعد";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "غير معروف";
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <>
      <PageHeader
        title="النسخ الاحتياطي والاستعادة"
        description="إنشاء نسخة كاملة من قاعدة البيانات واستعادتها بأمان، مع دعم النسخ التلقائي."
        actions={<BackButton to={PATHS.SETTINGS} />}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card header="النسخ اليدوي" description="حفظ قاعدة البيانات أو استعادة نسخة سابقة">
          <div className="flex flex-col gap-6">
            <div className="flex min-h-[170px] flex-col items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-5 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-[var(--primary)]">
                <DatabaseBackup size={29} />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                إنشاء نسخة احتياطية متكاملة
              </h3>
              <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">
                ينشئ النظام لقطة SQLite سليمة ومستقلة تشمل جميع بيانات التطبيق.
              </p>
              <Button
                className="mt-5"
                isLoading={creatingBackup}
                disabled={restoringBackup}
                onClick={() => void handleManualBackup()}
                startIcon={<DatabaseBackup size={17} />}
              >
                إنشاء نسخة احتياطية
              </Button>
            </div>

            <div className="flex min-h-[180px] flex-col items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[#e6cf9a] bg-[#fff9e9] p-5 text-center dark:border-[#705f34] dark:bg-[#2c271a]">
              <div className="mb-2 flex items-start gap-2 text-sm font-bold text-[#7c6023] dark:text-[#e7cc83]">
                <AlertTriangle size={20} className="shrink-0" />
                استعادة نسخة سابقة
              </div>
              <p className="max-w-sm text-xs leading-5 text-[#856f3d] dark:text-[#d7c184]">
                يفحص النظام سلامة الملف أولًا، وينشئ نسخة طوارئ من البيانات الحالية، ثم يعيد تشغيل التطبيق بعد الاستعادة.
              </p>
              <Button
                variant="danger"
                className="mt-5"
                isLoading={restoringBackup}
                disabled={creatingBackup}
                onClick={() => void handleManualRestore()}
                startIcon={<RotateCcw size={17} />}
              >
                استعادة النسخة
              </Button>
            </div>
          </div>
        </Card>

        <Card
          header="النسخ الاحتياطي التلقائي"
          description="حفظ نسخة دورية أثناء تشغيل التطبيق والاحتفاظ بآخر سبع نسخ"
        >
          {loadingConfig ? (
            <div className="py-14 text-center text-sm text-[var(--text-muted)]">
              جارٍ تحميل الإعدادات...
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-[var(--divider)] pb-4">
                <div>
                  <h4 className="text-sm font-bold">تفعيل النسخ التلقائي</h4>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    يفحص النظام موعد النسخة كل ساعة أثناء تشغيل التطبيق.
                  </p>
                </div>
                <Switch
                  checked={config.enabled}
                  onChange={(event) =>
                    setConfig((previous) => ({
                      ...previous,
                      enabled: event.target.checked,
                    }))
                  }
                />
              </div>

              <div
                className={`flex flex-col gap-5 ${
                  config.enabled ? "" : "pointer-events-none opacity-50"
                }`}
              >
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">
                    مجلد الحفظ التلقائي
                  </label>
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      value={config.directory}
                      readOnly
                      placeholder="اختر مجلدًا يمكن الكتابة فيه..."
                    />
                    <Button
                      variant="secondary"
                      onClick={() => void selectAutoDirectory()}
                      startIcon={<FolderOpen size={16} />}
                    >
                      تصفح
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">
                    فترة النسخ
                  </label>
                  <select
                    className="flex w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none transition-colors focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                    value={config.interval}
                    onChange={(event) =>
                      setConfig((previous) => ({
                        ...previous,
                        interval: event.target.value as BackupInterval,
                      }))
                    }
                  >
                    <option value="daily">يوميًا</option>
                    <option value="weekly">أسبوعيًا</option>
                  </select>
                </div>
              </div>

              <div className="mt-2 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] p-3 text-xs text-[var(--text-secondary)]">
                آخر نسخة تلقائية: {" "}
                <span dir="ltr" className="font-bold">
                  {formatDate(config.lastBackup)}
                </span>
              </div>

              <div className="mt-2 flex justify-end">
                <Button
                  isLoading={savingConfig}
                  onClick={() => void saveAutoBackupConfig()}
                  startIcon={<Save size={16} />}
                >
                  حفظ الإعدادات
                </Button>
              </div>
            </div>
          )}
        </Card>

      </div>
    </>
  );
}
