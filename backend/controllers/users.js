const bcrypt = require('bcrypt');
const UsersRouter = require('express').Router();
const parsePhoneNumber = require('libphonenumber-js');

const postgreSql = require('../db.js');
const userSchema = require('../validation/schemas/user.schema.js');

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
    const { first_name, last_name, username, password, email, phone_number, role, avatar, repeated_password, user_about } = request.body;

    const validateUser = userSchema.validate({
      first_name,
      username,
      password,
      repeated_password,
      email,
      phone_number,
      role,
      last_name,
      user_about,
      avatar,
    });

    if (!first_name || !username || !password || !email || !role || !repeated_password) {
      response.status(400).json({ message: "Missing required field" });
    }
    else if (validateUser.error !== undefined) {
      response.status(400).json({ message: validateUser.error });
    }
    else if (phone_number !== undefined) {
      const parsed_phone_number = parsePhoneNumber(phone_number);
      
      if (!parsed_phone_number.isValid() || !parsed_phone_number.isPossible()) {
        response.status(400).json({ message: "Phone number is wrong. Enter again" });
      }
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
          role
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
          ${role}
        )
        RETURNING public_id, email, name, phone_number, username, role, id
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

UsersRouter.put('/:public_id', fieldWhiteList, async (request, response) => {
  try {
    const { fields, fieldsData } = request.body;
    const updatedUserData = [];

    fields.forEach(async (field) => {
      const updatedUser = await postgreSql.begin(async (sql) => {
      let updatedData;

      if (field === 'avatar') {
        [updatedData] = await sql`
          UPDATE chat.user_profile_photos 
          SET file_type = ${fieldsData[field].file_type}, 
          file_url = ${fieldsData[field].file_url}, 
          is_main = ${fieldsData[field].is_main}
          RETURNING file_type, file_url, is_main
        `;
      }
      else if (field !== 'message' && field !== 'additional' && field !== 'avatar') {
        [updatedData] = await sql`
          UPDATE chat.users
          SET ${field} = ${fieldsData[field]}
          RETURNING ${field}
        `;
      }
        return updatedData;
      });

      updatedUserData.push({field, updatedUser});
    });

    response.status(201).json(updatedUserData);
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