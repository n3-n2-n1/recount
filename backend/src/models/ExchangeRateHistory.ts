import mongoose, { Document, Schema } from 'mongoose';
import { Currency } from './ExchangeRate';

export interface IExchangeRateHistory extends Document {
  currency: Currency;
  oldRate: number;
  newRate: number;
  changedBy: mongoose.Types.ObjectId;
  timestamp: Date;
}

const ExchangeRateHistorySchema: Schema = new Schema({
  currency: {
    type: String,
    enum: ['DÓLAR', 'CABLE', 'PESOS', 'CHEQUE', 'CABLE BROKER'],
    required: true
  },
  oldRate: {
    type: Number,
    required: true
  },
  newRate: {
    type: Number,
    required: true
  },
  changedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient history queries
ExchangeRateHistorySchema.index({ currency: 1, timestamp: -1 });
ExchangeRateHistorySchema.index({ timestamp: -1 });

export default mongoose.model<IExchangeRateHistory>('ExchangeRateHistory', ExchangeRateHistorySchema);
