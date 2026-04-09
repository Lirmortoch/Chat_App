const bcrypt = require('bcrypt');

const usersService = require('../services/usersService.js');
const config = require('../utils/config.js');

const getUsers = async (request, response) => {
  try {
    const users = await usersService.getAllUsers();

    response.json(users);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
};
const getUser = async (request, response) => {
  try {
    const user = await usersService.getUser(request.params.public_id);

    if (!user) {
      return response.status(404).json({ message: 'User not found' });
    }

    response.json(user);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: `Internal server error` });
  }
};

const signupUser = async (request, response) => {
  try {
    const { first_name, username, password, email, repeated_password } = request.body.fieldsData;

    if (!first_name || !username || !password || !email || !repeated_password) {
      return response.status(400).json({ message: 'Missing required field' });
    }

    const saltRounds = config.SALT_ROUNDS;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const insertedUser = await usersService.insertUser(request.body.fieldsData, password_hash);

    response.status(201).json(insertedUser);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: `Internal server error` });
  }
};

const updateUserInfo = async (request, response) => {
  try {
    const { fieldsData } = request.body;
    const user_id = request.user.id;
    const fields = request.fields;

    const updatedUser = await usersService.updateUserInfo(fieldsData, fields, user_id);

    response.status(201).json(updatedUser);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: `Internal server error` });
  }
};
const updateUserPrivileges = async (request, response) => {
  try {
    const { fieldsData } = request.body;
    const cols = request.cols;

    const newAccess = await usersService.updateUserAccess(fieldsData, cols);

    response.status(201).json(newAccess);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: `Internal server error` });
  }
};

const deleteUser = async (request, response) => {
  try {
    const user_id = request.user.id;

    const deletedUser = await usersService.deleteUser(user_id);

    response.status(201).json(deletedUser);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: `Internal server error` });
  }
};

module.exports = {
  getUsers,
  getUser,

  signupUser,

  updateUserInfo,
  updateUserPrivileges,

  deleteUser,
};
