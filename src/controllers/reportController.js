/* global require, __dirname, module */
/* eslint-disable @typescript-eslint/no-var-requires */
"use strict";

/**
 * Unified report controller.
 * Keeps both the commission report and the richer Profit & Loss work.
 */
const path = require("node:path");
const dbmanager = require(path.join(__dirname, "../database/databaseManager"));

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows || []);
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row || null);
    });
  });
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCurrency(value) {
  return String(value || "SYP").trim().toUpperCase() === "USD"
    ? "USD"
    : "SYP";
}

function currencyLabel(currency) {
  return normalizeCurrency(currency) === "USD" ? "دولار" : "ل.س";
}

function settlementStatus(row) {
  if (String(row.invoice_status || "").toLowerCase() === "cancelled") {
    return "cancelled";
  }

  if (String(row.settlement_record_status || "").toLowerCase() === "reversed") {
    return "reversed";
  }

  if (
    String(row.settlement_status || "").toLowerCase() === "settled" ||
    String(row.settlement_record_status || "").toLowerCase() === "completed"
  ) {
    return "settled";
  }

  return "pending";
}

function settlementStatusLabel(status) {
  switch (status) {
    case "settled":
      return "تمت التسوية";
    case "reversed":
      return "معكوسة";
    case "cancelled":
      return "ملغاة";
    case "pending":
    default:
      return "بانتظار التسوية";
  }
}

function addFilter(where, params, condition, value) {
  if (
    value !== undefined &&
    value !== null &&
    String(value).trim() !== "" &&
    String(value) !== "all"
  ) {
    where.push(condition);
    params.push(value);
  }
}

function invoiceStatusLabel(status) {
  switch (String(status || "").toLowerCase()) {
    case "draft":
      return "مسودة";
    case "confirmed":
      return "مؤكدة";
    case "partially_paid":
      return "مدفوعة جزئيًا";
    case "paid":
      return "مدفوعة";
    case "cancelled":
      return "ملغاة";
    default:
      return String(status || "—");
  }
}

function purchaseTypeLabel(type) {
  return String(type || "standard") === "consignment"
    ? "أمانة"
    : "شراء عادي";
}

function formatNumber(value, maximumFractionDigits = 2) {
  return number(value).toLocaleString("en-US", {
    maximumFractionDigits,
  });
}

function formatMoney(value, currency = "SYP") {
  const normalizedCurrency = normalizeCurrency(currency);
  return `${formatNumber(value, 2)} ${currencyLabel(normalizedCurrency)}`;
}

function buildCurrencySummary(rows, labelPrefix) {
  const currencies = [
    ...new Set(
      rows.map((row) =>
        normalizeCurrency(row.currency),
      ),
    ),
  ];

  const summary = [];

  for (const currency of currencies) {
    const currencyRows = rows.filter(
      (row) =>
        normalizeCurrency(row.currency) ===
        currency,
    );

    const activeRows = currencyRows.filter(
      (row) =>
        String(row.status || "").toLowerCase() !==
        "cancelled",
    );

    const total = activeRows.reduce(
      (sum, row) => sum + number(row.total),
      0,
    );
    const paid = activeRows.reduce(
      (sum, row) => sum + number(row.paid_amount),
      0,
    );
    const remaining = activeRows.reduce(
      (sum, row) =>
        sum + number(row.remaining_amount),
      0,
    );

    summary.push(
      {
        label: `${labelPrefix} (${currency})`,
        value: formatMoney(total, currency),
      },
      {
        label: `إجمالي المدفوع (${currency})`,
        value: formatMoney(paid, currency),
      },
      {
        label: `إجمالي المتبقي (${currency})`,
        value: formatMoney(remaining, currency),
      },
    );
  }

  return summary;
}

class ReportController {
  async getOptions() {
    const db = await dbmanager.init();

    const [customers, suppliers, products, cashboxes] = await Promise.all([
      all(
        db,
        `SELECT id, name
         FROM customers
         ORDER BY name COLLATE NOCASE ASC`,
      ),
      all(
        db,
        `SELECT id, name
         FROM suppliers
         ORDER BY name COLLATE NOCASE ASC`,
      ),
      all(
        db,
        `SELECT id, name
         FROM products
         ORDER BY name COLLATE NOCASE ASC`,
      ),
      all(
        db,
        `SELECT id, name
         FROM cashboxes
         ORDER BY name COLLATE NOCASE ASC`,
      ),
    ]);

    const mapOptions = (rows) =>
      rows.map((row) => ({
        value: String(row.id),
        label: row.name || `#${row.id}`,
      }));

    return {
      customers: mapOptions(customers),
      suppliers: mapOptions(suppliers),
      products: mapOptions(products),
      cashboxes: mapOptions(cashboxes),
    };
  }

  async generate({ reportId, filters = {} } = {}) {
    if (reportId === "consignment-commission") {
      return this.generateConsignmentCommission(filters);
    }

    if (reportId === "sales-profit") {
      return this.generateSalesProfit(filters);
    }

    if (reportId === "sales-details") {
      return this.generateSalesDetails(filters);
    }

    if (reportId === "purchases-details") {
      return this.generatePurchasesDetails(filters);
    }

    return {
      title: "",
      generatedAt: new Date().toISOString(),
      columns: [],
      rows: [],
      summary: [],
      totalRows: 0,
    };
  }

