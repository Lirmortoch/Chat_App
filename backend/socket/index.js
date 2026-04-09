const middlewareService = require('../services/middlewareService');
const logger = require('../utils/logger');

const socketMiddleware = require('./utils/middleware');

const initializeSocket = (io) => {
  io.use(socketMiddleware.checkSocketUserAccess);

  io.on('connection', (socket) => {
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
        return socket.emit('error', 'You do not have access to this chat');
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

    socket.on('message_received', (chat_id) => {
      socket.in(chat_id).emit('message_received');
    });

    socket.on('disconnect', () => {
      logger.info(`User ${socket.user.username} disconnect`);
    });

    socket.on('error', (err) => {
      logger.info(`Error: ${err}`);
    });
  });
}

module.exports = initializeSocket;