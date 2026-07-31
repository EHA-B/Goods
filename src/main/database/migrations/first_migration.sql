-- =============================================
-- قاعدة بيانات نظام إدارة أسواق المزارعين
-- Farmers Market Management System Database
-- =============================================

-- حذف قاعدة البيانات إذا كانت موجودة
DROP DATABASE IF EXISTS farmers_market;
CREATE DATABASE farmers_market;
USE farmers_market;

-- =============================================
-- 1. جدول العملاء (Customers)
-- =============================================
CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    balance DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'الرصيد الحالي للعميل',
    notes TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customer_phone (phone),
    INDEX idx_customer_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 2. جدول الموردين (Suppliers) - المزارعين
-- =============================================
CREATE TABLE suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    notes TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_supplier_phone (phone),
    INDEX idx_supplier_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 3. جدول المنتجات (Products)
-- =============================================
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL COMMENT 'وحدة القياس: كجم، علبة، حبة، لتر، إلخ',
    category VARCHAR(50) COMMENT 'تصنيف المنتج: خضروات، فواكه، إلخ',
    description TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_product_name (name),
    INDEX idx_product_category (category),
    INDEX idx_product_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 4. جدول دفعات المخزون (Stock_Batches)
-- =============================================
CREATE TABLE stock_batches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    supplier_id INT NOT NULL,
    batch_code VARCHAR(50) UNIQUE COMMENT 'رمز الدفعة لتمييزها',
    quantity DECIMAL(15, 3) NOT NULL CHECK (quantity >= 0) COMMENT 'الكمية المشتراة',
    remaining_quantity DECIMAL(15, 3) NOT NULL CHECK (remaining_quantity >= 0) COMMENT 'الكمية المتبقية بعد المبيعات',
    purchase_price DECIMAL(15, 2) NOT NULL CHECK (purchase_price >= 0) COMMENT 'سعر الشراء للوحدة',
    received_date DATE NOT NULL,
    expiry_date DATE COMMENT 'تاريخ الانتهاء (للأطعمة)',
    notes TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    INDEX idx_batch_product (product_id),
    INDEX idx_batch_supplier (supplier_id),
    INDEX idx_batch_code (batch_code),
    INDEX idx_batch_received (received_date),
    INDEX idx_batch_remaining (remaining_quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 5. جدول فواتير الشراء (Purchase_Invoices)
-- =============================================
CREATE TABLE purchase_invoices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_number VARCHAR(50) UNIQUE NOT NULL COMMENT 'رقم الفاتورة الفريد',
    supplier_id INT NOT NULL,
    invoice_date DATE NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    discount DECIMAL(15, 2) DEFAULT 0.00 CHECK (discount >= 0),
    tax DECIMAL(15, 2) DEFAULT 0.00 CHECK (tax >= 0),
    total DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    paid_amount DECIMAL(15, 2) DEFAULT 0.00 CHECK (paid_amount >= 0),
    status ENUM('draft', 'confirmed', 'paid', 'cancelled') DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    INDEX idx_purchase_supplier (supplier_id),
    INDEX idx_purchase_number (invoice_number),
    INDEX idx_purchase_date (invoice_date),
    INDEX idx_purchase_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 6. جدول تفاصيل فواتير الشراء (Purchase_Invoice_Items)
-- =============================================
CREATE TABLE purchase_invoice_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    purchase_invoice_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity DECIMAL(15, 3) NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(15, 2) NOT NULL CHECK (unit_price >= 0),
    line_total DECIMAL(15, 2) NOT NULL CHECK (line_total >= 0) COMMENT 'الكمية × سعر الوحدة',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_invoice_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_purchase_item_invoice (purchase_invoice_id),
    INDEX idx_purchase_item_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 7. جدول أنواع البيع (Sale_Types)
-- =============================================
CREATE TABLE sale_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE COMMENT 'مثال: بيع عمولة، بيع مباشر',
    commission_percentage DECIMAL(5, 2) DEFAULT 0.00 CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
    description TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sale_type_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 8. جدول فواتير البيع (Sale_Invoices)
-- =============================================
CREATE TABLE sale_invoices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_number VARCHAR(50) UNIQUE NOT NULL COMMENT 'رقم الفاتورة الفريد',
    customer_id INT NOT NULL,
    sale_type_id INT NOT NULL,
    cashbox_id INT COMMENT 'الصندوق الذي تمت فيه المعاملة',
    invoice_date DATE NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    discount DECIMAL(15, 2) DEFAULT 0.00 CHECK (discount >= 0),
    commission_percentage DECIMAL(5, 2) DEFAULT 0.00 CHECK (commission_percentage >= 0),
    commission_amount DECIMAL(15, 2) DEFAULT 0.00 CHECK (commission_amount >= 0),
    tax DECIMAL(15, 2) DEFAULT 0.00 CHECK (tax >= 0),
    total DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    paid_amount DECIMAL(15, 2) DEFAULT 0.00 CHECK (paid_amount >= 0),
    status ENUM('draft', 'confirmed', 'paid', 'cancelled') DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (sale_type_id) REFERENCES sale_types(id) ON DELETE RESTRICT,
    INDEX idx_sale_customer (customer_id),
    INDEX idx_sale_number (invoice_number),
    INDEX idx_sale_date (invoice_date),
    INDEX idx_sale_status (status),
    INDEX idx_sale_cashbox (cashbox_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 9. جدول تفاصيل فواتير البيع (Sale_Invoice_Items)
-- =============================================
CREATE TABLE sale_invoice_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sale_invoice_id INT NOT NULL,
    stock_batch_id INT NOT NULL COMMENT 'من أي دفعة تم سحب المنتج',
    quantity DECIMAL(15, 3) NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(15, 2) NOT NULL CHECK (unit_price >= 0) COMMENT 'سعر البيع للوحدة',
    line_total DECIMAL(15, 2) NOT NULL CHECK (line_total >= 0) COMMENT 'الكمية × سعر الوحدة',
    cost_price DECIMAL(15, 2) NOT NULL CHECK (cost_price >= 0) COMMENT 'سعر الشراء في وقت البيع (لحساب الربح)',
    profit DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'الربح = line_total - (الكمية × cost_price)',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_invoice_id) REFERENCES sale_invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_batch_id) REFERENCES stock_batches(id) ON DELETE RESTRICT,
    INDEX idx_sale_item_invoice (sale_invoice_id),
    INDEX idx_sale_item_batch (stock_batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 10. جدول الصناديق النقدية (Cashboxes)
-- =============================================
CREATE TABLE cashboxes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    parent_id INT NULL COMMENT 'الصندوق الأب (null للصندوق الرئيسي)',
    balance DECIMAL(15, 2) DEFAULT 0.00 CHECK (balance >= 0),
    initial_balance DECIMAL(15, 2) DEFAULT 0.00 CHECK (initial_balance >= 0) COMMENT 'الرصيد الافتتاحي',
    currency VARCHAR(10) DEFAULT 'SAR' COMMENT 'عملة الصندوق',
    isActive BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES cashboxes(id) ON DELETE SET NULL,
    INDEX idx_cashbox_parent (parent_id),
    INDEX idx_cashbox_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 11. جدول حركات الصناديق (Cashbox_Transactions)
-- =============================================
CREATE TABLE cashbox_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cashbox_id INT NOT NULL,
    reference_type ENUM('sale', 'purchase', 'expense', 'income', 'transfer') NOT NULL,
    reference_id INT NOT NULL COMMENT 'رقم الفاتورة أو المعاملة المرتبطة',
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    direction ENUM('in', 'out') NOT NULL COMMENT 'in: إيداع، out: سحب',
    balance_before DECIMAL(15, 2) NOT NULL CHECK (balance_before >= 0),
    balance_after DECIMAL(15, 2) NOT NULL CHECK (balance_after >= 0),
    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cashbox_id) REFERENCES cashboxes(id) ON DELETE RESTRICT,
    INDEX idx_cb_transaction_cashbox (cashbox_id),
    INDEX idx_cb_transaction_reference (reference_type, reference_id),
    INDEX idx_cb_transaction_date (transaction_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 12. جدول فئات المصاريف والإيرادات (Transaction_Categories)
-- =============================================
CREATE TABLE transaction_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    type ENUM('expense', 'income') NOT NULL,
    description TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category_type (type),
    INDEX idx_category_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 13. جدول المصاريف والإيرادات (Transactions)
-- =============================================
CREATE TABLE transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL,
    cashbox_id INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    direction ENUM('expense', 'income') NOT NULL COMMENT 'expense: مصروف، income: إيراد',
    transaction_date DATE NOT NULL,
    description TEXT,
    reference_number VARCHAR(50) COMMENT 'رقم مرجعي للفاتورة أو المعاملة',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES transaction_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (cashbox_id) REFERENCES cashboxes(id) ON DELETE RESTRICT,
    INDEX idx_transaction_category (category_id),
    INDEX idx_transaction_cashbox (cashbox_id),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_transaction_direction (direction)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 14. جدول المدفوعات العامة (Payments) - موحد
-- =============================================
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    party_type ENUM('customer', 'supplier') NOT NULL,
    party_id INT NOT NULL COMMENT 'customer_id أو supplier_id',
    payment_type ENUM('sale', 'purchase') NOT NULL COMMENT 'دفعة عن فاتورة بيع أو شراء',
    invoice_id INT NOT NULL COMMENT 'sale_invoice_id أو purchase_invoice_id',
    cashbox_id INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    payment_method ENUM('cash', 'bank', 'credit_card', 'cheque', 'online') DEFAULT 'cash',
    reference_number VARCHAR(50) COMMENT 'رقم المرجع للشيك أو التحويل',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cashbox_id) REFERENCES cashboxes(id) ON DELETE RESTRICT,
    INDEX idx_payment_party (party_type, party_id),
    INDEX idx_payment_invoice (payment_type, invoice_id),
    INDEX idx_payment_cashbox (cashbox_id),
    INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 15. جدول المستخدمين (Users) - لمنظومة الدخول
