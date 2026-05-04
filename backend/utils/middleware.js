import { getSessionData, getUserRole, getChatUserRole, getMessageOwner, isUserRestrict } from '../services/middlewareService.js';
import { error } from './logger.js';

const checkUserAccess = async (request, response, next) => {
  try {
    const identifier = request.cookies.identifier;

    if (!identifier) {
      return response.status(401).json({ message: 'Authentication required' });
    }

    const user = await getSessionData(identifier);

    if (!user) {
      return response.status(401).json({ message: 'Session invalid' });
    } else if (new Date(user.expired_at) < new Date()) {
      return response.status(401).json({ message: 'Session expired' });
    } else if (user.restricted || user.deleted) {
      return response.status(403).json({ message: 'Account suspended' });
    }

    request.user = user;
    next();
  } catch (error) {
    error('Middleware Error:', error);
    response.status(500).json({ message: 'Internal server error during access check' });
  }
};
const checkUserPrivileges = (...allowedRoles) => {
  return async (request, response, next) => {
    try {
      const user_id = request.user.id;

      const access = await getUserRole(user_id);

      if (!access) {
        return response.status(403).json({
          message: 'Access denied: You do not have any privileges',
        });
      }

      if (!allowedRoles.includes(access.role) && allowedRoles.length !== 0) {
        return response.status(403).json({
          message: 'Access denied: You do not have enough privileges',
        });
      }

      next();
    } catch (err) {
      error('Middleware Error:', err);
      response.status(500).json({ message: 'Internal server error during privileges check' });
    }
  };
};

const checkChatRestrictions = async (request, response, next) => {
  try {
    const chat_public_id = request.params.chat_public_id || request.params.public_id;
    const user_id = request.user.public_id;

    const access = await getChatUserRole(chat_public_id, user_id);

    if (!access) {
      return response.status(403).json({
        message: 'Access denied: You are not a member of this chat',
      });
    }

    next();
  } catch (err) {
    error('Middleware Error:', err);
    response.status(500).json({ message: 'Internal server error during access check' });
  }
}
const checkChatAccess = (...allowedChatRoles) => {
  return async (request, response, next) => {
    try {
      const chat_public_id = request.params.chat_public_id || request.params.public_id;
      const user_id = request.user.id;

      const access = await getChatUserRole(chat_public_id, user_id);

      if (!access) {
        return response.status(403).json({
          message: 'Access denied: You are not a member of this chat',
        });
      }

      if (!allowedChatRoles.includes(access.role) && allowedChatRoles.length !== 0) {
        return response.status(403).json({
          message: 'Access denied: You do not have enough privileges',
        });
      }

      request.chatInternalId = access.chat_id;
      request.chat_public_id = access.public_id;

      next();
    } catch (err) {
      error('Middleware Error:', err);
      response.status(500).json({ message: 'Internal server error during access check' });
    }
  };
};

const checkMessageAccess = async (request, response, next) => {
  try {
    const { message_public_id } = request.params;
    const user_id = request.user.id;

    const message = await getMessageOwner(message_public_id);

    if (!message) return response.status(404).json({ message: 'Message not found' });

    if (message.sender_id !== user_id) {
      return response.status(403).json({ message: 'Access denied' });
    }

    request.messageInternalId = message.id;
    next();
  } catch (err) {
    error('Middleware Error:', err);
    response.status(500).json({ message: 'Internal server error during access check' });
  }
};

// const errorHandler = async (request, response, next) => {};

const adminList = ['restrict_reason', 'delete_reason', 'restricted', 'deleted', 'role'];
const userList = [
  'name',
  'message',
  'email',
  'phone_number',
  'first_name',
  'last_name',
  'avatar',
  'additionals',
  'user_about',
  'description',
  'username',
  'password',
  'repeated_password',
];
const sessionList = ['ip_address', 'user_agent'];
const membershipChatList = ['chat_id', 'user_id'];

const fieldWhiteList = (list) => {
  return (request, response, next) => {
    const { fieldsData } = request.body;

    const fields = Object.keys(fieldsData);
    if (fields.length === 0) {
      return response.status(400).json({ message: 'No valid fields to update or insert' });
    }

    fields.forEach((field) => {
      if (!list.includes(field)) {
        return response.status(400).json({ message: 'Invalid field' });
      }
    });

    request.fields = fields;
    request.cols = fields.join(', ');

    next();
  };
};
const fieldObjectChecking = (object) => {
  for (const f in object) {
    if (f !== undefined) return false;
  }

  return true;
};

export {
  checkUserAccess,
  checkUserPrivileges,
  checkChatAccess,
  checkMessageAccess,
  fieldWhiteList,
  userList,
  adminList,
  fieldObjectChecking,
  sessionList,
  membershipChatList,
  checkChatRestrictions,
};
