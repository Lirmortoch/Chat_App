const bcrypt = require('bcrypt');
const UsersRouter = require('express').Router();

const postgreSql = require('../db.js');
const userSchema = require('../validation/schemas/user.schema.js');

const config = require('../utils/config.js');
const { fieldWhiteList } = require('../utils/middleware.js');
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
    const user = await postgreSql.begin(async (sql) => {
      const [userData] = await sql`
        SELECT name, username, email, phone_number, created_at, deleted, restricted, role
        FROM chat.users WHERE public_id = ${request.params.public_id}
      `;
      const userAvatars = await sql`
        SELECT file_url, file_type, is_main, created_at
        FROM chat.user_profile_photos
        WHERE user_id = (SELECT id FROM chat.users WHERE public_id = ${request.params.public_id})
      `;

      return {
        userData,
        userAvatars
      }
    });

    if (!user) {
      return response.status(404).json({ message: 'User not found' });
    }

    response.json(user);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: `Internal server error` });
  }
});
UsersRouter.get('/restricted/:public_id', async (request, response) => {});
UsersRouter.get('/deleted/:public_id', async (request, response) => {});

UsersRouter.post('/', fieldWhiteList, validator(userSchema), async (request, response) => {
  try {
    const { first_name, last_name, username, password, email, phone_number, role, avatar, repeated_password, user_about } = request.body.fieldsData;

    if (!first_name || !username || !password || !email || !role || !repeated_password) {
      return response.status(400).json({ message: "Missing required field" });
    }

    const saltRounds = config.SALT_ROUNDS;
    const passwordHash = await bcrypt.hash(password, saltRounds);

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
          ${passwordHash},
          ${email},
          ${phone_number},
          false,
          false,
          ${role},
          ${user_about}
        )
        RETURNING public_id, email, name, phone_number, username, role, id, user_about
      `;

      let usersAvatar;
      if (avatar) {
        [usersAvatar] = await sql`
          INSERT INTO chat.user_profile_photos (file_type, file_url, user_id)
          ${sql({...avatar, user_id: usersData.id, is_main: avatar.is_main})}
          RETURNING file_url, file_type, created_at, is_main
        `;
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

UsersRouter.put('/:public_id', fieldWhiteList, validator(userSchema), async (request, response) => {
  try {
    const { fieldsData } = request.body;
    const user_id = request.user.id;
    const fields = request.fields;

    const updatedUser = await postgreSql.begin(async (sql) => {
      const cols = fields.filter(f => f !== 'avatar');

      const [uptUser] = await sql`
        UPDATE chat.users
        SET ${sql(fieldsData, cols)}
        WHERE id = ${user_id}
        RETURNING ${cols}
      `;

      let uptUserAvatar = null;
      if (fields.includes('avatar') && fieldsData.avatar) {
        [uptUserAvatar] = await sql`
          UPDATE chat.user_profile_photos
          SET ${sql(fieldsData.avatar, 'file_url', 'file_type', 'is_main')}
          WHERE user_id = ${user_id}
          RETURNING file_url, file_type, is_main
        `;
      }

      return {
        uptUser,
        uptUserAvatar,
      }
    });

    response.status(201).json(updatedUser);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: `Internal server error` });
  }
});

UsersRouter.delete('/:public_id', async (request, response) => {
  try {
    const user_id = request.user.id;

    const deletedUser = await postgreSql.begin(async (sql) => {
      const [delUser] = await sql`
        DELETE from chat.users 
        WHERE id = ${user_id}
        RETURNING email, name, phone_number, username, role, deleted, restricted
      `;

      const avatars = await sql`
        SELECT file_url, file_type, created_at, is_main, id
        FROM chat.user_profile_photos
        WHERE user_id = (SELECT id FROM chat.users WHERE public_id = ${request.params.public_id})
      `;

      let delAvatars;
      if (avatars && avatars.length !== 0) {
        delAvatars = await sql`
          DELETE from chat.user_profile_photos
          WHERE user_id = ${user_id}
          RETURNING file_url, file_type, is_main, created_at
        `;
      }

      return {
        delUser,
        delAvatars,
      };
    });

    response.status(201).json(deletedUser);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: `Internal server error` });
  }
});

module.exports = UsersRouter;