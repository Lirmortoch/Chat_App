const ContactsRouter = require('express').Router();

const contactsController = require('../controllers/contactsController.js');
const contactSchema = require('../validation/schemas/contact.schema.js');

const { fieldWhiteList, userList, checkUserPrivileges } = require('../utils/middleware.js');
const { validator } = require('../validation/utils/middleware.js');

ContactsRouter.get('/', checkUserPrivileges('owner'), contactsController.getAllContacts);
ContactsRouter.get('/:public_id', contactsController.getContact);
ContactsRouter.get('/user/:public_id', contactsController.getUserContacts);

ContactsRouter.post('/', fieldWhiteList(userList), validator(contactSchema), contactsController.addNewContact);

ContactsRouter.put('/:public_id', fieldWhiteList(userList), validator(contactSchema), contactsController.updateContactInfo);
ContactsRouter.put('/contact/avatar/:public_id', fieldWhiteList(userList), validator(contactSchema), contactsController.updateContactAvatar);

ContactsRouter.delete('/:public_id', contactsController.deleteContact);

module.exports = ContactsRouter;