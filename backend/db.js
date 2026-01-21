const postgres = require('postgres');

const config = require('./utils/config');
const logger = require('./utils/logger');

logger.info('Connecting to database');

const postgreSql = postgres(config.POSTGRE_DB_URI, {
  username: config.POSTGRE_DB_USERNAME,
  password: config.POSTGRE_DB_PASSWORD,
  ssl: 'require',
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

module.exports =  { postgreSql };