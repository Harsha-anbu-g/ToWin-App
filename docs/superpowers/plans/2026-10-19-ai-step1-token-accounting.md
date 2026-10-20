# AI Step 1: Token Accounting and a Daily Token Cap Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan (subagents are off in this project unless the owner asks). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Ask AI answer records the tokens Groq billed for it, and the service refuses new questions once a daily token ceiling is spent.

**Architecture:** `GroqClient` returns a `GroqReply` record (text plus the `usage` counts) instead of a bare string. A new `AssistantSpend` component books each answer: it charges `AssistantRateLimiter`'s new token ceiling, writes one log line, and sends one PostHog event. `AssistantService` calls it after a successful reply. Nothing changes in the HTTP API or the app.

**Tech Stack:** Spring Boot 3.5 (Java 21 target, JDK 25 on this Mac), JUnit 5, Mockito, AssertJ, Maven wrapper. Repo: the website checkout's worktree at `~/Documents/Projects/ToWin/.worktrees/ai-roadmap`, branch `ai/ask-ai-roadmap`. All paths below are relative to its `backend/` folder.

Spec: `App/docs/superpowers/specs/2026-10-19-ai-roadmap-design.md`, section "Step 1".

Run tests with the wrapper and `caffeinate` so the Mac does not sleep mid-run:

```bash
cd ~/Documents/Projects/ToWin/.worktrees/ai-roadmap/backend
caffeinate -i ./mvnw -Dtest='Assistant*,Groq*,PromptSanitizer*' -Dsurefire.failIfNoSpecifiedTests=false test 2>&1 | grep -E 'Tests run:|BUILD|ERROR\]' | tail -12
```

Baseline before this plan: 46 tests, BUILD SUCCESS.

---

## File structure

| File | Change | One job |
|---|---|---|
| `src/main/java/com/towinly/assistant/service/GroqReply.java` | create | The answer and its token counts, one immutable record |
| `src/main/java/com/towinly/assistant/service/GroqClient.java` | modify | `complete` returns `Optional<GroqReply>`; a static `parse` reads text and usage from the response map |
| `src/main/java/com/towinly/assistant/security/AssistantRateLimiter.java` | modify | A whole-service daily token ceiling beside the call ceiling; `charge(int)` after an answer |
| `src/main/java/com/towinly/assistant/service/AssistantSpend.java` | create | Books one answer: charge, log line, PostHog event |
| `src/main/java/com/towinly/assistant/service/AssistantService.java` | modify | Calls `spend.record` after a successful reply |
| `src/main/resources/application.yml` | modify | `assistant.max-tokens-per-day` |
| `src/test/java/com/towinly/assistant/service/GroqClientParseTest.java` | create | `parse` reads usage; missing fields read as 0 |
| `src/test/java/com/towinly/assistant/security/AssistantRateLimiterTest.java` | modify | Token ceiling tests |
| `src/test/java/com/towinly/assistant/service/AssistantSpendTest.java` | create | Charge, event, anonymous visitor |
| `src/test/java/com/towinly/assistant/service/AssistantServiceSpendTest.java` | create | The service books a reply and books nothing on failure |
| `src/test/java/com/towinly/assistant/service/AssistantLanguageTest.java` | modify | Stubs return `GroqReply`; constructor gets the spend mock |
| `src/test/java/com/towinly/assistant/service/AssistantServicePromptHardeningTest.java` | modify | Same two mechanical edits |

---

## Chunk 1: Reading usage from Groq

### Task 1: `GroqReply` and `GroqClient.parse`

**Files:**
- Create: `src/main/java/com/towinly/assistant/service/GroqReply.java`
- Modify: `src/main/java/com/towinly/assistant/service/GroqClient.java`
- Test: `src/test/java/com/towinly/assistant/service/GroqClientParseTest.java`

- [ ] **Step 1: Write the failing test**

Create `src/test/java/com/towinly/assistant/service/GroqClientParseTest.java`:

