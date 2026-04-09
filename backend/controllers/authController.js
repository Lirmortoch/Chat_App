const usersService = require('../services/usersService.js');
const authService = require('../services/authService.js');

const addSession = async (request, response) => {
  try {
    const { fieldsData, sessionData } = request.body;

    const user = usersService.getUserByUsername(fieldsData.username);

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

    const session = await authService.insertSession(user.id, sessionData, expireDate);

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
};
const deleteSession = async (request, response) => {
  try {
    const [deletedSession] = await authService.deleteSession(request.cookies.identifier);

    response.status(201).json(deletedSession);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  addSession,
  deleteSession,
};
