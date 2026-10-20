import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import User from '../models/User.js';
import env from '../config/env.js';

const parseCookies = (cookieHeader = '') => {
  const cookies = {};
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (!key) continue;
    cookies[key] = decodeURIComponent(rest.join('='));
  }
  return cookies;
};

const initSocketIO = (server) => {
  const io = new Server(server, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie || '');
      const token = cookies.token;

      if (!token) {
        return next(new Error('Authentication required for Socket.IO.'));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET);
      const user = await User.findById(decoded.id).populate('restaurant');

      if (!user || !user.active) {
        return next(new Error('User is not authorized.'));
      }

      socket.data.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token.'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    if (!user?.restaurant) {
      return socket.disconnect();
    }

    const room = `restaurant:${user.restaurant._id.toString()}`;
    socket.join(room);
    socket.emit('connected', { restaurantId: user.restaurant._id, role: user.role });

    socket.on('disconnect', () => {
      socket.leave(room);
    });
  });

  return io;
};

export default initSocketIO;
