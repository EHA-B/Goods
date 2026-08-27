const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

function validationError(message) {
  const error = new Error(message);
  error.code = 'VALIDATION_ERROR';
  return error;
}

function parseJson(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return { value }; }
}

function severityFor(action) {
  const value = String(action || '').toLowerCase();
  if (value.includes('delete') || value.includes('cancel') || value.includes('reverse') || value.includes('restore')) return 'critical';
  if (value.includes('update') || value.includes('password') || value.includes('backup') || value.includes('transfer')) return 'warning';
  return 'info';
}

function moduleFor(tableName, action) {
  const table = String(tableName || 'system');
  const map = {
    sale_invoices: 'المبيعات', purchase_invoices: 'المشتريات', payments: 'الدفعات',
    products: 'المنتجات', customers: 'العملاء', suppliers: 'الموردون',
    cashboxes: 'الصناديق', cashbox_transactions: 'الصناديق', transactions: 'المعاملات المالية',
    transaction_categories: 'تصنيفات المعاملات', stock_batches: 'المخزون', stock_adjustments: 'المخزون',
    settings: 'الإعدادات', users: 'المصادقة', backups: 'النسخ الاحتياطي', consignment_settlements: 'الأمانة',
  };
  if (String(action).startsWith('auth_')) return 'المصادقة';
  return map[table] || table;
}

function descriptionFor(action, tableName, recordId) {
  const labels = {
    auth_login: 'تسجيل الدخول إلى النظام', auth_logout: 'تسجيل الخروج من النظام', password_changed: 'تغيير كلمة المرور',
    sale_created: 'إنشاء فاتورة بيع', sale_edited: 'تعديل فاتورة بيع', sale_cancelled: 'إلغاء فاتورة بيع', sale_payment_recorded: 'تسجيل دفعة بيع', sale_payment_reversed: 'عكس دفعة بيع',
    purchase_created: 'إنشاء فاتورة شراء', purchase_edited: 'تعديل فاتورة شراء', purchase_cancelled: 'إلغاء فاتورة شراء', purchase_payment_recorded: 'تسجيل دفعة شراء', purchase_payment_reversed: 'عكس دفعة شراء',
    purchase_commission_closed: 'إغلاق تسوية أمانة', purchase_commission_reversed: 'عكس تسوية أمانة',
    backup_created: 'إنشاء نسخة احتياطية', backup_restored: 'استعادة نسخة احتياطية',
  };
  if (labels[action]) return labels[action];
  const verb = String(action).includes('create') ? 'إنشاء' : String(action).includes('update') ? 'تعديل' : String(action).includes('delete') ? 'حذف' : String(action).includes('cancel') ? 'إلغاء' : 'تنفيذ عملية على';
  return `${verb} ${tableName || 'النظام'}${recordId ? ` #${recordId}` : ''}`;
}

function normalizeRow(row) {
  if (!row) return null;
  const oldData = parseJson(row.old_data);
  const newData = parseJson(row.new_data);
  return {
    id: Number(row.id), userId: row.user_id == null ? null : Number(row.user_id),
    userName: row.user_name || row.username || 'النظام', action: row.action,
    module: moduleFor(row.table_name, row.action), entityType: row.table_name || 'system',
    entityId: row.record_id == null ? null : Number(row.record_id),
    description: descriptionFor(row.action, row.table_name, row.record_id),
    severity: severityFor(row.action), createdAt: row.created_at,
    oldData, newData,
  };
}