```java
package com.towinly.assistant.service;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * What GroqClient reads out of a chat-completions response: the words, and the
 * token usage Groq bills. Fed as maps so no HTTP call is needed.
 */
class GroqClientParseTest {

    private static Map<String, Object> choices(String content) {
        return Map.of("choices", List.of(Map.of("message", Map.of("role", "assistant", "content", content))));
    }

    @Test
    void readsTheAnswerAndItsTokenUsage() {
        Map<String, Object> response = Map.of(
                "choices", choices(" Hello there. ").get("choices"),
                "usage", Map.of(
                        "prompt_tokens", 4641,
                        "completion_tokens", 1817,
                        "total_tokens", 6458,
                        "prompt_tokens_details", Map.of("cached_tokens", 4608)));

        Optional<GroqReply> reply = GroqClient.parse(response);

        assertThat(reply).isPresent();
        assertThat(reply.get().text()).isEqualTo("Hello there.");
        assertThat(reply.get().promptTokens()).isEqualTo(4641);
        assertThat(reply.get().completionTokens()).isEqualTo(1817);
        assertThat(reply.get().cachedTokens()).isEqualTo(4608);
        assertThat(reply.get().totalTokens()).isEqualTo(6458);
    }

    @Test
    void missingUsage_readsAsZero_andStillAnswers() {
        Optional<GroqReply> reply = GroqClient.parse(choices("Hello."));

        assertThat(reply).isPresent();
        assertThat(reply.get().text()).isEqualTo("Hello.");
        assertThat(reply.get().totalTokens()).isZero();
        assertThat(reply.get().cachedTokens()).isZero();
    }

    @Test
    void usageWithoutCacheDetails_readsCachedAsZero() {
        Map<String, Object> response = Map.of(
                "choices", choices("Hello.").get("choices"),
                "usage", Map.of("prompt_tokens", 10, "completion_tokens", 5));

        GroqReply reply = GroqClient.parse(response).orElseThrow();

        assertThat(reply.promptTokens()).isEqualTo(10);
        assertThat(reply.completionTokens()).isEqualTo(5);
        assertThat(reply.cachedTokens()).isZero();
    }

    @Test
    void usageThatIsNotANumber_readsAsZero() {
        Map<String, Object> response = Map.of(
                "choices", choices("Hello.").get("choices"),
                "usage", Map.of("prompt_tokens", "lots", "completion_tokens", 5));

        GroqReply reply = GroqClient.parse(response).orElseThrow();

        assertThat(reply.promptTokens()).isZero();
        assertThat(reply.completionTokens()).isEqualTo(5);
    }

    @Test
    void noText_isEmpty_whateverTheUsageSays() {
        Map<String, Object> response = Map.of(
                "choices", choices("   ").get("choices"),
                "usage", Map.of("prompt_tokens", 10, "completion_tokens", 0));

        assertThat(GroqClient.parse(response)).isEmpty();
        assertThat(GroqClient.parse(null)).isEmpty();
        assertThat(GroqClient.parse(Map.of())).isEmpty();
    }
}
```

- [ ] **Step 2: Run the test to see it fail**

Run the test command from the header.
Expected: compilation error, `GroqReply` and `GroqClient.parse` do not exist.

- [ ] **Step 3: Create `GroqReply`**

Create `src/main/java/com/towinly/assistant/service/GroqReply.java`:

```java
package com.towinly.assistant.service;

/**
 * One answered Groq call: the words, and what they cost in the unit Groq bills.
 * Token counts come from the response's {@code usage} object. A field Groq did
 * not send reads as 0, so accounting can never stop an answer.
 */
public record GroqReply(String text, int promptTokens, int completionTokens, int cachedTokens) {

    /** Prompt plus completion: the number the daily token ceiling counts. */
    public int totalTokens() {
        return promptTokens + completionTokens;
    }
}
```

- [ ] **Step 4: Change `GroqClient.complete` and add `parse`**

In `src/main/java/com/towinly/assistant/service/GroqClient.java`:

Replace the `complete` signature and its two return lines:

```java
    /**
     * Sends the system prompt + conversation to Groq and returns the assistant's
     * text with the token usage Groq reports for the call. Returns empty on any
     * misconfiguration, timeout, or API error so the caller can fall back to a
     * friendly message.
     */
    public Optional<GroqReply> complete(String systemPrompt, List<ChatMessage> conversation) {
```

