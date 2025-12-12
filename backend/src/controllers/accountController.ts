import express, { type Request, type Response } from 'express';
import mongoose from 'mongoose';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';

export const getAccounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const accounts = await Account.find().sort({ name: 1 });
    res.json({ accounts });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const account = await Account.findById(id);

    if (!account) {
      res.status(404).json({ message: 'Account not found' });
      return;
    }

    // Get recent transactions
    const transactions = await Transaction.find({ accountId: id })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ account, transactions });
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ message: 'Account name is required' });
      return;
    }

    const existingAccount = await Account.findOne({ name: name.trim() });
    if (existingAccount) {
      res.status(409).json({ message: 'Account name already exists' });
      return;
    }

    // Create account with initial balances for all currencies
    const currencies: string[] = ['DÓLAR', 'CABLE', 'PESOS', 'CHEQUE', 'DOLAR B'];
    const initialBalances = currencies.map(currency => ({
      currency,
      amount: 0
    }));

    const account = new Account({
      name: name.trim(),
      balances: initialBalances
    });

    await account.save();

    res.status(201).json({ account });
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ message: 'Account name is required' });
      return;
    }

    const account = await Account.findById(id);
    if (!account) {
      res.status(404).json({ message: 'Account not found' });
      return;
    }

    const existingAccount = await Account.findOne({
      name: name.trim(),
      _id: { $ne: id }
    });
    if (existingAccount) {
      res.status(409).json({ message: 'Account name already exists' });
      return;
    }

    account.name = name.trim();
    await account.save();

    res.json({ account });
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const account = await Account.findById(id);
    if (!account) {
      res.status(404).json({ message: 'Account not found' });
      return;
    }

    // Delete all transactions associated with this account
    const deletedTransactions = await Transaction.deleteMany({ accountId: id });

    // Delete the account
    await Account.findByIdAndDelete(id);

    res.json({
      message: 'Account and associated transactions deleted successfully',
      deletedTransactions: deletedTransactions.deletedCount
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
