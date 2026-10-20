import express from 'express';
import { getRestaurantInfo, getPublicMenu, resolveTableToken, createOrder, getOrderStatus } from '../controllers/publicController.js';

const router = express.Router();

router.get('/restaurant', getRestaurantInfo);
router.get('/menu', getPublicMenu);
router.get('/table/:token', resolveTableToken);
router.post('/orders', createOrder);
router.get('/orders/:orderNumber', getOrderStatus);

export default router;
