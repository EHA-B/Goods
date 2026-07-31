import { AlertCircle, PencilLine, RefreshCw, WalletCards } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  BackButton,
  Button,
  Card,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from "../../components/ui";
import { PATHS } from "../../routes/path";
import {
  getSupplierErrorMessage,
  suppliersService,
  type Supplier,
} from "./suppliersService";

const money = (value: number) =>
  Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 2 });

export default function SupplierDetailsPage() {
  const navigate = useNavigate();
  const { supplierId } = useParams();
  const id = Number(supplierId);
  const [supplier, setSupplier] = useState<Supplier>();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadSupplier = useCallback(async () => {
    if (!Number.isFinite(id)) {
      setLoadError("معرّف المورد غير صالح.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setLoadError("");
      setSupplier(await suppliersService.get(id));
    } catch (error) {
      setLoadError(getSupplierErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadSupplier();
  }, [loadSupplier]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium">جاري تحميل بيانات المورد...</p>
      </div>
    );
  }

  if (loadError || !supplier) {
    return (
      <EmptyState
        icon={<AlertCircle size={26} />}
        title="تعذر تحميل المورد"
        description={loadError || "تعذر العثور على بيانات المورد المطلوبة."}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate(PATHS.SUPPLIERS)}>
              العودة إلى الموردين
            </Button>
            <Button
              startIcon={<RefreshCw size={16} />}
              onClick={() => void loadSupplier()}
            >
              إعادة المحاولة
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <>
      <PageHeader
        title={supplier.name}
        description="بيانات المورد الأساسية وحالته ورصيده الحالي."
        actions={
          <div className="flex gap-2">
            <BackButton to={PATHS.SUPPLIERS} label="العودة إلى الموردين" />
            <Button
              variant="secondary"
              startIcon={<PencilLine size={17} />}
              onClick={() => navigate(`/suppliers/${supplier.id}/edit`)}
            >
              تعديل
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[var(--text-muted)]">الرصيد الحالي</p>
              <p className="mt-2 text-xl font-bold text-[var(--text-primary)]">
                {money(supplier.balance)} ل.س
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {supplier.balance > 0
                  ? "مبلغ مستحق للمورد"
                  : supplier.balance < 0
                    ? "دفعة مقدمة للمورد"
                    : "الحساب متوازن"}
              </p>
            </div>
            <WalletCards size={21} className="text-[var(--primary)]" />
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[var(--text-muted)]">حالة المورد</p>
              <div className="mt-3">
                <StatusBadge variant={supplier.isActive ? "success" : "danger"}>
                  {supplier.isActive ? "نشط" : "غير نشط"}
                </StatusBadge>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card
        header="بيانات المورد"
        description="معلومات التواصل والعنوان والملاحظات."
        className="mt-5"
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs text-[var(--text-muted)]">رقم الهاتف</p>
            <p className="mt-2 font-bold" dir="ltr">
              {supplier.phone || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs text-[var(--text-muted)]">البريد الإلكتروني</p>
            <p className="mt-2 font-bold" dir="ltr">
              {supplier.email || "—"}
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs text-[var(--text-muted)]">العنوان</p>
            <p className="mt-2 font-bold">{supplier.address || "—"}</p>
          </div>

          <div className="md:col-span-2 xl:col-span-4">
            <p className="text-xs text-[var(--text-muted)]">ملاحظات</p>
            <p className="mt-2 text-sm leading-7">
              {supplier.notes || "لا توجد ملاحظات."}
            </p>
          </div>
        </div>
      </Card>

      <Card
        header="الحركات والدفعات"
        description="ستظهر فواتير الشراء والمدفوعات ودفعات المخزون هنا بعد ربط وحدات المشتريات والمخزون."
        className="mt-5"
      >
        <EmptyState
          title="لا توجد بيانات مرتبطة معروضة حاليًا"
          description="تم ربط بيانات المورد الأساسية فقط. سنربط الحركات والدفعات من مصادرها الحقيقية في المراحل التالية بدون استخدام بيانات وهمية."
        />
      </Card>
    </>
  );
}
