import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import { checkUserAccess } from './utils/middleware.js';

import AuthRouter from './routers/authRouter.js';
import ChatsRouter from './routers/chatsRouter.js';
import ContactsRouter from './routers/contactsRouter.js';
import MessagesRouter from './routers/messagesRouter.js';
import UsersRouter from './routers/usersRouter.js';

const app = express();

app.use(helmet());
app.use(cookieParser());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 25,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  ipv6Subnet: 60,
});
app.use('/api/', limiter);

app.use('/api/auth', AuthRouter);

app.use('/api/marazam/', checkUserAccess);
app.use('/api/marazam/chats', ChatsRouter);
app.use('/api/marazam/contacts', ContactsRouter);
app.use('/api/marazam/messages', MessagesRouter);
app.use('/api/marazam/users', UsersRouter);

export default app;