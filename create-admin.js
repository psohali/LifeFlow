import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import readline from 'readline';
import { initDatabase } from './config/db.js';
import { sanitizeText } from './utils/validators.js';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

async function createAdmin() {
  console.log('\n=== LifeFlow – Create Administrator Account ===\n');

  try {
    const db = await initDatabase();

    const usernameRaw = await ask('Enter admin username (3-30 chars, lowercase): ');
    const password = await ask('Enter password (min 8 characters): ');

    const username = sanitizeText(usernameRaw, 60).toLowerCase();

    if (!/^[a-z0-9_.-]{3,30}$/.test(username)) {
      console.error('Error: Username must be 3-30 characters (letters, numbers, ., -, _).');
      process.exitCode = 1;
      return;
    }

    if (password.length < 8) {
      console.error('Error: Password must be at least 8 characters long.');
      process.exitCode = 1;
      return;
    }

    const [existing] = await db.execute(
      'SELECT user_id FROM users WHERE username = ?',
      [username]
    );

    if (existing && existing.length > 0) {
      console.error('Error: An account with that username already exists.');
      process.exitCode = 1;
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await db.execute(
      `INSERT INTO users (username, full_name, email, phone, password_hash, role, account_status)
       VALUES (?, 'Administrator', NULL, NULL, ?, 'admin', 'active')`,
      [username, passwordHash]
    );

    console.log(`\nSuccess! Administrator "${username}" created (User ID: ${result.insertId}).`);
    console.log('You can now sign in at http://localhost:3000/admin-login.html\n');
  } catch (err) {
    console.error('Failed to create administrator:', err.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    process.exit();
  }
}

createAdmin();
