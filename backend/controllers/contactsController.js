const contactsService  = require('../services/contactsService.js');

const getAllContacts = async (request, response) => {
  try {
    const contacts = await contactsService.getAllContacts();

    response.json(contacts);
  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
}
const getContact = async (request, response) => {
  try {
    const contact = await contactsService.getContact(request.params.public_id);

    if (!contact) {
      return response.status(404).json({ message: 'Contact not found' });
    }

    response.json(contact);
  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
}
const getUserContacts = async (request, response) => {
  try {
    const user_id = request.user.id;

    const contacts = await contactsService.getUsersContacts(user_id);

    if (!contacts) {
      return response.status(404).json({ message: 'Contacts not found' });
    }

    response.json(contacts);
  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
}

const addNewContact = async (request, response) => {
  try {
    const { first_name, email, user_public_id } = request.body.fieldsData;
    const ownerId = request.user.id;

    if (!first_name || !email || !user_public_id) {
      return response.status(400).json({ message: "Missing required field" });
    }

    const insertedContact = await contactsService.insertContact(request.body.fieldsData, ownerId);

    response.status(201).json(insertedContact);
  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
}

const updateContactInfo = async (request, response) => {
  try {
    const { fieldsData } = request.body;
    const fields = request.fields;

    const cols = fields.filter(f => f !== 'avatar').join(', ');
    const updatedContact = await contactsService.updateContactInfo(fieldsData, cols);
    
    response.status(201).json(updatedContact);
  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
}
const updateContactAvatar = async (request, response) => {
  try {
    const { avatar, contact_public_id } = request.body;

    const updatedAvatar = await contactsService.updateContactAvatar(avatar, contact_public_id);

    response.status(201).json(updatedAvatar);
  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
}

const deleteContact = async (request, response) => {
  try {
    const deletedContact = await contactsService.deleteContact(request.params.public_id);

    response.status(201).json(deletedContact);
  }
  catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  getAllContacts,
  getContact,
  getUserContacts,

  addNewContact,

  updateContactInfo,
  updateContactAvatar,

  deleteContact,
}