#!/usr/bin/env node
// Serves the Agent Card and the JSON-RPC endpoint. Run with the Towinly login
// in the environment (see README.md).
import http from 'node:http';
import { agentCard } from './agent-card.mjs';
import { createRpc } from './rpc.mjs';
import { createTowinly } from './towinly.mjs';
import { authorized } from './auth.mjs';

const port = Number(process.env.A2A_PORT || 7421);
// Loopback unless told otherwise: the agent speaks as a real account, so it is
// never reachable from the network by accident.
const host = process.env.A2A_HOST || '127.0.0.1';
const key = process.env.A2A_SERVER_KEY;
if (!key) {
  console.error('A2A_SERVER_KEY is required: every caller must present it as a bearer token.');
  process.exit(1);
}
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
    if (!authorized(req.headers.authorization, key)) {
      return json(res, 401, { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'unauthorized: bearer key required' } });
    }
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

server.listen(port, host, () => {
  console.log(`Towinly A2A agent on ${host}:${port}: card at /.well-known/agent-card.json, JSON-RPC at /a2a/v1 (bearer key required)`);
});
