export type CurrencyType = 'DÓLAR' | 'CABLE' | 'PESOS' | 'CHEQUE' | 'CABLE BROKER';
export type TransactionType = 'Entrada' | 'Salida' | 'Swap';

export interface Transaction {
  _id: string;
  accountId: string;
  type: TransactionType;
  description: string;
  currency: CurrencyType;
  amount: number;
  targetCurrency?: CurrencyType;
  exchangeRate?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionRequest {
  accountId: string;
  type: TransactionType;
  description: string;
  currency: CurrencyType;
  amount: number;
  targetCurrency?: CurrencyType;
  exchangeRate?: number;
}

// Import User to avoid circular dependency issues
interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
}