export type CompanySettings = {
  name: string;
  phone: string;
  email: string;
  address: string;
  taxNumber: string;
  commercialRegister: string;
  invoiceFooter: string;
  logo: string;
};

const COMPANY_KEY = "stocklite.company-settings";
const LAST_BACKUP_KEY = "stocklite.last-backup-at";

const defaultCompanySettings: CompanySettings = {
  name: "StockLite",
  phone: "",
  email: "",
  address: "",
  taxNumber: "",
  commercialRegister: "",
  invoiceFooter: "شكرًا لتعاملكم معنا",
  logo: "",
};

function loadCompany(): CompanySettings {
  try {
    const stored = localStorage.getItem(COMPANY_KEY);
    return stored
      ? { ...defaultCompanySettings, ...JSON.parse(stored) }
      : defaultCompanySettings;
  } catch {
    return defaultCompanySettings;
  }
}

function saveCompany(settings: CompanySettings) {
  localStorage.setItem(COMPANY_KEY, JSON.stringify(settings));
}

function getLastBackupAt() {
  return localStorage.getItem(LAST_BACKUP_KEY) ?? "";
}

function createBackup() {
  const data: Record<string, string> = {};

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) continue;
    data[key] = localStorage.getItem(key) ?? "";
  }

  const createdAt = new Date().toISOString();
  localStorage.setItem(LAST_BACKUP_KEY, createdAt);

  return {
    application: "StockLite",
    version: "1.0.0",
    createdAt,
    data,
  };
}

function downloadBackup() {
  const backup = createBackup();
  const file = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  const date = backup.createdAt.slice(0, 10);

  link.href = url;
  link.download = `stocklite-backup-${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return backup.createdAt;
}

async function restoreBackup(file: File) {
  const parsed = JSON.parse(await file.text()) as {
    application?: string;
    data?: Record<string, string>;
  };

  if (parsed.application !== "StockLite" || !parsed.data) {
    throw new Error("INVALID_BACKUP");
  }

  localStorage.clear();
  Object.entries(parsed.data).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
  localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
}

export const settingsService = {
  loadCompany,
  saveCompany,
  getLastBackupAt,
  downloadBackup,
  restoreBackup,
};
