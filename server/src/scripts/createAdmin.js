import connectDB from '../config/db.js';
import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';

const email = process.argv[2] || 'admin@harbortable.com';
const password = process.argv[3] || 'Admin123!';

const createAdmin = async () => {
  await connectDB();

  let restaurant = await Restaurant.findOne({ name: 'Harbor Table' });
  if (!restaurant) {
    restaurant = await Restaurant.create({
      name: 'Harbor Table',
      address: '24 Shoreline Avenue, Portland',
      contact: '+1 (555) 204-1800',
      currency: 'INR',
      active: true,
    });
  }

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) {
    console.log('Admin user already exists.');
    process.exit(0);
  }

  const user = await User.create({
    name: 'Restaurant Admin',
    email: String(email).toLowerCase(),
    password,
    role: 'admin',
    restaurant: restaurant._id,
    active: true,
  });

  console.log(`Created admin user: ${user.email}`);
  process.exit(0);
};

createAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
