# AI Step 8: Approved Write Actions on the Step 7 Pattern Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan (subagents are off in this project unless the owner asks). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Post a request for a lift on Thursday" said to the tortoise ends in a native confirm that shows the request, and a yes posts it through the app's own `postHelpRequest`. The model proposes; the app acts.

**Architecture:** Backend: `AssistantActions` maps a proposal tool call to an `Action(name, arguments)` where `name` is the app API function and `arguments` are whitelisted, sanitized and capped; a second proposal tool `propose_help_request` carries a parameter schema. App: `src/lib/assistantActions.js` is a registry of approved actions (`checkInToday`, `postHelpRequest`) with the confirm copy and the named function; `runAssistantAction` confirms, then calls. Step 7's `check_in` name becomes `checkInToday` so every name is an app function.

**Tech Stack:** as steps 3 and 7. Backend worktree `~/Documents/Projects/ToWin/.worktrees/ai-roadmap` (paths relative to `backend/`), app `/Users/aghar/Documents/Projects/ToWin App/App`. Test commands as in the step 7 plan.

Spec: `App/docs/superpowers/specs/2026-10-19-ai-roadmap-design.md`, section "Step 8". Backend limits (from `NeedRequest`): title 1 to 200 chars, description up to 2,000, category one of TRANSPORTATION, CLEANING, COMPANIONSHIP, ERRANDS, OTHER, urgency NORMAL or URGENT. The app function: `postHelpRequest({ title, description, category, urgency, onBehalfOfElderId })` in `src/api/needs.js`.

---

## Chunk 1: Backend

### Task 1: `AssistantActions`

**Files:** create `src/main/java/com/towinly/assistant/service/AssistantActions.java`; test `AssistantActionsTest.java`; modify `AssistantTools.java` (second proposal tool, `isProposal` via `AssistantActions`), `AssistantService.java` (use `AssistantActions.toAction`), `system-prompt.txt`, `AssistantServiceToolsTest` (name `checkInToday`), `AssistantToolsTest` (five definitions).

- [ ] **Step 1: Failing tests**

```java
package com.towinly.assistant.service;

import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/** A proposal call becomes one app action: the function's name, and only the arguments it allows, made safe. */
class AssistantActionsTest {

    private static GroqReply.ToolCall call(String tool, String json) {
        return new GroqReply.ToolCall("c1", tool, json);
    }

    @Test
    void checkIn_isTheAppFunction_withNoArguments() {
        Optional<AssistantService.Action> a = AssistantActions.toAction(call("propose_check_in", "{}"));
        assertThat(a).isPresent();
        assertThat(a.get().name()).isEqualTo("checkInToday");
        assertThat(a.get().arguments()).isEmpty();
    }

    @Test
    void helpRequest_keepsOnlyTheAllowedKeys_andNeverOnBehalfOf() {
        Optional<AssistantService.Action> a = AssistantActions.toAction(call("propose_help_request",
                "{\"title\":\"A lift on Thursday\",\"description\":\"To the clinic at 9\",\"category\":\"TRANSPORTATION\","
                + "\"urgency\":\"NORMAL\",\"onBehalfOfElderId\":\"123\",\"evil\":true}"));
        assertThat(a.get().name()).isEqualTo("postHelpRequest");
        assertThat(a.get().arguments()).containsOnlyKeys("title", "description", "category", "urgency")
                .containsEntry("title", "A lift on Thursday").containsEntry("category", "TRANSPORTATION");
    }

    @Test
    void helpRequest_sanitizesAndCapsStrings_andDefaultsBadEnums() {
        String longTitle = "x".repeat(300);
        Optional<AssistantService.Action> a = AssistantActions.toAction(call("propose_help_request",
                "{\"title\":\"" + longTitle + "\\u200B\",\"category\":\"SPACESHIP\",\"urgency\":\"NOW\"}"));
        Map<String, Object> args = a.get().arguments();
        assertThat(((String) args.get("title")).length()).isEqualTo(200);
        assertThat(args).containsEntry("category", "OTHER").containsEntry("urgency", "NORMAL");
        assertThat(args.get("description")).isNull();
    }

    @Test
    void helpRequest_withoutATitle_isNoAction() {
        assertThat(AssistantActions.toAction(call("propose_help_request", "{\"category\":\"ERRANDS\"}"))).isEmpty();
        assertThat(AssistantActions.toAction(call("propose_help_request", "not json"))).isEmpty();
    }

    @Test
    void aReadTool_isNoAction() {
        assertThat(AssistantActions.isProposal("get_my_family")).isFalse();
        assertThat(AssistantActions.toAction(call("get_my_family", "{}"))).isEmpty();
    }
}
```

