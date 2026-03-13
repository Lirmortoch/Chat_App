const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const config = require('./utils/config');
const logger = require('./utils/logger');

const app = express();
const limiter = rateLimit({
 	windowMs: 10 * 60 * 1000, 
	limit: 25, 
	standardHeaders: 'draft-8', 
	legacyHeaders: false, 
	ipv6Subnet: 60,
});

app.use(helmet());
app.use('/api/', limiter);

module.exports = app;