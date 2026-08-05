import { getArabicErrorMessage } from "../../../lib/errorNormalizer";
import { ArrowLeft, HandCoins, PackageOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ConsignmentSalesTable from "../../../components/consignment/ConsignmentSalesTable";
import ConsignmentStatusBadge from "../../../components/consignment/ConsignmentStatusBadge";
import ConsignmentSummaryCards from "../../../components/consignment/ConsignmentSummaryCards";
import { BackButton, Button, Card, EmptyState, LoadingSpinner, PageHeader } from "../../../components/ui";
import type { ConsignmentInvoiceSummary } from "./consignmentTypes";
import { consignmentService } from "./consignmentService";

export default function ConsignmentOverviewPage() {
  const { purchaseId } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<ConsignmentInvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const id = Number(purchaseId);
  const load = async () => { try { setLoading(true); setError(""); setSummary(await consignmentService.getSummary(id)); } catch (e) { setError(getArabicErrorMessage(e, "تعذر تحميل بيانات الأمانة.")); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [id]);
  if (loading) return <div className="flex min-h-72 items-center justify-center"><LoadingSpinner /></div>;
  if (error || !summary) return <EmptyState icon={<PackageOpen size={32} />} title="تعذر تحميل بيانات الأمانة" description={error || "الفاتورة غير موجودة."} action={<Button onClick={() => void load()}>إعادة المحاولة</Button>} />;
  return <>
    <PageHeader title={`متابعة فاتورة الأمانة ${summary.invoice.invoice_number}`} description="عرض المبيعات والكميات المتبقية قبل إغلاق وتسوية الفاتورة." actions={<div className="flex flex-wrap gap-2"><BackButton to={`/purchases/${id}`} /><Button variant="secondary" startIcon={<ArrowLeft size={17} />} onClick={() => navigate(`/purchases/${id}/consignment-settlement`)}>عرض التسوية</Button>{summary.invoice.settlement_status === "pending" && <Button startIcon={<HandCoins size={17} />} onClick={() => navigate(`/purchases/${id}/close-consignment`)}>إغلاق وتسوية</Button>}</div>} />
    <Card className="mb-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["المورد", summary.invoice.supplier_name], ["تاريخ الفاتورة", summary.invoice.invoice_date], ["العملة", summary.invoice.currency], ["حالة التسوية", <ConsignmentStatusBadge status={summary.invoice.settlement_status} />]].map(([label, value]) => <div key={String(label)}><p className="text-xs font-bold text-[var(--text-muted)]">{label}</p><div className="mt-2 text-sm font-black">{value}</div></div>)}</div></Card>
    <ConsignmentSummaryCards summary={summary} />
    <Card className="mt-5" padding={false} header="الأصناف والمبيعات" description="الكميات المستلمة والمباعة والمتبقية لكل دفعة."><ConsignmentSalesTable items={summary.items} currency={summary.invoice.currency} /></Card>
  </>;
}
