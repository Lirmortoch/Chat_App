const ChatsRouter = require('express').Router();

const chatsController = require('../controllers/chatsController.js');

const chatSchema = require('../validation/schemas/chat.schema.js');
const {
  checkChatAccess,
  fieldWhiteList,
  userList,
  adminList,
  checkUserPrivileges,
  membershipChatList,
} = require('../utils/middleware.js');
const { validator } = require('../validation/utils/middleware.js');

ChatsRouter.get('/', checkUserPrivileges('owner'), chatsController.getAllChats);
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
ChatsRouter.get('/user/:public_id', checkChatAccess(), chatsController.getUserChats);

ChatsRouter.post(
  '/',
  fieldWhiteList(userList),
  validator(chatSchema),
  chatsController.createNewChat,
);

ChatsRouter.put(
  '/:public_id',
  checkChatAccess('owner', 'high-admin'),
  fieldWhiteList(userList),
  validator(chatSchema),
  chatsController.updateChat,
);
ChatsRouter.put(
  '/permissions/private_chat/:public_id',
  checkChatAccess('owner', 'high-admin', 'med-admin'),
  fieldWhiteList(adminList),
  validator(chatSchema),
  chatsController.updateChatAccess,
);
ChatsRouter.put(
  '/membership/chat/:public_id',
  checkChatAccess(),
  fieldWhiteList(membershipChatList),
  validator(chatSchema),
  chatsController.updateChatAccess,
);

ChatsRouter.delete('/:public_id', checkChatAccess('owner'), chatsController.deleteChat);

module.exports = ChatsRouter;
