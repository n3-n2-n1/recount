import express from 'express';
import { 
  getExchangeRates, 
  updateExchangeRate, 
  getExchangeRateHistory 
} from '../controllers/exchangeRateController.js';
import { authenticateToken, requireAdminOrReviewer } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all exchange rates (available to all authenticated users)
router.get('/', getExchangeRates);

// Get exchange rate history (available to all authenticated users)
router.get('/history', getExchangeRateHistory);

// Update exchange rate (only super_admin and reviewer)
router.put('/:currency', requireAdminOrReviewer, updateExchangeRate);

export default router;
