import Order from '../models/Order.js';

const allowedStatuses = ['Received', 'Preparing', 'Ready', 'Completed'];
const statusOrder = {
  Received: 0,
  Preparing: 1,
  Ready: 2,
  Completed: 3,
};

export const getKitchenOrders = async (req, res) => {
  const orders = await Order.find({ restaurant: req.user.restaurant._id }).populate('table').sort({ createdAt: -1 });
  return res.json({ success: true, orders });
};

export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'A valid order status is required.' });
  }

  const order = await Order.findOne({ _id: id, restaurant: req.user.restaurant._id });
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found.' });
  }

  const currentIndex = statusOrder[order.status];
  const nextIndex = statusOrder[status];

  if (nextIndex < currentIndex) {
    return res.status(400).json({ success: false, message: 'Order status cannot be reversed.' });
  }

  if (nextIndex > currentIndex + 1) {
    return res.status(400).json({ success: false, message: 'Order status can only advance by one step.' });
  }

  order.status = status;
  await order.save();

  const io = req.app.get('io');
  if (io) {
    io.to(`restaurant:${order.restaurant.toString()}`).emit('order:updated', { order });
  }

  return res.json({ success: true, order });
};
