const postgreSql = require('../db.js');
const { fieldObjectChecking } = require('../utils/middleware.js');

const getAllChats = async () => {
  try {
    const chats = await postgreSql`
      SELECT public_id
      FROM chat.chats
    `;

    return chats;
  } catch (err) {
    logger.error(`Error: ${err}`);
  }
};
const getChatsByUser = async (user_id) => {
  try {
    const chats = await postgreSql`
    SELECT DISTINCT ON (c.id)
      c.public_id AS chat_id,
      c.type AS chat_type,
      cm.last_read_at,
    
      CASE 
          WHEN c.type = 'private' THEN u_other.first_name || ' ' || u_other.last_name
          ELSE c.name 
      END AS display_name,

      COALESCE(
          CASE WHEN c.type = 'private' THEN 
              (SELECT ph.file_url FROM chat.contact_avatars cav 
              JOIN chat.photos ph ON cav.photo_id = ph.public_id 
              WHERE cav.contact_id = con.id AND cav.is_main = true)
          END,
          CASE WHEN c.type = 'private' THEN 
              (SELECT ph.file_url FROM chat.user_profile_photos upp 
              JOIN chat.photos ph ON upp.photo_id = ph.public_id 
              WHERE upp.user_id = u_other.id AND upp.is_main = true)
          END,
          (SELECT file_url FROM chat.photos WHERE public_id = c.photo_id) 
      ) AS avatar_url,

      m.message AS last_message,
      m.created_at AS last_message_time,
      u_sender.public_id AS last_sender_public_id,

      (
          SELECT count(*)::int
          FROM chat.messages m2 
          WHERE m2.chat_id = c.id 
            AND m2.created_at > cm.last_read_at
            AND m2.sender_id != ${user_id}
            AND NOT EXISTS (
                SELECT 1 FROM chat.messages_hidden mh 
                WHERE mh.message_id = m2.id AND mh.user_id = ${user_id}
            )
      ) AS unread_count

      FROM chat.chats_members cm
      JOIN chat.chats c ON cm.chat_id = c.id

      LEFT JOIN chat.chats_members cm_other ON (c.type = 'private' AND cm_other.chat_id = c.id AND cm_other.user_id != ${user_id})
      LEFT JOIN chat.users u_other ON cm_other.user_id = u_other.id

      LEFT JOIN chat.contacts con ON (con.owner_id = ${user_id} AND con.user_id = u_other.id)

      LEFT JOIN LATERAL (
          SELECT m3.message, m3.created_at, m3.sender_id
          FROM chat.messages m3
          WHERE m3.chat_id = c.id
            AND NOT EXISTS (
                SELECT 1 FROM chat.messages_hidden mh2 
                WHERE mh2.message_id = m3.id AND mh2.user_id = ${user_id}
            )
          ORDER BY m3.created_at DESC
          LIMIT 1
      ) m ON true

      LEFT JOIN chat.users u_sender ON m.sender_id = u_sender.id

      WHERE cm.user_id = ${user_id}
      ORDER BY c.id, m.created_at DESC NULLS LAST
    `;

    return chats;
  } catch (err) {
    logger.error(`Error: ${err}`);
  }
};

const insertChat = async (recipient_public_id, type, name, avatar, creator_id, chatUrl) => {
  try {
    const insertedChat = await postgreSql.begin(async (sql) => {
      const [recipient] = await sql`
        SELECT id FROM chat.users WHERE public_id = ${recipient_public_id}
      `;
      if (!recipient) throw new Error('User not found');

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
        if (existingChat) return { newChat: existingChat, newChatAvatar: null };
      }

      let createdPhotoId = null;
      if (type !== 'private' && avatar && fieldObjectChecking(avatar)) {
        const [photo] = await sql`
          INSERT INTO chat.photos (file_url, file_type, file_name, width, height)
          VALUES (${avatar.file_url}, ${avatar.file_type}, ${avatar.file_name}, ${avatar.width}, ${avatar.height})
          RETURNING public_id
        `;
        createdPhotoId = photo.public_id;
      }

      const [newChat] = await sql`
        INSERT INTO chat.chats (name, type, photo_id, url)
        VALUES (${name || 'Chat'}, ${type}, ${createdPhotoId}, ${chatUrl})
        RETURNING public_id, name, type
      `;

      const participants = [
        { user_id: creator_id, role: 'owner' },
        { user_id: recipient.id, role: 'user' },
      ];

      await sql`
        INSERT INTO chat.chats_members (chat_id, user_id, role)
        SELECT ${newChat.id}, user_id, role
        FROM ${sql(participants, 'user_id', 'role')}
      `;

      let avatarResult = null;
      if (type === 'private') {
        [avatarResult] = await sql`
          SELECT ph.file_url, ph.file_type
          FROM chat.contacts con
          LEFT JOIN chat.contact_avatars cav ON (cav.contact_id = con.id AND cav.is_main = true)
          LEFT JOIN chat.user_profile_photos upp ON (upp.user_id = con.user_id AND upp.is_main = true)
          LEFT JOIN chat.photos ph ON ph.public_id = COALESCE(cav.photo_id, upp.photo_id)
          WHERE con.owner_id = ${creator_id} AND con.user_id = ${recipient.id}
        `;
      } else if (createdPhotoId) {
        avatarResult = { url: avatar.file_url, type: avatar.file_type };
      }

      return {
        newChat,
        avatar: avatarResult,
      };
    });

    return insertedChat;
  } catch (err) {
    logger.error(`Error: ${err}`);
  }
};

const updateChat = async (fieldsData, chat_id, fields) => {
  try {
    const [updatedChat] = await postgreSql.begin(async (sql) => {
      const cols = fields.filter((f) => f !== 'avatar').join(', ');

      const [updatedChatData] = await sql`
        UPDATE chats
        SET ${sql(fieldsData, cols)},
        WHERE id = ${chat_id}
        RETURNING name
      `;

      let updatedChatAvatar = null;
      if (fields.includes('avatar') && fieldObjectChecking(fieldsData.avatar)) {
        const [photo] = await sql`
          INSERT INTO chat.photos (file_url, file_type, file_name, height, weight)
          ${sql(fieldsData.avatar.photo)}
          RETURNING file_url, file_type, file_name, height, weight, public_id
        `;

        [updatedChatAvatar] = await sql`
          UPDATE chats
          SET photo_id = ${photo.public_id}
          WHERE id = ${chat_id}
          RETURNING photo_id
        `;

        updatedChatAvatar.photo = structuredClone(photo);
      }

      return {
        updatedChatData,
        updatedChatAvatar,
      };
    });

    return updatedChat;
  } catch (err) {
    logger.error(`Error: ${err}`);
  }
};

const updateChatMembers = async (fieldsData, cols) => {
  try {
    const [newAccess] = await postgreSql`
      UPDATE chat.chats_members
      SET ${postgreSql(fieldsData, cols)}
      WHERE chat_id = ${fieldsData.chat_id} AND user_id = ${fieldsData.user_id}
      RETURNING ${cols}
    `;

    return newAccess;
  } catch (err) {
    logger.error(`Error: ${err}`);
  }
};

const deleteChat = async (chat_id) => {
  try {
    const [deletedChat] = await postgreSql`
    DELETE FROM chats
    WHERE id = ${chat_id}
    RETURNING name, url, public_id
  `;

    return deletedChat;
  } catch (err) {
    logger.error(`Error: ${err}`);
  }
};

module.exports = {
  getAllChats,
  getChatsByUser,

  insertChat,

  updateChat,
  updateChatMembers,

  deleteChat,
};
