const postgreSql = require('../db.js');

const getSessionData = async (identifier) => {
  const [user] = await postgreSql`
    SELECT u.*, s.expired_at
    FROM chat.sessions s
    JOIN chat.users u ON s.user_id = u.id
    WHERE s.identifier = ${identifier}
  `;

  return user;
}
const getUserRole = async (user_id) => {
  const [access] = await postgreSql`
    SELECT role FROM chat.users
    WHERE id = ${user_id}
      AND (deleted IS FALSE OR deleted IS NULL)
      AND (restricted IS FALSE OR restricted IS NULL)
  `;

  return access;
}
const getChatUserRole = async (chat_public_id, user_id) => {
  const [access] = await postgreSql`
    SELECT cm.chat_id, cm.role
    FROM chat.chats_members cm
    JOIN chat.chats c ON cm.chat_id = c.id
    WHERE c.public_id = ${chat_public_id} 
      AND cm.user_id = ${user_id}
      AND (cm.deleted IS FALSE OR cm.deleted IS NULL)
      AND (cm.restricted IS FALSE OR cm.restricted IS NULL)
  `;

  return access;
}
const getMessageOwner = async (message_public_id) => {
  const [message] = await postgreSql`
    SELECT public_id, sender_id
    FROM chat.messages msg
    WHERE msg.public_id = ${message_public_id}
  `;

  return message;
}

module.exports = {
  getSessionData,
  getUserRole,
  getChatUserRole,
  getMessageOwner,
}