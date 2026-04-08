const MessagesRouter = require('express').Router();

const messageController = require('../controllers/messagesController.js');
const messageSchema = require('../validation/schemas/message.schema.js');
const { checkChatAccess, checkMessageAccess, fieldWhiteList, userList, checkUserPrivileges } = require('../utils/middleware.js');
const { validator } = require('../validation/utils/middleware.js');

MessagesRouter.get('/', checkUserPrivileges('owner'), messageController.getAllMessages);
MessagesRouter.get('/message/:message_public_id', messageController.getMessage);
MessagesRouter.get('/chat/:chat_public_id', checkChatAccess, messageController.getChatMsgs);

MessagesRouter.post('/', checkChatAccess, fieldWhiteList(userList), validator(messageSchema), messageController.addNewMessage);

MessagesRouter.put(
  '/:public_id',
  checkChatAccess,
  checkMessageAccess,
  fieldWhiteList(userList),
  validator(messageSchema),
  messageController.updateMsg
);

MessagesRouter.delete(
  '/message/:public_id',
  checkChatAccess,
  checkMessageAccess,
  messageController.deleteMsg
);

module.exports = MessagesRouter;