Also change `AssistantServiceToolsTest.aProposeCall_...` to expect `"checkInToday"`, and `AssistantToolsTest` definitions to end with `"propose_check_in", "propose_help_request"`.

- [ ] **Step 2: Run to see them fail.**

- [ ] **Step 3: Implement `AssistantActions`**

```java
package com.towinly.assistant.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.towinly.common.enums.NeedCategory;
import com.towinly.common.enums.NeedUrgency;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Turns a proposal tool call into the one thing the app may ask the person to
 * confirm. The action's name is an app API function (src/api in the app); its
 * arguments are that function's input, built here from the model's JSON with a
 * whitelist of keys, every string sanitized and capped to the backend's own
 * limits, and every enum checked. The model cannot smuggle a key in, cannot
 * post for someone else, and cannot pass a value the write would reject.
 */
final class AssistantActions {

    static final String PROPOSE_CHECK_IN = "propose_check_in";
    static final String PROPOSE_HELP_REQUEST = "propose_help_request";
    private static final Set<String> PROPOSALS = Set.of(PROPOSE_CHECK_IN, PROPOSE_HELP_REQUEST);

    /** Same caps as NeedRequest, so the app's call cannot be refused for length. */
    private static final int MAX_TITLE = 200;
    private static final int MAX_DESCRIPTION = 2000;

    private static final ObjectMapper JSON = new ObjectMapper();

    private AssistantActions() {}

    static boolean isProposal(String toolName) {
        return PROPOSALS.contains(toolName);
    }

    /** The app action for a proposal call, or empty for a read tool or an unusable proposal. */
    static Optional<AssistantService.Action> toAction(GroqReply.ToolCall call) {
        return switch (call.name()) {
            case PROPOSE_CHECK_IN -> Optional.of(new AssistantService.Action("checkInToday", Map.of()));
            case PROPOSE_HELP_REQUEST -> helpRequest(call.arguments());
            default -> Optional.empty();
        };
    }

    private static Optional<AssistantService.Action> helpRequest(String json) {
        Map<String, Object> raw = parse(json);
        String title = text(raw.get("title"), MAX_TITLE);
        if (title.isBlank()) return Optional.empty();
        Map<String, Object> args = new LinkedHashMap<>();
        args.put("title", title);
        String description = text(raw.get("description"), MAX_DESCRIPTION);
        args.put("description", description.isBlank() ? null : description);
        args.put("category", oneOf(raw.get("category"), NeedCategory.class, NeedCategory.OTHER).name());
        args.put("urgency", oneOf(raw.get("urgency"), NeedUrgency.class, NeedUrgency.NORMAL).name());
        return Optional.of(new AssistantService.Action("postHelpRequest", args));
    }

    private static Map<String, Object> parse(String json) {
        try {
            Map<String, Object> m = JSON.readValue(json == null ? "{}" : json, new TypeReference<Map<String, Object>>() {});
            return m == null ? Map.of() : m;
        } catch (Exception e) {
            return Map.of();
        }
    }

    private static String text(Object value, int max) {
        if (value == null) return "";
        return PromptSanitizer.clean(value.toString(), max).replace('\n', ' ').replace('\r', ' ').trim();
    }

    private static <E extends Enum<E>> E oneOf(Object value, Class<E> type, E fallback) {
        if (value == null) return fallback;
        try {
            return Enum.valueOf(type, value.toString().trim().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return fallback;
        }
    }
}
```

