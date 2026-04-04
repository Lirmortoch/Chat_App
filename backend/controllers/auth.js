const AuthRouter = require('express').Router();

const postgreSql = require('../db.js');
const config = require('../utils/config.js');
const { fieldWhiteList, userList, adminList, checkUserPrivileges, fieldObjectChecking } = require('../utils/middleware.js');
const { validator } = require('../validation/utils/middleware.js');

AuthRouter.post('/user/login', fieldWhiteList(userList), validator(userSchema), async (request, response) => {
  try {
    const { fieldsData, sessionData } = request.body;

    const [user] = await postgreSql`
      SELECT username, password_hash, id 
      FROM chat.users u
      WHERE u.username = ${fieldsData.username}
    `;

    if (!user) {
      return response.status(401).json({
        message: 'User not found or username was wrong',
      });
    }

    const passwordCorrect = await bcrypt.compare(fieldsData.password, user.password_hash);

    if (!passwordCorrect) {
      return response.status(401).json({
        message: 'Invalid password',
      });
    }

    const expireDate = new Date();
    expireDate.setHours(expireDate.getHours() + 48);

    const [session] = await postgreSql`
      INSERT INTO chat.sessions (user_id, ip_address, user_agent, identifier, expired_at, last_seen_at)
      VALUES (${user.id}, ${postgreSql(sessionData)}, uuidv7(), ${expireDate}, now())
      RETURNING identifier
    `;

    response.cookie('identifier', session.identifier, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      expires: expireDate,
    });

    response.status(200).json({ message: 'Login successful' });
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});
AuthRouter.delete('/user/logout', async (request, response) => {
  try {
    const [deletedSession] = await postgreSql`
      DELETE * FROM chat.sessions
      WHERE identifier = ${request.cookies.identifier}
    `;

    response.status(201).json(deletedSession);
  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = AuthRouter;