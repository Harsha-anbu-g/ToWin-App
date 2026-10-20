#!/usr/bin/env node
// Serves the Agent Card and the JSON-RPC endpoint. Run with the Towinly login
// in the environment (see README.md).
import http from 'node:http';
import { agentCard } from './agent-card.mjs';
import { createRpc } from './rpc.mjs';
import { createTowinly } from './towinly.mjs';

const port = Number(process.env.A2A_PORT || 7421);
const rpc = createRpc({ towinly: createTowinly() });
const card = agentCard();

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && (req.url === '/.well-known/agent-card.json' || req.url === '/.well-known/agent.json')) {
    return json(res, 200, card);
  }
  if (req.method === 'POST' && req.url === '/a2a/v1') {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', async () => {
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return json(res, 200, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'invalid JSON' } });
      }
      json(res, 200, await rpc.handle(parsed));
    });
    return undefined;
  }
  return json(res, 404, { error: 'not found' });
});

server.listen(port, () => {
  console.log(`Towinly A2A agent: card at http://localhost:${port}/.well-known/agent-card.json, JSON-RPC at /a2a/v1`);
});
