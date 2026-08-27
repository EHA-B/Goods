import { AlertCircle, Building2, Calculator, HandCoins, Landmark, Minus, WalletCards } from "lucide-react";
import type { ReactNode } from "react";
import type { ConsignmentClosingPreview } from "../../pages/purchases/consignment/consignmentTypes";
import { money } from "../../pages/purchases/consignment/consignmentUtils";

type Props = {
  preview: ConsignmentClosingPreview | null;
  loading?: boolean;
  policyLabel?: string;
};

type RowProps = {
  icon: ReactNode;
  label: string;
  value: string;
  emphasis?: boolean;
  danger?: boolean;
  muted?: boolean;
};

function SummaryRow({ icon, label, value, emphasis, danger, muted }: RowProps) {
  return (
    <div
      className={[
        "flex items-center justify-between gap-4 rounded-lg px-3 py-3",
        emphasis ? "bg-[var(--primary-subtle)]" : "bg-[var(--surface-subtle)]",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="shrink-0 text-[var(--text-muted)]">{icon}</span>
        <span className="truncate text-xs font-bold text-[var(--text-muted)]">{label}</span>
      </div>
      <strong
        className={[
          "shrink-0 text-sm font-black",
          danger ? "text-[var(--danger)]" : muted ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]",
        ].join(" ")}
      >
        {value}
      </strong>
    </div>
  );
}

export default function CommissionPreviewCard({ preview, loading = false, policyLabel }: Props) {
  return (
    <aside className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <div className="flex items-center gap-2">
          <Calculator size={18} className="text-[var(--primary)]" />
          <h2 className="text-sm font-black text-[var(--text-primary)]">ملخص العملية</h2>
        </div>
        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          يتم تحديث القيم تلقائيًا بعد اكتمال البيانات.
        </p>
      </div>

      <div className="space-y-2.5 p-4">
        {loading ? (
          <div className="space-y-2.5" aria-label="جارٍ حساب المعاينة">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="h-11 animate-pulse rounded-lg bg-[var(--surface-subtle)]" />
            ))}
          </div>
        ) : preview ? (
          <>
            <SummaryRow
              icon={<WalletCards size={16} />}
              label="إجمالي المبيعات"
              value={money(preview.total_sales_amount, preview.currency)}
            />
            <SummaryRow
              icon={<Calculator size={16} />}
              label="قيمة العمولة"
              value={money(preview.commission_amount, preview.currency)}
            />
            <SummaryRow
              icon={<HandCoins size={16} />}
              label="حصة المورد من المبيعات"
              value={money(preview.supplier_share_base, preview.currency)}
              muted
            />
            {preview.spoilage_value > 0 && (
              <SummaryRow
                icon={<Calculator size={16} />}
                label="القيمة التقديرية للتلف"
                value={money(preview.spoilage_value, preview.currency)}
                muted
              />
            )}
            {preview.return_value > 0 && (
              <SummaryRow
                icon={<Landmark size={16} />}
                label="قيمة المرتجع (مستردة للصندوق)"
                value={money(preview.return_value, preview.currency)}
                emphasis
              />
            )}
            {preview.prepaid_amount > 0 && (
              <SummaryRow
                icon={<Minus size={16} />}
                label="المدفوع مسبقاً للمورد"
                value={`- ${money(preview.prepaid_amount, preview.currency)}`}
                muted
              />
            )}
            <SummaryRow
              icon={<HandCoins size={16} />}
              label={preview.prepaid_amount > 0 ? "صافي المبلغ المستحق (من الصندوق)" : "حصة المورد"}
              value={money(preview.net_supplier_payout, preview.currency)}
              emphasis
            />
            <SummaryRow
              icon={<Landmark size={16} />}
              label="رصيد الصندوق الحالي"
              value={money(preview.cashbox_balance, preview.currency)}
            />
            <SummaryRow
              icon={<Building2 size={16} />}
              label="الرصيد بعد التسوية"
              value={money(preview.balance_after_settlement, preview.currency)}
              danger={preview.balance_after_settlement < 0}
            />
            {policyLabel && (
              <div className="rounded-lg border border-[var(--border)] px-3 py-3">
                <p className="text-xs font-bold text-[var(--text-muted)]">معالجة الكمية المتبقية</p>
                <p className="mt-1 text-sm font-black text-[var(--text-primary)]">{policyLabel}</p>
              </div>
            )}
            {preview.warnings.length > 0 && (
              <div className="space-y-2 rounded-lg border border-[var(--warning)] bg-[var(--warning-subtle)] p-3">
                {preview.warnings.map((warning) => (
                  <p key={warning} className="flex items-start gap-2 text-xs font-bold leading-5 text-[var(--warning)]">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    <span>{warning}</span>
                  </p>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--border-strong)] px-4 py-8 text-center">
            <Calculator size={28} className="mx-auto text-[var(--text-muted)]" />
            <p className="mt-3 text-sm font-bold text-[var(--text-primary)]">أكمل بيانات التسوية</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              اختر الصندوق وأدخل نسبة عمولة صحيحة لعرض الملخص.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
