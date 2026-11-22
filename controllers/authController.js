import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getDb } from '../config/db.js';
import {
  clearSessionCookie,
  createUserSession,
  destroySessionToken,
  setSessionCookie,
} from '../config/sessionStore.js';
import {
  INDIAN_STATES_AND_UTS,
  VALID_BLOOD_GROUPS,
  VALID_GENDERS,
  isValidEmail,
  isValidIndianPhone,
  isValidIndianPin,
  normalizeIndianPhone,
  sanitizeText,
} from '../utils/validators.js';

function getConfiguredAdminCreds() {
  const username = sanitizeText(process.env.LIFEFLOW_ADMIN_USERNAME || '', 60).toLowerCase();
  const password = String(process.env.LIFEFLOW_ADMIN_PASSWORD || '');
  if (username && password) {
    return { username, password };
  }
  return null;
}

function timingSafeMatch(a, b) {
  const digestA = crypto.createHash('sha256').update(String(a)).digest();
  const digestB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

function issueUserSession(req, res, user) {
  if (req.sessionToken) {
    destroySessionToken(req.sessionToken);
  }
  const { token, sessionData } = createUserSession(user);
  req.session = sessionData;
  req.sessionToken = token;
  setSessionCookie(req, res, token);
  return token;
}

export async function getSetupStatus(req, res) {
  try {
    if (getConfiguredAdminCreds()) {
      return res.json({ success: true, hasAdmin: true });
    }
    const db = await getDb();
    const [rows] = await db.execute("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
    const count = Number(rows[0]?.count || 0);
    return res.json({ success: true, hasAdmin: count > 0 });
  } catch (err) {
    console.error('getSetupStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to check admin setup status.' });
  }
}

export async function setupFirstAdmin(req, res) {
  try {
    if (getConfiguredAdminCreds()) {
      return res.status(403).json({
        success: false,
        message: 'Administrator credentials are already configured.',
      });
    }

    const db = await getDb();
    const [existingRows] = await db.execute("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
    if (Number(existingRows[0]?.count || 0) > 0) {
      return res.status(403).json({
        success: false,
        message: 'An administrator account already exists. Please sign in with your username and password.',
      });
    }

    const username = sanitizeText(req.body.username || '', 60).toLowerCase();
    const password = String(req.body.password || '');

    if (!/^[a-z0-9_.-]{3,30}$/.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username must be 3–30 characters using letters, numbers, dots, hyphens, or underscores.',
      });
    }
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    const [dupRows] = await db.execute('SELECT user_id FROM users WHERE LOWER(username) = ?', [username]);
    if (dupRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Username is already in use.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await db.execute(
      `INSERT INTO users (username, full_name, email, phone, password_hash, role, account_status)
       VALUES (?, 'Administrator', NULL, NULL, ?, 'admin', 'active')`,
      [username, passwordHash]
    );

    const newUser = {
      user_id: result.insertId,
      username,
      full_name: 'Administrator',
      email: null,
      phone: null,
      role: 'admin',
      account_status: 'active',
    };
    const token = issueUserSession(req, res, newUser);

    return res.status(201).json({
      success: true,
      message: 'Administrator account created and signed in.',
      token,
      user: {
        user_id: newUser.user_id,
        username,
        fullName: newUser.full_name,
        role: 'admin',
      },
    });
  } catch (err) {
    console.error('setupFirstAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Unable to create administrator account.' });
  }
}

