const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

const get = (db, sql, params=[]) => new Promise((resolve,reject)=>db.get(sql,params,(e,r)=>e?reject(e):resolve(r)));
const all = (db, sql, params=[]) => new Promise((resolve,reject)=>db.all(sql,params,(e,r)=>e?reject(e):resolve(r||[])));

class PrintController {
  async getPaymentDocument(id) {
    const db = await dbmanager.init();
    const payment = await get(db, `SELECT p.*, c.name cashbox_name,
      CASE WHEN p.payment_type='sale' THEN cu.name ELSE s.name END party_name,
      CASE WHEN p.payment_type='sale' THEN si.invoice_number ELSE pi.invoice_number END invoice_number
      FROM payments p
      LEFT JOIN cashboxes c ON c.id=p.cashbox_id
      LEFT JOIN sale_invoices si ON p.payment_type='sale' AND si.id=p.invoice_id
      LEFT JOIN purchase_invoices pi ON p.payment_type='purchase' AND pi.id=p.invoice_id
      LEFT JOIN customers cu ON p.payment_type='sale' AND cu.id=p.party_id
      LEFT JOIN suppliers s ON p.payment_type='purchase' AND s.id=p.party_id
      WHERE p.id=?`, [id]);
    if (!payment) throw Object.assign(new Error('Payment not found'), {code:'NOT_FOUND'});
    return payment;
  }

  async getTransactionDocument(id) {
    const db = await dbmanager.init();
    const row = await get(db, `SELECT t.*, tc.name category_name, c.name cashbox_name, c.currency cashbox_currency
      FROM transactions t LEFT JOIN transaction_categories tc ON tc.id=t.category_id
      LEFT JOIN cashboxes c ON c.id=t.cashbox_id WHERE t.id=?`, [id]);
    if (!row) throw Object.assign(new Error('Transaction not found'), {code:'NOT_FOUND'});
    return row;
  }

  async getTransferDocument(groupId) {
    const db = await dbmanager.init();
    const rows = await all(db, `SELECT ct.*, c.name cashbox_name, c.currency cashbox_currency
      FROM cashbox_transactions ct LEFT JOIN cashboxes c ON c.id=ct.cashbox_id
      WHERE ct.transfer_group_id=? ORDER BY ct.id`, [groupId]);
    if (!rows.length) throw Object.assign(new Error('Transfer not found'), {code:'NOT_FOUND'});
    return { transfer_group_id: groupId, movements: rows };
  }

  async getCustomerStatement(id) {
    const db = await dbmanager.init();
    const party = await get(db, `SELECT * FROM customers WHERE id=?`, [id]);
    if (!party) throw Object.assign(new Error('Customer not found'), {code:'NOT_FOUND'});
    const invoices = await all(db, `SELECT id, invoice_number, invoice_date, total, paid_amount, remaining_amount, status, currency, exchange_rate,
      total * COALESCE(exchange_rate,1) amount_base FROM sale_invoices WHERE customer_id=? ORDER BY invoice_date,id`, [id]);
    const payments = await all(db, `SELECT p.*, c.name cashbox_name FROM payments p LEFT JOIN cashboxes c ON c.id=p.cashbox_id
      WHERE p.payment_type='sale' AND p.party_id=? ORDER BY p.payment_date,p.id`, [id]);
    return { party, invoices, payments, balance: Number(party.balance||0), statement_type:'customer' };
  }

  async getSupplierStatement(id) {
    const db = await dbmanager.init();
    const party = await get(db, `SELECT * FROM suppliers WHERE id=?`, [id]);
    if (!party) throw Object.assign(new Error('Supplier not found'), {code:'NOT_FOUND'});
    const invoices = await all(db, `SELECT id, invoice_number, invoice_date, total, paid_amount, remaining_amount, status, currency, exchange_rate,
      total * COALESCE(exchange_rate,1) amount_base FROM purchase_invoices WHERE supplier_id=? ORDER BY invoice_date,id`, [id]);
    const payments = await all(db, `SELECT p.*, c.name cashbox_name FROM payments p LEFT JOIN cashboxes c ON c.id=p.cashbox_id
      WHERE p.payment_type='purchase' AND p.party_id=? ORDER BY p.payment_date,p.id`, [id]);
    return { party, invoices, payments, balance: Number(party.balance||0), statement_type:'supplier' };
  }

  async getCashboxStatement(id) {
    const db = await dbmanager.init();
    const cashbox = await get(db, `SELECT * FROM cashboxes WHERE id=?`, [id]);
    if (!cashbox) throw Object.assign(new Error('Cashbox not found'), {code:'NOT_FOUND'});
    const movements = await all(db, `SELECT * FROM cashbox_transactions WHERE cashbox_id=? ORDER BY transaction_date,id`, [id]);
    return { cashbox, movements };
  }

  async getConsignmentDocument(purchaseId) {
    const db = await dbmanager.init();
    const settlement = await get(db, `SELECT cs.*, pi.invoice_number, pi.currency, pi.exchange_rate, s.name supplier_name, c.name cashbox_name
      FROM consignment_settlements cs JOIN purchase_invoices pi ON pi.id=cs.purchase_invoice_id
      LEFT JOIN suppliers s ON s.id=pi.supplier_id LEFT JOIN cashboxes c ON c.id=cs.cashbox_id
      WHERE cs.purchase_invoice_id=? ORDER BY cs.id DESC LIMIT 1`, [purchaseId]);
    if (!settlement) throw Object.assign(new Error('Settlement not found'), {code:'NOT_FOUND'});
    const items = await all(db, `SELECT csi.*, p.name product_name FROM consignment_settlement_items csi
      LEFT JOIN products p ON p.id=csi.product_id WHERE csi.settlement_id=? ORDER BY csi.id`, [settlement.id]);
    return { settlement, items };
  }
}
module.exports = new PrintController();
