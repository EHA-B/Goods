import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, DatabaseBackup, FileJson, RotateCcw } from "lucide-react";
import { BackButton, Button, Card, PageHeader } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { settingsService } from "./settingsService";

function formatDate(value: string) {
  if (!value) return "لا توجد نسخة مسجلة";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function BackupSettingsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [lastBackup, setLastBackup] = useState(settingsService.getLastBackupAt());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "exported" | "restored" | "error">("idle");
  const [acknowledged, setAcknowledged] = useState(false);

  const exportBackup = () => {
    const createdAt = settingsService.downloadBackup();
    setLastBackup(createdAt);
    setStatus("exported");
  };

  const restoreBackup = async () => {
    if (!selectedFile || !acknowledged) return;
    try {
      await settingsService.restoreBackup(selectedFile);
      setStatus("restored");
      setLastBackup(settingsService.getLastBackupAt());
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      <PageHeader
        title="النسخ الاحتياطي"
        description="احفظ نسخة من بيانات الواجهة الحالية أو استعد نسخة سابقة."
        actions={<BackButton to={PATHS.SETTINGS} />}
      />

      {status !== "idle" && (
        <div className={`mb-4 flex items-center gap-2 rounded-[var(--radius-sm)] border px-4 py-3 text-sm font-medium ${status === "error" ? "border-[#e8b8b8] bg-[#fff4f4] text-[#9c3c3c]" : "border-[#b7d7c5] bg-[#f1f8f4] text-[#37634d]"}`}>
          {status === "error" ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          {status === "exported" && "تم إنشاء ملف النسخة الاحتياطية بنجاح."}
          {status === "restored" && "تمت استعادة البيانات. أعد فتح الصفحة لتحديث جميع الأقسام."}
          {status === "error" && "الملف غير صالح أو لا ينتمي إلى نسخة StockLite."}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card header="إنشاء نسخة احتياطية" description="يتم تصدير البيانات المحلية الحالية إلى ملف JSON.">
          <div className="flex min-h-[250px] flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-[var(--primary)]">
              <DatabaseBackup size={29} />
            </div>
            <h3 className="mt-5 text-base font-bold text-[var(--text-primary)]">تنزيل نسخة من البيانات</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--text-muted)]">احتفظ بالملف في مكان آمن. سيشمل إعدادات وبيانات التخزين المحلي المستخدمة حاليًا في الواجهة.</p>
            <div className="mt-4 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] px-4 py-2 text-xs text-[var(--text-secondary)]">
              آخر نسخة: <span dir="ltr" className="font-bold">{formatDate(lastBackup)}</span>
            </div>
            <Button className="mt-5" onClick={exportBackup} startIcon={<DatabaseBackup size={17} />}>إنشاء نسخة احتياطية</Button>
          </div>
        </Card>

        <Card header="استعادة نسخة احتياطية" description="اختر ملف JSON سبق إنشاؤه من النظام.">
          <div className="min-h-[250px]">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed border-[var(--border-strong)] px-5 py-8 text-center transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-subtle)]"
            >
              <FileJson size={31} className="text-[var(--primary)]" />
              <span className="mt-3 text-sm font-bold text-[var(--text-primary)]">{selectedFile ? selectedFile.name : "اختيار ملف النسخة"}</span>
              <span className="mt-1 text-xs text-[var(--text-muted)]">ملفات JSON فقط</span>
            </button>
            <input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={(event) => { setSelectedFile(event.target.files?.[0] ?? null); setStatus("idle"); setAcknowledged(false); }} />

            <div className="mt-4 rounded-[var(--radius-sm)] border border-[#e6cf9a] bg-[#fff9e9] p-4">
              <div className="flex items-start gap-2 text-sm font-bold text-[#7c6023]">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                تنبيه قبل الاستعادة
              </div>
              <p className="mt-2 text-xs leading-5 text-[#856f3d]">ستستبدل الاستعادة بيانات التخزين المحلي الحالية بالبيانات الموجودة داخل الملف المختار.</p>
              <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs font-medium text-[#6f5c31]">
                <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-0.5" />
                أفهم أن البيانات الحالية ستُستبدل عند المتابعة.
              </label>
            </div>

            <Button fullWidth className="mt-4" variant="secondary" disabled={!selectedFile || !acknowledged} onClick={restoreBackup} startIcon={<RotateCcw size={17} />}>استعادة النسخة المختارة</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
