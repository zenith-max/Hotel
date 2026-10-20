import mongoose from 'mongoose';
import env from './env.js';

let memoryServer = null;

const connectDB = async () => {
  let mongoUri = env.MONGODB_URI;

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('MongoDB connected');
    return;
  } catch (primaryError) {
    if (env.NODE_ENV === 'production') {
      throw primaryError;
    }

    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create({
        binary: { version: '7.0.14' },
      });
      mongoUri = memoryServer.getUri();
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 20000,
      });
      console.log('MongoDB connected via in-memory server:', mongoUri);
      return;
    } catch (fallbackError) {
      console.error('MongoDB connection failed:', primaryError.message);
      console.error('In-memory MongoDB fallback failed:', fallbackError.message);
      throw fallbackError;
    }
  }
};

export default connectDB;
