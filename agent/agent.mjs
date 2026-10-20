// The loop: goal in, tool calls out, until the model answers in words or the
// step budget ends it. Reads run on their own; a write waits for a yes. The
// model, the tool runner and the confirm are injected, so the loop is tested
// with fakes and the same code runs for real.
const SYSTEM = `You are an agent operating Towinly, the community that brings older people and younger helpers
together, on behalf of the signed-in person. Use the tools to reach the goal in as few steps as you can.
Read tools run at once. A write tool pauses so the person can confirm; if they decline, do not retry it.
When the goal is reached or cannot be reached, answer in two or three plain sentences and stop.`;

export async function runAgent({ goal, complete, tools, catalogLookup, runTool, confirm, maxSteps = 8, trace = [], log = () => {} }) {
  const messages = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: goal },
  ];
  for (let step = 1; step <= maxSteps; step++) {
    const assistant = await complete(messages, tools);
    messages.push(assistant);
    const calls = assistant.tool_calls ?? [];
    if (calls.length === 0) {
      const outcome = (assistant.content || '').trim() || 'Done.';
      trace.push({ step, outcome });
      log(`→ ${outcome}`);
      return { outcome, steps: step, trace };
    }
    for (const call of calls) {
      const name = call.function.name;
      let args = {};
      try { args = JSON.parse(call.function.arguments || '{}'); } catch { args = {}; }
      const readOnly = catalogLookup(name);
      let confirmed = true;
      let result;
      if (!readOnly) confirmed = await confirm(name, args);
      if (!confirmed) {
        result = 'The person declined this action. Do not retry it.';
      } else {
        try {
          const out = await runTool(name, args);
          result = typeof out === 'string' ? out : JSON.stringify(out ?? null);
        } catch (e) {
          result = `Error: ${e?.message || 'the tool failed'}`;
        }
      }
      trace.push({ step, tool: name, args, readOnly, confirmed, result: result.slice(0, 2000) });
      log(`${readOnly ? 'read' : confirmed ? 'WRITE (confirmed)' : 'WRITE (declined)'} ${name} ${JSON.stringify(args)}`);
      messages.push({ role: 'tool', tool_call_id: call.id, name, content: result.slice(0, 8000) });
    }
  }
  const outcome = `Stopped: the step budget of ${maxSteps} was reached before the goal was done.`;
  trace.push({ step: maxSteps, outcome });
  return { outcome, steps: maxSteps, trace };
}
