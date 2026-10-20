# Towinly evaluator agent

An agent that tests another agent. It reads the Towinly helper's A2A Agent Card, asks every question in `cases.json` over A2A, embeds each reply and its reference answer with the local embed server, and scores the pair by cosine similarity. It writes a scorecard to `reports/` and exits non-zero when any case falls below the threshold, so it can gate a release.

Needs Node 22 or newer, the A2A agent (`../a2a`) and the embed server (`../embed-server`) running.

## Run

    A2A_SERVER_KEY=<the agent's key> node run.mjs

| Variable | What it is |
|---|---|
| `A2A_URL` | where the agent card lives; default `http://127.0.0.1:7421` |
| `A2A_SERVER_KEY` | the bearer key the A2A agent requires |
| `EMBED_URL` | the embeddings endpoint; default `http://127.0.0.1:7422/v1` |
| `EVAL_THRESHOLD` | the passing cosine score; default 0.6 |

## Test

    npm test

The tests use fake transports and never touch the network.