Replace these two lines inside the try block:

```java
            String text = extractContent(response);
            return (text == null || text.isBlank()) ? Optional.empty() : Optional.of(text.trim());
```

with:

```java
            return parse(response);
```

Replace the whole `extractContent` method at the bottom of the class with:

```java
    /**
     * Reads the answer and its token usage out of a chat-completions response.
     * Empty when there is no text to show. Package-private so a test can feed it
     * a response map without an HTTP call.
     */
    static Optional<GroqReply> parse(Map<String, Object> response) {
        String text = extractContent(response);
        if (text == null || text.isBlank()) return Optional.empty();

        int prompt = 0;
        int completion = 0;
        int cached = 0;
        if (response.get("usage") instanceof Map<?, ?> usage) {
            prompt = intOf(usage.get("prompt_tokens"));
            completion = intOf(usage.get("completion_tokens"));
            if (usage.get("prompt_tokens_details") instanceof Map<?, ?> details) {
                cached = intOf(details.get("cached_tokens"));
            }
        }
        return Optional.of(new GroqReply(text.trim(), prompt, completion, cached));
    }

    /** Groq sends integers; anything else (missing, a string) counts as nothing. */
    private static int intOf(Object value) {
        return value instanceof Number n ? n.intValue() : 0;
    }

    @SuppressWarnings("unchecked")
    private static String extractContent(Map<String, Object> response) {
        if (response == null) return null;
        Object choices = response.get("choices");
        if (choices instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof Map<?, ?> first) {
            Object message = ((Map<String, Object>) first).get("message");
            if (message instanceof Map<?, ?> msg) {
                Object content = ((Map<String, Object>) msg).get("content");
                if (content != null) return content.toString();
            }
        }
        return null;
    }
```

`AssistantService` now fails to compile (it still expects `Optional<String>`). That is fixed in Task 4; until then run only the parse test by name.

- [ ] **Step 5: Run the parse test alone**

```bash
cd ~/Documents/Projects/ToWin/.worktrees/ai-roadmap/backend
caffeinate -i ./mvnw -Dtest='GroqClientParseTest' -Dsurefire.failIfNoSpecifiedTests=false test 2>&1 | grep -E 'Tests run:|BUILD|ERROR\]' | tail -12
```

Expected: this still fails to compile because `AssistantService` uses the old return type. Make the one-line bridge in `AssistantService` now so the tree compiles: in `answer(...)` replace

```java
        Optional<String> reply = groqClient.complete(systemPrompt, conversation);
        return reply.orElse(CANNED.get("fallback").get(lang));
```

with

```java
        Optional<GroqReply> reply = groqClient.complete(systemPrompt, conversation);
        return reply.map(GroqReply::text).orElse(CANNED.get("fallback").get(lang));
```

Then the two existing tests that stub `Optional.of("ok")` fail to compile; fix their stubs now (mechanical):

- `AssistantLanguageTest.java` line 55: `Optional.of("ok")` → `Optional.of(new GroqReply("ok", 0, 0, 0))`
- `AssistantServicePromptHardeningTest.java` line 41: `Optional.of("A kind tortoise answer.")` → `Optional.of(new GroqReply("A kind tortoise answer.", 0, 0, 0))`

Re-run the header test command.
Expected: `Tests run: 51, Failures: 0`, BUILD SUCCESS (46 + 5 new).

- [ ] **Step 6: Commit**

```bash
cd ~/Documents/Projects/ToWin/.worktrees/ai-roadmap
git add backend/src/main/java/com/towinly/assistant/service/GroqReply.java \
        backend/src/main/java/com/towinly/assistant/service/GroqClient.java \
        backend/src/main/java/com/towinly/assistant/service/AssistantService.java \
        backend/src/test/java/com/towinly/assistant/service/GroqClientParseTest.java \
        backend/src/test/java/com/towinly/assistant/service/AssistantLanguageTest.java \
        backend/src/test/java/com/towinly/assistant/service/AssistantServicePromptHardeningTest.java
git commit -m "feat: Ask AI reads the token usage Groq reports for every answer"
```

