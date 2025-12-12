import {
  convertToBase,
  calculateTotalBalance,
  convertBalancesToTarget,
  formatCurrencyWithSymbol,
  getRate,
  areRatesOutdated,
  getMostRecentUpdate
} from './currency-converter';
import { ExchangeRate } from '../models/exchange-rate.model';
import { Balance } from '../models/account.model';
import { CurrencyType } from '../models/transaction.model';

describe('Currency Converter Utilities', () => {
  const mockExchangeRates: ExchangeRate[] = [
    {
      _id: '1',
      currency: 'DÓLAR' as CurrencyType,
      rateToUSD: 1,
      updatedBy: { _id: 'user1', name: 'Test User', email: 'test@test.com' },
      updatedAt: new Date(),
      createdAt: new Date()
    },
    {
      _id: '2',
      currency: 'PESOS' as CurrencyType,
      rateToUSD: 0.001, // 1 peso = 0.001 USD (1000 pesos = 1 USD)
      updatedBy: { _id: 'user1', name: 'Test User', email: 'test@test.com' },
      updatedAt: new Date(),
      createdAt: new Date()
    },
    {
      _id: '3',
      currency: 'CABLE' as CurrencyType,
      rateToUSD: 1,
      updatedBy: { _id: 'user1', name: 'Test User', email: 'test@test.com' },
      updatedAt: new Date(),
      createdAt: new Date()
    },
    {
      _id: '4',
      currency: 'CHEQUE' as CurrencyType,
      rateToUSD: 0.0001, // 1 cheque = 0.0001 USD (10000 cheques = 1 USD)
      updatedBy: { _id: 'user1', name: 'Test User', email: 'test@test.com' },
      updatedAt: new Date(),
      createdAt: new Date()
    }
  ];

  describe('convertToBase', () => {
    it('should return same amount when currencies are the same', () => {
      const result = convertToBase(100, 'DÓLAR', 'DÓLAR', mockExchangeRates);
      expect(result).toBe(100);
    });

    it('should convert PESOS to DÓLAR correctly', () => {
      // 1000 pesos = 1 USD (1000 * 0.001 = 1)
      const result = convertToBase(1000, 'PESOS', 'DÓLAR', mockExchangeRates);
      expect(result).toBeCloseTo(1, 4);
    });

    it('should convert DÓLAR to PESOS correctly', () => {
      // 1 USD = 1000 pesos (1 / 0.001 = 1000)
      const result = convertToBase(1, 'DÓLAR', 'PESOS', mockExchangeRates);
      expect(result).toBeCloseTo(1000, 4);
    });

    it('should convert CHEQUE to DÓLAR correctly', () => {
      // 10000 cheques = 1 USD (10000 * 0.0001 = 1)
      const result = convertToBase(10000, 'CHEQUE', 'DÓLAR', mockExchangeRates);
      expect(result).toBeCloseTo(1, 4);
    });

    it('should convert PESOS to CHEQUE correctly', () => {
      // 1000 pesos = 1 USD, 1 USD = 10000 cheques
      // So 1000 pesos = 10000 cheques
      const result = convertToBase(1000, 'PESOS', 'CHEQUE', mockExchangeRates);
      expect(result).toBeCloseTo(10000, 4);
    });

    it('should return original amount if rates not found', () => {
      const result = convertToBase(100, 'DÓLAR', 'UNKNOWN' as CurrencyType, mockExchangeRates);
      expect(result).toBe(100);
    });

    it('should handle zero amount', () => {
      const result = convertToBase(0, 'PESOS', 'DÓLAR', mockExchangeRates);
      expect(result).toBe(0);
    });

    it('should handle negative amounts', () => {
      const result = convertToBase(-1000, 'PESOS', 'DÓLAR', mockExchangeRates);
      expect(result).toBeCloseTo(-1, 4);
    });
  });

  describe('calculateTotalBalance', () => {
    it('should return 0 for empty balances', () => {
      const result = calculateTotalBalance([], 'DÓLAR', mockExchangeRates);
      expect(result).toBe(0);
    });

    it('should calculate total balance in same currency', () => {
      const balances: Balance[] = [
        { currency: 'DÓLAR', amount: 100 },
        { currency: 'DÓLAR', amount: 50 }
      ];
      const result = calculateTotalBalance(balances, 'DÓLAR', mockExchangeRates);
      expect(result).toBe(150);
    });

    it('should calculate total balance converting to target currency', () => {
      const balances: Balance[] = [
        { currency: 'DÓLAR', amount: 1 },
        { currency: 'PESOS', amount: 1000 } // 1000 pesos = 1 USD
      ];
      const result = calculateTotalBalance(balances, 'DÓLAR', mockExchangeRates);
      expect(result).toBeCloseTo(2, 4); // 1 USD + 1 USD = 2 USD
    });

    it('should handle multiple currencies', () => {
      const balances: Balance[] = [
        { currency: 'DÓLAR', amount: 10 },
        { currency: 'PESOS', amount: 5000 }, // 5 USD
        { currency: 'CABLE', amount: 2 }
      ];
      const result = calculateTotalBalance(balances, 'DÓLAR', mockExchangeRates);
      expect(result).toBeCloseTo(17, 4); // 10 + 5 + 2 = 17 USD
    });

    it('should handle negative balances', () => {
      const balances: Balance[] = [
        { currency: 'DÓLAR', amount: 100 },
        { currency: 'PESOS', amount: -1000 } // -1 USD
      ];
      const result = calculateTotalBalance(balances, 'DÓLAR', mockExchangeRates);
      expect(result).toBeCloseTo(99, 4); // 100 - 1 = 99 USD
    });
  });

  describe('convertBalancesToTarget', () => {
    it('should return empty array for empty balances', () => {
      const result = convertBalancesToTarget([], 'DÓLAR', mockExchangeRates);
      expect(result).toEqual([]);
    });

    it('should convert all balances to target currency', () => {
      const balances: Balance[] = [
        { currency: 'DÓLAR', amount: 1 },
        { currency: 'PESOS', amount: 1000 }
      ];
      const result = convertBalancesToTarget(balances, 'DÓLAR', mockExchangeRates);
      
      expect(result.length).toBe(2);
      expect(result[0].convertedAmount).toBeCloseTo(1, 4);
      expect(result[1].convertedAmount).toBeCloseTo(1, 4);
    });

    it('should preserve original balance data', () => {
      const balances: Balance[] = [
        { currency: 'PESOS', amount: 1000 }
      ];
      const result = convertBalancesToTarget(balances, 'DÓLAR', mockExchangeRates);
      
      expect(result[0].currency).toBe('PESOS');
      expect(result[0].amount).toBe(1000);
      expect(result[0].convertedAmount).toBeDefined();
    });
  });

  describe('formatCurrencyWithSymbol', () => {
    it('should format DÓLAR with USD symbol', () => {
      const result = formatCurrencyWithSymbol(1000.50, 'DÓLAR');
      expect(result).toContain('USD');
      expect(result).toContain('1.000,50');
    });

    it('should format PESOS with ARS symbol', () => {
      const result = formatCurrencyWithSymbol(1000.50, 'PESOS');
      expect(result).toContain('ARS');
      expect(result).toContain('1.000,50');
    });

    it('should format CABLE with currency name', () => {
      const result = formatCurrencyWithSymbol(1000.50, 'CABLE');
      expect(result).toContain('CABLE');
      expect(result).toContain('1.000,50');
    });

    it('should format CHEQUE with currency name', () => {
      const result = formatCurrencyWithSymbol(1000.50, 'CHEQUE');
      expect(result).toContain('CHEQUE');
      expect(result).toContain('1.000,50');
    });

    it('should handle negative amounts', () => {
      const result = formatCurrencyWithSymbol(-1000.50, 'DÓLAR');
      expect(result).toContain('1.000,50'); // Should show absolute value
    });

    it('should handle zero amount', () => {
      const result = formatCurrencyWithSymbol(0, 'DÓLAR');
      expect(result).toContain('0,00');
    });
  });

  describe('getRate', () => {
    it('should return rate for existing currency', () => {
      const result = getRate('DÓLAR', mockExchangeRates);
      expect(result).toBe(1);
    });

    it('should return null for non-existent currency', () => {
      const result = getRate('UNKNOWN' as CurrencyType, mockExchangeRates);
      expect(result).toBeNull();
    });

    it('should return correct rate for PESOS', () => {
      const result = getRate('PESOS', mockExchangeRates);
      expect(result).toBe(0.001);
    });
  });

  describe('areRatesOutdated', () => {
    it('should return true for empty rates', () => {
      const result = areRatesOutdated([]);
      expect(result).toBe(true);
    });

    it('should return false for recent rates', () => {
      const recentRates: ExchangeRate[] = [
        {
          _id: '1',
          currency: 'DÓLAR',
          rateToUSD: 1,
          updatedBy: { _id: 'user1', name: 'Test User', email: 'test@test.com' },
          updatedAt: new Date(),
          createdAt: new Date()
        }
      ];
      const result = areRatesOutdated(recentRates);
      expect(result).toBe(false);
    });

    it('should return true for rates older than 24 hours', () => {
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 25);
      
      const oldRates: ExchangeRate[] = [
        {
          _id: '1',
          currency: 'DÓLAR',
          rateToUSD: 1,
          updatedBy: { _id: 'user1', name: 'Test User', email: 'test@test.com' },
          updatedAt: oldDate,
          createdAt: oldDate
        }
      ];
      const result = areRatesOutdated(oldRates);
      expect(result).toBe(true);
    });
  });

  describe('getMostRecentUpdate', () => {
    it('should return null for empty rates', () => {
      const result = getMostRecentUpdate([]);
      expect(result).toBeNull();
    });

    it('should return most recent date', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');
      const date3 = new Date('2024-01-03');

      const rates: ExchangeRate[] = [
        {
          _id: '1',
          currency: 'DÓLAR',
          rateToUSD: 1,
          updatedBy: { _id: 'user1', name: 'Test User', email: 'test@test.com' },
          updatedAt: date1,
          createdAt: date1
        },
        {
          _id: '2',
          currency: 'PESOS',
          rateToUSD: 0.001,
          updatedBy: { _id: 'user1', name: 'Test User', email: 'test@test.com' },
          updatedAt: date3,
          createdAt: date3
        },
        {
          _id: '3',
          currency: 'CABLE',
          rateToUSD: 1,
          updatedBy: { _id: 'user1', name: 'Test User', email: 'test@test.com' },
          updatedAt: date2,
          createdAt: date2
        }
      ];

      const result = getMostRecentUpdate(rates);
      expect(result).toEqual(date3);
    });
  });
});
