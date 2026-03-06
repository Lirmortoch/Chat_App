const ChatsRouter = require("express").Router();

const postgreSql = require("../db.js");
// const config = require('../utils/config.js');

ChatsRouter.get("/", async (request, response) => {
  try {
    const chats = await postgreSql`
      SELECT * FROM chats
    `;

    response.json(chats);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: "Internal server error" });
  }
});
ChatsRouter.get("/:chat_public_id", async (request, response) => {
  try {
    const [chat] = await postgreSql`
      SELECT * FROM chats
      WHERE public_id = ${request.params.chat_public_id}
    `;

    if (!chat) {
      response.status(404).json({ message: "Message not found" });
    }

    response.json(chat);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: "Internal server error" });
  }
});
ChatsRouter.get("/:public_user_id", async (request, response) => {
  try {
    const chats = await postgreSql`
    WITH user_info AS (
          SELECT id, public_id FROM chat.users WHERE public_id = ${request.params.public_user_id}
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
          ) AS unread_count
      FROM chat.chats_members cm
      JOIN chat.chats c ON cm.chat_id = c.id
      LEFT JOIN chat.messages m ON c.id = m.chat_id
      WHERE cm.user_id = (SELECT id FROM user_info)
      ORDER BY c.id, m.created_at DESC;
    `;

    response.json(chats);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: "Internal server error" });
  }
});

ChatsRouter.post("/", async (request, response) => {
  try {
    const { recipient_public_id, type, name } = request.body;
    const creator_id = request.user.id;

    const newChat = await postgreSql.begin(async (sql) => {
      const [recipient] = await sql`
        SELECT id FROM chat.users WHERE public_id = ${recipient_public_id}
      `;

      if (!recipient) {
        throw new Error("User not found");
      }

      if (type === "private") {
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
        VALUES (${name || "Private Chat"}, ${type})
        RETURNING id, public_id, name, type
      `;

      const participants = [creator_id, recipient.id];
      await sql`
        INSERT INTO chat.chats_members (chat_id, user_id, role)
        SELECT ${newChat.id}, unnest(${participants}::int[]), 'default'
      `;

      return newChat;
    });

    response.status(201).json(newChat);
  } catch (error) {
    console.error("Chat creation error:", error);
    const status = error.message === "User not found" ? 404 : 500;
    response.status(status).json({ error: error.message });
  }
});

ChatsRouter.put("/:public_id", async (request, response) => {
  try {
    const { field, fieldData } = request.body;

    const updatedMessage = await postgreSql`
      UPDATE chats
      SET ${field} = ${fieldData}
      SET edited_at = now()
      WHERE public_id = ${request.params.public_id}
      RETURNING public_id
    `;

    response.status(201).json(updatedMessage);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: "Internal server error" });
  }
});

ChatsRouter.delete("/:public_id", async (request, response) => {
  try {
    const deletedChat = await postgreSql`
      DELETE CASCADE from chats
      WHERE public_id = ${request.params.public_id}
      RETURNING *
    `;

    response.status(201).json(deletedChat);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: "Internal server error" });
  }
});
