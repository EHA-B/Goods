const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

const all = (db, sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows || [])));
const get = (db, sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (error, row) => error ? reject(error) : resolve(row || null)));
const run = (db, sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function callback(error) {
  if (error) return reject(error);
  resolve({ id: this.lastID, changes: this.changes });
}));

class NotificationController {
  async tableExists(db, tableName) {
    return Boolean(await get(db, `SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName]));
  }

  async columnNames(db, tableName) {
    if (!(await this.tableExists(db, tableName))) return new Set();
    const columns = await all(db, `PRAGMA table_info(${tableName})`);
    return new Set(columns.map((column) => column.name));
  }

  async getDefaultMinimumStock(db) {
    if (!(await this.tableExists(db, 'settings'))) return 5;
    const row = await get(db, `SELECT setting_value FROM settings WHERE setting_key='notifications.default_min_stock' LIMIT 1`);
    const value = Number(row?.setting_value);
    return Number.isFinite(value) && value >= 0 ? value : 5;
  }

  async activate(db, item) {
    const existing = await get(db, `SELECT * FROM notifications WHERE dedupe_key=?`, [item.dedupe_key]);
    if (!existing) {
      await run(db, `INSERT INTO notifications
        (dedupe_key,type,severity,title,body,entity_type,entity_id,action_path,is_read,is_active,generation,first_seen_at,last_triggered_at,resolved_at,dismissed_at,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,0,1,1,datetime('now'),datetime('now'),NULL,NULL,datetime('now'),datetime('now'))`, [
        item.dedupe_key, item.type, item.severity, item.title, item.body || null,
        item.entity_type || null, item.entity_id || null, item.action_path || null,
      ]);
      return;
    }

    const reactivated = Number(existing.is_active) !== 1 || Boolean(existing.resolved_at);
    if (reactivated) {
      await run(db, `UPDATE notifications SET
        type=?,severity=?,title=?,body=?,entity_type=?,entity_id=?,action_path=?,
        is_read=0,read_at=NULL,is_active=1,generation=COALESCE(generation,1)+1,
        last_triggered_at=datetime('now'),resolved_at=NULL,dismissed_at=NULL,
        created_at=datetime('now'),updated_at=datetime('now')
        WHERE id=?`, [
        item.type, item.severity, item.title, item.body || null, item.entity_type || null,
        item.entity_id || null, item.action_path || null, existing.id,
      ]);
      return;
    }

    await run(db, `UPDATE notifications SET
      type=?,severity=?,title=?,body=?,entity_type=?,entity_id=?,action_path=?,updated_at=datetime('now')
      WHERE id=?`, [
      item.type, item.severity, item.title, item.body || null, item.entity_type || null,
      item.entity_id || null, item.action_path || null, existing.id,
    ]);
  }

  async resolveMissingGenerated(db, activeKeys) {
    const generatedWhere = `(dedupe_key LIKE 'stock:%' OR dedupe_key='consignment:pending')`;
    if (!activeKeys.length) {
      await run(db, `UPDATE notifications SET is_active=0,resolved_at=COALESCE(resolved_at,datetime('now')),updated_at=datetime('now') WHERE ${generatedWhere} AND is_active=1`);
      return;
    }
    const placeholders = activeKeys.map(() => '?').join(',');
    await run(db, `UPDATE notifications SET is_active=0,resolved_at=COALESCE(resolved_at,datetime('now')),updated_at=datetime('now')
      WHERE ${generatedWhere} AND is_active=1 AND dedupe_key NOT IN (${placeholders})`, activeKeys);
  }

  async refreshGeneratedNotifications() {
    const db = await dbmanager.init();
    if (!(await this.tableExists(db, 'notifications'))) {
      const error = new Error('Notifications table is not available');
      error.code = 'NOTIFICATIONS_TABLE_MISSING';
      throw error;
    }

    const activeItems = [];
    if (await this.tableExists(db, 'products') && await this.tableExists(db, 'stock_batches')) {
      const productColumns = await this.columnNames(db, 'products');
      const defaultMinimum = await this.getDefaultMinimumStock(db);
      const minimumExpression = productColumns.has('min_stock')
        ? `COALESCE(p.min_stock, ?)`
        : `?`;
      const rows = await all(db, `SELECT p.id,p.name,
        COALESCE(SUM(CASE WHEN COALESCE(sb.isActive,1)=1 THEN COALESCE(sb.remaining_quantity,0) ELSE 0 END),0) quantity,
        ${minimumExpression} min_stock
        FROM products p
        LEFT JOIN stock_batches sb ON sb.product_id=p.id
        WHERE COALESCE(p.isActive,1)=1
        GROUP BY p.id,p.name${productColumns.has('min_stock') ? ',p.min_stock' : ''}`, [defaultMinimum]);

      for (const row of rows) {
        const quantity = Number(row.quantity || 0);
        const minimum = Number(row.min_stock || 0);
        if (quantity <= 0) {
          activeItems.push({
            dedupe_key: `stock:out:${row.id}`, type: 'inventory', severity: 'error', title: 'نفاد المخزون',
            body: `المنتج «${row.name}» غير متوفر حاليًا.`, entity_type: 'product', entity_id: row.id,
            action_path: `/inventory/${row.id}`,
          });
        } else if (minimum > 0 && quantity <= minimum) {
          activeItems.push({
            dedupe_key: `stock:low:${row.id}`, type: 'inventory', severity: 'warning', title: 'مخزون منخفض',
            body: `تبقى ${quantity} من المنتج «${row.name}».`, entity_type: 'product', entity_id: row.id,
            action_path: `/inventory/${row.id}`,
          });
        }
      }
    }

    if (await this.tableExists(db, 'purchase_invoices')) {
      const columns = await this.columnNames(db, 'purchase_invoices');
      if (columns.has('invoice_type')) {
        const settlementFilter = columns.has('settlement_status')
          ? `AND COALESCE(settlement_status,'pending')='pending'`
          : '';
        const statusFilter = columns.has('status')
          ? `AND COALESCE(status,'')!='cancelled'`
          : '';
        const result = await get(db, `SELECT COUNT(*) count FROM purchase_invoices
          WHERE invoice_type='consignment' ${settlementFilter} ${statusFilter}`);
        const count = Number(result?.count || 0);
        if (count > 0) {
          activeItems.push({
            dedupe_key: 'consignment:pending', type: 'consignment', severity: 'warning', title: 'تسويات أمانة معلقة',
            body: `يوجد ${count} فاتورة أمانة بانتظار التسوية.`, entity_type: 'purchase_invoice', action_path: '/purchases',
          });
        }
      }
    }

    await this.resolveMissingGenerated(db, activeItems.map((item) => item.dedupe_key));
    for (const item of activeItems) await this.activate(db, item);
    return { refreshed: true, generated: activeItems.length };
  }

  async list(input = {}) {
    await this.refreshGeneratedNotifications();
    const db = await dbmanager.init();
    const page = Math.max(1, Number(input.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(input.limit) || 20));
    const where = ['is_active=1', 'dismissed_at IS NULL'];
    const params = [];
    if (input.unreadOnly) where.push('is_read=0');
    if (input.type && input.type !== 'all') { where.push('type=?'); params.push(input.type); }
    if (input.severity && input.severity !== 'all') { where.push('severity=?'); params.push(input.severity); }

    const countResult = await get(db, `SELECT COUNT(*) count FROM notifications WHERE ${where.join(' AND ')}`, params);
    const items = await all(db, `SELECT * FROM notifications WHERE ${where.join(' AND ')}
      ORDER BY is_read ASC, COALESCE(last_triggered_at,created_at) DESC LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]);
    const unread = await get(db, `SELECT COUNT(*) count FROM notifications WHERE is_active=1 AND dismissed_at IS NULL AND is_read=0`);
    const newest = await get(db, `SELECT id,generation,COALESCE(last_triggered_at,created_at) triggered_at
      FROM notifications WHERE is_active=1 AND dismissed_at IS NULL AND is_read=0
      ORDER BY COALESCE(last_triggered_at,created_at) DESC,id DESC LIMIT 1`);
    const total = Number(countResult?.count || 0);
    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      unreadCount: Number(unread?.count || 0),
      newestUnreadToken: newest ? `${newest.id}:${newest.generation || 1}:${newest.triggered_at || ''}` : null,
    };
  }

  async unreadCount() {
    const result = await this.list({ page: 1, limit: 1, unreadOnly: true });
    return { count: result.unreadCount, newestUnreadToken: result.newestUnreadToken };
  }

  async markRead(id) {
    const db = await dbmanager.init();
    const result = await run(db, `UPDATE notifications SET is_read=1,read_at=datetime('now'),updated_at=datetime('now') WHERE id=? AND is_active=1`, [id]);
    if (!result.changes) { const error = new Error('Notification not found'); error.code = 'NOT_FOUND'; throw error; }
    return { success: true };
  }

  async markAllRead() {
    const db = await dbmanager.init();
    await run(db, `UPDATE notifications SET is_read=1,read_at=datetime('now'),updated_at=datetime('now')
      WHERE is_active=1 AND dismissed_at IS NULL AND is_read=0`);
    return { success: true };
  }

  async dismiss(id) {
    const db = await dbmanager.init();
    const result = await run(db, `UPDATE notifications SET dismissed_at=datetime('now'),is_read=1,read_at=COALESCE(read_at,datetime('now')),updated_at=datetime('now')
      WHERE id=? AND is_active=1`, [id]);
    if (!result.changes) { const error = new Error('Notification not found'); error.code = 'NOT_FOUND'; throw error; }
    return { success: true };
  }
}

module.exports = new NotificationController();
