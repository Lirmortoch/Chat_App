const ContactsRouter = require('express').Router();
const Joi = require('joi');
const parsePhoneNumber = require('libphonenumber-js');

const postgreSql = require('../db.js');

// const config = require('../utils/config.js');
const { fieldWhiteList } = require('../utils/middleware.js');

const contactSchema = Joi.object({
  first_name: Joi.string().min(3).max(128),
  email: Joi.string().email(), 
  phone_number: Joi.string(),
  last_name: Joi.string().min(3).max(128),
});

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
    const contact = await postgreSql.begin(async (sql) => {
      const [contactData] = await sql`
        SELECT phone_number, email, first_name, last_name, created_at, user_id
        FROM chat.contacts
        WHERE public_id = ${request.params.public_id}
      `;
      const [contactAvatar] = await sql`
        SELECT file_url, file_type, created_at
        FROM chat.user_profile_photos
        WHERE user_id = ${contactData.user_id}
          AND is_main = true
      `;

      return {
        contactData,
        contactAvatar,
      }
    });

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

    const contacts = await postgreSql.begin(async (sql) => {
      const contactsData = await sql`
        SELECT phone_number, email, first_name, last_name, created_at, public_id, user_id
        FROM chat.contacts
        WHERE owner_id = ${userId}
      `;

      const contactsAvatars = [];
      contactsData.foeEach(async (contact) => {
        const contactAvatar = await sql`
          SELECT file_url, file_type, is_main, created_at
          FROM chat.user_profile_photos
          WHERE user_id = ${contact.user_id}
            AND is_main = true
        `;
        contactsAvatars.push(contactAvatar);
      });

      return {
        contactsData,
        contactsAvatars,
      }
    });

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

    const contact = contactSchema.validate({
      first_name,
      email,
      phone_number,
      last_name,
    });

    if (!first_name || !email) {
      response.status(400).json({ message: "Missing required field" });
    }
    else if (contact.error !== undefined) {
      response.status(400).json({ message: user.error });
    }
    else if (phone_number !== undefined) {
      const parsed_phone_number = parsePhoneNumber(phone_number);
      
      if (!parsed_phone_number.isValid() || !parsed_phone_number.isPossible()) {
        response.status(400).json({ message: "Phone number is wrong. Enter again" });
      }
    }

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
        (SELECT id from chat.users WHERE public_id = ${user_public_id}),
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

ContactsRouter.put('/:public_id', fieldWhiteList, async (request, response) => {
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
    const deletedContact = await postgreSql`
      DELETE FROM chat.contacts
      WHERE public_id = ${request.params.public_id}
      RETURNING phone_number, first_name, last_name, email, public_id
    `;

    response.status(201).json(deletedContact);
  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = ContactsRouter;