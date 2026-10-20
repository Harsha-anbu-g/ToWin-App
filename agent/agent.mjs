// The agent loop. The model plans and calls tools; reads run at once, writes
// run only after the person says yes; every step is written to the trace.
// The model, the tool runner and the confirm are injected, so the loop is
// tested with fakes and run for real from run.mjs.

export const SYSTEM_PROMPT = [
  'You operate Towinly, a trust platform that brings older people and younger helpers together,',
  'for the signed-in person, using the tools you are given. Read before you write: look things',
  'up instead of guessing ids or names. A tool that changes something will be shown to the',
  'person first, and they may say no; if they do, do not try again, say what you would have',
  'done. Never ask for passwords, codes or money. When the goal is met, or cannot be met,',
  'answer in two or three plain sentences.',
].join(' ');

const MAX_RESULT_CHARS = 4000;
const DECLINED = 'The person declined. Nothing was changed. Do not try again; tell them what you would have done.';

function resultText(result) {
  if (result === undefined || result === null || result === '') return 'Done.';
  const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  return text.length > MAX_RESULT_CHARS ? `${text.slice(0, MAX_RESULT_CHARS)}\n[cut at ${MAX_RESULT_CHARS} characters]` : text;
}

/**
 * Run one goal to an answer.
 * @param {object} deps
 * @param {string} deps.goal what the person wants, in their words
 * @param {Function} deps.complete ({messages, tools}) => Promise<{text, toolCalls: {id, name, arguments}[]}>
 * @param {{definitions: object[], lookup: Function}} deps.tools from toolsFromCatalog
 * @param {Function} deps.runTool (entry, input) => Promise<any>
 * @param {Function} deps.confirm ({entry, input}) => Promise<boolean>
 * @param {number} [deps.maxSteps] model calls allowed before stopping
 * @returns {Promise<{status: 'done'|'stopped', answer: string, trace: object[]}>}
 */
export async function runAgent({ goal, complete, tools, runTool, confirm, maxSteps = 8 }) {
  const trace = [{ type: 'goal', goal, at: new Date().toISOString() }];
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: goal },
  ];

  for (let step = 1; step <= maxSteps; step++) {
    const reply = await complete({ messages, tools: tools.definitions });
    trace.push({ type: 'model', step, text: reply.text ?? '', toolCalls: reply.toolCalls.map((c) => c.name) });

    if (reply.toolCalls.length === 0) {
      trace.push({ type: 'answer', text: reply.text });
      return { status: 'done', answer: reply.text, trace };
    }

    messages.push({
      role: 'assistant',
      content: reply.text ?? '',
      tool_calls: reply.toolCalls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: c.arguments } })),
    });
    for (const c of reply.toolCalls) {
      const content = await handleCall(c, { tools, runTool, confirm, trace, step });
      messages.push({ role: 'tool', tool_call_id: c.id, name: c.name, content });
    }
  }

  const answer = `I stopped after ${maxSteps} steps without finishing. Nothing more was changed.`;
  trace.push({ type: 'stopped', text: answer });
  return { status: 'stopped', answer, trace };
}

async function handleCall(call, { tools, runTool, confirm, trace, step }) {
  const entry = tools.lookup(call.name);
  if (!entry) {
    trace.push({ type: 'error', step, tool: call.name, error: 'unknown tool' });
    return `Unknown tool ${call.name}. Use only the tools you were given.`;
  }
  let input;
  try {
    input = call.arguments ? JSON.parse(call.arguments) : {};
  } catch {
    trace.push({ type: 'error', step, tool: call.name, error: 'bad arguments' });
    return 'Those arguments were not valid JSON. Send one JSON object.';
  }
  if (!entry.readOnly && !(await confirm({ entry, input }))) {
    trace.push({ type: 'declined', step, tool: call.name, input });
    return DECLINED;
  }
  try {
    const result = await runTool(entry, input);
    trace.push({ type: 'tool', step, tool: call.name, input, write: !entry.readOnly });
    return resultText(result);
  } catch (error) {
    const message = error?.response?.data?.message ?? error?.message ?? String(error);
    trace.push({ type: 'error', step, tool: call.name, error: message });
    return `Error: ${message}`;
  }
}
