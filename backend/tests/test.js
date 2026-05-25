/* eslint-disable no-unused-vars */
import assert from 'node:assert';
import { test, after, beforeEach, describe, before } from 'node:test';
import supertest from 'supertest';
import bcrypt from 'bcrypt';

import app from '../app.js';
import { info } from '../utils/logger.js';
import seed from './utils/seed.js';
import postgreSql from '../db.js';

const api = supertest(app);

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

    test('return one specific user', async () => {
      const user = await api
        .get(`/api/marazam/users/${testData.users[0].public_id}`)
        .set('Cookie', [
          `identifier=${session.identifier}`
        ])
        .expect('Content-Type', /application\/json/);
      
      assert.strictEqual(user.body.username, testData.users[0].username);
    });
  });

  describe('add some data to system (users, messages, chats etc)', () => {
    test('add user to system without photo', async () => {
      const username = 'lirmortoch';

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
 
      assert.strictEqual(usersAtTheEnd.body.length, testData.users.length + 1);

      // const usernames = usersAtTheEnd.body.map(u => u.username);
      // assert(usernames.includes(username));
    });
  });
});

after(async () => {
  await postgreSql.end();
});