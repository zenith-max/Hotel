import mongoose from 'mongoose';
import Restaurant from '../models/Restaurant.js';
import Table from '../models/Table.js';
import MenuCategory from '../models/MenuCategory.js';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';

const getRestaurantByToken = async (token) => {
  const table = await Table.findOne({ token }).populate('restaurant');
  if (!table || !table.active) {
    return null;
  }
  return table;
};

export const getRestaurantInfo = async (_req, res) => {
  const restaurant = await Restaurant.findOne({ active: true }).lean();
  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'No active restaurant found.' });
  }
  return res.json({ success: true, restaurant });
};

export const getPublicMenu = async (req, res) => {
  const { restaurantId } = req.query;
  if (!restaurantId) {
    return res.status(400).json({ success: false, message: 'restaurantId is required.' });
  }

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant || !restaurant.active) {
    return res.status(404).json({ success: false, message: 'Restaurant not found.' });
  }

  const categories = await MenuCategory.find({ restaurant: restaurantId, active: true }).sort({ displayOrder: 1, createdAt: 1 }).lean();
  const items = await MenuItem.find({ restaurant: restaurantId, available: true }).populate('category').lean();

  return res.json({ success: true, restaurant, categories, items });
};

export const resolveTableToken = async (req, res) => {
  const { token } = req.params;
  const table = await getRestaurantByToken(token);

  if (!table) {
    return res.status(404).json({ success: false, message: 'This table is unavailable or invalid.' });
  }

  const restaurant = table.restaurant;
  const categories = await MenuCategory.find({ restaurant: restaurant._id, active: true }).sort({ displayOrder: 1, createdAt: 1 }).lean();
  const items = await MenuItem.find({ restaurant: restaurant._id, available: true }).populate('category').lean();

  return res.json({
    success: true,
    restaurant,
    table: {
      id: table._id,
      tableNumber: table.tableNumber,
      token: table.token,
      active: table.active,
    },
    categories,
    items,
  });
};

export const createOrder = async (req, res) => {
  const { tableToken, items, clientRequestId } = req.body;

  if (!tableToken || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ success: false, message: 'Table token and order items are required.' });
  }

  const table = await getRestaurantByToken(tableToken);
  if (!table) {
    return res.status(404).json({ success: false, message: 'Table not found or inactive.' });
  }

  if (clientRequestId) {
    const existingOrder = await Order.findOne({ clientRequestId, restaurant: table.restaurant._id, table: table._id });
    if (existingOrder) {
      return res.status(200).json({ success: true, order: existingOrder, duplicate: true });
    }
  }

  const menuItemIds = items.map((item) => item.menuItemId).filter(Boolean);
  const menuItems = await MenuItem.find({ _id: { $in: menuItemIds }, restaurant: table.restaurant._id }).lean();
  const menuMap = new Map(menuItems.map((item) => [String(item._id), item]));

  const preparedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const menuItem = menuMap.get(String(item.menuItemId));
    if (!menuItem || !menuItem.available) {
      return res.status(400).json({ success: false, message: `Item ${item.menuItemId} is unavailable.` });
    }

    const qty = Number(item.quantity || 1);
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ success: false, message: 'Each item quantity must be at least 1.' });
    }

    const unitPrice = Number(menuItem.price);
    const totalItemValue = unitPrice * qty;
    subtotal += totalItemValue;

    preparedItems.push({
      menuItemId: menuItem._id,
      name: menuItem.name,
      unitPrice,
      quantity: qty,
      specialInstructions: String(item.specialInstructions || ''),
    });
  }

  const total = Number(subtotal.toFixed(2));
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const order = await Order.create({
    restaurant: table.restaurant._id,
    table: table._id,
    orderNumber,
    clientRequestId: clientRequestId || '',
    items: preparedItems,
    subtotal,
    total,
    status: 'Received',
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`restaurant:${table.restaurant._id.toString()}`).emit('order:new', { order });
  }

  return res.status(201).json({ success: true, order, duplicate: false });
};

export const getOrderStatus = async (req, res) => {
  const { orderNumber } = req.params;
  const { tableToken } = req.query;

  if (!tableToken) {
    return res.status(400).json({ success: false, message: 'Table token is required.' });
  }

  const table = await getRestaurantByToken(tableToken);
  if (!table) {
    return res.status(404).json({ success: false, message: 'Table not found or invalid.' });
  }

  const order = await Order.findOne({ orderNumber, table: table._id, restaurant: table.restaurant._id }).lean();
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found.' });
  }

  return res.json({ success: true, order });
};
