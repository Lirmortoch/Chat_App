const ChatsRouter = require('express').Router();

const postgreSql = require('../db.js');
const chatSchema = require('../validation/schemas/chat.schema.js');
const { checkChatAccess, fieldWhiteList } = require('../utils/middleware.js');
const { validator } = require('../validation/utils/middleware.js');

ChatsRouter.get('/', async (request, response) => {
  try {
    const chats = await postgreSql`
      SELECT public_id
      FROM chats
    `;

    response.json(chats);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});
ChatsRouter.get('/info/:public_id', checkChatAccess, async (request, response) => {
  if (request.userRoleInChat === 'undefined') {
    return response.status(403).json({ message: 'Only users with access can see this chat' });
  }

  try {
    const chatId = request.chatInternalId;
    const user_id = request.user.id;

    const chat = await postgreSql.begin(async (sql) => {
      const [chatData] = await sql`
        SELECT name, url, type, public_id
        FROM chat.chats
        WHERE id = ${chatId}
      `;
      let chatAvatar = null;
      if (chatData.type === 'private') {
        [chatAvatar] = await sql`
          SELECT file_url, file_type, created_at
          FROM chat.contact_avatars
          WHERE contact_id = (SELECT id FROM chat.contacts WHERE owner_id = ${user_id})
           AND is_main = true
        `;
      }
      else {
        [chatAvatar] = await sql``;
      }

      return {
        chatData,
        chatAvatar
      }
    });

    if (!chat) {
      return response.status(404).json({ message: 'Message not found' });
    }

    response.json(chat);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});
ChatsRouter.get('/user/:public_id', checkChatAccess, async (request, response) => {
  if (request.userRoleInChat === 'undefined') {
    return response.status(403).json({ message: 'Only users with access can see this chats' });
  }

  try {
    const user_public_id = request.params.public_id;

    const chats = await postgreSql`
    WITH user_info AS (
        SELECT id FROM chat.users WHERE public_id = ${user_public_id}
    )
    SELECT DISTINCT ON (c.id)
        c.public_id AS chat_id,
        c.type AS chat_type,
       
        CASE 
            WHEN c.type = 'private' THEN (
                SELECT u2.name FROM chat.chats_members cm2
                JOIN chat.users u2 ON cm2.user_id = u2.id
                WHERE cm2.chat_id = c.id AND u2.id != (SELECT id FROM user_info)
                LIMIT 1
            )
            ELSE c.name 
        END AS display_name,

        m.message AS last_message,
        m.created_at AS last_message_time,
        (SELECT public_id FROM chat.users WHERE id = m.sender_id) AS last_sender_id,

        (
            SELECT count(*) 
            FROM chat.messages m2 
            WHERE m2.chat_id = c.id 
              AND m2.created_at > cm.last_read_at
              AND m2.sender_id != (SELECT id FROM user_info)
              AND NOT EXISTS (
                  SELECT 1 FROM chat.messages_hidden mh 
                  WHERE mh.message_id = m2.id AND mh.user_id = (SELECT id FROM user_info)
              )
        ) AS unread_count

    FROM chat.chats_members cm
    JOIN chat.chats c ON cm.chat_id = c.id
    LEFT JOIN chat.messages m ON m.id = (
        SELECT m3.id 
        FROM chat.messages m3
        WHERE m3.chat_id = c.id
          AND NOT EXISTS (
              SELECT 1 FROM chat.messages_hidden mh2 
              WHERE mh2.message_id = m3.id AND mh2.user_id = (SELECT id FROM user_info)
          )
        ORDER BY m3.created_at DESC
        LIMIT 1
    )
    WHERE cm.user_id = (SELECT id FROM user_info)
    ORDER BY c.id, m.created_at DESC NULLS LAST
    `;

    response.json(chats);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

ChatsRouter.post('/', fieldWhiteList, validator(chatSchema), async (request, response) => {
  try {
    const { recipient_public_id, type, name, avatar } = request.body.fieldsData;
    const creator_id = request.user.id;

    const insertedChat = await postgreSql.begin(async (sql) => {
      const [recipient] = await sql`
        SELECT id FROM chat.users WHERE public_id = ${recipient_public_id}
      `;

      if (!recipient) {
        throw new Error('User not found');
      }

      if (type === 'private') {
        const [existingChat] = await sql`
          SELECT c.public_id, c.name, c.type
          FROM chat.chats c
          JOIN chat.chats_members cm1 ON c.id = cm1.chat_id
          JOIN chat.chats_members cm2 ON c.id = cm2.chat_id
          WHERE c.type = 'private'
            AND cm1.user_id = ${creator_id}
            AND cm2.user_id = ${recipient.id}
          LIMIT 1
        `;

        if (existingChat) {
          return existingChat;
        }
      }
      
      const [newChat] = await sql`
        INSERT INTO chat.chats (name, type)
        VALUES (${name || 'Private Chat'}, ${type})
        RETURNING public_id, name, type
      `;

      const participants = [creator_id, recipient.id];
      await sql`
        INSERT INTO chat.chats_members (chat_id, user_id, role)
        SELECT ${newChat.id}, unnest(${participants}::int[]), 'user'
      `;

      let newChatAvatar = null;
      if (avatar) {
        [newChatAvatar] = await sql`
          INSERT INTO chat.chat_avatars (file_type, file_url, chat_id, is_main)
          VALUES (${avatar.file_type}, ${avatar.file_url}, SELECT id FROM chat.chats WHERE public_id = ${newChat.public_id}, ${avatar.is_main})
        `;
      }

      return {
        newChat,
        newChatAvatar,
      }
    });

    response.status(201).json(insertedChat);
  } catch (error) {
    console.error('Chat creation error:', error);
    const status = error.message === 'User not found' ? 404 : 500;
    response.status(status).json({ error: error.message });
  }
});

ChatsRouter.put('/:public_id', checkChatAccess, fieldWhiteList, validator(chatSchema), async (request, response) => {
  if (request.userRoleInChat !== 'owner' || request.userRoleInChat !== 'admin') {
    return response
      .status(403)
      .json({ message: 'Only owners or admins can edited fields of chat' });
  }

  try {
    const { fieldsData } = request.body;
    const chat_id = request.chatInternalId;
    const fields = request.fields;

    const [updatedChat] = await postgreSql.begin(async (sql) => {
      const cols = fields.filter(f => f !== 'avatar');

      const [updatedChatData] = await sql`
        UPDATE chats
        SET ${sql(fieldsData, cols)},
        WHERE id = ${chat_id}
        RETURNING name
      `;

      let updatedChatAvatar = null;
      if (fields.includes('avatar') && fieldsData.avatar) {
        [updatedChatAvatar] = await sql`
          UPDATE chat.chat_avatars
          SET ${sql(fieldsData.avatar, 'file_url', 'file_type', 'is_main')}
          WHERE chat_id = ${chat_id}
          RETURNING file_url, file_type, is_main, created_at, public_id
        `;
      }

      return {
        updatedChatData,
        updatedChatAvatar
      }
    })

    response.status(201).json(updatedChat);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});
ChatsRouter.put('/permissions/chat/:public_id', checkChatAccess, fieldWhiteList, validator(chatSchema), async (request, response) => {

});

ChatsRouter.delete('/:public_id', checkChatAccess, async (request, response) => {
  if (request.userRoleInChat !== 'owner') {
    return response.status(403).json({ message: 'Only owners can delete the chat' });
  }

  try {
    const chatId = request.chatInternalId;

    const deletedChat = await postgreSql`
      DELETE FROM chats
      WHERE id = ${chatId}
      RETURNING name, url, public_id
    `;

    response.status(201).json(deletedChat);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = ChatsRouter;