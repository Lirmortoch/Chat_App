const bcrypt = require('bcrypt');
const UsersRouter = require('express').Router();

const postgreSql = require('../db.js');
const userSchema = require('../validation/schemas/user.schema.js');

const config = require('../utils/config.js');
const { fieldWhiteList, userList, adminList, checkUserPrivileges, fieldObjectChecking } = require('../utils/middleware.js');
const { validator } = require('../validation/utils/middleware.js');

UsersRouter.get('/', async (request, response) => {
  try {
    const users = await postgreSql`
      SELECT public_id
      FROM chat.users
    `;

    response.json(users);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});
UsersRouter.get('/:public_id', async (request, response) => {
  try {
    const user = await postgreSql`
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
        WHERE u.public_id = ${request.params.public_id}
      `;

    if (!user) {
      return response.status(404).json({ message: 'User not found' });
    }

    response.json(user);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: `Internal server error` });
  }
});

UsersRouter.post('/', fieldWhiteList(userList), validator(userSchema), async (request, response) => {
  try {
    const { first_name, last_name, username, password, email, phone_number, role, avatar, repeated_password, user_about } = request.body.fieldsData;

    if (!first_name || !username || !password || !email || !role || !repeated_password) {
      return response.status(400).json({ message: "Missing required field" });
    }

    const saltRounds = config.SALT_ROUNDS;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const insertedUser = await postgreSql.begin(async (sql) => {
      const [usersData] = await sql`
        INSERT INTO chat.users (
          first_name,
          username,
          password_hash,
          email,
          phone_number,
          deleted,
          restricted,
          role,
          user_about
        )
        VALUES (
          ${first_name},
          ${last_name},
          ${username},
          ${password_hash},
          ${email},
          ${phone_number},
          false,
          false,
          ${role},
          ${user_about}
        )
        RETURNING public_id, email, name, phone_number, username, role, user_about
      `;

      let usersAvatar = null;
      if (avatar && fieldObjectChecking(avatar)) {
        const [photo] = await sql`
          INSERT INTO chat.photos (file_type, file_url, file_name, width, height)
          ${sql({...avatar.photo})}
          RETURNING file_type, file_url, file_name, width, height, public_id
        `;

        [usersAvatar] = await sql`
          INSERT INTO chat.user_profile_photos (is_main, user_id, photo_id)
          VALUES (
            ${avatar.is_main},
            ${`SELECT id FROM chat.users WHERE public_id = ${usersData.public_id}`},
            ${photo.public_id}
          )
          RETURNING is_main, user_id, photo_id
        `;

        usersAvatar.photo = structuredClone(photo);
      }

      return {
        usersData,
        usersAvatar, 
      };
    });

    response.status(201).json(insertedUser);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: `Internal server error` });
  }
});

UsersRouter.put('/:public_id', fieldWhiteList(userList), validator(userSchema), async (request, response) => {
  try {
    const { fieldsData } = request.body;
    const user_id = request.user.id;
    const fields = request.fields;

    const updatedUser = await postgreSql.begin(async (sql) => {
      const cols = fields.filter(f => f !== 'avatar').join(', ');

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
          ${sql({...fieldsData.avatar.photo})}
          RETURNING file_type, file_url, file_name, width, height, public_id
        `;

        [updatedUserAvatar] = await sql`
          INSERT INTO chat.user_profile_photos (is_main, user_id, photo_id)
          VALUES (
            ${fieldsData.avatar.is_main},
            ${user_id},
            ${photo.public_id}
          )
          RETURNING is_main, user_id, photo_id
        `;

        updatedUserAvatar.photo = structuredClone(photo);
      }

      return {
        updatedUserData,
        updatedUserAvatar,
      }
    });

    response.status(201).json(updatedUser);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: `Internal server error` });
  }
});
UsersRouter.put('/access/user/:public_id', checkUserPrivileges, fieldWhiteList(adminList), validator(chatSchema), async (request, response) => {
  try {
    const { fieldsData } = request.body;
    const cols = request.cols;

    const [newAccess] = await postgreSql`
      UPDATE chat.users
      SET ${postgreSql(fieldsData, cols)}
      RETURNING ${cols}
    `;

    response.status(201).json(newAccess);
  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: `Internal server error` });
  }
});

UsersRouter.delete('/:public_id', async (request, response) => {
  try {
    const user_id = request.user.id;

    const [deletedUser] = await postgreSql`
      DELETE FROM chat.users 
      WHERE id = ${user_id}
      RETURNING email, name, phone_number, username, role, deleted, restricted, public_id
    `;

    response.status(201).json(deletedUser);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: `Internal server error` });
  }
});

module.exports = UsersRouter;