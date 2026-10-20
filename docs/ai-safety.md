# AI safety and guardrails in Towinly

Written 2026-10-20. Every layer below is in the code, has a test, and fails closed: when a layer cannot decide, the helper says it cannot answer rather than guessing.

The helper is Ask AI, the tortoise in the app. It answers from a fixed knowledge base and the user guide, can look up the signed-in person's own lists, and can propose two actions that only the person can confirm. It never writes on its own.

| Layer | What it stops | Where | Proof |
|---|---|---|---|
| Consent, versioned | Data leaving the phone before the person agreed to the current wording, which names Groq and OpenAI and what each receives | `src/lib/aiConsent.js` | `__tests__/aiConsent.test.js` |
| Prompt sanitizer | Hidden characters, fake role prefixes and section markers typed into the chat box or a display name | backend `PromptSanitizer` | `PromptSanitizerTest`, `AssistantServicePromptHardeningTest` |
| PII guard | Phone numbers, emails and card-like digit runs in the question or the history reaching a third party | backend `guard/PiiGuard` | `PiiGuardTest`, `AssistantServiceGuardTest` |
| Own data only | The model seeing anyone else's details: the personal block holds the signed-in person's first name, role, score, streak and counts, never city, verification state, phone or photo | backend `AssistantService.buildPersonalContext` | privacy review 2026-10-19 |
| Read-only tools | A tool reaching past the person asking: three lookups return first names, stages and titles, every string sanitized, nothing written | backend `AssistantTools` | `AssistantToolsTest` |
| Propose, then confirm | The model performing a write: a proposal becomes `{name, arguments}` with whitelisted, capped, enum-checked arguments; the app confirms natively and calls its own named function | backend `AssistantActions`, app `src/lib/assistantActions.js` | `AssistantActionsTest`, `__tests__/assistantActions.test.js` |
| Composer parity | A proposed post skipping the Post Request screen's content filter; the dialog shows exactly what is sent, with the app's own sentence first | app `src/lib/assistantActions.js` | `__tests__/assistantActions.test.js` |
| Output guard | A reply that asks for a password or code, tells someone to send money, leaks a prompt section, or invents a phone number or email | backend `guard/OutputGuard` | `OutputGuardTest`, `AssistantServiceGuardTest` |
| Caps | Runaway spend or a flood: 8 a minute and 60 an hour per person, a daily call ceiling and a daily token ceiling for the whole service, 9 second model timeouts, one tool round per answer | backend `AssistantRateLimiter`, `GroqClient` | `AssistantRateLimiterTest` |
| Red-team evals | Regressions in refusals: injections, forged history, role-play as a bank, PII extraction, money and password requests, self-harm wording that must point to SOS | backend `evals.json` | `AssistantEvalsFileTest` every build; `AssistantEvalsTest` live with a key |
| Outside agents | An agent over A2A or MCP performing a write: proposals come back as metadata; the MCP server asks before its two destructive tools | `a2a/rpc.mjs`, `mcp/tools.mjs` | `a2a/test/rpc.test.mjs`, `mcp/test` |
| Automated review | Each commit is reviewed by a security plugin; its findings on 2026-10-19 and 2026-10-20 (consent re-prompt, policy wording, filter parity, dialog spoofing, allowlist lookup) were fixed the same day | repo history | the fix commits |

## What the helper will not do

It does not give medical, legal or money advice. It does not see passwords, and it says so. It does not act for anyone: every write ends in a native dialog that the person answers. In an emergency it points to the SOS button and the local emergency number.

## How to check it yourself

Run the backend tests for the guards and the eval file:

    cd backend && ./mvnw -Dtest='PiiGuard*,OutputGuard*,AssistantService*,AssistantEvalsFileTest' test

Run the live evals once, with a Groq key, to see every red-team case answered:

    TOWINLY_AI_EVALS=true GROQ_API_KEY=... ./mvnw -Dtest=AssistantEvalsTest test
