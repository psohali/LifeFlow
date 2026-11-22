import express from 'express';
import {
  createRoleLoginHandler,
  getCurrentUser,
  getSetupStatus,
  logout,
  registerDonorAccount,
  registerPatientAccount,
  setupFirstAdmin,
} from '../controllers/authController.js';

const router = express.Router();

// Admin setup & login
router.get('/setup-status', getSetupStatus);
router.post('/setup-admin', setupFirstAdmin);
router.post('/login', createRoleLoginHandler('admin'));
router.post('/admin/login', createRoleLoginHandler('admin'));

// Donor registration & login
router.post('/donor/register', registerDonorAccount);
router.post('/donor/login', createRoleLoginHandler('donor'));

// Patient registration & login
router.post('/patient/register', registerPatientAccount);
router.post('/patient/login', createRoleLoginHandler('patient'));

// Shared session routes
router.post('/logout', logout);
router.get('/me', getCurrentUser);

export default router;
