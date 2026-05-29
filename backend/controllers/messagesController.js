import {
  getAllMessages as _getAllMessages,
  getMsg,
  getChatMessages,
  insertMsg,
  updateMessage as _updateMessage,
  deleteMessage,
} from '../services/messagesService.js';
import { error } from '../utils/logger.js';

const getAllMessages = async (request, response) => {
  try {
    const messages = await _getAllMessages();

    response.json(messages);
  } catch (err) {
    error(err);
    response.status(500).json({ message: 'Internal server error' });
  }
};
const getMessage = async (request, response) => {
  try {
    const message = await getMsg(request.params.public_id);

    if (!message) {
      response.status(404).json({ message: 'Message not found' });
    }

    response.json(message);
  } catch (err) {
    error(err);
    response.status(500).json({ message: 'Internal server error' });
  }
};
const getChatMsgs = async (request, response) => {
  try {
    const chat_id = request.chatInternalId;
    const user_id = request.user.id;

    const messages = await getChatMessages(user_id, chat_id);

    response.json(messages);
  } catch (err) {
    error(err);
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

    const insertedMessage = await insertMsg(message, additionals, chat_id, sender_id);

    const ws = request.app.get('ws');
    ws.to(chat_id).emit('message_received', insertedMessage);

    response.status(201).json(insertedMessage);
  } catch (err) {
    console.error(err);
    response.status(500).json({ message: 'Internal server error' });
  }
};

const updateMsg = async (request, response) => {
  try {
    const { fieldsData } = request.body;
    const fields = request.fields;
    const messageInternalId = request.messageInternalId;
    const chat_id = request.chatInternalId;

    const updatedMessage = await _updateMessage(fieldsData, fields, messageInternalId);

    const ws = request.app.get('ws');
    ws.to(chat_id).emit('message_edited', { 
      message_id: messageInternalId, 
      new_text: updatedMessage.message, 
      edited_at: updateMsg.edited_at,
      additionals: updatedMessage.updatedAdditionals === undefined ? null : updatedMessage.updatedAdditionals,
    });

    response.status(201).json(updatedMessage);
  } catch (err) {
    error(err);
    response.status(500).json({ message: 'Internal server error' });
  }
};

const deleteMsg = async (request, response) => {
  try {
    const messageInternalId = request.messageInternalId;
    const chat_id = request.chatInternalId;

    const [deletedMessage] = await deleteMessage(messageInternalId);

    const ws = request.app.get('ws');
    ws.to(chat_id).emit('message_deleted', { message_id: messageInternalId });

    response.status(201).json(deletedMessage);
  } catch (err) {
    error(err);
    response.status(500).json({ message: 'Internal server error' });
  }
};

export {
  getAllMessages,
  getMessage,
  getChatMsgs,

  addNewMessage,

  updateMsg,

  deleteMsg,
};
