const path = require('node:path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

function all(db, sql, params = []) { return new Promise((resolve, reject) => db.all(sql, params, (e, rows) => e ? reject(e) : resolve(rows || []))); }
function get(db, sql, params = []) { return new Promise((resolve, reject) => db.get(sql, params, (e, row) => e ? reject(e) : resolve(row || {}))); }
function number(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

class DashboardController {
  async getDashboard() {
    const db = await dbmanager.init();
    const [sales, purchases, profit, counts, balances, stock, recentSales, recentPurchases, recentTransactions, alerts, trend, topProducts] = await Promise.all([
      get(db, `SELECT COALESCE(SUM(CASE WHEN date(invoice_date)=date('now') THEN total ELSE 0 END),0) today, COALESCE(SUM(CASE WHEN strftime('%Y-%m',invoice_date)=strftime('%Y-%m','now') THEN total ELSE 0 END),0) month, COUNT(CASE WHEN date(invoice_date)=date('now') THEN 1 END) today_count FROM sale_invoices WHERE status <> 'cancelled'`),
      get(db, `SELECT COALESCE(SUM(CASE WHEN date(invoice_date)=date('now') THEN total ELSE 0 END),0) today, COALESCE(SUM(CASE WHEN strftime('%Y-%m',invoice_date)=strftime('%Y-%m','now') THEN total ELSE 0 END),0) month, COUNT(CASE WHEN date(invoice_date)=date('now') THEN 1 END) today_count FROM purchase_invoices WHERE status <> 'cancelled'`),
      get(db, `SELECT COALESCE(SUM(CASE WHEN date(si.invoice_date)=date('now') THEN sii.profit ELSE 0 END),0) today, COALESCE(SUM(CASE WHEN strftime('%Y-%m',si.invoice_date)=strftime('%Y-%m','now') THEN sii.profit ELSE 0 END),0) month FROM sale_invoice_items sii JOIN sale_invoices si ON si.id=sii.sale_invoice_id WHERE si.status <> 'cancelled'`),
      get(db, `SELECT (SELECT COUNT(*) FROM products WHERE COALESCE(isActive,1)=1) products, (SELECT COUNT(*) FROM customers WHERE COALESCE(isActive,1)=1) customers, (SELECT COUNT(*) FROM suppliers WHERE COALESCE(isActive,1)=1) suppliers`),
      get(db, `SELECT COALESCE(SUM(CASE WHEN COALESCE(isActive,1)=1 THEN balance ELSE 0 END),0) cash, COUNT(CASE WHEN COALESCE(isActive,1)=1 THEN 1 END) cashboxes, COALESCE((SELECT SUM(CASE WHEN balance>0 THEN balance ELSE 0 END) FROM customers),0) customer_debt, COALESCE((SELECT SUM(CASE WHEN balance>0 THEN balance ELSE 0 END) FROM suppliers),0) supplier_debt FROM cashboxes`),
      get(db, `SELECT COALESCE(SUM(sb.remaining_quantity * sb.purchase_price),0) value, COUNT(DISTINCT CASE WHEN sb.remaining_quantity <= 5 THEN sb.product_id END) low_count, COUNT(DISTINCT CASE WHEN sb.remaining_quantity <= 0 THEN sb.product_id END) out_count FROM stock_batches sb WHERE COALESCE(sb.isActive,1)=1`),
      all(db, `SELECT si.id, si.invoice_number, si.invoice_date, si.total, si.status, COALESCE(c.name,'بيع نقدي') customer_name FROM sale_invoices si LEFT JOIN customers c ON c.id=si.customer_id ORDER BY si.id DESC LIMIT 6`),
      all(db, `SELECT pi.id, pi.invoice_number, pi.invoice_date, pi.total, pi.status, s.name supplier_name FROM purchase_invoices pi LEFT JOIN suppliers s ON s.id=pi.supplier_id ORDER BY pi.id DESC LIMIT 6`),
      all(db, `SELECT t.id, t.transaction_date, t.amount, t.direction AS type, t.description, tc.name category_name, c.name cashbox_name FROM transactions t LEFT JOIN transaction_categories tc ON tc.id=t.category_id LEFT JOIN cashboxes c ON c.id=t.cashbox_id WHERE COALESCE(t.status,'active') <> 'cancelled' ORDER BY t.id DESC LIMIT 8`),
      all(db, `SELECT p.id, p.name, COALESCE(SUM(sb.remaining_quantity),0) quantity FROM products p LEFT JOIN stock_batches sb ON sb.product_id=p.id AND COALESCE(sb.isActive,1)=1 GROUP BY p.id,p.name HAVING quantity <= 5 ORDER BY quantity ASC LIMIT 8`),
      all(db, `WITH RECURSIVE days(d) AS (SELECT date('now','-29 day') UNION ALL SELECT date(d,'+1 day') FROM days WHERE d < date('now')) SELECT days.d date, COALESCE((SELECT SUM(total) FROM sale_invoices WHERE status <> 'cancelled' AND date(invoice_date)=days.d),0) sales, COALESCE((SELECT SUM(total) FROM purchase_invoices WHERE status <> 'cancelled' AND date(invoice_date)=days.d),0) purchases, COALESCE((SELECT SUM(sii.profit) FROM sale_invoice_items sii JOIN sale_invoices si ON si.id=sii.sale_invoice_id WHERE si.status <> 'cancelled' AND date(si.invoice_date)=days.d),0) profit FROM days`),
      all(db, `SELECT p.id, p.name, COALESCE(SUM(sii.quantity),0) quantity, COALESCE(SUM(sii.line_total),0) revenue FROM sale_invoice_items sii JOIN sale_invoices si ON si.id=sii.sale_invoice_id JOIN stock_batches sb ON sb.id=sii.stock_batch_id JOIN products p ON p.id=sb.product_id WHERE si.status <> 'cancelled' GROUP BY p.id,p.name ORDER BY quantity DESC LIMIT 6`),
    ]);
    return {
      summary: {
        salesToday:number(sales.today), salesMonth:number(sales.month), salesTodayCount:number(sales.today_count),
        purchasesToday:number(purchases.today), purchasesMonth:number(purchases.month), purchasesTodayCount:number(purchases.today_count),
        profitToday:number(profit.today), profitMonth:number(profit.month), cashBalance:number(balances.cash), cashboxesCount:number(balances.cashboxes),
        customerDebt:number(balances.customer_debt), supplierDebt:number(balances.supplier_debt), inventoryValue:number(stock.value),
        lowStockCount:number(stock.low_count), outOfStockCount:number(stock.out_count), productsCount:number(counts.products), customersCount:number(counts.customers), suppliersCount:number(counts.suppliers)
      },
      trend: trend.map(x=>({date:x.date,sales:number(x.sales),purchases:number(x.purchases),profit:number(x.profit)})),
      topProducts: topProducts.map(x=>({...x,quantity:number(x.quantity),revenue:number(x.revenue)})),
      recentSales, recentPurchases, recentTransactions, alerts: alerts.map(x=>({...x,quantity:number(x.quantity)}))
    };
  }
}
module.exports = new DashboardController();
