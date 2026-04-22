import bcrypt from 'bcrypt';

import { error } from '../utils/logger.js';
import { getUserByUsername } from '../services/usersService.js';
import {insertSession, deleteSession as _deleteSession} from '../services/authService.js';

const addSession = async (request, response) => {
  try {
    const { fieldsData, sessionData } = request.body;

    const user = await getUserByUsername(fieldsData.username);

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

    const session = await insertSession(user.id, sessionData, expireDate);

    response.cookie('identifier', session.identifier, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      expires: expireDate,
    });

    response.status(200).json({ message: 'Login successful' });
  } catch (err) {
    error(err);
    response.status(500).json({ message: 'Internal server error' });
  }
};
const deleteSession = async (request, response) => {
  try {
    const [deletedSession] = await _deleteSession(request.cookies.identifier);

    response.status(201).json(deletedSession);
  } catch (err) {
    error(err);
    response.status(500).json({ message: 'Internal server error' });
  }
};

export {
  addSession,
  deleteSession,
};