  async generateSalesDetails(filters = {}) {
    const db = await dbmanager.init();

    const where = ["1 = 1"];
    const params = [];

    if (filters.fromDate) {
      where.push(`date(si.invoice_date) >= date(?)`);
      params.push(filters.fromDate);
    }

    if (filters.toDate) {
      where.push(`date(si.invoice_date) <= date(?)`);
      params.push(filters.toDate);
    }

    addFilter(
      where,
      params,
      `si.customer_id = ?`,
      filters.customerId,
    );

    addFilter(
      where,
      params,
      `si.status = ?`,
      filters.status,
    );

    if (
      filters.currency &&
      filters.currency !== "all"
    ) {
      where.push(
        `UPPER(COALESCE(si.currency, 'SYP')) = ?`,
      );
      params.push(
        normalizeCurrency(filters.currency),
      );
    }

    if (
      filters.productId &&
      filters.productId !== "all"
    ) {
      where.push(`
        EXISTS (
          SELECT 1
          FROM sale_invoice_items filter_sii
          JOIN stock_batches filter_sb
            ON filter_sb.id = filter_sii.stock_batch_id
          WHERE filter_sii.sale_invoice_id = si.id
            AND filter_sb.product_id = ?
        )
      `);
      params.push(filters.productId);
    }

    const invoices = await all(
      db,
      `
        SELECT
          si.id,
          si.invoice_number,
          si.invoice_date,
          si.subtotal,
          COALESCE(si.discount_amount, si.discount, 0) AS discount_amount,
          COALESCE(si.tax, 0) AS tax,
          si.total,
          si.paid_amount,
          si.remaining_amount,
          si.status,
          si.notes,
          UPPER(COALESCE(si.currency, 'SYP')) AS currency,
          COALESCE(NULLIF(si.exchange_rate, 0), 1) AS exchange_rate,

          c.name AS customer_name,
          c.phone AS customer_phone,

          st.name AS sale_type_name,
          cb.name AS cashbox_name,

          COALESCE(
            (
              SELECT COUNT(*)
              FROM payments pay
              WHERE pay.payment_type = 'sale'
                AND pay.invoice_id = si.id
                AND pay.status = 'active'
            ),
            0
          ) AS payments_count,

          (
            SELECT MAX(pay.payment_date)
            FROM payments pay
            WHERE pay.payment_type = 'sale'
              AND pay.invoice_id = si.id
              AND pay.status = 'active'
          ) AS last_payment_date

        FROM sale_invoices si
        LEFT JOIN customers c
          ON c.id = si.customer_id
        LEFT JOIN sale_types st
          ON st.id = si.sale_type_id
        LEFT JOIN cashboxes cb
          ON cb.id = si.cashbox_id

        WHERE ${where.join(" AND ")}

        ORDER BY
          date(si.invoice_date) DESC,
          si.id DESC
      `,
      params,
    );

    const itemWhere = [];
    const itemParams = [];

    if (
      filters.productId &&
      filters.productId !== "all"
    ) {
      itemWhere.push(`sb.product_id = ?`);
      itemParams.push(filters.productId);
    }

    const items = invoices.length
      ? await all(
          db,
          `
            SELECT
              sii.sale_invoice_id,
              sii.id AS item_id,
              p.name AS product_name,
              p.unit AS product_unit,
              sb.batch_code,
              sii.quantity,
              sii.unit_price,
              sii.line_total,
              sii.cost_price,
              sii.profit,
              sii.notes
            FROM sale_invoice_items sii
            JOIN stock_batches sb
              ON sb.id = sii.stock_batch_id
            JOIN products p
              ON p.id = sb.product_id
            WHERE sii.sale_invoice_id IN (
              ${invoices.map(() => "?").join(",")}
            )
            ${
              itemWhere.length
                ? `AND ${itemWhere.join(" AND ")}`
                : ""
            }
            ORDER BY
              sii.sale_invoice_id,
              sii.id
          `,
          [
            ...invoices.map((invoice) => invoice.id),
            ...itemParams,
          ],
        )
      : [];

    const itemsByInvoice = new Map();

    for (const item of items) {
      const invoiceId = number(
        item.sale_invoice_id,
      );

      if (!itemsByInvoice.has(invoiceId)) {
        itemsByInvoice.set(invoiceId, []);
      }

      itemsByInvoice
        .get(invoiceId)
        .push(item);
    }

    const sections = invoices.map(
      (invoice) => {
        const currency = normalizeCurrency(
          invoice.currency,
        );

        const invoiceItems =
          itemsByInvoice.get(number(invoice.id)) ??
          [];

        const totalQuantity =
          invoiceItems.reduce(
            (sum, item) =>
              sum + number(item.quantity),
            0,
          );

        const totalProfitBase =
          invoice.status === "cancelled"
            ? 0
            : invoiceItems.reduce(
                (sum, item) =>
                  sum + number(item.profit),
                0,
              );

        return {
          title: `فاتورة بيع ${invoice.invoice_number} — ${
            invoice.customer_name || "بيع نقدي"
          } — ${invoice.invoice_date}`,
          columns: [
            {
              key: "product_name",
              label: "الصنف",
              format: "text",
            },
            {
              key: "batch_code",
              label: "الدفعة",
              format: "text",
            },
            {
              key: "quantity",
              label: "الكمية",
              format: "number",
            },
            {
              key: "unit_price",
              label: "سعر البيع",
              format: "currency",
            },
            {
              key: "line_total",
              label: "إجمالي السطر",
              format: "currency",
            },
            {
              key: "cost_price_base",
              label: "تكلفة الوحدة الأساسية",
              format: "currency",
            },
            {
              key: "profit_base",
              label: "ربح السطر الأساسي",
              format: "currency",
            },
          ],
          rows: invoiceItems.map((item) => ({
            product_name: `${item.product_name}${
              item.product_unit
                ? ` (${item.product_unit})`
                : ""
            }`,
            batch_code: item.batch_code || "—",
            quantity: number(item.quantity),
            unit_price: number(item.unit_price),
            line_total: number(item.line_total),
            cost_price_base: number(
              item.cost_price,
            ),
            profit_base:
              invoice.status === "cancelled"
                ? 0
                : number(item.profit),
            currency,
          })),
          summary: [
            {
              label: "العميل",
              value:
                invoice.customer_name ||
                "بيع نقدي",
            },
            {
              label: "نوع البيع",
              value:
                invoice.sale_type_name || "—",
            },
            {
              label: "الحالة",
              value: invoiceStatusLabel(
                invoice.status,
              ),
            },
            {
              label: "العملة",
              value: currency,
            },
            {
              label: "سعر الصرف",
              value: formatNumber(
                invoice.exchange_rate,
                6,
              ),
            },
            {
              label: "الكمية الكلية",
              value: formatNumber(
                totalQuantity,
                3,
              ),
            },
            {
              label: "المجموع الفرعي",
              value: formatMoney(
                invoice.subtotal,
                currency,
              ),
            },
            {
              label: "الخصم",
              value: formatMoney(
                invoice.discount_amount,
                currency,
              ),
            },
            {
              label: "الضريبة",
              value: formatMoney(
                invoice.tax,
                currency,
              ),
            },
            {
              label: "الإجمالي",
              value: formatMoney(
                invoice.total,
                currency,
              ),
            },
            {
              label: "المدفوع",
              value: formatMoney(
                invoice.paid_amount,
                currency,
              ),
            },
            {
              label: "المتبقي",
              value: formatMoney(
                invoice.remaining_amount,
                currency,
              ),
            },
            {
              label: "عدد الدفعات",
              value: number(
                invoice.payments_count,
              ),
            },
            {
              label: "آخر دفعة",
              value:
                invoice.last_payment_date ||
                "—",
            },
            {
              label: "ربح الأصناف الأساسي",
              value: `${formatNumber(
                totalProfitBase,
                2,
              )} ل.س`,
            },
          ],
        };
      },
    );

    const totalItems = sections.reduce(
      (sum, section) =>
        sum + section.rows.length,
      0,
    );

    const totalQuantity = sections.reduce(
      (sum, section) =>
        sum +
        section.rows.reduce(
          (sectionSum, row) =>
            sectionSum +
            number(row.quantity),
          0,
        ),
      0,
    );

    const cancelledCount =
      invoices.filter(
        (invoice) =>
          invoice.status === "cancelled",
      ).length;

    const totalProfitBase =
      sections.reduce(
        (sum, section) => {
          const profitSummary =
            section.summary.find(
              (item) =>
                item.label ===
                "ربح الأصناف الأساسي",
            );

          return (
            sum +
            number(
              String(
                profitSummary?.value ?? 0,
              )
                .replace(/,/g, "")
                .replace(/[^\d.-]/g, ""),
            )
          );
        },
        0,
      );

    return {
      title: "تقرير المبيعات التفصيلي",
      generatedAt:
        new Date().toISOString(),
      columns: [],
      rows: [],
      sections,
      summary: [
        {
          label: "عدد فواتير البيع",
          value: invoices.length,
        },
        {
          label: "عدد بنود الأصناف",
          value: totalItems,
        },
        {
          label: "إجمالي الكمية المباعة",
          value: formatNumber(
            totalQuantity,
            3,
          ),
        },
        {
          label: "الفواتير الملغاة",
          value: cancelledCount,
        },
        ...buildCurrencySummary(
          invoices,
          "إجمالي المبيعات الفعلية",
        ),
        {
          label: "إجمالي ربح الأصناف الأساسي",
          value: `${formatNumber(
            totalProfitBase,
            2,
          )} ل.س`,
        },
      ],
      totalRows: totalItems,
    };
  }

