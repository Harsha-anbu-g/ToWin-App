import { parseJwtPayload } from '../src/lib/jwt';
import { userFromToken } from '../src/context/AuthContext';

const makeToken = (payload) => {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.fake-signature`;
};

const future = Math.floor(Date.now() / 1000) + 3600;
const past = Math.floor(Date.now() / 1000) - 3600;

test('parses role, sub and ev from the payload', () => {
  const payload = parseJwtPayload(makeToken({ sub: 'u-42', role: 'ELDER', ev: false, exp: future }));
  expect(payload.sub).toBe('u-42');
  expect(payload.role).toBe('ELDER');
  expect(payload.ev).toBe(false);
});

test('returns null on garbage tokens', () => {
  expect(parseJwtPayload('not-a-jwt')).toBeNull();
  expect(parseJwtPayload('')).toBeNull();
  expect(parseJwtPayload(null)).toBeNull();
  expect(parseJwtPayload('a.###.c')).toBeNull();
});

test('userFromToken derives the user; absent ev means verified (grandfathered)', () => {
  const user = userFromToken(makeToken({ sub: 'u-7', role: 'HELPER', exp: future }));
  expect(user).toEqual({
    token: expect.any(String),
    role: 'HELPER',
    userId: 'u-7',
    emailVerified: true,
  });
});

test('userFromToken flags unverified users (ev === false)', () => {
  const user = userFromToken(makeToken({ sub: 'u-8', role: 'ELDER', ev: false, exp: future }));
  expect(user.emailVerified).toBe(false);
});

test('expired token means logged out (null user)', () => {
  expect(userFromToken(makeToken({ sub: 'u-9', role: 'ELDER', exp: past }))).toBeNull();
});