class ActivityLogController {
  async recordActivity(input, existingDb = null) {
    if (!input?.action) throw validationError('action is required');
    const db = existingDb || await dbmanager.init();
    const userId = input.user_id ?? global.__stockliteCurrentUserId ?? null;
    const id = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO activity_logs (user_id, action, table_name, record_id, old_data, new_data, ip_address, user_agent, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`,
        [userId, input.action, input.table_name || 'system', Number(input.record_id || 0),
          input.old_data == null ? null : JSON.stringify(input.old_data), input.new_data == null ? null : JSON.stringify(input.new_data),
          input.ip_address ?? null, input.user_agent ?? null],
        function (error) { if (error) return reject(error); resolve(this.lastID); },
      );
    });
    return this.getActivityLog(id);
  }

  async getEntitySnapshot(tableName, id) {
    const allowed = new Set(['products','customers','suppliers','cashboxes','transactions','transaction_categories','stock_adjustments','stock_batches','settings','sale_types']);
    if (!allowed.has(tableName) || !id) return null;
    const db = await dbmanager.init();
    return new Promise((resolve) => db.get(`SELECT * FROM ${tableName} WHERE id = ?`, [id], (_error, row) => resolve(row || null)));
  }

  async getActivityLog(id) {
    if (!id) throw validationError('ID is required');
    const db = await dbmanager.init();
    const row = await new Promise((resolve, reject) => db.get(
      `SELECT al.*, u.username, u.full_name AS user_name FROM activity_logs al LEFT JOIN users u ON u.id = al.user_id WHERE al.id = ?`,
      [id], (error, result) => error ? reject(error) : resolve(result),
    ));
    if (!row) { const error = new Error('Activity log not found'); error.code = 'NOT_FOUND'; throw error; }
    return normalizeRow(row);
  }

  async listActivityLogs(filters = {}, pagination = {}) {
    const db = await dbmanager.init();
    const page = Math.max(1, Number(pagination.page || 1));
    const limit = Math.min(100, Math.max(5, Number(pagination.limit || 20)));
    const where = []; const params = [];
    const query = String(filters.query || '').trim();
    if (query) { where.push(`(al.action LIKE ? OR al.table_name LIKE ? OR u.username LIKE ? OR u.full_name LIKE ?)`); const q = `%${query}%`; params.push(q, q, q, q); }
    if (filters.user && filters.user !== 'all') { where.push(`COALESCE(u.full_name,u.username,'النظام') = ?`); params.push(filters.user); }
    if (filters.module && filters.module !== 'all') { where.push(`al.table_name = ?`); params.push(filters.module); }
    if (filters.action && filters.action !== 'all') { where.push(`al.action = ?`); params.push(filters.action); }
    if (filters.severity && filters.severity !== 'all') {
      if (filters.severity === 'critical') where.push(`(al.action LIKE '%delete%' OR al.action LIKE '%cancel%' OR al.action LIKE '%reverse%' OR al.action LIKE '%restore%')`);
      else if (filters.severity === 'warning') where.push(`(al.action LIKE '%update%' OR al.action LIKE '%password%' OR al.action LIKE '%backup%' OR al.action LIKE '%transfer%') AND al.action NOT LIKE '%reverse%'`);
      else where.push(`al.action NOT LIKE '%delete%' AND al.action NOT LIKE '%cancel%' AND al.action NOT LIKE '%reverse%' AND al.action NOT LIKE '%restore%' AND al.action NOT LIKE '%update%' AND al.action NOT LIKE '%password%' AND al.action NOT LIKE '%backup%' AND al.action NOT LIKE '%transfer%'`);
    }
    if (filters.dateFrom) { where.push(`date(al.created_at) >= date(?)`); params.push(filters.dateFrom); }
    if (filters.dateTo) { where.push(`date(al.created_at) <= date(?)`); params.push(filters.dateTo); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const totalRow = await new Promise((resolve, reject) => db.get(`SELECT COUNT(*) AS total FROM activity_logs al LEFT JOIN users u ON u.id=al.user_id ${clause}`, params, (e,r)=>e?reject(e):resolve(r)));
    const rows = await new Promise((resolve, reject) => db.all(
      `SELECT al.*, u.username, u.full_name AS user_name FROM activity_logs al LEFT JOIN users u ON u.id=al.user_id ${clause} ORDER BY datetime(al.created_at) DESC, al.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit], (e,r)=>e?reject(e):resolve(r || []),
    ));
    const total = Number(totalRow?.total || 0);
    return { items: rows.map(normalizeRow), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async getActivityLogOptions() {
    const db = await dbmanager.init();
    const [users, modules, actions] = await Promise.all([
      new Promise((resolve,reject)=>db.all(`SELECT DISTINCT COALESCE(u.full_name,u.username,'النظام') value FROM activity_logs al LEFT JOIN users u ON u.id=al.user_id ORDER BY value`,[],(e,r)=>e?reject(e):resolve(r||[]))),
      new Promise((resolve,reject)=>db.all(`SELECT DISTINCT table_name value FROM activity_logs ORDER BY table_name`,[],(e,r)=>e?reject(e):resolve(r||[]))),
      new Promise((resolve,reject)=>db.all(`SELECT DISTINCT action value FROM activity_logs ORDER BY action`,[],(e,r)=>e?reject(e):resolve(r||[]))),
    ]);
    return { users: users.map(x=>x.value), modules: modules.map(x=>x.value), actions: actions.map(x=>x.value) };
  }
}

module.exports = new ActivityLogController();
