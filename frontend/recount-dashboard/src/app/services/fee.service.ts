import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Fee, CreateFeeRequest, UpdateFeeRequest, FeesResponse, FeeResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class FeeService {
  private apiUrl = '/api/fees';

  constructor(private http: HttpClient) {}

  getFees(): Observable<FeesResponse> {
    return this.http.get<FeesResponse>(this.apiUrl);
  }

  createFee(fee: CreateFeeRequest): Observable<{ fee: Fee }> {
    return this.http.post<{ fee: Fee }>(this.apiUrl, fee);
  }

  updateFee(id: string, updates: UpdateFeeRequest): Observable<{ fee: Fee }> {
    return this.http.put<{ fee: Fee }>(`${this.apiUrl}/${id}`, updates);
  }

  deleteFee(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  getFeeByCurrencyAndType(currency: string, transactionType: string): Observable<FeeResponse> {
    return this.http.get<FeeResponse>(`${this.apiUrl}/${currency}/${transactionType}`);
  }
}
