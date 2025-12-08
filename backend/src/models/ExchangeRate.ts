import mongoose, { Document, Schema } from 'mongoose';

export type Currency = 'DÓLAR' | 'CABLE' | 'PESOS' | 'CHEQUE' | 'DOLAR INTERNACIONAL';

export interface IExchangeRate extends Document {
  currency: Currency;
  rateToUSD: number;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExchangeRateSchema: Schema = new Schema({
  currency: {
    type: String,
    enum: ['DÓLAR', 'CABLE', 'PESOS', 'CHEQUE', 'DOLAR INTERNACIONAL'],
    required: true,
    unique: true
  },
  rateToUSD: {
    type: Number,
    required: true,
    min: 0,
    default: 1
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model<IExchangeRate>('ExchangeRate', ExchangeRateSchema);