-- =============================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    role ENUM('admin', 'manager', 'cashier', 'viewer') DEFAULT 'cashier',
    isActive BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_username (username),
    INDEX idx_user_email (email),
    INDEX idx_user_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 16. جدول سجل النشاطات (Activity_Logs) - تدقيق
-- =============================================
CREATE TABLE activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL COMMENT 'مثال: create_sale, update_stock',
    table_name VARCHAR(50) NOT NULL,
    record_id INT NOT NULL,
    old_data JSON,
    new_data JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_log_user (user_id),
    INDEX idx_log_table (table_name),
    INDEX idx_log_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 17. جدول الإعدادات العامة (Settings)
-- =============================================
CREATE TABLE settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_settings_key (setting_key),
    INDEX idx_settings_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- الإضافات: الفهارس الإضافية لتحسين الأداء
-- =============================================
CREATE INDEX idx_sale_invoice_customer_status ON sale_invoices(customer_id, status);
CREATE INDEX idx_sale_invoice_date_status ON sale_invoices(invoice_date, status);
CREATE INDEX idx_purchase_invoice_supplier_status ON purchase_invoices(supplier_id, status);
CREATE INDEX idx_stock_batch_product_remaining ON stock_batches(product_id, remaining_quantity);
CREATE INDEX idx_cashbox_transaction_cashbox_date ON cashbox_transactions(cashbox_id, transaction_date);
CREATE INDEX idx_payments_party_date ON payments(party_type, party_id, payment_date);