  async generatePurchasesDetails(filters = {}) {
    const db = await dbmanager.init();

    const where = ["1 = 1"];
    const params = [];

    if (filters.fromDate) {
      where.push(`date(pi.invoice_date) >= date(?)`);
      params.push(filters.fromDate);
    }

    if (filters.toDate) {
      where.push(`date(pi.invoice_date) <= date(?)`);
      params.push(filters.toDate);
    }

    addFilter(
      where,
      params,
      `pi.supplier_id = ?`,
      filters.supplierId,
    );

    addFilter(
      where,
      params,
      `pi.status = ?`,
      filters.status,
    );

    if (
      filters.currency &&
      filters.currency !== "all"
    ) {
      where.push(
        `UPPER(COALESCE(pi.currency, 'SYP')) = ?`,
      );
      params.push(
        normalizeCurrency(filters.currency),
      );
    }

    if (
      filters.productId &&
      filters.productId !== "all"
    ) {
      where.push(`
        EXISTS (
          SELECT 1
          FROM purchase_invoice_items filter_pii
          WHERE filter_pii.purchase_invoice_id = pi.id
            AND filter_pii.product_id = ?
        )
      `);
      params.push(filters.productId);
    }

    const invoices = await all(
      db,
      `
        SELECT
          pi.id,
          pi.invoice_number,
          pi.invoice_date,
          pi.invoice_type,
          pi.subtotal,
          COALESCE(pi.discount_amount, pi.discount, 0) AS discount_amount,
          COALESCE(pi.transport_cost, 0) AS transport_cost,
          COALESCE(pi.emptying_cost, 0) AS emptying_cost,
          COALESCE(pi.tax, 0) AS tax,
          pi.total,
          pi.paid_amount,
          pi.remaining_amount,
          pi.status,
          pi.notes,
          UPPER(COALESCE(pi.currency, 'SYP')) AS currency,
          COALESCE(NULLIF(pi.exchange_rate, 0), 1) AS exchange_rate,
          pi.settlement_status,
          pi.settled_at,

          s.name AS supplier_name,
          s.phone AS supplier_phone,

          COALESCE(
            (
              SELECT COUNT(*)
              FROM payments pay
              WHERE pay.payment_type = 'purchase'
                AND pay.invoice_id = pi.id
                AND pay.status = 'active'
            ),
            0
          ) AS payments_count,

          (
            SELECT MAX(pay.payment_date)
            FROM payments pay
            WHERE pay.payment_type = 'purchase'
              AND pay.invoice_id = pi.id
              AND pay.status = 'active'
          ) AS last_payment_date

        FROM purchase_invoices pi
        LEFT JOIN suppliers s
          ON s.id = pi.supplier_id

        WHERE ${where.join(" AND ")}

        ORDER BY
          date(pi.invoice_date) DESC,
          pi.id DESC
      `,
      params,
    );

    const itemWhere = [];
    const itemParams = [];

    if (
      filters.productId &&
      filters.productId !== "all"
    ) {
      itemWhere.push(`pii.product_id = ?`);
      itemParams.push(filters.productId);
    }

    const items = invoices.length
      ? await all(
          db,
          `
            SELECT
              pii.purchase_invoice_id,
              pii.id AS item_id,
              p.name AS product_name,
              p.unit AS product_unit,
              pii.quantity,
              pii.unit_price,
              pii.line_total,
              pii.notes,

              sb.batch_code,
              sb.remaining_quantity,
              sb.received_date,
              sb.expiry_date

            FROM purchase_invoice_items pii
            JOIN products p
              ON p.id = pii.product_id
            LEFT JOIN stock_batches sb
              ON sb.purchase_invoice_id =
                 pii.purchase_invoice_id
             AND sb.product_id =
                 pii.product_id

            WHERE pii.purchase_invoice_id IN (
              ${invoices.map(() => "?").join(",")}
            )
            ${
              itemWhere.length
                ? `AND ${itemWhere.join(" AND ")}`
                : ""
            }

            ORDER BY
              pii.purchase_invoice_id,
              pii.id
          `,
          [
            ...invoices.map((invoice) => invoice.id),
            ...itemParams,
          ],
        )
      : [];

    const itemsByInvoice = new Map();

    for (const item of items) {
      const invoiceId = number(
        item.purchase_invoice_id,
      );

      if (!itemsByInvoice.has(invoiceId)) {
        itemsByInvoice.set(invoiceId, []);
      }

      itemsByInvoice
        .get(invoiceId)
        .push(item);
    }

    const sections = invoices.map(
      (invoice) => {
        const currency = normalizeCurrency(
          invoice.currency,
        );

        const invoiceItems =
          itemsByInvoice.get(number(invoice.id)) ??
          [];

        const totalQuantity =
          invoiceItems.reduce(
            (sum, item) =>
              sum + number(item.quantity),
            0,
          );

        const remainingQuantity =
          invoiceItems.reduce(
            (sum, item) =>
              sum +
              number(
                item.remaining_quantity,
              ),
            0,
          );

        return {
          title: `فاتورة شراء ${invoice.invoice_number} — ${
            invoice.supplier_name || "مورد غير معروف"
          } — ${invoice.invoice_date}`,
          columns: [
            {
              key: "product_name",
              label: "الصنف",
              format: "text",
            },
            {
              key: "batch_code",
              label: "كود الدفعة",
              format: "text",
            },
            {
              key: "quantity",
              label: "الكمية المستلمة",
              format: "number",
            },
            {
              key: "remaining_quantity",
              label: "المتبقي بالمخزون",
              format: "number",
            },
            {
              key: "unit_price",
              label: "سعر الشراء",
              format: "currency",
            },
            {
              key: "line_total",
              label: "إجمالي السطر",
              format: "currency",
            },
            {
              key: "received_date",
              label: "تاريخ الاستلام",
              format: "date",
            },
            {
              key: "expiry_date",
              label: "تاريخ الانتهاء",
              format: "date",
            },
          ],
          rows: invoiceItems.map((item) => ({
            product_name: `${item.product_name}${
              item.product_unit
                ? ` (${item.product_unit})`
                : ""
            }`,
            batch_code: item.batch_code || "—",
            quantity: number(item.quantity),
            remaining_quantity: number(
              item.remaining_quantity,
            ),
            unit_price: number(item.unit_price),
            line_total: number(item.line_total),
            received_date:
              item.received_date || "—",
            expiry_date:
              item.expiry_date || "—",
            currency,
          })),
          summary: [
            {
              label: "المورد",
              value:
                invoice.supplier_name || "—",
            },
            {
              label: "نوع الفاتورة",
              value: purchaseTypeLabel(
                invoice.invoice_type,
              ),
            },
            {
              label: "الحالة",
              value: invoiceStatusLabel(
                invoice.status,
              ),
            },
            {
              label: "حالة الأمانة",
              value:
                invoice.invoice_type ===
                "consignment"
                  ? settlementStatusLabel(
                      String(
                        invoice.settlement_status ||
                          "",
                      ).toLowerCase() ===
                        "settled"
                        ? "settled"
                        : "pending",
                    )
                  : "—",
            },
            {
              label: "العملة",
              value: currency,
            },
            {
              label: "سعر الصرف",
              value: formatNumber(
                invoice.exchange_rate,
                6,
              ),
            },
            {
              label: "الكمية المستلمة",
              value: formatNumber(
                totalQuantity,
                3,
              ),
            },
            {
              label: "المتبقي بالمخزون",
              value: formatNumber(
                remainingQuantity,
                3,
              ),
            },
            {
              label: "المجموع الفرعي",
              value: formatMoney(
                invoice.subtotal,
                currency,
              ),
            },
            {
              label: "الخصم",
              value: formatMoney(
                invoice.discount_amount,
                currency,
              ),
            },
            {
              label: "تكلفة النقل",
              value: formatMoney(
                invoice.transport_cost,
                currency,
              ),
            },
            {
              label: "تكلفة العتالة",
              value: formatMoney(
                invoice.emptying_cost,
                currency,
              ),
            },
            {
              label: "الضريبة",
              value: formatMoney(
                invoice.tax,
                currency,
              ),
            },
            {
              label: "الإجمالي",
              value: formatMoney(
                invoice.total,
                currency,
              ),
            },
            {
              label: "المدفوع",
              value: formatMoney(
                invoice.paid_amount,
                currency,
              ),
            },
            {
              label: "المتبقي",
              value: formatMoney(
                invoice.remaining_amount,
                currency,
              ),
            },
            {
              label: "عدد الدفعات",
              value: number(
                invoice.payments_count,
              ),
            },
            {
              label: "آخر دفعة",
              value:
                invoice.last_payment_date ||
                "—",
            },
          ],
        };
      },
    );

    const totalItems = sections.reduce(
      (sum, section) =>
        sum + section.rows.length,
      0,
    );

    const totalQuantity = sections.reduce(
      (sum, section) =>
        sum +
        section.rows.reduce(
          (sectionSum, row) =>
            sectionSum +
            number(row.quantity),
          0,
        ),
      0,
    );

    const cancelledCount =
      invoices.filter(
        (invoice) =>
          invoice.status === "cancelled",
      ).length;

    const consignmentCount =
      invoices.filter(
        (invoice) =>
          invoice.invoice_type ===
          "consignment",
      ).length;

    return {
      title: "تقرير المشتريات التفصيلي",
      generatedAt:
        new Date().toISOString(),
      columns: [],
      rows: [],
      sections,
      summary: [
        {
          label: "عدد فواتير الشراء",
          value: invoices.length,
        },
        {
          label: "الفواتير العادية",
          value:
            invoices.length -
            consignmentCount,
        },
        {
          label: "فواتير الأمانة",
          value: consignmentCount,
        },
        {
          label: "الفواتير الملغاة",
          value: cancelledCount,
        },
        {
          label: "عدد بنود الأصناف",
          value: totalItems,
        },
        {
          label: "إجمالي الكمية المستلمة",
          value: formatNumber(
            totalQuantity,
            3,
          ),
        },
        ...buildCurrencySummary(
          invoices,
          "إجمالي المشتريات الفعلية",
        ),

        ...[
          ...new Set(
            invoices.map((invoice) =>
              normalizeCurrency(
                invoice.currency,
              ),
            ),
          ),
        ].flatMap((currency) => {
          const effectiveInvoices =
            invoices.filter(
              (invoice) =>
                normalizeCurrency(
                  invoice.currency,
                ) === currency &&
                String(
                  invoice.status || "",
                ).toLowerCase() !==
                  "cancelled",
            );

          const transportTotal =
            effectiveInvoices.reduce(
              (sum, invoice) =>
                sum +
                number(
                  invoice.transport_cost,
                ),
              0,
            );

          const emptyingTotal =
            effectiveInvoices.reduce(
              (sum, invoice) =>
                sum +
                number(
                  invoice.emptying_cost,
                ),
              0,
            );

          return [
            {
              label:
                `إجمالي تكلفة النقل (${currency})`,
              value: formatMoney(
                transportTotal,
                currency,
              ),
            },
            {
              label:
                `إجمالي تكلفة العتالة (${currency})`,
              value: formatMoney(
                emptyingTotal,
                currency,
              ),
            },
          ];
        }),
      ],
      totalRows: totalItems,
    };
  }

