/* eslint-disable no-unused-vars */
import assert from 'node:assert';
import { test, after, beforeEach, describe } from 'node:test';
import supertest from 'supertest';
import bcrypt from 'bcrypt';

import app from '../app.js';
import { info } from '../utils/logger.js';
import seed from './utils/seed.js';

const api = supertest(app);

describe('when there is initially has some data saved', () => {
  let session = null;
  let testData = null;

  beforeEach(async () => {
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

});