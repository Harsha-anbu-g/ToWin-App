# Towinly A2A agent

Towinly's helper as an agent other agents can call, under the Agent2Agent (A2A) protocol, version 1.0, JSON-RPC binding. It runs on this machine and signs in to the Towinly backend as the account you give it.

Needs Node 22 or newer.

## Run

    cd App/a2a && npm install
    A2A_SERVER_KEY=$(openssl rand -hex 16) TOWINLY_IDENTIFIER=you@example.com TOWINLY_PASSWORD=yourpassword node server.mjs

The card is at `http://localhost:7421/.well-known/agent-card.json` and messages go to `http://localhost:7421/a2a/v1`.

| Variable | What it is |
|---|---|
| `TOWINLY_IDENTIFIER`, `TOWINLY_PASSWORD` | the account the agent speaks as (username, email or phone, as on the login screen) |
| `TOWINLY_TOKEN` | a ready token instead of the pair above |
| `TOWINLY_API_BASE_URL` | optional; defaults to the live backend the app uses |
| `A2A_PUBLIC_URL` | the URL other agents should use, when this machine is reachable from outside |
| `A2A_SERVER_KEY` | required; every message must carry it as `Authorization: Bearer <key>` (the card says so) |
| `A2A_HOST` | optional; default `127.0.0.1`, so the agent is not on the network unless you choose |
| `A2A_PORT` | optional; default 7421 |

## What another agent gets

One skill, `ask-towinly`: text in, text out. A `SendMessage` request returns a completed task whose artifact is the helper's reply. The older method name `message/send` and `tasks/get` are accepted too.

The helper can propose an action for the signed-in account, such as a check-in or a help request. The proposal comes back in the task's `metadata.proposedAction` and is never carried out here. Only the person, in the app, can confirm it. An outside agent gets the proposal, not the write.

## Try it

    curl -s localhost:7421/a2a/v1 -H "Authorization: Bearer $A2A_SERVER_KEY" -H 'Content-Type: application/json' -d '{
      "jsonrpc": "2.0", "id": 1, "method": "SendMessage",
      "params": {"message": {"role": "ROLE_USER", "parts": [{"text": "How many stages does the trust journey have?"}], "messageId": "m1"}}
    }'

## Test

    npm test

The tests use a fake Towinly client and never touch the network.
