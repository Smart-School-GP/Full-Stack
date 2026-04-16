const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 4000;

const logger = require('./lib/logger');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
});

global.io = io;

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Unauthorized'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  logger.info('Socket connected', { userId: socket.user.id, schoolId: socket.user.school_id });
  
  socket.join(`user:${socket.user.id}`);

  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation:${conversationId}`);
    logger.debug('User joined conversation', { userId: socket.user.id, conversationId });
  });

  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
    logger.debug('User left conversation', { userId: socket.user.id, conversationId });
  });

  socket.on('mark_read', async (conversationId) => {
    const prisma = require("./lib/prisma");
    
    try {
      await prisma.message.updateMany({
        where: {
          conversationId,
          senderId: { not: socket.user.id },
          isRead: false,
        },
        data: { isRead: true },
      });

    } catch (err) {
      logger.error('Error marking messages as read', { error: err.message, conversationId, userId: socket.user.id });
    }
  });

  socket.on('typing', (conversationId) => {
    socket.to(`conversation:${conversationId}`).emit('user_typing', {
      conversationId,
      userId: socket.user.id,
      userName: socket.user.name,
    });
  });

  socket.on('disconnect', () => {
    logger.info('Socket disconnected', { userId: socket.user.id });
  });
});

async function start() {
  const prisma = require('./lib/prisma');
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      logger.error('Database is empty — no users found. Run npm run seed');
      process.exit(1);
    }
    logger.info('Database status OK', { userCount });
  } catch (err) {
    logger.error('Cannot connect to database', { error: err.message });
    process.exit(1);
  }

  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info('Socket.io ready');
  });
}

start();