  async generateConsignmentCommission(filters = {}) {
    const db = await dbmanager.init();

    const where = [
      `pi.invoice_type = 'consignment'`,
    ];
    const params = [];

    if (filters.fromDate) {
      where.push(`date(pi.invoice_date) >= date(?)`);
      params.push(filters.fromDate);
    }

    if (filters.toDate) {
      where.push(`date(pi.invoice_date) <= date(?)`);
      params.push(filters.toDate);
    }

    addFilter(
      where,
      params,
      `pi.supplier_id = ?`,
      filters.supplierId,
    );

    addFilter(
      where,
      params,
      `pii.product_id = ?`,
      filters.productId,
    );

    if (
      filters.currency &&
      filters.currency !== "all"
    ) {
      where.push(`UPPER(COALESCE(pi.currency, 'SYP')) = ?`);
      params.push(normalizeCurrency(filters.currency));
    }

    const rawRows = await all(
      db,
      `
        SELECT
          pi.id AS purchase_invoice_id,
          pi.invoice_number,
          pi.invoice_date,
          pi.status AS invoice_status,
          pi.settlement_status,
          UPPER(COALESCE(pi.currency, 'SYP')) AS currency,
          COALESCE(NULLIF(pi.exchange_rate, 0), 1) AS invoice_exchange_rate,

          s.id AS supplier_id,
          s.name AS supplier_name,

          p.id AS product_id,
          p.name AS product_name,

          COALESCE(
            MAX(NULLIF(pii.unit_price, 0)),
            (
              SELECT MAX(NULLIF(sb_price.purchase_price, 0))
              FROM stock_batches sb_price
              WHERE sb_price.purchase_invoice_id = pi.id
                AND sb_price.product_id = p.id
            ),
            0
          ) AS marketing_price,

          COALESCE(
            (
              SELECT SUM(sb.quantity)
              FROM stock_batches sb
              WHERE sb.purchase_invoice_id = pi.id
                AND sb.product_id = p.id
            ),
            SUM(pii.quantity),
            0
          ) AS live_received_quantity,

          COALESCE(
            (
              SELECT SUM(sb.remaining_quantity)
              FROM stock_batches sb
              WHERE sb.purchase_invoice_id = pi.id
                AND sb.product_id = p.id
            ),
            0
          ) AS live_remaining_quantity,

          COALESCE(
            (
              SELECT SUM(
                CASE
                  WHEN si.status <> 'cancelled'
                  THEN sii.quantity
                  ELSE 0
                END
              )
              FROM sale_invoice_items sii
              JOIN sale_invoices si
                ON si.id = sii.sale_invoice_id
              JOIN stock_batches sb
                ON sb.id = sii.stock_batch_id
              WHERE sb.purchase_invoice_id = pi.id
                AND sb.product_id = p.id
            ),
            0
          ) AS live_sold_quantity,

          COALESCE(
            (
              SELECT SUM(
                CASE
                  WHEN si.status <> 'cancelled'
                  THEN sii.line_total * COALESCE(NULLIF(si.exchange_rate, 0), 1)
                  ELSE 0
                END
              )
              FROM sale_invoice_items sii
              JOIN sale_invoices si
                ON si.id = sii.sale_invoice_id
              JOIN stock_batches sb
                ON sb.id = sii.stock_batch_id
              WHERE sb.purchase_invoice_id = pi.id
                AND sb.product_id = p.id
            ),
            0
          ) / COALESCE(NULLIF(pi.exchange_rate, 0), 1) AS live_sales_amount,

          cs.id AS settlement_id,
          cs.settlement_number,
          cs.settlement_date,
          cs.status AS settlement_record_status,
          cs.commission_percentage,

          COALESCE(
            (
              SELECT SUM(csi.received_quantity)
              FROM consignment_settlement_items csi
              WHERE csi.settlement_id = cs.id
                AND csi.product_id = p.id
            ),
            0
          ) AS settled_received_quantity,

          COALESCE(
            (
              SELECT SUM(csi.sold_quantity)
              FROM consignment_settlement_items csi
              WHERE csi.settlement_id = cs.id
                AND csi.product_id = p.id
            ),
            0
          ) AS settled_sold_quantity,

          COALESCE(
            (
              SELECT SUM(csi.remaining_quantity)
              FROM consignment_settlement_items csi
              WHERE csi.settlement_id = cs.id
                AND csi.product_id = p.id
            ),
            0
          ) AS settled_remaining_quantity,

          COALESCE(
            (
              SELECT SUM(csi.sales_amount)
              FROM consignment_settlement_items csi
              WHERE csi.settlement_id = cs.id
                AND csi.product_id = p.id
            ),
            0
          ) AS settled_sales_amount

        FROM purchase_invoice_items pii
        JOIN purchase_invoices pi
          ON pi.id = pii.purchase_invoice_id
        JOIN suppliers s
          ON s.id = pi.supplier_id
        JOIN products p
          ON p.id = pii.product_id
        LEFT JOIN consignment_settlements cs
          ON cs.id = (
            SELECT cs2.id
            FROM consignment_settlements cs2
            WHERE cs2.purchase_invoice_id = pi.id
            ORDER BY cs2.id DESC
            LIMIT 1
          )

        WHERE ${where.join(" AND ")}

        GROUP BY
          pi.id,
          s.id,
          p.id,
          cs.id

        ORDER BY
          date(pi.invoice_date) DESC,
          pi.id DESC,
          p.name COLLATE NOCASE ASC
      `,
      params,
    );

    const requestedStatus =
      filters.status &&
      filters.status !== "all"
        ? String(filters.status)
        : null;

    const rows = rawRows
      .map((row) => {
        const status = settlementStatus(row);
        const hasSettlement = number(row.settlement_id) > 0;

        const receivedQuantity = hasSettlement
          ? number(row.settled_received_quantity)
          : number(row.live_received_quantity);

        const soldQuantity = hasSettlement
          ? number(row.settled_sold_quantity)
          : number(row.live_sold_quantity);

        const remainingQuantity = hasSettlement
          ? number(row.settled_remaining_quantity)
          : number(row.live_remaining_quantity);

        const salesAmount = hasSettlement
          ? number(row.settled_sales_amount)
          : number(row.live_sales_amount);

        const commissionPercentage = hasSettlement
          ? number(row.commission_percentage)
          : 0;

        const commissionAmount =
          Math.round(
            ((salesAmount * commissionPercentage) / 100) * 100,
          ) / 100;

        const supplierShare =
          Math.round(
            (salesAmount - commissionAmount) * 100,
          ) / 100;

        const marketingPrice =
          number(row.marketing_price);

        const marketingValue =
          Math.round(
            receivedQuantity * marketingPrice * 100,
          ) / 100;

        return {
          purchase_invoice_id: number(row.purchase_invoice_id),
          invoice_number: row.invoice_number || `#${row.purchase_invoice_id}`,
          invoice_date: row.invoice_date,
          supplier_name: row.supplier_name || "—",
          product_name: row.product_name || "—",
          marketing_price: marketingPrice,
          marketing_value: marketingValue,
          received_quantity: receivedQuantity,
          sold_quantity: soldQuantity,
          remaining_quantity: remainingQuantity,
          sales_amount: salesAmount,
          commission_percentage: hasSettlement
            ? `${commissionPercentage.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}%`
            : "—",
          commission_amount: commissionAmount,
          supplier_share: supplierShare,
          currency: normalizeCurrency(row.currency),
          settlement_status: settlementStatusLabel(status),
          settlement_date: row.settlement_date || null,
          _status: status,
        };
      })
      .filter(
        (row) =>
          !requestedStatus ||
          row._status === requestedStatus,
      );

    const invoiceIds = new Set(
      rows.map((row) => row.purchase_invoice_id),
    );

    const totalReceived = rows.reduce(
      (sum, row) => sum + row.received_quantity,
      0,
    );
    const totalSold = rows.reduce(
      (sum, row) => sum + row.sold_quantity,
      0,
    );
    const totalRemaining = rows.reduce(
      (sum, row) => sum + row.remaining_quantity,
      0,
    );

    const currencies = [...new Set(rows.map((row) => row.currency))];

    const summary = [
      {
        label: "عدد فواتير الأمانة",
        value: invoiceIds.size,
      },
      {
        label: "إجمالي الكمية المستلمة",
        value: totalReceived.toLocaleString("en-US", {
          maximumFractionDigits: 3,
        }),
      },
      {
        label: "إجمالي الكمية المباعة",
        value: totalSold.toLocaleString("en-US", {
          maximumFractionDigits: 3,
        }),
      },
      {
        label: "إجمالي الكمية المتبقية",
        value: totalRemaining.toLocaleString("en-US", {
          maximumFractionDigits: 3,
        }),
      },
    ];

    for (const currency of currencies) {
      const currencyRows = rows.filter(
        (row) => row.currency === currency,
      );

      const sales = currencyRows.reduce(
        (sum, row) => sum + row.sales_amount,
        0,
      );
      const commission = currencyRows.reduce(
        (sum, row) => sum + row.commission_amount,
        0,
      );
      const supplierShare = currencyRows.reduce(
        (sum, row) => sum + row.supplier_share,
        0,
      );

      const unit = currencyLabel(currency);

      summary.push(
        {
          label: `إجمالي مبيعات الأمانة (${currency})`,
          value: `${sales.toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })} ${unit}`,
        },
        {
          label: `إجمالي العمولة (${currency})`,
          value: `${commission.toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })} ${unit}`,
        },
        {
          label: `إجمالي حصة الموردين (${currency})`,
          value: `${supplierShare.toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })} ${unit}`,
        },
      );
    }

    return {
      title: "تقرير الكومسيون والأمانات",
      generatedAt: new Date().toISOString(),
      columns: [
        {
          key: "invoice_number",
          label: "فاتورة الأمانة",
          format: "text",
        },
        {
          key: "invoice_date",
          label: "تاريخ الفاتورة",
          format: "date",
        },
        {
          key: "supplier_name",
          label: "المورد",
          format: "text",
        },
        {
          key: "product_name",
          label: "البضاعة",
          format: "text",
        },
        {
          key: "marketing_price",
          label: "سعر التسويق",
          format: "currency",
        },
        {
          key: "marketing_value",
          label: "القيمة التسويقية",
          format: "currency",
        },
        {
          key: "received_quantity",
          label: "المستلم",
          format: "number",
        },
        {
          key: "sold_quantity",
          label: "المباع",
          format: "number",
        },
        {
          key: "remaining_quantity",
          label: "المتبقي",
          format: "number",
        },
        {
          key: "sales_amount",
          label: "قيمة المبيعات",
          format: "currency",
        },
        {
          key: "commission_percentage",
          label: "نسبة العمولة",
          format: "text",
        },
        {
          key: "commission_amount",
          label: "قيمة العمولة",
          format: "currency",
        },
        {
          key: "supplier_share",
          label: "حصة المورد",
          format: "currency",
        },
        {
          key: "currency",
          label: "العملة",
          format: "text",
        },
        {
          key: "settlement_status",
          label: "حالة التسوية",
          format: "text",
        },
        {
          key: "settlement_date",
          label: "تاريخ التسوية",
          format: "date",
        },
      ],
      rows: rows.map((row) => {
        const cleanRow = { ...row };
        delete cleanRow._status;
        return cleanRow;
      }),
      summary,
      totalRows: rows.length,
    };
  }

