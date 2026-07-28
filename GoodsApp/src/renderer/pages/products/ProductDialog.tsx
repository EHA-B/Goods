import { useState } from "react";
import { Product } from "../../components/products/ProductsTable";
import { Button, Dialog, Input, Select, Textarea } from "../../components/ui";



const STATUS_OPTIONS = [
  { value: "available", label: "متوفر" },
  { value: "low", label: "كمية منخفضة" },
  { value: "out", label: "غير متوفر" },
];

type Props = {
  open: boolean;
  product?: Product;
  onClose: () => void;
  onSave: (product: Product) => void;
};

export default function ProductDialog({
  open,
  product,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] =
  useState<Product>(() => ({
    id: product?.id ?? Date.now(),
    name: product?.name ?? "",
    code: product?.code ?? "",
    category: product?.category ?? "",
    quantity: product?.quantity ?? 0,
    unit: product?.unit ?? "",
    salePrice: product?.salePrice ?? 0,
    status:
      product?.status ?? "available",
  }));

  function update<K extends keyof Product>(
    key: K,
    value: Product[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleSave() {
    onSave(form);
    onClose();
  }

  return (
    <Dialog
      open={open}
      title={
        product
          ? "تعديل منتج"
          : "إضافة منتج"
      }
      onClose={onClose}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={onClose}
          >
            إلغاء
          </Button>

          <Button onClick={handleSave}>
            حفظ
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1 text-sm font-medium">
            اسم المنتج
          </p>

          <Input
            value={form.name}
            onChange={(e) =>
              update(
                "name",
                e.target.value,
              )
            }
          />
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">
            الكود
          </p>

          <Input
            value={form.code}
            onChange={(e) =>
              update(
                "code",
                e.target.value,
              )
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-1 text-sm font-medium">
              التصنيف
            </p>

            <Input
              value={form.category}
              onChange={(e) =>
                update(
                  "category",
                  e.target.value,
                )
              }
            />
          </div>

          <div>
            <p className="mb-1 text-sm font-medium">
              الحالة
            </p>

            <Select
              value={form.status}
              options={STATUS_OPTIONS}
              onChange={(e) =>
                update(
                  "status",
                  e.target.value as Product["status"],
                )
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="mb-1 text-sm font-medium">
              الكمية
            </p>

            <Input
              type="number"
              value={form.quantity}
              onChange={(e) =>
                update(
                  "quantity",
                  Number(
                    e.target.value,
                  ),
                )
              }
            />
          </div>

          <div>
            <p className="mb-1 text-sm font-medium">
              الوحدة
            </p>

            <Input
              value={form.unit}
              onChange={(e) =>
                update(
                  "unit",
                  e.target.value,
                )
              }
            />
          </div>

          <div>
            <p className="mb-1 text-sm font-medium">
              سعر البيع
            </p>

            <Input
              type="number"
              value={form.salePrice}
              onChange={(e) =>
                update(
                  "salePrice",
                  Number(
                    e.target.value,
                  ),
                )
              }
            />
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">
            ملاحظات
          </p>

          <Textarea placeholder="اختياري..." />
        </div>
      </div>
    </Dialog>
  );
}