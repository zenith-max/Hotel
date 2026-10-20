import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect, authorize } from '../middleware/auth.js';
import { getRestaurantProfile, updateRestaurantProfile, getOverview, getMenu, createMenuItem, updateMenuItem, deleteMenuItem, getCategories, createCategory, getTables, createTable, regenerateTableToken, getOrders, getTableBillingSummary, generateTableBill, clearTableAfterPayment, uploadMenuImage } from '../controllers/adminController.js';

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
router.use(protect, authorize('admin'));

router.get('/restaurant', getRestaurantProfile);
router.put('/restaurant', updateRestaurantProfile);
router.get('/overview', getOverview);
router.get('/menu', getMenu);
router.post('/menu', createMenuItem);
router.put('/menu/:id', updateMenuItem);
router.delete('/menu/:id', deleteMenuItem);
router.post('/upload', upload.single('image'), uploadMenuImage);
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.get('/tables', getTables);
router.post('/tables', createTable);
router.get('/tables/:id/billing', getTableBillingSummary);
router.post('/tables/:id/bill', generateTableBill);
router.post('/tables/:id/clear', clearTableAfterPayment);
router.post('/tables/:id/regenerate-token', regenerateTableToken);
router.get('/orders', getOrders);

export default router;
