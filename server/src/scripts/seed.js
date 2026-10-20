import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';

const seed = async () => {
  await connectDB();

  const db = mongoose.connection.db;
  if (db) {
    await db.dropDatabase();
  }

  const email = 'super@harbortable.com';
  const password = 'Super123!';

  const existing = await User.findOne({ email });
  if (existing) {
    existing.name = 'Platform Super Admin';
    existing.password = password;
    existing.role = 'super_admin';
    existing.restaurant = null;
    existing.active = true;
    await existing.save();
  } else {
    await User.create({
      name: 'Platform Super Admin',
      email,
      password,
      role: 'super_admin',
      restaurant: null,
      active: true,
    });
  }

  const users = await User.find({}).lean();
  console.log('Database flushed. Remaining users:', users.map((user) => ({ email: user.email, role: user.role })));
  process.exit(0);
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
