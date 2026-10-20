import test from 'node:test';
import assert from 'node:assert/strict';
import { runAgent } from '../agent.mjs';

const read = { fn: 'getMyTrustScore', tool: 'towinly_get_my_trust_score', readOnly: true, description: 'Score.' };
const write = { fn: 'postHelpRequest', tool: 'towinly_post_help_request', readOnly: false, description: 'Post.' };
const tools = { definitions: [], lookup: (name) => ({ [read.tool]: read, [write.tool]: write })[name] };

/** A model that plays a script: one reply per call. */
function scripted(...replies) {
  const seen = [];
  const complete = async ({ messages }) => {
    seen.push(messages.map((m) => ({ ...m })));
    return replies.shift() ?? { text: 'Out of script.', toolCalls: [] };
  };
  return { complete, seen };
}

const call = (name, args = {}, id = 'c1') => ({ id, name, arguments: JSON.stringify(args) });

test('a read tool runs without asking, and its result goes back to the model', async () => {
  const model = scripted({ text: '', toolCalls: [call(read.tool)] }, { text: 'Your score is 12.', toolCalls: [] });
  const confirm = async () => assert.fail('a read must not ask');
  const ran = [];
  const out = await runAgent({ goal: 'What is my score?', complete: model.complete, tools,
    runTool: async (entry) => { ran.push(entry.fn); return { totalScore: 12 }; }, confirm });

  assert.equal(out.status, 'done');
  assert.equal(out.answer, 'Your score is 12.');
  assert.deepEqual(ran, ['getMyTrustScore']);
  const toolTurn = model.seen[1].at(-1);
  assert.equal(toolTurn.role, 'tool');
  assert.equal(toolTurn.tool_call_id, 'c1');
  assert.match(toolTurn.content, /"totalScore": 12/);
});

test('a write asks first and runs only on yes', async () => {
  const model = scripted({ text: '', toolCalls: [call(write.tool, { title: 'A lift' })] }, { text: 'Posted.', toolCalls: [] });
  const asked = [];
  const ran = [];
  const out = await runAgent({ goal: 'Post a lift', complete: model.complete, tools,
    runTool: async (entry, input) => { ran.push(input); return { id: 'n1' }; },
    confirm: async (q) => { asked.push(q); return true; } });

  assert.equal(asked.length, 1);
  assert.equal(asked[0].entry.fn, 'postHelpRequest');
  assert.deepEqual(asked[0].input, { title: 'A lift' });
  assert.deepEqual(ran, [{ title: 'A lift' }]);
  assert.equal(out.status, 'done');
});

test('on no, nothing runs and the model is told the person declined', async () => {
  const model = scripted({ text: '', toolCalls: [call(write.tool, { title: 'A lift' })] }, { text: 'Fine, nothing posted.', toolCalls: [] });
  const out = await runAgent({ goal: 'Post a lift', complete: model.complete, tools,
    runTool: async () => assert.fail('declined writes must not run'), confirm: async () => false });

  assert.match(model.seen[1].at(-1).content, /declined/);
  assert.equal(out.answer, 'Fine, nothing posted.');
  assert.ok(out.trace.some((t) => t.type === 'declined'));
});

test('unknown tools, bad JSON and tool errors are told to the model, never thrown', async () => {
  const model = scripted(
    { text: '', toolCalls: [call('towinly_delete_everything'), { id: 'c2', name: read.tool, arguments: '{oops' }] },
    { text: '', toolCalls: [call(read.tool, {}, 'c3')] },
    { text: 'Sorry, that failed.', toolCalls: [] });
  const out = await runAgent({ goal: 'x', complete: model.complete, tools,
    runTool: async () => { throw new Error('backend down'); }, confirm: async () => true });

  const firstRound = model.seen[1].filter((m) => m.role === 'tool').map((m) => m.content);
  assert.match(firstRound[0], /Unknown tool/);
  assert.match(firstRound[1], /not valid JSON/);
  assert.match(model.seen[2].at(-1).content, /Error: backend down/);
  assert.equal(out.status, 'done');
});

test('the step budget stops a model that never finishes', async () => {
  const forever = { complete: async () => ({ text: '', toolCalls: [call(read.tool)] }) };
  const out = await runAgent({ goal: 'loop', complete: forever.complete, tools, runTool: async () => ({}), confirm: async () => true, maxSteps: 3 });

  assert.equal(out.status, 'stopped');
  assert.equal(out.trace.filter((t) => t.type === 'model').length, 3);
});

test('every step lands in the trace in order', async () => {
  const model = scripted({ text: '', toolCalls: [call(read.tool)] }, { text: 'Done.', toolCalls: [] });
  const out = await runAgent({ goal: 'g', complete: model.complete, tools, runTool: async () => ({ ok: 1 }), confirm: async () => true });

  assert.deepEqual(out.trace.map((t) => t.type), ['goal', 'model', 'tool', 'model', 'answer']);
});
