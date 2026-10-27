// OpenAI chat completions with tools, over fetch. Any OpenAI-compatible endpoint
// works through baseUrl. gpt-6-luna calls tools on Chat Completions only with
// reasoning off, which is also the fastest and cheapest setting for a planner.
export const DEFAULT_MODEL = 'gpt-6-luna';

export function createComplete({ apiKey, model = DEFAULT_MODEL, baseUrl = 'https://api.openai.com/v1', fetch = globalThis.fetch }) {
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set.');
  return async function complete({ messages, tools }) {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        tools,
        tool_choice: 'auto',
        max_completion_tokens: 1000,
        reasoning_effort: 'none',
      }),
    });
    if (!res.ok) throw new Error(`model call failed: HTTP ${res.status} ${await res.text()}`);
    const data = await res.json();
    const message = data.choices?.[0]?.message ?? {};
    return {
      text: (message.content ?? '').trim(),
      toolCalls: (message.tool_calls ?? []).map((c) => ({ id: c.id, name: c.function.name, arguments: c.function.arguments ?? '{}' })),
      usage: { prompt: data.usage?.prompt_tokens ?? 0, completion: data.usage?.completion_tokens ?? 0 },
    };
  };
}
