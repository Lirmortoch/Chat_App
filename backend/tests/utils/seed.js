import nanoid from 'nanoid';

import postgreSql from '../../db.js';
import logger from '../../utils/logger.js';

async function seed() {
  logger.info('🌱 Seeding process started...');

  try {
    logger.info('🧹 Cleanup old data...');
    await postgreSql`
      TRUNCATE TABLE chat.photos, chat.users, chat.chats, chat.contacts CASCADE
    `;

    logger.info('📸 adding photos...');
    const photosData = [
      { file_url: '../tests/public/imgs/user1.jpg', file_type: 'image/jpeg', file_name: 'user1.jpg', width: 800, height: 800 },
      { file_url: '../tests/public/imgs/user2.jpg', file_type: 'image/jpeg', file_name: 'user2.jpg', width: 800, height: 800 },
      { file_url: '../tests/public/imgs/group.jpg', file_type: 'image/jpeg', file_name: 'group.jpg', width: 1024, height: 1024 },
    ];
    const photos = await postgreSql`
      INSERT INTO chat.photos ${postgreSql(photosData, 'file_url', 'file_type', 'file_name', 'width', 'height')}
      RETURNING id, public_id
    `;

    logger.info('👤 adding users...');
    const usersData = [
      { first_name: 'Иван', last_name: 'Иванов', username: 'ivanov', password_hash: 'dummy_hash_1', email: 'ivan@example.com', phone_number: '+1234567890', role: 'owner' },
      { first_name: 'Анна', last_name: 'Смирнова', username: 'anna_s', password_hash: 'dummy_hash_2', email: 'anna@example.com', phone_number: '+0987654321' }
    ];
    const users = await postgreSql`
      INSERT INTO chat.users ${postgreSql(usersData, 'first_name', 'last_name', 'username', 'password_hash', 'email', 'phone_number')}
      RETURNING id, public_id, username
    `;

    logger.info('🖼️ linking avatars to users...');
    const userProfilePhotosData = [
      { user_id: users[0].id, photo_id: photos[0].public_id, is_main: true },
      { user_id: users[1].id, photo_id: photos[1].public_id, is_main: true },
    ];
    await postgreSql`
      INSERT INTO chat.user_profile_photos ${postgreSql(userProfilePhotosData, 'user_id', 'photo_id', 'is_main')}
    `;

    logger.info('💬 adding chats...');
    const chatUrl1 = nanoid(65);
    const chatUrl2 = nanoid(65);

    const chatsData = [
      { name: 'Private chat', type: 'private-chat', description: '', photo_id: null, url: chatUrl1 }, // without photo
      { name: 'Work group', type: 'private-group', description: 'Обсуждение проекта', photo_id: photos[2].public_id, url: chatUrl2 }
    ];
    const chats = await postgreSql`
      INSERT INTO chat.chats ${postgreSql(chatsData, 'name', 'type', 'description', 'photo_id', 'url')}
      RETURNING id
    `;

    logger.info('🤝 Adding chat participants...');
    const membersData = [
      { chat_id: chats[0].id, user_id: users[0].id, role: 'owner' },
      { chat_id: chats[0].id, user_id: users[1].id, role: 'owner' },

      { chat_id: chats[1].id, user_id: users[0].id, role: 'owner' },
      { chat_id: chats[1].id, user_id: users[1].id, role: 'user' }
    ];
    await postgreSql`
      INSERT INTO chat.chats_members ${postgreSql(membersData, 'chat_id', 'user_id', 'role')}
    `;

    logger.info('✉️ Creating messages...');
    const messagesData = [
      { chat_id: chats[0].id, sender_id: users[0].id, message: 'Привет, Анна!' },
      { chat_id: chats[0].id, sender_id: users[1].id, message: 'Привет, Иван! Как дела?' },
      { chat_id: chats[1].id, sender_id: users[0].id, message: 'Коллеги, начинаем работу над проектом.' }
    ];
    await postgreSql`
      INSERT INTO chat.messages ${postgreSql(messagesData, 'chat_id', 'sender_id', 'message')}
      RETURNING id
    `;

    logger.info('🔑 creating active session..');
    const [session] = await postgreSql`
      INSERT INTO chat.sessions (user_id, expired_at, last_seen_at, ip_address, user_agent, identifier)
      VALUES (
        ${users[0].id}, 
        NOW() + INTERVAL '2 days', 
        NOW(), 
        '127.0.0.1', 
        'Mozilla/5.0 (Seed Data)', 
        uuidv7()
      )
      RETURNING identifier
    `;

    logger.info('✅ Seeding process was successfully end!');

    return session;
  } catch (err) {
    logger.error('❌ Seeding error:', err);
  }
}

export default seed;