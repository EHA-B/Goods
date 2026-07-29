import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Boxes, History, LayoutDashboard, Plus, SlidersHorizontal } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { InventoryStatusBadge, StockBatchesTable, StockMovementsTable } from "../../components/inventory";
import { Button, Card } from "../../components/ui";
import StockMovementDetailsDialog from "./StockMovementDetailsDialog";
import { useInventory } from "./InventoryContext";
import type { StockMovement } from "../../components/inventory";

type Tab = "overview" | "batches" | "movements";
export default function ProductInventoryDetailsPage() {
  const { productId } = useParams(); const navigate = useNavigate();
  const { getProduct, batches, movements } = useInventory();
  const product = getProduct(Number(productId));
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedMovement, setSelectedMovement] = useState<StockMovement>();
  const productBatches = useMemo(() => batches.filter((x) => x.productId === product?.productId), [batches, product]);
  const productMovements = useMemo(() => movements.filter((x) => x.productId === product?.productId), [movements, product]);
  if (!product) return <Navigate to="/inventory" replace />;
  return <>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <Button variant="ghost" startIcon={<ArrowRight size={17} />} onClick={() => navigate("/inventory")}>العودة إلى المخزون</Button>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" startIcon={<Plus size={17} />} onClick={() => navigate(`/inventory/${product.productId}/batches/new`)}>إضافة دفعة</Button>
        <Button startIcon={<SlidersHorizontal size={17} />} onClick={() => navigate(`/inventory/${product.productId}/adjust`)}>تسوية المخزون</Button>
      </div>
    </div>
    <Card padding={false}>
      <div className="flex flex-col gap-5 border-b border-[var(--border)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold text-[var(--text-primary)]">{product.productName}</h1><InventoryStatusBadge status={product.status} /></div><div className="mt-2 flex flex-wrap gap-2 text-sm text-[var(--text-muted)]"><span dir="ltr">{product.productCode}</span><span>•</span><span>{product.categoryName}</span><span>•</span><span>{product.unit}</span></div></div>
        <div className="grid min-w-full grid-cols-2 gap-3 sm:min-w-[420px] lg:min-w-[520px] lg:grid-cols-3"><Summary label="الرصيد الحالي" value={`${product.totalQuantity.toLocaleString()} ${product.unit}`} /><Summary label="قيمة المخزون" value={`${product.stockValue.toLocaleString()} ل.س`} /><Summary label="عدد الدفعات" value={product.batchesCount.toLocaleString()} /></div>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)] px-5 pt-3"><TabButton active={activeTab === "overview"} icon={<LayoutDashboard size={16} />} onClick={() => setActiveTab("overview")}>نظرة عامة</TabButton><TabButton active={activeTab === "batches"} icon={<Boxes size={16} />} onClick={() => setActiveTab("batches")}>الدفعات ({productBatches.length})</TabButton><TabButton active={activeTab === "movements"} icon={<History size={16} />} onClick={() => setActiveTab("movements")}>الحركات ({productMovements.length})</TabButton></div>
      <div className="p-5">
        {activeTab === "overview" && <div className="grid gap-5 xl:grid-cols-2"><Card header="بيانات المخزون"><dl className="divide-y divide-[var(--border)]"><Line label="الرصيد الحالي" value={`${product.totalQuantity.toLocaleString()} ${product.unit}`} /><Line label="الحد الأدنى" value={`${product.minimumStock.toLocaleString()} ${product.unit}`} /><Line label="متوسط سعر الشراء" value={`${product.averagePurchasePrice.toLocaleString()} ل.س`} /><Line label="قيمة المخزون" value={`${product.stockValue.toLocaleString()} ل.س`} /><Line label="أقرب انتهاء" value={product.nearestExpiryDate ?? "لا يوجد"} /></dl></Card><Card header="التوريد والدفعات"><dl className="divide-y divide-[var(--border)]"><Line label="عدد الدفعات" value={productBatches.length.toLocaleString()} /><Line label="عدد الموردين" value={product.suppliersCount.toLocaleString()} /><div className="py-3"><dt className="text-xs text-[var(--text-muted)]">الموردون</dt><dd className="mt-2 flex flex-wrap gap-2">{product.supplierNames.map((name) => <span key={name} className="rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-1 text-xs font-medium">{name}</span>)}</dd></div></dl></Card></div>}
        {activeTab === "batches" && <section><Heading title="دفعات المادة" description="تفاصيل المورد والكميات وسعر الشراء وتواريخ الاستلام والانتهاء." /><div className="mt-4 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)]"><StockBatchesTable batches={productBatches} /></div></section>}
        {activeTab === "movements" && <section><Heading title="سجل حركة المادة" description="جميع عمليات الإدخال والإخراج والتسويات مرتبة حسب التاريخ." /><div className="mt-4 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)]"><StockMovementsTable movements={productMovements} onViewDetails={setSelectedMovement} /></div></section>}
      </div>
    </Card>
    <StockMovementDetailsDialog movement={selectedMovement} onClose={() => setSelectedMovement(undefined)} />
  </>;
}
function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] px-4 py-3"><p className="text-xs text-[var(--text-muted)]">{label}</p><p dir="ltr" className="mt-1 text-right font-bold">{value}</p></div>; }
function Line({ label, value }: { label: string; value: string }) { return <div className="grid grid-cols-[140px_1fr] gap-4 py-3"><dt className="text-sm text-[var(--text-muted)]">{label}</dt><dd className="text-sm font-bold">{value}</dd></div>; }
function Heading({ title, description }: { title: string; description: string }) { return <div><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p></div>; }
function TabButton({ active, icon, children, onClick }: { active: boolean; icon: ReactNode; children: ReactNode; onClick: () => void }) { return <button type="button" onClick={onClick} className={["inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-bold", active ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--text-muted)]"].join(" ")}>{icon}{children}</button>; }
