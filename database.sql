-- ============================================================
--  قاعدة بيانات نظام طود Tawd
--  حقوق الملكية: شركة طود Tawd
-- ============================================================

-- استخدام قاعدة البيانات (تأكد من إنشائها أولاً)
-- CREATE DATABASE IF NOT EXISTS if0_42417440_tawd_db;
-- USE if0_42417440_tawd_db;

-- ----------------------------
-- 1. المستخدمين (Users)
-- ----------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    role ENUM('owner','business','driver','customer') NOT NULL,
    business_type ENUM('restaurant','supermarket','electronics','phone_accessories','produce') NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(100) NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('pending','active','suspended') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    activated_by VARCHAR(50) NULL,
    business_id VARCHAR(50) NULL,
    permissions TEXT NULL,
    location_lat DECIMAL(10,8) NULL,
    location_lng DECIMAL(11,8) NULL,
    location_address TEXT NULL,
    theme_pref ENUM('light','dark') DEFAULT 'light',
    work_number VARCHAR(50) NULL,
    logo_url TEXT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    avatar TEXT NULL
);

-- ----------------------------
-- 2. المحلات (Businesses)
-- ----------------------------
CREATE TABLE IF NOT EXISTS businesses (
    user_id VARCHAR(50) PRIMARY KEY,
    work_number VARCHAR(50) NULL,
    logo_url TEXT NULL,
    cover_color VARCHAR(7) DEFAULT '#D7263D',
    invoices_footer_text TEXT NULL,
    address TEXT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------
-- 3. الطاولات (Tables)
-- ----------------------------
CREATE TABLE IF NOT EXISTS tables (
    id VARCHAR(50) PRIMARY KEY,
    business_id VARCHAR(50) NOT NULL,
    name VARCHAR(50) NOT NULL,
    capacity INT DEFAULT 2,
    status ENUM('free','occupied','reserved') DEFAULT 'free',
    FOREIGN KEY (business_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------
-- 4. الفئات (Categories)
-- ----------------------------
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) PRIMARY KEY,
    business_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    FOREIGN KEY (business_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------
-- 5. المنتجات (Products)
-- ----------------------------
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    business_id VARCHAR(50) NOT NULL,
    category_id VARCHAR(50) NULL,
    name VARCHAR(100) NOT NULL,
    image_url TEXT NULL,
    barcode VARCHAR(50) NULL,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) DEFAULT 0,
    stock_qty DECIMAL(10,2) DEFAULT 0,
    min_stock_alert DECIMAL(10,2) DEFAULT 0,
    recipe_id VARCHAR(50) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (business_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ----------------------------
-- 6. المكونات (Ingredients)
-- ----------------------------
CREATE TABLE IF NOT EXISTS ingredients (
    id VARCHAR(50) PRIMARY KEY,
    business_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    unit ENUM('kg','g','l','ml','piece') NOT NULL,
    stock_qty DECIMAL(10,2) DEFAULT 0,
    min_stock_alert DECIMAL(10,2) DEFAULT 0,
    cost_per_unit DECIMAL(10,2) DEFAULT 0,
    supplier_id VARCHAR(50) NULL,
    expiry_date DATE NULL,
    FOREIGN KEY (business_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------
-- 7. الريسبي (Recipes)
-- ----------------------------
CREATE TABLE IF NOT EXISTS recipes (
    id VARCHAR(50) PRIMARY KEY,
    business_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    items TEXT NOT NULL,
    yield DECIMAL(10,2) DEFAULT 1,
    total_cost DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (business_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ----------------------------
-- 8. الموردين (Suppliers)
-- ----------------------------
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(50) PRIMARY KEY,
    business_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NULL,
    notes TEXT NULL,
    balance DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (business_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------
-- 9. الطلبات (Orders)
-- ----------------------------
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    business_id VARCHAR(50) NOT NULL,
    customer_id VARCHAR(50) NULL,
    customer_name VARCHAR(100) NULL,
    customer_phone VARCHAR(20) NULL,
    type ENUM('dine_in','takeaway','delivery') NOT NULL,
    table_id VARCHAR(50) NULL,
    items TEXT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash','card','wallet') DEFAULT 'cash',
    status ENUM('pending','preparing','ready','out_for_delivery','delivered','cancelled') DEFAULT 'pending',
    driver_id VARCHAR(50) NULL,
    shift_id VARCHAR(50) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    customer_location TEXT NULL,
    tracking TEXT NULL,
    FOREIGN KEY (business_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------
-- 10. سجل العملاء (Customer Records)
-- ----------------------------
CREATE TABLE IF NOT EXISTS customer_records (
    id VARCHAR(50) PRIMARY KEY,
    business_id VARCHAR(50) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NULL,
    last_order_at DATETIME NULL,
    total_orders INT DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (business_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------
-- 11. الشيفتات (Shifts)
-- ----------------------------
CREATE TABLE IF NOT EXISTS shifts (
    id VARCHAR(50) PRIMARY KEY,
    business_id VARCHAR(50) NOT NULL,
    staff_id VARCHAR(50) NOT NULL,
    cashier_name VARCHAR(100) NULL,
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME NULL,
    opening_cash DECIMAL(10,2) DEFAULT 0,
    closing_cash DECIMAL(10,2) NULL,
    total_sales DECIMAL(10,2) DEFAULT 0,
    total_orders INT DEFAULT 0,
    production_report TEXT NULL,
    waste_percent DECIMAL(5,2) DEFAULT 0,
    waste_details TEXT NULL,
    FOREIGN KEY (business_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------
-- 12. الموظفين (Employees)
-- ----------------------------
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(50) PRIMARY KEY,
    business_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'staff',
    phone VARCHAR(20) NULL,
    base_salary DECIMAL(10,2) DEFAULT 0,
    permissions TEXT NULL,
    FOREIGN KEY (business_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------
-- 13. المرتبات (Payroll)
-- ----------------------------
CREATE TABLE IF NOT EXISTS payroll_entries (
    id VARCHAR(50) PRIMARY KEY,
    business_id VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    month VARCHAR(7) NOT NULL,
    base_salary DECIMAL(10,2) DEFAULT 0,
    bonuses DECIMAL(10,2) DEFAULT 0,
    deductions DECIMAL(10,2) DEFAULT 0,
    advances DECIMAL(10,2) DEFAULT 0,
    net_salary DECIMAL(10,2) NOT NULL,
    paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------
-- 14. المشتريات (Purchases)
-- ----------------------------
CREATE TABLE IF NOT EXISTS purchases (
    id VARCHAR(50) PRIMARY KEY,
    business_id VARCHAR(50) NOT NULL,
    supplier_id VARCHAR(50) NOT NULL,
    supplier_name VARCHAR(100) NULL,
    items TEXT NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------
-- 15. جرد المخزن (Stocktakes)
-- ----------------------------
CREATE TABLE IF NOT EXISTS stocktakes (
    id VARCHAR(50) PRIMARY KEY,
    business_id VARCHAR(50) NOT NULL,
    ingredient_id VARCHAR(50) NOT NULL,
    ingredient_name VARCHAR(100) NOT NULL,
    system_qty DECIMAL(10,2) NOT NULL,
    actual_qty DECIMAL(10,2) NOT NULL,
    diff DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
--  إدراج حساب المصمم
--  كلمة المرور: 11Tawd2026@
-- ============================================================

-- حذف أي حساب مصمم قديم
DELETE FROM users WHERE role = 'owner';

-- إدراج حساب المصمم
INSERT INTO users (id, role, name, phone, password_hash, status, work_number, created_at) 
VALUES (
    'owner-1', 
    'owner', 
    'Elgioushy', 
    '01099019678', 
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
    'active', 
    'TAWD-001', 
    NOW()
);

-- التأكد
SELECT * FROM users;