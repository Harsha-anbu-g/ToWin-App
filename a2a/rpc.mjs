// The JSON-RPC 2.0 handler for the A2A binding. Pure: it takes a parsed request
// and a Towinly client, and returns the response object. Tasks live in memory.
import { randomUUID } from 'node:crypto';

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;

const error = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
const ok = (id, result) => ({ jsonrpc: '2.0', id, result });

/** The text of a message: every text part, joined. */
export function textOf(message) {
  const parts = Array.isArray(message?.parts) ? message.parts : [];
  return parts
    .map((p) => (typeof p?.text === 'string' ? p.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim();
}

export function createRpc({ towinly, now = () => new Date().toISOString() }) {
  const tasks = new Map();

  async function sendMessage(id, params) {
    const message = params?.message;
    const text = textOf(message);
    if (!text) return error(id, INVALID_PARAMS, 'message.parts needs at least one text part');
    const task = {
      id: randomUUID(),
      contextId: message.contextId || params.contextId || randomUUID(),
      status: { state: 'TASK_STATE_WORKING', timestamp: now() },
      history: [{ role: 'ROLE_USER', parts: [{ text }], messageId: message.messageId || randomUUID() }],
      artifacts: [],
      metadata: {},
    };
    tasks.set(task.id, task);
    try {
      const answer = await towinly.ask(text);
      task.artifacts = [{ artifactId: randomUUID(), name: 'reply', parts: [{ text: answer.reply }] }];
      // A proposal is handed back, never performed: only the person in the app may confirm it.
      if (answer.action) task.metadata.proposedAction = answer.action;
      task.status = { state: 'TASK_STATE_COMPLETED', timestamp: now() };
    } catch (e) {
      task.status = {
        state: 'TASK_STATE_FAILED',
        timestamp: now(),
        message: { role: 'ROLE_AGENT', parts: [{ text: 'Towinly could not answer just now.' }], messageId: randomUUID() },
      };
    }
    return ok(id, { task });
  }

  function getTask(id, params) {
    const task = tasks.get(params?.id);
    return task ? ok(id, { task }) : error(id, INVALID_PARAMS, 'no such task');
  }

  async function handle(req) {
    if (!req || typeof req !== 'object') return error(null, PARSE_ERROR, 'not a JSON object');
    if (req.jsonrpc !== '2.0' || typeof req.method !== 'string') return error(req.id, INVALID_REQUEST, 'not a JSON-RPC 2.0 request');
    switch (req.method) {
      case 'SendMessage':
      case 'message/send':
        return sendMessage(req.id, req.params);
      case 'GetTask':
      case 'tasks/get':
        return getTask(req.id, req.params);
      default:
        return error(req.id, METHOD_NOT_FOUND, `unknown method ${req.method}`);
    }
  }

  return { handle, tasks };
}
