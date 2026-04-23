import middlewareService from '../services/middlewareService.js';
import { info, error } from '../utils/logger.js';

import {
  checkSocketUserAccess,
} from './utils/middleware.js';

const initializeSocket = (io) => {
  io.use(checkSocketUserAccess);

  io.on('connection', (socket) => {
    info(`User ${socket.user.username} authorized via socket`);

    socket.on('setup_user', async () => {
      try {
        socket.join(socket.user.public_id);

        const userChats = await middlewareService.getUserChats(socket.user.id);

        userChats.forEach((chat) => {
          socket.join(chat.chat_id);
        });

        info(`User - ${socket.user.public_id} initialized and joined ${userChats.length} chats`);

        socket.broadcast.emit('user_status_changed', {
          user_id: socket.user.public_id,
          status: 'online',
        });
      } catch (err) {
        error(`Error: ${err}`);
      }
    });

    socket.on('join_chat', async (chat_id) => {
      try {
        const isAllowed = await middlewareService.getUserChatAccess(socket.user.id, chat_id);

        if (!isAllowed) {
          return socket.emit('error', 'You do not have access to this chat');
        }

        socket.join(chat_id);
        info(`User ${socket.user.username} joined chat ${chat_id}`);
      } catch (err) {
        error(`Error: ${err}`);
      }
    });

    socket.on('leave_chat', (chat_id) => {
      socket.leave(chat_id);
      info(`User ${socket.user.name} leave chat ${chat_id}`);
    });

    socket.on('chat_typing', (chat_id) => {
      socket.to(chat_id).emit('typing', {
        chat_id,
        user_name: socket.user.name,
        user_id: socket.user.public_id,
      });
    });

    socket.on('chat_stop-typing', (chat_id) => {
      socket.in(chat_id).emit('stop-typing');
    });

    socket.on('new_message', (data) => {
      socket.to(data.chat_id).emit('message_received', data.newMessage);
    });

    socket.on('message_read', (data) => {
      socket.to(data.chat_id).emit('user_read_messages', {
        chat_id: data.chat_id,
        user_id: socket.user.public_id,
        last_read_message_id: data.message_id,
      });
    });

    socket.on('update_data', (data) => {});

    socket.on('disconnect', () => {
      info(`User ${socket.user.username} disconnect`);

      socket.broadcast.emit('user_status_changed', {
        user_id: socket.user.public_id,
        status: 'offline',
        last_seen: new Date(),
      });
    });

    socket.on('error', (err) => {
      error(`Error: ${err}`);
    });
  });
};

export default initializeSocket;
