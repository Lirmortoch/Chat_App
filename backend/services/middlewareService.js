import postgreSql from '../db.js';
import { error } from '../utils/logger.js';

const getSessionData = async (identifier) => {
  try {
    const [user] = await postgreSql`
    SELECT u.*, s.expired_at
    FROM chat.sessions s
    JOIN chat.users u ON s.user_id = u.id
    WHERE s.identifier = ${identifier}
  `;

    return user;
  } catch (err) {
    error(`Error: ${err}`);
  }
};
const getUserRole = async (user_id) => {
  try {
    const [access] = await postgreSql`
    SELECT role FROM chat.users
    WHERE id = ${user_id}
      AND (deleted IS FALSE OR deleted IS NULL)
      AND (restricted IS FALSE OR restricted IS NULL)
  `;

    return access;
  } catch (err) {
    error(`Error: ${err}`);
  }
};

const getChatUserRole = async (chat_public_id, user_id) => {
  try {
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
  } catch (err) {
    error(`Error: ${err}`);
  }
};
const getUserChatAccess = async (user_id, chat_id) => {
  try {
    const [membership] = await postgreSql`
    SELECT 1 FROM chat.chats_members cm
    WHERE cm.chat_id = ${chat_id} 
      AND cm.user_id = ${user_id}
      AND cm.deleted = false
      AND cm.restricted = false
  `;
    return Boolean(membership);
  } catch (err) {
    error(`Error: ${err}`);
  }
};
const getMessageOwner = async (message_public_id) => {
  try {
    const [message] = await postgreSql`
    SELECT public_id, sender_id
    FROM chat.messages msg
    WHERE msg.public_id = ${message_public_id}
  `;

    return message;
  } catch (err) {
    error(`Error: ${err}`);
  }
};

const getUserChats = async (user_id) => {
  try {
    const userChats = await postgreSql`
    SELECT chat_id FROM chat.chat_members WHERE user_id = ${user_id}
  `;

    return userChats;
  } catch (err) {
    error(`Error: ${err}`);
  }
};

export {
  getSessionData,
  getUserRole,

  getChatUserRole,
  getUserChatAccess,
  getMessageOwner,

  getUserChats,
};
