import express from 'express';
import {
  getAllDonors,
  getDonorRequestsFeed,
  getMyDonorProfile,
  registerDonor,
  updateMyDonorProfile,
} from '../controllers/donorController.js';
import { requireAdminApi, requireDonorApi } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', registerDonor);
router.get('/', requireAdminApi, getAllDonors);

router.get('/me/profile', requireDonorApi, getMyDonorProfile);
router.put('/me/profile', requireDonorApi, updateMyDonorProfile);
router.get('/me/requests', requireDonorApi, getDonorRequestsFeed);

export default router;
