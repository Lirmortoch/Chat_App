const UsersRouter = require('express').Router();

const UsersController = require('../controllers/usersController.js');

const userSchema = require('../validation/schemas/user.schema.js');
const {
  fieldWhiteList,
  userList,
  adminList,
  checkUserPrivileges,
} = require('../utils/middleware.js');
const { validator } = require('../validation/utils/middleware.js');

UsersRouter.get('/', checkUserPrivileges('owner'), UsersController.getUsers);
UsersRouter.get('/:public_id', UsersController.getUser);
UsersRouter.post(
  '/signup',
  fieldWhiteList(userList),
  validator(userSchema),
  UsersController.signupUser,
);

UsersRouter.put(
  '/:public_id',
  fieldWhiteList(userList),
  validator(userSchema),
  UsersController.updateUserInfo,
);
UsersRouter.put(
  '/access/user/:public_id',
  checkUserPrivileges('med-admin', 'high-admin'),
  fieldWhiteList(adminList),
  validator(chatSchema),
  UsersController.updateUserPrivileges,
);

UsersRouter.delete('/:public_id', UsersController.deleteUser);

module.exports = UsersRouter;