### Task 2: Daily token ceiling in `AssistantRateLimiter`

**Files:**
- Modify: `src/main/java/com/towinly/assistant/security/AssistantRateLimiter.java`
- Test: `src/test/java/com/towinly/assistant/security/AssistantRateLimiterTest.java`

- [ ] **Step 1: Write the failing tests**

Append to `AssistantRateLimiterTest.java`, after the `withDailyBudget` helper:

```java
    /** A limiter whose daily token ceiling is the limit under test. */
    private AssistantRateLimiter withTokenBudget(long maxTokensPerDay) {
        return new AssistantRateLimiter(clock, MAX_TRACKED, UNLIMITED_DAY, maxTokensPerDay);
    }
```

And append before the final closing brace of the class:

```java
    // --- the daily token ceiling: spend in the unit Groq bills ---

    @Test
    void chargedTokens_addUp() {
        AssistantRateLimiter capped = withTokenBudget(10_000);
        capped.charge(4_000);
        capped.charge(120);

        assertThat(capped.spentTokensToday()).isEqualTo(4_120);
    }

    @Test
    void onceTheTokenBudgetIsSpent_theNextQuestionRestsKindly() {
        AssistantRateLimiter capped = withTokenBudget(10_000);
        capped.check(null, IP);
        capped.charge(10_000);

        assertThatThrownBy(() -> capped.check(null, "10.9.0.2"))
                .isInstanceOf(RateLimitException.class)
                .hasMessageContaining("resting");
    }

    @Test
    void theLastAnswerMayOvershoot_butNoMore() {
        // Tokens are known only after an answer, so the answer that crosses the line
        // is served; the one after it is not.
        AssistantRateLimiter capped = withTokenBudget(10_000);
        capped.check(null, IP);
        capped.charge(9_999);
        assertThatCode(() -> capped.check(null, "10.9.0.2")).doesNotThrowAnyException();
        capped.charge(5_000);

        assertThatThrownBy(() -> capped.check(null, "10.9.0.3"))
                .isInstanceOf(RateLimitException.class);
        assertThat(capped.spentTokensToday()).isEqualTo(14_999);
    }

    @Test
    void theTokenBudgetRefills_theNextDay() {
        AssistantRateLimiter capped = withTokenBudget(10_000);
        capped.charge(10_000);
        clock.advanceSeconds(86_401);

        assertThatCode(() -> capped.check(null, IP)).doesNotThrowAnyException();
        assertThat(capped.spentTokensToday()).isZero();
    }

    @Test
    void aZeroOrNegativeCharge_changesNothing() {
        AssistantRateLimiter capped = withTokenBudget(10_000);
        capped.charge(0);
        capped.charge(-5);

        assertThat(capped.spentTokensToday()).isZero();
    }
```

- [ ] **Step 2: Run to see them fail**

Run the header test command.
Expected: compilation error, no 4-argument constructor, no `charge`, no `spentTokensToday`.

- [ ] **Step 3: Add the token ceiling**

In `AssistantRateLimiter.java`:

Add after `private static final long DAY_SECONDS = 86_400;`:

```java
    /** Said when either daily ceiling is spent: a silent tortoise costs nothing. */
    private static final String RESTING =
            "The helper is resting just now and can't answer any more questions today. "
            + "Please try again tomorrow, or use the Feedback button and the Towinly team will help.";
```

Add after `private final int maxPerDay;`:

```java
    /**
     * Whole-service tokens per day: the ceiling that tracks the bill. Calls are a
     * proxy; tokens are what Groq charges, and a Tamil or French day costs two to
     * four times the tokens of the same day in English. See application.yml.
     */
    private final long maxTokensPerDay;
```

Add after `private int dayCount;`:

```java
    private long dayTokens;
```

Replace the two constructors with these three:

