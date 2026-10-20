import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { buildApiBundle } from '../bundle.mjs';
import { buildCatalog } from '../catalog.mjs';
import { createSession } from '../session.mjs';
import { buildServer, describeTool, errorText, formatResult } from '../tools.mjs';
import { wireFake } from './fakeApi.mjs';

const ENV = { TOWINLY_IDENTIFIER: 'elder', TOWINLY_PASSWORD: 'pw' };
let bundle;
let catalog;
before(async () => {
  bundle = await buildApiBundle();
  catalog = buildCatalog();
});

async function connect(env = ENV) {
  const fake = wireFake(bundle);
  const session = createSession({ client: bundle.client, logIn: bundle.logIn, env });
  const server = buildServer({ catalog, bundle, session, log: () => {} });
  const client = new Client({ name: 'test', version: '0' });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(ct), server.connect(st)]);
  return { client, fake };
}
const text = (res) => res.content[0].text;

test('lists every catalog entry with its annotations', async () => {
  const { client } = await connect();
  const { tools } = await client.listTools();
  assert.equal(tools.length, catalog.length);
  const sos = tools.find((t) => t.name === 'towinly_send_sos');
  assert.equal(sos.annotations.destructiveHint, true);
  assert.match(sos.description, /call emergency services first/);
  assert.ok(sos.inputSchema.properties.confirm, 'sos asks for confirm');
  const mine = tools.find((t) => t.name === 'towinly_list_my_help_requests');
  assert.equal(mine.annotations.readOnlyHint, true);
});

test('a positional read reaches the right path and query, signed in', async () => {
  const { client, fake } = await connect();
  fake.reply(200, { token: 't1' });
  fake.reply(200, { content: [{ id: 1 }] });
  const res = await client.callTool({
    name: 'towinly_list_nearby_help_requests',
    arguments: { lat: 45.5, lng: -73.6, radiusKm: 5 },
  });
  assert.deepEqual(fake.calls.map((c) => c.url), ['/auth/login', '/needs/nearby']);
  assert.deepEqual(fake.calls[1].params, { lat: 45.5, lng: -73.6, radiusKm: 5 });
  assert.equal(fake.calls[1].headers.Authorization, 'Bearer t1');
  assert.deepEqual(res.structuredContent, { content: [{ id: 1 }] });
  assert.match(text(res), /"id": 1/);
});

test('an object-shaped write sends the documented body', async () => {
  const { client, fake } = await connect();
  fake.reply(200, { token: 't1' });
  fake.reply(200, { id: 'n1', title: 'Groceries' });
  const res = await client.callTool({
    name: 'towinly_post_help_request',
    arguments: { title: 'Groceries', category: 'ERRANDS', urgency: 'NORMAL' },
  });
  assert.equal(fake.calls[1].url, '/needs');
  assert.equal(fake.calls[1].method, 'post');
  assert.deepEqual(JSON.parse(fake.calls[1].data), { title: 'Groceries', category: 'ERRANDS', urgency: 'NORMAL' });
  assert.equal(res.structuredContent.id, 'n1');
});

test('a 409 comes back as isError with the server words', async () => {
  const { client, fake } = await connect();
  fake.reply(200, { token: 't1' });
  fake.reply(409, { message: 'Finish trust step 3 before messaging.' });
  const res = await client.callTool({
    name: 'towinly_send_message',
    arguments: { connectionId: 'c1', content: 'hello' },
  });
  assert.equal(res.isError, true);
  assert.equal(text(res), 'Finish trust step 3 before messaging.');
});

test('no credentials is a readable tool error', async () => {
  const { client, fake } = await connect({});
  const res = await client.callTool({ name: 'towinly_get_my_profile', arguments: {} });
  assert.equal(res.isError, true);
  assert.match(text(res), /TOWINLY_IDENTIFIER/);
  assert.equal(fake.calls.length, 0);
});

test('send_sos without confirm refuses and sends nothing', async () => {
  const { client, fake } = await connect();
  const res = await client.callTool({ name: 'towinly_send_sos', arguments: {} });
  assert.equal(res.isError, true);
  assert.match(text(res), /confirm: true/);
  assert.equal(fake.calls.length, 0);
});

test('a void answer says Done.', () => {
  assert.deepEqual(formatResult(undefined), { content: [{ type: 'text', text: 'Done.' }] });
  assert.deepEqual(formatResult([1, 2]).structuredContent, { items: [1, 2] });
});

test('error sentences by status, and plain validation errors as written', () => {
  assert.match(errorText({}), /could not be reached/);
  assert.match(errorText({ response: { status: 401 } }), /Sign-in failed/);
  assert.match(errorText({ response: { status: 403 } }), /verify your email/);
  assert.match(errorText({ response: { status: 503 } }), /Towinly's side/);
  assert.equal(errorText({ response: { status: 400, data: { message: 'Title is required.' } } }), 'Title is required.');
  assert.equal(errorText(new Error('sendMessage needs content')), 'sendMessage needs content');
});

test('describeTool appends the safety note and the prose field list only where they exist', () => {
  const by = Object.fromEntries(catalog.map((e) => [e.tool, e]));
  assert.match(describeTool(by.towinly_report_user), /A human reads every report/);
  assert.equal(describeTool(by.towinly_get_my_profile), by.towinly_get_my_profile.description);
  assert.ok(by.towinly_update_helper_profile.argNote, 'fixture: helper profile fields live in prose');
  assert.match(describeTool(by.towinly_update_helper_profile), new RegExp(by.towinly_update_helper_profile.argNote.slice(0, 20)));
});

test('no tool description carries an em dash', () => {
  for (const e of catalog) assert.doesNotMatch(describeTool(e), /—/, e.tool);
});
