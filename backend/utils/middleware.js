const postgreSql = require('../db.js');

const checkUserAccess = async (request, response, next) => {
  try {
    const identifier = request.cookies.identifier;

    if (!identifier) {
      return response.status(401).json({ message: 'Authentication required' });
    }

    const [user] = await postgreSql`
      SELECT u.*, s.expired_at
      FROM chat.sessions s
      JOIN chat.users u ON s.user_id = u.id
      WHERE s.identifier = ${identifier}
    `;

    if (!user) {
      return response.status(401).json({ message: 'Session invalid' });
    }
    else if (new Date(user.expired_at) < new Date()) {
      return response.status(401).json({ message: 'Session expired' });
    }
    else if (user.restricted || user.deleted) {
      return response.status(403).json({ message: 'Account suspended' });
    }

    request.user = user;
    next();
  }
  catch (error) {
    console.error('Middleware Error:', error);
    response.status(500).json({ message: 'Internal server error during access check' });
  }
}
const checkUserPrivileges = async (request, response, next) => {
  try {
    const user_id = request.user.id;

    const [access] = await postgreSql`
      SELECT role FROM chat.users
      WHERE id = ${user_id}
        AND (deleted IS FALSE OR deleted IS NULL)
        AND (restricted IS FALSE OR restricted IS NULL)
    `;

    if (!access || access === 'user') {
      return response.status(403).json({
        message: 'Access denied: You do not have any privileges',
      });
    }

    request.userRole = access;

    next();
  }
  catch (error) {
    console.error('Middleware Error:', error);
    response.status(500).json({ message: 'Internal server error during privileges check' });
  }
} 

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
        AND (cm.restricted IS FALSE OR cm.restricted IS NULL)
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

const adminList = ['restrict_reason', 'delete_reason', 'restricted', 'deleted', 'role'];
const userList = ['name', 'message', 'email', 'phone_number', 'first_name', 'last_name', 'avatar', 'additionals', 'user_about', 'description', 'username', 'password', 'repeated_password'];

const fieldWhiteList = (list) => {
  return (request, response, next) => {
    const { fieldsData } = request.body;

    const fields = Object.keys(fieldsData);
    if (fields.length === 0) {
      return response.status(400).json({ message: "No valid fields to update or insert" });
    }

    fields.forEach(field => {
      if (!list.includes(field)) {
        return response.status(400).json({ message: 'Invalid field' });
      }
    });

    request.fields = fields;
    request.cols = fields.join(', ');

    next();
  }
}
const fieldObjectChecking = (object) => {
  for (const f in object) {
    if (f !== undefined) return false
  }

  return true;
}

module.exports = { checkUserAccess, checkUserPrivileges, checkChatAccess, checkMessageAccess, fieldWhiteList, userList, adminList, fieldObjectChecking, };