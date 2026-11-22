import bcrypt from 'bcrypt';
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

export async function getDashboardStats(req, res) {
  try {
    const db = await getDb();
    const [[donorRow]] = await db.execute('SELECT COUNT(*) AS totalDonors FROM donors');
    const [[patientRow]] = await db.execute(
      "SELECT COUNT(*) AS totalPatients FROM users WHERE role = 'patient'"
    );
    const [[requestRow]] = await db.execute('SELECT COUNT(*) AS totalRequests FROM blood_requests');
    const [[pendingRow]] = await db.execute(
      "SELECT COUNT(*) AS pendingRequests FROM blood_requests WHERE status = 'Pending'"
    );
    const [[approvedRow]] = await db.execute(
      "SELECT COUNT(*) AS approvedRequests FROM blood_requests WHERE status = 'Approved'"
    );
    const [[fulfilledRow]] = await db.execute(
      "SELECT COUNT(*) AS fulfilledRequests FROM blood_requests WHERE status = 'Fulfilled'"
    );
    const [[inventoryRow]] = await db.execute(
      'SELECT COALESCE(SUM(units_available), 0) AS availableUnits FROM blood_inventory'
    );

    return res.json({
      success: true,
      stats: {
        totalDonors: Number(donorRow?.totalDonors || 0),
        totalPatients: Number(patientRow?.totalPatients || 0),
        totalRequests: Number(requestRow?.totalRequests || 0),
        pendingRequests: Number(pendingRow?.pendingRequests || 0),
        approvedRequests: Number(approvedRow?.approvedRequests || 0),
        fulfilledRequests: Number(fulfilledRow?.fulfilledRequests || 0),
        availableUnits: Number(inventoryRow?.availableUnits || 0),
      },
    });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard statistics.' });
  }
}

export async function getAllPatients(req, res) {
  try {
    const db = await getDb();
    const [rows] = await db.execute(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.account_status, u.created_at,
              COUNT(br.id) AS request_count
       FROM users u
       LEFT JOIN blood_requests br ON br.patient_user_id = u.user_id
       WHERE u.role = 'patient'
       GROUP BY u.user_id, u.full_name, u.email, u.phone, u.account_status, u.created_at
       ORDER BY u.user_id DESC`
    );

    return res.json({ success: true, patients: rows });
  } catch (err) {
    console.error('getAllPatients error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch patient accounts.' });
  }
}

export async function getPatientRequestsByAdmin(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid patient user ID.' });
    }

    const db = await getDb();
    const [userRows] = await db.execute(
      "SELECT user_id, full_name, email, phone, account_status FROM users WHERE user_id = ? AND role = 'patient'",
      [userId]
    );
    if (!userRows.length) {
      return res.status(404).json({ success: false, message: 'Patient account not found.' });
    }

    const [requests] = await db.execute(
      `SELECT id, patient_name, requester_name, phone, blood_group, units_required,
              hospital_name, location, urgency, status, created_at
       FROM blood_requests
       WHERE patient_user_id = ?
       ORDER BY id DESC`,
      [userId]
    );

    return res.json({ success: true, patient: userRows[0], requests });
  } catch (err) {
    console.error('getPatientRequestsByAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch patient requests.' });
  }
}

export async function updateDonorByAdmin(req, res) {
  try {
    const donorId = Number(req.params.donorId);
    if (!Number.isInteger(donorId) || donorId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid donor ID.' });
    }

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

    if (fullName.length < 2) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!Number.isInteger(age) || age < 18 || age > 65) {
      return res.status(400).json({ success: false, message: 'Donor age must be between 18 and 65.' });
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
      return res.status(400).json({ success: false, message: 'Please enter a valid 6-digit PIN code.' });
    }

    const db = await getDb();
    const [existingRows] = await db.execute('SELECT id, user_id FROM donors WHERE id = ?', [donorId]);
    if (!existingRows.length) {
      return res.status(404).json({ success: false, message: 'Donor record not found.' });
    }

    const formattedPhone = `+91 ${phoneDigits}`;
    const linkedUserId = existingRows[0].user_id;

    if (linkedUserId) {
      const [dupRows] = await db.execute(
        'SELECT user_id FROM users WHERE (email = ? OR phone = ?) AND user_id != ?',
        [email, formattedPhone, linkedUserId]
      );
      if (dupRows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'This email or mobile number is already used by another account.',
        });
      }

      await db.execute('UPDATE users SET full_name = ?, email = ?, phone = ? WHERE user_id = ?', [
        fullName,
        email,
        formattedPhone,
        linkedUserId,
      ]);
    }

    await db.execute(
      `UPDATE donors
       SET full_name = ?, age = ?, gender = ?, blood_group = ?, phone = ?, email = ?,
           house_street = ?, area = ?, city = ?, district = ?, state = ?, pin_code = ?
       WHERE id = ?`,
      [
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
        donorId,
      ]
    );

    return res.json({
      success: true,
      message: `Donor #${donorId} (${fullName}) updated successfully.`,
    });
  } catch (err) {
    console.error('updateDonorByAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update donor details.' });
  }
}

