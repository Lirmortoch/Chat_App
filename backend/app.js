const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const { checkUserAccess } = require('./utils/middleware');

const AuthRouter = require('./routers/authRouter');
const ChatsRouter = require('./routers/chatsRouter');
const ContactsRouter = require('./routers/contactsRouter');
const MessagesRouter = require('./routers/messagesRouter');
const UsersRouter = require('./routers/usersRouter');

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

module.exports = app;
