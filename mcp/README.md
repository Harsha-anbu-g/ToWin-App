# Towinly MCP server

Towinly's app functions as tools an AI assistant can call. Every tool runs the same code the phone app runs, so the assistant can do what the signed-in person can do in the app and no more.

## Run it

Needs Node 22 or newer.

    cd mcp
    npm install
    TOWINLY_IDENTIFIER=you@example.com TOWINLY_PASSWORD=yourpassword node server.mjs

The server speaks MCP over stdio. It signs in on the first tool call and keeps the token in memory. If the session expires it signs in again once. The only file it writes is the rebuilt bundle, in a fresh folder under the system temp directory.

## Environment

| Variable | Meaning |
|---|---|
| `TOWINLY_IDENTIFIER`, `TOWINLY_PASSWORD` | the account the assistant acts as (username, email or phone, as on the login screen) |
| `TOWINLY_TOKEN` | a ready token instead of the pair above |
| `TOWINLY_API_BASE_URL` | optional; defaults to the live backend the app uses |

## Add it to Claude Code

    claude mcp add --scope user towinly \
      --env TOWINLY_IDENTIFIER=you@example.com --env TOWINLY_PASSWORD=yourpassword \
      -- node "/absolute/path/to/App/mcp/server.mjs"

Then, in a new session: "List my open help requests."

## Tools

The server builds its tools from the doc comments in `src/api/`. Read `catalog.snapshot.json` for the full list, or ask the server (`tools/list`). Names are `towinly_` plus the function name in snake case: `postHelpRequest` becomes `towinly_post_help_request`.

Every tool flagged destructive (21 of 108, from removing a request to stopping a reunion) needs `confirm: true` or it does nothing. Arguments named like ids accept id characters only.

Eight functions are not tools because they belong on a phone or in a browser; `exclude.mjs` lists each with its reason.

## When the app changes

    npm run catalog
    npm test

The first command rewrites `catalog.snapshot.json`. The second fails on any function whose doc comment the generator cannot read, and names that function.
