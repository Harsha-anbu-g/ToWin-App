# Towinly MCP server: the app's own functions as tools an assistant can call

Written 2026-10-19. Owner call the same day: build it now, let the assistant
do everything a person can do, run it on this Mac only. This is the forward
goal project Rule 6 has pointed at since 2026-08-22 ("expose this surface as
agent tools, an MCP server over the same functions"), opened by the owner
despite the 2026-09-04 feature freeze. Nothing in the phone app changes.

## The problem

`App/src/api/` holds 101 exported functions across 17 files. Every one has a
doc comment that says in plain words what it does, what it takes and what it
returns, and every screen in the app calls them by name. That was the point
of Rule 6: an agent can call a named function; it cannot call an onPress.

An assistant still cannot reach them, for three small reasons:

1. The files are written for the phone bundler. They import without file
   extensions (`'./client'`), and `client.js` pulls in three things a laptop
   does not have: `expo-constants` (the API base URL), the phone's secure
   storage (through `i18n`, for the saved language) and `react` (one hook the
   language store exports). Node refuses the files as they stand.
2. The functions take arguments in three shapes: nothing, one or two
   positional values (`blockPerson(userId)`, `reportUser(id, reason)`), or
   one destructured object (`postHelpRequest({ title, ... })`). A tool needs
   one declared input shape.
3. Eight of them only make sense on a phone or in a browser (push tokens,
   Google sign-in exchange, ID photo upload, profile photo upload,
   block-list migration, the network probe, and `logIn` itself).

## Chosen approach

Two decisions, both approved by the owner on 2026-10-19:

**The server runs the app's own functions.** At start it bundles
`App/src/api/` for Node with esbuild (about 50 ms), swapping the three
phone-only imports for laptop stand-ins. The server then calls the very same
`postHelpRequest` the phone calls. There is no second copy of any request
logic, so the server can never disagree with the app about a body shape, a
header, or the idempotency key a write carries.

**The tool list is generated from the doc comments.** A script reads each
function's `/** ... */` block and produces its tool: name, description,
parameters, which are required, read or write. The result is written to a
file in the repo, so when a function changes the tool list changes in the
same diff, and a test fails on any function whose docs the script cannot
read. The docs already are the catalog Rule 6 asked for; this makes that
sentence mechanically true.

Rejected: writing the 101 tools by hand (600 lines that nothing keeps in
step), and rewriting the 101 calls in Node (two copies drift within weeks).

## Layout

Everything lives in `App/mcp/`, its own small package so the mobile app's
`package.json` and lockfile stay untouched.

| File | One job |
|---|---|
| `package.json` | name `towinly-mcp-server`; pins `@modelcontextprotocol/server`, `zod`, `esbuild`, `axios` |
| `server.mjs` | entry: bundle, build the server from the catalog, connect over stdio |
| `bundle.mjs` | the esbuild call: entry points, the three aliases, `nodePaths` so axios resolves from `mcp/node_modules` |
| `stubs/expo-constants.mjs` | `{ expoConfig: { extra: {} } }` so `config.js` falls through to the env var or the live URL |
| `stubs/storage.mjs` | no-op get/set/remove; the language store never finds a saved choice |
| `stubs/react.mjs` | `useSyncExternalStore` that throws if called; only the import must resolve |
| `stubs/expo-crypto.mjs` | `randomUUID` from `node:crypto`; idempotency asks for it only when Web Crypto is missing |
| `catalog.mjs` | reads `src/api/*.js`, returns the tool definitions (pure, no network) |
| `schema.mjs` | doc type string to zod schema |
| `exclude.mjs` | the seven phone-or-browser-only functions, each with its reason |
| `session.mjs` | sign in from the environment, hold the token, retry once on 401 |
| `tools.mjs` | registers every catalog entry on an `McpServer`; the confirm guard; result and error shaping |
| `catalog.snapshot.json` | the generated list, committed; `npm run catalog` rewrites it |
| `test/*.test.mjs` | Node's built-in runner (`node --test`) |
| `README.md` | run it, the environment variables, add it to Claude Code |

Each file does one thing and can be read on its own. `catalog.mjs` and
`schema.mjs` never touch the network; `session.mjs` never reads source
files; `tools.mjs` is the only file that knows about the MCP SDK.

## The catalog generator

Source set: every `export async function NAME(` and `export const NAME =` in
`src/api/*.js`, minus `client.js` and `config.js` (plumbing, not actions),
minus the names in `exclude.mjs`.

For each function the generator reads the `/** ... */` block directly above
the export line and extracts:

- **Description:** the first paragraph (lines up to a blank line or the
  first `@` tag), joined with single spaces. Already plain English, already
  written for an agent.
- **Parameters:** each `@param {Type} name text` line.
  - `name` with no dot is a positional argument, in the order written.
  - `input.field`, `params.field`, `item.field` (any `head.field`) is a
    field of the single object argument. The bare `@param {object} input`
    line that introduces it carries no field of its own.
  - `[name]` or `[head.field]` means optional. A description containing
    `(required)` forces required. A `Type|null` is nullable.
- **Call shape:** no params → `fn()`; positional → `fn(a, b)` in doc order;
  object → `fn({ ...fields })`.
- **Read or write:** the function body (up to the next `export`) uses only
  `api.get(` → read. Anything with `post`, `put`, `patch` or `delete` →
  write.
- **Destructive:** the name starts with `delete`, `remove`, `end`, `block`,
  `revoke`, `withdraw` or `undo`, or is `sendSos` or `deleteMyAccount`.
- **Tool name:** `towinly_` + the function name in snake_case:
  `postHelpRequest` → `towinly_post_help_request`. Verb first, service
  prefix, no collision with any other server's tools.

Type map (`schema.mjs`), covering every type the 18 files use today:

| Doc type | Zod |
|---|---|
| `string`, `number`, `boolean` | the matching primitive |
| `string[]`, `Array<T>` | `z.array(...)` of the mapped `T` |
| `'A'\|'B'` | `z.enum(['A', 'B'])` |
| `T\|null` | mapped `T`, `.nullable().optional()` (an agent may send null or leave it out) |
| `A\|B` of plain types (`number\|string`) | `z.union` of the mapped parts |
| `{a: string, b?: number}` inline | `z.object` with each field mapped, `?` optional |
| `object` with documented `head.field` lines | `z.object` built from those lines |
| `object` with no field lines | `z.record(z.string(), z.unknown())` |
| anything else | fails the test with the function name and the type |

Every field gets `.describe()` with its doc text so the assistant sees the
same words a developer sees.

The generated list is committed as `catalog.snapshot.json`. A test regenerates
and compares; when the app changes, the developer runs `npm run catalog` and
the diff is the review. A function with no doc block, an `@param` the parser
cannot place, or a type outside the table fails that test naming the
function, so the catalog can never silently skip an action.

## Running

`node mcp/server.mjs`. Stdout belongs to the protocol; every log line goes
to stderr. Start sequence:

1. Bundle `src/api/*.js` into one in-memory module with esbuild (`format:
   'esm'`, `platform: 'node'`, the three aliases, `nodePaths` pointing at
   `mcp/node_modules`). Always rebuilt at start, so there is no stale bundle
   to forget.
2. Build the catalog from the same source files.
3. Register each entry on an `McpServer({ name: 'towinly-mcp-server' })`.
4. Connect a `StdioServerTransport`.

Signing in happens on the first tool call, not at start, so `tools/list`
works with no credentials and a wrong password surfaces as a tool error the
assistant can read, not a dead process.

## Session

Environment variables, read once:

| Variable | Meaning |
|---|---|
| `TOWINLY_IDENTIFIER` + `TOWINLY_PASSWORD` | the account the assistant acts as; username, email or phone, same as the login screen |
| `TOWINLY_TOKEN` | a ready JWT instead of the pair above |
| `TOWINLY_API_BASE_URL` | optional; defaults to the live Railway URL the app uses |

`config.js` reads `EXPO_PUBLIC_API_BASE_URL`; `bundle.mjs` copies
`TOWINLY_API_BASE_URL` into it before importing the bundle, and clears it
otherwise so a developer's LAN URL in the shell never reaches the server.

`session.mjs` wires the bundle's `setTokenGetter` to its in-memory token and
`setOnSessionExpired` to a flag. On the first call with no token it calls the
bundle's own `logIn`. When a call fails with 401 and a token was sent, it
signs in once more and retries that one call; a second 401 is reported. The
server never writes credentials or tokens to disk.

## Results and errors

A tool returns the API's answer as JSON text, plus `structuredContent` when
the answer is an object or an array. A function that resolves with nothing
returns the text `Done.` so the assistant always learns the action landed
(HCI rule 1).

Failures come back as `isError: true` with one plain sentence, never a stack
trace. The sentence is built from the status and the server's own message,
with the next step the app itself would show:

| What happened | Text |
|---|---|
| no response | `Towinly could not be reached. Check the connection and try again.` |
| 401 | `Sign-in failed. Check TOWINLY_IDENTIFIER and TOWINLY_PASSWORD.` |
| 403 | the app's own line: `Please verify your email first. Check your inbox for the link, then try again.` |
| 409, 400, 404, 429 | the server's `message` verbatim (the trust-gate words, the repeat-request refusal) |
| 5xx | `Something is wrong on Towinly's side. Please try again in a minute.` |

Input that fails the zod schema is refused by the SDK before the function
runs, with the field named.

## Safety

- `readOnlyHint: true` on every read; `destructiveHint: true` on the
  destructive set above; `openWorldHint: false` everywhere (one backend).
- Two tools carry an extra `confirm` field and refuse to run without
  `confirm: true`: `towinly_delete_my_account` and `towinly_send_sos`. These
  are the two actions the app itself makes a person confirm and that no undo
  can take back. Owner approved exactly these two on 2026-10-19.
- All other destructive tools rely on `destructiveHint`; the MCP client
  (Claude Code asks before running a tool by default) and the assistant's own
  judgement do the confirming, the same way the app's dialog does.
- Credentials live in the MCP client's configuration, never in the repo.

### Review against trust-and-safety and privacy-two-markets

- `towinly_send_sos` is an S1 tool. Its description gets one appended line
  the doc comment does not carry: "Danger right now: call emergency services
  first (911 in Canada and the US, 112 in India). This alerts the person's
  emergency contacts; it does not call them." `tools.mjs` holds this as the
  one description override; the generator stays generic.
- `towinly_report_user` and `towinly_report_pass_on_story` get the same
  treatment with: "A human reads every report. Promise a process, never an
  outcome."
- No new data store. The server keeps one token in memory and nothing on
  disk. Stderr logs carry the tool name, the status and the elapsed time,
  never arguments or response bodies, because those hold names, places and
  messages.
- Acting on behalf of an elder goes through the same functions with the same
  `onBehalfOfElderId`, so the backend's `actedByName` attribution and the
  elder's revocable powers are untouched. The assistant can do no more than
  the signed-in account can do in the app.

## HCI walk (HCI-RULES.md, applied to a tool surface)

1. Visibility of status: every call answers with data or `Done.`; errors say
   what happened and what to do next.
2. Real-world words: descriptions are the functions' own doc sentences,
   written elder-first ("help request", "friend", "trust step").
3. Control and freedom: the reversible pairs ship as tools too (pause and
   resume trust steps, withdraw an offer, resume a family standing).
4. Consistency: one naming shape, one error shape, one result shape.
5. Error prevention: schema validation before any call; `confirm: true` on
   the two irreversible tools; `destructiveHint` on the rest.
6. Recognition: enum fields list their allowed values in the schema, so the
   assistant picks from a list instead of guessing a code.
7. Flexibility: not applicable; one path per action.
8. Minimalism: one tool per action, one sentence each, no duplicates.
9. Recovery: every error carries its next step; a write that times out is
   safe to repeat because the bundle keeps the app's idempotency keys.
10. Help: `README.md` and each tool's description are the documentation.

## Tests, written first

Runner: `node --test 'test/*.test.mjs'` from `mcp/` (no jest-expo, no
babel; the server is plain Node, 22 or newer). Fakes: an axios adapter that records requests and answers from a
script, so no test touches the network.

1. `catalog.test.mjs`: every export in `src/api/*.js` (minus plumbing and
   exclusions) appears exactly once; names are `towinly_` + snake_case;
   descriptions are non-empty; positional vs object call shape matches the
   signature; optional and required follow the doc markers; read vs write
   matches the body.
2. `schema.test.mjs`: each row of the type table maps as specified; an
   unknown type throws naming the function.
3. `snapshot.test.mjs`: the generated catalog equals `catalog.snapshot.json`.
4. `bundle.test.mjs`: the bundle builds and exports the expected names.
5. `server.test.mjs`: over `InMemoryTransport`, `listTools` returns the
   catalog's count; a read tool reaches the right path with the right query;
   an object-shaped write sends the right body; a 401 triggers exactly one
   re-login and a retry; a 409 returns `isError` with the server's words;
   `towinly_send_sos` without `confirm` refuses and sends nothing.

## Proving it

1. `npx @modelcontextprotocol/inspector --cli node mcp/server.mjs --method
   tools/list` shows the full list.
2. One real read with the demo elder seat against the live backend
   (`towinly_list_my_help_requests`), output shown to the owner.
3. `claude mcp add --scope user towinly ...` with the environment variables,
   so a new Claude Code session on this Mac can run the tools. The owner
   tries one sentence ("list my open help requests") before anything is
   pushed.

## Out of scope

Streamable HTTP and Railway hosting (owner chose this Mac only; the core is
transport-free so that is a thin later step), MCP resources and prompts,
per-user OAuth, any change to the phone app or the backend.

## Pinned versions

`@modelcontextprotocol/server` 2.3.1 (Node ≥ 20; this Mac runs 24),
`zod` 4.6.x, `esbuild` 0.28.x, `axios` ^1.18 (the app's own major).
