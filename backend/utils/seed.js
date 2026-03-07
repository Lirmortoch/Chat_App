const postgreSql = require('../db.js');

// Utility for generating random timestamps within a range
const randomDate = (daysAgo) => {
  const date = new Date();
  date.setSeconds(date.getSeconds() - Math.floor(Math.random() * daysAgo * 86400));
  return date;
};

async function seed() {
  try {
    console.log('🌱 Seeding process started...');

    /* ============================================================
       1. CLEANUP (ORDER IS CRITICAL DUE TO FOREIGN KEYS)
    ============================================================ */
    await postgreSql`
      TRUNCATE TABLE 
        chat.additionals, chat.user_profile_photos, chat.messages, 
        chat.chats_members, chat.contacts, chat.sessions, 
        chat.chats, chat.users 
      RESTART IDENTITY CASCADE
    `;

    /* ============================================================
       2. USERS (RETURNING ALL FIELDS FOR REFERENCE)
    ============================================================ */
    console.log('👤 Creating users...');
    const users = await postgreSql`
      INSERT INTO chat.users (name, username, password_hash, email, phone_number)
      SELECT 
        'User ' || gs, 'user_' || gs, 'hash_' || gs, 
        'user_' || gs || '@example.com', '+7900' || lpad(gs::text, 7, '0')
      FROM generate_series(1, 30) gs
      RETURNING *
    `;

    /* ============================================================
       3. CHATS
    ============================================================ */
    console.log('💬 Creating chats...');
    const chats = await postgreSql`
      INSERT INTO chat.chats (name, url, type)
      SELECT 
        CASE WHEN gs % 3 = 0 THEN 'Project Group ' || gs ELSE 'Private Chat ' || gs END,
        CASE WHEN gs % 3 = 0 THEN 'group_url_' || gs ELSE NULL END,
        CASE WHEN gs % 3 = 0 THEN 'group' ELSE 'private' END
      FROM generate_series(1, 15) gs
      RETURNING *
    `;

    /* ============================================================
       4. CHAT MEMBERS (APPLYING BUSINESS RULES)
    ============================================================ */
    console.log('👥 Populating chat members...');
    for (const chat of chats) {
      const shuffled = [...users].sort(() => 0.5 - Math.random());

      if (chat.type === 'private') {
        // Private chats must have exactly 2 members
        const pair = shuffled.slice(0, 2);
        for (const user of pair) {
          await postgreSql`INSERT INTO chat.chats_members (chat_id, user_id) VALUES (${chat.id}, ${user.id})`;
        }
      } else {
        // Group chats get a random number of members (3 to 10)
        const membersCount = Math.floor(Math.random() * 7) + 3;
        const members = shuffled.slice(0, membersCount);
        for (const user of members) {
          await postgreSql`INSERT INTO chat.chats_members (chat_id, user_id) VALUES (${chat.id}, ${user.id})`;
        }
      }
    }

    /* ============================================================
       5. MESSAGES (WITH REALISTIC TIMESTAMPS)
    ============================================================ */
    console.log('✉️ Generating message history...');
    const messageEntries = [];
    for (let i = 0; i < 300; i++) {
      const randomChat = chats[Math.floor(Math.random() * chats.length)];

      // Select a sender who is actually a member of the chosen chat
      const members =
        await postgreSql`SELECT user_id FROM chat.chats_members WHERE chat_id = ${randomChat.id}`;
      const senderId = members[Math.floor(Math.random() * members.length)].user_id;

      messageEntries.push({
        chat_id: randomChat.id,
        sender_id: senderId,
        message: `Automated message #${i}: Testing the chat infrastructure.`,
        created_at: randomDate(7), // Spread across the last 7 days
      });
    }
    const messages = await postgreSql`
      INSERT INTO chat.messages ${postgreSql(messageEntries, 'chat_id', 'sender_id', 'message', 'created_at')}
      RETURNING id
    `;

    /* ============================================================
       6. ATTACHMENTS (ADDITIONAL DATA)
    ============================================================ */
    console.log('📎 Adding media attachments...');
    const fileTypes = ['image', 'video', 'document', 'audio'];
    const extensions = {
      image: 'jpg',
      video: 'mp4',
      document: 'pdf',
      audio: 'mp3',
    };

    const attachmentEntries = Array.from({ length: 80 }).map((_, i) => {
      const type = fileTypes[Math.floor(Math.random() * fileTypes.length)];
      return {
        file_type: type,
        file_url: `https://cdn.example.com/files/file_${i}.${extensions[type]}`,
        message_id: messages[Math.floor(Math.random() * messages.length)].id,
      };
    });
    await postgreSql`INSERT INTO chat.additionals ${postgreSql(attachmentEntries, 'file_type', 'file_url', 'message_id')}`;

    /* ============================================================
       7. CONTACTS (PREVENTING SELF-ADDITION)
    ============================================================ */
    console.log('📇 Syncing contact lists...');
    for (let i = 0; i < 50; i++) {
      const owner = users[Math.floor(Math.random() * users.length)];
      const target = users[Math.floor(Math.random() * users.length)];

      if (owner.id !== target.id) {
        await postgreSql`
          INSERT INTO chat.contacts (owner_id, user_id, email, first_name, last_name)
          VALUES (${owner.id}, ${target.id}, ${target.email}, ${target.name}, 'Contact')
          ON CONFLICT DO NOTHING
        `;
      }
    }

    console.log('✅ Seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await postgreSql.end();
  }
}

module.exports = seed;
