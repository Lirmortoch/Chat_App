const postgreSql = require('../db.js');
const { fieldObjectChecking } = require('../utils/middleware.js');

const getAllContacts = async () => {
  try {
    const contacts = await postgreSql`
    SELECT public_id
    FROM chat.contacts
  `;

    return contacts;
  } catch (err) {
    logger.error(`Error: ${err}`);
  }
};
const getContact = async (public_id) => {
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
    WHERE c.public_id = ${public_id}
  `;

    return contact;
  } catch (err) {
    logger.error(`Error: ${err}`);
  }
};
const getUsersContacts = async (user_id) => {
  try {
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

    return contacts;
  } catch (err) {
    logger.error(`Error: ${err}`);
  }
};

const insertContact = async (fieldsData, ownerId) => {
  try {
    const { first_name, last_name, phone_number, email, user_public_id } = fieldsData;

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
      };
    });

    return insertedContact;
  } catch (err) {
    logger.error(`Error: ${err}`);
  }
};

const updateContactInfo = async (fieldsData, cols) => {
  try {
    const [updatedContact] = await postgreSql`
    UPDATE chat.contacts
    SET ${sql(fieldsData, cols)}
    WHERE public_id = ${request.params.public_id}
    RETURNING ${cols}
  `;

    return updatedContact;
  } catch (err) {
    logger.error(`Error: ${err}`);
  }
};
const updateContactAvatar = async () => {
  try {
    const updatedAvatar = await postgreSql.begin(async (sql) => {
      let usersAvatar = null;
      if (avatar && fieldObjectChecking(avatar)) {
        const [photo] = await sql`
        INSERT INTO chat.photos (file_type, file_url, file_name, width, height)
        ${sql({ ...avatar.photo })}
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

      return usersAvatar;
    });

    return updatedAvatar;
  } catch (err) {
    logger.error(`Error: ${err}`);
  }
};

const deleteContact = async (public_id) => {
  try {
    const [deletedContact] = await postgreSql`
    DELETE FROM chat.contacts
    WHERE public_id = ${public_id}
    RETURNING phone_number, first_name, last_name, email, public_id
  `;

    return deletedContact;
  } catch (err) {
    logger.error(`Error: ${err}`);
  }
};

module.exports = {
  getAllContacts,
  getContact,
  getUsersContacts,

  insertContact,

  updateContactInfo,
  updateContactAvatar,

  deleteContact,
};
