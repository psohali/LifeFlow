import express from 'express';
import {
  createPatientBloodRequest,
  getMyBloodRequests,
  getMyRequestHistory,
  getPatientProfile,
  updatePatientProfile,
} from '../controllers/patientController.js';
import { requirePatientApi } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requirePatientApi);

router.get('/profile', getPatientProfile);
router.put('/profile', updatePatientProfile);
router.get('/requests', getMyBloodRequests);
router.post('/requests', createPatientBloodRequest);
router.get('/requests/:id/history', getMyRequestHistory);

export default router;
