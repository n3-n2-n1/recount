import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const createInitialAdmin = async (): Promise<void> => {
  try {
    // Connect to database using same config as main app
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
    await mongoose.connect(mongoURI);

    console.log(`Connected to database: ${mongoURI.split('@')[1]?.split('/')[1] || 'test'}`);

    // Check if any users exist
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('✅ Admin user already exists. Skipping initialization.');
      process.exit(0);
    }

    // Create initial admin user
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@recount.com';
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.INITIAL_ADMIN_NAME || 'Administrator';

    console.log('🚀 Creating initial admin user...');
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`👤 Name: ${adminName}`);

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create user
    const adminUser = new User({
      email: adminEmail.toLowerCase(),
      password: hashedPassword,
      name: adminName,
      role: 'super_admin'
    });

    await adminUser.save();

    console.log('✅ Initial admin user created successfully!');
    console.log('🔐 Please change the default password after first login.');
    console.log('\n📋 Login credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('   Role: super_admin');

  } catch (error) {
    console.error('❌ Error creating initial admin:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

// Run the script
createInitialAdmin();