-- =============================================
-- البيانات الافتراضية (Seed Data)
-- =============================================

-- إضافة أنواع البيع الافتراضية
INSERT INTO sale_types (name, commission_percentage, description) VALUES
('بيع مباشر', 0.00, 'بيع بدون عمولة'),
('عمولة 5%', 5.00, 'نسبة عمولة 5% على إجمالي الفاتورة'),
('عمولة 10%', 10.00, 'نسبة عمولة 10% على إجمالي الفاتورة'),
('عمولة 15%', 15.00, 'نسبة عمولة 15% على إجمالي الفاتورة');

-- إضافة فئات المصاريف والإيرادات الافتراضية
INSERT INTO transaction_categories (name, type, description) VALUES
('إيجار المحل', 'expense', 'إيجار محل السوق'),
('فواتير كهرباء', 'expense', 'فواتير الكهرباء'),
('فواتير ماء', 'expense', 'فواتير المياه'),
('رواتب الموظفين', 'expense', 'رواتب العاملين في المحل'),
('تسويق وإعلان', 'expense', 'مصاريف التسويق والإعلان'),
('مصاريف نقل', 'expense', 'مصاريف النقل والشحن'),
('إيراد عمولات', 'income', 'إيراد العمولات من المبيعات'),
('إيراد آخر', 'income', 'إيرادات متنوعة');

-- إنشاء صندوق رئيسي افتراضي
INSERT INTO cashboxes (name, parent_id, initial_balance, balance, currency, notes) VALUES
('الصندوق الرئيسي', NULL, 0.00, 0.00, 'SAR', 'الصندوق الرئيسي للنظام');

-- إضافة إعدادات افتراضية
INSERT INTO settings (setting_key, setting_value, description, category) VALUES
('company_name', 'سوق المزارعين', 'اسم الشركة أو المحل', 'general'),
('company_address', 'الرياض - المملكة العربية السعودية', 'عنوان الشركة', 'general'),
('company_phone', '0555555555', 'رقم هاتف الشركة', 'general'),
('default_vat', '0.00', 'نسبة الضريبة الافتراضية', 'tax'),
('stock_alert_threshold', '10', 'حد التنبيه للمخزون المنخفض', 'stock'),
('invoice_prefix_sale', 'S-', 'بادئة فواتير البيع', 'invoice'),
('invoice_prefix_purchase', 'P-', 'بادئة فواتير الشراء', 'invoice');

-- إضافة مستخدم افتراضي (admin)
INSERT INTO users (username, password_hash, full_name, email, role, isActive) VALUES
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'مدير النظام', 'admin@farmersmarket.com', 'admin', TRUE);
-- ملاحظة: كلمة المرور هي "password" مشفرة باستخدام Bcrypt

-- =============================================
-- عرض هيكل الجداول للتأكد
-- =============================================
SHOW TABLES;

-- عرض جميع الجداول مع عدد السجلات
SELECT 
    TABLE_NAME, 
    TABLE_ROWS,
    DATA_LENGTH,
    INDEX_LENGTH
FROM 
    information_schema.TABLES 
WHERE 
    TABLE_SCHEMA = 'farmers_market'
ORDER BY 
    TABLE_NAME;

-- =============================================
-- نهاية ملف SQL
-- =============================================