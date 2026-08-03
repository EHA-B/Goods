/**
 * invoiceUtils.js — Shared financial and validation utilities for Sales and Purchases modules.
 *
 * All functions are pure helpers — they do NOT own DB connections or transactions.
 * Controllers own the transaction lifecycle and pass the `db` handle where needed.
 */

'use strict';

// ─── Amount Validation ────────────────────────────────────────────────────────

/**
 * Validate that a value is a positive finite number.
 * @param {*} value
 * @param {string} fieldName
 * @returns {number} normalized number
 */
function validatePositiveAmount(value, fieldName = 'amount') {
    const n = Number(value);
    if (!isFinite(n) || n <= 0) {
        throw { code: 'VALIDATION_ERROR', message: `${fieldName} يجب أن يكون رقمًا موجبًا` };
    }
    return Math.round(n * 100) / 100;
}

/**
 * Normalize a decimal amount (round to 2 decimal places).
 * @param {*} value
 * @returns {number}
 */
function normalizeAmount(value) {
    const n = Number(value ?? 0);
    return isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

// ─── Date Validation ──────────────────────────────────────────────────────────

/**
 * Validate and return a YYYY-MM-DD date string.
 * If not provided, returns today.
 * @param {string|null|undefined} dateStr
 * @param {string} fieldName
 * @returns {string} YYYY-MM-DD
 */
function validateDate(dateStr, fieldName = 'date') {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) {
        throw { code: 'VALIDATION_ERROR', message: `${fieldName} يجب أن يكون بصيغة YYYY-MM-DD` };
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
        throw { code: 'VALIDATION_ERROR', message: `${fieldName}: تاريخ غير صالح: ${dateStr}` };
    }
    return dateStr;
}

// ─── Invoice Totals Calculator ────────────────────────────────────────────────

/**
 * Calculate invoice totals from items and an optional discount.
 *
 * Each item must have: { product_id, quantity, price }
 * (price = purchase_price for purchases, sale_price for sales)
 *
 * @param {Array<{product_id: number, quantity: number, price: number}>} items
 * @param {number} discountAmount
 * @returns {{ normalizedItems, subtotal, discountAmount, totalAmount }}
 */
function calculateInvoiceTotals(items, discountAmount = 0) {
    if (!Array.isArray(items) || items.length === 0) {
        throw { code: 'VALIDATION_ERROR', message: 'يجب أن تحتوي الفاتورة على صنف واحد على الأقل' };
    }

    const discount = normalizeAmount(discountAmount);
    if (discount < 0) {
        throw { code: 'VALIDATION_ERROR', message: 'الخصم لا يمكن أن يكون سالبًا' };
    }

    const normalizedItems = items.map((item, index) => {
        const qty = Number(item.quantity ?? 0);
        const price = Number(item.price ?? item.purchase_price ?? item.sale_price ?? 0);

        if (!item.product_id) {
            throw { code: 'VALIDATION_ERROR', message: `الصنف رقم ${index + 1}: product_id مطلوب` };
        }
        if (!isFinite(qty) || qty <= 0) {
            throw { code: 'VALIDATION_ERROR', message: `الصنف رقم ${index + 1}: الكمية يجب أن تكون موجبة` };
        }
        if (!isFinite(price) || price < 0) {
            throw { code: 'VALIDATION_ERROR', message: `الصنف رقم ${index + 1}: السعر لا يمكن أن يكون سالبًا` };
        }

        const lineTotal = Math.round(qty * price * 100) / 100;
        return { ...item, quantity: qty, price, lineTotal };
    });

    const subtotal = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const subtotalRounded = Math.round(subtotal * 100) / 100;

    const totalAmount = Math.max(0, Math.round((subtotalRounded - discount) * 100) / 100);

    return {
        normalizedItems,
        subtotal: subtotalRounded,
        discountAmount: discount,
        totalAmount
    };
}

// ─── Payment State Calculator ─────────────────────────────────────────────────

/**
 * Calculate invoice payment status from totals.
 *
 * @param {number} totalAmount
 * @param {number} paidAmount
 * @param {boolean} isCancelled
 * @param {boolean} isDraft
 * @returns {{ remainingAmount: number, status: string }}
 */
function calculatePaymentState(totalAmount, paidAmount, isCancelled = false, isDraft = false) {
    const total = normalizeAmount(totalAmount);
    const paid  = normalizeAmount(paidAmount);

    if (isCancelled) return { remainingAmount: 0, status: 'cancelled' };
    if (isDraft)     return { remainingAmount: Math.max(0, total - paid), status: 'draft' };

    if (total === 0) return { remainingAmount: 0, status: 'confirmed' };

    const remaining = Math.max(0, Math.round((total - paid) * 100) / 100);

    if (paid <= 0)        return { remainingAmount: remaining, status: 'confirmed' };
    if (paid >= total)    return { remainingAmount: 0,         status: 'paid' };
    return               { remainingAmount: remaining,        status: 'partially_paid' };
}

// ─── Invoice Number Generator ─────────────────────────────────────────────────

/**
 * Generate the next sequential invoice number inside an existing transaction.
 * Uses SELECT MAX to determine the next number — must be called within the open transaction.
 *
 * @param {object} db  — raw sqlite3 DB handle
 * @param {string} prefix — e.g. 'PUR' or 'SAL'
 * @param {string} tableName — table to count from
 * @param {string} [numberColumn] — column holding the invoice number (default: 'invoice_number')
 * @returns {Promise<string>}
 */
async function generateInvoiceNumber(db, prefix, tableName, numberColumn = 'invoice_number') {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT COUNT(*) as cnt FROM ${tableName}`,
            [],
            (err, row) => {
                if (err) return reject(err);
                const next = (row?.cnt ?? 0) + 1;
                resolve(`${prefix}-${String(next).padStart(5, '0')}`);
            }
        );
    });
}

// ─── Activity Logger ──────────────────────────────────────────────────────────

/**
 * Insert an activity log record inside an existing transaction.
 * Errors are swallowed — logging must never break the business transaction.
 *
 * @param {object} db
 * @param {string} action
 * @param {string} tableName
 * @param {number} recordId
 * @param {object} [data]
 */
async function logActivity(db, action, tableName, recordId, data = {}) {
    try {
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO activity_logs (user_id, action, table_name, record_id, old_data, new_data, created_at, updated_at)
                 VALUES (NULL, ?, ?, ?, NULL, ?, datetime('now'), datetime('now'))`,
                [action, tableName, recordId, JSON.stringify(data)],
                function (err) {
                    if (err) return reject(err);
                    resolve(this.lastID);
                }
            );
        });
    } catch (_err) {
        // Activity log errors must never abort the business transaction
    }
}

// ─── DB Promise Helpers ───────────────────────────────────────────────────────

function dbRun(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

function dbGet(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row ?? null);
        });
    });
}

function dbAll(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows ?? []);
        });
    });
}

module.exports = {
    validatePositiveAmount,
    normalizeAmount,
    validateDate,
    calculateInvoiceTotals,
    calculatePaymentState,
    generateInvoiceNumber,
    logActivity,
    dbRun,
    dbGet,
    dbAll,
};
