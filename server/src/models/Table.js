import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  tableNumber: { type: String, required: true, trim: true },
  token: { type: String, unique: true, required: true, index: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

tableSchema.index({ restaurant: 1, tableNumber: 1 }, { unique: true });

export default mongoose.model('Table', tableSchema);
