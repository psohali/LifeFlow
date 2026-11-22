-- LifeFlow Blood Bank Management System (India)
-- MySQL Database Schema with Role-Based Access Control (RBAC)

CREATE DATABASE IF NOT EXISTS lifeflow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lifeflow;

-- 1. Users Table (supports donor, patient, admin roles)
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL DEFAULT 'Administrator',
  email VARCHAR(120) NULL UNIQUE,
  phone VARCHAR(15) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('donor', 'patient', 'admin') NOT NULL,
  account_status ENUM('active', 'pending', 'rejected') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Donors Table (linked to user_id when registered with a donor account)
CREATE TABLE IF NOT EXISTS donors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  age TINYINT UNSIGNED NOT NULL,
  gender ENUM('Male', 'Female', 'Other') NOT NULL,
  blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
  phone VARCHAR(15) NOT NULL,
  email VARCHAR(120) NOT NULL,
  house_street VARCHAR(200) NOT NULL,
  area VARCHAR(120) NOT NULL,
  city VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  state VARCHAR(80) NOT NULL,
  pin_code CHAR(6) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_donor_age CHECK (age BETWEEN 18 AND 65),
  CONSTRAINT fk_donor_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- 3. Blood Requests Table (linked to patient user_id)
CREATE TABLE IF NOT EXISTS blood_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_user_id INT NULL,
  patient_name VARCHAR(120) NOT NULL,
  requester_name VARCHAR(120) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
  units_required TINYINT UNSIGNED NOT NULL,
  hospital_name VARCHAR(160) NOT NULL,
  location VARCHAR(160) NOT NULL,
  urgency ENUM('Normal', 'Urgent', 'Emergency') NOT NULL DEFAULT 'Normal',
  status ENUM('Pending', 'Approved', 'Rejected', 'Fulfilled') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_units_required CHECK (units_required >= 1),
  CONSTRAINT fk_request_patient_user
    FOREIGN KEY (patient_user_id) REFERENCES users(user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- 4. Blood Inventory Table (8 blood groups)
CREATE TABLE IF NOT EXISTS blood_inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL UNIQUE,
  units_available INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. Request History Table (audit log of status updates)
CREATE TABLE IF NOT EXISTS request_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  old_status ENUM('Pending', 'Approved', 'Rejected', 'Fulfilled') NULL,
  new_status ENUM('Pending', 'Approved', 'Rejected', 'Fulfilled') NOT NULL,
  changed_by INT NULL,
  remarks VARCHAR(255) NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_request
    FOREIGN KEY (request_id) REFERENCES blood_requests(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_history_user
    FOREIGN KEY (changed_by) REFERENCES users(user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- Sample Demonstration Inventory (123 total fictional units across 8 blood groups)
INSERT INTO blood_inventory (blood_group, units_available) VALUES
  ('A+', 25),
  ('A-', 10),
  ('B+', 18),
  ('B-', 8),
  ('AB+', 12),
  ('AB-', 5),
  ('O+', 30),
  ('O-', 15)
ON DUPLICATE KEY UPDATE
  blood_group = VALUES(blood_group);
