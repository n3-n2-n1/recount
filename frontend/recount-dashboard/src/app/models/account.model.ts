import { CurrencyType } from './transaction.model';

export interface Balance {
  currency: CurrencyType;
  amount: number;
}

export interface Account {
  _id: string;
  name: string;
  balances: Balance[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAccountRequest {
  name: string;
  balances?: Balance[];
}

export interface UpdateAccountRequest {
  name?: string;
  balances?: Balance[];
}