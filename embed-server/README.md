# Towinly embed server

A sentence-embedding model served from this machine behind the OpenAI `/v1/embeddings` shape. Towinly's backend can point its embeddings at it instead of OpenAI, with no code change.

The model is `Xenova/all-MiniLM-L6-v2` (384 dimensions) through Transformers.js, mean pooled and L2 normalized. It downloads once into `.cache/`.

Needs Node 22 or newer.

## Run

    cd App/embed-server && npm install
    node server.mjs

Then:

    curl -s localhost:7422/v1/embeddings -H 'Content-Type: application/json' \
      -d '{"input": ["a slow walk and a chat", "a lift to the clinic"], "dimensions": 1536}'

| Variable | What it is |
|---|---|
| `EMBED_PORT` | optional; default 7422 |
| `EMBED_MODEL` | optional; another Transformers.js feature-extraction model |
| `EMBED_SERVER_KEY` | optional; when set, requests need `Authorization: Bearer <key>` |

## Wiring the backend to it

Set these on the backend (Railway or a local run):

    EMBEDDINGS_BASE_URL=http://<this machine>:7422/v1
    EMBEDDINGS_API_KEY=<the EMBED_SERVER_KEY, or any word when none is set>
    EMBEDDINGS_MODEL=Xenova/all-MiniLM-L6-v2
    EMBEDDINGS_DIMENSIONS=1536

The backend's tables hold 1536-dimension vectors. A request for more dimensions than the model has is met by zero-padding, which leaves cosine similarity unchanged, so nothing in the database changes. Asking for fewer than the model's 384 is refused.

## Measured on a 2025 MacBook Air (M4, 16 GB), 2026-10-20

Model ready in about 2.5 seconds after the first download; one request of two sentences at 1536 dimensions answered in 10 milliseconds; vectors come back unit length.

## Test

    npm test

The tests use a fake pipeline and never load the model.
