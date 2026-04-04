const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const { checkUserAccess } = require('./utils/middleware');

const AuthRouter = require('./controllers/auth');
const ChatsRouter = require('./controllers/chats');
const ContactsRouter = require('./controllers/contacts');
const MessagesRouter = require('./controllers/messages');
const UsersRouter = require('./controllers/users');

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