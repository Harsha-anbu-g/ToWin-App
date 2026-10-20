// Groq chat completions with tools, over fetch. Any OpenAI-compatible endpoint
// works through baseUrl.
export const DEFAULT_MODEL = 'openai/gpt-oss-120b';

export function createComplete({ apiKey, model = DEFAULT_MODEL, baseUrl = 'https://api.groq.com/openai/v1', fetch = globalThis.fetch }) {
  if (!apiKey) throw new Error('GROQ_API_KEY is not set.');
  return async function complete({ messages, tools }) {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.2,
        max_tokens: 1000,
        reasoning_effort: 'low',
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
