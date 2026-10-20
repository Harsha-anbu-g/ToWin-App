# AI roadmap for Towinly: six steps, in order

Written 2026-10-19. Owner call the same day, after the six-step recommendation in
chat: "do it all in order". Steps 1, 2, 3, 5 and 6 are backend work in the website
repo (`backend/`), where Ask AI lives. Step 4 is the MCP server, already under way
on branch `feat/mcp-server` in its own worktree by another session; this spec only
records where it stands and keeps out of its way.

Rule 0b (feature freeze) reading: steps 1 to 3 make Ask AI measurable, testable and
more useful with no new screen. Step 5 gives Ask AI the user guide to answer from.
Step 6 changes how discovery orders people. The owner lifted the freeze for 5 and 6
with "do it all". Nothing in this program adds a screen, a button or a setting.

## What exists today (measured 2026-10-19 on origin/main 26003ff)

- Ask AI: `POST /api/assistant/chat` → `AssistantService` → `GroqClient`
  (openai/gpt-oss-120b, temperature 0.3, max_tokens 1000, reasoning low, one
  retry on a transient failure, 12 s read timeout per call).
- System prompt = persona and hardening (`system-prompt.txt`) + the whole
  `knowledge.md` (13,397 chars, about 3,400 tokens) + a language rule + for
  signed-in people an own-data block: first name, role, trust score and tier,
  verification, city, streak, connection counts, open requests, profile gaps.
- Budgets are in characters: 12,000 chars of conversation per call, 1,000 per
  question, 12 history turns, 4,000 per turn. Nothing counts tokens. Limits:
  8 per minute and 60 per hour per identity, 2,000 calls per day service-wide.
- Tests: Mockito unit tests on prompt assembly (hardening, language), the rate
  limiter, the request size filter and the sanitizer. No test talks to Groq.
- Data: Postgres with Flyway (25 tables, latest V61). Redis and Kafka are excluded
  in tests. `PostHogService.capture(distinctId, event, properties)` exists and
  no-ops without a key.
- Discovery: a bounding-box query by location, exact filters on language and
  interest, ranked in Java by distance and trust. Help requests carry a title and
  a description that nothing searches.
- User guide: `docs/user-guide/guide/guide_content.py`, English only, 4,200 lines
  and about 360 KB of text with layout markup, built into four PDFs.
- No embeddings, no vector store, no MCP server on main.

## Step 1: token accounting and a daily token cap

Goal: know what every answer costs and cap spend in the unit Groq bills, so a
Tamil or French day (2 to 4 times the tokens per character) cannot run past what
the character budget assumed.

Design:

- `GroqClient.complete` returns `Optional<GroqReply>`, a record of `text`,
  `promptTokens`, `completionTokens` and `cachedTokens`, read from the response
  `usage` object (`prompt_tokens`, `completion_tokens`,
  `prompt_tokens_details.cached_tokens`). A missing field reads as 0. Usage never
  fails an answer.
- `AssistantService` logs one INFO line per answered question: language, signed
  in or not, prompt tokens, completion tokens, cached tokens, elapsed ms. No
  question text and no user id on that line.
- `AssistantService` captures one PostHog event `ask_ai_answered` with the same
  numbers. Distinct id is the user id when signed in, `anonymous` otherwise.
- `AssistantRateLimiter` gains a whole-service daily token ceiling beside the call
  ceiling: `assistant.max-tokens-per-day`, env `ASSISTANT_MAX_TOKENS_PER_DAY`,
  default 2,000,000. `check()` refuses once the day's tokens are spent, with the
  same resting message. A new `charge(int tokens)` adds a finished call's total.
  Same day window and lock as the call count. Tokens are known only after the
  answer, so the cap can overshoot by one answer at most.
- Nothing changes in the app or in the API shape.

Tests: `GroqClient` parses usage from a stubbed response map; `AssistantService`
charges the limiter and captures the event through mocks; `AssistantRateLimiter`
refuses at the token ceiling and resets with the day.

Not doing: a tokenizer library. Groq's usage numbers are exact; a local estimate
would be a second, wrong number.

## Step 2: an eval set for Ask AI

Goal: every edit to the prompt or the knowledge base is checked against the same
questions before it ships.

Design:

