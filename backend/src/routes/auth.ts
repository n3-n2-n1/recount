import express, { Router } from 'express';
import { login, register, getProfile, getAllUsers, updateUser, deleteUser } from '../controllers/authController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', authenticateToken, authorizeRoles('super_admin'), register);
router.get('/profile', authenticateToken, getProfile);
router.get('/users', authenticateToken, authorizeRoles('super_admin'), getAllUsers);
router.put('/users/:id', authenticateToken, authorizeRoles('super_admin'), updateUser);
router.delete('/users/:id', authenticateToken, authorizeRoles('super_admin'), deleteUser);

export default router;
