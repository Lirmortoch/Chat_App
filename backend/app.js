const express = require('express');
const helmet = require('helmet');

const config = require('./utils/config');
const logger = require('./utils/logger');

const app = express();

app.use(helmet());

module.exports = app;