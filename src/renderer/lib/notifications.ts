import { toast } from "sonner";
import { getArabicErrorMessage, normalizeError } from "./errorNormalizer";
import {
  getHelpArticleForError,
  openHelpArticle,
} from "../pages/help/errorHelpLinks";

const options = { duration: 5200, closeButton: true } as const;

export function requestNotificationsRefresh() {
  window.setTimeout(() => {
    window.dispatchEvent(new Event("stocklite:notifications-refresh"));
  }, 250);
}

export function notifyError(
  error: unknown,
  config?: {
    title?: string;
    fallback?: string;
    id?: string | number;
    helpArticleSlug?: string;
  },
) {
  const normalized = normalizeError(error);
  const message = getArabicErrorMessage(error, config?.fallback);
  const helpArticleSlug =
    config?.helpArticleSlug ?? getHelpArticleForError(normalized.code);

  console.error("[User-facing error]", normalized, error);

  return toast.error(config?.title ?? "تعذر تنفيذ العملية", {
    description: message,
    id: config?.id ?? `${normalized.code}:${message}`,
    action: helpArticleSlug
      ? {
          label: "معرفة المزيد",
          onClick: () => openHelpArticle(helpArticleSlug),
        }
      : undefined,
    ...options,
  });
}

export function notifyValidation(
  message = "يرجى تصحيح الحقول المحددة ثم المحاولة مجددًا.",
) {
  return toast.warning("راجع البيانات المدخلة", {
    description: message,
    duration: 4500,
    closeButton: true,
  });
}

export function notifySuccess(message: string, title = "تمت العملية بنجاح") {
  requestNotificationsRefresh();
  return toast.success(title, {
    description: message,
    duration: 3200,
    closeButton: true,
  });
}

export function notifyWarning(message: string, title = "تنبيه") {
  return toast.warning(title, {
    description: message,
    duration: 4500,
    closeButton: true,
  });
}

export function notifyInfo(message: string, title = "معلومة") {
  return toast.info(title, {
    description: message,
    duration: 3800,
    closeButton: true,
  });
}

export function notifyLoading(message: string, id: string | number) {
  return toast.loading(message, {
    id,
    duration: Infinity,
    closeButton: false,
  });
}

export function dismissNotification(id?: string | number) {
  toast.dismiss(id);
}
