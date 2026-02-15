-- Luxe Look Parlor Dashboard Management System - Complete Database
-- Single file for cPanel / phpMyAdmin import

CREATE DATABASE IF NOT EXISTS luxe_look_dms;
USE luxe_look_dms;

-- Users (staff with login: admin, receptionist, staff)
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'receptionist', 'staff') NOT NULL DEFAULT 'staff',
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Staff profile (links to users for staff role; salary, commission)
CREATE TABLE staff (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE,
  monthly_salary DECIMAL(12,2) DEFAULT 0,
  commission_type ENUM('percentage', 'fixed') DEFAULT 'percentage',
  commission_value DECIMAL(10,2) DEFAULT 0,
  join_date DATE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Service categories
CREATE TABLE service_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services
CREATE TABLE services (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  duration_minutes INT DEFAULT 60,
  price DECIMAL(10,2) NOT NULL,
  commission_percentage DECIMAL(5,2) DEFAULT 0,
  commission_fixed DECIMAL(10,2) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES service_categories(id)
);

-- Customers
CREATE TABLE customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  total_spending DECIMAL(12,2) DEFAULT 0,
  visit_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Appointments
CREATE TABLE appointments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  staff_id INT,
  service_id INT NOT NULL,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  status ENUM('booked', 'confirmed', 'completed', 'cancelled', 'no_show') DEFAULT 'booked',
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (staff_id) REFERENCES staff(id),
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Invoices
CREATE TABLE invoices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  appointment_id INT,
  customer_id INT NOT NULL,
  staff_id INT,
  subtotal DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  payment_method ENUM('cash', 'card', 'bank_transfer', 'mobile_payment') DEFAULT 'cash',
  payment_status ENUM('pending', 'paid', 'partial') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- Invoice items (services on invoice)
CREATE TABLE invoice_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  invoice_id INT NOT NULL,
  service_id INT NOT NULL,
  service_name VARCHAR(255),
  quantity INT DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id)
);

-- Inventory products
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(50),
  unit VARCHAR(50) DEFAULT 'pcs',
  current_stock INT DEFAULT 0,
  reorder_level INT DEFAULT 5,
  supplier_name VARCHAR(255),
  supplier_contact VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Product usage per service (optional: which products used in which service)
CREATE TABLE service_products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  service_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity_used DECIMAL(10,2) DEFAULT 1,
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Stock movements (purchase / usage)
CREATE TABLE stock_movements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  type ENUM('purchase', 'usage', 'adjustment') NOT NULL,
  quantity INT NOT NULL,
  reference_type VARCHAR(50),
  reference_id INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Attendance / leave (simplified)
CREATE TABLE attendance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  staff_id INT NOT NULL,
  date DATE NOT NULL,
  status ENUM('present', 'absent', 'leave', 'half_day') DEFAULT 'present',
  notes TEXT,
  half_day_from TIME NULL COMMENT 'From time when status is half_day',
  half_day_to TIME NULL COMMENT 'To time when status is half_day',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (staff_id, date),
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- Payroll runs
CREATE TABLE payroll (
  id INT PRIMARY KEY AUTO_INCREMENT,
  staff_id INT NOT NULL,
  month_year VARCHAR(7) NOT NULL,
  base_salary DECIMAL(12,2) NOT NULL,
  commission_earned DECIMAL(12,2) DEFAULT 0,
  deductions DECIMAL(12,2) DEFAULT 0,
  net_payable DECIMAL(12,2) NOT NULL,
  status ENUM('draft', 'processed', 'paid') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (staff_id, month_year),
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- Daily expenses (admin/staff can add)
CREATE TABLE daily_expenses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  expense_date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  payment_method ENUM('cash', 'card', 'bank_transfer', 'mobile_payment') DEFAULT 'cash',
  added_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (added_by) REFERENCES users(id)
);

-- Audit log (optional, for admin)
CREATE TABLE audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(100),
  entity VARCHAR(50),
  entity_id INT,
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Default admin is created by server seed on first run (admin@luxelook.com / admin123)

-- Migration: add half-day times to existing attendance table (run if table already exists)
-- ALTER TABLE attendance ADD COLUMN half_day_from TIME NULL AFTER notes;
-- ALTER TABLE attendance ADD COLUMN half_day_to TIME NULL AFTER half_day_from;
