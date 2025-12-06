import mongoose, { Document, Schema } from 'mongoose';
import { type Currency } from './Account.js';

export type TransactionType = 'Entrada' | 'Salida' | 'Swap' | 'Transferencia Interna';

export interface ITransaction extends Document {
  accountId: mongoose.Types.ObjectId;
  type: TransactionType;
  description: string;
  currency: Currency;
  amount: number;
  // For Swap transactions
  targetCurrency?: Currency;
  exchangeRate?: number;
  // For Transferencia Interna
  targetAccountId?: mongoose.Types.ObjectId;
  // For all transactions
  reference?: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema: Schema = new Schema({
  accountId: {
    type: Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  type: {
    type: String,
    enum: ['Entrada', 'Salida', 'Swap', 'Transferencia Interna'],
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  currency: {
    type: String,
    enum: ['DÓLAR', 'CABLE', 'PESOS', 'CHEQUE', 'CABLE BROKER'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  // For Swap transactions
  targetCurrency: {
    type: String,
    enum: ['DÓLAR', 'CABLE', 'PESOS', 'CHEQUE', 'CABLE BROKER']
  },
  exchangeRate: {
    type: Number
  },
  // For Transferencia Interna
  targetAccountId: {
    type: Schema.Types.ObjectId,
    ref: 'Account'
  },
  // Additional fields
  reference: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Note: Validation moved to controller to avoid middleware issues

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
