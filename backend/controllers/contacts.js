const ContactsRouter = require('express').Router();

const postgreSql = require('../db.js');
const contactSchema = require('../validation/schemas/contact.schema.js');

// const config = require('../utils/config.js');
const { fieldWhiteList, userList, checkUserPrivileges } = require('../utils/middleware.js');
const { validator } = require('../validation/utils/middleware.js');

ContactsRouter.get('/', checkUserPrivileges, async (request, response) => {
  try {
    if (request.userRole !== 'owner') {
      return response.status(403).json({
        message: 'Access denied: You do not have enough privileges',
      });
    }
    
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
    SELECT
      c.phone_number, 
      c.email, 
      c.first_name, 
      c.last_name, 
      c.created_at, 
      c.public_id,

      (SELECT json_agg(
        json_build_object(
          'url', ph.file_url,
          'is_main', ca.is_main,
          'created_at', ca.created_at
        ) ORDER BY ca.created_at DESC
      ) FROM chat.contact_avatars ca 
        JOIN chat.photos ph ON ca.photo_id = ph.public_id 
        WHERE ca.contact_id = c.id
    ) AS custom_avatars_history,

    (SELECT json_agg(
        json_build_object(
          'url', ph.file_url,
          'is_main', upp.is_main,
          'created_at', upp.created_at
        ) ORDER BY upp.created_at DESC
      ) FROM chat.user_profile_photos upp 
        JOIN chat.photos ph ON upp.photo_id = ph.public_id 
        WHERE upp.user_id = c.user_id
    ) AS global_avatars_history

    FROM chat.contacts c
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

    const contacts = await postgreSql`
    SELECT
      c.phone_number, 
      c.email, 
      c.first_name, 
      c.last_name, 
      c.created_at, 
      c.public_id,

        COALESCE(
          CASE WHEN ph_ca.public_id IS NOT NULL THEN 
              json_build_object(
                'url', ph_ca.file_url,
                'type', ph_ca.file_type,
                'name', ph_ca.file_name,
                'height', ph_ca.height,
                'width', ph_ca.width,
                'is_main', ca.is_main,
                'created_at', ca.created_at,
                'updated_at', ca.updated_at
              ) 
          END,
        
          CASE WHEN ph_upp.public_id IS NOT NULL THEN 
              json_build_object(
                'url', ph_upp.file_url,
                'type', ph_upp.file_type,
                'name', ph_upp.file_name,
                'height', ph_upp.height,
                'width', ph_upp.width,
                'is_main', upp.is_main,
                'created_at', upp.created_at,
                'updated_at', upp.updated_at
              ) 
          END
        ) AS avatar
      FROM chat.contacts c

      LEFT JOIN chat.contact_avatars ca ON (ca.contact_id = c.id AND ca.is_main = true)
      LEFT JOIN chat.photos ph_ca ON ca.photo_id = ph_ca.public_id
      LEFT JOIN chat.user_profile_photos upp ON (upp.user_id = c.user_id AND upp.is_main = true)
      LEFT JOIN chat.photos ph_upp ON upp.photo_id = ph_upp.public_id

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

      const [insertedContactAvatar] = await sql`
        SELECT 
            CASE 
                WHEN ph_upp.public_id IS NOT NULL THEN 
                    json_build_object(
                        'url', ph_upp.file_url,
                        'type', ph_upp.file_type,
                        'name', ph_upp.file_name,
                        'height', ph_upp.height,
                        'width', ph_upp.width,
                        'is_main', upp.is_main,
                        'created_at', upp.created_at,
                        'updated_at', upp.updated_at
                    )
                ELSE NULL 
            END AS avatar 
        FROM chat.contacts c
        LEFT JOIN chat.user_profile_photos upp ON (upp.user_id = c.user_id AND upp.is_main = true)
        LEFT JOIN chat.photos ph_upp ON upp.photo_id = ph_upp.public_id
        WHERE c.owner_id = ${user_id};
      `;

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
    const { avatar, contact_public_id } = request.body;

    const updatedAvatar = postgreSql.begin(async (sql) => {
      let usersAvatar = null;
      if (avatar && fieldObjectChecking(avatar)) {
        const [photo] = await sql`
          INSERT INTO chat.photos (file_type, file_url, file_name, width, height)
          ${sql({...avatar.photo})}
          RETURNING file_type, file_url, file_name, width, height, public_id
        `;

        [usersAvatar] = await sql`
          INSERT INTO chat.contact_avatars (is_main, contact_id, photo_id)
          VALUES (
            ${avatar.is_main},
            ${`SELECT id FROM chat.users WHERE public_id = ${contact_public_id}`},
            ${photo.public_id}
          )
          RETURNING is_main
        `;

        usersAvatar.photo = structuredClone(photo);
      }

      return usersAvatar
    });

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