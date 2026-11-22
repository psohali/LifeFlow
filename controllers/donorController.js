import { getDb } from '../config/db.js';
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

export async function registerDonor(req, res) {
  try {
    const fullName = sanitizeText(req.body.full_name, 120);
    const age = Number(req.body.age);
    const gender = sanitizeText(req.body.gender, 20);
    const bloodGroup = sanitizeText(req.body.blood_group, 5);
    const phone = normalizeIndianPhone(String(req.body.phone || ''));
    const email = sanitizeText(req.body.email, 120).toLowerCase();
    const houseStreet = sanitizeText(req.body.house_street, 200);
    const area = sanitizeText(req.body.area, 120);
    const city = sanitizeText(req.body.city, 100);
    const district = sanitizeText(req.body.district, 100);
    const state = sanitizeText(req.body.state, 80);
    const pinCode = sanitizeText(req.body.pin_code, 6);

    if (fullName.length < 2) {
      return res.status(400).json({ success: false, message: 'Please enter your full name.' });
    }
    if (!Number.isInteger(age) || age < 18 || age > 65) {
      return res.status(400).json({
        success: false,
        message: 'Donor age must be between 18 and 65 years as per Indian blood donation guidelines.',
      });
    }
    if (!VALID_GENDERS.includes(gender)) {
      return res.status(400).json({ success: false, message: 'Please select a valid gender.' });
    }
    if (!VALID_BLOOD_GROUPS.includes(bloodGroup)) {
      return res.status(400).json({ success: false, message: 'Please select a valid blood group.' });
    }
    if (!isValidIndianPhone(phone)) {
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

    const db = await getDb();
    let linkedUserId = null;
    if (req.session?.userId && req.session?.role === 'donor') {
      const [existingProfile] = await db.execute('SELECT id FROM donors WHERE user_id = ?', [
        req.session.userId,
      ]);
      if (existingProfile.length === 0) {
        linkedUserId = req.session.userId;
      }
    }

    const [result] = await db.execute(
      `INSERT INTO donors
       (user_id, full_name, age, gender, blood_group, phone, email, house_street, area, city, district, state, pin_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        linkedUserId,
        fullName,
        age,
        gender,
        bloodGroup,
        `+91 ${phone}`,
        email,
        houseStreet,
        area,
        city,
        district,
        state,
        pinCode,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Thank you for registering as a voluntary blood donor with LifeFlow.',
      donorId: result.insertId,
    });
  } catch (err) {
    console.error('registerDonor error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to register donor. Please try again.',
    });
  }
}

export async function getAllDonors(req, res) {
  try {
    const db = await getDb();
    const [rows] = await db.execute(
      `SELECT d.id, d.user_id, d.full_name, d.age, d.gender, d.blood_group, d.phone, d.email,
              d.house_street, d.area, d.city, d.district, d.state, d.pin_code, d.created_at,
              u.account_status
       FROM donors d
       LEFT JOIN users u ON d.user_id = u.user_id
       ORDER BY d.id DESC`
    );

    return res.json({ success: true, donors: rows });
  } catch (err) {
    console.error('getAllDonors error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch donors.' });
  }
}

export async function getMyDonorProfile(req, res) {
  try {
    const db = await getDb();
    const [userRows] = await db.execute(
      `SELECT user_id, full_name, email, phone, role, account_status, created_at
       FROM users WHERE user_id = ?`,
      [req.session.userId]
    );
    if (!userRows.length) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    const [donorRows] = await db.execute(
      `SELECT id, user_id, full_name, age, gender, blood_group, phone, email,
              house_street, area, city, district, state, pin_code, created_at
       FROM donors WHERE user_id = ?`,
      [req.session.userId]
    );

    return res.json({
      success: true,
      user: userRows[0],
      donor: donorRows[0] || null,
    });
  } catch (err) {
    console.error('getMyDonorProfile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load donor profile.' });
  }
}

export async function updateMyDonorProfile(req, res) {
  try {
    const fullName = sanitizeText(req.body.full_name, 120);
    const age = Number(req.body.age);
    const gender = sanitizeText(req.body.gender, 20);
    const phoneDigits = normalizeIndianPhone(String(req.body.phone || ''));
    const houseStreet = sanitizeText(req.body.house_street, 200);
    const area = sanitizeText(req.body.area, 120);
    const city = sanitizeText(req.body.city, 100);
    const district = sanitizeText(req.body.district, 100);
    const state = sanitizeText(req.body.state, 80);
    const pinCode = sanitizeText(req.body.pin_code, 6);

    if (fullName.length < 2) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!Number.isInteger(age) || age < 18 || age > 65) {
      return res.status(400).json({ success: false, message: 'Age must be between 18 and 65.' });
    }
    if (!VALID_GENDERS.includes(gender)) {
      return res.status(400).json({ success: false, message: 'Please select a valid gender.' });
    }
    if (!isValidIndianPhone(phoneDigits)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
      });
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
      return res.status(400).json({ success: false, message: 'Please enter a valid 6-digit PIN code.' });
    }

    const formattedPhone = `+91 ${phoneDigits}`;
    const db = await getDb();

    const [dupPhone] = await db.execute(
      'SELECT user_id FROM users WHERE phone = ? AND user_id != ?',
      [formattedPhone, req.session.userId]
    );
    if (dupPhone.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This mobile number is already registered with another account.',
      });
    }

    await db.execute('UPDATE users SET full_name = ?, phone = ? WHERE user_id = ?', [
      fullName,
      formattedPhone,
      req.session.userId,
    ]);

    await db.execute(
      `UPDATE donors
       SET full_name = ?, age = ?, gender = ?, phone = ?, house_street = ?, area = ?, city = ?, district = ?, state = ?, pin_code = ?
       WHERE user_id = ?`,
      [fullName, age, gender, formattedPhone, houseStreet, area, city, district, state, pinCode, req.session.userId]
    );

    req.session.fullName = fullName;
    req.session.phone = formattedPhone;

    return res.json({
      success: true,
      message: 'Donor profile updated successfully.',
    });
  } catch (err) {
    console.error('updateMyDonorProfile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update donor profile.' });
  }
}

export async function getDonorRequestsFeed(req, res) {
  try {
    const db = await getDb();
    const [donorRows] = await db.execute('SELECT blood_group, city, state FROM donors WHERE user_id = ?', [
      req.session.userId,
    ]);
    const donorGroup = donorRows[0]?.blood_group || null;

    // Non-PII summary only: never expose patient_name, requester_name, or phone to other users
    const [rows] = await db.execute(
      `SELECT id, blood_group, units_required, hospital_name, location, urgency, status, created_at
       FROM blood_requests
       WHERE status IN ('Pending', 'Approved')
       ORDER BY id DESC
       LIMIT 25`
    );

    const matchingRequests = donorGroup ? rows.filter((r) => r.blood_group === donorGroup) : rows;

    return res.json({
      success: true,
      donorBloodGroup: donorGroup,
      matchingRequests,
      allActiveRequestsCount: rows.length,
    });
  } catch (err) {
    console.error('getDonorRequestsFeed error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load donation request feed.' });
  }
}
