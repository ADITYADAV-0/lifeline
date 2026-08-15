import mongoose from 'mongoose';
import { config } from './config';

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(config.mongoUri);
    console.log(`[db] connected to MongoDB at ${config.mongoUri}`);
  } catch (error) {
    console.error('[db] failed to connect to MongoDB', error);
    process.exit(1);
  }
}
