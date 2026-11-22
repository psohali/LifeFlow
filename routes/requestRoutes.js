import express from 'express';
import {
  createBloodRequest,
  getAllRequests,
  getRequestHistory,
  updateRequestStatus,
} from '../controllers/requestController.js';
import { requireAdminApi } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', createBloodRequest);
router.get('/', requireAdminApi, getAllRequests);
router.get('/history', requireAdminApi, getRequestHistory);
router.patch('/:id/status', requireAdminApi, updateRequestStatus);

export default router;