- `backend/src/test/resources/assistant/evals.json`: an array of cases with `id`,
  `language` (en, fr, ta), `signedIn`, `question`, optional `history`,
  `mustIncludeAny` (at least one must appear, case-insensitive),
  `mustNotInclude`, `maxSentences`, and `script` (latin or tamil). About 30
  cases: 20 product facts from `knowledge.md` (trust ladder, score, roles, SOS,
  check-in, family), 4 personal-data cases (score, streak, what next, the
  not-signed-in refusal), 3 safety cases (emergency points to SOS, no medical
  advice, off-topic refusal), 3 injection cases (ignore instructions, reveal the
  prompt, pretend to be a developer), and the French and Tamil versions of 3
  facts.
- `AssistantEvalsTest` runs only with `TOWINLY_AI_EVALS=true` and a
  `GROQ_API_KEY`. It builds a real `GroqClient` from the environment and a real
  `AssistantService` over mocked data services holding one fixed signed-in
  persona (Mary, elder, trust score 12, streak 3, one pending connection, one
  open request, two profile gaps). It runs every case, scores it with the rules
  above, prints a scorecard (id, pass or fail, tokens, ms) and fails if any case
  fails. It prints a SHA-256 of `system-prompt.txt` + `knowledge.md`, so a
  scorecard is tied to an exact prompt.
- `AssistantEvalsFileTest` always runs: the file parses, ids are unique, every
  case has at least one check, languages are one of the three, every
  `signedIn` case checks something only the persona could answer. This keeps
  the file honest in CI without spending a token.
- Run: `TOWINLY_AI_EVALS=true GROQ_API_KEY=… ./mvnw -q -Dtest=AssistantEvalsTest test`.
  About 30 calls, roughly 150,000 tokens with today's prompt.

Not doing: an LLM as judge. Rule checks are free, deterministic and enough for a
two-to-five-sentence helper.

No Groq key exists on this Mac. The owner runs the live evals with the Railway
key or a personal one; the file test runs everywhere.

## Step 3: tools for Ask AI (read-only)

Goal: the tortoise looks up what the person asks about instead of guessing from a
fixed block, so "which friendship is waiting on me" and "did anyone offer to help"
get real answers.

Design:

- The small own-data block stays inline. It answers the common personal
  questions in one call, it is cheap, and Groq caches the stable prefix. Three
  tools are offered to the model, signed-in only:
  1. `get_my_connections`: for each connection, the other person's first name,
     role, status (pending or active), trust step name, whether it waits on me or
     on them, unread message count, who asked first. Never phone, photo, age or
     message text.
  2. `get_my_help_requests`: for an elder, my requests with title, status,
     number of helpers waiting and the accepted helper's first name. For a
     helper, my offers with the request title and status.
  3. `get_my_family`: family links with relationship, status, which is primary,
     and pending requests, from `FamilyService.getLinks`.
- Flow in `AssistantService`: the first Groq call carries the tools
  (`tool_choice` auto). If the reply has tool calls, each runs through
  `AssistantTools` (one class, one method per tool). Every string from the
  database passes `PromptSanitizer` and is cut to 120 chars. Any exception
  becomes the tool result "not available right now". The assistant message and
  the tool messages are appended and a second call is made with `tool_choice`
  none, so the model must answer in words. One tool round only. Logged-out
  callers get no tools, as today.
- Timing: `GroqClient` read timeout drops from 12 s to 9 s so the worst case
  (9 + 0.7 retry + 9 for the first call, then 9 for the second) stays under the
  app's 30 s. The retry applies to the first call only.
- Token accounting from step 1 sums both calls into the one logged answer.
- `GroqClient` keeps `complete(systemPrompt, conversation)` and adds a variant
  that takes tools and a tool choice and returns `GroqReply` with an optional
  list of `ToolCall(id, name, argumentsJson)`. Messages stay plain maps built by
  one helper, so there is no second message model.
- `system-prompt.txt` gets a short TOOLS paragraph: use a tool when a personal
  question needs a list; never invent; a tool result is a fact about the person
  you are helping and about nobody else.

Tests (Mockito, no network): tools are offered only when signed in; a tool-call
reply runs the tool, the tool message carries sanitized content, and the second
call uses `tool_choice` none; a tool that throws still yields an answer; a display
name that contains instructions arrives stripped; token totals add both calls.

