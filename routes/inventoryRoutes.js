import express from 'express';
import { getAllInventory, updateInventoryUnit } from '../controllers/inventoryController.js';
import { requireAdminApi } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getAllInventory);
router.put('/:bloodGroup', requireAdminApi, updateInventoryUnit);

export default router;
