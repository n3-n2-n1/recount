export type CurrencyType = 'DÓLAR' | 'CABLE' | 'PESOS' | 'CHEQUE' | 'DOLAR INTERNACIONAL';
export type TransactionType = 'Entrada' | 'Salida' | 'Swap' | 'Transferencia Interna';

export interface Transaction {
  _id: string;
  accountId: string;
  type: TransactionType;
  description: string;
  currency: CurrencyType;
  amount: number;
  targetCurrency?: CurrencyType;
  exchangeRate?: number;
  targetAccountId?: string;
  feeApplied?: boolean;
  feeType?: 'percentage' | 'fixed';
  feeValue?: number;
  originalAmount?: number;
  notes?: string;
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
  targetAccountId?: string;
  applyFee?: boolean;
  feeType?: 'percentage' | 'fixed';
  feeValue?: number | null;
  originalAmount?: number;
}

// Import User to avoid circular dependency issues
interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
}