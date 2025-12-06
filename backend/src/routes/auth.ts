import express, { Router } from 'express';
import { login, register, getProfile, getAllUsers } from '../controllers/authController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', authenticateToken, authorizeRoles('super_admin'), register);
router.get('/profile', authenticateToken, getProfile);
router.get('/users', authenticateToken, authorizeRoles('super_admin'), getAllUsers);

export default router;
