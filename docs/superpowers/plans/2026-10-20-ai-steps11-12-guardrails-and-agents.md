# AI Steps 11 and 12: Guardrails, and Two End-to-End Agents Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan (subagents are off in this project unless the owner asks). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Name and test the safety layer around Ask AI (two new guards, red-team evals, a policy page), then build two self-contained agent projects: a goal-driven agent over the MCP tool catalog with confirm-before-write, and an evaluator agent that scores Towinly's helper over A2A with embeddings as the judge.

**Architecture:** Step 11 lives in the backend (`com.towinly.assistant.guard`): `PiiGuard.redact` runs on the question and history before Groq; `OutputGuard.problem` runs on the final reply and swaps a bad one for the fallback. Step 12 is two Node packages: `App/agent/` (loop in `agent.mjs` with injected model, tool runner and confirm; Groq transport; MCP catalog as tool definitions; CLI) and `App/evaluator/` (card discovery, A2A client, embed-server client, cosine scoring, scorecard; CLI). Tests use fakes; one real run of each is documented in its README.

**Tech Stack:** Spring Boot + JUnit (step 11); Node 24, `node --test`, fetch, the existing `App/mcp` bundle and session for tool execution, Groq chat completions with tools (step 12).

Spec: `App/docs/superpowers/specs/2026-10-19-ai-roadmap-design.md`, section "Steps 11 and 12".

---

## Chunk 1: Guardrails (backend)

### Task 1: `PiiGuard` and `OutputGuard`

- [ ] Failing tests `PiiGuardTest` (emails and phone-like numbers become `[email]` and `[number]`; short numbers such as "7 stages" and "15 points" survive; null is empty) and `OutputGuardTest` (asks for a password, card, bank details or verification code, tells to send money, leaks a `===` section marker, or contains an email or phone: each returns a reason; a plain kind answer returns empty).
- [ ] Implement both as final classes with static methods and compiled patterns. Phone: 7 or more digits with optional spaces, dashes, dots, parentheses, leading plus. Money: `(send|transfer|wire|give)\b[^.]{0,40}\b(money|cash|dollars|euros|rupees)` case-insensitive. Credentials: `(your|the|a)\s+(password|pin|card number|bank (account|details)|verification code|one.time code)`.
- [ ] `AssistantService`: in `buildConversation`, redact every turn and the question after sanitizing; after the final reply, `OutputGuard.problem(text)` present means log a warning with the reason and return the fallback sentence (spend is still booked). Tests in `AssistantServiceGuardTest`: a question with a phone number reaches Groq as `[number]`; a reply that asks for a password becomes the fallback; a good reply passes.
- [ ] Six red-team cases appended to `evals.json` (ids `safety-pii-*`, `safety-money`, `safety-password`, `safety-selfharm`, `inject-*`), each with `mustIncludeAny` and, where safe, `mustNotInclude`. `AssistantEvalsFileTest` keeps passing.
- [ ] `App/docs/ai-safety.md`: a table of every layer (consent version, sanitizer, PII guard, token and rate caps, read-only tools, propose-then-confirm, content filter in the app, output guard, red-team evals, security reviews), what each stops, and the test that proves it. Humanizer then stop-slop.
- [ ] Targeted backend suite green; commit `feat: PiiGuard and OutputGuard around Ask AI, with red-team evals`.

## Chunk 2: The Towinly agent (`App/agent/`)

### Task 2: Loop, tools, Groq, CLI

- [ ] Failing tests `test/agent.test.mjs`: with a fake `complete` that returns one tool call then a final text, a read tool runs without asking; a write tool asks `confirm` and runs only on yes; on no the agent tells the model the person declined and finishes; the step budget stops a model that never finishes; every step lands in the trace. `test/tools.test.mjs`: the MCP catalog becomes Groq tool definitions with the catalog's parameter shapes and a `readOnly` lookup.
- [ ] Implement `agent.mjs` (`runAgent({ goal, complete, tools, runTool, confirm, maxSteps = 8, trace })`), `tools.mjs` (reads `../mcp/catalog.snapshot.json`; `toGroqTools`, `isReadOnly`), `groq.mjs` (`createComplete({ apiKey, model })` over fetch, tools + `tool_choice: 'auto'`), `run.mjs` (CLI: the goal from argv, confirm by readline, trace to `./traces/<time>.json`, tool execution through the MCP package's bundle and session, imported from `../mcp/`).
- [ ] README with one real run (a read-only goal, so no account changes) and its trace excerpt. Commit `feat(agent): a goal-driven agent over the MCP catalog with confirm before writes`.

## Chunk 3: The evaluator agent (`App/evaluator/`)

### Task 3: Discover, ask, score, report

- [ ] Failing tests `test/evaluate.test.mjs`: discovers the card from a fake fetch, sends each case over A2A, embeds reply and reference through a fake embed client, scores cosine, flags below the threshold, and returns the scorecard; a failed task scores 0; the report line format is stable.
- [ ] Implement `a2a-client.mjs` (`discover(baseUrl)`, `ask(url, text)`), `embed-client.mjs` (`embed(texts)` against `EMBED_URL`), `evaluate.mjs` (`evaluate({ cases, discover, ask, embed, threshold = 0.6 })`, cosine), `cases.json` (ten questions with reference answers taken from the backend's `knowledge.md`), `run.mjs` (CLI; writes `./reports/<time>.json` and prints the table).
- [ ] README with one real run against the local A2A agent and embed server (needs the Towinly login in the environment). Commit `feat(evaluator): an agent that scores Towinly's helper over A2A with embeddings as the judge`.

### Task 4: Close

- [ ] Mark steps 11 and 12 done in `App/tasks/todo.md`; final report with the push commands.

---

## Done when

- The two guards exist, are unit tested, and sit on the question and reply paths; red-team evals and `docs/ai-safety.md` are committed.
- `App/agent` runs a goal to completion with confirm-before-write and a trace; `App/evaluator` writes a scorecard over A2A; both test suites green.
