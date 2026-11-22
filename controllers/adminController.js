import { getDb } from '../config/db.js';
import { sanitizeText } from '../utils/validators.js';

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