```java
    // Explicit: the class has test-only constructors, and with more than one
    // candidate Spring falls back to looking for a no-arg constructor and fails to start.
    @Autowired
    public AssistantRateLimiter(@Value("${assistant.max-calls-per-day:2000}") int maxPerDay,
                                @Value("${assistant.max-tokens-per-day:2000000}") long maxTokensPerDay) {
        this(Clock.systemUTC(), ExpiringKeyStore.DEFAULT_MAX_ENTRIES, maxPerDay, maxTokensPerDay);
    }

    /** For tests about the other limits: no token ceiling in the way. */
    AssistantRateLimiter(Clock clock, int maxEntries, int maxPerDay) {
        this(clock, maxEntries, maxPerDay, Long.MAX_VALUE);
    }

    AssistantRateLimiter(Clock clock, int maxEntries, int maxPerDay, long maxTokensPerDay) {
        this.clock = clock;
        this.windows = new ExpiringKeyStore<>(w -> w.hourResetAt, clock, maxEntries);
        this.maxPerDay = maxPerDay;
        this.maxTokensPerDay = maxTokensPerDay;
        this.dayResetAt = clock.instant().plusSeconds(DAY_SECONDS);
    }
```

Replace the body of `checkDailyBudget()` with:

```java
        Instant now = clock.instant();
        synchronized (dayLock) {
            rollDayIfOver(now);
            if (dayCount >= maxPerDay) {
                log.warn("Ask AI daily budget of {} calls is spent; refusing until {}", maxPerDay, dayResetAt);
                throw new RateLimitException(RESTING);
            }
            if (dayTokens >= maxTokensPerDay) {
                log.warn("Ask AI daily budget of {} tokens is spent; refusing until {}", maxTokensPerDay, dayResetAt);
                throw new RateLimitException(RESTING);
            }
            dayCount++;
        }
```

Add these two methods after `checkDailyBudget()`:

```java
    /**
     * Adds a finished answer's tokens to today's spend. Called after the reply is
     * back, because that is when the count is known; the ceiling can therefore
     * overshoot by one answer, never more.
     */
    public void charge(int tokens) {
        if (tokens <= 0) return;
        synchronized (dayLock) {
            rollDayIfOver(clock.instant());
            dayTokens += tokens;
        }
    }

    /** Both daily counters share one window. Call with {@code dayLock} held. */
    private void rollDayIfOver(Instant now) {
        if (dayResetAt.isBefore(now)) {
            dayCount = 0;
            dayTokens = 0;
            dayResetAt = now.plusSeconds(DAY_SECONDS);
        }
    }
```

Add after `spentToday()`:

```java
    /** Tokens charged against today's budget. Visible for tests. */
    long spentTokensToday() {
        synchronized (dayLock) {
            return dayTokens;
        }
    }
```

- [ ] **Step 4: Run the tests**

Run the header test command.
Expected: `Tests run: 56, Failures: 0`, BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/Projects/ToWin/.worktrees/ai-roadmap
git add backend/src/main/java/com/towinly/assistant/security/AssistantRateLimiter.java \
        backend/src/test/java/com/towinly/assistant/security/AssistantRateLimiterTest.java
git commit -m "feat: Ask AI rests for the day once a token ceiling is spent"
```

## Chunk 2: Booking each answer

### Task 3: `AssistantSpend`

**Files:**
- Create: `src/main/java/com/towinly/assistant/service/AssistantSpend.java`
- Test: `src/test/java/com/towinly/assistant/service/AssistantSpendTest.java`

- [ ] **Step 1: Write the failing tests**

Create `src/test/java/com/towinly/assistant/service/AssistantSpendTest.java`:

```java
package com.towinly.assistant.service;

import com.towinly.assistant.security.AssistantRateLimiter;
import com.towinly.common.service.PostHogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/** What one answered question books: the token charge, and one analytics event. */
class AssistantSpendTest {

    private AssistantRateLimiter limiter;
    private PostHogService postHog;
    private AssistantSpend spend;

    @BeforeEach
    void setUp() {
        limiter = mock(AssistantRateLimiter.class);
        postHog = mock(PostHogService.class);
        spend = new AssistantSpend(limiter, postHog);
    }

