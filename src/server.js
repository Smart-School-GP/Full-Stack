const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 4000;

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
  console.log(`User connected: ${socket.user.id}`);
  
  socket.join(`user:${socket.user.id}`);

  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`User ${socket.user.id} joined conversation ${conversationId}`);
  });

  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
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
      console.error('Error marking messages as read:', err);
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
    console.log(`User disconnected: ${socket.user.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.io ready`);
});
