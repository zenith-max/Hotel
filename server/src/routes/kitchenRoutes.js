import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getKitchenOrders, updateOrderStatus } from '../controllers/kitchenController.js';

const router = express.Router();
router.use(protect, authorize('kitchen', 'admin'));

router.get('/orders', getKitchenOrders);
router.patch('/orders/:id/status', updateOrderStatus);

export default router;
