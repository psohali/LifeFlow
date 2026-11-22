import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mode = 'uninitialized';
let mysqlPool = null;
let sqliteDb = null;

function createSqliteAdapter(dbInstance) {
  return {
    async execute(sql, params = []) {
      const normalized = sql.trim();
      const upper = normalized.toUpperCase();
      const stmt = dbInstance.prepare(normalized);
      const bound = Array.isArray(params) ? params : [];

      if (upper.startsWith('SELECT')) {
        const rows = stmt.all(...bound);
        return [rows, []];
      }

      const info = stmt.run(...bound);
      return [
        {
          insertId: Number(info.lastInsertRowid || 0),
          affectedRows: Number(info.changes || 0),
        },
        [],
      ];
    },
    async query(sql, params = []) {
      return this.execute(sql, params);
    },
  };
}

function createPreviewSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NULL UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('donor', 'patient', 'admin')),
      account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'pending', 'rejected')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS donors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NULL UNIQUE,
      full_name TEXT NOT NULL,
      age INTEGER NOT NULL CHECK (age BETWEEN 18 AND 65),
      gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
      blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      house_street TEXT NOT NULL,
      area TEXT NOT NULL,
      city TEXT NOT NULL,
      district TEXT NOT NULL,
      state TEXT NOT NULL,
      pin_code TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS blood_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_user_id INTEGER NULL,
      patient_name TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
      units_required INTEGER NOT NULL CHECK (units_required >= 1),
      hospital_name TEXT NOT NULL,
      location TEXT NOT NULL,
      urgency TEXT NOT NULL DEFAULT 'Normal' CHECK (urgency IN ('Normal', 'Urgent', 'Emergency')),
      status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Fulfilled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (patient_user_id) REFERENCES users(user_id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS blood_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blood_group TEXT NOT NULL UNIQUE CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
      units_available INTEGER NOT NULL DEFAULT 0 CHECK (units_available >= 0),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS request_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      old_status TEXT NULL,
      new_status TEXT NOT NULL CHECK (new_status IN ('Pending', 'Approved', 'Rejected', 'Fulfilled')),
      changed_by INTEGER NULL,
      remarks TEXT NULL,
      changed_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by) REFERENCES users(user_id) ON DELETE SET NULL
    );
  `);
}

function initSqlitePreviewDatabase() {
  const dataDir = path.resolve(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'lifeflow_preview.sqlite');

  return import('node:sqlite').then(({ DatabaseSync }) => {
    const db = new DatabaseSync(dbPath);
    db.exec('PRAGMA foreign_keys = OFF;');

    const userCols = db.prepare("PRAGMA table_info('users')").all();
    const hasNewUsers = userCols.some((c) => c.name === 'user_id' || c.name === 'account_status');
    const oldStakeholderTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='stakeholders'")
      .get();

    if ((userCols.length > 0 && !hasNewUsers) || oldStakeholderTable) {
      db.exec(`
        DROP TABLE IF EXISTS request_history;
        DROP TABLE IF EXISTS blood_requests;
        DROP TABLE IF EXISTS donors;
        DROP TABLE IF EXISTS stakeholders;
        DROP TABLE IF EXISTS users;
      `);
    }

    db.exec('PRAGMA foreign_keys = ON;');
    createPreviewSchema(db);

    const countRow = db.prepare('SELECT COUNT(*) AS count FROM blood_inventory').get();
    if (!countRow || countRow.count === 0) {
      const insertStmt = db.prepare(
        'INSERT INTO blood_inventory (blood_group, units_available) VALUES (?, ?)'
      );
      const initialInventory = [
        ['A+', 25],
        ['A-', 10],
        ['B+', 18],
        ['B-', 8],
        ['AB+', 12],
        ['AB-', 5],
        ['O+', 30],
        ['O-', 15],
      ];
      for (const [group, units] of initialInventory) {
        insertStmt.run(group, units);
      }
    }

    sqliteDb = createSqliteAdapter(db);
    mode = 'sqlite-preview';
    return sqliteDb;
  });
}

export async function initDatabase() {
  if (mode === 'mysql' && mysqlPool) return mysqlPool;
  if (mode === 'sqlite-preview' && sqliteDb) return sqliteDb;

  const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lifeflow',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+05:30',
  };

  try {
    const pool = mysql.createPool(dbConfig);
    await pool.query('SELECT 1');
    mysqlPool = pool;
    mode = 'mysql';
    console.log(`[DB] Connected to MySQL database "${dbConfig.database}" at ${dbConfig.host}:${dbConfig.port}`);
    return mysqlPool;
  } catch (err) {
    console.warn(`[DB] MySQL unavailable (${err.code || err.message}). Using local SQL preview database.`);
    const adapter = await initSqlitePreviewDatabase();
    console.log('[DB] Preview SQL database ready (data/lifeflow_preview.sqlite).');
    return adapter;
  }
}

export async function getDb() {
  return initDatabase();
}

export function getDbMode() {
  return mode;
}
