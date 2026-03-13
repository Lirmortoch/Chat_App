const bcrypt = require('bcrypt');
const UsersRouter = require('express').Router();
const Joi = require('joi');

const userSchema = Joi.object({
  first_name: Joi.string().min(3).max(128).required(),
  username: Joi.string().min(5).max(45).required(),
  password: Joi.string().pattern(new RegExp()).required(),
  repeated_password: Joi.ref('password'),
  email: Joi.string().email().required(), 
	phone_number: Joi.string().pattern(new RegExp()),
	role: Joi.string().valid('admin', 'user', 'owner').default('user').required(), 
	last_name: Joi.string().min(3).max(128),
	user_about: Joi.string().min(3).max(128),
});

const postgreSql = require('../db.js');

const config = require('../utils/config.js');
const { fieldWhiteList } = require('../utils/middleware.js');

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

UsersRouter.post('/', async (request, response) => {
  try {
    const { name, username, password, email, phoneNumber, role, avatar, repeated_password } = request.body;

    if (!password || !email || !name || !role || !username) {
      return response.status(400).json({ message: 'Missing required fields' });
    }

    const saltRounds = config.SALT_ROUNDS;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const insertedUser = await postgreSql.begin(async (sql) => {
      const [usersData] = await sql`
        INSERT INTO chat.users (
          name,
          username,
          password_hash,
          email,
          phone_number,
          deleted,
          restricted,
          role
        )
        VALUES (
          ${name},
          ${username},
          ${passwordHash},
          ${email},
          ${phoneNumber},
          false,
          false,
          ${role}
        )
        RETURNING public_id, email, name, phone_number, username, role, id
      `;

      let usersAvatar;

      if (avatar) {
        [usersAvatar] = await sql`
          INSERT INTO chat.user_profile_photos (file_type, file_url, user_id)
          ${sql({...avatar, user_id: usersData.id})}
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

UsersRouter.put('/:public_id', fieldWhiteList, async (request, response) => {
  try {
    const { field, fieldData } = request.body;

    const updatedUser = await postgreSql.begin(async (sql) => {
      let updatedData;

      if (field === 'avatar') {
        [updatedData] = await sql`
          UPDATE chat.user_profile_photos 
          SET file_type, file_url, created_at
          ${sql({...fieldData, is_main: fieldData.is_main})}
          RETURNING file_type, file_url, is_main
        `;
      }
      else if (field === 'message' || field === 'additional') {
        response.status(400).json({ message: 'Invalid field' });
      }
      else {
        [updatedData] = await sql`
          UPDATE chat.users
          SET ${field} = ${fieldData}
          RETURNING ${field}
        `;
      }

      return updatedData;
    });

    response.status(201).json(updatedUser);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: `Internal server error` });
  }
});

UsersRouter.delete('/:public_id', async (request, response) => {
  try {
    const deletedUser = await postgreSql.begin(async (sql) => {
      const [delUser] = await sql`
        DELETE from chat.users 
        WHERE public_id = ${request.params.public_id}
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
          WHERE user_id = (SELECT if FROM chat.users WHERE public_id = ${request.params.public_id})
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