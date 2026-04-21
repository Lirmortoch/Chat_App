import cookie from 'cookie';

import middlewareService from '../../services/middlewareService.js';
import logger from '../../utils/logger.js';

const checkSocketUserAccess = async (socket, next) => {
  try {
    const headerCookie = socket.handshake.headers.cookie;
    if (!headerCookie) {
      return new Error({ type: 'auth-error', message: 'Authentication error: No cookies found' });
    }

    const cookies = cookie.parse(headerCookie);
    const identifier = cookies.identifier;

    if (!identifier) {
      return new Error('Authentication error: No identifier');
    }

    const user = await middlewareService.getSessionData(identifier);

    if (!user) {
      return new Error({ type: 'auth-error', message: 'Authentication error: Session invalid' });
    } else if (new Date(user.expired_at) > new Date()) {
      return new Error({ type: 'auth-error', message: 'Authentication error: Session expired' });
    } else if (user.restricted || user.deleted) {
      return new Error({ type: 'auth-error', message: 'Authentication error: Account suspended' });
    }

    socket.user = user;
    next();
  } catch (err) {
    logger.error('Socket Auth Error:', err);
    return new Error({ type: 'server-error', message: `Internal server error: ${err}` });
  }
};

export default {
  checkSocketUserAccess,
};