export async function registerDonorAccount(req, res) {
  try {
    const fullName = sanitizeText(req.body.full_name, 120);
    const age = Number(req.body.age);
    const gender = sanitizeText(req.body.gender, 20);
    const bloodGroup = sanitizeText(req.body.blood_group, 5);
    const phoneDigits = normalizeIndianPhone(String(req.body.phone || ''));
    const email = sanitizeText(req.body.email, 120).toLowerCase();
    const houseStreet = sanitizeText(req.body.house_street, 200);
    const area = sanitizeText(req.body.area, 120);
    const city = sanitizeText(req.body.city, 100);
    const district = sanitizeText(req.body.district, 100);
    const state = sanitizeText(req.body.state, 80);
    const pinCode = sanitizeText(req.body.pin_code, 6);
    const password = String(req.body.password || '');

    if (fullName.length < 2) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!Number.isInteger(age) || age < 18 || age > 65) {
      return res.status(400).json({
        success: false,
        message: 'Donor age must be between 18 and 65 years.',
      });
    }
    if (!VALID_GENDERS.includes(gender)) {
      return res.status(400).json({ success: false, message: 'Please select a valid gender.' });
    }
    if (!VALID_BLOOD_GROUPS.includes(bloodGroup)) {
      return res.status(400).json({ success: false, message: 'Please select a valid blood group.' });
    }
    if (!isValidIndianPhone(phoneDigits)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
      });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    if (!houseStreet || !area || !city || !district) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in House/Street, Area, City, and District.',
      });
    }
    if (!INDIAN_STATES_AND_UTS.includes(state)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid Indian State or Union Territory.',
      });
    }
    if (!isValidIndianPin(pinCode)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit Indian PIN code.',
      });
    }
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    const formattedPhone = `+91 ${phoneDigits}`;
    const db = await getDb();
    const [existing] = await db.execute('SELECT user_id FROM users WHERE email = ? OR phone = ?', [
      email,
      formattedPhone,
    ]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email or mobile number already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [userRes] = await db.execute(
      `INSERT INTO users (username, full_name, email, phone, password_hash, role, account_status)
       VALUES (NULL, ?, ?, ?, ?, 'donor', 'active')`,
      [fullName, email, formattedPhone, passwordHash]
    );

    const userId = userRes.insertId;
    await db.execute(
      `INSERT INTO donors
       (user_id, full_name, age, gender, blood_group, phone, email, house_street, area, city, district, state, pin_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        fullName,
        age,
        gender,
        bloodGroup,
        formattedPhone,
        email,
        houseStreet,
        area,
        city,
        district,
        state,
        pinCode,
      ]
    );

    const token = issueUserSession(req, res, {
      user_id: userId,
      username: null,
      full_name: fullName,
      email,
      phone: formattedPhone,
      role: 'donor',
      account_status: 'active',
    });

    return res.status(201).json({
      success: true,
      message: 'Donor account created successfully.',
      token,
      redirectUrl: '/donor-dashboard.html',
    });
  } catch (err) {
    console.error('registerDonorAccount error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create donor account.' });
  }
}

export async function registerPatientAccount(req, res) {
  try {
    const fullName = sanitizeText(req.body.full_name, 120);
    const phoneDigits = normalizeIndianPhone(String(req.body.phone || ''));
    const email = sanitizeText(req.body.email, 120).toLowerCase();
    const password = String(req.body.password || '');

    if (fullName.length < 2) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!isValidIndianPhone(phoneDigits)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
      });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    const formattedPhone = `+91 ${phoneDigits}`;
    const db = await getDb();
    const [existing] = await db.execute('SELECT user_id FROM users WHERE email = ? OR phone = ?', [
      email,
      formattedPhone,
    ]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email or mobile number already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [userRes] = await db.execute(
      `INSERT INTO users (username, full_name, email, phone, password_hash, role, account_status)
       VALUES (NULL, ?, ?, ?, ?, 'patient', 'active')`,
      [fullName, email, formattedPhone, passwordHash]
    );

    const token = issueUserSession(req, res, {
      user_id: userRes.insertId,
      username: null,
      full_name: fullName,
      email,
      phone: formattedPhone,
      role: 'patient',
      account_status: 'active',
    });

    return res.status(201).json({
      success: true,
      message: 'Patient account created successfully.',
      token,
      redirectUrl: '/patient-dashboard.html',
    });
  } catch (err) {
    console.error('registerPatientAccount error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create patient account.' });
  }
}

export function createRoleLoginHandler(expectedRole) {
  return async (req, res) => {
    try {
      const password = String(req.body.password || '');
      const db = await getDb();

      if (expectedRole === 'admin') {
        const username = sanitizeText(req.body.username || '', 60).toLowerCase();
        if (!username || !password) {
          return res.status(400).json({
            success: false,
            message: 'Please enter your username and password.',
          });
        }

        const envAdmin = getConfiguredAdminCreds();
        if (envAdmin && username === envAdmin.username) {
          if (!timingSafeMatch(password, envAdmin.password)) {
            return res.status(401).json({
              success: false,
              message: 'Invalid username or password.',
            });
          }

          const [existingAdminRows] = await db.execute(
            `SELECT user_id, username, full_name, email, phone, role, account_status
             FROM users
             WHERE role = 'admin' AND LOWER(username) = ?`,
            [envAdmin.username]
          );

          let adminUser = existingAdminRows[0];
          if (!adminUser) {
            const passwordHash = await bcrypt.hash(envAdmin.password, 12);
            const [insertRes] = await db.execute(
              `INSERT INTO users (username, full_name, email, phone, password_hash, role, account_status)
               VALUES (?, 'Administrator', NULL, NULL, ?, 'admin', 'active')`,
              [envAdmin.username, passwordHash]
            );
            adminUser = {
              user_id: insertRes.insertId,
              username: envAdmin.username,
              full_name: 'Administrator',
              email: null,
              phone: null,
              role: 'admin',
              account_status: 'active',
            };
          }

          const token = issueUserSession(req, res, adminUser);
          return res.json({
            success: true,
            message: 'Login successful.',
            token,
            redirectUrl: '/admin-dashboard.html',
            user: {
              user_id: adminUser.user_id,
              role: 'admin',
              fullName: adminUser.full_name,
              username: adminUser.username,
            },
          });
        }

        const [adminRows] = await db.execute(
          `SELECT user_id, username, full_name, email, phone, password_hash, role, account_status
           FROM users
           WHERE role = 'admin' AND LOWER(username) = ?`,
          [username]
        );

        if (!adminRows || adminRows.length === 0) {
          return res.status(401).json({
            success: false,
            message: 'Invalid username or password.',
          });
        }

        const adminUser = adminRows[0];
        const matches = await bcrypt.compare(password, adminUser.password_hash);
        if (!matches) {
          return res.status(401).json({
            success: false,
            message: 'Invalid username or password.',
          });
        }

        if (adminUser.account_status === 'rejected') {
          return res.status(403).json({
            success: false,
            message: 'Your account has been deactivated.',
          });
        }

        const token = issueUserSession(req, res, adminUser);
        return res.json({
          success: true,
          message: 'Login successful.',
          token,
          redirectUrl: '/admin-dashboard.html',
          user: {
            user_id: adminUser.user_id,
            role: 'admin',
            fullName: adminUser.full_name,
            username: adminUser.username,
          },
        });
      }

      const rawIdentifier = sanitizeText(req.body.identifier || req.body.email || '', 120);
      if (!rawIdentifier || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please enter your login credentials and password.',
        });
      }

      // Donor or Patient: email OR 10-digit Indian mobile number
      const emailKey = rawIdentifier.toLowerCase();
      const digits = normalizeIndianPhone(rawIdentifier);
      const formattedPhone = isValidIndianPhone(digits) ? `+91 ${digits}` : '__no_phone__';

      const [rows] = await db.execute(
        `SELECT user_id, username, full_name, email, phone, password_hash, role, account_status
         FROM users
         WHERE role = ? AND (email = ? OR phone = ?)`,
        [expectedRole, emailKey, formattedPhone]
      );

      if (!rows || rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid login credentials.',
        });
      }

      const user = rows[0];
      const matches = await bcrypt.compare(password, user.password_hash);
      if (!matches) {
        return res.status(401).json({
          success: false,
          message: 'Invalid login credentials.',
        });
      }

      if (user.account_status === 'pending') {
        return res.status(403).json({
          success: false,
          message: 'Your account is pending administrator approval.',
        });
      }

      if (user.account_status === 'rejected') {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated by an administrator.',
        });
      }

      const token = issueUserSession(req, res, user);

      const redirectMap = {
        donor: '/donor-dashboard.html',
        patient: '/patient-dashboard.html',
        admin: '/admin-dashboard.html',
      };

      return res.json({
        success: true,
        message: 'Login successful.',
        token,
        redirectUrl: redirectMap[user.role],
        user: {
          user_id: user.user_id,
          role: user.role,
          fullName: user.full_name,
          email: user.email,
          username: user.username,
        },
      });
    } catch (err) {
      console.error(`login (${expectedRole}) error:`, err);
      return res.status(500).json({ success: false, message: 'Login failed due to a server error.' });
    }
  };
}

export const login = createRoleLoginHandler('admin');

export function logout(req, res) {
  if (req.sessionToken) {
    destroySessionToken(req.sessionToken);
  }
  clearSessionCookie(req, res);
  return res.json({ success: true, message: 'Logged out successfully.' });
}

export function getCurrentUser(req, res) {
  if (!req.session || !req.session.userId) {
    return res.json({ success: true, authenticated: false });
  }

  const user = {
    user_id: req.session.userId,
    role: req.session.role,
    username: req.session.username || null,
    fullName: req.session.fullName,
    email: req.session.email,
    phone: req.session.phone || null,
    accountStatus: req.session.accountStatus,
  };

  return res.json({
    success: true,
    authenticated: true,
    user,
    admin: req.session.role === 'admin' ? user : null,
  });
}
