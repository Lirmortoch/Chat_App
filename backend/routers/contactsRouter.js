import express from 'express';
const ContactsRouter = express.Router();

import {
  getAllContacts,
  getContact,
  getUserContacts,
  addNewContact,
  updateContactInfo,
  updateContactAvatar,
  deleteContact,
} from '../controllers/contactsController.js';
import contactSchema from '../validation/schemas/contact.schema.js';

import { fieldWhiteList, userList, checkUserPrivileges } from '../utils/middleware.js';
import { validator } from '../validation/utils/middleware.js';

ContactsRouter.get('/', checkUserPrivileges('owner'), getAllContacts);
ContactsRouter.get('/:public_id', getContact);
ContactsRouter.get('/user/:public_id', getUserContacts);

ContactsRouter.post(
  '/',
  fieldWhiteList(userList),
  validator(contactSchema),
  addNewContact,
);

ContactsRouter.put(
  '/:public_id',
  fieldWhiteList(userList),
  validator(contactSchema),
  updateContactInfo,
);
ContactsRouter.put(
  '/contact/avatar/:public_id',
  fieldWhiteList(userList),
  validator(contactSchema),
  updateContactAvatar,
);

ContactsRouter.delete('/:public_id', deleteContact);

export default ContactsRouter;
