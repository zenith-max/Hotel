import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import env from './config/env.js';
import initSocketIO from './sockets/index.js';

const startServer = async () => {
  await connectDB();
  const server = http.createServer(app);
  const io = initSocketIO(server);
  app.set('io', io);

  server.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });
};

startServer();
