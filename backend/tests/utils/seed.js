const postgres = require('../../db.js');

async function seed() {
  console.log('🌱 Начинаем сидирование базы данных...');

  try {
    console.log('🧹 Очистка старых данных...');
    await postgres`
      TRUNCATE TABLE chat.photos, chat.users, chat.chats, chat.contacts CASCADE
    `;

    console.log('📸 Добавляем фотографии...');
    const photosData = [
      { file_url: '/public/imgs/user1.jpg', file_type: 'image/jpeg', file_name: 'user1.jpg', width: 800, height: 800 },
      { file_url: '/public/imgs/user2.jpg', file_type: 'image/jpeg', file_name: 'user2.jpg', width: 800, height: 800 },
      { file_url: '/public/imgs/group.jpg', file_type: 'image/jpeg', file_name: 'group.jpg', width: 1024, height: 1024 },
    ];
    const photos = await postgres`
      INSERT INTO chat.photos ${postgres(photosData, 'file_url', 'file_type', 'file_name', 'width', 'height')}
      RETURNING id, public_id
    `;

    console.log('👤 Добавляем пользователей...');
    const usersData = [
      { first_name: 'Иван', last_name: 'Иванов', username: 'ivanov', password_hash: 'dummy_hash_1', email: 'ivan@example.com', phone_number: '+1234567890' },
      { first_name: 'Анна', last_name: 'Смирнова', username: 'anna_s', password_hash: 'dummy_hash_2', email: 'anna@example.com', phone_number: '+0987654321' }
    ];
    const users = await postgres`
      INSERT INTO chat.users ${postgres(usersData, 'first_name', 'last_name', 'username', 'password_hash', 'email', 'phone_number')}
      RETURNING id, public_id, username
    `;

    console.log('🖼️ Привязываем аватарки к профилям...');
    const userProfilePhotosData = [
      { user_id: users[0].id, photo_id: photos[0].public_id, is_main: true },
      { user_id: users[1].id, photo_id: photos[1].public_id, is_main: true }
    ];
    await postgres`
      INSERT INTO chat.user_profile_photos ${postgres(userProfilePhotosData, 'user_id', 'photo_id', 'is_main')}
    `;

    console.log('💬 Создаем чаты...');
    const chatsData = [
      { name: 'Приватный чат', type: 'private', description: 'Личная переписка' }, // Без фото
      { name: 'Рабочая группа', type: 'group', description: 'Обсуждение проекта', photo_id: photos[2].public_id }
    ];
    const chats = await postgres`
      INSERT INTO chat.chats ${postgres(chatsData, 'name', 'type', 'description', 'photo_id')}
      RETURNING id
    `;

    console.log('🤝 Добавляем участников в чаты...');
    const membersData = [
      { chat_id: chats[0].id, user_id: users[0].id, role: 'user' },
      { chat_id: chats[0].id, user_id: users[1].id, role: 'user' },

      { chat_id: chats[1].id, user_id: users[0].id, role: 'admin' },
      { chat_id: chats[1].id, user_id: users[1].id, role: 'user' }
    ];
    await postgres`
      INSERT INTO chat.chats_members ${postgres(membersData, 'chat_id', 'user_id', 'role')}
    `;

    console.log('✉️ Создаем сообщения...');
    const messagesData = [
      { chat_id: chats[0].id, sender_id: users[0].id, message: 'Привет, Анна!' },
      { chat_id: chats[0].id, sender_id: users[1].id, message: 'Привет, Иван! Как дела?' },
      { chat_id: chats[1].id, sender_id: users[0].id, message: 'Коллеги, начинаем работу над проектом.' }
    ];
    const messages = await postgres`
      INSERT INTO chat.messages ${postgres(messagesData, 'chat_id', 'sender_id', 'message')}
      RETURNING id
    `;

    console.log('🔑 Генерируем активную сессию...');
    await postgres`
      INSERT INTO chat.sessions (user_id, expired_at, last_seen_at, ip_address, user_agent, identifier)
      VALUES (
        ${users[0].id}, 
        NOW() + INTERVAL '2 days', 
        NOW(), 
        '127.0.0.1', 
        'Mozilla/5.0 (Seed Data)', 
        uuidv7()
      )
    `;

    console.log('✅ Сидирование успешно завершено!');
  } catch (err) {
    console.error('❌ Ошибка при сидировании:', err);
  } finally {
    await postgres.end();
  }
}

module.exports = seed;