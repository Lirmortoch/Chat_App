const { createServer } = require('node:http');
const ws = require('socket.io');

const app = require('./app'); // the actual Express application
const initializeSocket = require('./socket/index');
const config = require('./utils/config');
const logger = require('./utils/logger');

const httpServer = createServer(app);

const socketServer = new ws.Server(httpServer, {
  cors: { origin: 'http://localhost:5173', },
});

initializeSocket(socketServer);

app.set('ws', socketServer);

httpServer.listen(config.SERVER_PORT, () => {
  logger.info(`Server running on port ${config.SERVER_PORT}`);
});