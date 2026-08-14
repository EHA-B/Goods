'use strict';
/**
 * reportController.js — Profit & Loss (Gains & Losses) Report
 *
 * Revenue sources:
 *  1. Gross sales revenue   — sale_invoice_items.line_total (includes consignment sales)
 *  2. General income        — transactions table (direction = 'income', status = 'active')
 *
 * Expense sources:
 *  3. Cost of goods sold    — sale_invoice_items.cost_price × quantity
 *  4. Supplier payouts      — payments linked to consignment_settlements (the supplier's
 *                             share paid out at settlement). Commission is NOT added
 *                             separately — it emerges as (gross sales − supplier payout).
 *  5. General expenses      — transactions table (direction = 'expense', status = 'active')
 *                             This covers wages, overheads, AND spoilage write-offs
 *                             (recorded by closeCommission when policy = 'spoilage').
 *
 * All figures are returned grouped by currency (native) plus a base-currency total.
 */

const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

function n(v) { const x = Number(v ?? 0); return isFinite(x) ? Math.round(x * 100) / 100 : 0; }
function all(db, sql, params = []) {
    return new Promise((resolve, reject) =>
        db.all(sql, params, (e, rows) => e ? reject(e) : resolve(rows || []))
    );
}
function get(db, sql, params = []) {
    return new Promise((resolve, reject) =>
        db.get(sql, params, (e, row) => e ? reject(e) : resolve(row || null))
    );
}

class ReportController {

    /**
     * getProfitLossReport — Returns a full Profit & Loss report for the given date range.
     *
     * @param {object} filters
     * @param {string} [filters.date_from]  YYYY-MM-DD  (defaults to start of current month)
     * @param {string} [filters.date_to]    YYYY-MM-DD  (defaults to today)
     * @returns {Promise<object>}
     */
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
                COALESCE(SUM(p.amount - COALESCE(cs.spoilage_value, 0)), 0)      AS payout_native,
                COALESCE(SUM(p.amount_base - COALESCE(cs.spoilage_value * p.exchange_rate, 0)), 0) AS payout_base
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
        const expenseRows = await all(db, `
            SELECT
                COALESCE(c.currency, 'non_cash') AS currency,
                COALESCE(SUM(t.amount), 0)       AS expense_native,
                tc.name                          AS category_name,
                tc.id                            AS category_id,
                COUNT(*)                         AS count
            FROM transactions t
            LEFT JOIN cashboxes c ON c.id = t.cashbox_id
            LEFT JOIN transaction_categories tc ON tc.id = t.category_id
            WHERE t.direction = 'expense'
              AND t.status = 'active'
              AND t.transaction_date >= ?
              AND t.transaction_date <= ?
            GROUP BY tc.id, COALESCE(c.currency, 'non_cash')
            ORDER BY expense_native DESC
        `, [dateFrom, dateTo]);

        // ────────────────────────────────────────────────────────────────────
        // 6. GENERAL INCOME (non-sale income transactions)
        // ────────────────────────────────────────────────────────────────────
        const incomeRows = await all(db, `
            SELECT
                COALESCE(c.currency, 'non_cash') AS currency,
                COALESCE(SUM(t.amount), 0)       AS income_native,
                tc.name                          AS category_name,
                tc.id                            AS category_id,
                COUNT(*)                         AS count
            FROM transactions t
            LEFT JOIN cashboxes c ON c.id = t.cashbox_id
            LEFT JOIN transaction_categories tc ON tc.id = t.category_id
            WHERE t.direction = 'income'
              AND t.status = 'active'
              AND t.transaction_date >= ?
              AND t.transaction_date <= ?
            GROUP BY tc.id, COALESCE(c.currency, 'non_cash')
            ORDER BY income_native DESC
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
        const totalRevenueBase             = revenueRows.reduce((s, r) => s + n(r.revenue_base), 0);
        const totalCogsBase                = n(cogsRow?.cogs_base);
        const totalGrossProfitBase         = n(grossProfitRow?.gross_profit_base);
        const totalConsignmentPayoutBase   = consignmentPayoutRows.reduce((s, r) => s + n(r.payout_base), 0);
        const totalExpensesNative          = expenseRows.reduce((s, r) => s + n(r.expense_native), 0);
        const totalIncomeNative            = incomeRows.reduce((s, r) => s + n(r.income_native), 0);

        // Net profit = gross profit from sales + other income − other expenses.
        // Consignment commission is already embedded in grossProfitBase because:
        //   gross_profit = sale_revenue_base − cogs_base
        // and the COGS for consignment batches is the purchase_price_base per unit.
        const netProfitBase = Math.round(
            (totalGrossProfitBase + totalIncomeNative - totalExpensesNative) * 100
        ) / 100;

        return {
            period: { date_from: dateFrom, date_to: dateTo },

            revenue: {
                by_currency: revenueRows.map(r => ({
                    currency:    r.currency,
                    amount:      n(r.revenue_native),
                    amount_base: n(r.revenue_base),
                })),
                total_base: n(totalRevenueBase),
            },

            cogs: {
                total_base: n(totalCogsBase),
            },

            gross_profit: {
                total_base: n(totalGrossProfitBase),
            },

            consignment_payouts: {
                by_currency: consignmentPayoutRows.map(r => ({
                    currency:    r.currency,
                    amount:      n(r.payout_native),
                    amount_base: n(r.payout_base),
                })),
                total_base: n(totalConsignmentPayoutBase),
            },

            expenses: {
                by_category: expenseRows.map(r => ({
                    category_id: r.category_id,
                    category:    r.category_name || 'غير مصنف',
                    currency:    r.currency,
                    amount:      n(r.expense_native),
                    count:       r.count,
                })),
                total_native: n(totalExpensesNative),
            },

            other_income: {
                by_category: incomeRows.map(r => ({
                    category_id: r.category_id,
                    category:    r.category_name || 'غير مصنف',
                    currency:    r.currency,
                    amount:      n(r.income_native),
                    count:       r.count,
                })),
                total_native: n(totalIncomeNative),
            },

            spoilage_summary: spoilageRows.map(r => ({
                currency:         r.currency,
                total_units:      n(r.total_spoilage_qty),
                settlement_count: r.settlement_count,
            })),

            sales_breakdown: salesBreakdownRows.map(r => ({
                invoice_type:  r.invoice_type,
                currency:      r.currency,
                revenue:       n(r.revenue_native),
                revenue_base:  n(r.revenue_base),
                profit_base:   n(r.profit_base),
                invoice_count: r.invoice_count,
            })),

            summary: {
                total_revenue_base:              n(totalRevenueBase),
                total_cogs_base:                 n(totalCogsBase),
                gross_profit_base:               n(totalGrossProfitBase),
                total_consignment_payout_base:   n(totalConsignmentPayoutBase),
                total_expenses_native:           n(totalExpensesNative),
                total_other_income_native:       n(totalIncomeNative),
                net_profit_base:                 n(netProfitBase),
                is_profit:                       netProfitBase >= 0,
            },
        };
    }
}

module.exports = new ReportController();
