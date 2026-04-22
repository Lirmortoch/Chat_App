import { createServer } from 'node:http';
import ws from 'socket.io';

import app from './app.js'; // the actual Express application
import initializeSocket from './socket/index.js';
import { SERVER_PORT } from './utils/config.js';
import { info } from './utils/logger.js';

const httpServer = createServer(app);

const socketServer = new ws.Server(httpServer, {
  cors: { origin: 'http://localhost:5173' },
});

initializeSocket(socketServer);

app.set('ws', socketServer);

httpServer.listen(SERVER_PORT, () => {
  info(`Server running on port ${SERVER_PORT}`);
});
