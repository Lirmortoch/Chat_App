const postgreSql = require('../db.js');
const { fieldObjectChecking } = require('../utils/middleware.js');

const getAllUsers = async () => {
  try {
    const users = await postgreSql`
    SELECT public_id
    FROM chat.users
  `;

    return users;
  } catch (err) {
    logger.error(`Error: ${err}`);
  }
};
const getUser = async (public_id) => {
  try {
    const [user] = await postgreSql`
    SELECT
      u.name, 
      u.username, 
      u.email, 
      u.phone_number, 
      u.created_at, 
      u.deleted, 
      u.restricted, 
      u.role,

    CASE WHEN ph.id IS NOT NULL THEN
      json_build_object(
        'url', ph.file_url,
        'type', ph.file_type,
        'width', ph.width,
        'height', ph.height,
        'name', ph.file_name,
        'is_main', upp.is_main,
        'created_at', upp.created_at,
        'updated_at', upp.updated_at
      )
    ELSE NULL END AS avatar
    FROM chat.users u
    LEFT JOIN chat.user_profile_photos upp ON u.id = upp.user_id
    LEFT JOIN chat.photos ph ON upp.photo_id = ph.id
    WHERE u.public_id = ${public_id}
  `;

    return user;
  } catch (err) {
    logger.error(`Error: ${err}`);
  }
};
const getUserByUsername = async (username) => {
  try {
    const [user] = await postgreSql`
    SELECT username, password_hash, id 
    FROM chat.users u
    WHERE u.username = ${username}
  `;

    return user;
  } catch (err) {
    logger.error(`Error: ${err}`);
  }
};

const insertUser = async (fieldsData, password_hash) => {
  try {
    const { first_name, last_name, username, email, phone_number, avatar, user_about } = fieldsData;

    const insertedUser = await postgreSql.begin(async (sql) => {
      const [usersData] = await sql`
      INSERT INTO chat.users (
        first_name,
        username,
        password_hash,
        email,
        phone_number,
        user_about
      )
      VALUES (
        ${first_name},
        ${last_name},
        ${username},
        ${password_hash},
        ${email},
        ${phone_number},
        ${user_about}
      )
      RETURNING public_id, email, name, phone_number, username, role, user_about
    `;

      let usersAvatar = null;
      if (avatar && fieldObjectChecking(avatar)) {
        const [photo] = await sql`
        INSERT INTO chat.photos (file_type, file_url, file_name, width, height)
        ${sql({ ...avatar.photo })}
        RETURNING file_type, file_url, file_name, width, height, public_id
      `;

        [usersAvatar] = await sql`
        INSERT INTO chat.user_profile_photos (is_main, user_id, photo_id)
        VALUES (
          ${avatar.is_main},
          ${`SELECT id FROM chat.users WHERE public_id = ${usersData.public_id}`},
          ${photo.public_id}
        )
        RETURNING is_main
      `;

        usersAvatar.photo = structuredClone(photo);
      }

      return {
        usersData,
        usersAvatar,
      };
    });

    return insertedUser;
  } catch (err) {
    logger.error(`Error: ${err}`);
  }
};

const updateUserInfo = async (fieldsData, fields, user_id) => {
  try {
    const updatedUserInfo = await postgreSql.begin(async (sql) => {
      const cols = fields.filter((f) => f !== 'avatar').join(', ');

      const [updatedUserData] = await sql`
      UPDATE chat.users
      SET ${sql(fieldsData, cols)}
      WHERE id = ${user_id}
      RETURNING ${cols}, public_id
    `;

      let updatedUserAvatar = null;
      if (fieldsData.avatar && fieldObjectChecking(fieldsData.avatar)) {
        const [photo] = await sql`
        INSERT INTO chat.photos (file_type, file_url, file_name, width, height)
        ${sql({ ...fieldsData.avatar.photo })}
        RETURNING file_type, file_url, file_name, width, height, public_id
      `;

        [updatedUserAvatar] = await sql`
        INSERT INTO chat.user_profile_photos (is_main, user_id, photo_id)
        VALUES (
          ${fieldsData.avatar.is_main},
          ${user_id},
          ${photo.public_id}
        )
        RETURNING is_main
      `;

        updatedUserAvatar.photo = structuredClone(photo);
      }

      return {
        updatedUserData,
        updatedUserAvatar,
      };
    });

    return updatedUserInfo;
  } catch (err) {
    logger.error(`Error: ${err}`);
  }
};
const updateUserAccess = async (fieldsData, cols) => {
  try {
    const [newAccess] = await postgreSql`
    UPDATE chat.users
    SET ${postgreSql(fieldsData, cols)}
    WHERE id = ${fieldsData.user_id}
    RETURNING ${cols}
  `;

    return newAccess;
  } catch (err) {
    logger.error(`Error: ${err}`);
  }
};

const deleteUser = async (user_id) => {
  try {
    const [deletedUser] = await postgreSql`
    DELETE FROM chat.users 
    WHERE id = ${user_id}
    RETURNING email, name, phone_number, username, role, deleted, restricted, public_id
  `;

    return deletedUser;
  } catch (err) {
    logger.error(`Error: ${err}`);
  }
};

module.exports = {
  getAllUsers,
  getUser,
  getUserByUsername,

  insertUser,

  updateUserInfo,
  updateUserAccess,

  deleteUser,
};
