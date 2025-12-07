import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

    await mongoose.connect(mongoURI);

    console.log(`MongoDB connected successfully to: ${mongoURI.split('@')[1]?.split('/')[1] || 'test'}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
