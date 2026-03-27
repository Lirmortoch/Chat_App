const ContactsRouter = require('express').Router();

const postgreSql = require('../db.js');
const contactSchema = require('../validation/schemas/contact.schema.js');

// const config = require('../utils/config.js');
const { fieldWhiteList, userList } = require('../utils/middleware.js');
const { validator } = require('../validation/utils/middleware.js');

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
    const [contact] = await postgreSql`SELECT
      c.phone_number, 
      c.email, 
      c.first_name, 
      c.last_name, 
      c.created_at, 
      c.public_id,

      CASE WHEN ph.id IS NOT NULL THEN
        json_build_object(
          'url', ph.file_url,
          'type', ph.file_type,
          'width', ph.width,
          'height', ph.height,
          'name', ph.file_name,
          'is_main', ca.is_main,
          'created_at', ca.created_at,
          'updated_at', ca.updated_at
        )
      ELSE NULL END AS avatar
      FROM chat.contacts c
      LEFT JOIN chat.contact_avatars ca ON c.id = ca.contact_id
      LEFT JOIN chat.photos ph ON ca.photo_id = ph.id
      WHERE c.public_id = ${request.params.public_id}
    `;

    if (!contact) {
      return response.status(404).json({ message: 'Contact not found' });
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
    const user_id = request.user.id;

    const contacts = await postgreSql`SELECT
      c.phone_number, 
      c.email, 
      c.first_name, 
      c.last_name, 
      c.created_at, 
      c.public_id,

      CASE WHEN ph.id IS NOT NULL THEN
        json_build_object(
          'url', ph.file_url,
          'type', ph.file_type,
          'width', ph.width,
          'height', ph.height,
          'name', ph.file_name,
          'created_at', ca.created_at,
          'updated_at', ca.updated_at
        )
      ELSE NULL END AS avatar
      FROM chat.contacts c
      LEFT JOIN chat.contact_avatars ca ON c.id = ca.contact_id
      LEFT JOIN chat.photos ph ON ca.photo_id = ph.id
      WHERE c.owner_id = ${user_id}
        AND ca.is_main = true
    `;

    if (!contacts) {
      return response.status(404).json({ message: 'Contacts not found' });
    }

    response.json(contacts);
  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

ContactsRouter.post('/', fieldWhiteList(userList), validator(contactSchema), async (request, response) => {
  try {
    const { first_name, last_name, phone_number, email, user_public_id } = request.body.fieldsData;
    const ownerId = request.user.id;

    if (!first_name || !email || !user_public_id) {
      return response.status(400).json({ message: "Missing required field" });
    }

    const insertedContact = await postgreSql.begin(async (sql) => {
      const [insertedContactData] = await sql`
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

      const [userAvatar] = await sql`
        SELECT file_type, file_url, is_main, created_at
        FROM chat.user_profile_photos
        WHERE user_id = (SELECT id from chat.users WHERE public_id = ${user_public_id})
          AND is_main = true
      `;

      let insertedContactAvatar = null;
      if (userAvatar) {
        [insertedContact] = await sql`
          INSERT INTO chat.contact_avatars (
            file_url,
            file_type,
            is_main, 
            created_at,
            contact_id
          )
          VALUES (
            ${sql({...userAvatar, contact_id: `SELECT id FROM chat.contacts WHERE public_id = ${userAvatar.public_id}`})}
          )
          RETURNING file_url, file_type
        `;
      }

      return {
        insertedContactData,
        insertedContactAvatar,
      }
    });

    response.status(201).json(insertedContact);
  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

ContactsRouter.put('/:public_id', fieldWhiteList(userList), validator(contactSchema), async (request, response) => {
  try {
    const { fieldsData } = request.body;
    const fields = request.fields;

    const cols = fields.filter(f => f !== 'avatar').join(', ');
    const [updatedContact] = await postgreSql`
      UPDATE chat.contacts
      SET ${sql(fieldsData, cols)}
      WHERE public_id = ${request.params.public_id}
      RETURNING ${cols}
    `;
    
    response.status(201).json(updatedContact);
  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});
ContactsRouter.put('/contact/avatar/:public_id', fieldWhiteList(userList), validator(contactSchema), async (request, response) => {
  try {
    const { fieldsData } = request.body;

    const [updatedAvatar] = await postgreSql`
      UPDATE chat.contact_avatars
      SET ${sql(fieldsData.avatar, 'file_url', 'file_type', 'is_main')}
      WHERE contact_id = (SELECT id FROM chat.contacts WHERE public_id = ${contactData.public_id})
      RETURNING file_url, file_type, is_main, created_at, public_id
    `;

    response.status(201).json(updatedAvatar);
  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

ContactsRouter.delete('/:public_id', async (request, response) => {
  try {
    const [deletedContact] = await postgreSql`
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