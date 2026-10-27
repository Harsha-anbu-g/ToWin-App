# Towinly agent

Give it a goal in plain words and it operates Towinly for the signed-in account: it plans with a model, calls the app's own API functions as tools, and stops to ask you before anything that changes data. Every step is saved to a trace file.

It reuses the MCP server's tool catalog (`App/mcp/catalog.snapshot.json`, one entry per exported function in `src/api`) and the same code that calls each function, so the agent and the MCP server can never disagree about what a tool does.

Needs Node 22 or newer, and the MCP package installed (`cd ../mcp && npm install`).

## Run

    export OPENAI_API_KEY=...                     # the planner
    export TOWINLY_IDENTIFIER=you@example.com     # the account it acts for
    export TOWINLY_PASSWORD=...
    node run.mjs "Which of my friendships is closest to Fully Trusted, and what is my score?"

Options:

| Flag | What it does |
|---|---|
| `--only getMyTrustScore,listMyConnections` | offer only these functions to the model |
| `--max-steps 8` | model calls allowed before it stops |

`LLM_MODEL` picks another model; the default is `gpt-6-luna`.

## How it decides

1. The model gets the goal, a short system prompt, and the catalog as function tools.
2. A read tool runs at once and its result goes back to the model, cut at 4,000 characters.
3. A write tool prints what it wants to do and the exact arguments, and runs only if you type `yes`. On anything else the model is told you declined and must not retry.
4. Destructive tools (deleting the account, SOS, blocking) are never offered.
5. Unknown tools, broken arguments and API errors go back to the model as plain sentences. Nothing throws out of the loop.
6. After eight model calls it stops and says so.

## Proof

    npm test

Thirteen tests cover the loop (read runs at once, write asks first, no runs nothing, errors are told not thrown, the step budget, the trace order), the catalog conversion (including the real 93-entry snapshot), and the model transport. They use a scripted model and fake tools; no network.

The tool path was also checked live on 2026-10-20 against the production backend with the demo elder account: `getMyTrustScore` through the catalog returned a score of 38, tier Reliable, with four friendships. A live planning run needs an OpenAI key, which this machine does not hold.
