import { toast } from "sonner";

import {
  getArabicErrorMessage,
  normalizeError,
} from "./errorNormalizer";

const options = {
  duration: 6000,
  closeButton: true,
} as const;

export function requestNotificationsRefresh() {
  window.setTimeout(() => {
    window.dispatchEvent(
      new Event(
        "stocklite:notifications-refresh",
      ),
    );
  }, 250);
}

export function notifyError(
  error: unknown,
  config?: {
    title?: string;
    fallback?: string;
    id?: string | number;
  },
) {
  const normalized =
    normalizeError(error);

  const message =
    getArabicErrorMessage(
      error,
      config?.fallback,
    );

  /*
   * مهم أثناء التطوير:
   * إذا بقي خطأ ما غير مترجم، ستقدر تشوف
   * code + technicalMessage بالكونسول.
   */
  console.error(
    "[StockLite Error]",
    {
      code: normalized.code,
      message:
        normalized.message,
      technicalMessage:
        normalized.technicalMessage,
      field:
        normalized.field,
      originalError: error,
    },
  );

  /*
   * السبب الحقيقي يظهر كعنوان أساسي،
   * وليس تحت عنوان مبهم مثل:
   * "تعذر تنفيذ العملية".
   */
  return toast.error(message, {
    description:
      config?.title &&
      config.title !== message
        ? config.title
        : undefined,

    id:
      config?.id ??
      `${normalized.code}:${message}`,

    ...options,
  });
}

export function notifyValidation(
  message =
    "يرجى تصحيح الحقول المحددة ثم المحاولة مجددًا.",
) {
  return toast.warning(
    "راجع البيانات المدخلة",
    {
      description: message,
      duration: 4500,
      closeButton: true,
    },
  );
}

export function notifySuccess(
  message: string,
  title = "تمت العملية بنجاح",
) {
  requestNotificationsRefresh();

  return toast.success(
    title,
    {
      description: message,
      duration: 3200,
      closeButton: true,
    },
  );
}

export function notifyWarning(
  message: string,
  title = "تنبيه",
) {
  return toast.warning(
    title,
    {
      description: message,
      duration: 4500,
      closeButton: true,
    },
  );
}

export function notifyInfo(
  message: string,
  title = "معلومة",
) {
  return toast.info(
    title,
    {
      description: message,
      duration: 3800,
      closeButton: true,
    },
  );
}

export function notifyLoading(
  message: string,
  id: string | number,
) {
  return toast.loading(
    message,
    {
      id,
      duration: Infinity,
      closeButton: false,
    },
  );
}

export function dismissNotification(
  id?: string | number,
) {
  toast.dismiss(id);
}