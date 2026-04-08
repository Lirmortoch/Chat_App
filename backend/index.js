const { createServer } = require('node:http');
const ws = require('socket.io');

const app = require('./app'); // the actual Express application
const config = require('./utils/config');
const logger = require('./utils/logger');

const httpServer = createServer(app);

const socketServer = new ws.Server(httpServer, {
  cors: { origin: 'http://localhost:5173', },
});

app.set('ws', socketServer);

socketServer.on('connection', (socket) => {
  logger.info(`New connect to socket: ${socket.id}`);

  socket.on('setup_user', (user_id) => {
    socket.join(user_id);
    logger.info(`User - ${user_id} initialize socket`);
  });

  socket.on('join_chat', (chat_id) => {
    socket.join(chat_id);
    logger.info(`Socket ${socket.id} connected to chat ${chat_id}`);
  });

  socket.on('leave_chat', (chat_id) => {
    socket.leave(chat_id);
    logger.info(`Socket ${socket.id} leave chat ${chat_id}`);
  });

  socket.on('chat_typing', (chat_id) => {
    socket.in(chat_id).emit('typing');
  });

  socket.on('chat_stop-typing', (chat_id) => {
    socket.in(chat_id).emit('stop-typing');
  });

  socket.on('disconnect', () => {
    logger.info(`Socket ${socket.id} disconnect`);
  });
});

app.listen(config.SERVER_PORT, () => {
  logger.info(`Server running on port ${config.SERVER_PORT}`);
});