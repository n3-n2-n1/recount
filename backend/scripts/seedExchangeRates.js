/**
 * Seed script to initialize default exchange rates
 * Run with: node scripts/seedExchangeRates.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import ExchangeRate from '../src/models/ExchangeRate.js';
import User from '../src/models/User.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

const defaultRates = [
  { currency: 'DÓLAR', rateToUSD: 1.0000, description: 'Base currency' },
  { currency: 'CABLE', rateToUSD: 1.0100, description: 'Cable dollar' },
  { currency: 'PESOS', rateToUSD: 0.0010, description: 'Argentine Peso (1 USD = 1000 ARS)' },
  { currency: 'CHEQUE', rateToUSD: 0.9500, description: 'Check dollar' },
  { currency: 'DOLAR INTERNACIONAL', rateToUSD: 1.0050, description: 'Cable broker dollar' }
];

async function seedExchangeRates() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find a super_admin user to set as updatedBy
    const adminUser = await User.findOne({ role: 'super_admin' });
    
    if (!adminUser) {
      console.error('❌ No super_admin user found. Please create a super_admin user first.');
      console.log('   You can use the existing seed script: node scripts/seed.js');
      process.exit(1);
    }

    console.log(`📝 Using user: ${adminUser.name} (${adminUser.email}) as creator`);

    // Check if rates already exist
    const existingRates = await ExchangeRate.find();
    
    if (existingRates.length > 0) {
      console.log('⚠️  Exchange rates already exist:');
      existingRates.forEach(rate => {
        console.log(`   - ${rate.currency}: ${rate.rateToUSD}`);
      });
      
      console.log('\n❓ Do you want to update existing rates? (yes/no)');
      console.log('   This script will exit. Run again with --force to update.');
      process.exit(0);
    }

    console.log('\n💰 Creating default exchange rates...');
    
    for (const rateData of defaultRates) {
      const rate = await ExchangeRate.create({
        currency: rateData.currency,
        rateToUSD: rateData.rateToUSD,
        updatedBy: adminUser._id
      });
      
      console.log(`   ✅ ${rateData.currency}: ${rateData.rateToUSD} - ${rateData.description}`);
    }

    console.log('\n✨ Exchange rates seeded successfully!');
    console.log('\n📊 Summary:');
    const allRates = await ExchangeRate.find().sort({ currency: 1 });
    allRates.forEach(rate => {
      console.log(`   - ${rate.currency}: ${rate.rateToUSD} USD`);
    });

  } catch (error) {
    console.error('❌ Error seeding exchange rates:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the seed function
seedExchangeRates();
