import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import env from '../config/env.js';

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.id).populate('restaurant');
    if (!user || !user.active) {
      return res.status(401).json({ success: false, message: 'User is not active.' });
    }

    if (user.role !== 'super_admin' && !user.restaurant) {
      return res.status(401).json({ success: false, message: 'Restaurant assignment missing.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  next();
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.id); 
    if (user && user.active) {
      req.user = user;
    }
    next();
  } catch (error) {
    next();
  }
};
