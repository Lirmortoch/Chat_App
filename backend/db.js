import postgres from 'postgres';

import config from './utils/config.js';
import logger from './utils/logger.js';

logger.info('Connecting to database');

const postgreSql = postgres(config.POSTGRE_DB_URI, {
  username: config.POSTGRE_DB_USERNAME,
  password: config.POSTGRE_DB_PASSWORD,
  // ssl: 'require',
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

export default postgreSql;
