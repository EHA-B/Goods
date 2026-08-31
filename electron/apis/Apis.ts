// @ts-nocheck
import { app, ipcMain, dialog, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { clearCurrentUser, getCurrentUser, setCurrentUser } from '../services/sessionService';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function success(data) {
  return {
    success: true,
    data,
  };
}

function normalizeBackendError(code, message, details) {
  const originalCode = String(code || '').trim().toUpperCase();
  const originalMessage = String(message || '').trim();

  let normalizedCode = originalCode || 'UNKNOWN_ERROR';

  // Foreign-key violations usually mean the record is still referenced
  // by invoices, payments, stock movements, batches, or other linked data.
  if (
    normalizedCode === 'SQLITE_CONSTRAINT_FOREIGNKEY' ||
    normalizedCode === 'SQLITE_CONSTRAINT' ||
    /foreign key constraint failed/i.test(originalMessage) ||
    /foreign key constraint/i.test(originalMessage)
  ) {
    normalizedCode = 'HAS_DEPENDENCIES';
  }

  // Unique constraint violations.
  if (
    normalizedCode === 'SQLITE_CONSTRAINT_UNIQUE' ||
    /unique constraint failed/i.test(originalMessage)
  ) {
    normalizedCode = 'DUPLICATE_ENTRY';
  }

  // Validation-related SQLite constraints.
  if (
    normalizedCode === 'SQLITE_CONSTRAINT_NOTNULL' ||
    normalizedCode === 'SQLITE_CONSTRAINT_CHECK' ||
    /not null constraint failed/i.test(originalMessage) ||
    /check constraint failed/i.test(originalMessage)
  ) {
    normalizedCode = 'VALIDATION_ERROR';
  }

  // SQLite busy / locked database.
  if (
    normalizedCode === 'SQLITE_BUSY' ||
    /database is locked/i.test(originalMessage)
  ) {
    normalizedCode = 'DATABASE_BUSY';
  }

  // Read-only database.
  if (
    normalizedCode === 'SQLITE_READONLY' ||
    /readonly database/i.test(originalMessage) ||
    /attempt to write a readonly database/i.test(originalMessage)
  ) {
    normalizedCode = 'DATABASE_READONLY';
  }

  return {
    code: normalizedCode,
    message: originalMessage || 'Unknown application error',
    details,
  };
}

function failure(code, message, details) {
  return {
    success: false,
    error: normalizeBackendError(code, message, details),
  };
}

function escapeReportHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeLatinDigits(value) {
  return String(value ?? '')
    .replace(/[٠-٩]/g, (digit) =>
      String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)),
    )
    .replace(/[۰-۹]/g, (digit) =>
      String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)),
    );
}

function formatReportExportCell(value, format, row) {
  if (value === null || value === undefined || value === '') return '—';

  if (format === 'number') {
    const numeric = Number(value);

    return normalizeLatinDigits(
      Number.isFinite(numeric)
        ? numeric.toLocaleString('en-US', {
            maximumFractionDigits: 3,
          })
        : String(value),
    );
  }

  if (format === 'currency') {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
      return normalizeLatinDigits(String(value));
    }

    const currency =
      String(row?.currency || 'SYP').toUpperCase() === 'USD'
        ? 'USD'
        : 'ل.س';

    return normalizeLatinDigits(
      `${numeric.toLocaleString('en-US', {
        maximumFractionDigits: 2,
      })} ${currency}`,
    );
  }

  if (format === 'date') {
    const parsed = new Date(String(value));

    return normalizeLatinDigits(
      Number.isNaN(parsed.getTime())
        ? String(value)
        : parsed.toLocaleDateString('en-US'),
    );
  }

  return normalizeLatinDigits(String(value));
}

const invoiceFinancialSummaryLabels = new Set([
  'المجموع الفرعي',
  'الخصم',
  'تكلفة النقل',
  'تكلفة العتالة',
  'الضريبة',
  'الإجمالي',
  'المدفوع',
  'المتبقي',
  'ربح الأصناف الأساسي',
]);

const invoiceOperationalSummaryLabels = new Set([
  'الكمية الكلية',
  'الكمية المستلمة',
  'المتبقي بالمخزون',
  'عدد الدفعات',
  'آخر دفعة',
]);

function isDetailedInvoiceReport(report) {
  const title = String(report?.title || '');
  return (
    title.includes('المبيعات التفصيلي') ||
    title.includes('المشتريات التفصيلي')
  );
}

function isInvoiceFinancialSummaryLabel(label) {
  const value = String(label || '');
  return invoiceFinancialSummaryLabels.has(value) || value.startsWith('تكلفة النقل (') || value.startsWith('تكلفة العتالة (');
}

function splitInvoiceSummary(summary) {
  const items = Array.isArray(summary) ? summary : [];

  return {
    financial: items.filter((item) =>
      isInvoiceFinancialSummaryLabel(item?.label),
    ),
    operational: items.filter((item) =>
      invoiceOperationalSummaryLabels.has(String(item?.label || '')),
    ),
    identity: items.filter((item) => {
      const label = String(item?.label || '');
      return (
        !isInvoiceFinancialSummaryLabel(label) &&
        !invoiceOperationalSummaryLabels.has(label)
      );
    }),
  };
}

function renderReportSummaryCards(summary) {
  if (!Array.isArray(summary) || !summary.length) return '';

  return `<section class="summary-grid">${summary.map((item) => `
    <div class="summary-card">
      <div class="summary-label">${escapeReportHtml(item.label)}</div>
      <div class="summary-value">${escapeReportHtml(normalizeLatinDigits(item.value))}</div>
    </div>
  `).join('')}</section>`;
}

