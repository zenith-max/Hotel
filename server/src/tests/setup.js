import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

export const setupTestDB = async () => {
  process.env.NODE_ENV = 'test';

  process.env.MONGOMS_VERSION = '7.0.14';
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;

  await mongoose.connect(uri, { dbName: 'harbortable_test' });
};

export const teardownTestDB = async () => {
  const db = mongoose.connection.db;
  if (db) {
    await db.dropDatabase();
  }

  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
};
