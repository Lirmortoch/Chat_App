if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const SERVER_PORT = process.env.SERVER_PORT;
const POSTGRE_DB_PORT = process.env.POSTGRE_DB_PORT;

module.exports = { SERVER_PORT, POSTGRE_DB_PORT }