const MessagesRouter = require('express').Router();

const postgreSql = require('../db.js');
const messageSchema = require('../validation/schemas/message.schema.js');
const { checkChatAccess, checkMessageAccess, fieldWhiteList } = require('../utils/middleware.js');
const { validator } = require('../validation/utils/middleware.js');

MessagesRouter.get('/', async (request, response) => {
  try {
    const messages = await postgreSql`
      SELECT public_id
      FROM chat.messages
    `;

    response.json(messages);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});
MessagesRouter.get('/message/:message_public_id', async (request, response) => {
  try {
    const [message] = await postgreSql`
      SELECT message, created_at, edited_at, public_id
      FROM chat.messages
      WHERE public_id = ${request.params.message_public_id}
    `;

    if (!message) {
      response.status(404).json({ message: 'Message not found' });
    }

    response.json(message);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});
MessagesRouter.get('/chat/:chat_public_id', checkChatAccess, async (request, response) => {
  if (request.userRoleInChat === 'undefined') {
    return response.status(403).json({
      message: 'Only users with access can see messages of this chat',
    });
  }

  try {
    const chatId = request.chatInternalId;
    const user_public_id = request.user.public_id;

    const messages = await postgreSql`
      WITH user_info AS (
          SELECT id FROM chat.users WHERE public_id = ${user_public_id}
      ),
      updated_member AS (
          UPDATE chat.chats_members
          SET last_read_at = CURRENT_TIMESTAMP
          WHERE user_id = (SELECT id FROM user_info)
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
                      'type', a.file_type
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
              AND mh.user_id = (SELECT id FROM user_info)
        )
      ORDER BY m.created_at ASC
    `;

    response.json(messages);
  } catch (error) {
    response.status(500).json({ error: 'Failed to fetch messages' });
  }
});

MessagesRouter.post('/', checkChatAccess, fieldWhiteList, validator(messageSchema), async (request, response) => {
  if (request.userRoleInChat === 'undefined') {
    return response.status(403).json({
      message: 'Only users with access can add messages to this chat',
    });
  }

  try {
    const { message, additionals } = request.body.fieldsData;
    const chat_id = request.chatInternalId;
    const sender_id = request.user.id;

    const insertedMessage = await postgreSql.begin(async (sql) => {
      const [newMessage] = await sql`
        INSERT INTO chat.messages (chat_id, sender_id, message)
        VALUES (${chat_id}, ${sender_id}, ${message})
        RETURNING created_at, id, message
      `;

      let newAdditionals = null;
      if (additionals && additionals.length > 0) {
        newAdditionals = await sql`
          INSERT INTO chat.additionals (file_type, file_url, message_id)
          ${sql(additionals.map((a) => ({ ...a, message_id: newMessage.id })))}
          RETURNING file_type, file_url
        `;
      }
      
      return {
        newMessage,
        newAdditionals,
      }
    });

    response.status(201).json(insertedMessage);
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

MessagesRouter.put(
  '/:public_id',
  checkChatAccess,
  checkMessageAccess,
  fieldWhiteList,
  validator(messageSchema),
  async (request, response) => {
    try {
      const { field, fieldData } = request.body;
      const messageInternalId = request.messageInternalId;
      
      const updatedMessage = await postgreSql.begin(async (sql) => {
        let uptMessage;
        let returnMsg;

        if (field === 'message') {
          [uptMessage] = await sql`
            UPDATE chat.messages
            SET message = ${fieldData},
            edited_at = now()
            WHERE id = ${messageInternalId}
            RETURNING message, edited_at, public_id
          `;

          returnMsg = uptMessage;
        }
        else if (field === 'additional') {
          let [uptAdditional] = await sql`
            UPDATE chat.additionals
            SET file_url = ${fieldData.file_url},
            file_type = ${fieldData.file_type}
            WHERE message_id = ${messageInternalId}
            RETURNING file_url, file_type, public_id
          `;
          [uptMessage] = await sql`
            UPDATE chat.messages
            SET edited_at = now()
            WHERE id = ${messageInternalId}
            RETURNING edited_at
          `;

          returnMsg = {uptAdditional, uptMessage}
        }
        else {
          response.status(400).json({ message: 'Invalid field' });
        }

        return returnMsg;
      });

      response.status(201).json(updatedMessage);
    } catch (error) {
      console.log(error);
      response.status(500).json({ message: 'Internal server error' });
    }
  },
);

MessagesRouter.delete(
  '/message/:public_id',
  checkChatAccess,
  checkMessageAccess,
  async (request, response) => {
    if (request.userRoleInChat !== 'owner' || request.userRoleInChat !== 'admin') {
      return response.status(403).json({
        message: 'Only owners or admins can delete messages in this chat',
      });
    }

    try {
      const messageInternalId = request.messageInternalId;

      const deletedMessage = await postgreSql.begin(async (sql) => {
          const [deletedMessage] = await sql`
          DELETE from chat.messages
          WHERE id = ${messageInternalId}
          RETURNING message, public_id, created_at, edited_at
        `;

        const messageAdditionals = await sql`
          SELECT file_type, file_url, created_at
          FROM chat.additionals
          WHERE message_id = ${messageInternalId}
        `;

        let deletedAdditionals = null;
        if (messageAdditionals && messageAdditionals.length !== 0) {
          deletedAdditionals = await sql`
            DELETE from chat.additionals
            WHERE message_id = ${messageInternalId}
            RETURNING file_type, file_url, created_at, public_id
          `;
        }

        return {
          deletedMessage,
          deletedAdditionals,
        }
      });

      response.status(201).json(deletedMessage);
    } catch (error) {
      console.log(error);
      response.status(500).json({ message: 'Internal server error' });
    }
  },
);

module.exports = MessagesRouter;