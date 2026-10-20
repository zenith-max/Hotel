import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  specialInstructions: { type: String, default: '' },
}, { _id: false });

const billingSchema = new mongoose.Schema({
  billNumber: { type: String, default: '' },
  subtotal: { type: Number, default: 0, min: 0 },
  gstRate: { type: Number, default: 5 },
  gstAmount: { type: Number, default: 0, min: 0 },
  total: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    enum: ['Draft', 'Generated', 'Paid'],
    default: 'Draft',
  },
  generatedAt: { type: Date, default: null },
  paidAt: { type: Date, default: null },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  orderNumber: { type: String, required: true, unique: true },
  clientRequestId: { type: String, default: '', index: true },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  bill: { type: billingSchema, default: () => ({}) },
  status: {
    type: String,
    enum: ['Received', 'Preparing', 'Ready', 'Completed'],
    default: 'Received',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

orderSchema.index({ restaurant: 1, createdAt: -1 });
orderSchema.index({ table: 1, createdAt: -1 });

export default mongoose.model('Order', orderSchema);
