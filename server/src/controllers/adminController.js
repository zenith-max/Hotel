import Restaurant from '../models/Restaurant.js';
import MenuCategory from '../models/MenuCategory.js';
import MenuItem from '../models/MenuItem.js';
import Table from '../models/Table.js';
import Order from '../models/Order.js';
import env from '../config/env.js';
import { generateToken } from '../utils/tableToken.js';

export const getRestaurantProfile = async (req, res) => {
  const restaurant = await Restaurant.findById(req.user.restaurant._id).lean();
  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'Restaurant profile not found.' });
  }

  return res.json({ success: true, restaurant });
};

export const updateRestaurantProfile = async (req, res) => {
  const restaurant = await Restaurant.findById(req.user.restaurant._id);
  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'Restaurant profile not found.' });
  }

  const { name, logo, address, contact } = req.body;

  if (name !== undefined) restaurant.name = String(name).trim() || restaurant.name;
  if (logo !== undefined) restaurant.logo = String(logo).trim();
  if (address !== undefined) restaurant.address = String(address).trim();
  if (contact !== undefined) restaurant.contact = String(contact).trim();

  await restaurant.save();

  return res.json({ success: true, restaurant });
};

export const getOverview = async (req, res) => {
  const restaurantId = req.user.restaurant._id;
  const [totalOrders, activeOrders, completedOrders, salesSummary] = await Promise.all([
    Order.countDocuments({ restaurant: restaurantId }),
    Order.countDocuments({ restaurant: restaurantId, status: { $in: ['Received', 'Preparing', 'Ready'] } }),
    Order.countDocuments({ restaurant: restaurantId, status: 'Completed' }),
    Order.aggregate([
      { $match: { restaurant: restaurantId, 'bill.status': { $in: ['Generated', 'Paid'] } } },
      { $group: { _id: null, totalSales: { $sum: '$total' }, averageOrderValue: { $avg: '$total' } } },
    ]),
  ]);

  return res.json({
    success: true,
    overview: {
      totalOrders,
      activeOrders,
      completedOrders,
      totalSales: salesSummary[0]?.totalSales || 0,
      averageOrderValue: salesSummary[0]?.averageOrderValue || 0,
    },
  });
};

export const getMenu = async (req, res) => {
  const items = await MenuItem.find({ restaurant: req.user.restaurant._id }).populate('category').sort({ createdAt: -1 });
  return res.json({ success: true, items });
};

export const createMenuItem = async (req, res) => {
  const { category, name, description, image, price, dietary, available } = req.body;

  if (!category || !name || !price) {
    return res.status(400).json({ success: false, message: 'Category, name, and price are required.' });
  }

  const item = await MenuItem.create({
    restaurant: req.user.restaurant._id,
    category,
    name,
    description: description || '',
    image: image || '',
    price: Number(price),
    dietary: dietary || 'veg',
    available: available !== false,
  });

  return res.status(201).json({ success: true, item });
};

export const updateMenuItem = async (req, res) => {
  const item = await MenuItem.findOne({ _id: req.params.id, restaurant: req.user.restaurant._id });
  if (!item) {
    return res.status(404).json({ success: false, message: 'Menu item not found.' });
  }

  Object.assign(item, req.body, {
    price: req.body.price !== undefined ? Number(req.body.price) : item.price,
  });
  await item.save();

  return res.json({ success: true, item });
};

export const deleteMenuItem = async (req, res) => {
  const item = await MenuItem.findOne({ _id: req.params.id, restaurant: req.user.restaurant._id });
  if (!item) {
    return res.status(404).json({ success: false, message: 'Menu item not found.' });
  }

  await item.deleteOne();
  return res.json({ success: true, message: 'Menu item deleted.' });
};

export const getCategories = async (req, res) => {
  const categories = await MenuCategory.find({ restaurant: req.user.restaurant._id }).sort({ displayOrder: 1, createdAt: 1 });
  return res.json({ success: true, categories });
};

export const createCategory = async (req, res) => {
  const { name, displayOrder } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Category name is required.' });
  }

  const category = await MenuCategory.create({
    restaurant: req.user.restaurant._id,
    name,
    displayOrder: displayOrder || 0,
  });

  return res.status(201).json({ success: true, category });
};

export const getTables = async (req, res) => {
  const tables = await Table.find({ restaurant: req.user.restaurant._id }).sort({ tableNumber: 1 });
  return res.json({ success: true, tables });
};

