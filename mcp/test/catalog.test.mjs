import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildCatalog, buildEntry, findExports, listApiFiles, parseDocBlock, parseSignature, toToolName,
} from '../catalog.mjs';
import { API_DIR } from '../paths.mjs';
import { EXCLUDED } from '../exclude.mjs';

test('toToolName adds the prefix and snake_cases', () => {
  assert.equal(toToolName('postHelpRequest'), 'towinly_post_help_request');
  assert.equal(toToolName('sendSos'), 'towinly_send_sos');
  assert.equal(toToolName('listKeyholderAsksOfMe'), 'towinly_list_keyholder_asks_of_me');
});

test('parseSignature tells none, object and positional apart', () => {
  assert.deepEqual(parseSignature(''), { kind: 'none', names: [] });
  assert.deepEqual(parseSignature('{ title, description } = {}'), { kind: 'object', names: [] });
  assert.deepEqual(parseSignature('reportedUserId, reason'), { kind: 'positional', names: ['reportedUserId', 'reason'] });
  assert.deepEqual(parseSignature('timeoutMs = PROBE_TIMEOUT_MS'), { kind: 'positional', names: ['timeoutMs'] });
});

test('parseDocBlock reads the first paragraph and every @param', () => {
  const doc = `/**
 * Post a new help request. Family members pass onBehalfOfElderId to ask for
 * their parent.
 *
 * A second paragraph that is not part of the description.
 * @param {object} params
 * @param {string} params.title short title of the request (required)
 * @param {string|null} [params.description] longer detail, or null
 * @param {{askId: string, accept: boolean}} input the answer,
 *   continued on the next line
 * @returns {Promise<object>} the created request
 */`;
  const { description, params } = parseDocBlock(doc);
  assert.equal(description, 'Post a new help request. Family members pass onBehalfOfElderId to ask for their parent.');
  assert.deepEqual(params.map((p) => [p.type, p.name, p.optional]), [
    ['object', 'params', false],
    ['string', 'params.title', false],
    ['string|null', 'params.description', true],
    ['{askId: string, accept: boolean}', 'input', false],
  ]);
  assert.equal(params[3].text, 'the answer, continued on the next line');
});

test('findExports pairs each export with its doc block and body', () => {
  const src = `import api from './client';\n\n/**\n * One.\n */\nexport async function one(userId) {\n  const res = await api.get('/x');\n  return res?.data;\n}\n\nexport async function undocumented() {\n  await api.post('/y');\n}\n`;
  const [one, two] = findExports(src);
  assert.equal(one.name, 'one');
  assert.equal(one.signature, 'userId');
  assert.match(one.doc, /One\./);
  assert.match(one.body, /api\.get/);
  assert.equal(two.name, 'undocumented');
  assert.equal(two.doc, null);
});

test('buildEntry fails loudly on a missing doc block', () => {
  assert.throws(
    () => buildEntry('ghost', { signature: '', doc: null, body: 'api.get(' }, 'needs.js'),
    /needs\.js: ghost has no doc block/
  );
});

test('buildEntry fails when docs and signature disagree', () => {
  const doc = '/**\n * Block one person.\n * @param {string} userId who\n */';
  assert.throws(
    () => buildEntry('blockPerson', { signature: 'targetId', doc, body: 'api.post(' }, 'blocks.js'),
    /blocks\.js: blockPerson documents \[userId\] but its signature is \(targetId\)/
  );
});

test('every export outside the exclusions is a tool exactly once', () => {
  const catalog = buildCatalog();
  const expected = [];
  for (const file of listApiFiles()) {
    const source = fs.readFileSync(path.join(API_DIR, file), 'utf8');
    for (const ex of findExports(source)) if (!(ex.name in EXCLUDED)) expected.push(ex.name);
  }
  assert.deepEqual(catalog.map((e) => e.fn).sort(), expected.sort());
  assert.equal(new Set(catalog.map((e) => e.tool)).size, catalog.length);
  for (const e of catalog) {
    assert.match(e.tool, /^towinly_[a-z0-9_]+$/, e.fn);
    assert.ok(e.description.length > 10, `${e.fn} has a description`);
    assert.ok(['none', 'object', 'positional'].includes(e.shape), e.fn);
  }
});

test('read, write and destructive flags follow the body and the name', () => {
  const by = Object.fromEntries(buildCatalog().map((e) => [e.fn, e]));
  assert.equal(by.listMyHelpRequests.readOnly, true);
  assert.equal(by.postHelpRequest.readOnly, false);
  assert.equal(by.deleteMyAccount.destructive, true);
  assert.equal(by.sendSos.destructive, true);
  assert.equal(by.removeHelpRequest.destructive, true);
  assert.equal(by.pauseTrustSteps.destructive, false);
  assert.equal(by.unblockPerson.destructive, false);
});

test('credential and authority changes count as destructive', () => {
  const by = Object.fromEntries(buildCatalog().map((e) => [e.fn, e]));
  for (const fn of ['changePassword', 'setPassword', 'resetPassword', 'setDelegatedPowers', 'armPassOn', 'revealSealedItem', 'updatePhoneNumber']) {
    assert.equal(by[fn].destructive, true, fn);
  }
  assert.equal(by.requestPasswordReset.destructive, false, 'asking for a reset email changes nothing yet');
});

test('call shapes match the three signature styles', () => {
  const by = Object.fromEntries(buildCatalog().map((e) => [e.fn, e]));
  assert.equal(by.sendSos.shape, 'none');
  assert.equal(by.blockPerson.shape, 'positional');
  assert.deepEqual(by.blockPerson.params.map((p) => p.name), ['userId']);
  assert.equal(by.reportUser.shape, 'positional');
  assert.deepEqual(by.reportUser.params.map((p) => p.name), ['reportedUserId', 'reason']);
  assert.equal(by.postHelpRequest.shape, 'object');
  const fields = Object.fromEntries(by.postHelpRequest.params[0].children.map((c) => [c.name, c]));
  assert.equal(fields.title.optional, false);
  assert.equal(fields.description.optional, true);
});
