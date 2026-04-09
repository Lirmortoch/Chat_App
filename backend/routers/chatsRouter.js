const ChatsRouter = require('express').Router();

const chatSchema = require('../validation/schemas/chat.schema.js');
const {
  checkChatAccess,
  fieldWhiteList,
  userList,
  adminList,
  checkUserPrivileges,
} = require('../utils/middleware.js');
const { validator } = require('../validation/utils/middleware.js');

ChatsRouter.get('/', checkUserPrivileges('owner'));
// ChatsRouter.get('/chat/:public_id', checkChatAccess, async (request, response) => {
//   if (request.userRoleInChat === 'undefined') {
//     return response.status(403).json({ message: 'Only users with access can see this chat' });
//   }

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
ChatsRouter.get('/user/:public_id', checkChatAccess());

ChatsRouter.post('/', fieldWhiteList(userList), validator(chatSchema));

ChatsRouter.put(
  '/:public_id',
  checkChatAccess('owner', 'high-admin'),
  fieldWhiteList(userList),
  validator(chatSchema),
);
ChatsRouter.put(
  '/permissions/chat/:public_id',
  checkChatAccess('owner'),
  fieldWhiteList(adminList),
  validator(chatSchema),
);

ChatsRouter.delete('/:public_id', checkChatAccess('owner'));

module.exports = ChatsRouter;
