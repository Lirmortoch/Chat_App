const { createServer } = require('node:http');
const ws = require('socket.io');
const cookie = require('cookie');

const app = require('./app'); // the actual Express application
const config = require('./utils/config');
const middlewareService = require('./services/middlewareService');
const logger = require('./utils/logger');

const httpServer = createServer(app);

const socketServer = new ws.Server(httpServer, {
  cors: { origin: 'http://localhost:5173', },
});

socketServer.use(async (socket, next) => {
  try {
    const headerCookie = socket.handshake.headers.cookie;
    if (!headerCookie) {
      return new Error('Authentication error: No cookies found');
    }

    const cookies = cookie.parse(headerCookie);
    const identifier = cookies.identifier;

    if (!identifier) {
      return new Error('Authentication error: No identifier');
    }

    const user = await middlewareService.getSessionData(identifier);
    
    if (!user) {
      return new Error('Authentication error: Session invalid');
    }
    else if (new Date(user.expired_at) > new Date()) {
      return new Error('Authentication error: Session expired');
    }
    else if (user.restricted || user.deleted) {
      return new Error('Authentication error: Account suspended');
    }

    socket.user = user;
    next();
  } catch (err) {
    logger.error('Socket Auth Error:', err);
    next(new Error('Internal server error'));
  }
});

app.set('ws', socketServer);

socketServer.on('connection', (socket) => {
  logger.info(`User ${socket.user.username} authorized via socket`);

  socket.on('setup_user', async () => {
    socket.join(socket.user.public_id);

    const userChats = await middlewareService.getUserChats(socket.user.id);

    userChats.forEach(chat => {
      socket.join(chat.chat_id); 
    });

    logger.info(`User - ${user_id} initialized and joined ${userChats.length} chats`);
  });

  socket.on('join_chat', async (chat_id) => {
    const isAllowed = await middlewareService.getUserChatAccess(socket.user.id, chat_id);

    if (!isAllowed) {
      return socket.emit('error_message', 'You do not have access to this chat');
    }

    socket.join(chat_id);
    logger.info(`User ${socket.user.username} joined chat ${chat_id}`);
  });

  socket.on('leave_chat', (chat_id) => {
    socket.leave(chat_id);
    logger.info(`User ${socket.user.name} leave chat ${chat_id}`);
  });

  socket.on('chat_typing', (chat_id) => {
    socket.to(chat_id).emit('typing', { 
      chat_id, 
      user_name: socket.user.name, 
      user_id: socket.user.public_id 
    });
  });

  socket.on('chat_stop-typing', (chat_id) => {
    socket.in(chat_id).emit('stop-typing');
  });

  socket.on('disconnect', () => {
    logger.info(`User ${socket.user.username} disconnect`);
  });
});

httpServer.listen(config.SERVER_PORT, () => {
  logger.info(`Server running on port ${config.SERVER_PORT}`);
});