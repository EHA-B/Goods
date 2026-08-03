import { Printer, ReceiptText } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ConsignmentSettlementResult from "../../../components/consignment/ConsignmentSettlementResult";
import { BackButton, Button, EmptyState, LoadingSpinner, PageHeader } from "../../../components/ui";
import { consignmentService } from "./consignmentService";
import type { ConsignmentSettlement } from "./consignmentTypes";

export default function ConsignmentSettlementDetailsPage() {
  const { purchaseId } = useParams(); const id = Number(purchaseId); const navigate = useNavigate(); const location = useLocation();
  const [settlement, setSettlement] = useState<ConsignmentSettlement | null>((location.state as { settlement?: ConsignmentSettlement } | null)?.settlement ?? null);
  const [loading, setLoading] = useState(!settlement);
  useEffect(() => { if (settlement) return; void consignmentService.getSettlement(id).then(setSettlement).finally(() => setLoading(false)); }, [id, settlement]);
  if (loading) return <div className="flex min-h-72 items-center justify-center"><LoadingSpinner /></div>;
  if (!settlement) return <EmptyState icon={<ReceiptText size={32} />} title="لا توجد تسوية مسجلة" description="لم يتم إغلاق فاتورة الأمانة بعد." action={<Button onClick={() => navigate(`/purchases/${id}/close-consignment`)}>بدء التسوية</Button>} />;
  return <div className="print:bg-white"><PageHeader title={`تسوية الأمانة ${settlement.settlement_number}`} description="تفاصيل نتيجة إغلاق وتسوية فاتورة الأمانة." actions={<div className="flex gap-2 print:hidden"><BackButton to={`/purchases/${id}`} /><Button variant="secondary" startIcon={<Printer size={17} />} onClick={() => window.print()}>طباعة</Button></div>} /><ConsignmentSettlementResult settlement={settlement} /></div>;
}
