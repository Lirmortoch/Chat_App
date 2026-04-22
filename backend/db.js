import postgres from 'postgres';

import {
  POSTGRE_DB_URI,
  POSTGRE_DB_USERNAME,
  POSTGRE_DB_PASSWORD,
} from './utils/config.js';
import { info } from './utils/logger.js';

info('Connecting to database');

const postgreSql = postgres(POSTGRE_DB_URI, {
  username: POSTGRE_DB_USERNAME,
  password: POSTGRE_DB_PASSWORD,
  // ssl: 'require',
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

export default postgreSql;