    @Test
    void chargesTheDailyTokenCeiling_withPromptPlusCompletion() {
        spend.record(new GroqReply("x", 4000, 120, 0), "en", null, 900);

        verify(limiter).charge(4120);
    }

    @SuppressWarnings("unchecked")
    @Test
    void sendsOneAnalyticsEvent_namingTheUserWhenSignedIn() {
        UUID user = UUID.randomUUID();

        spend.record(new GroqReply("x", 4000, 120, 3800), "ta", user, 1200);

        ArgumentCaptor<Map<String, Object>> props = ArgumentCaptor.forClass(Map.class);
        verify(postHog).capture(eq(user.toString()), eq("ask_ai_answered"), props.capture());
        assertThat(props.getValue())
                .containsEntry("language", "ta")
                .containsEntry("signed_in", true)
                .containsEntry("prompt_tokens", 4000)
                .containsEntry("completion_tokens", 120)
                .containsEntry("cached_tokens", 3800)
                .containsEntry("ms", 1200L);
    }

    @Test
    void aVisitorIsBookedAsAnonymous_neverByAddress() {
        spend.record(new GroqReply("x", 10, 5, 0), "fr", null, 10);

        verify(postHog).capture(eq("anonymous"), eq("ask_ai_answered"), any());
    }
}
```

- [ ] **Step 2: Run to see them fail**

Run the header test command.
Expected: compilation error, `AssistantSpend` does not exist.

- [ ] **Step 3: Write `AssistantSpend`**

Create `src/main/java/com/towinly/assistant/service/AssistantSpend.java`:

```java
package com.towinly.assistant.service;

import com.towinly.assistant.security.AssistantRateLimiter;
import com.towinly.common.service.PostHogService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

/**
 * Books what one Ask AI answer cost: charges the daily token ceiling, writes one
 * log line, and sends one analytics event. Tokens are what Groq bills, so they
 * are the number to watch; a day of Tamil questions costs two to four times the
 * tokens of the same day in English, which no character budget can see.
 *
 * <p>The log line and the event carry counts only: no question text, no reply,
 * and no address. A logged-out visitor is booked under one shared id, so the
 * analytics show the spend and never the person.
 */
@Slf4j
@Component
public class AssistantSpend {

    static final String ANONYMOUS = "anonymous";
    static final String EVENT = "ask_ai_answered";

    private final AssistantRateLimiter rateLimiter;
    private final PostHogService postHog;

    public AssistantSpend(AssistantRateLimiter rateLimiter, PostHogService postHog) {
        this.rateLimiter = rateLimiter;
        this.postHog = postHog;
    }

    /**
     * Records one answered question.
     *
     * @param reply     the answer Groq returned, with its token usage
     * @param language  "en", "fr" or "ta"
     * @param userId    the signed-in user, or null for a visitor
     * @param elapsedMs wall time of the model call
     */
    public void record(GroqReply reply, String language, UUID userId, long elapsedMs) {
        rateLimiter.charge(reply.totalTokens());
        boolean signedIn = userId != null;
        log.info("Ask AI: answered lang={} signedIn={} promptTokens={} completionTokens={} cachedTokens={} ms={}",
                language, signedIn, reply.promptTokens(), reply.completionTokens(), reply.cachedTokens(), elapsedMs);
        postHog.capture(signedIn ? userId.toString() : ANONYMOUS, EVENT, Map.of(
                "language", language,
                "signed_in", signedIn,
                "prompt_tokens", reply.promptTokens(),
                "completion_tokens", reply.completionTokens(),
                "cached_tokens", reply.cachedTokens(),
                "ms", elapsedMs));
    }
}
```

- [ ] **Step 4: Run the tests**

Run the header test command.
Expected: `Tests run: 59, Failures: 0`, BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/Projects/ToWin/.worktrees/ai-roadmap
git add backend/src/main/java/com/towinly/assistant/service/AssistantSpend.java \
        backend/src/test/java/com/towinly/assistant/service/AssistantSpendTest.java
git commit -m "feat: AssistantSpend books each Ask AI answer's tokens, log line and event"
```

### Task 4: `AssistantService` books every answered question

