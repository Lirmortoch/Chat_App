const MessagesRouter = require('express').Router();

const postgreSql = require('../db.js');
// const config = require('../utils/config.js');

MessagesRouter.get('/', async (request, response) => {
  try {
    const messages = await postgreSql`
      SELECT public_id, edited_at, message
      FROM messages
    `;

    response.json(messages);
  }
  catch(error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});
MessagesRouter.get('/:public_id', async (request, response) => {
  try {
    const message = await postgreSql`
      SELECT * FROM messages
      WHERE public_id = ${request.params.public_id}
    `;

    if (!message) {
      response.status(404).json({ message: 'Message not found' });
    }

    response.json(message);
  }
  catch(error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

MessagesRouter.post('/', async (request, response) => {
  try {
    const { message } = request.body;

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
  }
  catch(error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

MessagesRouter.put('/:public_id', async (request, response) => {
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
  }
  catch(error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

MessagesRouter.delete('/:public_id', async (request, response) => {
  try {
    
  }
  catch(error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
})