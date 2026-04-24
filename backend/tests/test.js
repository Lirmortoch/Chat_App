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

  beforeEach(async () => {
    session = await seed();
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
});