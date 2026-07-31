import { useEffect, useState } from "react";

import type { Product } from "../../components/products/ProductsTable";
import {
  Button,
  Dialog,
  Input,
  Select,
  Textarea,
} from "../../components/ui";

const STATUS_OPTIONS = [
  { value: "available", label: "متوفر" },
  { value: "low", label: "كمية منخفضة" },
  { value: "out", label: "غير متوفر" },
];

type Props = {
  open: boolean;
  product?: Product | null;
  onClose: () => void;
  onSave: (product: Product) => void;
};

function createForm(product?: Product | null): Product {
  return {
    id: product?.id ?? Date.now(),
    name: product?.name ?? "",
    code: product?.code ?? "",
    category: product?.category ?? "",
    quantity: product?.quantity ?? 0,
    unit: product?.unit ?? "",
    salePrice: product?.salePrice ?? 0,
    status: product?.status ?? "available",
  };
}

export default function ProductDialog({
  open,
  product,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<Product>(() => createForm(product));

  useEffect(() => {
    if (open) {
      setForm(createForm(product));
    }
  }, [open, product]);

  function update<K extends keyof Product>(
    key: K,
    value: Product[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSave() {
    if (!form.name.trim() || !form.code.trim()) {
      return;
    }

    onSave({
      ...form,
      name: form.name.trim(),
      code: form.code.trim(),
      category: form.category.trim(),
      unit: form.unit.trim(),
    });
    onClose();
  }

  return (
    <Dialog
      open={open}
      title={product ? "تعديل منتج" : "إضافة منتج"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>

          <Button onClick={handleSave}>حفظ</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1 text-sm font-medium">اسم المنتج</p>
          <Input
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
          />
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">الكود</p>
          <Input
            value={form.code}
            onChange={(event) => update("code", event.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-1 text-sm font-medium">التصنيف</p>
            <Input
              value={form.category}
              onChange={(event) => update("category", event.target.value)}
            />
          </div>

          <div>
            <p className="mb-1 text-sm font-medium">الحالة</p>
            <Select
              value={form.status}
              options={STATUS_OPTIONS}
              onChange={(event) =>
                update("status", event.target.value as Product["status"])
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="mb-1 text-sm font-medium">الكمية</p>
            <Input
              type="number"
              min={0}
              value={form.quantity}
              onChange={(event) =>
                update("quantity", Number(event.target.value))
              }
            />
          </div>

          <div>
            <p className="mb-1 text-sm font-medium">الوحدة</p>
            <Input
              value={form.unit}
              onChange={(event) => update("unit", event.target.value)}
            />
          </div>

          <div>
            <p className="mb-1 text-sm font-medium">سعر البيع</p>
            <Input
              type="number"
              min={0}
              value={form.salePrice}
              onChange={(event) =>
                update("salePrice", Number(event.target.value))
              }
            />
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">ملاحظات</p>
          <Textarea placeholder="اختياري..." />
        </div>
      </div>
    </Dialog>
  );
}
