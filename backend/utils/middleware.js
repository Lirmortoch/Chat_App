const postgreSql = require('../db.js');

const checkChatAccess = async (request, response, next) => {
  try {
    const chat_public_id = request.params.chat_public_id || request.params.public_id;
    const user_id = request.user.id;

    const [access] = await postgreSql`
      SELECT cm.chat_id, cm.role
      FROM chat.chats_members cm
      JOIN chat.chats c ON cm.chat_id = c.id
      WHERE c.public_id = ${chat_public_id} 
        AND cm.user_id = ${user_id}
        AND (cm.deleted IS FALSE OR cm.deleted IS NULL)
    `;

    if (!access) {
      return response.status(403).json({
        message: 'Access denied: You are not a member of this chat',
      });
    }

    request.chatInternalId = access.chat_id;
    request.userRoleInChat = access.role;

    next();
  } catch (error) {
    console.error('Middleware Error:', error);
    response.status(500).json({ message: 'Internal server error during access check' });
  }
};

const checkMessageAccess = async (request, response, next) => {
  try {
    const { message_public_id } = request.params;
    const user_id = request.user.id;

    const [message] = await postgreSql`
      SELECT public_id, sender_id
      FROM chat.messages msg
      WHERE msg.public_id = ${message_public_id}
    `;

    if (!message) return response.status(404).json({ message: 'Message not found' });

    if (message.sender_id !== user_id) {
      return response.status(403).json({ message: 'Access denied' });
    }

    request.messageInternalId = message.id;
    next();
  } catch (error) {
    console.error('Middleware Error:', error);
    response.status(500).json({ message: 'Internal server error during access check' });
  }
};

const fieldWhiteList = (request, response, next) => {
  const list = ['name', 'message', 'email', 'phone_number', 'first_name', 'last_name', 'avatar'];

  const field = request.body;

  if (!list.includes(field)) {
    response.status(403).json({ message: 'Wrong field' });
  }

  next();
};

module.exports = { checkChatAccess, checkMessageAccess, fieldWhiteList };
