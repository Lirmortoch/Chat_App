import express from 'express';
const MessagesRouter = express.Router();

import messageController from '../controllers/messagesController.js';
import messageSchema from '../validation/schemas/message.schema.js';
import {
  checkChatAccess,
  checkMessageAccess,
  fieldWhiteList,
  userList,
  checkUserPrivileges,
} from '../utils/middleware.js';
import { validator } from '../validation/utils/middleware.js';

MessagesRouter.get('/', checkUserPrivileges('owner'), messageController.getAllMessages);
MessagesRouter.get('/message/:message_public_id', messageController.getMessage);
MessagesRouter.get('/chat/:chat_public_id', checkChatAccess, messageController.getChatMsgs);

MessagesRouter.post(
  '/',
  checkChatAccess,
  fieldWhiteList(userList),
  validator(messageSchema),
  messageController.addNewMessage,
);

MessagesRouter.put(
  '/:public_id',
  checkChatAccess,
  checkMessageAccess,
  fieldWhiteList(userList),
  validator(messageSchema),
  messageController.updateMsg,
);

MessagesRouter.delete(
  '/message/:public_id',
  checkChatAccess,
  checkMessageAccess,
  messageController.deleteMsg,
);

export default MessagesRouter;
