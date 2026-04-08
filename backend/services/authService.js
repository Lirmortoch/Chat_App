const postgreSql = require('../db.js');

const insertSession = async (user_id, sessionData, expireDate) => {
  const [session] = await postgreSql`
    INSERT INTO chat.sessions (user_id, ip_address, user_agent, identifier, expired_at, last_seen_at)
    VALUES (${user_id}, ${postgreSql(sessionData)}, uuidv7(), ${expireDate}, now())
    RETURNING identifier
  `;

  return session;
}
const deleteSession = async (identifier) => {
  const [deletedSession] = await postgreSql`
    DELETE * FROM chat.sessions
    WHERE identifier = ${identifier}
  `;

  return deletedSession;
}

module.exports = {
  insertSession,
  deleteSession,
}