import express, { type Request, type Response } from 'express';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import Account, { type Currency } from '../models/Account.js';
import Fee from '../models/Fee.js';

type TransactionType = 'Entrada' | 'Salida' | 'Compra Divisa' | 'Transferencia Interna';

// Optimized balance update using in-memory operations
const updateAccountBalance = async (
  accountId: string,
  currency: Currency,
  amount: number,
  operation: 'add' | 'subtract'
): Promise<void> => {
  const account = await Account.findById(accountId);
  if (!account) throw new Error('Account not found');

  const balanceIndex = account.balances.findIndex(b => b.currency === currency);
  if (balanceIndex === -1) {
    // Create new balance entry if currency doesn't exist
    account.balances.push({
      currency,
      amount: operation === 'add' ? amount : -amount
    });
  } else {
    const balance = account.balances[balanceIndex];
    if (operation === 'add') {
      balance.amount += amount;
    } else {
      balance.amount -= amount;
    }
  }

  await account.save();
};

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId, type, currency, page = 1, limit = 20, includeInternalTransfers = 'false' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let query: any = {};
    if (accountId && accountId !== 'undefined') {
      if (includeInternalTransfers === 'true') {
        // Include transactions where account is either source or target
        query.$or = [
          { accountId: accountId },
          { targetAccountId: accountId, type: 'Transferencia Interna' }
        ];
      } else {
        query.accountId = accountId;
      }
    }
    if (type && type !== 'undefined') {
      query.type = type;
    }
    if (currency && currency !== 'undefined') {
      query.currency = currency;
    }

    const transactions = await Transaction.find(query)
      .populate('accountId', 'name')
      .populate('targetAccountId', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    const user = (req as any).user;
    const {
      accountId,
      type,
      description,
      currency,
      amount,
      targetCurrency,
      exchangeRate,
      targetAccountId,
      reference,
      notes,
      bancoWallet,
      titularOriginante,
      applyFee,
      feeType,
      feeValue,
      originalAmount
    } = req.body;

    // Map applyFee to feeApplied for backward compatibility
    const feeApplied = applyFee || false;

    if (!accountId || !type || !description || !currency || !amount) {
      res.status(400).json({ message: 'Required fields missing' });
      return;
    }

    const transaction = new Transaction({
      accountId,
      type,
      description,
      currency,
      amount, // This is already the final amount after fee
      targetCurrency,
      exchangeRate,
      targetAccountId,
      reference,
      notes,
      bancoWallet,
      titularOriginante,
      feeApplied,
      feeType,
      feeValue,
      originalAmount: feeApplied ? originalAmount : undefined, // Store original amount before fee
      createdBy: user._id
    });

    // Validate transaction based on type
    if (type === 'Compra Divisa') {
      if (!targetCurrency || !exchangeRate) {
        res.status(400).json({ message: 'Compra Divisa transactions require targetCurrency and exchangeRate' });
        return;
      }
      if (currency === targetCurrency) {
        res.status(400).json({ message: 'No se puede comprar la misma moneda' });
        return;
      }
    }

    if (type === 'Transferencia Interna') {
      if (!targetAccountId) {
        res.status(400).json({ message: 'Internal transfer requires targetAccountId' });
        return;
      }
    }

    // Validate CHEQUE balance for Salida transactions
    if (type === 'Salida' && currency === 'CHEQUE') {
      const account = await Account.findById(accountId);
      if (!account) {
        res.status(404).json({ message: 'Account not found' });
        return;
      }
      
      const chequeBalance = account.balances.find(b => b.currency === 'CHEQUE');
      const currentBalance = chequeBalance ? chequeBalance.amount : 0;
      
      if (currentBalance < amount) {
        res.status(400).json({ message: 'El balance no puede ser negativo para los cheques' });
        return;
      }
    }

    let finalAmount = amount;

    // Apply manual fee if provided
    if (applyFee && feeValue && feeValue > 0) {
      let feeAmount = 0;
      if (feeType === 'percentage') {
        feeAmount = (amount * feeValue) / 100;
      } else {
        feeAmount = feeValue;
      }
      finalAmount = type === 'Entrada' ? amount - feeAmount : amount + feeAmount;
    }

    // Apply transaction logic based on type
    switch (type) {
      case 'Entrada':
        await updateAccountBalance(accountId, currency as Currency, finalAmount, 'add');
        break;

      case 'Salida':
        await updateAccountBalance(accountId, currency as Currency, finalAmount, 'subtract');
        break;

      case 'Compra Divisa':
        // Validation already done above
        let convertedAmount: number;

        // Special logic: use division when converting FROM PESOS or FROM CHEQUE to PESOS
        // Exchange rate interpretation: 1 unit of target currency = exchangeRate units of origin currency
        // Example: PESOS → DÓLAR with rate 1000 means "1 dólar = 1000 pesos", so divide
        // Example: CHEQUE → PESOS with rate 1500 means "1 peso = 1500 cheques", so divide
        // Otherwise: 1 unit of origin currency = exchangeRate units of target currency (multiply)
        if ((currency === 'PESOS' && targetCurrency === 'DÓLAR') || 
            (currency === 'CHEQUE' && targetCurrency === 'PESOS')) {
          convertedAmount = amount / exchangeRate;
        } else {
          convertedAmount = amount * exchangeRate;
        }

        // Use Promise.all for parallel updates when possible
        await Promise.all([
          updateAccountBalance(accountId, currency as Currency, amount, 'subtract'),
          updateAccountBalance(accountId, targetCurrency as Currency, convertedAmount, 'add')
        ]);
        break;

      case 'Transferencia Interna':
        // targetAccountId validation already done above
        // Use Promise.all for parallel updates to different accounts
        await Promise.all([
          updateAccountBalance(accountId, currency as Currency, amount, 'subtract'),
          updateAccountBalance(targetAccountId, currency as Currency, amount, 'add')
        ]);
        break;
    }

    await transaction.save();

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('accountId', 'name')
      .populate('targetAccountId', 'name')
      .populate('createdBy', 'name');

    const duration = Date.now() - startTime;
    console.log(`Transaction ${type} completed in ${duration}ms`);

    res.status(201).json({ transaction: populatedTransaction });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateTransaction = async (req: Request, res: Response): Promise<void> => {

  try {
    const { id } = req.params;
    const user = (req as any).user;
    const updates = req.body;

    const existingTransaction = await Transaction.findById(id);
    if (!existingTransaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    // Reverse the old transaction effects
    switch (existingTransaction.type) {
      case 'Entrada':
        await updateAccountBalance(existingTransaction.accountId.toString(), existingTransaction.currency as Currency, existingTransaction.amount, 'subtract');
        break;
      case 'Salida':
        await updateAccountBalance(existingTransaction.accountId.toString(), existingTransaction.currency as Currency, existingTransaction.amount, 'add');
        break;
      case 'Compra Divisa':
        let oldConvertedAmount: number;
        if ((existingTransaction.currency === 'PESOS' && existingTransaction.targetCurrency === 'DÓLAR') ||
            (existingTransaction.currency === 'CHEQUE' && existingTransaction.targetCurrency === 'PESOS')) {
          oldConvertedAmount = existingTransaction.amount / (existingTransaction.exchangeRate || 1);
        } else {
          oldConvertedAmount = existingTransaction.amount * (existingTransaction.exchangeRate || 1);
        }
        await Promise.all([
          updateAccountBalance(existingTransaction.accountId.toString(), existingTransaction.currency as Currency, existingTransaction.amount, 'add'),
          updateAccountBalance(existingTransaction.accountId.toString(), existingTransaction.targetCurrency! as Currency, oldConvertedAmount, 'subtract')
        ]);
        break;
      case 'Transferencia Interna':
        await Promise.all([
          updateAccountBalance(existingTransaction.accountId.toString(), existingTransaction.currency as Currency, existingTransaction.amount, 'add'),
          updateAccountBalance(existingTransaction.targetAccountId!.toString(), existingTransaction.currency as Currency, existingTransaction.amount, 'subtract')
        ]);
        break;
    }

    // Apply new transaction effects
    const newTransaction = {
      ...existingTransaction.toObject(),
      ...updates,
      updatedAt: new Date()
    };

    switch (newTransaction.type) {
      case 'Entrada':
        await updateAccountBalance(newTransaction.accountId, newTransaction.currency as Currency, newTransaction.amount, 'add');
        break;
      case 'Salida':
        await updateAccountBalance(newTransaction.accountId, newTransaction.currency as Currency, newTransaction.amount, 'subtract');
        break;
      case 'Compra Divisa':
        let newConvertedAmount: number;
        if ((newTransaction.currency === 'PESOS' && newTransaction.targetCurrency === 'DÓLAR') ||
            (newTransaction.currency === 'CHEQUE' && newTransaction.targetCurrency === 'PESOS')) {
          newConvertedAmount = newTransaction.amount / (newTransaction.exchangeRate || 1);
        } else {
          newConvertedAmount = newTransaction.amount * (newTransaction.exchangeRate || 1);
        }
        await Promise.all([
          updateAccountBalance(newTransaction.accountId, newTransaction.currency as Currency, newTransaction.amount, 'subtract'),
          updateAccountBalance(newTransaction.accountId, newTransaction.targetCurrency as Currency, newConvertedAmount, 'add')
        ]);
        break;
      case 'Transferencia Interna':
        await Promise.all([
          updateAccountBalance(newTransaction.accountId, newTransaction.currency as Currency, newTransaction.amount, 'subtract'),
          updateAccountBalance(newTransaction.targetAccountId, newTransaction.currency as Currency, newTransaction.amount, 'add')
        ]);
        break;
    }

    await Transaction.findByIdAndUpdate(id, updates, { new: true });

    const updatedTransaction = await Transaction.findById(id)
      .populate('accountId', 'name')
      .populate('targetAccountId', 'name')
      .populate('createdBy', 'name');

    res.json({ transaction: updatedTransaction });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteTransaction = async (req: Request, res: Response): Promise<void> => {

  try {
    const { id } = req.params;

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    // Reverse the transaction effects
    switch (transaction.type) {
      case 'Entrada':
        await updateAccountBalance(transaction.accountId.toString(), transaction.currency as Currency, transaction.amount, 'subtract');
        break;
      case 'Salida':
        await updateAccountBalance(transaction.accountId.toString(), transaction.currency as Currency, transaction.amount, 'add');
        break;
      case 'Compra Divisa':
        let convertedAmount: number;
        if ((transaction.currency === 'PESOS' && transaction.targetCurrency === 'DÓLAR') ||
            (transaction.currency === 'CHEQUE' && transaction.targetCurrency === 'PESOS')) {
          convertedAmount = transaction.amount / (transaction.exchangeRate || 1);
        } else {
          convertedAmount = transaction.amount * (transaction.exchangeRate || 1);
        }
        await Promise.all([
          updateAccountBalance(transaction.accountId.toString(), transaction.currency as Currency, transaction.amount, 'add'),
          updateAccountBalance(transaction.accountId.toString(), transaction.targetCurrency! as Currency, convertedAmount, 'subtract')
        ]);
        break;
      case 'Transferencia Interna':
        await Promise.all([
          updateAccountBalance(transaction.accountId.toString(), transaction.currency as Currency, transaction.amount, 'add'),
          updateAccountBalance(transaction.targetAccountId!.toString(), transaction.currency as Currency, transaction.amount, 'subtract')
        ]);
        break;
    }

    await Transaction.findByIdAndDelete(id);

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
