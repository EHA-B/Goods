import { getArabicErrorMessage } from "../../../lib/errorNormalizer";
import { Printer, ReceiptText, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ConsignmentSettlementResult from "../../../components/consignment/ConsignmentSettlementResult";
import { BackButton, Button, EmptyState, LoadingSpinner, PageHeader } from "../../../components/ui";
import { consignmentService } from "./consignmentService";
import type { ConsignmentSettlement } from "./consignmentTypes";

export default function ConsignmentSettlementDetailsPage() {
  const { purchaseId } = useParams();
  const id = Number(purchaseId);
  const navigate = useNavigate();
  const location = useLocation();
  const [settlement, setSettlement] = useState<ConsignmentSettlement | null>((location.state as { settlement?: ConsignmentSettlement } | null)?.settlement ?? null);
  const [loading, setLoading] = useState(!settlement);
  const [reversing, setReversing] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try { setError(""); setSettlement(await consignmentService.getSettlement(id)); }
    catch (e) { setError(getArabicErrorMessage(e, "تعذر تحميل التسوية.")); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (!settlement) void load(); }, [id]);

  const reverse = async () => {
    if (!settlement || settlement.status === "reversed") return;
    const reason = window.prompt("سبب عكس التسوية:", "تصحيح تسوية الأمانة");
    if (!reason?.trim()) return;
    try {
      setReversing(true);
      setError("");
      setSettlement(await consignmentService.reverseSettlement(settlement.id, reason.trim()));
    } catch (e) {
      setError(getArabicErrorMessage(e, "تعذر عكس التسوية."));
    } finally {
      setReversing(false);
    }
  };

  if (loading) return <div className="flex min-h-72 items-center justify-center"><LoadingSpinner /></div>;
  if (!settlement) return <EmptyState icon={<ReceiptText size={32} />} title="لا توجد تسوية مسجلة" description={error || "لم يتم إغلاق فاتورة الأمانة بعد."} action={<Button onClick={() => navigate(`/purchases/${id}/close-consignment`)}>بدء التسوية</Button>} />;

  return <div className="print:bg-white">
    <PageHeader title={`تسوية الأمانة ${settlement.settlement_number}`} description="تفاصيل نتيجة إغلاق وتسوية فاتورة الأمانة." actions={<div className="flex flex-wrap gap-2 print:hidden"><BackButton to={`/purchases/${id}`} /><Button variant="secondary" startIcon={<Printer size={17} />} onClick={() => navigate(`/print/consignment/${id}`)}>طباعة</Button>{settlement.status === "completed" && <Button variant="danger" startIcon={<RotateCcw size={17} />} loading={reversing} onClick={() => void reverse()}>عكس التسوية</Button>}</div>} />
    {error && <div className="mb-4 rounded-lg border border-[var(--danger)] bg-[var(--danger-subtle)] p-3 text-sm font-bold text-[var(--danger)]">{error}</div>}
    <ConsignmentSettlementResult settlement={settlement} />
  </div>;
}
