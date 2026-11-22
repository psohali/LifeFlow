import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import readline from 'readline';
import { initDatabase } from './config/db.js';
import { isValidEmail, sanitizeText } from './utils/validators.js';

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
    const fullNameRaw = await ask('Enter full name: ');
    const emailRaw = await ask('Enter email address: ');
    const password = await ask('Enter password (min 8 characters): ');
    const confirmPassword = await ask('Confirm password: ');

    const username = sanitizeText(usernameRaw, 60).toLowerCase();
    const fullName = sanitizeText(fullNameRaw, 120);
    const email = sanitizeText(emailRaw, 120).toLowerCase();

    if (!/^[a-z0-9_.-]{3,30}$/.test(username)) {
      console.error('Error: Username must be 3-30 characters (letters, numbers, ., -, _).');
      process.exitCode = 1;
      return;
    }

    if (fullName.length < 2) {
      console.error('Error: Full name is required.');
      process.exitCode = 1;
      return;
    }

    if (!isValidEmail(email)) {
      console.error('Error: Invalid email address.');
      process.exitCode = 1;
      return;
    }

    if (password.length < 8) {
      console.error('Error: Password must be at least 8 characters long.');
      process.exitCode = 1;
      return;
    }

    if (password !== confirmPassword) {
      console.error('Error: Passwords do not match.');
      process.exitCode = 1;
      return;
    }

    const [existing] = await db.execute(
      'SELECT user_id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing && existing.length > 0) {
      console.error('Error: An account with that username or email already exists.');
      process.exitCode = 1;
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await db.execute(
      `INSERT INTO users (username, full_name, email, phone, password_hash, role, account_status)
       VALUES (?, ?, ?, NULL, ?, 'admin', 'active')`,
      [username, fullName, email, passwordHash]
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
