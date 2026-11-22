import { getDb } from '../config/db.js';
import {
  VALID_BLOOD_GROUPS,
  VALID_URGENCIES,
  isValidIndianPhone,
  normalizeIndianPhone,
  sanitizeText,
} from '../utils/validators.js';

export async function getPatientProfile(req, res) {
  try {
    const db = await getDb();
    const [rows] = await db.execute(
      'SELECT user_id, full_name, email, phone, role, account_status, created_at FROM users WHERE user_id = ?',
      [req.session.userId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Patient account not found.' });
    }
    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('getPatientProfile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load patient profile.' });
  }
}

export async function updatePatientProfile(req, res) {
  try {
    const fullName = sanitizeText(req.body.full_name, 120);
    const phoneDigits = normalizeIndianPhone(String(req.body.phone || ''));

    if (fullName.length < 2) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!isValidIndianPhone(phoneDigits)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
      });
    }

    const formattedPhone = `+91 ${phoneDigits}`;
    const db = await getDb();

    const [dup] = await db.execute('SELECT user_id FROM users WHERE phone = ? AND user_id != ?', [
      formattedPhone,
      req.session.userId,
    ]);
    if (dup.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This mobile number is already linked to another account.',
      });
    }

    await db.execute('UPDATE users SET full_name = ?, phone = ? WHERE user_id = ?', [
      fullName,
      formattedPhone,
      req.session.userId,
    ]);

    req.session.fullName = fullName;
    req.session.phone = formattedPhone;

    return res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('updatePatientProfile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update patient profile.' });
  }
}

export async function getMyBloodRequests(req, res) {
  try {
    const db = await getDb();
    const [rows] = await db.execute(
      `SELECT id, patient_name, requester_name, phone, blood_group,
              units_required, hospital_name, location, urgency, status,
              created_at, updated_at
       FROM blood_requests
       WHERE patient_user_id = ?
       ORDER BY id DESC`,
      [req.session.userId]
    );

    return res.json({ success: true, requests: rows });
  } catch (err) {
    console.error('getMyBloodRequests error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load your blood requests.' });
  }
}

export async function createPatientBloodRequest(req, res) {
  try {
    const patientName = sanitizeText(req.body.patient_name, 120);
    const requesterName = sanitizeText(req.body.requester_name || req.session.fullName || '', 120);
    const phoneDigits = normalizeIndianPhone(String(req.body.phone || req.session.phone || ''));
    const bloodGroup = sanitizeText(req.body.blood_group, 5);
    const unitsRequired = Number(req.body.units_required);
    const hospitalName = sanitizeText(req.body.hospital_name, 160);
    const location = sanitizeText(req.body.location, 160);
    const urgency = sanitizeText(req.body.urgency || 'Normal', 20);

    if (patientName.length < 2) {
      return res.status(400).json({ success: false, message: 'Patient name is required.' });
    }
    if (requesterName.length < 2) {
      return res.status(400).json({ success: false, message: 'Requester name is required.' });
    }
    if (!isValidIndianPhone(phoneDigits)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
      });
    }
    if (!VALID_BLOOD_GROUPS.includes(bloodGroup)) {
      return res.status(400).json({ success: false, message: 'Please select a valid blood group.' });
    }
    if (!Number.isInteger(unitsRequired) || unitsRequired < 1 || unitsRequired > 20) {
      return res.status(400).json({ success: false, message: 'Units required must be between 1 and 20.' });
    }
    if (hospitalName.length < 2 || location.length < 2) {
      return res.status(400).json({ success: false, message: 'Hospital name and location are required.' });
    }
    if (!VALID_URGENCIES.includes(urgency)) {
      return res.status(400).json({ success: false, message: 'Invalid urgency level.' });
    }

    const db = await getDb();
    const [result] = await db.execute(
      `INSERT INTO blood_requests
       (patient_user_id, patient_name, requester_name, phone, blood_group, units_required, hospital_name, location, urgency, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [
        req.session.userId,
        patientName,
        requesterName,
        `+91 ${phoneDigits}`,
        bloodGroup,
        unitsRequired,
        hospitalName,
        location,
        urgency,
      ]
    );

    const requestId = result.insertId;
    await db.execute(
      `INSERT INTO request_history (request_id, old_status, new_status, changed_by, remarks)
       VALUES (?, NULL, 'Pending', ?, ?)`,
      [requestId, req.session.userId, 'Submitted from Patient Dashboard']
    );

    return res.status(201).json({
      success: true,
      message: 'Blood request submitted successfully with status Pending.',
      requestId,
      status: 'Pending',
    });
  } catch (err) {
    console.error('createPatientBloodRequest error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit blood request.' });
  }
}

export async function getMyRequestHistory(req, res) {
  try {
    const requestId = Number(req.params.id);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid request ID.' });
    }

    const db = await getDb();
    const [reqRows] = await db.execute(
      'SELECT id, patient_user_id FROM blood_requests WHERE id = ?',
      [requestId]
    );
    if (!reqRows.length || reqRows[0].patient_user_id !== req.session.userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorised to view history for this request.',
      });
    }

    const [history] = await db.execute(
      `SELECT id, request_id, old_status, new_status, remarks, changed_at
       FROM request_history
       WHERE request_id = ?
       ORDER BY id DESC`,
      [requestId]
    );

    return res.json({ success: true, history });
  } catch (err) {
    console.error('getMyRequestHistory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load request history.' });
  }
}
