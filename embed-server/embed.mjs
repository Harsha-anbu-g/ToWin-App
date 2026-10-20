// A local sentence-embedding model behind one function. The pipeline is
// injected so tests never load a model; the default loads Transformers.js and
// caches the model files under ./.cache.
export const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2';
export const DEFAULT_DIMENSION = 384;

async function defaultLoadPipeline(model) {
  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = new URL('./.cache/', import.meta.url).pathname;
  return pipeline('feature-extraction', model);
}

/** Zero-pads a vector to `dimensions`. Cosine similarity is unchanged by trailing zeros. */
export function padTo(vector, dimensions) {
  if (dimensions < vector.length) throw new Error(`dimensions ${dimensions} is below the model's ${vector.length}`);
  if (dimensions === vector.length) return vector;
  return vector.concat(new Array(dimensions - vector.length).fill(0));
}

export function createEmbedder({ loadPipeline = defaultLoadPipeline, model = DEFAULT_MODEL, dimension = DEFAULT_DIMENSION } = {}) {
  let ready = null;
  const get = () => (ready ??= loadPipeline(model));

  /** One normalized vector per text, in order. */
  async function embed(texts) {
    const extractor = await get();
    const out = await extractor(texts, { pooling: 'mean', normalize: true });
    return out.tolist();
  }

  return { model, dimension, embed, warmUp: get };
}
