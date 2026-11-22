import { getDb } from '../config/db.js';
import {
  VALID_BLOOD_GROUPS,
  VALID_STATUSES,
  VALID_URGENCIES,
  isValidIndianPhone,
  normalizeIndianPhone,
  sanitizeText,
} from '../utils/validators.js';

export async function createBloodRequest(req, res) {
  try {
    const patientName = sanitizeText(req.body.patient_name, 120);
    const requesterName = sanitizeText(req.body.requester_name, 120);
    const phone = normalizeIndianPhone(String(req.body.phone || ''));
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
    if (!isValidIndianPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
      });
    }
    if (!VALID_BLOOD_GROUPS.includes(bloodGroup)) {
      return res.status(400).json({ success: false, message: 'Please select a valid blood group.' });
    }
    if (!Number.isInteger(unitsRequired) || unitsRequired < 1 || unitsRequired > 20) {
      return res.status(400).json({
        success: false,
        message: 'Units required must be a whole number between 1 and 20.',
      });
    }
    if (hospitalName.length < 2) {
      return res.status(400).json({ success: false, message: 'Hospital name is required.' });
    }
    if (location.length < 2) {
      return res.status(400).json({ success: false, message: 'Hospital location/city is required.' });
    }
    if (!VALID_URGENCIES.includes(urgency)) {
      return res.status(400).json({ success: false, message: 'Invalid urgency level.' });
    }

    const patientUserId =
      req.session?.userId && req.session?.role === 'patient' ? req.session.userId : null;

    const db = await getDb();
    const [result] = await db.execute(
      `INSERT INTO blood_requests
       (patient_user_id, patient_name, requester_name, phone, blood_group, units_required, hospital_name, location, urgency, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [
        patientUserId,
        patientName,
        requesterName,
        `+91 ${phone}`,
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
      [requestId, patientUserId, 'Request submitted via LifeFlow portal']
    );

    return res.status(201).json({
      success: true,
      message: 'Blood request submitted successfully with status Pending.',
      requestId,
      status: 'Pending',
    });
  } catch (err) {
    console.error('createBloodRequest error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit blood request. Please try again.',
    });
  }
}

export async function getAllRequests(req, res) {
  try {
    const bloodGroup = sanitizeText(req.query.blood_group || '', 5);
    const urgency = sanitizeText(req.query.urgency || '', 20);
    const status = sanitizeText(req.query.status || '', 20);

    const conditions = [];
    const params = [];

    if (bloodGroup && VALID_BLOOD_GROUPS.includes(bloodGroup)) {
      conditions.push('blood_group = ?');
      params.push(bloodGroup);
    }
    if (urgency && VALID_URGENCIES.includes(urgency)) {
      conditions.push('urgency = ?');
      params.push(urgency);
    }
    if (status && VALID_STATUSES.includes(status)) {
      conditions.push('status = ?');
      params.push(status);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const db = await getDb();
    const [rows] = await db.execute(
      `SELECT id, patient_user_id, patient_name, requester_name, phone, blood_group,
              units_required, hospital_name, location, urgency, status, created_at, updated_at
       FROM blood_requests
       ${whereClause}
       ORDER BY id DESC`,
      params
    );

    return res.json({ success: true, requests: rows });
  } catch (err) {
    console.error('getAllRequests error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load blood requests.' });
  }
}

export async function updateRequestStatus(req, res) {
  try {
    const requestId = Number(req.params.id);
    const nextStatus = sanitizeText(req.body.status, 20);
    const remarks = sanitizeText(req.body.remarks || '', 255);

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid request ID.' });
    }
    if (!VALID_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Pending, Approved, Rejected, or Fulfilled.',
      });
    }

    const db = await getDb();
    const [rows] = await db.execute('SELECT id, status, blood_group, units_required FROM blood_requests WHERE id = ?', [
      requestId,
    ]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Blood request not found.' });
    }

    const oldStatus = rows[0].status;
    const bloodGroup = rows[0].blood_group;
    const unitsRequired = Number(rows[0].units_required || 0);

    if (oldStatus !== 'Fulfilled' && nextStatus === 'Fulfilled') {
      await db.execute(
        'UPDATE blood_inventory SET units_available = CASE WHEN units_available >= ? THEN units_available - ? ELSE 0 END WHERE blood_group = ?',
        [unitsRequired, unitsRequired, bloodGroup]
      );
    } else if (oldStatus === 'Fulfilled' && nextStatus !== 'Fulfilled') {
      await db.execute(
        'UPDATE blood_inventory SET units_available = units_available + ? WHERE blood_group = ?',
        [unitsRequired, bloodGroup]
      );
    }

    await db.execute(
      'UPDATE blood_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [nextStatus, requestId]
    );

    await db.execute(
      `INSERT INTO request_history (request_id, old_status, new_status, changed_by, remarks)
       VALUES (?, ?, ?, ?, ?)`,
      [
        requestId,
        oldStatus,
        nextStatus,
        req.session?.userId || null,
        remarks || `Status updated from ${oldStatus} to ${nextStatus}`,
      ]
    );

    return res.json({
      success: true,
      message: `Request #${requestId} updated to ${nextStatus}.`,
      requestId,
      oldStatus,
      newStatus: nextStatus,
    });
  } catch (err) {
    console.error('updateRequestStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update request status.' });
  }
}

export async function getRequestHistory(req, res) {
  try {
    const db = await getDb();
    const [rows] = await db.execute(
      `SELECT rh.id, rh.request_id, rh.old_status, rh.new_status, rh.remarks, rh.changed_at,
              br.patient_name, br.blood_group, COALESCE(u.username, u.full_name) AS actor_name, u.role AS actor_role
       FROM request_history rh
       LEFT JOIN blood_requests br ON rh.request_id = br.id
       LEFT JOIN users u ON rh.changed_by = u.user_id
       ORDER BY rh.id DESC
       LIMIT 100`
    );

    return res.json({ success: true, history: rows });
  } catch (err) {
    console.error('getRequestHistory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch request history.' });
  }
}
