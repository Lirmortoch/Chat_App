import express from 'express';
const UsersRouter = express.Router();

import {
  getUsers,
  getUser,
  signupUser,
  updateUserInfo,
  updateUserPrivileges,
  deleteUser,
  updateUserPassword,
} from '../controllers/usersController.js';

import userSchema from '../validation/schemas/user.schema.js';
import {
  fieldWhiteList,
  userList,
  adminList,
  checkUserPrivileges,
  checkUserAccess,
} from '../utils/middleware.js';
import { validator } from '../validation/utils/middleware.js';
import { uploadAvatar } from '../utils/multer.js';

UsersRouter.get('/', checkUserAccess, checkUserPrivileges('owner'), getUsers);
UsersRouter.get('/:public_id', checkUserAccess, getUser);
UsersRouter.post(
  '/signup',
  uploadAvatar,
  fieldWhiteList(userList),
  validator(userSchema),
  signupUser,
);

UsersRouter.put(
  '/:public_id', 
  uploadAvatar,
  checkUserAccess,
  fieldWhiteList(userList),
  validator(userSchema),
  updateUserInfo,
);
UsersRouter.put(
  '/password/user/:public_id',
  checkUserAccess,
  fieldWhiteList(userList),
  validator(userSchema),
  updateUserPassword,
);
UsersRouter.put(
  '/access/user/:public_id', checkUserAccess,
  checkUserPrivileges('med-admin', 'high-admin'),
  fieldWhiteList(adminList),
  validator(userSchema),
  updateUserPrivileges,
);

UsersRouter.delete('/delete_self/:public_id', checkUserAccess, deleteUser);

export default UsersRouter;