  async generateSalesProfit(filters = {}) {
    const detailed = await this.getProfitLossReport({
      date_from:
        filters.fromDate ||
        filters.date_from,
      date_to:
        filters.toDate ||
        filters.date_to,
    });

    const summary = detailed.summary || {};

    const revenuesColumns = [
      { key: "metric", label: "البيان", format: "text" },
      { key: "category", label: "التصنيف", format: "text" },
      { key: "date", label: "التاريخ", format: "date" },
      { key: "amount", label: "القيمة", format: "currency" },
    ];
    
    const revenuesRows = [
      {
        metric: "إجمالي إيراد المبيعات (الأساسي)",
        category: "إيراد مبيعات",
        date: "—",
        amount: number(summary.total_revenue_base),
        currency: "SYP", // Base currency
      }
    ];
    
    for (const item of detailed.other_income.details) {
      revenuesRows.push({
        metric: item.description || item.notes || "إيراد غير مسمى",
        category: item.category_name || "إيرادات أخرى",
        date: item.transaction_date,
        amount: item.amount,
        currency: item.currency,
      });
    }

    const expensesColumns = [
      { key: "metric", label: "البيان", format: "text" },
      { key: "category", label: "التصنيف", format: "text" },
      { key: "date", label: "التاريخ", format: "date" },
      { key: "amount", label: "القيمة", format: "currency" },
    ];
    
    const expensesRows = [
      {
        metric: "إجمالي تكلفة البضاعة المباعة",
        category: "تكلفة مبيعات",
        date: "—",
        amount: number(summary.total_cogs_base),
        currency: "SYP", // Base currency
      },
      {
        metric: "مدفوعات موردي الأمانة (حصة الموردين)",
        category: "مدفوعات أمانة",
        date: "—",
        amount: number(summary.total_consignment_payout_base),
        currency: "SYP", // Base currency
      }
    ];

    for (const item of detailed.expenses.details) {
      expensesRows.push({
        metric: item.description || item.notes || "مصروف غير مسمى",
        category: item.category_name || "المصروفات العامة",
        date: item.transaction_date,
        amount: item.amount,
        currency: item.currency,
      });
    }

    const purchaseExtraCostColumns = [
      { key: "invoice_number", label: "فاتورة الشراء", format: "text" },
      { key: "supplier_name", label: "المورد", format: "text" },
      { key: "cost_label", label: "نوع التكلفة", format: "text" },
      { key: "date", label: "التاريخ", format: "date" },
      { key: "original_amount", label: "المبلغ بعملة الفاتورة", format: "currency" },
      { key: "amount_base", label: "القيمة الأساسية", format: "currency" },
    ];

    const purchaseExtraCostRows =
      (detailed.purchase_extra_costs?.details ?? []).map((item) => ({
        invoice_number: item.invoice_number || "—",
        supplier_name: item.supplier_name || "—",
        cost_label: item.cost_type === "transport" ? "تكلفة النقل" : "تكلفة العتالة",
        date: item.transaction_date || "—",
        original_amount: number(item.original_amount),
        amount_base: number(item.amount),
        currency: item.original_currency || "SYP",
        base_currency: "SYP",
      }));

    for (const item of detailed.stock_losses.details) {
      expensesRows.push({
        metric: `خسارة مخزون (${item.product_name}): ${item.reason || item.notes || ""}`,
        category: "خسائر مخزون",
        date: item.adjustment_date,
        amount: item.loss_amount,
        currency: "SYP", // Base currency based on purchase price
      });
    }

    const purchaseExtraCostsSection = {
      title: "تكاليف النقل والعتالة حسب فواتير الشراء",
      columns: purchaseExtraCostColumns,
      rows: purchaseExtraCostRows,
      summary: [
        {
          label: "إجمالي تكاليف النقل والعتالة",
          value: `${number(detailed.purchase_extra_costs?.total_base).toLocaleString("en-US", { maximumFractionDigits: 2 })} ل.س`,
        },
      ],
    };

    const sections = [
      {
        title: "الإيرادات",
        columns: revenuesColumns,
        rows: revenuesRows,
        summary: [
          {
            label: "إجمالي الإيرادات (بدون المبيعات)",
            value: `${number(summary.total_other_income_native).toLocaleString("en-US", { maximumFractionDigits: 2 })} ل.س`,
          },
          {
            label: "إجمالي إيراد المبيعات",
            value: `${number(summary.total_revenue_base).toLocaleString("en-US", { maximumFractionDigits: 2 })} ل.س`,
          }
        ]
      },
      ...(purchaseExtraCostRows.length > 0 ? [purchaseExtraCostsSection] : []),
      {
        title: "التكاليف والمصروفات",
        columns: expensesColumns,
        rows: expensesRows,
        summary: [
          {
            label: "إجمالي التكلفة (مبيعات وأمانة)",
            value: `${(number(summary.total_cogs_base) + number(summary.total_consignment_payout_base)).toLocaleString("en-US", { maximumFractionDigits: 2 })} ل.س`,
          },
          {
            label: "المصروفات العامة وخسائر المخزون",
            value: `${(number(summary.total_general_expenses_native) + number(summary.total_stock_loss_base)).toLocaleString("en-US", { maximumFractionDigits: 2 })} ل.س`,
          }
        ]
      }
    ];

    return {
      title: "أرباح وخسائر",
      generatedAt: new Date().toISOString(),
      columns: [],
      rows: [],
      sections: sections,
      summary: [
        {
          label: "إجمالي إيراد المبيعات",
          value: `${number(summary.total_revenue_base).toLocaleString("en-US", { maximumFractionDigits: 2 })} ل.س`,
        },
        {
          label: "إجمالي التكلفة والمصروفات",
          value: `${(number(summary.total_cogs_base) + number(summary.total_expenses_native) + number(summary.total_stock_loss_base)).toLocaleString("en-US", { maximumFractionDigits: 2 })} ل.س`,
        },
        {
          label: "منها نقل وعتالة",
          value: `${number(summary.total_purchase_extra_costs_base).toLocaleString("en-US", { maximumFractionDigits: 2 })} ل.س`,
        },
        {
          label: "صافي الربح / الخسارة",
          value: `${number(summary.net_profit_base).toLocaleString("en-US", { maximumFractionDigits: 2 })} ل.س`,
        },
      ],
      totalRows: revenuesRows.length + expensesRows.length,
      details: detailed,
    };
  }