**Files:**
- Modify: `src/main/java/com/towinly/assistant/service/AssistantService.java`
- Modify: `src/test/java/com/towinly/assistant/service/AssistantLanguageTest.java`
- Modify: `src/test/java/com/towinly/assistant/service/AssistantServicePromptHardeningTest.java`
- Test: `src/test/java/com/towinly/assistant/service/AssistantServiceSpendTest.java`

- [ ] **Step 1: Write the failing test**

Create `src/test/java/com/towinly/assistant/service/AssistantServiceSpendTest.java`:

```java
package com.towinly.assistant.service;

import com.towinly.assistant.dto.ChatRequest;
import com.towinly.common.service.TrustScoreService;
import com.towinly.connection.repository.ConnectionRepository;
import com.towinly.need.repository.NeedRepository;
import com.towinly.profile.service.ProfileService;
import com.towinly.streak.service.StreakService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Every answer that reaches a person is booked; a failed call books nothing. */
class AssistantServiceSpendTest {

    private GroqClient groq;
    private AssistantSpend spend;
    private AssistantService service;

    @BeforeEach
    void setUp() {
        groq = mock(GroqClient.class);
        when(groq.isConfigured()).thenReturn(true);
        spend = mock(AssistantSpend.class);
        service = new AssistantService(
                groq,
                mock(ProfileService.class),
                mock(StreakService.class),
                mock(ConnectionRepository.class),
                mock(NeedRepository.class),
                mock(TrustScoreService.class),
                spend);
    }

    private static ChatRequest ask(String message) {
        ChatRequest r = new ChatRequest();
        r.setMessage(message);
        return r;
    }

    @Test
    void anAnsweredQuestion_isBookedWithItsTokensLanguageAndUser() {
        when(groq.complete(anyString(), any()))
                .thenReturn(Optional.of(new GroqReply("Bonjour.", 4000, 120, 3800)));
        UUID user = UUID.randomUUID();

        String reply = service.answer(ask("Quel est mon score?"), user, "fr");

        assertThat(reply).isEqualTo("Bonjour.");
        ArgumentCaptor<GroqReply> booked = ArgumentCaptor.forClass(GroqReply.class);
        verify(spend).record(booked.capture(), eq("fr"), eq(user), anyLong());
        assertThat(booked.getValue().totalTokens()).isEqualTo(4120);
    }

    @Test
    void aFailedCall_booksNothing() {
        when(groq.complete(anyString(), any())).thenReturn(Optional.empty());

        service.answer(ask("Hello"), null, "en");

        verify(spend, never()).record(any(), anyString(), any(), anyLong());
    }

    @Test
    void anUnreadableQuestion_neverReachesGroq_soBooksNothing() {
        service.answer(ask("​​"), null, "en");

        verify(groq, never()).complete(anyString(), any());
        verify(spend, never()).record(any(), anyString(), any(), anyLong());
    }
}
```

- [ ] **Step 2: Run to see it fail**

Run the header test command.
Expected: compilation error, no 7-argument `AssistantService` constructor.

- [ ] **Step 3: Give `AssistantService` the spend recorder**

In `AssistantService.java`:

After `private final TrustScoreService trustScoreService;` add:

```java
    private final AssistantSpend spend;
```

Change the constructor signature and body:

```java
    public AssistantService(GroqClient groqClient,
                            ProfileService profileService,
                            StreakService streakService,
                            ConnectionRepository connectionRepository,
                            NeedRepository needRepository,
                            TrustScoreService trustScoreService,
                            AssistantSpend spend) {
        this.groqClient = groqClient;
        this.profileService = profileService;
        this.streakService = streakService;
        this.connectionRepository = connectionRepository;
        this.needRepository = needRepository;
        this.trustScoreService = trustScoreService;
        this.spend = spend;
```

Replace the bridge from Task 1 (the last two lines of `answer(...)`):

```java
        Optional<GroqReply> reply = groqClient.complete(systemPrompt, conversation);
        return reply.map(GroqReply::text).orElse(CANNED.get("fallback").get(lang));
```

with:

