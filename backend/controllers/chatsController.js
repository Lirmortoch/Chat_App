const nanoid = require('nanoid');

const chatsService = require('../services/chatsService.js');

const getAllChats = async (request, response) => {
  try {
    const chats = await chatsService.getAllChats();

    response.json(chats);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
};
const getUserChats = async (request, response) => {
  try {
    const user_id = request.user.id;

    const chats = chatsService.getChatsByUser(user_id);

    response.json(chats);
  } catch (error) {
    console.log(error);
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

    const insertedChat = await chatsService.insertChat(
      recipient_public_id,
      type,
      name,
      avatar,
      creator_id,
      chatUrl,
    );

    response.status(201).json(insertedChat);
  } catch (error) {
    console.error('Chat creation error:', error);
    const status = error.message === 'User not found' ? 404 : 500;
    response.status(status).json({ error: error.message });
  }
};

const updateChat = async (request, response) => {
  try {
    const { fieldsData } = request.body;
    const chat_id = request.chatInternalId;
    const fields = request.fields;

    const updatedChat = await chatsService.updateChat(fieldsData, chat_id, fields);

    response.status(201).json(updatedChat);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
};
const updateChatAccess = async (request, response) => {
  try {
    const { fieldsData } = request.body;
    const cols = request.cols;

    const newAccess = await chatsService.updateChatMembers(fieldsData, cols);

    response.status(201).json(newAccess);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
};

const deleteChat = async (request, response) => {
  try {
    const chat_id = request.chatInternalId;

    const deletedChat = await chatsService.deleteChat(chat_id);

    response.status(201).json(deletedChat);
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getAllChats,
  getUserChats,

  createNewChat,

  updateChat,
  updateChatAccess,

  deleteChat,
};
