import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  logo: { type: String, default: '' },
  address: { type: String, default: '' },
  contact: { type: String, default: '' },
  currency: { type: String, default: 'INR' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Restaurant', restaurantSchema);