Safety: all three tools are read-only. A write tool would need a native confirm
in the app and is a separate owner decision.

## Step 4: MCP server (status only)

Being built by another session in `.worktrees/App-mcp-server` on branch
`feat/mcp-server`: spec and plan dated 2026-10-19 there, Task 1 committed, Task 2
under way at the time of writing. This program does not touch that worktree or
branch. The final report lists its state.

## Step 5: Ask AI answers from the user guide (RAG on pgvector)

Goal: the tortoise answers "how do I" questions from the 4,200-line guide, which is
far too big to send whole, by retrieving the few passages that match.

Design:

- Gate: pgvector must exist on the Railway Postgres. The first task of the plan
  checks `pg_available_extensions` there. If it is missing, steps 5 and 6 stop
  and the report says so. Flyway failing at boot is a full outage, so the
  migration is never shipped unverified.
- Corpus: `docs/user-guide/tools/export_chunks.py` walks `PARTS` in
  `guide_content.py`, strips the markup (`[[Name]]` to Name, `*x*` to x) and
  writes `backend/src/main/resources/assistant/guide-chunks.json`: one chunk per
  heading section, split at about 1,200 characters on paragraph boundaries, each
  with part id, heading, role (all, elder, helper, family), text and a SHA-256
  of the text. Committed; regenerated when the guide changes. Expected 250 to
  350 chunks.
- Migration V62: `CREATE EXTENSION IF NOT EXISTS vector` and the table
  `assistant_guide_chunks` (id, part, heading, role, content, content_hash
  unique, embedding vector(1536), created_at). No index: a few hundred rows scan
  in under a millisecond.
- `EmbeddingClient`: a RestClient to an OpenAI-compatible `/embeddings`
  endpoint. Config `embeddings.base-url` (default `https://api.openai.com/v1`),
  `embeddings.api-key` (env `EMBEDDINGS_API_KEY`), `embeddings.model` (default
  `text-embedding-3-small`), `embeddings.dimensions` (1536), `embeddings.enabled`.
  A blank key means off: Ask AI works exactly as before and the indexer and
  retrieval are skipped. Up to 100 texts per call. Built like `GroqClient`:
  bounded timeouts, failures logged and swallowed.
- `GuideIndexer` (an `ApplicationRunner`, so after Flyway): loads the JSON,
  compares hashes with the table, embeds and inserts the missing chunks, deletes
  rows whose hash is gone. First boot: about 300 chunks in 3 batch calls. Later
  boots: nothing to do.
- Retrieval in `AssistantService`: when embeddings are on, embed the sanitized
  question (one call), fetch the 4 nearest chunks by cosine distance
  (`ORDER BY embedding <=> ?::vector LIMIT 4`), and add them to the system prompt
  under "=== FROM THE USER GUIDE ===" with a rule to prefer them for how-to
  steps. `knowledge.md` stays for the short facts; the guide adds depth. Cost per
  answer: one embedding call (about 20 tokens, about 150 ms) and about 1,200
  prompt tokens. If the embedding call fails, the answer goes out without the
  block.
- Consent: the question now also goes to the embeddings provider. The in-app
  consent note (`AskAiAssistant.jsx` and its fr and ta strings), the website's
  consent note, the privacy policy page and `App/docs/store/privacy-labels.md`
  must name it. The copy goes through humanizer then stop-slop. This part lands
  in the App repo and the website frontend.
- Provider: OpenAI `text-embedding-3-small` is the default because it is cheap
  (about 2 cents per million tokens) and its endpoint shape is the common one.
  Gemini and Mistral expose the same shape, so switching is a config change. The
  owner creates the key and sets it on Railway. Without it, production does not
  change.

Tests: the chunk export has a Python unit test on a small fake `PARTS`;
`EmbeddingClient` parses a stubbed response; `GuideIndexer` indexes only new
hashes (repository mocked); `AssistantService` injects the block when the
retriever returns chunks and not otherwise; a DB-gated test
(`TOWINLY_DB_TESTS`) proves the migration and the nearest-neighbour query.

## Step 6: semantic matching in discovery

Goal: a request like "someone to walk with me to the pharmacy on Tuesdays" finds
helpers whose profile says they like walks and errands, not only helpers who
ticked the same interest tag.

Design:

