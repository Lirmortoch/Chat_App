const ContactsRouter = require('express').Router();

const postgreSql = require('../db.js');
const contactSchema = require('../validation/schemas/contact.schema.js');

// const config = require('../utils/config.js');
const { fieldWhiteList } = require('../utils/middleware.js');
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
    const contact = await postgreSql.begin(async (sql) => {
      const [contactData] = await sql`
        SELECT phone_number, email, first_name, last_name, created_at, user_id, id
        FROM chat.contacts
        WHERE public_id = ${request.params.public_id}
      `;

      let [contactAvatar] = await sql`
        SELECT file_url, file_type, created_at
        FROM chat.contact_avatars
        WHERE id = ${contactData.id}
          AND is_main = true
      `;

      if (!contactAvatar) {
        [contactAvatar] = await sql`
          SELECT file_url, file_type, created_at
          FROM chat.user_profile_photos
          WHERE user_id = ${contactData.user_id}
            AND is_main = true
        `;
      }

      return {
        contactData,
        contactAvatar,
      }
    });

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

    const contacts = await postgreSql`
      SELECT 
        c.*, 
        CASE 
          WHEN p.id IS NOT NULL THEN 
            json_build_object(
              'url', p.file_url,
              'type', p.file_type,
              'is_main', p.is_main
            )
          ELSE null 
        END AS avatar
      FROM chat.contacts c
      LEFT JOIN chat.user_profile_photos p ON c.user_id = p.user_id AND p.is_main = true
      WHERE c.owner_id = ${user_id}
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

ContactsRouter.post('/', fieldWhiteList, validator(contactSchema), async (request, response) => {
  try {
    const { first_name, last_name, phone_number, email, user_public_id } = request.body.fieldsData;
    const ownerId = request.user.id;

    if (!first_name || !email) {
      return response.status(400).json({ message: "Missing required field" });
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

ContactsRouter.put('/:public_id', fieldWhiteList, validator(contactSchema), async (request, response) => {
  try {
    const { fieldsData } = request.body;
    const fields = request.fields;

    const [updatedContact] = await postgreSql.begin(async (sql) => {
      const cols = fields.filter(f => f !== 'avatar');

      const [updatedContactData] = await sql`
        UPDATE chat.contacts
        SET ${sql(fieldsData, cols)}
        WHERE public_id = ${request.params.public_id}
        RETURNING ${cols.join('')}, id
      `;

      let updatedContactAvatar = null;
      if (fields.includes('avatar') && fieldsData.avatar) {
        [updatedContactAvatar] = await sql`
          UPDATE chat.contact_avatars
          SET ${sql(fieldsData.avatar, 'file_url', 'file_type', 'is_main')}
          WHERE contact_id = ${updatedContact.id}
          RETURNING file_url, file_type, is_main, created_at
        `;
      }

      return {
        updatedContactData,
        updatedContactAvatar,
      }
    });
    
    response.status(201).json(updatedContact);
  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

ContactsRouter.delete('/:public_id', async (request, response) => {
  try {
    const deletedContact = await postgreSql.begin(async (sql) => {
      const [deletedContactData] = await sql`
        DELETE FROM chat.contacts
        WHERE public_id = ${request.params.public_id}
        RETURNING phone_number, first_name, last_name, email, public_id, id
      `;

      const contactAvatars = await sql`
        SELECT file_url, file_type, created_at
        FROM chat.contact_avatars
        WHERE id = ${deletedContactData.id}
      `;

      let deletedContactAvatars = null;
      if (contactAvatars && contactAvatars.length !== 0) {
        deletedContactAvatars = sql`
          DELETE FROM chat.contact_avatars
          WHERE id = ${deletedContactData.id}
          RETURNING file_url, file_type, created_at
        `;
      }

      return {
        deletedContactData,
        deletedContactAvatars
      }
    });

    response.status(201).json(deletedContact);
  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = ContactsRouter;