import { getDb } from '../config/db.js';
import { VALID_BLOOD_GROUPS } from '../utils/validators.js';

export async function getAllInventory(req, res) {
  try {
    const db = await getDb();
    const [rows] = await db.execute(
      'SELECT id, blood_group, units_available, updated_at FROM blood_inventory'
    );

    const byGroup = new Map(rows.map((r) => [r.blood_group, r]));
    const ordered = VALID_BLOOD_GROUPS.map((group) => {
      const found = byGroup.get(group);
      return {
        id: found ? found.id : null,
        blood_group: group,
        units_available: found ? Number(found.units_available) : 0,
        updated_at: found ? found.updated_at : null,
      };
    });

    const totalUnits = ordered.reduce((sum, item) => sum + item.units_available, 0);

    return res.json({
      success: true,
      notice: 'Sample Demonstration Inventory – Not Live Hospital Stock.',
      totalUnits,
      inventory: ordered,
    });
  } catch (err) {
    console.error('getAllInventory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch blood inventory.' });
  }
}

export async function updateInventoryUnit(req, res) {
  try {
    const bloodGroup = decodeURIComponent(req.params.bloodGroup || '').trim();
    if (!VALID_BLOOD_GROUPS.includes(bloodGroup)) {
      return res.status(400).json({ success: false, message: 'Invalid blood group specified.' });
    }

    const mode = req.body.mode === 'add' ? 'add' : 'set';
    const rawUnits = Number(req.body.units);

    if (!Number.isInteger(rawUnits)) {
      return res.status(400).json({ success: false, message: 'Units must be a whole number.' });
    }

    const db = await getDb();
    const [existing] = await db.execute(
      'SELECT units_available FROM blood_inventory WHERE blood_group = ?',
      [bloodGroup]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Blood group record not found.' });
    }

    const currentUnits = Number(existing[0].units_available);
    const nextUnits = mode === 'add' ? currentUnits + rawUnits : rawUnits;

    if (nextUnits < 0 || nextUnits > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Resulting stock units must be between 0 and 10,000.',
      });
    }

    await db.execute(
      'UPDATE blood_inventory SET units_available = ?, updated_at = CURRENT_TIMESTAMP WHERE blood_group = ?',
      [nextUnits, bloodGroup]
    );

    return res.json({
      success: true,
      message: `Updated ${bloodGroup} stock to ${nextUnits} units.`,
      blood_group: bloodGroup,
      units_available: nextUnits,
    });
  } catch (err) {
    console.error('updateInventoryUnit error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update blood stock.' });
  }
}
