import { CurrencyType } from './transaction.model';

export interface ExchangeRate {
  _id: string;
  currency: CurrencyType;
  rateToUSD: number;
  updatedBy: {
    _id: string;
    name: string;
    email: string;
  } | string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExchangeRateHistory {
  _id: string;
  currency: CurrencyType;
  oldRate: number;
  newRate: number;
  changedBy: {
    _id: string;
    name: string;
    email: string;
  };
  timestamp: Date;
}

export interface UpdateExchangeRateRequest {
  rateToUSD: number;
}

export interface ExchangeRatesResponse {
  success: boolean;
  rates: ExchangeRate[];
}

export interface ExchangeRateHistoryResponse {
  success: boolean;
  history: ExchangeRateHistory[];
}

export interface UpdateExchangeRateResponse {
  success: boolean;
  rate: ExchangeRate;
  message: string;
}
