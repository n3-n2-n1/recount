import { Injectable } from '@angular/core';
import { CurrencyType } from '../models/transaction.model';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly PREFERRED_CURRENCY_KEY = 'preferredCurrency';
  private readonly DEFAULT_CURRENCY: CurrencyType = 'DÓLAR';

  constructor() {}

  /**
   * Get the user's preferred currency for displaying totals
   */
  getPreferredCurrency(): CurrencyType {
    const stored = localStorage.getItem(this.PREFERRED_CURRENCY_KEY);
    if (stored && this.isValidCurrency(stored)) {
      return stored as CurrencyType;
    }
    return this.DEFAULT_CURRENCY;
  }

  /**
   * Set the user's preferred currency
   */
  setPreferredCurrency(currency: CurrencyType): void {
    if (this.isValidCurrency(currency)) {
      localStorage.setItem(this.PREFERRED_CURRENCY_KEY, currency);
    } else {
      console.error('Invalid currency type:', currency);
    }
  }

  /**
   * Clear preferred currency setting
   */
  clearPreferredCurrency(): void {
    localStorage.removeItem(this.PREFERRED_CURRENCY_KEY);
  }

  /**
   * Validate if a string is a valid currency type
   */
  private isValidCurrency(currency: string): boolean {
    const validCurrencies: CurrencyType[] = ['DÓLAR', 'CABLE', 'PESOS', 'CHEQUE', 'CABLE BROKER'];
    return validCurrencies.includes(currency as CurrencyType);
  }

  /**
   * Get all available currencies
   */
  getAvailableCurrencies(): CurrencyType[] {
    return ['DÓLAR', 'CABLE', 'PESOS', 'CHEQUE', 'CABLE BROKER'];
  }
}
