const ContactsRouter = require('express').Router();

const postgreSql = require('../db.js');

// const config = require('../utils/config.js');
const { fieldWhiteList } = require('../utils/middleware.js');

ContactsRouter.get('/', async (request, response) => {
  try {
    const contacts = await postgreSql`
      SELECT public_id
      FROM chat.contacts
    `;

    response.json(contacts);
  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});
ContactsRouter.get('/:public_id', async (request, response) => {
  try {
    const [contact] = await postgreSql`
      SELECT phone_number, email, first_name, last_name, created_at
      FROM chat.contacts
      WHERE public_id = ${request.params.public_id}
    `;

    if (!contact) {
      response.status(404).json({ message: 'Contact not found' });
    }

    response.json(contact);
  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});
ContactsRouter.get('/user/:public_id', async (request, response) => {
  try {
    const userId = request.user.id;

    const contacts = await postgreSql`
      SELECT phone_number, email, first_name, last_name, created_at, public_id
      FROM chat.contacts
      WHERE owner_id = ${userId}
    `;

    response.json(contacts);
  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

ContactsRouter.post('/', async (request, response) => {
  try {
    const { first_name, last_name, phone_number, email, user_public_id } = request.body;
    const ownerId = request.user.id;

    const insertedContact = await postgreSql`
      INSERT INTO chat.contacts (
        phone_number,
        first_name,
        last_name,
        email,
        user_id,
        owner_id
      )
        VALUES (
          ${phone_number},
          ${first_name},
          ${last_name},
          ${email},
          SELECT id from chat.users WHERE public_id = ${user_public_id},
          ${ownerId}
        )
        RETURNING phone_number, first_name, last_name, email, public_id
    `;

    response.status(201).json(insertedContact);
  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

ContactsRouter.put('/:public_id', async (request, response) => {
  try {
    const { field, fieldData } = request.body;

    const updatedContact = await postgreSql`
      UPDATE chat.contacts
      SET ${field} = ${fieldData}
      WHERE public_id = ${request.params.public_id}
      RETURNING ${field}
    `;

    response.status(201).json(updatedContact);
  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

ContactsRouter.delete('/:public_id', async (request, response) => {
  try {

  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = ContactsRouter;