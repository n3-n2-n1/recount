import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getFees,
  createFee,
  updateFee,
  deleteFee,
  getFeeByCurrencyAndType
} from '../controllers/feeController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/fees - Get all active fees
router.get('/', getFees);

// POST /api/fees - Create a new fee
router.post('/', createFee);

// GET /api/fees/:currency/:transactionType - Get fee by currency and transaction type
router.get('/:currency/:transactionType', getFeeByCurrencyAndType);

// PUT /api/fees/:id - Update a fee
router.put('/:id', updateFee);

// DELETE /api/fees/:id - Deactivate a fee
router.delete('/:id', deleteFee);

export default router;