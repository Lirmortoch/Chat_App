const bcrypt = require('bcrypt');
const UserRouter = require('express').Router();

const postgreSql = require('../db.js');

UserRouter.get('/', async (request, response) => {
  const users = await postgreSql`
    SELECT id, email, name
    FROM users
  `;

  if (!users) {
    return response.status(404).end();
  }

  response.json(users);
});

UserRouter.get('/:id', async (request, response) => {
  const [ user ] = await postgreSql`
    SELECT * FROM users WHERE id = ${request.params.id}
  `;

  if (!user) {
    return response.status(404).end();
  }

  response.json(user);
});

UserRouter.post('/:id', async (request, response) => {
  const { name, username, password, email, phoneNumber, role } = request.params;
  const saltRounds = 25;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const insertedUser = await postgreSql`
    INSERT INTO users (
      name,
      username,
      password_hash,
      email,
      phone_number,
      created_at,
      deleted,
      restricted,
      role
    )
    SELECT
      ${name},
      ${username},
      ${passwordHash},
      ${email},
      ${phoneNumber},
      now(),
      false,
      false,
      'user'
  `;

  if (!user) {
    return response.status(404).end();
  }

  response.json(user);
});

module.exports = UserRouter;