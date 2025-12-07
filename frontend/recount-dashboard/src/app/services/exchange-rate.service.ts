import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { 
  ExchangeRate, 
  ExchangeRateHistory, 
  ExchangeRatesResponse,
  ExchangeRateHistoryResponse,
  UpdateExchangeRateRequest,
  UpdateExchangeRateResponse
} from '../models';
import { CurrencyType } from '../models/transaction.model';

@Injectable({
  providedIn: 'root'
})
export class ExchangeRateService {
  private readonly endpoint = '/exchange-rates';

  constructor(private apiService: ApiService) {}

  /**
   * Get all current exchange rates
   */
  getExchangeRates(): Observable<ExchangeRatesResponse> {
    return this.apiService.get<ExchangeRatesResponse>(this.endpoint);
  }

  /**
   * Update exchange rate for a specific currency
   */
  updateExchangeRate(currency: CurrencyType, rateToUSD: number): Observable<UpdateExchangeRateResponse> {
    const body: UpdateExchangeRateRequest = { rateToUSD };
    return this.apiService.put<UpdateExchangeRateResponse>(`${this.endpoint}/${currency}`, body);
  }

  /**
   * Get exchange rate history
   */
  getHistory(currency?: CurrencyType, limit: number = 50): Observable<ExchangeRateHistoryResponse> {
    const params: any = { limit };
    if (currency) {
      params.currency = currency;
    }
    return this.apiService.get<ExchangeRateHistoryResponse>(`${this.endpoint}/history`, params);
  }
}
