# AI Step 7: One Write Tool Behind a Native Confirm Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan (subagents are off in this project unless the owner asks). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an elder tells the tortoise "check me in" or "I am here today", the model proposes the daily check-in, the app asks with a native confirm, and only a yes calls the app's own `checkInToday` function. Nothing is ever written by the model.

**Architecture:** Backend: a fourth tool `propose_check_in` whose result is a sentence, never a write; `AssistantService.answerWithAction` returns the reply plus an action object (`{name: "check_in", arguments: {}}` or null); `ChatResponse` carries it, and the object shape is the contract a generic app-side dispatcher can grow into (one `name` per app API function, `arguments` as that function's input). App: on `action?.name === "check_in"`, the existing `confirm` dialog asks, then `checkInToday()` from `src/api/streaks.js` runs, and one plain bubble reports the outcome. Everything else in the chat is unchanged.

**Tech Stack:** Spring Boot 3.5 + Mockito (backend, worktree `~/Documents/Projects/ToWin/.worktrees/ai-roadmap`, paths relative to `backend/`); React Native + Expo SDK 54, jest-expo, RNTL (app, `/Users/aghar/Documents/Projects/ToWin App/App`).

Spec: `App/docs/superpowers/specs/2026-10-19-ai-roadmap-design.md`, section "Step 7".

Backend test command:

```bash
cd ~/Documents/Projects/ToWin/.worktrees/ai-roadmap/backend
caffeinate -i ./mvnw -Dtest='Assistant*,Groq*,Eval*' -Dsurefire.failIfNoSpecifiedTests=false test 2>&1 | grep -E 'Tests run: [0-9]+, Fail.*$|BUILD|ERROR\]' | tail -4
```

App test command (never pipe jest into head or tail; write to a file and grep it):

```bash
cd "/Users/aghar/Documents/Projects/ToWin App/App"
npx jest --forceExit --testPathPattern 'ask-ai|i18n' > /tmp/app-jest.log 2>&1; grep -E '^Tests:|^Test Suites:|✕' /tmp/app-jest.log
```

---

## File structure

| File | Change | One job |
|---|---|---|
| `src/main/java/com/towinly/assistant/service/AssistantTools.java` | modify | The fourth definition, `isProposal`, the proposal sentence |
| `src/main/java/com/towinly/assistant/service/AssistantService.java` | modify | `Answer` record, `answerWithAction`, action from the tool round |
| `src/main/java/com/towinly/assistant/dto/ChatResponse.java` | modify | `action` field, one-arg constructor kept |
| `src/main/java/com/towinly/assistant/controller/AssistantController.java` | modify | Uses `answerWithAction` |
| `src/main/resources/assistant/system-prompt.txt` | modify | One line in TOOLS |
| `AssistantToolsTest`, `AssistantServiceToolsTest` | modify | New cases |
| App `src/api/ai.js` | modify | JSDoc: the returned `action` |
| App `src/components/AskAiAssistant.jsx` | modify | Confirm, call, outcome bubble |
| App `src/i18n/fr.js`, `src/i18n/ta.js` | modify | Four new strings |
| App `__tests__/ask-ai-check-in.test.jsx` | create | Yes calls, no does not |

---

## Chunk 1: Backend

### Task 1: The proposal tool

- [ ] **Step 1: Failing tests.** In `AssistantToolsTest`, change the definitions test to expect four names ending in `"propose_check_in"`, and add:

```java
    @Test
    void proposeCheckIn_neverWrites_itOnlyProposes() {
        assertThat(tools.run("propose_check_in", ME)).isEqualTo(AssistantTools.PROPOSED_CHECK_IN);
        assertThat(AssistantTools.isProposal("propose_check_in")).isTrue();
        assertThat(AssistantTools.isProposal("get_my_family")).isFalse();
    }
```

- [ ] **Step 2: Run to see them fail.**

- [ ] **Step 3: Implement.** In `AssistantTools`:

```java
    public static final String PROPOSE_CHECK_IN = "propose_check_in";
    static final String PROPOSED_CHECK_IN = "Proposed. The app will now ask the person to confirm today's check-in. "
            + "Tell them to tap Yes if they want it, and do not say it is done.";
```

Add the fourth definition to `DEFINITIONS`:

```java
            tool(PROPOSE_CHECK_IN,
                    "Propose marking the person as here today (the elder's daily check-in). Use only when "
                    + "they ask you to check in for them or say they are here today. You cannot do it: "
                    + "the app asks them to confirm, and only their Yes does it.")
```

Add the case `case "propose_check_in" -> PROPOSED_CHECK_IN;` to `run`, and:

```java
    /** True for the one tool that proposes a write; the app, not the model, performs it after a confirm. */
    public static boolean isProposal(String name) {
        return PROPOSE_CHECK_IN.equals(name);
    }
```

- [ ] **Step 4: Run, green. Step 5: Commit** `feat: Ask AI can propose the daily check-in; the app confirms and acts`.

### Task 2: The action rides in the answer

- [ ] **Step 1: Failing tests.** In `AssistantServiceToolsTest` add:

```java
    @Test
    void aProposeCall_marksTheAnswerWithTheAction_andTheReplyStillComesFromTheModel() {
        GroqReply.ToolCall propose = new GroqReply.ToolCall("call_9", "propose_check_in", "{}");
        when(groq.complete(anyString(), anyList(), any(), eq("auto"), eq(true)))
                .thenReturn(Optional.of(new GroqReply("", 1, 1, 0, List.of(propose))));
        when(tools.run("propose_check_in", ME)).thenReturn("Proposed.");
        when(groq.complete(anyString(), anyList(), any(), eq("none"), eq(false)))
                .thenReturn(Optional.of(new GroqReply("Tap Yes to check in.", 1, 1, 0)));

        AssistantService.Answer answer = service.answerWithAction(ask("Check me in"), ME, "en");

        assertThat(answer.reply()).isEqualTo("Tap Yes to check in.");
        assertThat(answer.action().name()).isEqualTo("check_in");
    }

    @Test
    void aReadToolCall_hasNoAction() {
        when(groq.complete(anyString(), anyList(), any(), eq("auto"), eq(true)))
                .thenReturn(Optional.of(new GroqReply("", 1, 1, 0, List.of(CALL))));
        when(tools.run(anyString(), any())).thenReturn("nothing");
        when(groq.complete(anyString(), anyList(), any(), eq("none"), eq(false)))
                .thenReturn(Optional.of(new GroqReply("Nobody is waiting.", 1, 1, 0)));

        assertThat(service.answerWithAction(ask("Who is waiting?"), ME, "en").action()).isNull();
    }
```

- [ ] **Step 2: Run to see them fail.**

- [ ] **Step 3: Implement.** In `AssistantService`:

```java
    /** One thing the app may offer to confirm: the name of an app API function and its input. */
    public record Action(String name, Map<String, Object> arguments) {}

    /** The words for the person, and the one action the app may offer to confirm (or null). */
    public record Answer(String reply, Action action) {}

    /** Proposed by a tool round that asked the app to confirm the daily check-in. */
    public static final Action ACTION_CHECK_IN = new Action("check_in", Map.of());
```

Turn the existing three-argument `answer` into a delegate, and move its body into `answerWithAction`, returning `new Answer(text, action)` at every return (the canned returns carry `null`). In the tool round, compute the action:

```java
    private record ToolRound(GroqReply reply, Action action) {}

    private ToolRound answerWithTools(String systemPrompt, List<ChatMessage> conversation,
                                      GroqReply first, UUID userId) {
        List<Map<String, Object>> messages = GroqClient.toMessages(conversation);
        messages.add(GroqClient.toolCallTurn(first.toolCalls()));
        Action action = null;
        for (GroqReply.ToolCall call : first.toolCalls()) {
            messages.add(GroqClient.toolResultTurn(call, tools.run(call.name(), userId)));
            if (AssistantTools.isProposal(call.name())) action = ACTION_CHECK_IN;
        }
        GroqReply second = groqClient.complete(systemPrompt, messages, AssistantTools.DEFINITIONS, "none", false)
                .map(s -> s.addingTokensOf(first))
                .orElse(null);
        return second == null ? null : new ToolRound(second, action);
    }
```

and in the caller: `ToolRound round = answerWithTools(...); if (round == null) { ...fallback... } reply = round.reply(); action = round.action();`.

`ChatResponse`:

```java
@Data
@AllArgsConstructor
public class ChatResponse {
    private String reply;
    /** The proposed action ({name, arguments}) the app should ask to confirm; null when nothing was proposed. */
    private AssistantService.Action action;

    public ChatResponse(String reply) {
        this(reply, null);
    }
}
```

`AssistantController`: `AssistantService.Answer a = assistantService.answerWithAction(request, userId, language); return ResponseEntity.ok(new ChatResponse(a.reply(), a.action()));`

`system-prompt.txt`, in the TOOLS section, add one line after the lookups bullet:

```
- If an elder asks you to check them in, or says they are here today, call
  propose_check_in. The app then asks them to confirm. Never say it is done;
  say the app will ask them.
```

- [ ] **Step 4: Run the backend command, green. Step 5: Commit** `feat: Ask AI answers carry the proposed action for the app to confirm`.

## Chunk 2: App

### Task 3: Confirm, then the app acts

- [ ] **Step 1: Failing test.** Create `__tests__/ask-ai-check-in.test.jsx`, copying the mocks and the render-and-send helper from `__tests__/ask-ai.test.js` (icons, expo-router, expo-speech, aiConsent, api client), and mocking:

```js
jest.mock('../src/api/ai', () => ({
  askAssistant: jest.fn(async () => ({ reply: 'The app will ask you to confirm.', action: { name: 'check_in', arguments: {} } })),
}));
jest.mock('../src/api/streaks', () => ({ checkInToday: jest.fn(async () => ({ currentStreak: 4 })) }));
```

Two tests: after sending "check me in", the dialog "Check in today?" appears; pressing "Yes, check in" calls `checkInToday` once and a bubble "Done. You are checked in for today." appears. Pressing "Not now" leaves `checkInToday` uncalled and shows no done bubble. Use `await screen.findByText(...)` for the dialog and the bubble (RNTL 14: await render and rerender).

- [ ] **Step 2: Run to see it fail** (no dialog appears).

- [ ] **Step 3: Implement** in `AskAiAssistant.jsx`. Import `checkInToday` from `'../api/streaks'`. After the reply bubble is appended:

```js
      if (data.action?.name === 'check_in') await offerCheckIn();
```

and add, near `ensureAiConsent`:

```js
  // The helper can only propose the daily check-in. The person confirms with
  // the same native dialog the consent note uses, and the app's own named API
  // function does the writing (Rule 6). No: nothing is sent.
  const offerCheckIn = async () => {
    const ok = await confirm({
      title: tr('Check in today?'),
      message: tr('The helper suggests marking you as here today. Your family will see it.'),
      cancelLabel: tr('Not now'),
      confirmLabel: tr('Yes, check in'),
    });
    if (!ok || !mounted.current) return;
    try {
      await checkInToday();
      say(tr('Done. You are checked in for today.'));
    } catch {
      say(tr('Could not check in. Please use the check-in screen.'));
    }
  };
```

where `say(text)` appends an assistant bubble and announces it (extract the two existing lines into this helper so the three call sites share it). Update the JSDoc in `src/api/ai.js`: `@returns {Promise<{reply: string, action: {name: string, arguments: object} | null}>}` with one sentence on what the app must do.

Add the four strings to `fr.js` and `ta.js` (keys are the English sentences):

| English | French | Tamil |
|---|---|---|
| Check in today? | Confirmer votre présence aujourd'hui? | இன்று வருகை பதிவு செய்யவா? |
| The helper suggests marking you as here today. Your family will see it. | L'assistant propose d'indiquer que vous êtes là aujourd'hui. Votre famille le verra. | நீங்கள் இன்று இங்கே இருப்பதாகக் குறிக்க உதவியாளர் பரிந்துரைக்கிறது. உங்கள் குடும்பம் அதைப் பார்க்கும். |
| Yes, check in | Oui, confirmer | ஆம், பதிவு செய் |
| Done. You are checked in for today. | C'est fait. Votre présence d'aujourd'hui est confirmée. | முடிந்தது. இன்றைய வருகை பதிவாகிவிட்டது. |
| Could not check in. Please use the check-in screen. | La confirmation a échoué. Utilisez l'écran de présence. | பதிவு செய்ய முடியவில்லை. வருகைப் பதிவுத் திரையைப் பயன்படுத்துங்கள். |

(`Not now` already exists.) Match the app's existing words for the check-in screen: grep `I'm here today` and the screen title in `src/i18n/fr.js` and reuse their nouns.

- [ ] **Step 4: Run the app command, green. Step 5: Commit** (App repo) `feat: Ask AI can propose the daily check-in; the app confirms natively, then checks in`.

### Task 4: Close

- [ ] Full backend suite green; mark step 7 done in `App/tasks/todo.md`; then the verification pass and the final report (steps 1 to 7).

---

## Done when

- `propose_check_in` exists, is a proposal only, and the service marks `action = "check_in"` on it.
- `POST /api/assistant/chat` returns `{reply, action}`; `action` is `{name, arguments}` or null.
- The app confirms natively, calls `checkInToday` only on yes, and reports done or not.
- Backend and app suites green; nothing pushed.
