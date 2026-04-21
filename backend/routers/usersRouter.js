import express from 'express';
const UsersRouter = express.Router();

import UsersController from '../controllers/usersController.js';

import userSchema from '../validation/schemas/user.schema.js';
import {
  fieldWhiteList,
  userList,
  adminList,
  checkUserPrivileges,
} from '../utils/middleware.js';
import { validator } from '../validation/utils/middleware.js';

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
  validator(userSchema),
  UsersController.updateUserPrivileges,
);

UsersRouter.delete('/:public_id', UsersController.deleteUser);

export default UsersRouter;
