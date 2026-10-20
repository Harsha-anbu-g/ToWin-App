#!/usr/bin/env node
// Serves POST /v1/embeddings and GET /v1/models. Optional bearer key
// (EMBED_SERVER_KEY). Loads the model at start so the first request is fast.
import http from 'node:http';
import { createEmbedder, DEFAULT_MODEL } from './embed.mjs';
import { handleEmbeddings } from './handler.mjs';

const port = Number(process.env.EMBED_PORT || 7422);
const key = process.env.EMBED_SERVER_KEY || '';
const embedder = createEmbedder({ model: process.env.EMBED_MODEL || DEFAULT_MODEL });

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const server = http.createServer((req, res) => {
  if (key && req.headers.authorization !== `Bearer ${key}`) {
    return json(res, 401, { error: { message: 'missing or wrong bearer key', type: 'invalid_request_error' } });
  }
  if (req.method === 'GET' && req.url === '/v1/models') {
    return json(res, 200, { object: 'list', data: [{ id: embedder.model, object: 'model', owned_by: 'local' }] });
  }
  if (req.method === 'POST' && req.url === '/v1/embeddings') {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', async () => {
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return json(res, 400, { error: { message: 'invalid JSON', type: 'invalid_request_error' } });
      }
      const started = Date.now();
      const out = await handleEmbeddings(body, embedder);
      res.setHeader('X-Embed-Ms', String(Date.now() - started));
      json(res, out.status, out.body);
    });
    return undefined;
  }
  return json(res, 404, { error: { message: 'not found', type: 'invalid_request_error' } });
});

const started = Date.now();
embedder.warmUp().then(() => {
  console.log(`model ${embedder.model} ready in ${Date.now() - started} ms`);
  server.listen(port, () => console.log(`Towinly embed server: POST http://localhost:${port}/v1/embeddings`));
}).catch((e) => {
  console.error('could not load the model:', e.message);
  process.exit(1);
});
