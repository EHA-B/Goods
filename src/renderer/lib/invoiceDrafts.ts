const TTL_MS = 7 * 24 * 60 * 60 * 1000;

type StoredDraft<T> = {
  savedAt: number;
  expiresAt: number;
  data: T;
};

export function invoiceDraftKey(
  kind: "sale" | "purchase",
  mode: "new" | "edit",
  id?: number,
) {
  return `stocklite.invoice-draft.v1.${kind}.${mode}${
    id ? `.${id}` : ""
  }`;
}

export function saveInvoiceDraft<T>(
  key: string,
  data: T,
) {
  const savedAt = Date.now();

  const payload: StoredDraft<T> = {
    savedAt,
    expiresAt: savedAt + TTL_MS,
    data,
  };

  localStorage.setItem(
    key,
    JSON.stringify(payload),
  );
}

export function loadInvoiceDraft<T>(
  key: string,
): T | null {
  try {
    const raw =
      localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(
      raw,
    ) as StoredDraft<T>;

    if (
      !parsed?.expiresAt ||
      parsed.expiresAt < Date.now()
    ) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.data ?? null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

/**
 * Loads the last unfinished draft once and removes the stored copy immediately.
 * If the user changes the restored form again, autosave creates a NEW draft.
 * If the user simply leaves, the old draft does not come back on the next visit.
 */
export function consumeInvoiceDraft<T>(
  key: string,
): T | null {
  const draft =
    loadInvoiceDraft<T>(key);

  if (draft !== null) {
    localStorage.removeItem(key);
  }

  return draft;
}

export function clearInvoiceDraft(
  key: string,
) {
  localStorage.removeItem(key);
}

export function invoiceDraftFingerprint(
  data: unknown,
) {
  try {
    return JSON.stringify(data);
  } catch {
    return "";
  }
}
