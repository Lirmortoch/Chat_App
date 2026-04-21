import { createServer } from 'node:http';
import ws from 'socket.io';

import app from './app.js'; // the actual Express application
import initializeSocket from './socket/index.js';
import config from './utils/config.js';
import logger from './utils/logger.js';

const httpServer = createServer(app);

const socketServer = new ws.Server(httpServer, {
  cors: { origin: 'http://localhost:5173' },
});

initializeSocket(socketServer);

app.set('ws', socketServer);

httpServer.listen(config.SERVER_PORT, () => {
  logger.info(`Server running on port ${config.SERVER_PORT}`);
});
