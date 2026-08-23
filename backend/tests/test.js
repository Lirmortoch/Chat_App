/* eslint-disable no-unused-vars */
import assert from 'node:assert';
import { test, after, beforeEach, describe, before } from 'node:test';
import supertest from 'supertest';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

import app from '../app.js';
import { info } from '../utils/logger.js';
import seed from './utils/seed.js';
import postgreSql from '../db.js';

const api = supertest(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('test backend', () => {
  let session = null;
  let testData = null;

  before(async () => {
    const data = await seed();
    
    session = data.session;
    
    testData = {
      users: data.users,
      chats: data.chats,
      messages: data.messages,
      photos: data.photos,
      userPhotos: data.userPhotos,
      contacts: data.contacts,
    };
  });

  describe('when there is initially has some data saved', () => {
    test('users are returned as json', async () => {
      await api
        .get('/api/marazam/users')
        .set('Cookie', [
          `identifier=${session.identifier}`
        ])
        .expect(200)
        .expect('Content-Type', /application\/json/);
    });
    test('messages are returned as json', async () => {
      await api
        .get('/api/marazam/messages')
        .set('Cookie', [
          `identifier=${session.identifier}`
        ])
        .expect(200)
        .expect('Content-Type', /application\/json/);
    });
    test('chats are returned as json', async () => {
      await api
        .get('/api/marazam/chats')
        .set('Cookie', [
          `identifier=${session.identifier}`
        ])
        .expect(200)
        .expect('Content-Type', /application\/json/);
    });
    test('contacts are returned as json', async () => {
      await api
        .get('/api/marazam/contacts')
        .set('Cookie', [
          `identifier=${session.identifier}`
        ])
        .expect(200)
        .expect('Content-Type', /application\/json/);
    });

    test('all users returned', async () => {
      const response = await api
        .get('/api/marazam/users')
        .set('Cookie', [
          `identifier=${session.identifier}`
        ]);
     
      assert.strictEqual(response.body.length, testData.users.length);
    });
    test('all messages returned', async () => {
      const response = await api
        .get('/api/marazam/messages')
        .set('Cookie', [
          `identifier=${session.identifier}`
        ]);
        
      assert.strictEqual(response.body.length, testData.messages.length);
    });
    test('all chats returned', async () => {
      const response = await api
        .get('/api/marazam/chats')
        .set('Cookie', [
          `identifier=${session.identifier}`
        ]);
      
      assert.strictEqual(response.body.length, testData.chats.length);
    });
    test('all contacts returned', async () => {
      const response = await api
        .get('/api/marazam/contacts')
        .set('Cookie', [
          `identifier=${session.identifier}`
        ]);
      
      assert.strictEqual(response.body.length, testData.chats.length);
    });

    test('return one specific user', async () => {
      const user = await api
        .get(`/api/marazam/users/${testData.users[0].public_id}`)
        .set('Cookie', [
          `identifier=${session.identifier}`
        ])
        .expect('Content-Type', /application\/json/);
      
      assert.strictEqual(user.body.username, testData.users[0].username);
    });
    test('return one specific message', async () => {
      const message = await api
        .get(`/api/marazam/messages/${testData.messages[0].public_id}`)
        .set('Cookie', [
          `identifier=${session.identifier}`
        ])
        .expect('Content-Type', /application\/json/);
      
      assert.strictEqual(message.body.message, testData.messages[0].message);
    });
    test('return one specific private chat', async () => {
      const chat = await api
        .get(`/api/marazam/chats/private/${testData.chats[0].public_id}`)
        .set('Cookie', [
          `identifier=${session.identifier}`
        ])
        .expect('Content-Type', /application\/json/);
   
      assert.strictEqual(chat.body.public_id, testData.chats[0].public_id);
    });
    test('return one specific public chat', async () => {
      const chat = await api
        .get(`/api/marazam/chats/public/${testData.chats[1].public_id}`)
        .set('Cookie', [
          `identifier=${session.identifier}`
        ])
        .expect('Content-Type', /application\/json/);

      assert.strictEqual(chat.body.public_id, testData.chats[1].public_id);
    });
    test('return one specific contact', async () => {
      const contact = await api
        .get(`/api/marazam/contacts/${testData.contacts[0].public_id}`)
        .set('Cookie', [
          `identifier=${session.identifier}`
        ])
        .expect('Content-Type', /application\/json/);
      
      assert.strictEqual(contact.body.public_id, testData.contacts[0].public_id);
    });

    
  });

  describe('add some data to system (users, messages, chats etc)', () => {
    test('add user to system without photo', async () => {
      const username = 'lirmortoch';

      const initialUsersResponse = await api
        .get('/api/marazam/users')
        .set('Cookie', [`identifier=${session.identifier}`]);
      const initialCount = initialUsersResponse.body.length;

      const response = await api
        .post('/api/marazam/users/signup')
        .field('username', username)
        .field('email', 'email1231@gmail.com')
        .field('first_name', 'Roberto')
        .field('password', '542fda321CBZX@')
        .expect(201);

      const usersAtTheEnd = await api
      .get('/api/marazam/users')
      .set('Cookie', [
        `identifier=${session.identifier}`
      ]);
      const newUser = await api
      .get(`/api/marazam/users/${response.body.usersData.public_id}`)
      .set('Cookie', [
        `identifier=${session.identifier}`
      ]);
 
      assert.strictEqual(usersAtTheEnd.body.length, initialCount + 1);
      assert.strictEqual(newUser.body.username, username);
    });
    test('add user to system with photo', async () => {
      const username = 'lirmortoch2';

      const initialUsersResponse = await api
        .get('/api/marazam/users')
        .set('Cookie', [`identifier=${session.identifier}`]);
      const initialCount = initialUsersResponse.body.length;

      const imagePath = path.resolve(__dirname, 'public/imgs/user1.png');

      const response = await api
        .post('/api/marazam/users/signup')
        .field('username', username)
        .field('email', 'email1232@gmail.com')
        .field('first_name', 'Roberto2')
        .field('password', '542fda321CBZX@')
        .attach('avatar', imagePath)
        .expect(201);

      const usersAtTheEnd = await api
      .get('/api/marazam/users')
      .set('Cookie', [
        `identifier=${session.identifier}`
      ]);

      const newUser = await api
      .get(`/api/marazam/users/${response.body.usersData.public_id}`)
      .set('Cookie', [
        `identifier=${session.identifier}`
      ]);
    
      assert.strictEqual(usersAtTheEnd.body.length, initialCount + 1);
      assert.strictEqual(newUser.body.username, username);
      assert.ok(newUser.body.avatar, 'avatar exist');
    });
    test('user with wrong data can not be added to system', async () => {
      const username = 'li';

      const initialUsersResponse = await api
        .get('/api/marazam/users')
        .set('Cookie', [`identifier=${session.identifier}`]);
      const initialCount = initialUsersResponse.body.length;

      const imagePath = path.resolve(__dirname, 'public/imgs/user1.png');

      const response = await api
        .post('/api/marazam/users/signup')
        .field('username', username)
        .field('email', 'email12.com')
        .field('first_name', 'R')
        .field('password', '54')
        .attach('avatar', imagePath)
        .expect(400);

      const usersAtTheEnd = await api
      .get('/api/marazam/users')
      .set('Cookie', [
        `identifier=${session.identifier}`
      ]);
    
      assert.strictEqual(usersAtTheEnd.body.length, initialCount);
    });
  });
});

after(async () => {
  await postgreSql.end();
});