function renderReportTable(tableColumns, tableRows) {
  const columns = Array.isArray(tableColumns) ? tableColumns : [];
  const rows = Array.isArray(tableRows) ? tableRows : [];

  if (!columns.length) return '';

  const tableHead = columns
    .map((column) => `<th class="${column.format === 'currency' || column.format === 'number' ? 'numeric-head' : ''}">${escapeReportHtml(column.label)}</th>`)
    .join('');

  const body = rows.length
    ? rows.map((row) => `
        <tr>
          ${columns.map((column) => `
            <td class="${
              column.format === 'currency' || column.format === 'number'
                ? 'numeric'
                : column.format === 'date'
                  ? 'date-cell'
                  : ''
            }">${escapeReportHtml(
              formatReportExportCell(
                row?.[column.key],
                column.format,
                row,
              ),
            )}</td>
          `).join('')}
        </tr>
      `).join('')
    : `<tr><td class="empty" colspan="${columns.length}">لا توجد بيانات</td></tr>`;

  return `
    <div class="table-wrap">
      <table class="data-table" dir="rtl">
        <thead><tr>${tableHead}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function renderInvoiceMeta(items) {
  if (!items.length) return '';

  return `<div class="invoice-meta">${items.map((item) => `
    <div class="meta-item">
      <span>${escapeReportHtml(item.label)}</span>
      <strong>${escapeReportHtml(normalizeLatinDigits(item.value))}</strong>
    </div>
  `).join('')}</div>`;
}

function renderInvoiceOperational(items) {
  if (!items.length) return '';

  return `
    <div class="invoice-info-block">
      <div class="block-title">معلومات الحركة</div>
      <div class="compact-grid">
        ${items.map((item) => `
          <div class="compact-row">
            <span>${escapeReportHtml(item.label)}</span>
            <strong>${escapeReportHtml(normalizeLatinDigits(item.value))}</strong>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderInvoiceFinancial(items) {
  if (!items.length) return '';

  return `
    <div class="invoice-financial-block">
      <div class="block-title">الملخص المالي للفاتورة</div>
      <div class="financial-list">
        ${items.map((item) => {
          const label = String(item?.label || '');
          const important = [
            'الإجمالي',
            'المتبقي',
            'ربح الأصناف الأساسي',
          ].includes(label);

          return `
            <div class="financial-row ${important ? 'important' : ''}">
              <span>${escapeReportHtml(label)}</span>
              <strong>${escapeReportHtml(normalizeLatinDigits(item.value))}</strong>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderDetailedInvoiceSections(sections) {
  return sections.map((section) => {
    const grouped = splitInvoiceSummary(section?.summary);

    return `
      <section class="invoice-card">
        <div class="invoice-heading">
          <div class="invoice-title">${escapeReportHtml(section?.title || '')}</div>
          ${renderInvoiceMeta(grouped.identity)}
        </div>

        ${renderReportTable(section?.columns || [], section?.rows || [])}

        ${(grouped.operational.length || grouped.financial.length)
          ? `<div class="invoice-footer-grid">
              ${renderInvoiceOperational(grouped.operational)}
              ${renderInvoiceFinancial(grouped.financial)}
            </div>`
          : ''}
      </section>
    `;
  }).join('');
}

function renderGenericReportSections(sections) {
  return sections.map((section) => {
    const sectionSummary = Array.isArray(section?.summary)
      ? section.summary
      : [];

    return `
      <section class="report-section">
        <div class="section-title">${escapeReportHtml(section?.title || '')}</div>
        ${renderReportTable(section?.columns || [], section?.rows || [])}
        ${sectionSummary.length
          ? `<div class="section-summary">
              ${sectionSummary.map((item) => `
                <div>
                  <span>${escapeReportHtml(item.label)}</span>
                  <strong>${escapeReportHtml(normalizeLatinDigits(item.value))}</strong>
                </div>
              `).join('')}
            </div>`
          : ''}
      </section>
    `;
  }).join('');
}

function renderReportHtml(report) {
  const columns = Array.isArray(report?.columns) ? report.columns : [];
  const rows = Array.isArray(report?.rows) ? report.rows : [];
  const summary = Array.isArray(report?.summary) ? report.summary : [];
  const sections = Array.isArray(report?.sections) ? report.sections : [];
  const detailedInvoices = isDetailedInvoiceReport(report);

  const summaryHtml = renderReportSummaryCards(summary);

  const contentHtml = sections.length
    ? detailedInvoices
      ? renderDetailedInvoiceSections(sections)
      : renderGenericReportSections(sections)
    : renderReportTable(columns, rows);

  const isProfitLoss =
    String(report?.title || '').includes('أرباح') ||
    String(report?.title || '').includes('خسائر');

  const netItem = summary.find((item) =>
    String(item?.label || '').includes('صافي الربح'),
  );

  const netValue = Number(
    String(netItem?.value ?? '')
      .replace(/,/g, '')
      .replace(/[^\d.-]/g, ''),
  );

  const netHtml = isProfitLoss && netItem
    ? `<section class="net-result ${Number.isFinite(netValue) && netValue < 0 ? 'loss' : 'profit'}">
        <div>
          <span class="net-caption">النتيجة النهائية للفترة</span>
          <strong>${Number.isFinite(netValue) && netValue < 0 ? 'صافي خسارة' : 'صافي ربح'}</strong>
        </div>
        <div class="net-number">${escapeReportHtml(normalizeLatinDigits(netItem.value))}</div>
      </section>`
    : '';

  const totalRows = report?.totalRows ?? rows.length;

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${escapeReportHtml(report?.title || 'تقرير')}</title>
  <style>
    * { box-sizing: border-box; }

    html, body { direction: rtl; }

    body {
      margin: 0;
      padding: 0;
      font-family: Tahoma, Arial, sans-serif;
      color: #17211f;
      background: #ffffff;
      font-size: 9px;
      text-align: right;
    }

    .report-page {
      width: 100%;
      direction: rtl;
    }

    .report-header {
      display: flex;
      direction: rtl;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      border-bottom: 2px solid #1f7664;
      padding-bottom: 10px;
      margin-bottom: 12px;
      text-align: right;
    }

    h1 {
      margin: 0;
      color: #153e35;
      font-size: 18px;
      line-height: 1.5;
      text-align: right;
    }

    .meta {
      margin-top: 4px;
      color: #71807c;
      font-size: 8px;
      text-align: right;
    }

    .latin,
    .summary-value,
    .numeric,
    .date-cell,
    .meta-item strong,
    .compact-row strong,
    .financial-row strong,
    .net-number {
      unicode-bidi: isolate;
      font-variant-numeric: tabular-nums lining-nums;
    }

    .brand {
      border: 1px solid #d9e5e1;
      border-radius: 7px;
      padding: 6px 10px;
      color: #1f7664;
      font-weight: 700;
      white-space: nowrap;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 6px;
      margin-bottom: 12px;
      direction: rtl;
    }

    .summary-card {
      position: relative;
      overflow: hidden;
      min-height: 48px;
      border: 1px solid #dfe7e4;
      border-radius: 7px;
      padding: 7px 9px 7px 8px;
      background: #f8fbfa;
      text-align: right;
    }

    .summary-card::before {
      content: "";
      position: absolute;
      inset-block: 0;
      right: 0;
      width: 3px;
      background: #1f7664;
    }

    .summary-label {
      padding-right: 4px;
      color: #71807c;
      font-size: 7px;
      line-height: 1.4;
      text-align: right;
    }

    .summary-value {
      margin-top: 3px;
      padding-right: 4px;
      color: #17211f;
      font-size: 10px;
      font-weight: 800;
      text-align: right;
    }

    .invoice-card {
      overflow: hidden;
      margin: 0 0 12px;
      border: 1px solid #cfdad6;
      border-radius: 8px;
      background: #fff;
      break-inside: auto;
      page-break-inside: auto;
    }

    .invoice-heading {
      direction: rtl;
      padding: 9px 10px;
      border-bottom: 1px solid #cfdad6;
      background: #eef5f2;
      text-align: right;
      break-after: avoid;
      page-break-after: avoid;
    }

    .invoice-title {
      color: #214c41;
      font-size: 10px;
      font-weight: 800;
      line-height: 1.5;
      text-align: right;
    }

    .invoice-meta {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 6px 12px;
      margin-top: 8px;
      direction: rtl;
    }

    .meta-item {
      min-width: 0;
      text-align: right;
    }

    .meta-item span {
      display: block;
      margin-bottom: 2px;
      color: #71807c;
      font-size: 6.5px;
      font-weight: 700;
    }

    .meta-item strong {
      display: block;
      color: #17211f;
      font-size: 8px;
      font-weight: 800;
      overflow-wrap: anywhere;
      text-align: right;
    }

    .table-wrap {
      width: 100%;
      overflow: hidden;
      direction: rtl;
    }

    .data-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      direction: rtl;
      font-size: 7px;
    }

    .data-table thead {
      display: table-header-group;
    }

    .data-table th,
    .data-table td {
      border-left: 1px solid #d9e2df;
      border-bottom: 1px solid #d9e2df;
      padding: 4px 4px;
      vertical-align: middle;
      line-height: 1.35;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: normal;
      text-align: right;
    }

    .data-table th:last-child,
    .data-table td:last-child {
      border-left: 0;
    }

    .data-table th {
      background: #f6f9f8;
      color: #40534e;
      font-size: 6.5px;
      font-weight: 800;
      text-align: right;
    }

    .data-table tbody tr:nth-child(even) td {
      background: #fbfcfc;
    }

    .data-table td.numeric,
    .data-table th.numeric-head {
      direction: ltr;
      text-align: center;
      white-space: nowrap;
    }

    .data-table td.date-cell {
      direction: ltr;
      text-align: center;
      white-space: nowrap;
    }

    .empty {
      padding: 10px !important;
      color: #71807c;
      text-align: center !important;
    }

    .invoice-footer-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr);
      direction: rtl;
      border-top: 1px solid #cfdad6;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .invoice-info-block,
    .invoice-financial-block {
      min-width: 0;
      padding: 8px 10px;
      text-align: right;
    }

    .invoice-info-block {
      border-left: 1px solid #d9e2df;
      background: #fff;
    }

    .invoice-financial-block {
      background: #f8fbfa;
    }

    .block-title {
      margin-bottom: 6px;
      color: #40534e;
      font-size: 7px;
      font-weight: 800;
      text-align: right;
    }

    .compact-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4px 8px;
    }

    .compact-row,
    .financial-row {
      display: flex;
      direction: rtl;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-width: 0;
      text-align: right;
    }

    .compact-row {
      padding: 4px 6px;
      border-radius: 4px;
      background: #f7f9f8;
    }

    .compact-row span,
    .financial-row span {
      color: #71807c;
      font-size: 6.5px;
      font-weight: 700;
      text-align: right;
    }

    .compact-row strong,
    .financial-row strong {
      color: #17211f;
      font-size: 7.5px;
      font-weight: 800;
      text-align: left;
    }

    .financial-list {
      display: grid;
      gap: 3px;
    }

    .financial-row {
      padding: 3px 5px;
      border-bottom: 1px solid #e8eeec;
    }

    .financial-row:last-child {
      border-bottom: 0;
    }

    .financial-row.important {
      margin-top: 1px;
      border: 1px solid #cfdad6;
      border-radius: 4px;
      background: #fff;
    }

    .financial-row.important strong {
      color: #1f7664;
      font-size: 8px;
    }

    .report-section {
      margin: 0 0 10px;
      border: 1px solid #cfdad6;
      border-radius: 7px;
      overflow: hidden;
    }

    .section-title {
      padding: 7px 9px;
      border-bottom: 1px solid #cfdad6;
      background: #eef5f2;
      color: #294b43;
      font-size: 9px;
      font-weight: 800;
      text-align: right;
    }

    .section-summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 5px;
      padding: 7px 9px;
      border-top: 1px solid #cfdad6;
      background: #f8fbfa;
      direction: rtl;
    }

    .section-summary div {
      min-width: 0;
      text-align: right;
    }

    .section-summary span {
      display: block;
      margin-bottom: 2px;
      color: #71807c;
      font-size: 6.5px;
      font-weight: 700;
    }

    .section-summary strong {
      display: block;
      color: #17211f;
      font-size: 7.5px;
      font-weight: 800;
      text-align: right;
    }

    .net-result {
      display: flex;
      direction: rtl;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 10px;
      padding: 8px 10px;
      border: 1px solid #9ccdbf;
      border-radius: 7px;
      background: #f1faf7;
    }

    .net-result.loss {
      border-color: #e2b4b4;
      background: #fff6f6;
    }

    .net-caption {
      display: block;
      margin-bottom: 2px;
      color: #71807c;
      font-size: 7px;
    }

    .net-result strong {
      color: #153e35;
      font-size: 10px;
    }

    .net-number {
      direction: ltr;
      color: #1f7664;
      font-size: 12px;
      font-weight: 900;
      text-align: left;
    }

    .net-result.loss strong,
    .net-result.loss .net-number {
      color: #9f2f2f;
    }

    .report-footer {
      display: flex;
      direction: rtl;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 8px;
      color: #71807c;
      font-size: 7px;
      text-align: right;
    }

    @media print {
      .invoice-heading,
      .invoice-footer-grid,
      .section-title,
      .summary-card {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }

    @page {
      size: A4 portrait;
      margin: 7mm;
    }
  </style>
</head>
<body>
  <main class="report-page">
    <header class="report-header">
      <div>
        <h1>${escapeReportHtml(report?.title || 'تقرير')}</h1>
        <div class="meta">
          <span>تم التوليد:</span>
          <span class="latin" dir="ltr">${escapeReportHtml(
            normalizeLatinDigits(
              new Date(report?.generatedAt || Date.now()).toLocaleString('en-US'),
            ),
          )}</span>
        </div>
      </div>
      <div class="brand">StockLite</div>
    </header>

    ${summaryHtml}
    ${netHtml}
    ${contentHtml}

    <footer class="report-footer">
      <span>عدد النتائج: <strong>${escapeReportHtml(normalizeLatinDigits(totalRows))}</strong></span>
      <span>تقرير صادر إلكترونيًا من StockLite</span>
    </footer>
  </main>
</body>
</html>`;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function renderExcelKeyValueRows(items, pairsPerRow = 2) {
  if (!Array.isArray(items) || !items.length) return '';

  return chunkArray(items, pairsPerRow)
    .map((chunk) => `
      <tr>
        ${chunk.map((item) => `
          <th class="kv-label">${escapeReportHtml(item.label)}</th>
          <td class="kv-value">${escapeReportHtml(normalizeLatinDigits(item.value))}</td>
        `).join('')}
        ${Array.from({ length: pairsPerRow - chunk.length })
          .map(() => '<th class="kv-label"></th><td class="kv-value"></td>')
          .join('')}
      </tr>
    `)
    .join('');
}

function renderExcelDataTable(columns, rows) {
  if (!Array.isArray(columns) || !columns.length) return '';

  return `
    <table class="excel-table data" dir="rtl">
      <thead>
        <tr>${columns.map((column) => `<th>${escapeReportHtml(column.label)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${Array.isArray(rows) && rows.length
          ? rows.map((row) => `
              <tr>
                ${columns.map((column) => `
                  <td class="${column.format === 'currency' || column.format === 'number' || column.format === 'date' ? 'latin-cell' : ''}">${escapeReportHtml(
                    formatReportExportCell(
                      row?.[column.key],
                      column.format,
                      row,
                    ),
                  )}</td>
                `).join('')}
              </tr>
            `).join('')
          : `<tr><td colspan="${columns.length}">لا توجد بيانات</td></tr>`}
      </tbody>
    </table>
  `;
}

function renderReportExcelHtml(report) {
  const summary = Array.isArray(report?.summary) ? report.summary : [];
  const sections = Array.isArray(report?.sections) ? report.sections : [];
  const rows = Array.isArray(report?.rows) ? report.rows : [];
  const columns = Array.isArray(report?.columns) ? report.columns : [];
  const detailedInvoices = isDetailedInvoiceReport(report);

  const summaryTable = summary.length
    ? `<table class="excel-table summary-table" dir="rtl">
        <tbody>${renderExcelKeyValueRows(summary, 2)}</tbody>
      </table>`
    : '';

  const sectionHtml = sections.length
    ? sections.map((section) => {
        const grouped = detailedInvoices
          ? splitInvoiceSummary(section?.summary)
          : {
              identity: Array.isArray(section?.summary) ? section.summary : [],
              operational: [],
              financial: [],
            };

        return `
          <div class="excel-section">
            <table class="excel-table section-title-table" dir="rtl">
              <tr><th>${escapeReportHtml(section?.title || '')}</th></tr>
            </table>

            ${grouped.identity.length
              ? `<table class="excel-table meta-table" dir="rtl"><tbody>${renderExcelKeyValueRows(grouped.identity, 2)}</tbody></table>`
              : ''}

            ${renderExcelDataTable(section?.columns || [], section?.rows || [])}

            ${grouped.operational.length
              ? `<table class="excel-table detail-table" dir="rtl">
                  <tr><th colspan="4" class="sub-title">معلومات الحركة</th></tr>
                  ${renderExcelKeyValueRows(grouped.operational, 2)}
                </table>`
              : ''}

            ${grouped.financial.length
              ? `<table class="excel-table detail-table financial" dir="rtl">
                  <tr><th colspan="4" class="sub-title">الملخص المالي للفاتورة</th></tr>
                  ${renderExcelKeyValueRows(grouped.financial, 2)}
                </table>`
              : ''}
          </div>
        `;
      }).join('')
    : renderExcelDataTable(columns, rows);

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <style>
    html, body { direction: rtl; }
    body {
      font-family: Tahoma, Arial, sans-serif;
      direction: rtl;
      text-align: right;
      color: #17211f;
    }
    .report-title {
      font-size: 18px;
      font-weight: bold;
      color: #153e35;
      text-align: right;
      margin-bottom: 4px;
    }
    .generated-at {
      direction: rtl;
      text-align: right;
      color: #71807c;
      margin-bottom: 12px;
    }
    .excel-table {
      border-collapse: collapse;
      direction: rtl;
      width: 100%;
      margin-bottom: 8px;
    }
    .excel-table th,
    .excel-table td {
      border: 1px solid #cfdad6;
      padding: 6px;
      text-align: right;
      vertical-align: middle;
    }
    .excel-table th {
      background: #eef5f2;
      color: #294b43;
      font-weight: bold;
    }
    .summary-table .kv-label,
    .meta-table .kv-label,
    .detail-table .kv-label {
      background: #f4f8f6;
      color: #5e706b;
      font-weight: bold;
      width: 16%;
    }
    .kv-value {
      direction: rtl;
      text-align: right;
      font-weight: bold;
      width: 34%;
    }
    .section-title-table th {
      background: #1f7664;
      color: #ffffff;
      font-size: 13px;
      text-align: right;
    }
    .sub-title {
      background: #e8f2ef !important;
      color: #294b43;
      text-align: right !important;
    }
    .data th { background: #eef5f2; }
    .data td { background: #ffffff; }
    .latin-cell {
      direction: ltr;
      mso-number-format: "@";
      text-align: center !important;
    }
    .financial .kv-value { color: #153e35; }
    .excel-section { margin-top: 14px; }
  </style>
</head>
<body>
  <div class="report-title">${escapeReportHtml(report?.title || 'تقرير')}</div>
  <div class="generated-at">تم التوليد: ${escapeReportHtml(
    normalizeLatinDigits(
      new Date(report?.generatedAt || Date.now()).toLocaleString('en-US'),
    ),
  )}</div>

  ${summaryTable}
  ${sectionHtml}
</body>
</html>`;
}

const authController = require(path.join(__dirname, '../../src/controllers', 'authController.js'));
const activityLogController = require(path.join(__dirname, '../../src/controllers', 'activityLogController.js'));
const cashboxController = require(path.join(__dirname, '../../src/controllers', 'cashboxController.js'));
const cashboxTransactionController = require(path.join(__dirname, '../../src/controllers', 'cashboxTransactionController.js'));
const customerController = require(path.join(__dirname, '../../src/controllers', 'customerController.js'));
const paymentController = require(path.join(__dirname, '../../src/controllers', 'paymentController.js'));
const productController = require(path.join(__dirname, '../../src/controllers', 'productController.js'));
const purchaseInvoiceController = require(path.join(__dirname, '../../src/controllers', 'purchaseInvoiceController.js'));
const purchaseInvoiceItemController = require(path.join(__dirname, '../../src/controllers', 'purchaseInvoiceItemController.js'));
const saleInvoiceController = require(path.join(__dirname, '../../src/controllers', 'saleInvoiceController.js'));
const saleInvoiceItemController = require(path.join(__dirname, '../../src/controllers', 'saleInvoiceItemController.js'));
const saleTypeController = require(path.join(__dirname, '../../src/controllers', 'saleTypeController.js'));
const settingController = require(path.join(__dirname, '../../src/controllers', 'settingController.js'));
const stockAdjustmentController = require(path.join(__dirname, '../../src/controllers', 'stockAdjustmentController.js'));
const stockBatchController = require(path.join(__dirname, '../../src/controllers', 'stockBatchController.js'));
const supplierController = require(path.join(__dirname, '../../src/controllers', 'supplierController.js'));
const transactionCategoryController = require(path.join(__dirname, '../../src/controllers', 'transactionCategoryController.js'));
const transactionController = require(path.join(__dirname, '../../src/controllers', 'transactionController.js'));
const userController = require(path.join(__dirname, '../../src/controllers', 'userController.js'));
const backupController = require(path.join(__dirname, '../../src/controllers', 'backupController.js'));
const dashboardController = require(path.join(__dirname, '../../src/controllers', 'dashboardController.js'));
const printController = require(path.join(__dirname, '../../src/controllers', 'printController.js'));
const notificationController = require(path.join(__dirname, '../../src/controllers', 'notificationController.js'));
const workerController = require(path.join(__dirname, '../../src/controllers', 'workerController.js'));
const reportController = require(path.join(__dirname, '../../src/controllers', 'reportController.js'));


/**
 * Endpoint: api:auth:login
 * Description: Authenticates the single system user and starts an in-memory Electron session.
 */
ipcMain.handle('api:auth:login', async (_event, input) => {
  try {
    const user = await authController.login(input);
    setCurrentUser(user);
    global.__stockliteCurrentUserId = user.id;
    await activityLogController.recordActivity({ user_id: user.id, action: 'auth_login', table_name: 'users', record_id: user.id, new_data: { username: user.username } }).catch(() => undefined);
    return success(user);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:auth:logout
 * Description: Clears the current Electron session.
 */
ipcMain.handle('api:auth:logout', async () => {
  const user = getCurrentUser();
  if (user) await activityLogController.recordActivity({ user_id: user.id, action: 'auth_logout', table_name: 'users', record_id: user.id }).catch(() => undefined);
  clearCurrentUser();
  global.__stockliteCurrentUserId = null;
  return success({ success: true });
});

/**
 * Endpoint: api:auth:getCurrentUser
 * Description: Returns the authenticated session user, or null when signed out.
 */
ipcMain.handle('api:auth:getCurrentUser', async () => {
  return success(getCurrentUser());
});

/**
 * Endpoint: api:auth:changePassword
 * Description: Changes the password of the authenticated single user.
 */
ipcMain.handle('api:auth:changePassword', async (_event, input) => {
  try {
    const user = getCurrentUser();
    if (!user) return failure('UNAUTHENTICATED', 'Authentication is required');
    const result = await authController.changePassword(user.id, input);
    await activityLogController.recordActivity({ user_id: user.id, action: 'password_changed', table_name: 'users', record_id: user.id }).catch(() => undefined);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});


const internallyAuditedChannels = new Set([
  'api:saleInvoice:createSaleProcess','api:saleInvoice:updateSaleInvoice','api:saleInvoice:cancelSaleInvoice','api:payment:recordSalePayment','api:payment:reverseSalePayment',
  'api:purchase:createFull','api:purchase:update','api:purchase:addItems','api:purchase:cancel','api:payment:recordPurchasePayment','api:payment:reversePurchasePayment',
  'api:purchase:recordPaymentRefund',
  'api:purchase:closeCommission','api:purchase:reverseCommissionSettlement',
]);
function auditInfoForChannel(channel, args, data) {
  if (internallyAuditedChannels.has(channel) || channel.startsWith('api:activityLog:') || channel.includes(':get') || channel.includes(':list') || channel.includes(':summary')) return null;
  const operation = channel.split(':').pop() || 'operation';
  const entity = channel.split(':')[1] || 'system';
  const mutation = /(create|update|delete|remove|cancel|transfer|adjust|backup|restore|save|set)/i.test(operation);
  if (!mutation) return null;
  const tableMap = { product:'products', customer:'customers', supplier:'suppliers', cashbox:'cashboxes', transaction:'transactions', transactionCategory:'transaction_categories', stockAdjustment:'stock_adjustments', stockBatch:'stock_batches', setting:'settings', backup:'backups', saleType:'sale_types' };
  const action = `${entity}_${operation}`.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  const recordId = Number(data?.id ?? data?.transaction?.id ?? args?.[0]?.id ?? args?.[0] ?? 0) || 0;
  return { action, table_name: tableMap[entity] || entity, record_id: recordId, new_data: { input: args?.[0] ?? null, result_id: data?.id ?? null } };
}

// All API handlers registered after this point require an authenticated session.
// Authentication endpoints above remain public so the user can sign in.
const registerProtectedHandler = ipcMain.handle.bind(ipcMain);
ipcMain.handle = ((channel, listener) =>
  registerProtectedHandler(channel, async (...args) => {
    const user = getCurrentUser();
    if (!user) return failure('UNAUTHENTICATED', 'Authentication is required');
    global.__stockliteCurrentUserId = user.id;
    const eventArgs = args.slice(1);
    const pendingAudit = auditInfoForChannel(channel, eventArgs, null);
    const oldData = pendingAudit?.record_id ? await activityLogController.getEntitySnapshot(pendingAudit.table_name, pendingAudit.record_id).catch(() => null) : null;
    const response = await listener(...args);
    if (response?.success) {
      const audit = auditInfoForChannel(channel, eventArgs, response.data);
      if (audit) {
        const inputData = typeof eventArgs[1] === 'object' ? eventArgs[1] : typeof eventArgs[0] === 'object' ? eventArgs[0] : null;
        await activityLogController.recordActivity({ user_id: user.id, ...audit, old_data: oldData, new_data: inputData || response.data }).catch(() => undefined);
      }
    }
    return response;
  })) as typeof ipcMain.handle;

/** Read-only printable document endpoints. */
ipcMain.handle('api:print:payment', async (_event,id)=>{ try{return success(await printController.getPaymentDocument(id));}catch(e){return failure(e.code||'PRINT_LOAD_FAILED',e.message,e.details);} });
ipcMain.handle('api:print:transaction', async (_event,id)=>{ try{return success(await printController.getTransactionDocument(id));}catch(e){return failure(e.code||'PRINT_LOAD_FAILED',e.message,e.details);} });
ipcMain.handle('api:print:transfer', async (_event,id)=>{ try{return success(await printController.getTransferDocument(id));}catch(e){return failure(e.code||'PRINT_LOAD_FAILED',e.message,e.details);} });
ipcMain.handle('api:print:customerStatement', async (_event,id)=>{ try{return success(await printController.getCustomerStatement(id));}catch(e){return failure(e.code||'PRINT_LOAD_FAILED',e.message,e.details);} });
ipcMain.handle('api:print:supplierStatement', async (_event,id)=>{ try{return success(await printController.getSupplierStatement(id));}catch(e){return failure(e.code||'PRINT_LOAD_FAILED',e.message,e.details);} });
ipcMain.handle('api:print:cashboxStatement', async (_event,id)=>{ try{return success(await printController.getCashboxStatement(id));}catch(e){return failure(e.code||'PRINT_LOAD_FAILED',e.message,e.details);} });
ipcMain.handle('api:print:consignment', async (_event,id)=>{ try{return success(await printController.getConsignmentDocument(id));}catch(e){return failure(e.code||'PRINT_LOAD_FAILED',e.message,e.details);} });

/** Reports endpoints. */
ipcMain.handle('api:report:options', async () => {
  try {
    return success(await reportController.getOptions());
  } catch (e) {
    return failure(e.code || 'REPORT_LOAD_FAILED', e.message || 'تعذر تحميل خيارات التقارير', e.details);
  }
});

ipcMain.handle('api:report:generate', async (_event, input) => {
  try {
    return success(await reportController.generate(input || {}));
  } catch (e) {
    return failure(e.code || 'REPORT_GENERATE_FAILED', e.message || 'تعذر توليد التقرير', e.details);
  }
});

ipcMain.handle('api:report:export', async (event, input) => {
  let exportWindow = null;

  try {
    const format = input?.format;
    if (!['pdf', 'excel'].includes(format)) {
      return failure('VALIDATION_ERROR', 'صيغة التصدير غير مدعومة');
    }

    const report = await reportController.generate({
      reportId: input?.reportId,
      filters: input?.filters || {},
    });

    const parentWindow = BrowserWindow.fromWebContents(event.sender);
    const safeTitle = String(report?.title || 'report')
      .replace(/[\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100) || 'report';

    if (format === 'excel') {
      const result = await dialog.showSaveDialog(parentWindow || undefined, {
        title: 'تصدير التقرير إلى Excel',
        defaultPath: `${safeTitle}.xls`,
        filters: [{ name: 'Excel', extensions: ['xls'] }],
      });

      if (result.canceled || !result.filePath) {
        return success({ success: false, canceled: true });
      }

      const html = renderReportExcelHtml(report);
      await writeFile(result.filePath, `\ufeff${html}`, 'utf8');

      return success({
        success: true,
        filePath: result.filePath,
      });
    }

    const result = await dialog.showSaveDialog(parentWindow || undefined, {
      title: 'تصدير التقرير إلى PDF',
      defaultPath: `${safeTitle}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });

    if (result.canceled || !result.filePath) {
      return success({ success: false, canceled: true });
    }

    exportWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    const html = renderReportHtml(report);
    await exportWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
    );

    const pdf = await exportWindow.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: 'A4',
      margins: {
        top: 0.28,
        bottom: 0.28,
        left: 0.28,
        right: 0.28,
      },
      preferCSSPageSize: true,
    });

    await writeFile(result.filePath, pdf);

    return success({
      success: true,
      filePath: result.filePath,
    });
  } catch (e) {
    return failure(e.code || 'REPORT_EXPORT_FAILED', e.message || 'تعذر تصدير التقرير', e.details);
  } finally {
    if (exportWindow && !exportWindow.isDestroyed()) {
      exportWindow.destroy();
    }
  }
});

/** Notification center endpoints. */
ipcMain.handle('api:notification:list', async (_event,input) => { try { return success(await notificationController.list(input)); } catch(e) { return failure(e.code||'NOTIFICATIONS_LOAD_FAILED',e.message||'Failed to load notifications',e.details); } });
ipcMain.handle('api:notification:count', async () => { try { return success(await notificationController.unreadCount()); } catch(e) { return failure(e.code||'NOTIFICATIONS_LOAD_FAILED',e.message||'Failed to load notifications',e.details); } });
ipcMain.handle('api:notification:markRead', async (_event,id) => { try { return success(await notificationController.markRead(id)); } catch(e) { return failure(e.code||'NOTIFICATION_UPDATE_FAILED',e.message,e.details); } });
ipcMain.handle('api:notification:markAllRead', async () => { try { return success(await notificationController.markAllRead()); } catch(e) { return failure(e.code||'NOTIFICATION_UPDATE_FAILED',e.message,e.details); } });
ipcMain.handle('api:notification:dismiss', async (_event,id) => { try { return success(await notificationController.dismiss(id)); } catch(e) { return failure(e.code||'NOTIFICATION_UPDATE_FAILED',e.message,e.details); } });

/** Dashboard: consolidated read-only overview. */
ipcMain.handle('api:dashboard:get', async () => {
  try { return success(await dashboardController.getDashboard()); }
  catch (e) { return failure(e.code || 'DASHBOARD_LOAD_FAILED', e.message || 'Failed to load dashboard', e.details); }
});

/**
 * Endpoint: api:report:getProfitLoss
 * Description: Returns a date-filtered Profit & Loss (Gains & Losses) report.
 *              Includes: gross revenue, COGS, gross profit, consignment supplier payouts,
 *              general expenses (wages, spoilage write-offs, overheads), other income,
 *              and a net profit summary — all without double-counting commission.
 */
ipcMain.handle('api:report:getProfitLoss', async (_event, filters) => {
  try {
    const result = await reportController.getProfitLossReport(filters ?? {});
    return success(result);
  } catch (e) {
    return failure(e.code || 'REPORT_LOAD_FAILED', e.message || 'Failed to generate report', e.details);
  }
});

/**
 * Endpoint: api:system:getAppInfo
 * Description: Returns runtime and application information for the About page.
 */
ipcMain.handle('api:system:getAppInfo', async () => {
  try {
    const databasePath = path.join(app.getPath('userData'), 'farmer-market.db');

    return success({
      appName: 'StockLite',
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron || '',
      nodeVersion: process.versions.node || '',
      chromiumVersion: process.versions.chrome || '',
      databaseEngine: 'SQLite',
      databasePath,
      platform: process.platform,
      architecture: process.arch,
      environment: app.isPackaged ? 'production' : 'development',
    });
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

import LicenseManager from '../services/LicenseManager';

/** License read-only endpoints (can be called before full auth) */
ipcMain.handle('api:license:getDeviceId', async () => {
  try { return success(LicenseManager.getDeviceId()); }
  catch (e: any) { return failure('LICENSE_ERROR', e.message, e); }
});

ipcMain.handle('api:license:getStatus', async () => {
  try { return success(LicenseManager.getLicenseStatus()); }
  catch (e: any) { return failure('LICENSE_ERROR', e.message, e); }
});

ipcMain.handle('api:license:import', async (_event, sourcePath) => {
  try { return success(LicenseManager.importLicense(sourcePath)); }
  catch (e: any) { return failure('LICENSE_ERROR', e.message, e); }
});

/** Activity log read-only endpoints. */
ipcMain.handle('api:activityLog:list', async (_event, filters, pagination) => {
  try { return success(await activityLogController.listActivityLogs(filters, pagination)); }
  catch (e) { return failure(e.code || 'ACTIVITY_LOG_LOAD_FAILED', e.message || 'Failed to load activity log', e.details); }
});
ipcMain.handle('api:activityLog:get', async (_event, id) => {
  try { return success(await activityLogController.getActivityLog(id)); }
  catch (e) { return failure(e.code || 'ACTIVITY_LOG_LOAD_FAILED', e.message || 'Failed to load activity log', e.details); }
});
ipcMain.handle('api:activityLog:options', async () => {
  try { return success(await activityLogController.getActivityLogOptions()); }
  catch (e) { return failure(e.code || 'ACTIVITY_LOG_LOAD_FAILED', e.message || 'Failed to load activity log options', e.details); }
});

/**
 * Endpoint: api:cashbox:createCashbox
 * Description: Executes createCashbox on cashboxController.
 * Usage: Invoked by frontend to perform createCashbox operation.
 */
ipcMain.handle('api:cashbox:createCashbox', async (_event, input) => {
  try {
    const result = await cashboxController.createCashbox(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:getCashbox
 * Description: Executes getCashbox on cashboxController.
 * Usage: Invoked by frontend to perform getCashbox operation.
 */
ipcMain.handle('api:cashbox:getCashbox', async (_event, id) => {
  try {
    const result = await cashboxController.getCashbox(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:getAllCashboxs
 * Description: Executes getAllCashboxs on cashboxController.
 * Usage: Invoked by frontend to perform getAllCashboxs operation.
 */
ipcMain.handle('api:cashbox:getAllCashboxs', async (_event) => {
  try {
    const result = await cashboxController.getAllCashboxs();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:getCashboxesSummary
 * Description: Executes getCashboxesSummary on cashboxController.
 * Usage: Invoked by frontend to perform getCashboxesSummary operation.
 */
ipcMain.handle('api:cashbox:getCashboxesSummary', async (_event) => {
  try {
    const result = await cashboxController.getCashboxesSummary();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:reverseTransfer
 * Description: Atomically reverses both sides of a transfer using its transfer_group_id.
 * This is the only safe way to reverse a transfer movement.
 */
ipcMain.handle('api:cashbox:reverseTransfer', async (_event, transferGroupId, reason) => {
  try {
    const result = await cashboxController.reverseCashboxTransfer(transferGroupId, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:updateCashbox
 * Description: Executes updateCashbox on cashboxController.
 * Usage: Invoked by frontend to perform updateCashbox operation.
 */
ipcMain.handle('api:cashbox:updateCashbox', async (_event, id, input) => {
  try {
    const result = await cashboxController.updateCashbox(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:getDetails
 * Description: Returns cashbox data plus total_in, total_out, movement_count, recent_movements.
 */
ipcMain.handle('api:cashbox:getDetails', async (_event, id) => {
  try {
    const result = await cashboxController.getCashboxDetails(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:getMovements
 * Description: Returns paginated, filtered cashbox_transactions for a cashbox.
 */
ipcMain.handle('api:cashbox:getMovements', async (_event, cashboxId, filters) => {
  try {
    const result = await cashboxController.getCashboxMovements(cashboxId, filters);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:createMovement
 * Description: Creates a manual income/expense movement and atomically updates cashbox balance.
 */
ipcMain.handle('api:cashbox:createMovement', async (_event, input) => {
  try {
    const result = await cashboxController.createCashboxMovement(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:transferBetween
 * Description: Transfers between two cashboxes using object-based input with full validation.
 */
ipcMain.handle('api:cashbox:transferBetween', async (_event, input) => {
  try {
    const result = await cashboxController.transferBetweenCashboxes(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:reverseMovement
 * Description: Reverses an approved movement by creating an opposite movement.
 */
ipcMain.handle('api:cashbox:reverseMovement', async (_event, transactionId, reason) => {
  try {
    const result = await cashboxController.reverseCashboxMovement(transactionId, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:deleteCashbox
 * Description: Hard-deletes a cashbox only if it has zero balance and no linked records.
 */
ipcMain.handle('api:cashbox:deleteCashbox', async (_event, id) => {
  try {
    const result = await cashboxController.deleteCashbox(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashboxTransaction:getCashboxTransaction
 * Description: Read-only. Returns a single cashbox transaction by ID.
 * NOTE: Create/Update/Delete of cashbox transactions is intentionally removed from
 * the renderer-accessible API. All balance-changing operations must use the
 * dedicated cashboxes business API (createMovement, transfer, reverseMovement, etc.).
 */
ipcMain.handle('api:cashboxTransaction:getCashboxTransaction', async (_event, id) => {
  try {
    const result = await cashboxTransactionController.getCashboxTransaction(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashboxTransaction:getAllCashboxTransactions
 * Description: Read-only. Returns all cashbox transactions.
 */
ipcMain.handle('api:cashboxTransaction:getAllCashboxTransactions', async (_event) => {
  try {
    const result = await cashboxTransactionController.getAllCashboxTransactions();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:customer:createCustomer
 * Description: Executes createCustomer on customerController.
 * Usage: Invoked by frontend to perform createCustomer operation.
 */
ipcMain.handle('api:customer:createCustomer', async (_event, input) => {
  try {
    const result = await customerController.createCustomer(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:customer:getCustomer
 * Description: Executes getCustomer on customerController.
 * Usage: Invoked by frontend to perform getCustomer operation.
 */
ipcMain.handle('api:customer:getCustomer', async (_event, id) => {
  try {
    const result = await customerController.getCustomer(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:customer:getAllCustomers
 * Description: Executes getAllCustomers on customerController.
 * Usage: Invoked by frontend to perform getAllCustomers operation.
 */
ipcMain.handle('api:customer:getAllCustomers', async (_event) => {
  try {
    const result = await customerController.getAllCustomers();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:customer:updateCustomer
 * Description: Executes updateCustomer on customerController.
 * Usage: Invoked by frontend to perform updateCustomer operation.
 */
ipcMain.handle('api:customer:updateCustomer', async (_event, id, input) => {
  try {
    const result = await customerController.updateCustomer(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:customer:deleteCustomer
 * Description: Executes deleteCustomer on customerController.
 * Usage: Invoked by frontend to perform deleteCustomer operation.
 */
ipcMain.handle('api:customer:deleteCustomer', async (_event, id) => {
  try {
    const result = await customerController.deleteCustomer(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:payment:getPayment
 * Description: Read-only. Returns a single payment by ID.
 */
ipcMain.handle('api:payment:getPayment', async (_event, id) => {
  try {
    const result = await paymentController.getPayment(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:payment:getPartyPayments
 * Description: Read-only. Returns all payments for a specific party.
 */
ipcMain.handle('api:payment:getPartyPayments', async (_event, partyType, partyId) => {
  try {
    const result = await paymentController.getPartyPayments(partyType, partyId);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:payment:getAllPayments
 * Description: Read-only. Returns all payments.
 */
ipcMain.handle('api:payment:getAllPayments', async (_event) => {
  try {
    const result = await paymentController.getAllPayments();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:payment:getSalePayments
 * Description: Returns all active payments for a sale invoice.
 */
ipcMain.handle('api:payment:getSalePayments', async (_event, invoiceId) => {
  try {
    const result = await paymentController.getSalePayments(invoiceId);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:payment:getPurchasePayments
 * Description: Returns all active payments for a purchase invoice.
 */
ipcMain.handle('api:payment:getPurchasePayments', async (_event, invoiceId) => {
  try {
    const result = await paymentController.getPurchasePayments(invoiceId);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:payment:recordSalePayment
 * Description: Atomically records a sale payment: cashbox balance in, customer balance out, invoice status updated.
 */
ipcMain.handle('api:payment:recordSalePayment', async (_event, input) => {
  try {
    const result = await paymentController.recordSalePayment(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:payment:recordPurchasePayment
 * Description: Atomically records a purchase payment: cashbox balance out, supplier balance out, invoice status updated.
 */
ipcMain.handle('api:payment:recordPurchasePayment', async (_event, input) => {
  try {
    const result = await paymentController.recordPurchasePayment(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:payment:reverseSalePayment
 * Description: Reverses a sale payment: creates opposite cashbox movement, restores balances.
 */
ipcMain.handle('api:payment:reverseSalePayment', async (_event, paymentId, reason) => {
  try {
    const result = await paymentController.reverseSalePayment(paymentId, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:payment:reversePurchasePayment
 * Description: Reverses a purchase payment: creates opposite cashbox movement, restores balances.
 */
ipcMain.handle('api:payment:reversePurchasePayment', async (_event, paymentId, reason) => {
  try {
    const result = await paymentController.reversePurchasePayment(paymentId, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:payment:recordGeneralReceipt
 * Description: Records a general receipt from a party into the cashbox.
 */
ipcMain.handle('api:payment:recordGeneralReceipt', async (_event, input) => {
  try {
    const result = await paymentController.recordGeneralReceipt(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:payment:recordGeneralPayment
 * Description: Records a general payment to a party from the cashbox.
 */
ipcMain.handle('api:payment:recordGeneralPayment', async (_event, input) => {
  try {
    const result = await paymentController.recordGeneralPayment(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:product:createProduct
 * Description: Executes createProduct on productController.
 * Usage: Invoked by frontend to perform createProduct operation.
 */
ipcMain.handle('api:product:createProduct', async (_event, input) => {
  try {
    const result = await productController.createProduct(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:product:getProduct
 * Description: Executes getProduct on productController.
 * Usage: Invoked by frontend to perform getProduct operation.
 */
ipcMain.handle('api:product:getProduct', async (_event, id) => {
  try {
    const result = await productController.getProduct(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:product:getAllProducts
 * Description: Executes getAllProducts on productController.
 * Usage: Invoked by frontend to perform getAllProducts operation.
 */
ipcMain.handle('api:product:getAllProducts', async (_event) => {
  try {
    const result = await productController.getAllProducts();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:product:updateProduct
 * Description: Executes updateProduct on productController.
 * Usage: Invoked by frontend to perform updateProduct operation.
 */
ipcMain.handle('api:product:updateProduct', async (_event, id, input) => {
  try {
    const result = await productController.updateProduct(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:product:deleteProduct
 * Description: Executes deleteProduct on productController.
 * Usage: Invoked by frontend to perform deleteProduct operation.
 */
ipcMain.handle('api:product:deleteProduct', async (_event, id) => {
  try {
    const result = await productController.deleteProduct(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:product:adjustProductStock
 * Description: Executes adjustProductStock on productController.
 * Usage: Invoked by frontend to perform adjustProductStock operation.
 */
ipcMain.handle('api:product:adjustProductStock', async (_event, id, input) => {
  try {
    const result = await productController.adjustProductStock(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:product:getProductWithStock
 * Description: Executes getProductWithStock on productController.
 * Usage: Invoked by frontend to perform getProductWithStock operation.
 */
ipcMain.handle('api:product:getProductWithStock', async (_event, id) => {
  try {
    const result = await productController.getProductWithStock(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchase:createFull
 * Description: Atomically creates a full purchase invoice with items, batches, stock movements, supplier balance, and optional payment.
 */
ipcMain.handle('api:purchase:createFull', async (_event, input) => {
  try {
    const result = await purchaseInvoiceController.createFullPurchaseInvoice(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchase:addItems
 * Description: Appends new items to an existing purchase invoice and calculates related changes.
 */
ipcMain.handle('api:purchase:update', async (_event, id, input, password) => {
  try {
    const user = getCurrentUser();
    if (!user) return failure('UNAUTHENTICATED', 'Authentication is required');
    await authController.verifyPassword(user.id, password);
    return success(await purchaseInvoiceController.updatePurchaseInvoice(id, input, user.id));
  } catch (e) {
    console.error('[invoice-edit:purchase]', e);
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

ipcMain.handle('api:purchase:addItems', async (_event, invoiceId, items) => {
  try {
    const result = await purchaseInvoiceController.addItemsToPurchaseInvoice(invoiceId, items);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchase:get
 * Description: Read-only. Returns a single purchase invoice row.
 */
ipcMain.handle('api:purchase:get', async (_event, id) => {
  try {
    const result = await purchaseInvoiceController.getPurchaseInvoice(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchase:getDetails
 * Description: Returns enriched purchase invoice with supplier, items, payments, financial summary.
 */
ipcMain.handle('api:purchase:getDetails', async (_event, id) => {
  try {
    const result = await purchaseInvoiceController.getPurchaseInvoiceDetails(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchase:list
 * Description: Returns paginated, filtered purchase invoices.
 */
ipcMain.handle('api:purchase:list', async (_event, filters, pagination) => {
  try {
    const result = await purchaseInvoiceController.listPurchaseInvoices(filters, pagination);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchase:getAll
 * Description: Read-only. Returns all purchase invoices (legacy).
 */
ipcMain.handle('api:purchase:getAll', async (_event) => {
  try {
    const result = await purchaseInvoiceController.getAllPurchaseInvoices();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchase:cancel
 * Description: Atomically cancels a purchase invoice: verifies no stock consumed, reverses payments, restores batches and supplier balance.
 */
ipcMain.handle('api:purchase:cancel', async (_event, id, reason) => {
  try {
    const result = await purchaseInvoiceController.cancelPurchaseInvoice(id, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchase:deleteDraft
 * Description: Hard-deletes a draft invoice only if it has no payments or stock batches.
 */
ipcMain.handle('api:purchase:deleteDraft', async (_event, id) => {
  try {
    const result = await purchaseInvoiceController.deleteDraftPurchaseInvoice(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchase:getSalesDetails
 * Description: Returns sales activity on batches from a purchase invoice.
 */
ipcMain.handle('api:purchase:getSalesDetails', async (_event, id) => {
  try {
    const result = await purchaseInvoiceController.getPurchaseInvoiceSalesDetails(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchase:getConsignmentSummary
 * Description: Returns authoritative sales and remaining stock summary for consignment invoice.
 */
ipcMain.handle('api:purchase:getConsignmentSummary', async (_event, id) => {
  try {
    const result = await purchaseInvoiceController.getConsignmentSummary(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchase:previewConsignmentClosing
 * Description: Validates inputs and recalculates sales without committing.
 */
ipcMain.handle('api:purchase:previewConsignmentClosing', async (_event, id, input) => {
  try {
    const result = await purchaseInvoiceController.previewConsignmentClosing(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchase:closeCommission
 * Description: Closes a consignment invoice, settles supplier share, adjusts remaining stock safely.
 */
ipcMain.handle('api:purchase:closeCommission', async (_event, id, input) => {
  try {
    const result = await purchaseInvoiceController.closeCommission(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchase:getConsignmentSettlement
 * Description: Retrieves a settlement and its items.
 */
ipcMain.handle('api:purchase:getConsignmentSettlement', async (_event, id) => {
  try {
    const result = await purchaseInvoiceController.getConsignmentSettlement(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchase:reverseConsignmentSettlement
 * Description: Reverses a consignment settlement atomically.
 */
ipcMain.handle('api:purchase:reverseConsignmentSettlement', async (_event, id, reason) => {
  try {
    const result = await purchaseInvoiceController.reverseCommissionSettlement(id, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchase:recordPayment
 * Description: Alias for api:payment:recordPurchasePayment to satisfy unified API.
 */
ipcMain.handle('api:purchase:recordPayment', async (_event, input) => {
  try {
    const result = await paymentController.recordPurchasePayment(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchase:reversePayment
 * Description: Alias for api:payment:reversePurchasePayment to satisfy unified API.
 */
ipcMain.handle('api:purchase:reversePayment', async (_event, paymentId, reason) => {
  try {
    const result = await paymentController.reversePurchasePayment(paymentId, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchase:recordPaymentRefund
 * Description: Correction that REDUCES the paid amount on a purchase invoice.
 * Money returns IN to the selected cashbox; supplier balance is increased by the delta.
 * Handles overpayment corrections, supplier partial refunds, and data-entry mistakes.
 */
ipcMain.handle('api:purchase:recordPaymentRefund', async (_event, input) => {
  try {
    if (!getCurrentUser()) return failure('UNAUTHENTICATED', 'Authentication is required');
    const result = await paymentController.recordPurchasePaymentRefund(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Backup and Restore endpoints
 */
ipcMain.handle('api:system:backup', async (_event, destinationPath) => {
  try {
    if (!getCurrentUser()) return failure('UNAUTHENTICATED', 'Authentication is required');
    const result = await backupController.createBackup(destinationPath);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

ipcMain.handle('api:system:restore', async (_event, sourcePath) => {
  try {
    if (!getCurrentUser()) return failure('UNAUTHENTICATED', 'Authentication is required');

    // 1. Validate the selected backup and create an emergency snapshot before closing database connections
    const prepared = await backupController.prepareRestore(sourcePath);

    // 2. Close active sqlite3 connections (both legacy sqlite3 manager and Knex)
    try {
      const legacyDb = require(path.join(__dirname, '../../src/database/databaseManager.js'));
      if (legacyDb && typeof legacyDb.close === 'function') {
        await legacyDb.close();
      }
    } catch (err) {
      console.warn('Failed to close legacy database manager before restore:', err);
    }

    const { closeDatabase, initDatabase } = await import('../../src/main/database/dbmanager');
    await closeDatabase();

    // 3. Apply the restore
    try {
      const result = await backupController.applyRestore(prepared.sourcePath);
      // Restart application after a short delay so the IPC call completes
      setTimeout(() => {
        app.relaunch();
        app.exit(0);
      }, 500);
      return success({ ...result, emergencyBackupPath: prepared.emergencyBackupPath });
    } catch (restoreError) {
      // If restore failed to apply, restore the emergency backup and re-initialize database
      try {
        await backupController.applyRestore(prepared.emergencyBackupPath);
      } catch (recoverError) {
        console.error('Failed to recover emergency backup:', recoverError);
      }
      try {
        await initDatabase();
      } catch (reInitError) {
        console.error('Failed to re-initialize database:', reInitError);
      }
      throw restoreError;
    }
  } catch (e: any) {
    console.error('Database restore failed:', e);
    return failure(e.code || 'RESTORE_FAILED', e.message || 'فشلت عملية استعادة قاعدة البيانات', e.details);
  }
});

ipcMain.handle('api:system:getAutoBackupConfig', async () => {
  try {
    if (!getCurrentUser()) return failure('UNAUTHENTICATED', 'Authentication is required');
    const result = await backupController.getAutoBackupConfig();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

ipcMain.handle('api:system:setAutoBackupConfig', async (_event, input) => {
  try {
    if (!getCurrentUser()) return failure('UNAUTHENTICATED', 'Authentication is required');
    const result = await backupController.setAutoBackupConfig(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});



ipcMain.handle('api:system:saveCurrentPageAsPdf', async (event, input = {}) => {
  try {
    if (!getCurrentUser()) return failure('UNAUTHENTICATED', 'Authentication is required');
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return failure('PRINT_FAILED', 'تعذر الوصول إلى نافذة المستند');

    const rawName = String(input?.fileName || 'document').trim() || 'document';
    const safeName = rawName.replace(/[\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').slice(0, 120);
    const result = await dialog.showSaveDialog(window, {
      title: 'حفظ المستند بصيغة PDF',
      defaultPath: `${safeName}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (result.canceled || !result.filePath) return success({ canceled: true, path: null });

    const pdf = await window.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      landscape: false,
      margins: { top: 0.35, bottom: 0.35, left: 0.35, right: 0.35 },
      preferCSSPageSize: true,
    });
    await writeFile(result.filePath, pdf);
    return success({ canceled: false, path: result.filePath });
  } catch (e) {
    return failure(e.code || 'PRINT_FAILED', e.message || 'تعذر حفظ ملف PDF', e.details);
  }
});

ipcMain.handle('api:system:selectDirectory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return success({ canceled: result.canceled, path: result.canceled ? null : result.filePaths[0] });
});

ipcMain.handle('api:system:selectSaveFile', async () => {
  const result = await dialog.showSaveDialog({
    title: 'Select Backup Location',
    defaultPath: `farmer-market-backup-${new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0]}.db`,
    filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite'] }]
  });
  return success({ canceled: result.canceled, path: result.canceled ? null : result.filePath });
});

ipcMain.handle('api:system:selectOpenFile', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select Backup File to Restore',
    properties: ['openFile'],
    filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite'] }]
  });
  return success({ canceled: result.canceled, path: result.canceled ? null : result.filePaths[0] });
});/**
 * Endpoint: api:saleInvoice:createSaleProcess
 * Description: Atomically creates a sale invoice with items, stock deductions, customer balance, and optional payment.
 */
ipcMain.handle('api:saleInvoice:createSaleProcess', async (_event, input) => {
  try {
    const result = await saleInvoiceController.createSaleProcess(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoice:getSaleInvoice
 * Description: Read-only. Returns a single sale invoice row.
 */
ipcMain.handle('api:saleInvoice:updateSaleInvoice', async (_event, id, input, password) => {
  try {
    const user = getCurrentUser();
    if (!user) return failure('UNAUTHENTICATED', 'Authentication is required');
    await authController.verifyPassword(user.id, password);
    return success(await saleInvoiceController.updateSaleInvoice(id, input, user.id));
  } catch (e) {
    console.error('[invoice-edit:sale]', e);
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

ipcMain.handle('api:saleInvoice:getSaleInvoice', async (_event, id) => {
  try {
    const result = await saleInvoiceController.getSaleInvoice(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoice:getSaleInvoiceDetails
 * Description: Returns enriched sale invoice with customer, items, payments, financial summary.
 */
ipcMain.handle('api:saleInvoice:getSaleInvoiceDetails', async (_event, id) => {
  try {
    const result = await saleInvoiceController.getSaleInvoiceDetails(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoice:listSaleInvoices
 * Description: Returns paginated, filtered sale invoices.
 */
ipcMain.handle('api:saleInvoice:listSaleInvoices', async (_event, filters, pagination) => {
  try {
    const result = await saleInvoiceController.listSaleInvoices(filters, pagination);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoice:getAllSaleInvoices
 * Description: Read-only. Returns all sale invoices (legacy).
 */
ipcMain.handle('api:saleInvoice:getAllSaleInvoices', async (_event) => {
  try {
    const result = await saleInvoiceController.getAllSaleInvoices();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoice:getFullSaleInvoice
 * Description: Returns full enriched sale invoice (alias for getSaleInvoiceDetails).
 */
ipcMain.handle('api:saleInvoice:getFullSaleInvoice', async (_event, id) => {
  try {
    const result = await saleInvoiceController.getFullSaleInvoice(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoice:cancelSaleInvoice
 * Description: Atomically cancels a sale invoice: reverses payments, restores stock, reduces customer balance.
 */
ipcMain.handle('api:saleInvoice:cancelSaleInvoice', async (_event, id, reason) => {
  try {
    const result = await saleInvoiceController.cancelSaleInvoice(id, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoice:deleteDraftSaleInvoice
 * Description: Hard-deletes a draft sale invoice only if it has no payments.
 */
ipcMain.handle('api:saleInvoice:deleteDraftSaleInvoice', async (_event, id) => {
  try {
    const result = await saleInvoiceController.deleteDraftSaleInvoice(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoice:getAvailableBatches
 * Description: Returns active stock batches with remaining quantity > 0 for a given product.
 */
ipcMain.handle('api:saleInvoice:getAvailableBatches', async (_event, productId) => {
  try {
    const result = await saleInvoiceController.getAvailableBatches(productId);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoiceItem:getSaleInvoiceItem
 * Description: Executes getSaleInvoiceItem on saleInvoiceItemController.
 * Usage: Invoked by frontend to perform getSaleInvoiceItem operation.
 */
ipcMain.handle('api:saleInvoiceItem:getSaleInvoiceItem', async (_event, id) => {
  try {
    const result = await saleInvoiceItemController.getSaleInvoiceItem(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoiceItem:getAllSaleInvoiceItems
 * Description: Executes getAllSaleInvoiceItems on saleInvoiceItemController.
 * Usage: Invoked by frontend to perform getAllSaleInvoiceItems operation.
 */
ipcMain.handle('api:saleInvoiceItem:getAllSaleInvoiceItems', async (_event) => {
  try {
    const result = await saleInvoiceItemController.getAllSaleInvoiceItems();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleType:createSaleType
 * Description: Executes createSaleType on saleTypeController.
 * Usage: Invoked by frontend to perform createSaleType operation.
 */
ipcMain.handle('api:saleType:createSaleType', async (_event, input) => {
  try {
    const result = await saleTypeController.createSaleType(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleType:getSaleType
 * Description: Executes getSaleType on saleTypeController.
 * Usage: Invoked by frontend to perform getSaleType operation.
 */
ipcMain.handle('api:saleType:getSaleType', async (_event, id) => {
  try {
    const result = await saleTypeController.getSaleType(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleType:getAllSaleTypes
 * Description: Executes getAllSaleTypes on saleTypeController.
 * Usage: Invoked by frontend to perform getAllSaleTypes operation.
 */
ipcMain.handle('api:saleType:getAllSaleTypes', async (_event) => {
  try {
    const result = await saleTypeController.getAllSaleTypes();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleType:updateSaleType
 * Description: Executes updateSaleType on saleTypeController.
 * Usage: Invoked by frontend to perform updateSaleType operation.
 */
ipcMain.handle('api:saleType:updateSaleType', async (_event, id, input) => {
  try {
    const result = await saleTypeController.updateSaleType(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleType:deleteSaleType
 * Description: Executes deleteSaleType on saleTypeController.
 * Usage: Invoked by frontend to perform deleteSaleType operation.
 */
ipcMain.handle('api:saleType:deleteSaleType', async (_event, id) => {
  try {
    const result = await saleTypeController.deleteSaleType(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:setting:createSetting
 * Description: Executes createSetting on settingController.
 * Usage: Invoked by frontend to perform createSetting operation.
 */
ipcMain.handle('api:setting:createSetting', async (_event, input) => {
  try {
    const result = await settingController.createSetting(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:setting:getSetting
 * Description: Executes getSetting on settingController.
 * Usage: Invoked by frontend to perform getSetting operation.
 */
ipcMain.handle('api:setting:getSetting', async (_event, id) => {
  try {
    const result = await settingController.getSetting(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:setting:getAllSettings
 * Description: Executes getAllSettings on settingController.
 * Usage: Invoked by frontend to perform getAllSettings operation.
 */
ipcMain.handle('api:setting:getAllSettings', async (_event) => {
  try {
    const result = await settingController.getAllSettings();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:setting:updateSetting
 * Description: Executes updateSetting on settingController.
 * Usage: Invoked by frontend to perform updateSetting operation.
 */
ipcMain.handle('api:setting:updateSetting', async (_event, id, input) => {
  try {
    const result = await settingController.updateSetting(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:setting:deleteSetting
 * Description: Executes deleteSetting on settingController.
 * Usage: Invoked by frontend to perform deleteSetting operation.
 */
ipcMain.handle('api:setting:deleteSetting', async (_event, id) => {
  try {
    const result = await settingController.deleteSetting(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockAdjustment:createStockAdjustment
 * Description: Executes createStockAdjustment on stockAdjustmentController.
 * Usage: Invoked by frontend to perform createStockAdjustment operation.
 */
ipcMain.handle('api:stockAdjustment:createStockAdjustment', async (_event, input) => {
  try {
    const result = await stockAdjustmentController.createStockAdjustment(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockAdjustment:getStockAdjustment
 * Description: Executes getStockAdjustment on stockAdjustmentController.
 * Usage: Invoked by frontend to perform getStockAdjustment operation.
 */
ipcMain.handle('api:stockAdjustment:getStockAdjustment', async (_event, id) => {
  try {
    const result = await stockAdjustmentController.getStockAdjustment(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockAdjustment:getAllStockAdjustments
 * Description: Executes getAllStockAdjustments on stockAdjustmentController.
 * Usage: Invoked by frontend to perform getAllStockAdjustments operation.
 */
ipcMain.handle('api:stockAdjustment:getAllStockAdjustments', async (_event) => {
  try {
    const result = await stockAdjustmentController.getAllStockAdjustments();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockAdjustment:updateStockAdjustment
 * Description: Executes updateStockAdjustment on stockAdjustmentController.
 * Usage: Invoked by frontend to perform updateStockAdjustment operation.
 */
ipcMain.handle('api:stockAdjustment:updateStockAdjustment', async (_event, id, input) => {
  try {
    const result = await stockAdjustmentController.updateStockAdjustment(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockAdjustment:deleteStockAdjustment
 * Description: Executes deleteStockAdjustment on stockAdjustmentController.
 * Usage: Invoked by frontend to perform deleteStockAdjustment operation.
 */
ipcMain.handle('api:stockAdjustment:deleteStockAdjustment', async (_event, id) => {
  try {
    const result = await stockAdjustmentController.deleteStockAdjustment(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockBatch:createStockBatch
 * Description: Executes createStockBatch on stockBatchController.
 * Usage: Invoked by frontend to perform createStockBatch operation.
 */
ipcMain.handle('api:stockBatch:createStockBatch', async (_event, input) => {
  try {
    const result = await stockBatchController.createStockBatch(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockBatch:getStockBatch
 * Description: Executes getStockBatch on stockBatchController.
 * Usage: Invoked by frontend to perform getStockBatch operation.
 */
ipcMain.handle('api:stockBatch:getStockBatch', async (_event, id) => {
  try {
    const result = await stockBatchController.getStockBatch(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockBatch:getAllStockBatchs
 * Description: Executes getAllStockBatchs on stockBatchController.
 * Usage: Invoked by frontend to perform getAllStockBatchs operation.
 */
ipcMain.handle('api:stockBatch:getAllStockBatchs', async (_event) => {
  try {
    const result = await stockBatchController.getAllStockBatchs();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockBatch:updateStockBatch
 * Description: Executes updateStockBatch on stockBatchController.
 * Usage: Invoked by frontend to perform updateStockBatch operation.
 */
ipcMain.handle('api:stockBatch:updateStockBatch', async (_event, id, input) => {
  try {
    const result = await stockBatchController.updateStockBatch(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockBatch:deleteStockBatch
 * Description: Executes deleteStockBatch on stockBatchController.
 * Usage: Invoked by frontend to perform deleteStockBatch operation.
 */
ipcMain.handle('api:stockBatch:deleteStockBatch', async (_event, id) => {
  try {
    const result = await stockBatchController.deleteStockBatch(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockBatch:getStockSummary
 * Description: Executes getStockSummary on stockBatchController.
 * Usage: Invoked by frontend to perform getStockSummary operation.
 */
ipcMain.handle('api:stockBatch:getStockSummary', async (_event) => {
  try {
    const result = await stockBatchController.getStockSummary();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockBatch:getInventoryItems
 * Description: Executes getInventoryItems on stockBatchController.
 * Usage: Invoked by frontend to perform getInventoryItems operation.
 */
ipcMain.handle('api:stockBatch:getInventoryItems', async (_event, pagination, limit = 10) => {
  try {
    const result = await stockBatchController.getInventoryItems(pagination, limit);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:supplier:createSupplier
 * Description: Executes createSupplier on supplierController.
 * Usage: Invoked by frontend to perform createSupplier operation.
 */
ipcMain.handle('api:supplier:createSupplier', async (_event, input) => {
  try {
    const result = await supplierController.createSupplier(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:supplier:getSupplier
 * Description: Executes getSupplier on supplierController.
 * Usage: Invoked by frontend to perform getSupplier operation.
 */
ipcMain.handle('api:supplier:getSupplier', async (_event, id) => {
  try {
    const result = await supplierController.getSupplier(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:supplier:getAllSuppliers
 * Description: Executes getAllSuppliers on supplierController.
 * Usage: Invoked by frontend to perform getAllSuppliers operation.
 */
ipcMain.handle('api:supplier:getAllSuppliers', async (_event) => {
  try {
    const result = await supplierController.getAllSuppliers();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:supplier:updateSupplier
 * Description: Executes updateSupplier on supplierController.
 * Usage: Invoked by frontend to perform updateSupplier operation.
 */
ipcMain.handle('api:supplier:updateSupplier', async (_event, id, input) => {
  try {
    const result = await supplierController.updateSupplier(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:supplier:deleteSupplier
 * Description: Executes deleteSupplier on supplierController.
 * Usage: Invoked by frontend to perform deleteSupplier operation.
 */
ipcMain.handle('api:supplier:deleteSupplier', async (_event, id) => {
  try {
    const result = await supplierController.deleteSupplier(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:supplier:getSupplierTransactions
 * Description: Executes getSupplierTransactions on supplierController.
 * Usage: Invoked by frontend to perform getSupplierTransactions operation.
 */
ipcMain.handle('api:supplier:getSupplierTransactions', async (_event, id) => {
  try {
    const result = await supplierController.getSupplierTransactions(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:transactionCategory:createTransactionCategory
 * Description: Executes createTransactionCategory on transactionCategoryController.
 * Usage: Invoked by frontend to perform createTransactionCategory operation.
 */
ipcMain.handle('api:transactionCategory:createTransactionCategory', async (_event, input) => {
  try {
    const result = await transactionCategoryController.createTransactionCategory(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:transactionCategory:getTransactionCategory
 * Description: Executes getTransactionCategory on transactionCategoryController.
 * Usage: Invoked by frontend to perform getTransactionCategory operation.
 */
ipcMain.handle('api:transactionCategory:getTransactionCategory', async (_event, id) => {
  try {
    const result = await transactionCategoryController.getTransactionCategory(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:transactionCategory:getAllTransactionCategorys
 * Description: Executes getAllTransactionCategorys on transactionCategoryController.
 * Usage: Invoked by frontend to perform getAllTransactionCategorys operation.
 */
ipcMain.handle('api:transactionCategory:getAllTransactionCategorys', async (_event) => {
  try {
    const result = await transactionCategoryController.getAllTransactionCategorys();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:transactionCategory:updateTransactionCategory
 * Description: Executes updateTransactionCategory on transactionCategoryController.
 * Usage: Invoked by frontend to perform updateTransactionCategory operation.
 */
ipcMain.handle('api:transactionCategory:updateTransactionCategory', async (_event, id, input) => {
  try {
    const result = await transactionCategoryController.updateTransactionCategory(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:transactionCategory:deleteTransactionCategory
 * Description: Executes deleteTransactionCategory on transactionCategoryController.
 * Usage: Invoked by frontend to perform deleteTransactionCategory operation.
 */
ipcMain.handle('api:transactionCategory:deleteTransactionCategory', async (_event, id) => {
  try {
    const result = await transactionCategoryController.deleteTransactionCategory(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:transaction:list
 * Description: Executes listFinancialTransactions on transactionController.
 */
ipcMain.handle('api:transaction:list', async (_event, filters, pagination) => {
  try {
    const result = await transactionController.listFinancialTransactions(filters, pagination);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:transaction:getDetails
 * Description: Executes getFinancialTransactionDetails on transactionController.
 */
ipcMain.handle('api:transaction:getDetails', async (_event, id) => {
  try {
    const result = await transactionController.getFinancialTransactionDetails(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:transaction:createFinancial
 * Description: Executes createFinancialTransaction on transactionController.
 */
ipcMain.handle('api:transaction:createFinancial', async (_event, input) => {
  try {
    const result = await transactionController.createFinancialTransaction(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:transaction:cancel
 * Description: Executes cancelFinancialTransaction on transactionController.
 */
ipcMain.handle('api:transaction:cancel', async (_event, id, reason) => {
  try {
    const result = await transactionController.cancelFinancialTransaction(id, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:transaction:getSummary
 * Description: Executes getFinancialTransactionsSummary on transactionController.
 */
ipcMain.handle('api:transaction:getSummary', async (_event, filters) => {
  try {
    const result = await transactionController.getFinancialTransactionsSummary(filters);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:user:createUser
 * Description: Executes createUser on userController.
 * Usage: Invoked by frontend to perform createUser operation.
 */
ipcMain.handle('api:user:createUser', async (_event, input) => {
  try {
    const result = await userController.createUser(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:user:getUser
 * Description: Executes getUser on userController.
 * Usage: Invoked by frontend to perform getUser operation.
 */
ipcMain.handle('api:user:getUser', async (_event, id) => {
  try {
    const result = await userController.getUser(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:user:getAllUsers
 * Description: Executes getAllUsers on userController.
 * Usage: Invoked by frontend to perform getAllUsers operation.
 */
ipcMain.handle('api:user:getAllUsers', async (_event) => {
  try {
    const result = await userController.getAllUsers();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:user:updateUser
 * Description: Executes updateUser on userController.
 * Usage: Invoked by frontend to perform updateUser operation.
 */
ipcMain.handle('api:user:updateUser', async (_event, id, input) => {
  try {
    const result = await userController.updateUser(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:user:deleteUser
 * Description: Executes deleteUser on userController.
 * Usage: Invoked by frontend to perform deleteUser operation.
 */
ipcMain.handle('api:user:deleteUser', async (_event, id) => {
  try {
    const result = await userController.deleteUser(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

// ─── Worker CRUD ──────────────────────────────────────────────────────────────

/**
 * Endpoint: api:worker:createWorker
 * Description: Creates a new worker/employee record.
 */
ipcMain.handle('api:worker:createWorker', async (_event, input) => {
  try {
    const result = await workerController.createWorker(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:worker:getWorker
 * Description: Returns a single worker by ID.
 */
ipcMain.handle('api:worker:getWorker', async (_event, id) => {
  try {
    const result = await workerController.getWorker(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:worker:getAllWorkers
 * Description: Returns all workers.
 */
ipcMain.handle('api:worker:getAllWorkers', async (_event) => {
  try {
    const result = await workerController.getAllWorkers();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:worker:updateWorker
 * Description: Partially updates a worker record.
 */
ipcMain.handle('api:worker:updateWorker', async (_event, id, input) => {
  try {
    const result = await workerController.updateWorker(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:worker:deleteWorker
 * Description: Hard-deletes a worker (blocked if they have payments).
 */
ipcMain.handle('api:worker:deleteWorker', async (_event, id) => {
  try {
    const result = await workerController.deleteWorker(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

// ─── Worker Payments ─────────────────────────────────────────────────────────

/**
 * Endpoint: api:worker:recordPayment
 * Description: Atomically records a cash payment to a worker:
 *   cashbox balance out, worker balance decremented, cashbox_transaction created.
 */
ipcMain.handle('api:worker:recordPayment', async (_event, input) => {
  try {
    const result = await workerController.recordWorkerPayment(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:worker:reversePayment
 * Description: Reverses a worker payment: cashbox balance restored, worker balance restored.
 */
ipcMain.handle('api:worker:reversePayment', async (_event, paymentId, reason) => {
  try {
    const result = await workerController.reverseWorkerPayment(paymentId, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:worker:getPayments
 * Description: Returns all payments for a given worker.
 */
ipcMain.handle('api:worker:getPayments', async (_event, workerId) => {
  try {
    const result = await workerController.getWorkerPayments(workerId);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});
