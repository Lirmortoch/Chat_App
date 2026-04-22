import postgreSql from '../db.js';
import { error } from '../utils/logger.js';

const insertSession = async (user_id, sessionData, expireDate) => {
  try {
    const [session] = await postgreSql`
      INSERT INTO chat.sessions (user_id, ip_address, user_agent, identifier, expired_at, last_seen_at)
      VALUES (${user_id}, ${postgreSql(sessionData)}, uuidv7(), ${expireDate}, now())
      RETURNING identifier
    `;

    return session;
  } catch (err) {
    error(`Error: ${err}`);
  }
};
const deleteSession = async (identifier) => {
  try {
    const [deletedSession] = await postgreSql`
      DELETE * FROM chat.sessions
      WHERE identifier = ${identifier}
    `;

    return deletedSession;
  } catch (err) {
    error(`Error: ${err}`);
  }
};

export {
  insertSession,
  deleteSession,
};