`PromptSanitizer.clean(text, max)` caps by characters; confirm the cap is applied after stripping so the title test lands on exactly 200 (if `clean` strips first and then cuts, "x" × 300 plus a zero-width character becomes 200 x's). Check `PromptSanitizer.clean`'s order and adjust the test expectation if it cuts first.

In `AssistantTools`: replace `PROPOSE_CHECK_IN`/`isProposal` with delegation to `AssistantActions` (keep `public static final String PROPOSE_CHECK_IN = AssistantActions.PROPOSE_CHECK_IN;` for the existing references), add the fifth definition with parameters:

```java
            Map.of("type", "function", "function", Map.of(
                    "name", AssistantActions.PROPOSE_HELP_REQUEST,
                    "description", "Propose posting a help request for the elder: a lift, groceries, company, "
                            + "cleaning, an errand. Use when they ask you to post, ask for, or request help. Put "
                            + "what they said into title and description and pick the closest category. The app "
                            + "shows them the request and asks to confirm; only their Yes posts it.",
                    "parameters", Map.of("type", "object",
                            "properties", Map.of(
                                    "title", Map.of("type", "string", "description", "Short title, their words, under 200 characters"),
                                    "description", Map.of("type", "string", "description", "When, where, anything a helper should know"),
                                    "category", Map.of("type", "string", "enum", List.of("TRANSPORTATION", "CLEANING", "COMPANIONSHIP", "ERRANDS", "OTHER")),
                                    "urgency", Map.of("type", "string", "enum", List.of("NORMAL", "URGENT"))),
                            "required", List.of("title", "category"))))
```

and the `run` case `case AssistantActions.PROPOSE_HELP_REQUEST -> PROPOSED_HELP_REQUEST;` with `static final String PROPOSED_HELP_REQUEST = "Proposed. The app will show the person the request and ask them to confirm. Do not say it is posted.";`.

In `AssistantService.answerWithTools`, replace the `isProposal`/`ACTION_CHECK_IN` lines with:

```java
            if (action == null) action = AssistantActions.toAction(call).orElse(null);
```

and delete `ACTION_CHECK_IN`. In `system-prompt.txt`, after the check-in bullet add:

```
- If an elder asks you to post, ask for, or request help, call
  propose_help_request with their words as the title and detail. The app shows
  them the request and asks to confirm. Never say it is posted.
```

- [ ] **Step 4: Run the backend command, green. Step 5: Commit** `feat: Ask AI can propose a help request; arguments whitelisted, sanitized and capped`.

## Chunk 2: App

### Task 2: The registry and the chat component

**Files:** create `src/lib/assistantActions.js`, test `__tests__/assistantActions.test.js`; modify `src/components/AskAiAssistant.jsx` (use the registry), `__tests__/ask-ai-check-in.test.jsx` (name `checkInToday`), `src/i18n/fr.js`, `src/i18n/ta.js`, `src/api/ai.js` (JSDoc names both actions).

- [ ] **Step 1: Failing tests**

```js
// AI step 8: the registry of actions the helper may propose. Each one confirms
// first, calls the app's own named API function, and says done or not.
import { runAssistantAction } from '../src/lib/assistantActions';
import { checkInToday } from '../src/api/streaks';
import { postHelpRequest } from '../src/api/needs';

jest.mock('../src/api/streaks', () => ({ checkInToday: jest.fn(async () => ({})) }));
jest.mock('../src/api/needs', () => ({ postHelpRequest: jest.fn(async () => ({ id: 'n1' })) }));

const yes = jest.fn(async () => true);
const no = jest.fn(async () => false);

beforeEach(() => jest.clearAllMocks());

test('an unknown action is ignored', async () => {
  expect(await runAssistantAction({ name: 'deleteMyAccount', arguments: {} }, { confirm: yes })).toBeNull();
  expect(yes).not.toHaveBeenCalled();
});

test('no means nothing is called', async () => {
  const out = await runAssistantAction({ name: 'postHelpRequest', arguments: { title: 'A lift' } }, { confirm: no });
  expect(out).toBeNull();
  expect(postHelpRequest).not.toHaveBeenCalled();
});

test('yes posts exactly the shaped request and reports done', async () => {
  const out = await runAssistantAction(
    { name: 'postHelpRequest', arguments: { title: 'A lift on Thursday', description: 'To the clinic', category: 'TRANSPORTATION', urgency: 'NORMAL', evil: 1 } },
    { confirm: yes }
  );
  expect(postHelpRequest).toHaveBeenCalledWith({ title: 'A lift on Thursday', description: 'To the clinic', category: 'TRANSPORTATION', urgency: 'NORMAL' });
  expect(out).toBe('Done. Your request is posted. Helpers nearby can see it now.');
  const shown = yes.mock.calls[0][0];
  expect(shown.title).toBe('Post this request?');
  expect(shown.message).toContain('A lift on Thursday');
  expect(shown.message).toContain('Transport');
});

test('a failed post says so and points to the screen', async () => {
  postHelpRequest.mockRejectedValueOnce(new Error('500'));
  const out = await runAssistantAction({ name: 'postHelpRequest', arguments: { title: 'A lift' } }, { confirm: yes });
  expect(out).toBe('Could not post the request. Please use Post Request.');
});

test('the check-in still works through the registry', async () => {
  const out = await runAssistantAction({ name: 'checkInToday', arguments: {} }, { confirm: yes });
  expect(checkInToday).toHaveBeenCalledTimes(1);
  expect(out).toBe('Done. You are checked in for today.');
});
```

- [ ] **Step 2: Run to see it fail.** **Step 3: Implement**

```js
// The actions Ask AI may propose (AI steps 7 and 8). The model never writes:
// the backend hands the app {name, arguments}, the person confirms with the
// native dialog, and the app's own named API function does the work (Rule 6).
// Anything not listed here is ignored, however the model phrases it.
import { tr } from '../i18n';
import { checkInToday } from '../api/streaks';
import { postHelpRequest } from '../api/needs';

const CATEGORY_WORDS = {
  TRANSPORTATION: 'Transport',
  CLEANING: 'Cleaning',
  COMPANIONSHIP: 'Company',
  ERRANDS: 'Errands',
  OTHER: 'Other',
};

const ACTIONS = {
  checkInToday: {
    title: () => tr('Check in today?'),
    message: () => tr('The helper suggests marking you as here today. Your family will see it.'),
    confirmLabel: () => tr('Yes, check in'),
    run: () => checkInToday(),
    done: () => tr('Done. You are checked in for today.'),
    failed: () => tr('Could not check in. Please use the check-in screen.'),
  },
  postHelpRequest: {
    title: () => tr('Post this request?'),
    message: (a) =>
      [a.title, a.description, tr(CATEGORY_WORDS[a.category] ?? 'Other') + (a.urgency === 'URGENT' ? ' · ' + tr('Urgent') : '')]
        .filter(Boolean)
        .join('\n'),
    confirmLabel: () => tr('Yes, post it'),
    run: (a) =>
      postHelpRequest({
        title: a.title,
        description: a.description ?? null,
        category: a.category ?? 'OTHER',
        urgency: a.urgency ?? 'NORMAL',
      }),
    done: () => tr('Done. Your request is posted. Helpers nearby can see it now.'),
    failed: () => tr('Could not post the request. Please use Post Request.'),
  },
};

/**
 * Offer one proposed action: confirm natively, then call the app's own function.
 * @param {{name: string, arguments?: object}|null} action what the helper proposed
 * @param {{confirm: Function}} deps the native confirm from ConfirmContext
 * @returns {Promise<string|null>} the sentence to show, or null when ignored or declined
 */
export async function runAssistantAction(action, { confirm }) {
  const entry = action && ACTIONS[action.name];
  if (!entry) return null;
  const args = action.arguments ?? {};
  const ok = await confirm({
    title: entry.title(args),
    message: entry.message(args),
    cancelLabel: tr('Not now'),
    confirmLabel: entry.confirmLabel(args),
  });
  if (!ok) return null;
  try {
    await entry.run(args);
    return entry.done();
  } catch {
    return entry.failed();
  }
}
```

In `AskAiAssistant.jsx`, delete `offerCheckIn` and the `checkInToday` import; import `runAssistantAction` from `'../lib/assistantActions'`; replace the `if (data.action?.name === 'check_in') await offerCheckIn();` line with:

```js
      if (data.action) {
        const outcome = await runAssistantAction(data.action, { confirm });
        if (outcome && mounted.current) say(outcome);
      }
```

Update `ask-ai-check-in.test.jsx` to send `{ name: 'checkInToday', arguments: {} }`. Add fr and ta for: "Post this request?", "Yes, post it", "Done. Your request is posted. Helpers nearby can see it now.", "Could not post the request. Please use Post Request.", "Transport", "Cleaning", "Company", "Errands", "Other", "Urgent" (reuse any that exist; grep first). Update the `src/api/ai.js` JSDoc to name both actions.

- [ ] **Step 4: Run the app tests (`ask-ai|assistantActions|i18n`), green. Step 5: Commit** (App repo) `feat: Ask AI can propose a help request; the app shows it and posts only on yes`.

### Task 3: Close

- [ ] Full backend suite green; mark step 8 done; verification pass over all branches; final report.

---

## Done when

- Two proposal tools; `AssistantActions` shapes arguments safely; the action name is the app function.
- The app registry confirms, calls the named function with shaped arguments on yes, nothing on no, and reports.
- Suites green on both sides; nothing pushed.
