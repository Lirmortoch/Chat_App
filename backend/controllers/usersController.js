import bcrypt from 'bcrypt';
import sharp from 'sharp';

import {
  getAllUsers,
  getUser as _getUser,
  insertUser,
  updateUserInfo as _updateUserInfo,
  updateUserAccess,
  deleteUser as _deleteUser,
} from '../services/usersService.js';
import { SALT_ROUNDS } from '../utils/config.js';
import { error } from '../utils/logger.js';
import { fieldObjectChecking } from '../utils/middleware.js';

const getUsers = async (request, response) => {
  try {
    const users = await getAllUsers();

    response.json(users);
  } catch (err) {
    error(err);
    response.status(500).json({ message: 'Internal server error' });
  }
};
const getUser = async (request, response) => {
  try {
    const user = await _getUser(request.params.public_id);

    if (!user) {
      return response.status(404).json({ message: 'User not found' });
    }

    response.json(user);
  } catch (err) {
    error(err);
    response.status(500).json({ message: `Internal szerver error` });
  }
};

const signupUser = async (request, response) => {
  try {
    const { first_name, username, password, email, repeated_password } = request.body;

    if (!first_name || !username || !password || !email || !repeated_password) {
      return response.status(400).json({ message: 'Missing required field' });
    }

    let avatar = null;
    if (fieldObjectChecking(request.file)) {
      const avatarMetadata = await sharp(request.file.path).metadata();

      avatar = {
        photo: {
          file_type: request.file.mimetype, 
          file_url: request.file.path, 
          file_name: request.file.originalname, 
          width: avatarMetadata.width, 
          height: avatarMetadata.height,
        },
        is_main: Boolean(request.body.avatar_is_main),
      }
    }

    const saltRounds = Number.parseInt(SALT_ROUNDS);
    const password_hash = await bcrypt.hash(password, saltRounds);

    const insertedUser = await insertUser(request.body, avatar, password_hash);

    response.status(201).json(insertedUser);
  } catch (err) {
    error(err);
    response.status(500).json({ message: `Internal server error` });
  }
};

const updateUserInfo = async (request, response) => {
  try {
    const { fieldsData } = request.body;
    const user_id = request.user.id;
    const fields = request.fields;

    const updatedUser = await _updateUserInfo(fieldsData, fields, user_id);

    const ws = request.app.get('ws');
    ws.emit('user_updated', {
      public_id: request.user.public_id,
      updatedUser
    });

    response.status(201).json(updatedUser);
  } catch (err) {
    error(err);
    response.status(500).json({ message: `Internal server error` });
  }
};
const updateUserPrivileges = async (request, response) => {
  try {
    const { fieldsData } = request.body;
    const cols = request.cols;

    const newAccess = await updateUserAccess(fieldsData, cols);

    response.status(201).json(newAccess);
  } catch (err) {
    error(err);
    response.status(500).json({ message: `Internal server error` });
  }
};

const deleteUser = async (request, response) => {
  try {
    const user_id = request.user.id;

    const deletedUser = await _deleteUser(user_id);

    response.status(201).json(deletedUser);
  } catch (err) {
    error(err);
    response.status(500).json({ message: `Internal server error` });
  }
};

export {
  getUsers,
  getUser,

  signupUser,

  updateUserInfo,
  updateUserPrivileges,

  deleteUser,
};
