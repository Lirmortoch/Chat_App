import express from 'express';
const ContactsRouter = express.Router();

import contactsController from '../controllers/contactsController.js';
import contactSchema from '../validation/schemas/contact.schema.js';

import { fieldWhiteList, userList, checkUserPrivileges } from '../utils/middleware.js';
import { validator } from '../validation/utils/middleware.js';

ContactsRouter.get('/', checkUserPrivileges('owner'), contactsController.getAllContacts);
ContactsRouter.get('/:public_id', contactsController.getContact);
ContactsRouter.get('/user/:public_id', contactsController.getUserContacts);

ContactsRouter.post(
  '/',
  fieldWhiteList(userList),
  validator(contactSchema),
  contactsController.addNewContact,
);

ContactsRouter.put(
  '/:public_id',
  fieldWhiteList(userList),
  validator(contactSchema),
  contactsController.updateContactInfo,
);
ContactsRouter.put(
  '/contact/avatar/:public_id',
  fieldWhiteList(userList),
  validator(contactSchema),
  contactsController.updateContactAvatar,
);

ContactsRouter.delete('/:public_id', contactsController.deleteContact);

export default ContactsRouter;
