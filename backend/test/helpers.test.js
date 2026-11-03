import test from 'node:test';
import assert from 'node:assert/strict';
import { asyncHandler, isValidId, makeInviteToken, safeUser, slugify } from '../src/utils/helpers.js';

test('isValidId accepts a MongoDB ObjectId and rejects malformed identifiers', () => {
  assert.equal(isValidId('507f1f77bcf86cd799439011'), true);
  assert.equal(isValidId('not-an-object-id'), false);
  assert.equal(isValidId(undefined), false);
});

test('slugify produces a readable slug with a collision-resistant suffix', () => {
  const result = slugify('TaskFlow Engineering Team');
  assert.match(result, /^taskflow-engineering-team-[a-f0-9]{6}$/);
});

test('invitation tokens are 64-character hexadecimal values', () => {
  const token = makeInviteToken();
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.notEqual(token, makeInviteToken());
});

test('safeUser returns only public profile fields', () => {
  const result = safeUser({ _id: 'abc123', name: 'Kavya', email: 'kavya@example.com', avatarColor: '#123456', passwordHash: 'must-not-leak' });
  assert.deepEqual(result, { id: 'abc123', name: 'Kavya', email: 'kavya@example.com', avatarColor: '#123456' });
  assert.equal('passwordHash' in result, false);
});

test('asyncHandler forwards rejected promises to Express error middleware', async () => {
  const expected = new Error('intentional test error');
  let forwarded;
  const handler = asyncHandler(async () => { throw expected; });
  await handler({}, {}, (error) => { forwarded = error; });
  assert.equal(forwarded, expected);
});
