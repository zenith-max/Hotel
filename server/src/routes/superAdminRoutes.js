import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect, authorize } from '../middleware/auth.js';
import { createRestaurantWithAdmin, getSuperAdminOverview, updateRestaurant, deleteRestaurant, updateAdminPassword, toggleAdminStatus } from '../controllers/superAdminController.js';
import { uploadImageFile } from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed for uploads.'));
    }

    return cb(null, true);
  },
});

const router = express.Router();
router.use(protect, authorize('super_admin'));

const uploadLogo = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Logo image is required.' });
  }

  const imageUrl = await uploadImageFile(req.file, { folder: 'restaurant-logos' });
  return res.status(201).json({ success: true, imageUrl });
};

router.get('/overview', getSuperAdminOverview);
router.post('/restaurants', createRestaurantWithAdmin);
router.post('/upload', upload.single('image'), uploadLogo);
router.put('/restaurants/:id', updateRestaurant);
router.delete('/restaurants/:id', deleteRestaurant);
router.put('/admins/:id/password', updateAdminPassword);
router.put('/admins/:id/status', toggleAdminStatus);

export default router;
