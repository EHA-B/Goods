import { useEffect, useState } from "react";
import { LockKeyhole, RotateCcw } from "lucide-react";
import { Button, Dialog, Input, Textarea } from "../ui";

export type PaymentReversalDialogPayment = {
  id: number;
  amount: number;
  currency?: string | null;
  cashbox_name?: string | null;
};

export default function PaymentReversalDialog({
  open,
  payment,
  invoiceLabel,
  partyLabel,
  loading = false,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  payment: PaymentReversalDialogPayment | null;
  invoiceLabel?: string;
  partyLabel?: string;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: (input: { reason: string; password: string }) => Promise<void> | void;
}) {
  const [reason, setReason] = useState("تصحيح دفعة");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) {
      setReason("تصحيح دفعة");
      setPassword("");
    }
  }, [open, payment?.id]);

  const canSubmit = Boolean(payment && reason.trim() && password && !loading);
  const currency = payment?.currency || "SYP";

  return (
    <Dialog
      open={open}
      title="عكس الدفعة"
      onClose={() => !loading && onClose()}
      footer={
        <>
          <Button variant="secondary" disabled={loading} onClick={onClose}>إلغاء</Button>
          <Button
            variant="danger"
            disabled={!canSubmit}
            isLoading={loading}
            startIcon={<RotateCcw size={16} />}
            onClick={() => void onConfirm({ reason: reason.trim(), password })}
          >
            تأكيد عكس الدفعة
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-[var(--radius-md)] border border-[var(--danger)]/25 bg-[var(--danger)]/5 p-3 text-sm leading-6 text-[var(--text-secondary)]">
          سيتم عكس أثر الدفعة على الفاتورة والصندوق ورصيد {partyLabel || "الطرف"} ضمن عملية محاسبية واحدة. لا يؤثر هذا الإجراء على المخزون.
        </div>

        {payment && (
          <div className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-sm sm:grid-cols-2">
            <div><span className="text-[var(--text-muted)]">الدفعة:</span> <strong>#{payment.id}</strong></div>
            <div><span className="text-[var(--text-muted)]">المبلغ:</span> <strong>{Number(payment.amount || 0).toLocaleString("en-US")} {currency}</strong></div>
            {invoiceLabel && <div><span className="text-[var(--text-muted)]">الفاتورة:</span> <strong>{invoiceLabel}</strong></div>}
            {payment.cashbox_name && <div><span className="text-[var(--text-muted)]">الصندوق:</span> <strong>{payment.cashbox_name}</strong></div>}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-bold text-[var(--text-primary)]">سبب العكس</label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="اكتب سبب عكس الدفعة" />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-bold text-[var(--text-primary)]">كلمة المرور</label>
          <Input
            type="password"
            autoFocus
            value={password}
            placeholder="كلمة مرور المستخدم الحالي"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) void onConfirm({ reason: reason.trim(), password });
            }}
          />
          <p className="mt-1.5 flex items-center gap-1 text-xs text-[var(--text-muted)]"><LockKeyhole size={13} /> العملية محمية بكلمة المرور.</p>
        </div>

        {error && (
          <div className="rounded-[var(--radius-sm)] border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-3 py-2 text-sm font-bold text-[var(--danger)]">
            {error}
          </div>
        )}
      </div>
    </Dialog>
  );
}
