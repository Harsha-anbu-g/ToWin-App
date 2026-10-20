import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { buildApiBundle } from '../bundle.mjs';
import { createSession, SessionError } from '../session.mjs';
import { wireFake } from './fakeApi.mjs';

const LOGIN = { TOWINLY_IDENTIFIER: 'elder', TOWINLY_PASSWORD: 'pw' };
let bundle;
before(async () => {
  bundle = await buildApiBundle();
});

test('no credentials: a clear SessionError, no request sent', async () => {
  const fake = wireFake(bundle);
  const session = createSession({ client: bundle.client, logIn: bundle.logIn, env: {} });
  await assert.rejects(
    session.run(() => bundle.getMyProfile()),
    (e) => e instanceof SessionError && /TOWINLY_IDENTIFIER/.test(e.message)
  );
  assert.equal(fake.calls.length, 0);
});

test('TOWINLY_TOKEN is used as is', async () => {
  const fake = wireFake(bundle);
  fake.reply(200, { id: 'me' });
  const session = createSession({ client: bundle.client, logIn: bundle.logIn, env: { TOWINLY_TOKEN: 'abc' } });
  const me = await session.run(() => bundle.getMyProfile());
  assert.deepEqual(me, { id: 'me' });
  assert.equal(fake.calls.length, 1);
  assert.equal(fake.calls[0].url, '/profile/me');
  assert.equal(fake.calls[0].headers.Authorization, 'Bearer abc');
});

test('identifier and password sign in once, then a 401 signs in again and retries once', async () => {
  const fake = wireFake(bundle);
  fake.reply(200, { token: 't1' });
  fake.reply(401, { message: 'expired' });
  fake.reply(200, { token: 't2' });
  fake.reply(200, { id: 'me' });
  const session = createSession({ client: bundle.client, logIn: bundle.logIn, env: LOGIN });
  const me = await session.run(() => bundle.getMyProfile());
  assert.deepEqual(me, { id: 'me' });
  assert.deepEqual(fake.calls.map((c) => c.url), ['/auth/login', '/profile/me', '/auth/login', '/profile/me']);
  assert.equal(fake.calls[3].headers.Authorization, 'Bearer t2');
  assert.equal(session.token, 't2');
});

test('a second 401 is reported, not retried forever', async () => {
  const fake = wireFake(bundle);
  fake.reply(200, { token: 't1' });
  fake.reply(401, {});
  fake.reply(200, { token: 't2' });
  fake.reply(401, {});
  const session = createSession({ client: bundle.client, logIn: bundle.logIn, env: LOGIN });
  await assert.rejects(session.run(() => bundle.getMyProfile()), (e) => e?.response?.status === 401);
  assert.equal(fake.calls.length, 4);
});
