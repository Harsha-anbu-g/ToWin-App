import test from 'node:test';
import assert from 'node:assert/strict';
import { createRpc } from '../rpc.mjs';

const towinly = {
  ask: async (text) => ({
    reply: `You said: ${text}`,
    action: text.includes('check') ? { name: 'checkInToday', arguments: {} } : null,
  }),
};

const send = (rpc, text, extra = {}) =>
  rpc.handle({
    jsonrpc: '2.0',
    id: 'r1',
    method: 'SendMessage',
    params: { message: { role: 'ROLE_USER', parts: [{ text }], messageId: 'm1' }, ...extra },
  });

test('SendMessage returns a completed task whose artifact is the reply', async () => {
  const rpc = createRpc({ towinly });
  const res = await send(rpc, 'How does trust work?');
  assert.equal(res.jsonrpc, '2.0');
  assert.equal(res.id, 'r1');
  const task = res.result.task;
  assert.equal(task.status.state, 'TASK_STATE_COMPLETED');
  assert.equal(task.artifacts[0].parts[0].text, 'You said: How does trust work?');
  assert.ok(task.id && task.contextId);
});

test('a proposed action rides in the task metadata and is never performed', async () => {
  const rpc = createRpc({ towinly });
  const res = await send(rpc, 'please check me in');
  assert.deepEqual(res.result.task.metadata.proposedAction, { name: 'checkInToday', arguments: {} });
});

test('the older message/send name is accepted; GetTask finds the task; unknown methods are -32601', async () => {
  const rpc = createRpc({ towinly });
  const res = await rpc.handle({
    jsonrpc: '2.0',
    id: 2,
    method: 'message/send',
    params: { message: { role: 'user', parts: [{ text: 'hi' }], messageId: 'm2' } },
  });
  const id = res.result.task.id;
  const got = await rpc.handle({ jsonrpc: '2.0', id: 3, method: 'GetTask', params: { id } });
  assert.equal(got.result.task.id, id);
  const bad = await rpc.handle({ jsonrpc: '2.0', id: 4, method: 'Dance', params: {} });
  assert.equal(bad.error.code, -32601);
});

test('a message with no text is -32602, and a failed ask is a failed task, not a crash', async () => {
  const rpc = createRpc({
    towinly: {
      ask: async () => {
        throw new Error('down');
      },
    },
  });
  const empty = await rpc.handle({
    jsonrpc: '2.0',
    id: 5,
    method: 'SendMessage',
    params: { message: { role: 'user', parts: [], messageId: 'm3' } },
  });
  assert.equal(empty.error.code, -32602);
  const failed = await send(rpc, 'anything');
  assert.equal(failed.result.task.status.state, 'TASK_STATE_FAILED');
});
