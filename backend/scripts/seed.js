import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';
import Account from '../src/models/Account.js';
import Transaction from '../src/models/Transaction.js';
import { connectDB } from '../src/config/database.js';

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('Connected to database');

    // Clear existing data
    await User.deleteMany({});
    await Account.deleteMany({});
    await Transaction.deleteMany({});
    console.log('Cleared existing data');

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = new User({
      email: 'admin@recount.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'super_admin'
    });
    await user.save();
    console.log('Created test user');

    // Create reviewer user
    const reviewerPassword = await bcrypt.hash('password123', 10);
    const reviewer = new User({
      email: 'reviewer@recount.com',
      password: reviewerPassword,
      name: 'Reviewer User',
      role: 'reviewer'
    });
    await reviewer.save();
    console.log('Created reviewer user');

    // Create test account
    const account = new Account({
      name: 'Main Account',
      balances: [
        { currency: 'DÓLAR', amount: 10000 },
        { currency: 'CABLE', amount: 5000 },
        { currency: 'PESOS', amount: 100000 }
      ]
    });
    await account.save();
    console.log('Created test account');

    // Create sample transactions
    const transactions = [
      {
        accountId: account._id,
        type: 'Entrada',
        description: 'Initial deposit',
        currency: 'DÓLAR',
        amount: 5000,
        createdBy: user._id
      },
      {
        accountId: account._id,
        type: 'Salida',
        description: 'Office supplies',
        currency: 'DÓLAR',
        amount: 500,
        createdBy: user._id
      },
      {
        accountId: account._id,
        type: 'Entrada',
        description: 'Cable payment',
        currency: 'CABLE',
        amount: 2000,
        createdBy: reviewer._id
      },
      {
        accountId: account._id,
        type: 'Swap',
        description: 'Currency exchange',
        currency: 'DÓLAR',
        amount: 1000,
        targetCurrency: 'CABLE',
        exchangeRate: 0.9,
        createdBy: user._id
      }
    ];

    for (const transactionData of transactions) {
      const transaction = new Transaction(transactionData);
      await transaction.save();
    }
    console.log('Created sample transactions');

    // Update account balances based on transactions
    await updateAccountBalances(account._id);

    console.log('Database seeded successfully!');
    console.log('Test credentials:');
    console.log('Admin - Email: admin@recount.com, Password: password123');
    console.log('Reviewer - Email: reviewer@recount.com, Password: password123');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

const updateAccountBalances = async (accountId) => {
  const account = await Account.findById(accountId);
  if (!account) return;

  // Reset balances
  account.balances.forEach(balance => {
    balance.amount = 0;
  });

  // Calculate balances from transactions
  const transactions = await Transaction.find({ accountId });

  for (const transaction of transactions) {
    const balanceIndex = account.balances.findIndex(b => b.currency === transaction.currency);

    if (balanceIndex !== -1) {
      if (transaction.type === 'Entrada') {
        account.balances[balanceIndex].amount += transaction.amount;
      } else if (transaction.type === 'Salida') {
        account.balances[balanceIndex].amount -= transaction.amount;
      } else if (transaction.type === 'Swap') {
        account.balances[balanceIndex].amount -= transaction.amount;
        if (transaction.targetCurrency) {
          const targetBalanceIndex = account.balances.findIndex(b => b.currency === transaction.targetCurrency);
          if (targetBalanceIndex !== -1) {
            account.balances[targetBalanceIndex].amount += transaction.amount; // Simplified
          }
        }
      }
    }
  }

  await account.save();
  console.log('Updated account balances');
};

// Run the seed function
seedDatabase();