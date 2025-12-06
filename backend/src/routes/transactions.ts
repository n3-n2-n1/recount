import express from 'express';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction
} from '../controllers/transactionController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, getTransactions);
router.post('/', authenticateToken, authorizeRoles('super_admin', 'reviewer'), createTransaction);
router.put('/:id', authenticateToken, authorizeRoles('super_admin', 'reviewer'), updateTransaction);
router.delete('/:id', authenticateToken, authorizeRoles('super_admin'), deleteTransaction);

export default router;
