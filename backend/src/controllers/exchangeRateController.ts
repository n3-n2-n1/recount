import { Request, Response } from 'express';
import ExchangeRate from '../models/ExchangeRate.js';
import ExchangeRateHistory from '../models/ExchangeRateHistory.js';

// Cache for Bridge rates
interface BridgeRates {
  eur_usd: {
    buy: string;
    sell: string;
    mid: string;
    lastUpdate: Date;
  };
}

let bridgeRatesCache: BridgeRates | null = null;
let cacheExpiry: Date | null = null;
const CACHE_DURATION = 30 * 1000; // 30 seconds as suggested by Bridge

// Get Bridge EUR/USD rates with caching
export const getBridgeRates = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();

    // Check if cache is still valid
    if (bridgeRatesCache && cacheExpiry && now < cacheExpiry) {
      res.json({
        success: true,
        rates: bridgeRatesCache,
        cached: true
      });
      return;
    }

    // Fetch fresh rates from Bridge API
    const bridgeApiKey = process.env.BRIDGE_API_KEY || process.env.BRIDGE_SANDBOX_API_KEY;
    if (!bridgeApiKey) {
      res.status(500).json({
        success: false,
        message: 'Bridge API key not configured'
      });
      return;
    }

    const response = await fetch('https://api.bridge.xyz/v0/exchange_rates?from=eur&to=usd', {
      method: 'GET',
      headers: {
        'Api-Key': bridgeApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Bridge API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      buy_rate: string;
      sell_rate: string;
      midmarket_rate: string;
    };

    // Update cache
    bridgeRatesCache = {
      eur_usd: {
        buy: data.buy_rate,
        sell: data.sell_rate,
        mid: data.midmarket_rate,
        lastUpdate: now
      }
    };

    cacheExpiry = new Date(now.getTime() + CACHE_DURATION);

    res.json({
      success: true,
      rates: bridgeRatesCache,
      cached: false
    });

  } catch (error) {
    console.error('Error fetching Bridge rates:', error);

    // Return cached data if available and recent (within 5 minutes)
    if (bridgeRatesCache && cacheExpiry) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (bridgeRatesCache.eur_usd.lastUpdate > fiveMinutesAgo) {
        res.json({
          success: true,
          rates: bridgeRatesCache,
          cached: true,
          fallback: true
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching Bridge rates',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get all current exchange rates
export const getExchangeRates = async (req: Request, res: Response): Promise<void> => {
  try {
    const rates = await ExchangeRate.find()
      .populate('updatedBy', 'name email')
      .sort({ currency: 1 });

    res.json({
      success: true,
      rates
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching exchange rates'
    });
  }
};

// Update exchange rate for a specific currency
export const updateExchangeRate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currency } = req.params;
    const { rateToUSD } = req.body;
    const userId = (req as any).user.userId;

    // Validate rate
    if (!rateToUSD || rateToUSD <= 0) {
      res.status(400).json({
        success: false,
        message: 'Invalid rate value'
      });
      return;
    }

    // Find existing rate
    const existingRate = await ExchangeRate.findOne({ currency });

    if (existingRate) {
      // Save to history before updating
      await ExchangeRateHistory.create({
        currency,
        oldRate: existingRate.rateToUSD,
        newRate: rateToUSD,
        changedBy: userId,
        timestamp: new Date()
      });

      // Update existing rate
      existingRate.rateToUSD = rateToUSD;
      existingRate.updatedBy = userId;
      await existingRate.save();

      const populated = await ExchangeRate.findById(existingRate._id)
        .populate('updatedBy', 'name email');

      res.json({
        success: true,
        rate: populated,
        message: 'Exchange rate updated successfully'
      });
    } else {
      // Create new rate
      const newRate = await ExchangeRate.create({
        currency,
        rateToUSD,
        updatedBy: userId
      });

      // Save to history
      await ExchangeRateHistory.create({
        currency,
        oldRate: 0,
        newRate: rateToUSD,
        changedBy: userId,
        timestamp: new Date()
      });

      const populated = await ExchangeRate.findById(newRate._id)
        .populate('updatedBy', 'name email');

      res.json({
        success: true,
        rate: populated,
        message: 'Exchange rate created successfully'
      });
    }
  } catch (error) {
    console.error('Error updating exchange rate:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating exchange rate'
    });
  }
};

// Get exchange rate history
export const getExchangeRateHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currency } = req.query;
    const limit = parseInt(req.query.limit as string) || 50;

    const query = currency ? { currency } : {};

    const history = await ExchangeRateHistory.find(query)
      .populate('changedBy', 'name email')
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Error fetching exchange rate history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching exchange rate history'
    });
  }
};
