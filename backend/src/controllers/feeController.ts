import express, { type Request, type Response } from 'express';
import mongoose from 'mongoose';
import Fee, { type IFee } from '../models/Fee.js';

export const getFees = async (req: Request, res: Response): Promise<void> => {
  try {
    const fees = await Fee.find({ isActive: true })
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ currency: 1, transactionType: 1 });

    res.json({ fees });
  } catch (error) {
    console.error('Get fees error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createFee = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { currency, transactionType, percentage, description } = req.body;

    if (!currency || !transactionType || percentage === undefined) {
      res.status(400).json({ message: 'Required fields missing' });
      return;
    }

    if (percentage < 0 || percentage > 100) {
      res.status(400).json({ message: 'Percentage must be between 0 and 100' });
      return;
    }

    // Check if fee already exists for this currency + transaction type
    const existingFee = await Fee.findOne({ currency, transactionType });
    if (existingFee) {
      res.status(409).json({ message: 'Fee already exists for this currency and transaction type' });
      return;
    }

    const fee = new Fee({
      currency,
      transactionType,
      percentage,
      description,
      createdBy: user._id,
      updatedBy: user._id
    });

    await fee.save();

    const populatedFee = await Fee.findById(fee._id)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    res.status(201).json({ fee: populatedFee });
  } catch (error) {
    console.error('Create fee error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateFee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const updates = req.body;

    const fee = await Fee.findById(id);
    if (!fee) {
      res.status(404).json({ message: 'Fee not found' });
      return;
    }

    // Validate percentage if provided
    if (updates.percentage !== undefined && (updates.percentage < 0 || updates.percentage > 100)) {
      res.status(400).json({ message: 'Percentage must be between 0 and 100' });
      return;
    }

    // Check for duplicate if currency or transactionType is being changed
    if (updates.currency || updates.transactionType) {
      const newCurrency = updates.currency || fee.currency;
      const newTransactionType = updates.transactionType || fee.transactionType;

      const existingFee = await Fee.findOne({
        currency: newCurrency,
        transactionType: newTransactionType,
        _id: { $ne: id }
      });

      if (existingFee) {
        res.status(409).json({ message: 'Fee already exists for this currency and transaction type' });
        return;
      }
    }

    updates.updatedBy = user._id;
    await Fee.findByIdAndUpdate(id, updates, { new: true });

    const updatedFee = await Fee.findById(id)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    res.json({ fee: updatedFee });
  } catch (error) {
    console.error('Update fee error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteFee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const fee = await Fee.findById(id);
    if (!fee) {
      res.status(404).json({ message: 'Fee not found' });
      return;
    }

    // Soft delete by setting isActive to false
    await Fee.findByIdAndUpdate(id, { isActive: false });

    res.json({ message: 'Fee deactivated successfully' });
  } catch (error) {
    console.error('Delete fee error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getFeeByCurrencyAndType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currency, transactionType } = req.params;

    const fee = await Fee.findOne({
      currency,
      transactionType,
      isActive: true
    });

    if (!fee) {
      res.json({ fee: null });
      return;
    }

    res.json({ fee });
  } catch (error) {
    console.error('Get fee by currency and type error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};