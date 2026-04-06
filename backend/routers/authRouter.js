const AuthRouter = require('express').Router();

const AuthController = require('../controllers/authController.js')
const { fieldWhiteList, userList } = require('../utils/middleware.js');
const { validator } = require('../validation/utils/middleware.js');

AuthRouter.post('/user/login', fieldWhiteList(userList), validator(userSchema), AuthController.addSession);
AuthRouter.delete('/user/logout', AuthController.deleteSession);

module.exports = AuthRouter;