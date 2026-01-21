if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const SERVER_PORT = process.env.SERVER_PORT;
const POSTGRE_DB_URI = process.env.POSTGRE_DB_URI;
const POSTGRE_DB_USERNAME = process.env.POSTGRE_DB_USERNAME;
const POSTGRE_DB_PASSWORD = process.env.POSTGRE_DB_PASSWORD;

module.exports = { 
  SERVER_PORT, 
  POSTGRE_DB_URI, 
  POSTGRE_DB_USERNAME,
  POSTGRE_DB_PASSWORD,
}