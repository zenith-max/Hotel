import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRootEnv = path.resolve(__dirname, '../../../.env');

dotenv.config({ path: projectRootEnv });
dotenv.config();

const env = {
  PORT: Number(process.env.PORT || 5000),
  CLIENT_URL: process.env.CLIENT_URL || 'https://hotel-frontend-0tso.onrender.com',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nfc_restaurant',
  JWT_SECRET: process.env.JWT_SECRET || 'development-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  NODE_ENV: process.env.NODE_ENV || 'production',
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'server/uploads',
  COOKIE_SECURE: String(process.env.COOKIE_SECURE || 'false') === 'true',
  COOKIE_SAME_SITE: process.env.COOKIE_SAME_SITE || 'lax',
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX || 100),
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER || 'nfc-restaurant',
};

if (!env.JWT_SECRET || env.JWT_SECRET === 'development-secret-change-me') {
  console.warn('Warning: JWT_SECRET is using a default development value. Update your .env file before production use.');
}

export default env;
