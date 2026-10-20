import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuCategory', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  dietary: {
    type: String,
    enum: ['veg', 'non-veg', 'vegan'],
    default: 'veg',
  },
  available: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('MenuItem', menuItemSchema);