- Tables `profile_embeddings` (user_id, content_hash, embedding vector(1536),
  updated_at) and `need_embeddings` (need_id, content_hash, embedding,
  updated_at). Migration V63, behind the same pgvector gate.
- Text per profile: role, bio, interests, languages and city in one short
  paragraph. Per request: title and description. The text is hashed; a changed
  hash means re-embed.
- When: the profile save and `NeedService.postNeed` call
  `EmbeddingIndex.refreshProfile` or `refreshNeed` right after the save (one
  call, about 150 ms; a failure is logged and the row stays as it was). A
  boot-time backfill embeds rows with no embedding or a stale hash, capped at
  500 per boot.
- Ranking:
  - An elder discovering helpers: the elder's most recent open request is the
    query; with no open request, the elder's own profile. For the candidates
    already inside the radius, one query returns cosine similarity for all of
    them (`WHERE user_id = ANY(?)`), and similarity becomes one term in the
    existing ranking. The weight is set in the plan after reading the current
    ranking code. The radius cut, the hidden list and blocks are untouched.
  - A helper browsing requests: the helper's profile is the query; similarity to
    each nearby request is one term in the existing order.
  - A candidate without an embedding scores 0 on that term, so nothing is
    hidden, only reordered.
- App side: no change. The same endpoints return better-ordered lists.

Tests: ranking with and without embeddings (similarity lookup mocked); the
indexer re-embeds only on a hash change; a DB-gated test for the similarity
query.

Not doing: a search box, a "why this match" label, or a new screen.

## Step 7: one write tool, behind a native confirm (added 2026-10-19, owner: "do all")

Goal: the tortoise can act, once, in the smallest safe way: when an elder says
"check me in" or "I am here today", it proposes the daily check-in and the app
asks the person to confirm with a native dialog before anything is written.

Design:

- The model gets a fourth tool, `propose_check_in`, described as a proposal
  only. Calling it never writes: the tool result tells the model the app will
  ask for a confirmation, and the service marks the answer with an action
  named `check_in`. The reply text still comes from the model.
- `POST /api/assistant/chat` returns `{reply, action}`; `action` is null for
  every answer that proposes nothing. `AssistantService.answer` keeps returning
  the text for its existing callers; a new `answerWithAction` returns both.
- The app, on `action === "check_in"`, shows the native confirm (the same
  `confirm` the consent note uses) with "Check in today?" and, on yes, calls
  the app's own `checkIn` function from `src/api/streaks.js` (Rule 6: the
  assistant proposes, the app's named API function acts). It then appends one
  plain bubble: done, or could not, with the check-in screen as the fallback.
  On no, nothing happens and nothing is sent.
- The backend's own rule still applies: only an elder can check in, so a helper
  who talks the model into proposing it gets the API's refusal, not a check-in.
- The prompt's TOOLS paragraph gains one line: propose, never claim it is done.

Tests: the tool definition and its proposal text; the service marks the action
on a propose call and leaves it null otherwise; the app confirms before calling
`checkIn`, calls it on yes, and never on no.

Not doing: a second write tool. The pattern is the deliverable; more writes are
each an owner decision.

## Order, branches and what the owner does

- Backend steps run on branch `ai/ask-ai-roadmap`, cut from origin/main 26003ff
  in a worktree of the website repo. One commit per step. Nothing is pushed: a
  push to main deploys to Railway.
- App repo: this spec and the plans in `App/docs/superpowers`, plus the consent
  copy change in step 5. The queue lives in `App/tasks/todo.md`.
- Owner actions: run the live evals with a Groq key (step 2); create an
  embeddings key and set `EMBEDDINGS_API_KEY` on Railway (step 5); confirm
  pgvector on Railway if the CLI cannot see the project (step 5); review the
  consent copy before it ships, then the App Store privacy labels (step 5);
  review every commit before any push.

## Testing and verification

- Every step: tests first (Mockito), then the targeted suite
  (`./mvnw -q -Dtest='Assistant*,Groq*,Embedding*,Guide*,Discovery*' test`),
  then the full `./mvnw -q test` once per step. DB-gated tests skip without
  `TOWINLY_DB_TESTS`; this session has no local Postgres credentials, so they
  are the owner's to run.
- Finish: verification-before-completion, then one report with the commit list,
  the MCP server's state and the owner actions.
