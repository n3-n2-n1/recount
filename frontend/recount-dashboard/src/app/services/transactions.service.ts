import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Transaction, CreateTransactionRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TransactionsService {

  constructor(private apiService: ApiService) {}

  createTransaction(request: CreateTransactionRequest): Observable<Transaction> {
    return this.apiService.post<Transaction>('/transactions', request);
  }

  getTransactionsByAccount(accountId: string, limit: number = 5): Observable<{ transactions: Transaction[] }> {
    return this.apiService.get<{ transactions: Transaction[] }>(`/transactions?accountId=${accountId}&limit=${limit}`);
  }

  getAllTransactions(params?: {
    page?: number;
    limit?: number;
    accountId?: string;
    type?: string;
    currency?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<{ transactions: Transaction[], pagination?: any }> {
    let queryParams = '';
    
    if (params) {
      const searchParams = new URLSearchParams();
      
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.accountId) searchParams.append('accountId', params.accountId);
      if (params.type) searchParams.append('type', params.type);
      if (params.currency) searchParams.append('currency', params.currency);
      if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
      if (params.dateTo) searchParams.append('dateTo', params.dateTo);
      
      queryParams = searchParams.toString();
    }
    
    const url = queryParams ? `/transactions?${queryParams}` : '/transactions';
    
    return this.apiService.get<{ transactions: Transaction[], pagination?: any }>(url);
  }
}