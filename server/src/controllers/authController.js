import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import env from '../config/env.js';

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  restaurant: user.restaurant ? user.restaurant._id || user.restaurant : null,
});

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const user = await User.findOne({ email: String(email).toLowerCase() }).populate('restaurant');
  if (!user || !user.active) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const token = jwt.sign({ id: user._id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: env.COOKIE_SAME_SITE,
    secure: env.COOKIE_SECURE,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({ success: true, user: sanitizeUser(user) });
};

export const logout = (_req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: env.COOKIE_SAME_SITE,
    secure: env.COOKIE_SECURE,
  });
  return res.json({ success: true, message: 'Logged out successfully.' });
};

export const getCurrentUser = async (req, res) => {
  const user = await User.findById(req.user._id).populate('restaurant');
  return res.json({ success: true, user: sanitizeUser(user) });
};
