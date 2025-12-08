import mongoose, { Document, Schema } from 'mongoose';

export type Currency = 'DÓLAR' | 'CABLE' | 'PESOS' | 'CHEQUE' | 'DOLAR INTERNACIONAL';

export interface IBalance {
  currency: Currency;
  amount: number;
}

export interface IAccount extends Document {
  name: string;
  balances: IBalance[];
  createdAt: Date;
  updatedAt: Date;
}

const BalanceSchema: Schema = new Schema({
  currency: {
    type: String,
    enum: ['DÓLAR', 'CABLE', 'PESOS', 'CHEQUE', 'DOLAR INTERNACIONAL'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    default: 0
  }
});

const AccountSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  balances: [BalanceSchema]
}, {
  timestamps: true
});


export default mongoose.model<IAccount>('Account', AccountSchema);
