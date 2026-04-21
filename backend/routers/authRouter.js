import express from 'express';
const AuthRouter = express.Router();

import AuthController from '../controllers/authController.js';
import { fieldWhiteList, userList, sessionList } from '../utils/middleware.js';

import { validator } from '../validation/utils/middleware.js';
import userSchema from '../validation/schemas/user.schema.js';
import sessionSchema from '../validation/schemas/session.schema.js';

AuthRouter.post(
  '/user/login',
  fieldWhiteList(userList),
  fieldWhiteList(sessionList),
  validator(userSchema),
  validator(sessionSchema),
  AuthController.addSession,
);
AuthRouter.delete('/user/logout', AuthController.deleteSession);

export default AuthRouter;
