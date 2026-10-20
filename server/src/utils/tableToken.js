import crypto from 'crypto';

export const generateToken = () => {
  return crypto.randomBytes(6).toString('hex');
};

export const buildPublicTableUrl = (token) => {
  return `${process.env.CLIENT_URL || 'http://localhost:5173'}/t/${token}`;
};
