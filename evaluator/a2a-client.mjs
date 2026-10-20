// The two A2A calls the evaluator makes: read the card, send one message.
import { randomUUID } from 'node:crypto';

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]']);

export async function discover(baseUrl, fetchFn = fetch) {
  const res = await fetchFn(`${baseUrl.replace(/\/$/, '')}/.well-known/agent-card.json`);
  if (!res.ok) throw new Error(`no agent card at ${baseUrl} (${res.status})`);
  const card = await res.json();
  const iface = card.supportedInterfaces?.find((i) => i.protocolBinding === 'JSONRPC');
  if (!iface) throw new Error('the card has no JSON-RPC interface');
  // The bearer key goes only where the operator pointed us: a card that names
  // another origin is refused, and a non-loopback origin must be https.
  const base = new URL(baseUrl);
  const target = new URL(iface.url, base);
  if (target.origin !== base.origin) throw new Error(`the card points at ${target.origin}, not ${base.origin}; refused`);
  if (target.protocol !== 'https:' && !LOOPBACK.has(target.hostname)) throw new Error('a non-loopback agent must use https');
  return { card, url: target.href };
}

/** The reply text, or null when the task failed. */
export async function ask(url, key, text, fetchFn = fetch) {
  const res = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify({
      jsonrpc: '2.0', id: randomUUID(), method: 'SendMessage',
      params: { message: { role: 'ROLE_USER', parts: [{ text }], messageId: randomUUID() } },
    }),
  });
  const body = await res.json();
  if (body.error) throw new Error(`A2A error ${body.error.code}: ${body.error.message}`);
  const task = body.result?.task;
  if (task?.status?.state !== 'TASK_STATE_COMPLETED') return null;
  return task.artifacts?.flatMap((a) => a.parts ?? []).map((p) => p.text ?? '').join('\n').trim() || null;
}
