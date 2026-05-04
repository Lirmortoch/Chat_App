import { nanoid } from 'nanoid';

import { error } from '../utils/logger.js';
import {
  getAllChats as _getAllChats, 
  getChatsByUser,
  insertChat,
  updateChat as _updateChat,
  updateChatMembers,
  deleteChat as _deleteChat,
  addNewUserToChat as _addNewUserToChat,
  deleteUserFromChat as _deleteUserFromChat,
} from '../services/chatsService.js';

const getAllChats = async (request, response) => {
  try {
    const chats = await _getAllChats();

    response.json(chats);
  } catch (err) {
    error(err);
    response.status(500).json({ message: 'Internal server error' });
  }
};
const getUserChats = async (request, response) => {
  try {
    const user_id = request.user.id;

    const chats = await getChatsByUser(user_id);

    response.json(chats);
  } catch (err) {
    error(err);
    response.status(500).json({ message: 'Internal server error' });
  }
};

const createNewChat = async (request, response) => {
  try {
    const { recipient_public_id, type, name, avatar } = request.body.fieldsData;
    const creator_id = request.user.id;

    if (!type || !name) {
      return response.status(400).json({ message: 'Missing required field' });
    }

    const chatUrl = nanoid(35);

    const insertedChat = await insertChat(
      recipient_public_id,
      type,
      name,
      avatar,
      creator_id,
      chatUrl,
    );

    const ws = request.app.get('ws');
    ws.to(recipient_public_id).emit('added_to_chat', insertedChat);
    ws.to(request.user.public_id).emit('added_to_chat', insertedChat);

    response.status(201).json(insertedChat);
  } catch (err) {
    error('Chat creation error:', err);
    const status = err.message === 'User not found' ? 404 : 500;
    response.status(status).json({ error: error.message });
  }
};

const addNewUserToChat = async (request, response) => {
  try {
    const chat_id = request.chatInternalId;
    const user_public_id = request.params.user_public_id;
    const chat_public_id = request.chat_public_id;

    const newAccess = await _addNewUserToChat(user_public_id, chat_id, chat_public_id);

    const ws = request.app.get('ws');
    ws.to(user_public_id).emit('added_to_chat', newAccess.chatData); 
    ws.to(chat_id).emit('member_joined', { user: newAccess.newMemberData });

    response.status(201).json(newAccess);
  } catch (err) {
    error(err);
    response.status(500).json({ message: 'Internal server error' });
  }
}
const deleteUserFromChat = async (request, response) => {
  try {
    const chat_id = request.chatInternalId;
    const user_public_id = request.params.user_public_id;
    const chat_public_id = request.chat_public_id;

    const newAccess = await _deleteUserFromChat(user_public_id, chat_id, chat_public_id);

    const ws = request.app.get('ws');
    ws.to(user_public_id).emit('added_to_chat', newAccess.chatData); 
    ws.to(chat_id).emit('member_joined', { user: newAccess.newMemberData });

    response.status(201).json(newAccess);
  } catch (err) {
    error(err);
    response.status(500).json({ message: 'Internal server error' });
  }
}

const updateChat = async (request, response) => {
  try {
    const { fieldsData } = request.body;
    const chat_id = request.chatInternalId;
    const fields = request.fields;

    const updatedChat = await _updateChat(fieldsData, chat_id, fields);

    response.status(201).json(updatedChat);
  } catch (err) {
    error(err);
    response.status(500).json({ message: 'Internal server error' });
  }
};
const updateChatAccess = async (request, response) => {
  try {
    const { fieldsData } = request.body;
    const cols = request.cols;

    const newAccess = await updateChatMembers(fieldsData, cols, request.user.id, request.chatInternalId);

    response.status(201).json(newAccess);
  } catch (err) {
    error(err);
    response.status(500).json({ message: 'Internal server error' });
  }
};

const deleteChat = async (request, response) => {
  try {
    const chat_id = request.chatInternalId;

    const deletedChat = await _deleteChat(chat_id);

    response.status(201).json(deletedChat);
  } catch (err) {
    error(err);
    response.status(500).json({ message: 'Internal server error' });
  }
};

export {
  getAllChats,
  getUserChats,

  createNewChat,

  addNewUserToChat,
  deleteUserFromChat,

  updateChat,
  updateChatAccess,

  deleteChat,
};
