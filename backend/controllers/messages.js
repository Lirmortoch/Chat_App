const MessagesRouter = require('express').Router();

const postgreSql = require('../db.js');
const { checkChatAccess, checkMessageAccess, fieldWhiteList } = require('../utils/middleware.js');

MessagesRouter.get('/', async (request, response) => {
  try {
    const messages = await postgreSql`
      SELECT public_id, message
      FROM messages
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
      FROM messages
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
      WITH updated_member AS (
    
          UPDATE chat.chats_members
          SET last_read_at = CURRENT_TIMESTAMP
          WHERE user_id = (SELECT id FROM chat.users WHERE public_id = ${user_public_id})
            AND chat_id = (SELECT id FROM chat.chats WHERE id = ${chatId})
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
      ORDER BY m.created_at ASC;
    `;

    response.json(messages);
  } catch (error) {
    response.status(500).json({ error: 'Failed to fetch messages' });
  }
});

MessagesRouter.post('/', checkChatAccess, async (request, response) => {
  if (request.userRoleInChat === 'undefined') {
    return response.status(403).json({
      message: 'Only users with access can add messages to this chat',
    });
  }

  try {
    const { message, additionals } = request.body;
    const chatId = request.chatInternalId;
    const sender_id = request.user.id;

    const result = await postgreSql.begin(async (sql) => {
      const [chat] = await sql`SELECT id FROM chat.chats WHERE public_id = ${chatId}`;

      const [newMessage] = await sql`
        INSERT INTO chat.messages (chat_id, sender_id, message)
        VALUES (${chat.id}, ${sender_id}, ${message})
        RETURNING id, public_id, created_at
      `;

      if (additionals && additionals.length > 0) {
        await sql`
          INSERT INTO chat.additionals (file_type, file_url, message_id)
          ${sql(additionals.map((a) => ({ ...a, message_id: newMessage.id })))}
        `;
      }
      
      return newMessage;
    });

    response.status(201).json(result);
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
  async (request, response) => {
    try {
      const { fieldData } = request.body;

      const updatedMessage = await postgreSql`
      UPDATE messages
      SET message = ${fieldData},
      SET edited_at = now()
      WHERE public_id = ${request.params.public_id}
      RETURNING public_id
    `;

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
      const [deletedMessage] = await postgreSql`
      DELETE CASCADE from messages
      WHERE public_id = ${request.params.public_id}
      RETURNING *
    `;

      response.status(201).json(deletedMessage);
    } catch (error) {
      console.log(error);
      response.status(500).json({ message: 'Internal server error' });
    }
  },
);
MessagesRouter.delete('/chat/:chat_public_id', checkChatAccess, async (request, response) => {
  if (request.userRoleInChat !== 'owner' || request.userRoleInChat !== 'admin') {
    return response.status(403).json({
      message: 'Only owners or admins can delete messages in this chat',
    });
  }
  try {
    const chatId = request.chatInternalId;

    const deletedMessages = await postgreSql`
      DELETE FROM chat.messages
      WHERE chat_id = (SELECT id FROM chat.chats WHERE id = ${chatId})
      RETURNING *
    `;
    response.json({ count: deletedMessages.length });
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});