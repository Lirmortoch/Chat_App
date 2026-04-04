const { createServer } = require('node:http');
const ws = require('socket.io');

const app = require('./app'); // the actual Express application
const config = require('./utils/config');
const logger = require('./utils/logger');

const httpServer = createServer(app);

const socketServer = new ws.Server(httpServer, {
  cors: { origin: 'http://localhost:5173', },
});


