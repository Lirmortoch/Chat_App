import express from 'express';
const UsersRouter = express.Router();

import {
  getUsers,
  getUser,
  signupUser,
  updateUserInfo,
  updateUserPrivileges,
  deleteUser,
} from '../controllers/usersController.js';

import userSchema from '../validation/schemas/user.schema.js';
import {
  fieldWhiteList,
  userList,
  adminList,
  checkUserPrivileges,
} from '../utils/middleware.js';
import { validator } from '../validation/utils/middleware.js';

UsersRouter.get('/', checkUserPrivileges('owner'), getUsers);
UsersRouter.get('/:public_id', getUser);
UsersRouter.post(
  '/signup',
  fieldWhiteList(userList),
  validator(userSchema),
  signupUser,
);

UsersRouter.put(
  '/:public_id',
  fieldWhiteList(userList),
  validator(userSchema),
  updateUserInfo,
);
UsersRouter.put(
  '/access/user/:public_id',
  checkUserPrivileges('med-admin', 'high-admin'),
  fieldWhiteList(adminList),
  validator(userSchema),
  updateUserPrivileges,
);

UsersRouter.delete('/:public_id', deleteUser);

export default UsersRouter;
