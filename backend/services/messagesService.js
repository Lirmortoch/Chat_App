import postgreSql from '../db.js';
import { error } from '../utils/logger.js';

const getAllMessages = async () => {
  try {
    const messages = await postgreSql`
    SELECT public_id
    FROM chat.messages
  `;

    return messages;
  } catch (err) {
    error(`Error: ${err}`);
  }
};
const getMsg = async (public_id) => {
  try {
    const [message] = await postgreSql`
    SELECT 
      m.message, 
      m.created_at, 
      m.edited_at, 
      m.public_id,
      COALESCE(
        (SELECT json_agg(
            json_build_object(
              'url', a.file_url,
              'name', a.file_name,
              'type', a.file_type,
              'created_at', a.created_at
            )
        ) FROM chat.additionals a WHERE a.message_id = m.id),
        '[]'
      ) AS attachments
    FROM chat.messages m
    WHERE m.public_id = ${public_id};
  `;

    return message;
  } catch (err) {
    error(`Error: ${err}`);
  }
};
const getChatMessages = async (user_id, chatId) => {
  try {
    const messages = await postgreSql`
    WITH updated_member AS (
        UPDATE chat.chats_members
        SET last_read_at = CURRENT_TIMESTAMP
        WHERE user_id = ${user_id}
          AND chat_id = ${chatId}
        RETURNING chat_id
    )
    SELECT 
        m.public_id AS message_id,
        m.message,
        m.created_at,
        u.public_id AS sender_id,
        u.name AS sender_name,
    
        COALESCE(
            (SELECT json_agg(
                json_build_object(
                  'url', a.file_url,
                  'name', a.file_name,
                  'type', a.file_type,
                  'created_at', a.created_at
                )
            ) 
            FROM chat.additionals a 
            WHERE a.message_id = m.id), 
            '[]'
        ) AS attachments
    FROM chat.messages m
    JOIN chat.users u ON m.sender_id = u.id
    WHERE m.chat_id = (SELECT chat_id FROM updated_member)
      AND NOT EXISTS (
          SELECT 1 
          FROM chat.messages_hidden mh 
          WHERE mh.message_id = m.id 
            AND mh.user_id = ${user_id}
      )
    ORDER BY m.created_at ASC
  `;

    return messages;
  } catch (err) {
    error(`Error: ${err}`);
  }
};

const insertMsg = async (message, additionals, chat_id, sender_id) => {
  try {
    const insertedMessage = await postgreSql.begin(async (sql) => {
      const [newMessage] = await sql`
      INSERT INTO chat.messages (chat_id, sender_id, message)
      VALUES (${chat_id}, ${sender_id}, ${message})
      RETURNING created_at, public_id, message
    `;

      let newAdditionals = null;
      if (additionals && additionals.length > 0) {
        newAdditionals = await sql`
        INSERT INTO chat.additionals (file_type, file_url, file_name, message_id)
        ${sql(additionals.map((a) => ({ ...a, message_id: `SELECT id FROM chat.messages WHERE public_id = ${newMessage.public_id}` })))}
        RETURNING file_type, file_url, public_id
      `;
      }

      return {
        newMessage,
        newAdditionals,
      };
    });

    return insertedMessage;
  } catch (err) {
    error(`Error: ${err}`);
  }
};

const updateMessage = async (fieldsData, fields, messageInternalId) => {
  try {
    const updatedMessage = await postgreSql.begin(async (sql) => {
      let updatedMessageData;
      let messageToReturn;

      if (fields.includes('message')) {
        [updatedMessageData] = await sql`
        UPDATE chat.messages
        SET message = ${fieldsData.message},
        WHERE id = ${messageInternalId}
        RETURNING message, public_id
      `;

        messageToReturn = updatedMessageData;
      }
      if (fields.includes('additionals') && fieldsData.additionals) {
        let updatedAdditionals = null;

        if (fieldsData.additionals.delete) {
          updatedAdditionals = await sql`
          DELETE FROM chat.additionals
          WHERE message_id = ${messageInternalId}
          RETURNING file_type, file_url, file_name, public_id, created_at
        `;
        } else {
          updatedAdditionals = await sql`
          INSERT INTO chat.additionals (file_type, file_url, file_name, message_id)
          ${sql(fieldsData.additionals.map((a) => ({ ...a, message_id: messageInternalId })))}
          RETURNING file_type, file_url, public_id
        `;
        }

        messageToReturn = { updatedAdditionals, updatedMessageData };
      }

      [updatedMessageData.edited_at] = await sql`
      UPDATE chat.messages
      SET edited_at = now()
      WHERE id = ${messageInternalId}
      RETURNING edited_at
    `;

      return messageToReturn;
    });

    return updatedMessage;
  } catch (err) {
    error(`Error: ${err}`);
  }
};
// const setReadMessages = async () => {
//   const readedMessages = await postgreSql``;

//   return readedMessages;
// }

const deleteMessage = async (messageInternalId) => {
  try {
    const [deletedMessage] = await postgreSql`
    DELETE from chat.messages
    WHERE id = ${messageInternalId}
    RETURNING message, public_id, created_at, edited_at
  `;

    return deletedMessage;
  } catch (err) {
    error(`Error: ${err}`);
  }
};

export {
  getAllMessages,
  getMsg,
  getChatMessages,

  insertMsg,

  updateMessage,
  // setReadMessages,

  deleteMessage,
};
