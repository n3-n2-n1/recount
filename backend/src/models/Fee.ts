import mongoose, { Document, Schema } from 'mongoose';

export type Currency = 'DÓLAR' | 'CABLE' | 'PESOS' | 'CHEQUE' | 'DOLAR B';
export type TransactionType = 'Entrada' | 'Salida' | 'Compra Divisa' | 'Transferencia Interna';

export interface IFee extends Document {
  currency: Currency;
  transactionType: TransactionType;
  percentage: number; // Fee percentage (e.g., 1.5 for 1.5%)
  isActive: boolean;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FeeSchema: Schema = new Schema({
  currency: {
    type: String,
    enum: ['DÓLAR', 'CABLE', 'PESOS', 'CHEQUE', 'DOLAR B'],
    required: true
  },
  transactionType: {
    type: String,
    enum: ['Entrada', 'Salida', 'Compra Divisa', 'Transferencia Interna'],
    required: true
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100, // Maximum 100%
    default: 0
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true
  },
  description: {
    type: String,
    trim: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique fee per currency + transaction type
FeeSchema.index({ currency: 1, transactionType: 1 }, { unique: true });

export default mongoose.model<IFee>('Fee', FeeSchema);