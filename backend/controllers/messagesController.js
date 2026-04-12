const msgService = require('../services/messagesService.js');

const getAllMessages = async (request, response) => {
  try {
    const messages = await msgService.getAllMessages();

    response.json(messages);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
};
const getMessage = async (request, response) => {
  try {
    const message = await msgService.getMsg(request.params.message_public_id);

    if (!message) {
      response.status(404).json({ message: 'Message not found' });
    }

    response.json(message);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
};
const getChatMsgs = async (request, response) => {
  try {
    const chat_id = request.chatInternalId;
    const user_id = request.user.id;

    const messages = await msgService.getChatMessages(user_id, chat_id);

    response.json(messages);
  } catch (error) {
    response.status(500).json({ error: 'Failed to fetch messages' });
  }
};

const addNewMessage = async (request, response) => {
  try {
    const { message, additionals } = request.body.fieldsData;
    const chat_id = request.chatInternalId;
    const sender_id = request.user.id;

    if (message === undefined || (message === '' && additionals.length === 0)) {
      return response.status(400).json({ message: 'Missing required field' });
    }

    const insertedMessage = await msgService.insertMsg(message, additionals, chat_id, sender_id);

    const ws = request.app.get('ws');
    ws.to({chat_id, newMessage: insertedMessage}).emit('new_message');

    response.status(201).json(insertedMessage);
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: 'Internal server error' });
  }
};

const updateMsg = async (request, response) => {
  try {
    const { fieldsData } = request.body;
    const fields = request.fields;
    const messageInternalId = request.messageInternalId;

    const updatedMessage = await msgService.updateMessage(fieldsData, fields, messageInternalId);

    response.status(201).json(updatedMessage);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
};

const deleteMsg = async (request, response) => {
  try {
    const messageInternalId = request.messageInternalId;

    const [deletedMessage] = await msgService.deleteMessage(messageInternalId);

    response.status(201).json(deletedMessage);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getAllMessages,
  getMessage,
  getChatMsgs,

  addNewMessage,

  updateMsg,

  deleteMsg,
};
