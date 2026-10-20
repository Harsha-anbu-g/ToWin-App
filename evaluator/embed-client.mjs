// One call to an OpenAI-shaped /v1/embeddings endpoint (the local embed server by default).
export async function embed(texts, { url = 'http://127.0.0.1:7422/v1', key = '', fetchFn = fetch } = {}) {
  const res = await fetchFn(`${url.replace(/\/$/, '')}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify({ input: texts }),
  });
  if (!res.ok) throw new Error(`embeddings ${res.status}`);
  const body = await res.json();
  return body.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}
