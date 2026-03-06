const MessagesRouter = require("express").Router();

const postgreSql = require("../db.js");
// const config = require('../utils/config.js');

MessagesRouter.get("/", async (request, response) => {
  try {
    const messages = await postgreSql`
      SELECT public_id, message
      FROM messages
    `;

    response.json(messages);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: "Internal server error" });
  }
});
MessagesRouter.get("/message/:message_public_id", async (request, response) => {
  try {
    const [message] = await postgreSql`
      SELECT * FROM messages
      WHERE public_id = ${request.params.message_public_id}
    `;

    if (!message) {
      response.status(404).json({ message: "Message not found" });
    }

    response.json(message);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: "Internal server error" });
  }
});
MessagesRouter.get("/:user_public_id", async (request, response) => {
  try {
    const messages = await postgreSql`
      WITH user_data AS (
          SELECT id FROM chat.users WHERE public_id = ${request.params.user_public_id}
      ),
      last_messages AS (
          SELECT DISTINCT ON (m.chat_id) 
              m.chat_id,
              m.message,
              m.created_at,
              u.public_id AS sender_public_id
          FROM chat.messages m
          JOIN chat.users u ON m.sender_id = u.id
          WHERE m.chat_id IN (SELECT chat_id FROM chat.chats_members WHERE user_id = (SELECT id FROM user_data))
          ORDER BY m.chat_id, m.created_at DESC
      )
      SELECT 
          c.public_id AS chat_public_id,
          CASE 
              WHEN c.type = 'private' THEN (
                  SELECT u2.name 
                  FROM chat.chats_members cm2
                  JOIN chat.users u2 ON cm2.user_id = u2.id
                  WHERE cm2.chat_id = c.id AND cm2.user_id != (SELECT id FROM user_data)
                  LIMIT 1
              )
              ELSE c.name 
          END AS display_name,
          c.type AS chat_type,
          lm.message AS last_message_text,
          lm.created_at AS last_message_time,
          lm.sender_public_id AS last_message_sender_id
      FROM chat.chats_members cm
      JOIN chat.chats c ON cm.chat_id = c.id
      LEFT JOIN last_messages lm ON c.id = lm.chat_id
      WHERE cm.user_id = (SELECT id FROM user_data)
      ORDER BY lm.created_at DESC NULLS LAST;
    `;

    if (!messages) {
      response.status(404).json({ message: "Message not found" });
    }

    response.json(messages);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: "Internal server error" });
  }
});
MessagesRouter.get("/:chat_public_id", async (request, response) => {
  try {
    const { chat_public_id } = request.params;
    const user_public_id = request.user.public_id;

    const messages = await postgreSql`
      WITH updated_member AS (
    -- 1. Обнуляем счетчик непрочитанных
    UPDATE chat.chats_members
    SET last_read_at = CURRENT_TIMESTAMP
    WHERE user_id = (SELECT id FROM chat.users WHERE public_id = ${user_public_id})
      AND chat_id = (SELECT id FROM chat.chats WHERE public_id = ${chat_public_id})
    RETURNING chat_id
)
-- 2. Собираем сообщение, автора и массив файлов
SELECT 
    m.public_id AS message_id,
    m.message,
    m.created_at,
    u.public_id AS sender_id,
    u.name AS sender_name,
    -- Магия JSON: собираем все вложения в массив объектов
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
    response.status(500).json({ error: "Failed to fetch messages" });
  }
});

MessagesRouter.post("/", async (request, response) => {
  try {
    const { message, additionals } = request.body;

    const insertedMessage = await postgreSql`
      INSERT INTO messages (
        message,
        created_at,
      )
      VALUES (
        ${message}
        now()
      )
      RETURNING public_id, message, created_at
    `;

    response.status(201).json(insertedMessage);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: "Internal server error" });
  }
});

MessagesRouter.put("/:public_id", async (request, response) => {
  try {
    const { fieldData } = request.body;

    const updatedMessage = await postgreSql`
      UPDATE messages
      SET message = ${fieldData}
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

MessagesRouter.delete("/message/:public_id", async (request, response) => {
  try {
    const [deletedMessage] = await postgreSql`
      DELETE CASCADE from messages
      WHERE public_id = ${request.params.public_id}
      RETURNING *
    `;

    response.status(201).json(deletedMessage);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: "Internal server error" });
  }
});
MessagesRouter.delete(
  "/messages/:chat_public_id",
  async (request, response) => {
    try {
      const deletedMessages = await postgreSql`
      DELETE CASCADE messages
      JOIN chat.chats WHERE chats.public_id = ${request.params.chat_public_id}
      RETURNING *
    `;
    } catch (error) {
      console.log(error);
      response.status(500).json({ message: "Internal server error" });
    }
  },
);
