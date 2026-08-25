import express from 'express';
const ChatsRouter = express.Router();

import {
  getAllChats,
  getPrivateChat,
  getPublicChat,
  getUserChats,
  createNewChat,
  updateChat,
  updateChatAccess,
  deleteChat,
  addNewUserToChat,
  deleteUserFromChat,
  updatedReadMessages,
} from '../controllers/chatsController.js';

import chatSchema from '../validation/schemas/chat.schema.js';
import {
  checkChatAccess,
  fieldWhiteList,
  userList,
  adminList,
  checkUserPrivileges,
  membershipChatList,
  checkChatRestrictions,
} from '../utils/middleware.js';
import { validator } from '../validation/utils/middleware.js';
import { uploadAvatar } from '../utils/multer.js';

ChatsRouter.get('/', checkUserPrivileges('owner'), getAllChats);
ChatsRouter.get('/private/:public_id', checkChatAccess(), getPrivateChat);
ChatsRouter.get('/public/:public_id', getPublicChat);
ChatsRouter.get('/user/:public_id', getUserChats);

ChatsRouter.post(
  '/',
  uploadAvatar,
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
  '/chat/read/:public_id',
  checkChatAccess('user'),
  fieldWhiteList(userList),
  validator(chatSchema),
  updatedReadMessages
);

ChatsRouter.post(
  '/membership/chat/:public_id',
  checkChatRestrictions,
  fieldWhiteList(membershipChatList),
  validator(chatSchema),
  addNewUserToChat,
);
ChatsRouter.delete(
  '/membership/chat/:public_id',
  checkChatRestrictions,
  fieldWhiteList(membershipChatList),
  validator(chatSchema),
  deleteUserFromChat,
);

ChatsRouter.post(
  '/membership/chat/private/:public_id',
  checkChatAccess('owner', 'high-admin', 'med-admin'),
  fieldWhiteList(membershipChatList),
  validator(chatSchema),
  addNewUserToChat,
);
ChatsRouter.delete(
  '/membership/chat/private/:public_id',
  checkChatAccess('owner', 'high-admin', 'med-admin'),
  fieldWhiteList(membershipChatList),
  validator(chatSchema),
  deleteUserFromChat,
);

ChatsRouter.delete('/:public_id', checkChatAccess('owner'), deleteChat);

export default ChatsRouter;
