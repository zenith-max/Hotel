import mongoose from 'mongoose';

const menuCategorySchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  name: { type: String, required: true, trim: true },
  displayOrder: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

menuCategorySchema.index({ restaurant: 1, name: 1 }, { unique: true });

export default mongoose.model('MenuCategory', menuCategorySchema);
