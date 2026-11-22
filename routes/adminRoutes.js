import express from 'express';
import {
  changeAdminPassword,
  getAdminSecurityOverview,
  getAllPatients,
  getDashboardStats,
  getPatientRequestsByAdmin,
  updateDonorByAdmin,
  updateUserAccountStatus,
} from '../controllers/adminController.js';
import { requireAdminApi } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAdminApi);

router.get('/stats', getDashboardStats);
router.get('/security', getAdminSecurityOverview);
router.get('/patients', getAllPatients);
router.get('/patients/:userId/requests', getPatientRequestsByAdmin);
router.put('/donors/:donorId', updateDonorByAdmin);
router.patch('/users/:userId/status', updateUserAccountStatus);
router.patch('/password', changeAdminPassword);

export default router;
