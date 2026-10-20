import test from 'node:test';
import assert from 'node:assert/strict';
import { runAgent } from '../agent.mjs';

const call = (id, name, args) => ({ id, type: 'function', function: { name, arguments: JSON.stringify(args) } });
const script = (...turns) => {
  let i = 0;
  return async () => turns[Math.min(i++, turns.length - 1)];
};
const base = (over = {}) => ({
  goal: 'find a helper who drives and connect',
  tools: [],
  catalogLookup: (name) => name.startsWith('towinly_get') || name.startsWith('towinly_list'),
  runTool: async (name) => ({ ran: name }),
  confirm: async () => true,
  ...over,
});

test('a read tool runs without asking, then the model answers in words', async () => {
  const asked = [];
  const r = await runAgent(base({
    complete: script({ role: 'assistant', content: null, tool_calls: [call('c1', 'towinly_list_helpers', { radiusKm: 5 })] },
                     { role: 'assistant', content: 'Rita drives and is 2 km away.' }),
    confirm: async (n) => { asked.push(n); return true; },
  }));
  assert.equal(r.outcome, 'Rita drives and is 2 km away.');
  assert.deepEqual(asked, []);
  assert.equal(r.trace[0].tool, 'towinly_list_helpers');
  assert.equal(r.trace[0].readOnly, true);
});

test('a write tool asks first and runs only on yes; the tool result goes back to the model', async () => {
  const seen = [];
  const r = await runAgent(base({
    complete: async (messages) => {
      seen.push(messages[messages.length - 1]);
      return messages.length < 4
        ? { role: 'assistant', content: null, tool_calls: [call('c2', 'towinly_send_connection_request', { userId: 'u1' })] }
        : { role: 'assistant', content: 'Sent.' };
    },
    confirm: async () => true,
  }));
  assert.equal(r.outcome, 'Sent.');
  assert.equal(r.trace[0].confirmed, true);
  assert.equal(seen[1].role, 'tool');
  assert.match(seen[1].content, /towinly_send_connection_request/);
});

test('on no, nothing runs and the model is told the person declined', async () => {
  let ran = 0;
  const r = await runAgent(base({
    complete: script({ role: 'assistant', content: null, tool_calls: [call('c3', 'towinly_send_connection_request', { userId: 'u1' })] },
                     { role: 'assistant', content: 'Understood, I did not send it.' }),
    confirm: async () => false,
    runTool: async () => { ran++; },
  }));
  assert.equal(ran, 0);
  assert.equal(r.trace[0].confirmed, false);
  assert.match(r.trace[0].result, /declined/);
  assert.equal(r.outcome, 'Understood, I did not send it.');
});

test('a model that never finishes is stopped by the step budget; a failing tool becomes an error result', async () => {
  const r = await runAgent(base({
    maxSteps: 3,
    complete: async () => ({ role: 'assistant', content: null, tool_calls: [call('c4', 'towinly_get_profile', {})] }),
    runTool: async () => { throw new Error('boom'); },
  }));
  assert.match(r.outcome, /step budget of 3/);
  assert.equal(r.steps, 3);
  assert.match(r.trace[0].result, /Error: boom/);
});
