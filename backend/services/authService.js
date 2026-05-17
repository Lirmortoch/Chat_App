import postgreSql from '../db.js';
import { error } from '../utils/logger.js';

const insertSession = async (user_id, sessionData, expireDate, currentDate) => {
  try {
    const [session] = await postgreSql`
      INSERT INTO chat.sessions (user_id, ip_address, user_agent, expired_at, last_seen_at, created_at)
      VALUES (${user_id}, ${sessionData.ip_address}, ${sessionData.user_agent}, ${expireDate}, ${currentDate}, ${currentDate})
      RETURNING identifier
    `;

    return session;
  } catch (err) {
    error(`Error: ${err}`);
    return err;
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
    return err;
  }
};

export {
  insertSession,
  deleteSession,
};
