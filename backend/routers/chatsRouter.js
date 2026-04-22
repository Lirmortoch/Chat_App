import express from 'express';
const ChatsRouter = express.Router();

import {
  getAllChats,
  getUserChats,
  createNewChat,
  updateChat,
  updateChatAccess,
  deleteChat,
} from '../controllers/chatsController.js';

import chatSchema from '../validation/schemas/chat.schema.js';
import {
  checkChatAccess,
  fieldWhiteList,
  userList,
  adminList,
  checkUserPrivileges,
  membershipChatList,
} from '../utils/middleware.js';
import { validator } from '../validation/utils/middleware.js';

ChatsRouter.get('/', checkUserPrivileges('owner'), getAllChats);
// ChatsRouter.get('/chat/:public_id', checkChatAccess(), async (request, response) => {
//   try {
//     const chat_id = request.chatInternalId;
//     const user_id = request.user.id;

//     if (!chat) {
//       return response.status(404).json({ message: 'Message not found' });
//     }

//     response.json(chat);
//   } catch (error) {
//     console.log(error);
//     response.status(500).json({ message: 'Internal server error' });
//   }
// });
ChatsRouter.get('/user/:public_id', checkChatAccess(), getUserChats);

ChatsRouter.post(
  '/',
  fieldWhiteList(userList),
  validator(chatSchema),
  createNewChat,
);

ChatsRouter.put(
  '/:public_id',
  checkChatAccess('owner', 'high-admin'),
  fieldWhiteList(userList),
  validator(chatSchema),
  updateChat,
);
ChatsRouter.put(
  '/permissions/private_chat/:public_id',
  checkChatAccess('owner', 'high-admin', 'med-admin'),
  fieldWhiteList(adminList),
  validator(chatSchema),
  updateChatAccess,
);
ChatsRouter.put(
  '/membership/chat/:public_id',
  checkChatAccess(),
  fieldWhiteList(membershipChatList),
  validator(chatSchema),
  updateChatAccess,
);

ChatsRouter.delete('/:public_id', checkChatAccess('owner'), deleteChat);

export default ChatsRouter;
