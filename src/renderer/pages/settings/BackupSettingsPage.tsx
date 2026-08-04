import { useEffect, useState } from "react";
import { AlertTriangle, DatabaseBackup, RotateCcw, FolderOpen, Save } from "lucide-react";
import { toast } from "sonner";
import { BackButton, Button, Card, PageHeader, Input, Switch } from "../../components/ui";
import { PATHS } from "../../routes/path";

export default function BackupSettingsPage() {
  const [config, setConfig] = useState({ enabled: false, interval: 'daily', directory: '', lastBackup: null });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    window.stockliteApi.system.getAutoBackupConfig()
      .then((res: any) => {
        setConfig(res);
        setLoadingConfig(false);
      })
      .catch((e: any) => toast.error("فشل تحميل إعدادات النسخ الاحتياطي: " + e.message));
  }, []);

  const handleManualBackup = async () => {
    try {
      const { canceled, path } = await window.stockliteApi.system.selectSaveFile();
      if (canceled || !path) return;
      
      const res = await window.stockliteApi.system.backup(path);
      if (res.success) {
        toast.success("تم إنشاء النسخة الاحتياطية بنجاح.");
      }
    } catch (e: any) {
      toast.error("فشل النسخ الاحتياطي: " + e.message);
    }
  };

  const handleManualRestore = async () => {
    try {
      const { canceled, path } = await window.stockliteApi.system.selectOpenFile();
      if (canceled || !path) return;
      
      if (!confirm("تحذير خطير: استعادة قاعدة البيانات ستستبدل البيانات الحالية ببيانات النسخة الاحتياطية وسيقوم النظام بإعادة التشغيل تلقائياً.\n\nهل أنت متأكد من رغبتك في المتابعة؟")) {
        return;
      }
      
      await window.stockliteApi.system.restore(path);
    } catch (e: any) {
      toast.error("فشل استعادة البيانات: " + e.message);
    }
  };

  const saveAutoBackupConfig = async () => {
    if (config.enabled && !config.directory) {
      toast.error("الرجاء اختيار مجلد الحفظ للنسخ التلقائي");
      return;
    }
    try {
      setSavingConfig(true);
      const res = await window.stockliteApi.system.setAutoBackupConfig(config);
      setConfig(res);
      toast.success("تم حفظ إعدادات النسخ التلقائي بنجاح");
    } catch (e: any) {
      toast.error("فشل الحفظ: " + e.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const selectAutoDir = async () => {
    try {
      const { canceled, path } = await window.stockliteApi.system.selectDirectory();
      if (!canceled && path) {
        setConfig(prev => ({ ...prev, directory: path }));
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const formatDate = (val: string | null) => {
    if (!val) return "لم يتم إجراء نسخ تلقائي بعد";
    return new Date(val).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <PageHeader
        title="النسخ الاحتياطي"
        description="إدارة النسخ الاحتياطي اليدوي والتلقائي لقاعدة البيانات."
        actions={<BackButton to={PATHS.SETTINGS} />}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        
        {/* Manual Backup/Restore Card */}
        <Card header="النسخ الاحتياطي اليدوي" description="إنشاء نسخة واستعادة البيانات">
          <div className="flex flex-col gap-6">
            <div className="flex min-h-[150px] flex-col items-center justify-center text-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] mb-4">
                <DatabaseBackup size={29} />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">إنشاء نسخة من قاعدة البيانات</h3>
              <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">احفظ ملف قاعدة البيانات بالكامل. يمكنك استخدامه لاحقاً لاستعادة النظام لشكله الحالي.</p>
              <Button className="mt-5" onClick={() => void handleManualBackup()} startIcon={<DatabaseBackup size={17} />}>إنشاء نسخة احتياطية</Button>
            </div>

            <div className="flex min-h-[150px] flex-col items-center justify-center text-center rounded-[var(--radius-md)] border border-dashed border-[#e6cf9a] bg-[#fff9e9] p-5">
              <div className="flex items-start gap-2 text-sm font-bold text-[#7c6023] mb-2">
                <AlertTriangle size={20} className="shrink-0" />
                استعادة نسخة سابقة
              </div>
              <p className="max-w-sm text-xs leading-5 text-[#856f3d]">سيتم استبدال كافة البيانات الحالية بالنسخة المختارة وسيتم إعادة تشغيل النظام بشكل فوري.</p>
              <Button variant="danger" className="mt-5" onClick={() => void handleManualRestore()} startIcon={<RotateCcw size={17} />}>استعادة النسخة...</Button>
            </div>
          </div>
        </Card>

        {/* Auto Backup Config Card */}
        <Card header="النسخ الاحتياطي التلقائي" description="إعداد النظام لأخذ نسخة احتياطية يومياً أو أسبوعياً">
          {!loadingConfig && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-[var(--divider)] pb-4">
                <div>
                  <h4 className="text-sm font-bold">تفعيل النسخ التلقائي</h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1">يعمل النسخ التلقائي في الخلفية أثناء تشغيل النظام.</p>
                </div>
                <Switch
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                />
              </div>

              <div className={`flex flex-col gap-5 ${!config.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">مجلد الحفظ التلقائي</label>
                  <div className="flex gap-2">
                    <Input 
                      className="flex-1" 
                      value={config.directory} 
                      readOnly 
                      placeholder="اختر المجلد..."
                    />
                    <Button variant="secondary" onClick={() => void selectAutoDir()} startIcon={<FolderOpen size={16}/>}>تصفح</Button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">فترة النسخ</label>
                  <select
                    className="flex w-full items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none transition-colors focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                    value={config.interval}
                    onChange={(e) => setConfig({ ...config, interval: e.target.value })}
                  >
                    <option value="daily">يومياً</option>
                    <option value="weekly">أسبوعياً</option>
                  </select>
                </div>
              </div>

              <div className="mt-2 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] p-3 text-xs text-[var(--text-secondary)]">
                آخر نسخة تلقائية: <span dir="ltr" className="font-bold">{formatDate(config.lastBackup)}</span>
              </div>

              <div className="mt-2 flex justify-end">
                <Button isLoading={savingConfig} onClick={() => void saveAutoBackupConfig()} startIcon={<Save size={16}/>}>حفظ الإعدادات</Button>
              </div>
            </div>
          )}
        </Card>

      </div>
    </>
  );
}
