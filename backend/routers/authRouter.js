const AuthRouter = require('express').Router();

const AuthController = require('../controllers/authController.js');
const { fieldWhiteList, userList, sessionList } = require('../utils/middleware.js');

const { validator } = require('../validation/utils/middleware.js');
const userSchema = require('../validation/schemas/user.schema.js');
const sessionSchema = require('../validation/schemas/session.schema.js');

AuthRouter.post(
  '/user/login',
  fieldWhiteList(userList),
  fieldWhiteList(sessionList),
  validator(userSchema),
  validator(sessionSchema),
  AuthController.addSession,
);
AuthRouter.delete('/user/logout', AuthController.deleteSession);

module.exports = AuthRouter;
