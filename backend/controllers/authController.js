import bcrypt from 'bcrypt';

import { error } from '../utils/logger.js';
import { getUserByUsername } from '../services/usersService.js';
import {insertSession, deleteSession as _deleteSession} from '../services/authService.js';

const addSession = async (request, response) => {
  try {
    const sessionData = request.body.sessionData;

    const user = await getUserByUsername(request.body.username);
  
    if (!user) {
      return response.status(401).json({
        message: 'User not found or username was wrong',
      });
    }

    const passwordCorrect = await bcrypt.compare(request.body.password, user.password_hash);

    if (!passwordCorrect) {
      return response.status(401).json({
        message: 'Invalid password',
      });
    }

    const daysToExpire = 2;
    const msTimeInDay = 24 * 60 * 60 * 1000;

    const currentDate = new Date();
    const expireDate = new Date(currentDate.getTime() + daysToExpire * msTimeInDay);
    
    const session = await insertSession(user.id, sessionData, expireDate, currentDate);

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
