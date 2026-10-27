import test from 'node:test';
import assert from 'node:assert/strict';
import { createComplete } from '../llm.mjs';

test('sends messages and tools with auto choice, and reads text and tool calls back', async () => {
  let sent;
  const fetch = async (url, init) => {
    sent = { url, init, body: JSON.parse(init.body) };
    return { ok: true, json: async () => ({ choices: [{ message: { content: null, tool_calls: [
      { id: 'c1', type: 'function', function: { name: 'towinly_get_my_trust_score', arguments: '{}' } }] } }],
      usage: { prompt_tokens: 900, completion_tokens: 20 } }) };
  };
  const complete = createComplete({ apiKey: 'k', model: 'm', fetch });
  const out = await complete({ messages: [{ role: 'user', content: 'hi' }], tools: [{ type: 'function', function: { name: 't' } }] });

  assert.equal(sent.url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(sent.init.headers.Authorization, 'Bearer k');
  assert.equal(sent.body.tool_choice, 'auto');
  assert.equal(sent.body.model, 'm');
  // gpt-6-luna calls tools on Chat Completions only with reasoning off, and
  // reasoning models take max_completion_tokens, not max_tokens.
  assert.equal(sent.body.reasoning_effort, 'none');
  assert.equal(sent.body.max_completion_tokens, 1000);
  assert.equal(sent.body.max_tokens, undefined);
  assert.deepEqual(out.toolCalls, [{ id: 'c1', name: 'towinly_get_my_trust_score', arguments: '{}' }]);
  assert.equal(out.text, '');
  assert.deepEqual(out.usage, { prompt: 900, completion: 20 });
});

test('an HTTP error throws with the status, never a silent empty answer', async () => {
  const fetch = async () => ({ ok: false, status: 429, text: async () => 'slow down' });
  const complete = createComplete({ apiKey: 'k', fetch });
  await assert.rejects(complete({ messages: [], tools: [] }), /429/);
});

test('no key is refused before any call', () => {
  assert.throws(() => createComplete({ apiKey: '' }), /OPENAI_API_KEY/);
});
