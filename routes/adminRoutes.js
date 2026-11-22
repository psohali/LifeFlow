import express from 'express';
import {
  getAllPatients,
  getDashboardStats,
  updateUserAccountStatus,
} from '../controllers/adminController.js';
import { requireAdminApi } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAdminApi);

router.get('/stats', getDashboardStats);
router.get('/patients', getAllPatients);
router.patch('/users/:userId/status', updateUserAccountStatus);

export default router;
