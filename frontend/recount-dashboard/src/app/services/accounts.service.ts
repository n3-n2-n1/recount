import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Account, CreateAccountRequest, UpdateAccountRequest, PaginatedResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AccountsService {

  constructor(private apiService: ApiService) {}

  getAccounts(): Observable<{ accounts: Account[] }> {
    return this.apiService.get<{ accounts: Account[] }>('/accounts');
  }

  getAccountById(id: string): Observable<Account> {
    return this.apiService.get<Account>(`/accounts/${id}`);
  }

  createAccount(request: CreateAccountRequest): Observable<Account> {
    return this.apiService.post<Account>('/accounts', request);
  }

  updateAccount(id: string, request: UpdateAccountRequest): Observable<Account> {
    return this.apiService.put<Account>(`/accounts/${id}`, request);
  }

  deleteAccount(id: string): Observable<void> {
    return this.apiService.delete<void>(`/accounts/${id}`);
  }
}