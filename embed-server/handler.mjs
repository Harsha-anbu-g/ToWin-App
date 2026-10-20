// The OpenAI /v1/embeddings shape over the local embedder. Pure: body in,
// {status, body} out. Validation mirrors what OpenAI refuses.
import { padTo } from './embed.mjs';

export const MAX_INPUTS = 100;

const bad = (message) => ({ status: 400, body: { error: { message, type: 'invalid_request_error' } } });

export async function handleEmbeddings(body, embedder) {
  const input = body?.input;
  const texts = typeof input === 'string' ? [input] : Array.isArray(input) ? input : null;
  if (!texts || texts.length === 0) return bad('input must be a non-empty string or array of strings');
  if (texts.length > MAX_INPUTS) return bad(`input may hold at most ${MAX_INPUTS} strings`);
  if (texts.some((t) => typeof t !== 'string' || !t.trim())) return bad('every input must be a non-empty string');
  const dimensions = body.dimensions ?? embedder.dimension;
  if (!Number.isInteger(dimensions) || dimensions < embedder.dimension) {
    return bad(`dimensions must be an integer of at least ${embedder.dimension} for ${embedder.model}`);
  }
  const vectors = await embedder.embed(texts);
  const promptTokens = Math.max(1, Math.round(texts.join(' ').length / 4));
  return {
    status: 200,
    body: {
      object: 'list',
      data: vectors.map((v, index) => ({ object: 'embedding', index, embedding: padTo(v, dimensions) })),
      model: embedder.model,
      usage: { prompt_tokens: promptTokens, total_tokens: promptTokens },
    },
  };
}
