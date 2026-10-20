// Groq chat completions with tools, as the agent's `complete(messages, tools)`.
export function createComplete({ apiKey = process.env.GROQ_API_KEY, model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b', fetchFn = fetch } = {}) {
  if (!apiKey) throw new Error('GROQ_API_KEY is required');
  return async function complete(messages, tools) {
    const res = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, tools, tool_choice: 'auto', temperature: 0.2, max_tokens: 1200, reasoning_effort: 'low' }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const m = data.choices?.[0]?.message ?? {};
    return { role: 'assistant', content: m.content ?? null, ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}) };
  };
}
