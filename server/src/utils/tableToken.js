import crypto from 'crypto';
import env from '../config/env.js';

export const generateToken = () => {
  return crypto.randomBytes(6).toString('hex');
};

export const buildPublicTableUrl = (token) => {
  return `${env.CLIENT_URL}/t/${token}`;
};
