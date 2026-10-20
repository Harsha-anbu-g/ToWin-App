import test from 'node:test';
import assert from 'node:assert/strict';
import { agentCard } from '../agent-card.mjs';

test('the card names Towinly, one text skill, and the JSON-RPC interface at the public url', () => {
  const card = agentCard({ A2A_PUBLIC_URL: 'https://agent.example.com/a2a/v1' });
  assert.equal(card.name, 'Towinly helper');
  assert.deepEqual(card.supportedInterfaces, [
    { url: 'https://agent.example.com/a2a/v1', protocolBinding: 'JSONRPC', protocolVersion: '1.0' },
  ]);
  assert.deepEqual(card.defaultInputModes, ['text/plain']);
  assert.deepEqual(card.defaultOutputModes, ['text/plain']);
  assert.equal(card.skills.length, 1);
  assert.equal(card.skills[0].id, 'ask-towinly');
  assert.equal(card.capabilities.streaming, false);
});

test('without a public url it points at localhost', () => {
  assert.match(agentCard({}).supportedInterfaces[0].url, /^http:\/\/localhost:7421\/a2a\/v1$/);
});