export const createTable = async (req, res) => {
  const { tableNumber } = req.body;
  if (!tableNumber) {
    return res.status(400).json({ success: false, message: 'Table number is required.' });
  }

  const table = await Table.create({
    restaurant: req.user.restaurant._id,
    tableNumber: String(tableNumber),
    token: generateToken(),
    active: true,
  });

  return res.status(201).json({ success: true, table, publicUrl: `${env.CLIENT_URL}/t/${table.token}` });
};

export const regenerateTableToken = async (req, res) => {
  const table = await Table.findOne({ _id: req.params.id, restaurant: req.user.restaurant._id });
  if (!table) {
    return res.status(404).json({ success: false, message: 'Table not found.' });
  }

  let token = generateToken();
  while (await Table.exists({ token })) {
    token = generateToken();
  }

  table.token = token;
  await table.save();

  return res.json({ success: true, table, publicUrl: `${env.CLIENT_URL}/t/${token}` });
};

export const getOrders = async (req, res) => {
  const { status, table, startDate, endDate } = req.query;
  const filter = { restaurant: req.user.restaurant._id };

  if (status) filter.status = status;
  if (table) filter.table = table;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const orders = await Order.find(filter).populate('table').sort({ createdAt: -1 });
  return res.json({ success: true, orders });
};

const GST_RATE = 0.05;

export const getTableBillingSummary = async (req, res) => {
  const { id } = req.params;

  const table = await Table.findOne({ _id: id, restaurant: req.user.restaurant._id });
  if (!table) {
    return res.status(404).json({ success: false, message: 'Table not found.' });
  }

  const orders = await Order.find({ restaurant: req.user.restaurant._id, table: table._id }).sort({ createdAt: -1 });
  const subtotal = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const gstAmount = Number((subtotal * GST_RATE).toFixed(2));
  const total = Number((subtotal + gstAmount).toFixed(2));

  return res.json({
    success: true,
    table,
    orders,
    summary: {
      billNumber: `BILL-${Date.now()}-${String(table.tableNumber).padStart(2, '0')}`,
      subtotal,
      gstRate: GST_RATE * 100,
      gstAmount,
      total,
      orderCount: orders.length,
    },
  });
};

export const generateTableBill = async (req, res) => {
  const { id } = req.params;

  const table = await Table.findOne({ _id: id, restaurant: req.user.restaurant._id });
  if (!table) {
    return res.status(404).json({ success: false, message: 'Table not found.' });
  }

  const orders = await Order.find({ restaurant: req.user.restaurant._id, table: table._id, status: { $ne: 'Completed' } }).sort({ createdAt: -1 });
  if (!orders.length) {
    return res.status(400).json({ success: false, message: 'No active order is available for this table.' });
  }

  const subtotal = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const gstAmount = Number((subtotal * GST_RATE).toFixed(2));
  const total = Number((subtotal + gstAmount).toFixed(2));
  const billNumber = `BILL-${Date.now()}-${String(table.tableNumber).padStart(2, '0')}`;

  await Order.updateMany(
    { restaurant: req.user.restaurant._id, table: table._id, status: { $ne: 'Completed' } },
    {
      $set: {
        status: 'Completed',
        'bill.billNumber': billNumber,
        'bill.subtotal': subtotal,
        'bill.gstRate': GST_RATE * 100,
        'bill.gstAmount': gstAmount,
        'bill.total': total,
        'bill.status': 'Generated',
        'bill.generatedAt': new Date(),
      },
    }
  );

  return res.json({
    success: true,
    message: 'Bill generated successfully.',
    bill: {
      billNumber,
      subtotal,
      gstRate: GST_RATE * 100,
      gstAmount,
      total,
      status: 'Generated',
    },
  });
};

export const clearTableAfterPayment = async (req, res) => {
  const { id } = req.params;

  const table = await Table.findOne({ _id: id, restaurant: req.user.restaurant._id });
  if (!table) {
    return res.status(404).json({ success: false, message: 'Table not found.' });
  }

  const orders = await Order.find({ restaurant: req.user.restaurant._id, table: table._id, status: 'Completed' });
  if (!orders.length) {
    return res.status(400).json({ success: false, message: 'There is no completed bill to clear for this table.' });
  }

  await Order.updateMany(
    { restaurant: req.user.restaurant._id, table: table._id, status: 'Completed' },
    {
      $set: {
        'bill.status': 'Paid',
        'bill.paidAt': new Date(),
      },
    }
  );

  return res.json({ success: true, message: 'Table cleared and ready for the next guest.' });
};

import { uploadImageFile } from '../config/cloudinary.js';

export const uploadMenuImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Image file is required.' });
  }

  const imageUrl = await uploadImageFile(req.file, { folder: 'restaurant-assets' });
  return res.status(201).json({ success: true, imageUrl });
};