```java
        long started = System.nanoTime();
        Optional<GroqReply> reply = groqClient.complete(systemPrompt, conversation);
        if (reply.isEmpty()) {
            return CANNED.get("fallback").get(lang);
        }
        spend.record(reply.get(), lang, userId, (System.nanoTime() - started) / 1_000_000);
        return reply.get().text();
```

- [ ] **Step 4: Update the two existing tests' constructors**

In `AssistantLanguageTest.java` and `AssistantServicePromptHardeningTest.java`, the `setUp` constructs `new AssistantService(groq, mock(ProfileService.class), ..., mock(TrustScoreService.class));`. Add one more argument at the end of each call:

```java
                mock(TrustScoreService.class),
                mock(AssistantSpend.class));
```

- [ ] **Step 5: Run the tests**

Run the header test command.
Expected: `Tests run: 62, Failures: 0`, BUILD SUCCESS.

- [ ] **Step 6: Commit**

```bash
cd ~/Documents/Projects/ToWin/.worktrees/ai-roadmap
git add backend/src/main/java/com/towinly/assistant/service/AssistantService.java \
        backend/src/test/java/com/towinly/assistant/service/AssistantServiceSpendTest.java \
        backend/src/test/java/com/towinly/assistant/service/AssistantLanguageTest.java \
        backend/src/test/java/com/towinly/assistant/service/AssistantServicePromptHardeningTest.java
git commit -m "feat: Ask AI books every answered question"
```

### Task 5: Configuration and the whole backend suite

**Files:**
- Modify: `src/main/resources/application.yml` (the `assistant:` block, around line 138)

- [ ] **Step 1: Add the token ceiling to configuration**

Replace the `assistant:` block in `application.yml`:

```yaml
assistant:
  max-calls-per-day: ${ASSISTANT_MAX_CALLS_PER_DAY:2000}
  # Tokens are what Groq bills. A Tamil or French day costs two to four times the
  # tokens of an English one for the same characters, so this is the ceiling that
  # tracks the bill, and the one to set from the plan's daily token limit in the
  # Groq console. Each answer's tokens are logged ("Ask AI: answered ...") and
  # sent to PostHog as ask_ai_answered.
  max-tokens-per-day: ${ASSISTANT_MAX_TOKENS_PER_DAY:2000000}
```

- [ ] **Step 2: Run the whole backend test suite**

```bash
cd ~/Documents/Projects/ToWin/.worktrees/ai-roadmap/backend
caffeinate -i ./mvnw test 2>&1 | grep -E 'Tests run:.*Fail|BUILD|ERROR\]' | tail -15
```

Expected: the last `Tests run:` line shows `Failures: 0, Errors: 0` and BUILD SUCCESS. DB-gated tests show as Skipped (no `TOWINLY_DB_TESTS`). If any test outside `assistant` fails, read its output before touching anything: it is either pre-existing (confirm by running the same test on `origin/main`) or caused by the constructor change in a test that builds `AssistantService` reflectively.

- [ ] **Step 3: Commit**

```bash
cd ~/Documents/Projects/ToWin/.worktrees/ai-roadmap
git add backend/src/main/resources/application.yml
git commit -m "chore: ASSISTANT_MAX_TOKENS_PER_DAY, the Ask AI spend ceiling in tokens"
```

- [ ] **Step 4: Mark step 1 done in the queue**

In `App/tasks/todo.md`, change `1. [ ] Step 1` to `1. [x] Step 1` and append the commit hashes. Commit that file alone in the App repo:

```bash
cd "/Users/aghar/Documents/Projects/ToWin App/App"
git add tasks/todo.md
git commit -m "docs: AI roadmap step 1 done"
```

---

## Done when

- `GroqClient.complete` returns `Optional<GroqReply>`; `GroqClient.parse` has 5 tests.
- `AssistantRateLimiter` refuses at `assistant.max-tokens-per-day` and refills with the day; `charge` is called once per answer.
- One INFO line and one `ask_ai_answered` event per answered question, counts only.
- Targeted suite: 62 tests green. Full backend suite green (DB tests skipped).
- Four commits on `ai/ask-ai-roadmap`, nothing pushed.
