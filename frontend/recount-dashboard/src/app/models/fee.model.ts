import { CurrencyType } from './transaction.model';
import { TransactionType } from './transaction.model';
export interface Fee {
  _id: string;
  currency: CurrencyType;
  transactionType: TransactionType;
  percentage: number;
  isActive: boolean;
  description?: string;
  createdBy: {
    _id: string;
    name: string;
  } | string;
  updatedBy: {
    _id: string;
    name: string;
  } | string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeeRequest {
  currency: CurrencyType;
  transactionType: TransactionType;
  percentage: number;
  description?: string;
}

export interface UpdateFeeRequest {
  percentage?: number;
  description?: string;
  isActive?: boolean;
}

export interface FeesResponse {
  fees: Fee[];
}

export interface FeeResponse {
  fee: Fee | null;
}