export async function updateUserAccountStatus(req, res) {
  try {
    const targetUserId = Number(req.params.userId);
    const accountStatus = sanitizeText(req.body.account_status, 20).toLowerCase();

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }
    if (!['active', 'rejected'].includes(accountStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Account status must be active or rejected.',
      });
    }

    const db = await getDb();
    const [rows] = await db.execute('SELECT user_id, role, full_name FROM users WHERE user_id = ?', [
      targetUserId,
    ]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (rows[0].role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Administrator account status cannot be modified here.',
      });
    }

    await db.execute('UPDATE users SET account_status = ? WHERE user_id = ?', [
      accountStatus,
      targetUserId,
    ]);

    return res.json({
      success: true,
      message: `Account for ${rows[0].full_name} set to ${accountStatus}.`,
    });
  } catch (err) {
    console.error('updateUserAccountStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update account status.' });
  }
}

export async function changeAdminPassword(req, res) {
  try {
    const currentPassword = String(req.body.current_password || '');
    const newPassword = String(req.body.new_password || '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please enter both your current password and new password.',
      });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.',
      });
    }

    const envUsername = sanitizeText(process.env.LIFEFLOW_ADMIN_USERNAME || '', 60).toLowerCase();
    const envPassword = String(process.env.LIFEFLOW_ADMIN_PASSWORD || '');
    if (envUsername && envPassword && req.session?.username === envUsername) {
      return res.status(400).json({
        success: false,
        message:
          'This admin login uses LIFEFLOW_ADMIN_PASSWORD from environment settings. Update it in Secrets or .env.',
      });
    }

    const db = await getDb();
    const [rows] = await db.execute(
      "SELECT user_id, password_hash FROM users WHERE user_id = ? AND role = 'admin'",
      [req.session.userId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Administrator account not found.' });
    }

    const matches = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!matches) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    const nextHash = await bcrypt.hash(newPassword, 12);
    await db.execute("UPDATE users SET password_hash = ? WHERE user_id = ? AND role = 'admin'", [
      nextHash,
      req.session.userId,
    ]);

    return res.json({
      success: true,
      message: 'Administrator password updated successfully.',
    });
  } catch (err) {
    console.error('changeAdminPassword error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update administrator password.' });
  }
}

export async function getAdminSecurityOverview(req, res) {
  try {
    const db = await getDb();
    const [adminRows] = await db.execute(
      `SELECT user_id, username, full_name, role, account_status, created_at
       FROM users
       WHERE user_id = ? AND role = 'admin'`,
      [req.session.userId]
    );
    const admin = adminRows[0] || {
      user_id: req.session.userId,
      username: req.session.username || 'Admin',
      full_name: req.session.fullName || 'Administrator',
      role: 'admin',
      account_status: 'active',
      created_at: null,
    };

    const [[activeDonorsRow]] = await db.execute(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'donor' AND account_status = 'active'"
    );
    const [[inactiveDonorsRow]] = await db.execute(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'donor' AND account_status != 'active'"
    );
    const [[activePatientsRow]] = await db.execute(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'patient' AND account_status = 'active'"
    );
    const [[inactivePatientsRow]] = await db.execute(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'patient' AND account_status != 'active'"
    );
    const [[adminActionsRow]] = await db.execute(
      `SELECT COUNT(*) AS count
       FROM request_history rh
       INNER JOIN users u ON rh.changed_by = u.user_id
       WHERE u.role = 'admin'`
    );

    return res.json({
      success: true,
      account: {
        userId: admin.user_id,
        username: admin.username,
        fullName: admin.full_name,
        role: admin.role,
        accountStatus: admin.account_status,
        createdAt: admin.created_at,
      },
      summary: {
        activeDonors: Number(activeDonorsRow?.count || 0),
        deactivatedDonors: Number(inactiveDonorsRow?.count || 0),
        activePatients: Number(activePatientsRow?.count || 0),
        deactivatedPatients: Number(inactivePatientsRow?.count || 0),
        adminActionsCount: Number(adminActionsRow?.count || 0),
      },
    });
  } catch (err) {
    console.error('getAdminSecurityOverview error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load security overview.' });
  }
}
