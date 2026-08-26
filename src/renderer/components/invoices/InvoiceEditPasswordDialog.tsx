import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Button, Dialog, Input } from "../ui";

export default function InvoiceEditPasswordDialog({ open, loading, error, onErrorClear, onClose, onConfirm }: { open: boolean; loading?: boolean; error?: string; onErrorClear?: () => void; onClose: () => void; onConfirm: (password: string) => void; }) {
  const [password, setPassword] = useState("");
  useEffect(() => { if (open) setPassword(""); }, [open]);
  return <Dialog open={open} title="تأكيد تعديل الفاتورة" onClose={() => !loading && onClose()} footer={<>
    <Button variant="secondary" disabled={loading} onClick={onClose}>إلغاء</Button>
    <Button disabled={!password || loading} isLoading={Boolean(loading)} startIcon={<LockKeyhole size={16} />} onClick={() => onConfirm(password)}>حفظ التعديل</Button>
  </>}>
    <div className="space-y-4">
      <p className="text-sm leading-6 text-[var(--text-secondary)]">تعديل الفواتير عملية محاسبية حساسة. أدخل كلمة مرور المستخدم الحالي لتأكيد الحفظ.</p>
      <Input type="password" autoFocus value={password} placeholder="كلمة المرور" onChange={(e) => { setPassword(e.target.value); onErrorClear?.(); }} onKeyDown={(e) => { if (e.key === "Enter" && password && !loading) onConfirm(password); }} />
      {error && <div className="rounded-[var(--radius-sm)] border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-3 py-2 text-sm font-bold text-[var(--danger)]">{error}</div>}
    </div>
  </Dialog>;
}