  async getProfitLossReport(filters = {}) {
      const db = await dbmanager.init();

      // ── Date range defaults ──────────────────────────────────────────────
      const today      = new Date().toISOString().split('T')[0];
      const monthStart = today.substring(0, 7) + '-01';
      const dateFrom   = filters.date_from || monthStart;
      const dateTo     = filters.date_to   || today;

      // ────────────────────────────────────────────────────────────────────
      // 1. GROSS SALES REVENUE
      //    SUM of all non-cancelled sale invoice line totals, converted to
      //    base currency via the invoice's exchange_rate. Grouped by currency.
      // ────────────────────────────────────────────────────────────────────
      const revenueRows = await all(db, `
          SELECT
              si.currency,
              COALESCE(SUM(sii.line_total), 0)                                              AS revenue_native,
              COALESCE(SUM(sii.line_total * COALESCE(NULLIF(si.exchange_rate, 0), 1)), 0)   AS revenue_base
          FROM sale_invoice_items sii
          JOIN sale_invoices si ON si.id = sii.sale_invoice_id
          WHERE si.status != 'cancelled'
            AND si.invoice_date >= ?
            AND si.invoice_date <= ?
          GROUP BY si.currency
      `, [dateFrom, dateTo]);

      // ────────────────────────────────────────────────────────────────────
      // 2. COST OF GOODS SOLD (COGS)
      //    cost_price in sale_invoice_items is stored in BASE currency per unit.
      // ────────────────────────────────────────────────────────────────────
      const cogsRow = await get(db, `
          SELECT COALESCE(SUM(sii.cost_price * sii.quantity), 0) AS cogs_base
          FROM sale_invoice_items sii
          JOIN sale_invoices si ON si.id = sii.sale_invoice_id
          WHERE si.status != 'cancelled'
            AND si.invoice_date >= ?
            AND si.invoice_date <= ?
      `, [dateFrom, dateTo]);

      // ────────────────────────────────────────────────────────────────────
      // 3. GROSS PROFIT from sale items
      //    profit = revenue_base − cogs_base, pre-computed at sale time.
      // ────────────────────────────────────────────────────────────────────
      const grossProfitRow = await get(db, `
          SELECT COALESCE(SUM(sii.profit), 0) AS gross_profit_base
          FROM sale_invoice_items sii
          JOIN sale_invoices si ON si.id = sii.sale_invoice_id
          WHERE si.status != 'cancelled'
            AND si.invoice_date >= ?
            AND si.invoice_date <= ?
      `, [dateFrom, dateTo]);

      // ────────────────────────────────────────────────────────────────────
      // 4. CONSIGNMENT SUPPLIER PAYOUTS
      //    Payments made to suppliers at settlement time (their share of sales).
      //    Commission = Gross consignment sales − Supplier payout (emerges naturally).
      // ────────────────────────────────────────────────────────────────────
      const consignmentPayoutRows = await all(db, `
          SELECT
              p.currency,
              COALESCE(SUM(p.amount), 0)      AS payout_native,
              COALESCE(SUM(p.amount_base), 0) AS payout_base
          FROM payments p
          INNER JOIN consignment_settlements cs
              ON cs.purchase_invoice_id = p.invoice_id
             AND cs.payment_id = p.id
          WHERE p.payment_type = 'purchase'
            AND p.status = 'active'
            AND cs.status = 'completed'
            AND cs.settlement_date >= ?
            AND cs.settlement_date <= ?
          GROUP BY p.currency
      `, [dateFrom, dateTo]);

      // ────────────────────────────────────────────────────────────────────
      // 5. GENERAL EXPENSES (wages, overheads, spoilage write-offs, etc.)
      //    From transactions table. cashbox_id may be NULL for non-cash write-offs.
      // ────────────────────────────────────────────────────────────────────
      // ────────────────────────────────────────────────────────────────────
      // 5. GENERAL EXPENSES (Detailed)
      //    From transactions table. cashbox_id may be NULL for non-cash write-offs.
      // ────────────────────────────────────────────────────────────────────
      const expenseRows = await all(db, `
          SELECT
              t.id,
              t.transaction_date,
              t.description,
              t.notes,
              COALESCE(c.currency, 'non_cash') AS currency,
              t.amount AS expense_native,
              tc.name AS category_name
          FROM transactions t
          LEFT JOIN cashboxes c ON c.id = t.cashbox_id
          LEFT JOIN transaction_categories tc ON tc.id = t.category_id
          WHERE t.direction = 'expense'
            AND t.status = 'active'
            AND NOT (
              t.cashbox_id IS NULL
              AND (t.description LIKE 'تكلفة نقل — فاتورة شراء #%' OR t.description LIKE 'تكلفة عتالة — فاتورة شراء #%')
            )
            AND t.transaction_date >= ?
            AND t.transaction_date <= ?
          ORDER BY t.transaction_date DESC, t.id DESC
      `, [dateFrom, dateTo]);

      // ────────────────────────────────────────────────────────────────────
      // 6. GENERAL INCOME (Detailed)
      // ────────────────────────────────────────────────────────────────────
      const incomeRows = await all(db, `
          SELECT
              t.id,
              t.transaction_date,
              t.description,
              t.notes,
              COALESCE(c.currency, 'non_cash') AS currency,
              t.amount AS income_native,
              tc.name AS category_name
          FROM transactions t
          LEFT JOIN cashboxes c ON c.id = t.cashbox_id
          LEFT JOIN transaction_categories tc ON tc.id = t.category_id
          WHERE t.direction = 'income'
            AND t.status = 'active'
            AND t.transaction_date >= ?
            AND t.transaction_date <= ?
          ORDER BY t.transaction_date DESC, t.id DESC
      `, [dateFrom, dateTo]);

      // 6.25. PURCHASE INVOICE EXTRA COSTS (transport / handling)
      // Read directly from purchase invoices so financial reports remain complete even
      // if the auxiliary non-cash transaction could not be created. Values are converted
      // to the base currency using the invoice exchange rate.
      const purchaseExtraCostRows = await all(db, `
          SELECT
              pi.id AS purchase_invoice_id,
              pi.invoice_number,
              pi.invoice_date,
              pi.currency,
              COALESCE(NULLIF(pi.exchange_rate, 0), 1) AS exchange_rate,
              s.name AS supplier_name,
              COALESCE(pi.transport_cost, 0) AS transport_cost,
              COALESCE(pi.emptying_cost, 0) AS emptying_cost
          FROM purchase_invoices pi
          LEFT JOIN suppliers s ON s.id = pi.supplier_id
          WHERE pi.status != 'cancelled'
            AND pi.invoice_date >= ?
            AND pi.invoice_date <= ?
            AND (COALESCE(pi.transport_cost, 0) > 0 OR COALESCE(pi.emptying_cost, 0) > 0)
          ORDER BY pi.invoice_date DESC, pi.id DESC
      `, [dateFrom, dateTo]);

      const purchaseExtraCostDetails = [];
      for (const row of purchaseExtraCostRows) {
          const rate = number(row.exchange_rate) || 1;
          const originalCurrency = normalizeCurrency(row.currency);
          for (const [kind, label, rawAmount] of [
              ['transport', 'تكلفة نقل', row.transport_cost],
              ['emptying', 'تكلفة عتالة', row.emptying_cost],
          ]) {
              const nativeAmount = number(rawAmount);
              if (!(nativeAmount > 0)) continue;
              const baseAmount = Math.round((nativeAmount * rate) * 100) / 100;
              purchaseExtraCostDetails.push({
                  id: `purchase-${row.purchase_invoice_id}-${kind}`,
                  transaction_date: row.invoice_date,
                  category_name: label,
                  description: `${label} — فاتورة شراء #${row.invoice_number}${row.supplier_name ? ` — ${row.supplier_name}` : ''}`,
                  notes: `تكلفة إضافية مرتبطة بفاتورة الشراء ${row.invoice_number}`,
                  currency: 'SYP',
                  original_currency: originalCurrency,
                  original_amount: nativeAmount,
                  amount: baseAmount,
                  purchase_invoice_id: number(row.purchase_invoice_id),
                  invoice_number: row.invoice_number,
                  supplier_name: row.supplier_name || '—',
                  cost_type: kind,
              });
          }
      }

      // ────────────────────────────────────────────────────────────────────
      // 6.5. STOCK ADJUSTMENT LOSSES (negative adjustments)
      // ────────────────────────────────────────────────────────────────────
      const stockLossRows = await all(db, `
          SELECT
              sa.quantity,
              COALESCE(sb.purchase_price_base, sb.purchase_price, 0) AS purchase_price,
              (
                ABS(sa.quantity) *
                COALESCE(sb.purchase_price_base, sb.purchase_price, 0)
              ) AS loss_amount,
              p.name AS product_name,
              DATE(sa.created_at) AS adjustment_date,
              sa.reason,
              sa.notes
          FROM stock_adjustments sa
          JOIN stock_batches sb ON sb.id = sa.stock_batch_id
          JOIN products p ON p.id = sb.product_id
          WHERE sa.quantity < 0
            AND COALESCE(sa.reason, '') NOT IN (
              'consignment_return_out',
              'consignment_spoilage_out'
            )
            AND DATE(sa.created_at) >= ?
            AND DATE(sa.created_at) <= ?
          ORDER BY sa.created_at DESC
      `, [dateFrom, dateTo]);

      // ────────────────────────────────────────────────────────────────────
      // 7. SPOILAGE BREAKDOWN (quantities; monetary value is in expenses above)
      // ────────────────────────────────────────────────────────────────────
      const spoilageRows = await all(db, `
          SELECT
              COALESCE(SUM(cs.spoilage_quantity), 0) AS total_spoilage_qty,
              COUNT(DISTINCT cs.id)                  AS settlement_count,
              cs.currency
          FROM consignment_settlements cs
          WHERE cs.status = 'completed'
            AND cs.remaining_stock_policy = 'spoilage'
            AND cs.settlement_date >= ?
            AND cs.settlement_date <= ?
          GROUP BY cs.currency
      `, [dateFrom, dateTo]);

      // ────────────────────────────────────────────────────────────────────
      // 8. SALES BREAKDOWN by invoice type (standard vs consignment)
      // ────────────────────────────────────────────────────────────────────
      const salesBreakdownRows = await all(db, `
          SELECT
              COALESCE(pi.invoice_type, 'standard')                                            AS invoice_type,
              si.currency,
              COALESCE(SUM(sii.line_total), 0)                                                 AS revenue_native,
              COALESCE(SUM(sii.line_total * COALESCE(NULLIF(si.exchange_rate, 0), 1)), 0)      AS revenue_base,
              COALESCE(SUM(sii.profit), 0)                                                     AS profit_base,
              COUNT(DISTINCT si.id)                                                            AS invoice_count
          FROM sale_invoice_items sii
          JOIN sale_invoices si ON si.id = sii.sale_invoice_id
          JOIN stock_batches sb ON sb.id = sii.stock_batch_id
          LEFT JOIN purchase_invoices pi ON pi.id = sb.purchase_invoice_id
          WHERE si.status != 'cancelled'
            AND si.invoice_date >= ?
            AND si.invoice_date <= ?
          GROUP BY COALESCE(pi.invoice_type, 'standard'), si.currency
      `, [dateFrom, dateTo]);

      // ────────────────────────────────────────────────────────────────────
      // Aggregate totals
      // ────────────────────────────────────────────────────────────────────
      const totalRevenueBase             = revenueRows.reduce((s, r) => s + number(r.revenue_base), 0);
      const totalCogsBase                = number(cogsRow?.cogs_base);
      const totalGrossProfitBase         = number(grossProfitRow?.gross_profit_base);
      const totalConsignmentPayoutBase   = consignmentPayoutRows.reduce((s, r) => s + number(r.payout_base), 0);
      const totalGeneralExpenses         = expenseRows.reduce((s, r) => s + number(r.expense_native), 0);
      const totalPurchaseExtraCostsBase  = purchaseExtraCostDetails.reduce((s, r) => s + number(r.amount), 0);
      const totalExpensesNative          = totalGeneralExpenses + totalPurchaseExtraCostsBase;
      const totalIncomeNative            = incomeRows.reduce((s, r) => s + number(r.income_native), 0);
      const totalStockLossBase           = stockLossRows.reduce((s, r) => s + number(r.loss_amount), 0);

      // Net profit = gross profit from sales + other income − other expenses - stock loss.
      // Consignment commission is already embedded in grossProfitBase because:
      //   gross_profit = sale_revenue_base − cogs_base
      // and the COGS for consignment batches is the purchase_price_base per unit.
      const netProfitBase = Math.round(
          (totalGrossProfitBase + totalIncomeNative - totalExpensesNative - totalStockLossBase) * 100
      ) / 100;

      return {
          period: { date_from: dateFrom, date_to: dateTo },

          revenue: {
              by_currency: revenueRows.map(r => ({
                  currency:    r.currency,
                  amount:      number(r.revenue_native),
                  amount_base: number(r.revenue_base),
              })),
              total_base: number(totalRevenueBase),
          },

          cogs: {
              total_base: number(totalCogsBase),
          },

          gross_profit: {
              total_base: number(totalGrossProfitBase),
          },

          consignment_payouts: {
              by_currency: consignmentPayoutRows.map(r => ({
                  currency:    r.currency,
                  amount:      number(r.payout_native),
                  amount_base: number(r.payout_base),
              })),
              total_base: number(totalConsignmentPayoutBase),
          },

          expenses: {
              details: expenseRows.map(r => ({
                  id:          r.id,
                  transaction_date: r.transaction_date,
                  category_name: r.category_name,
                  description: r.description,
                  notes:       r.notes,
                  currency:    r.currency,
                  amount:      number(r.expense_native),
              })),
              total_native: number(totalGeneralExpenses),
          },

          purchase_extra_costs: {
              details: purchaseExtraCostDetails,
              total_base: number(totalPurchaseExtraCostsBase),
          },

          other_income: {
              details: incomeRows.map(r => ({
                  id:          r.id,
                  transaction_date: r.transaction_date,
                  category_name: r.category_name,
                  description: r.description,
                  notes:       r.notes,
                  currency:    r.currency,
                  amount:      number(r.income_native),
              })),
              total_native: number(totalIncomeNative),
          },
          
          stock_losses: {
              details: stockLossRows.map(r => ({
                  quantity: r.quantity,
                  purchase_price: number(r.purchase_price),
                  loss_amount: number(r.loss_amount),
                  product_name: r.product_name,
                  adjustment_date: r.adjustment_date,
                  reason: r.reason,
                  notes: r.notes
              })),
              total_base: number(totalStockLossBase),
          },

          spoilage_summary: spoilageRows.map(r => ({
              currency:         r.currency,
              total_units:      number(r.total_spoilage_qty),
              settlement_count: r.settlement_count,
          })),

          sales_breakdown: salesBreakdownRows.map(r => ({
              invoice_type:  r.invoice_type,
              currency:      r.currency,
              revenue:       number(r.revenue_native),
              revenue_base:  number(r.revenue_base),
              profit_base:   number(r.profit_base),
              invoice_count: r.invoice_count,
          })),

          summary: {
              total_revenue_base:              number(totalRevenueBase),
              total_cogs_base:                 number(totalCogsBase),
              gross_profit_base:               number(totalGrossProfitBase),
              total_consignment_payout_base:   number(totalConsignmentPayoutBase),
              total_expenses_native:           number(totalExpensesNative),
              total_general_expenses_native:   number(totalGeneralExpenses),
              total_purchase_extra_costs_base: number(totalPurchaseExtraCostsBase),
              total_other_income_native:       number(totalIncomeNative),
              total_stock_loss_base:           number(totalStockLossBase),
              net_profit_base:                 number(netProfitBase),
              is_profit:                       netProfitBase >= 0,
          },
      };
  }
}

module.exports = new ReportController();
