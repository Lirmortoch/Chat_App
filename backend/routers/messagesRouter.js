import express from 'express';
const MessagesRouter = express.Router();

import {
  getAllMessages,
  getMessage,
  getChatMsgs,
  addNewMessage,
  updateMsg,
  deleteMsg,
} from '../controllers/messagesController.js';
import messageSchema from '../validation/schemas/message.schema.js';
import {
  checkChatAccess,
  checkMessageAccess,
  fieldWhiteList,
  userList,
  checkUserPrivileges,
} from '../utils/middleware.js';
import { validator } from '../validation/utils/middleware.js';
import { uploadChatFile } from '../utils/multer.js';

MessagesRouter.get('/', checkUserPrivileges('owner'), getAllMessages);
MessagesRouter.get('/message/:message_public_id', getMessage);
MessagesRouter.get('/chat/:chat_public_id', checkChatAccess, getChatMsgs);

MessagesRouter.post(
  '/',
  uploadChatFile,
  checkChatAccess,
  fieldWhiteList(userList),
  validator(messageSchema),
  addNewMessage,
);

MessagesRouter.put(
  '/:public_id',
  uploadChatFile,
  checkChatAccess,
  checkMessageAccess,
  fieldWhiteList(userList),
  validator(messageSchema),
  updateMsg,
);

MessagesRouter.delete(
  '/message/:public_id',
  checkChatAccess,
  checkMessageAccess,
  deleteMsg,
);

export default MessagesRouter;
