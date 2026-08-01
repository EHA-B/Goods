export type CompanySettings = {
  name: string;
  phone: string;
  email: string;
  address: string;
  commercialRegister: string;
  invoiceFooter: string;
  logo: string;
};

type SettingRecord = {
  id: number;
  setting_key: string;
  setting_value: string | null;
  description?: string | null;
  category?: string | null;
};

const LAST_BACKUP_KEY = "stocklite.last-backup-at";
const LEGACY_COMPANY_KEY = "stocklite.company-settings";
const COMPANY_CATEGORY = "company";

const settingDefinitions = {
  name: { key: "company_name", description: "اسم الشركة أو المتجر" },
  phone: { key: "company_phone", description: "رقم هاتف الشركة" },
  email: { key: "company_email", description: "البريد الإلكتروني للشركة" },
  address: { key: "company_address", description: "عنوان الشركة" },
  commercialRegister: { key: "company_commercial_register", description: "رقم السجل التجاري" },
  invoiceFooter: { key: "company_invoice_footer", description: "النص الظاهر أسفل الفاتورة" },
  logo: { key: "company_logo", description: "شعار الشركة بصيغة Data URL" },
} as const;

export const defaultCompanySettings: CompanySettings = {
  name: "StockLite",
  phone: "",
  email: "",
  address: "",
  commercialRegister: "",
  invoiceFooter: "شكرًا لتعاملكم معنا",
  logo: "",
};

function getSettingsApi() {
  if (!window.stockliteApi?.settings) {
    throw new Error("واجهة إعدادات StockLite غير متاحة خارج Electron.");
  }

  return window.stockliteApi.settings;
}

function mapRecords(records: SettingRecord[]): CompanySettings {
  const values = new Map(records.map((record) => [record.setting_key, record.setting_value ?? ""]));

  return {
    name: values.get(settingDefinitions.name.key) || defaultCompanySettings.name,
    phone: values.get(settingDefinitions.phone.key) || "",
    email: values.get(settingDefinitions.email.key) || "",
    address: values.get(settingDefinitions.address.key) || "",
    commercialRegister: values.get(settingDefinitions.commercialRegister.key) || "",
    invoiceFooter: values.get(settingDefinitions.invoiceFooter.key) || defaultCompanySettings.invoiceFooter,
    logo: values.get(settingDefinitions.logo.key) || "",
  };
}

function readLegacyCompany(): Partial<CompanySettings> | null {
  try {
    const raw = localStorage.getItem(LEGACY_COMPANY_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : undefined,
      phone: typeof parsed.phone === "string" ? parsed.phone : undefined,
      email: typeof parsed.email === "string" ? parsed.email : undefined,
      address: typeof parsed.address === "string" ? parsed.address : undefined,
      commercialRegister:
        typeof parsed.commercialRegister === "string" ? parsed.commercialRegister : undefined,
      invoiceFooter: typeof parsed.invoiceFooter === "string" ? parsed.invoiceFooter : undefined,
      logo: typeof parsed.logo === "string" ? parsed.logo : undefined,
    };
  } catch {
    return null;
  }
}

async function loadCompany(): Promise<CompanySettings> {
  const api = getSettingsApi();
  const records = (await api.list()) as SettingRecord[];
  const companyRecords = records.filter((record) =>
    Object.values(settingDefinitions).some((definition) => definition.key === record.setting_key),
  );

  if (companyRecords.length > 0) {
    return mapRecords(companyRecords);
  }

  const legacy = readLegacyCompany();
  return legacy ? { ...defaultCompanySettings, ...legacy } : defaultCompanySettings;
}

async function saveCompany(settings: CompanySettings): Promise<CompanySettings> {
  const api = getSettingsApi();
  const existing = (await api.list()) as SettingRecord[];
  const recordsByKey = new Map(existing.map((record) => [record.setting_key, record]));

  for (const [field, definition] of Object.entries(settingDefinitions) as Array<
    [keyof CompanySettings, (typeof settingDefinitions)[keyof typeof settingDefinitions]]
  >) {
    const value = settings[field].trim();
    const record = recordsByKey.get(definition.key);
    const input = {
      setting_key: definition.key,
      setting_value: value,
      description: definition.description,
      category: COMPANY_CATEGORY,
    };

    if (record) {
      await api.update(record.id, input);
    } else {
      await api.create(input);
    }
  }

  localStorage.removeItem(LEGACY_COMPANY_KEY);
  return loadCompany();
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
