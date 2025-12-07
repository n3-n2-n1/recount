import { ExchangeRate } from '../models/exchange-rate.model';
import { Balance } from '../models/account.model';
import { CurrencyType } from '../models/transaction.model';

/**
 * Convert an amount from one currency to another using exchange rates
 */
export function convertToBase(
  amount: number,
  fromCurrency: CurrencyType,
  toBaseCurrency: CurrencyType,
  rates: ExchangeRate[]
): number {
  // If currencies are the same, no conversion needed
  if (fromCurrency === toBaseCurrency) {
    return amount;
  }

  // Find the rates for both currencies
  const fromRate = rates.find(r => r.currency === fromCurrency);
  const toRate = rates.find(r => r.currency === toBaseCurrency);

  // If rates not found, return original amount
  if (!fromRate || !toRate) {
    console.warn(`Exchange rate not found for ${fromCurrency} or ${toBaseCurrency}`);
    return amount;
  }

  // Convert: amount -> USD -> target currency
  // First convert to USD
  const amountInUSD = amount * fromRate.rateToUSD;
  
  // Then convert from USD to target currency
  const convertedAmount = amountInUSD / toRate.rateToUSD;

  return convertedAmount;
}

/**
 * Calculate total balance across all currencies converted to target currency
 */
export function calculateTotalBalance(
  balances: Balance[],
  targetCurrency: CurrencyType,
  rates: ExchangeRate[]
): number {
  if (!balances || balances.length === 0) {
    return 0;
  }

  return balances.reduce((total, balance) => {
    const converted = convertToBase(
      balance.amount,
      balance.currency,
      targetCurrency,
      rates
    );
    return total + converted;
  }, 0);
}

/**
 * Convert all balances to show their equivalent in target currency
 */
export function convertBalancesToTarget(
  balances: Balance[],
  targetCurrency: CurrencyType,
  rates: ExchangeRate[]
): Array<Balance & { convertedAmount: number }> {
  console.log('convertBalancesToTarget called with:', { balances, targetCurrency, rates });

  if (!balances || balances.length === 0) {
    console.log('No balances to convert');
    return [];
  }

  const result = balances.map(balance => {
    const converted = convertToBase(
      balance.amount,
      balance.currency,
      targetCurrency,
      rates
    );
    console.log(`Converting ${balance.amount} ${balance.currency} to ${targetCurrency}:`, converted);
    return {
      ...balance,
      convertedAmount: converted
    };
  });

  console.log('convertBalancesToTarget result:', result);
  return result;
}

/**
 * Format currency amount with proper symbol
 */
export function formatCurrencyWithSymbol(
  amount: number,
  currency: CurrencyType
): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const formatted = formatter.format(Math.abs(amount));
  
  // Add currency symbol/name
  switch (currency) {
    case 'DÓLAR':
      return `${formatted} USD`;
    case 'PESOS':
      return `${formatted} ARS`;
    case 'CABLE':
    case 'CABLE BROKER':
    case 'CHEQUE':
      return `${formatted} ${currency}`;
    default:
      return formatted;
  }
}

/**
 * Get exchange rate for a specific currency
 */
export function getRate(
  currency: CurrencyType,
  rates: ExchangeRate[]
): number | null {
  const rate = rates.find(r => r.currency === currency);
  return rate ? rate.rateToUSD : null;
}

/**
 * Check if exchange rates are outdated (older than 24 hours)
 */
export function areRatesOutdated(rates: ExchangeRate[]): boolean {
  if (!rates || rates.length === 0) {
    return true;
  }

  const now = new Date().getTime();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);

  return rates.some(rate => {
    const updatedAt = new Date(rate.updatedAt).getTime();
    return updatedAt < oneDayAgo;
  });
}

/**
 * Get the most recently updated rate
 */
export function getMostRecentUpdate(rates: ExchangeRate[]): Date | null {
  if (!rates || rates.length === 0) {
    return null;
  }

  const mostRecent = rates.reduce((latest, rate) => {
    const rateDate = new Date(rate.updatedAt);
    return rateDate > latest ? rateDate : latest;
  }, new Date(0));

  return mostRecent;
}
