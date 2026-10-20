import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';
import MenuCategory from '../models/MenuCategory.js';
import MenuItem from '../models/MenuItem.js';
import Table from '../models/Table.js';
import Order from '../models/Order.js';

const sanitizeAdmin = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  active: user.active,
  restaurant: user.restaurant ? user.restaurant._id || user.restaurant : null,
  restaurantName: user.restaurant?.name || '',
});

export const getSuperAdminOverview = async (_req, res) => {
  const [restaurants, admins] = await Promise.all([
    Restaurant.find().sort({ createdAt: -1 }).lean(),
    User.find({ role: 'admin' }).select('-password').populate('restaurant').sort({ createdAt: -1 }).lean(),
  ]);

  const restaurantMap = new Map(restaurants.map((restaurant) => [String(restaurant._id), { ...restaurant, admins: [] }]));

  for (const admin of admins) {
    const key = admin.restaurant ? String(admin.restaurant._id || admin.restaurant) : null;
    if (!key) continue;
    const current = restaurantMap.get(key);
    if (current) {
      current.admins.push(sanitizeAdmin({ ...admin, restaurant: admin.restaurant }));
    }
  }

  return res.json({
    success: true,
    restaurants: Array.from(restaurantMap.values()),
    admins: admins.map((admin) => sanitizeAdmin({ ...admin, restaurant: admin.restaurant })),
  });
};

export const createRestaurantWithAdmin = async (req, res) => {
  const {
    restaurantName,
    restaurantAddress,
    restaurantContact,
    restaurantLogo,
    adminName,
    adminEmail,
    adminPassword,
  } = req.body;

  if (!restaurantName || !adminName || !adminEmail || !adminPassword) {
    return res.status(400).json({
      success: false,
      message: 'Restaurant name, admin name, email, and password are required.',
    });
  }

  const normalizedEmail = String(adminEmail).trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({ success: false, message: 'An admin with that email already exists.' });
  }

  const restaurant = await Restaurant.create({
    name: String(restaurantName).trim(),
    logo: restaurantLogo || '',
    address: restaurantAddress || '',
    contact: restaurantContact || '',
    currency: 'INR',
    active: true,
  });

  const admin = await User.create({
    name: String(adminName).trim(),
    email: normalizedEmail,
    password: String(adminPassword),
    role: 'admin',
    restaurant: restaurant._id,
    active: true,
  });

  return res.status(201).json({
    success: true,
    restaurant,
    admin: sanitizeAdmin(admin),
  });
};

export const updateRestaurant = async (req, res) => {
  const { id } = req.params;
  const { name, logo, address, contact } = req.body;

  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'Restaurant not found.' });
  }

  if (name !== undefined) restaurant.name = String(name).trim() || restaurant.name;
  if (logo !== undefined) restaurant.logo = String(logo).trim();
  if (address !== undefined) restaurant.address = String(address).trim();
  if (contact !== undefined) restaurant.contact = String(contact).trim();

  await restaurant.save();

  return res.json({ success: true, restaurant });
};

export const deleteRestaurant = async (req, res) => {
  const { id } = req.params;

  const restaurant = await Restaurant.findById(id);
  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'Restaurant not found.' });
  }

  const restaurantId = restaurant._id;

  await Promise.all([
    User.deleteMany({ restaurant: restaurantId }),
    MenuCategory.deleteMany({ restaurant: restaurantId }),
    MenuItem.deleteMany({ restaurant: restaurantId }),
    Table.deleteMany({ restaurant: restaurantId }),
    Order.deleteMany({ restaurant: restaurantId }),
    Restaurant.findByIdAndDelete(restaurantId),
  ]);

  return res.json({ success: true, message: 'Restaurant and all related data were deleted.' });
};

export const updateAdminPassword = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  const admin = await User.findById(id);
  if (!admin || admin.role !== 'admin') {
    return res.status(404).json({ success: false, message: 'Admin user not found.' });
  }

  if (!password || String(password).trim().length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }

  admin.password = String(password);
  await admin.save();

  return res.json({ success: true, message: 'Admin password updated successfully.' });
};

export const toggleAdminStatus = async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;

  const admin = await User.findById(id);
  if (!admin || admin.role !== 'admin') {
    return res.status(404).json({ success: false, message: 'Admin user not found.' });
  }

  admin.active = active !== undefined ? Boolean(active) : !admin.active;
  await admin.save();

  return res.json({ success: true, admin: sanitizeAdmin(admin) });
};
