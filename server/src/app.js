import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import env from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import kitchenRoutes from './routes/kitchenRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('trust proxy', 1);

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const publicLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

app.use('/api/public', publicLimiter);
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/super-admin', superAdminRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Server is healthy.' });
});

app.use(notFound);
app.use(errorHandler);

export default app;
