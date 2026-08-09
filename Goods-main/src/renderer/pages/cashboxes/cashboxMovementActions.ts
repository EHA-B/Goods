import { cashboxesService } from "./cashboxesService";
import { transactionsService } from "../transactions/transactionsService";

export type CashboxMovementActionKind =
  | "financial_transaction_cancel"
  | "adjustment_reverse"
  | "transfer_reverse"
  | "locked";

export type CashboxMovementAction = {
  kind: CashboxMovementActionKind;
  title: string;
  buttonLabel: string;
  description: string;
  enabled: boolean;
};

export function getCashboxMovementAction(
  movement: CashboxMovementRecord,
): CashboxMovementAction {
  if (
    (movement.reference_type === "income" ||
      movement.reference_type === "expense") &&
    movement.reference_id
  ) {
    return {
      kind: "financial_transaction_cancel",
      title: "إلغاء المعاملة المالية",
      buttonLabel: "إلغاء وعكس العملية",
      description:
        "سيتم إلغاء المعاملة المالية الأصلية وعكس أثرها على الصندوق بنفس منطق صفحة المعاملات المالية، بدون مغادرة صفحة الصندوق.",
      enabled: true,
    };
  }

  if (movement.reference_type === "adjustment") {
    return {
      kind: "adjustment_reverse",
      title: "عكس حركة التسوية",
      buttonLabel: "عكس الحركة",
      description:
        "سيتم إنشاء حركة عكسية لحركة التسوية وتحديث رصيد الصندوق.",
      enabled: true,
    };
  }

  if (
    movement.reference_type === "transfer" &&
    movement.transfer_group_id
  ) {
    return {
      kind: "transfer_reverse",
      title: "عكس التحويل",
      buttonLabel: "عكس التحويل",
      description:
        "سيتم عكس طرفي التحويل معًا بشكل ذري وتحديث رصيدي الصندوقين.",
      enabled: true,
    };
  }

  return {
    kind: "locked",
    title: "حركة مقيّدة",
    buttonLabel: "مقيّد",
    description:
      "هذه الحركة لا تُلغى مباشرة من سجل الصندوق. يجب تنفيذ الإجراء من مصدرها الأساسي إن كان ذلك مسموحًا.",
    enabled: false,
  };
}

export async function executeCashboxMovementAction(
  movement: CashboxMovementRecord,
  reason: string,
) {
  const normalizedReason = reason.trim();

  if (!normalizedReason) {
    throw {
      code: "VALIDATION_ERROR",
      message: "Cancellation reason is required",
    };
  }

  const action = getCashboxMovementAction(movement);

  switch (action.kind) {
    case "financial_transaction_cancel":
      if (!movement.reference_id) {
        throw {
          code: "TRANSACTION_NOT_FOUND",
          message: "Linked financial transaction was not found",
        };
      }

      return transactionsService.cancel(
        Number(movement.reference_id),
        normalizedReason,
      );

    case "adjustment_reverse":
      return cashboxesService.reverseMovement(
        movement.id,
        normalizedReason,
      );

    case "transfer_reverse":
      if (!movement.transfer_group_id) {
        throw {
          code: "INVALID_TRANSFER_GROUP",
          message: "Transfer group is missing",
        };
      }

      return cashboxesService.reverseTransfer(
        movement.transfer_group_id,
        normalizedReason,
      );

    case "locked":
    default:
      throw {
        code: "NOT_REVERSIBLE",
        message: "This movement cannot be reversed directly",
      };
  }
}

export async function getLinkedFinancialTransactionDetails(
  movement: CashboxMovementRecord,
) {
  if (
    movement.reference_type !== "income" &&
    movement.reference_type !== "expense"
  ) {
    return null;
  }

  if (!movement.reference_id) {
    return null;
  }

  return transactionsService.getDetails(
    Number(movement.reference_id),
  );
}