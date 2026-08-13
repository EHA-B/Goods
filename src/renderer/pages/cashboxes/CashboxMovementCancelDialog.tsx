import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import { notifySuccess } from "../../lib/notifications";
import { formatMoney } from "../../pages/cashboxes/currency";
import {
  executeCashboxMovementAction,
  getCashboxMovementAction,
  getLinkedFinancialTransactionDetails,
} from "../../pages/cashboxes/cashboxMovementActions";
import { Button, Dialog, Input } from "../../components/ui";

type FinancialTransactionDetails = {
  transaction?: {
    id: number;
    direction?: string | null;
    amount?: number | string | null;
    transaction_date?: string | null;
    description?: string | null;
    reference_number?: string | null;
    status?: string | null;
  };
  category?: {
    name?: string | null;
  } | null;
  cashbox?: {
    name?: string | null;
  } | null;
};

type Props = {
  movement: CashboxMovementRecord | null;
  currency: string;
  onClose: () => void;
  onCompleted: () => void | Promise<void>;
};

const typeLabel = (direction?: string | null) =>
  direction === "income"
    ? "إيراد"
    : direction === "expense"
      ? "مصروف"
      : "معاملة مالية";

export default function CashboxMovementCancelDialog({
  movement,
  currency,
  onClose,
  onCompleted,
}: Props) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [details, setDetails] =
    useState<FinancialTransactionDetails | null>(null);

  const [error, setError] = useState("");

  const action = movement
    ? getCashboxMovementAction(movement)
    : null;

  useEffect(() => {
    let cancelled = false;

    setReason("");
    setError("");
    setDetails(null);

    if (
      !movement ||
      action?.kind !== "financial_transaction_cancel"
    ) {
      setDetailsLoading(false);
      return;
    }

    setDetailsLoading(true);

    void getLinkedFinancialTransactionDetails(movement)
      .then((result) => {
        if (!cancelled) {
          setDetails(
            (result ?? null) as FinancialTransactionDetails | null,
          );
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            getArabicErrorMessage(
              loadError,
              "تعذر تحميل تفاصيل المعاملة المالية المرتبطة.",
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [movement, action?.kind]);

  if (!movement || !action) {
    return null;
  }

  async function handleConfirm() {
    if (!reason.trim()) {
      setError("يرجى إدخال سبب الإلغاء.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await executeCashboxMovementAction(
        movement!,
        reason,
      );

      if (
        action!.kind ===
        "financial_transaction_cancel"
      ) {
        notifySuccess(
          "تم إلغاء المعاملة المالية وعكس أثرها على الصندوق بنجاح.",
        );
      } else if (
        action!.kind === "transfer_reverse"
      ) {
        notifySuccess(
          "تم عكس التحويل وتحديث أرصدة الصناديق بنجاح.",
        );
      } else {
        notifySuccess(
          "تم عكس حركة الصندوق بنجاح.",
        );
      }

      await onCompleted();
      onClose();
    } catch (actionError) {
      setError(
        getArabicErrorMessage(
          actionError,
          "تعذر تنفيذ عملية الإلغاء أو العكس.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const transaction =
    details?.transaction;

  return (
    <Dialog
      open
      title={action.title}
      onClose={() => {
        if (!submitting) {
          onClose();
        }
      }}
      footer={
        <>
          <Button
            variant="secondary"
            disabled={submitting}
            onClick={onClose}
          >
            تراجع
          </Button>

          <Button
            variant="danger"
            startIcon={<RotateCcw size={16} />}
            disabled={
              submitting ||
              !reason.trim() ||
              detailsLoading
            }
            onClick={() =>
              void handleConfirm()
            }
          >
            {submitting
              ? "جاري التنفيذ..."
              : action.buttonLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          {action.description}
        </p>

        {action.kind ===
          "financial_transaction_cancel" && (
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
            {detailsLoading ? (
              <p className="text-sm text-[var(--text-muted)]">
                جاري تحميل بيانات المعاملة المالية...
              </p>
            ) : transaction ? (
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">
                    رقم المعاملة
                  </p>
                  <p className="mt-1 font-bold">
                    #{transaction.id}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[var(--text-muted)]">
                    النوع
                  </p>
                  <p className="mt-1 font-bold">
                    {typeLabel(
                      transaction.direction,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[var(--text-muted)]">
                    الفئة
                  </p>
                  <p className="mt-1 font-bold">
                    {details?.category?.name ||
                      "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[var(--text-muted)]">
                    الصندوق
                  </p>
                  <p className="mt-1 font-bold">
                    {details?.cashbox?.name ||
                      "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[var(--text-muted)]">
                    المبلغ
                  </p>
                  <p
                    dir="ltr"
                    className="mt-1 text-right font-bold tabular-nums"
                  >
                    {formatMoney(
                      Number(
                        transaction.amount ??
                          movement.amount,
                      ),
                      currency,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[var(--text-muted)]">
                    التاريخ
                  </p>
                  <p
                    dir="ltr"
                    className="mt-1 text-right font-medium"
                  >
                    {transaction.transaction_date ||
                      movement.transaction_date}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-xs text-[var(--text-muted)]">
                    البيان
                  </p>
                  <p className="mt-1 font-medium">
                    {transaction.description ||
                      movement.notes ||
                      "—"}
                  </p>
                </div>

                {transaction.reference_number && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-[var(--text-muted)]">
                      رقم المرجع
                    </p>

                    <p
                      dir="ltr"
                      className="mt-1 text-right font-medium"
                    >
                      {
                        transaction.reference_number
                      }
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                سيتم استخدام المعاملة المالية المرتبطة بالحركة رقم{" "}
                {movement.reference_id ?? "—"}.
              </p>
            )}
          </div>
        )}

        {action.kind !==
          "financial_transaction_cancel" && (
          <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-[var(--text-muted)]">
                رقم حركة الصندوق
              </p>

              <p className="mt-1 font-bold">
                #{movement.id}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--text-muted)]">
                المبلغ
              </p>

              <p
                dir="ltr"
                className="mt-1 text-right font-bold tabular-nums"
              >
                {formatMoney(
                  Number(movement.amount),
                  currency,
                )}
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-bold text-[var(--text-primary)]">
            سبب الإلغاء *
          </label>

          <Input
            value={reason}
            placeholder="اكتب سبب الإلغاء..."
            disabled={submitting}
            onChange={(event) => {
              setReason(event.target.value);

              if (error) {
                setError("");
              }
            }}
          />
        </div>

        {error && (
          <p className="rounded-[var(--radius-md)] bg-[var(--danger-subtle)] px-3 py-2 text-sm font-bold text-[var(--danger)]">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}