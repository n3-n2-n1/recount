import express from 'express';
import {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount
} from '../controllers/accountController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, getAccounts);
router.get('/:id', authenticateToken, getAccount);
router.post('/', authenticateToken, authorizeRoles('super_admin', 'reviewer'), createAccount);
router.put('/:id', authenticateToken, authorizeRoles('super_admin', 'reviewer'), updateAccount);
router.delete('/:id', authenticateToken, authorizeRoles('super_admin'), deleteAccount);

export default router;
