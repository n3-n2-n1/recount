import express from 'express';
import {
  getExchangeRates,
  updateExchangeRate,
  getExchangeRateHistory,
  getBridgeRates
} from '../controllers/exchangeRateController.js';
import { authenticateToken, requireAdminOrReviewer } from '../middleware/auth.js';

const router = express.Router();

// Get all exchange rates (public - no authentication required)
router.get('/', getExchangeRates);

// Get Bridge EUR/USD rates (public - no authentication required)
router.get('/bridge', getBridgeRates);

// Get exchange rate history (requires authentication)
router.get('/history', authenticateToken, getExchangeRateHistory);

// Update exchange rate (only super_admin and reviewer)
router.put('/:currency', authenticateToken, requireAdminOrReviewer, updateExchangeRate);

export default router;
