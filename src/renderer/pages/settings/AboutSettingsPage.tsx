import { Boxes, CheckCircle2, Code2, Database, MonitorCog } from "lucide-react";
import { BackButton, Card, PageHeader } from "../../components/ui";
import { PATHS } from "../../routes/path";

const info = [
  { label: "اسم البرنامج", value: "StockLite", icon: MonitorCog },
  { label: "إصدار البرنامج", value: "1.0.0", icon: Code2 },
  { label: "إصدار قاعدة البيانات", value: "قيد الربط", icon: Database },
  { label: "حالة النظام", value: "جاهز", icon: CheckCircle2 },
];

export default function AboutSettingsPage() {
  return (
    <>
      <PageHeader
        title="حول البرنامج"
        description="معلومات الإصدار والحالة العامة لتطبيق StockLite."
        actions={<BackButton to={PATHS.SETTINGS} />}
      />

      <div className="mx-auto max-w-4xl space-y-5">
        <Card>
          <div className="flex flex-col items-center py-5 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-sm">
              <Boxes size={38} strokeWidth={1.8} />
            </div>
            <h2 dir="ltr" className="mt-5 text-2xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">StockLite</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-muted)]">نظام مبسط لإدارة المخزون والمبيعات والمشتريات والعملاء والموردين والصناديق والمعاملات المالية.</p>
          </div>
        </Card>

        <Card header="معلومات النظام">
          <div className="grid gap-3 sm:grid-cols-2">
            {info.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface)] text-[var(--primary)]">
                    <Icon size={19} />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{item.label}</p>
                    <p dir={item.value.match(/[0-9]/) ? "ltr" : "rtl"} className="mt-1 text-sm font-bold text-[var(--text-primary)]">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card header="ملاحظة التطوير">
          <p className="text-sm leading-7 text-[var(--text-secondary)]">هذه الواجهة مجهزة حاليًا للعمل ببيانات محلية مؤقتة. عند اكتمال خدمات الباك إند سيتم ربط معلومات الشركة والنسخ الاحتياطي وإصدار قاعدة البيانات دون تغيير بنية الصفحات أو التصميم.</p>
        </Card>

        <p className="pb-3 text-center text-xs text-[var(--text-muted)]">© 2026 StockLite. جميع الحقوق محفوظة.</p>
      </div>
    </>
  );
}
