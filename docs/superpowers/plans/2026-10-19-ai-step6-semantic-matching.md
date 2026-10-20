# AI Step 6: Semantic Matching in Discovery Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan (subagents are off in this project unless the owner asks). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A help request like "someone to walk with me to the pharmacy on Tuesdays" finds helpers whose profile says they like walks and errands, and a helper browsing requests sees the ones that fit them first, without any new screen.

**Architecture:** Profiles and help requests get an embedding each, kept in two small pgvector tables and refreshed only when the text changes (hash compare). Discovery keeps every filter it has today (radius, blocks, language, interest) and keeps distance as the base order; a cosine similarity term then lifts a good match by up to five kilometres of closeness. Everything is a no-op without an embeddings key, and every lookup degrades to the current order on any failure.

**Tech Stack:** Spring Boot 3.5, JdbcTemplate, pgvector (installed by V62), `EmbeddingClient` from step 5, JUnit 5 + Mockito. Repo: `~/Documents/Projects/ToWin/.worktrees/ai-roadmap`, branch `ai/ask-ai-roadmap`; paths relative to `backend/`.

Spec: `App/docs/superpowers/specs/2026-10-19-ai-roadmap-design.md`, section "Step 6". Steps 1 to 5 are on the branch.

Facts from the code (2026-10-19): `DiscoveryService.rankElders` and `rankHelpers` sort by distance only (trust is shown, not ranked). `NeedService.browseNearby` sorts open requests by distance only. All three services use Lombok `@RequiredArgsConstructor`; `DiscoveryServiceTest` and `ProfileServiceTest` use `@InjectMocks`, `NeedServiceTest` and `NeedOnBehalfTest` build `NeedService` by hand with 12 arguments. Mockito returns an empty `Optional` and an empty `Map` from an unstubbed mock, which this design relies on so the fifty existing discovery tests need no stubs. The `needs` table has `elder_id`, `status` (enum `need_status`) and `created_at`.

Test command (targeted):

```bash
cd ~/Documents/Projects/ToWin/.worktrees/ai-roadmap/backend
caffeinate -i ./mvnw -Dtest='Embedding*,Discovery*,NeedService*,NeedOnBehalf*,ProfileService*' -Dsurefire.failIfNoSpecifiedTests=false test 2>&1 | grep -E 'Tests run:|BUILD|ERROR\]' | tail -14
```

Baseline before this plan: run it once and note the count (the discovery, need and profile suites plus `EmbeddingClientParseTest`).

The blend, in one line: `key = distanceKm - 5.0 × similarity`. Cosine similarity from `text-embedding-3-small` runs about 0.2 for unrelated text and 0.6 for a close match, so a close match at 6 km sorts like a stranger at 3 km. A candidate with no embedding has similarity 0 and keeps its place. The distance the app shows is untouched; only the order changes.

---

## File structure

| File | Change | One job |
|---|---|---|
| `src/main/resources/db/migration/V63__create_profile_and_need_embeddings.sql` | create | The two tables |
| `src/main/java/com/towinly/embedding/EmbeddingClient.java` | modify | `fromVectorLiteral` to read a vector back |
| `src/main/java/com/towinly/embedding/EmbeddingText.java` | create | Profile and request as one short paragraph |
| `src/main/java/com/towinly/embedding/EmbeddingStore.java` | create | JdbcTemplate: hashes, upsert, vector, similarity, latest open need |
| `src/main/java/com/towinly/embedding/EmbeddingIndex.java` | create | Refresh on change, batch refresh, the blend |
| `src/main/java/com/towinly/embedding/EmbeddingBackfill.java` | create | Boot-time catch-up, capped |
| `src/main/java/com/towinly/profile/service/ProfileService.java` | modify | Refresh after a profile save |
| `src/main/java/com/towinly/need/service/NeedService.java` | modify | Refresh after a request is posted; match order in `browseNearby` |
| `src/main/java/com/towinly/discovery/service/DiscoveryService.java` | modify | Match order in both discover lists |
| tests: `EmbeddingTextTest`, `EmbeddingIndexTest`, `EmbeddingBackfillTest`, `EmbeddingStoreDbTest` (gated) | create | |
| tests: `DiscoveryServiceTest`, `ProfileServiceTest` (`@Mock EmbeddingIndex`), `NeedServiceTest`, `NeedOnBehalfTest` (13th argument) | modify | |

---

## Chunk 1: Text, tables, store

### Task 1: `EmbeddingText`

**Files:**
- Create: `src/main/java/com/towinly/embedding/EmbeddingText.java`
- Test: `src/test/java/com/towinly/embedding/EmbeddingTextTest.java`

- [ ] **Step 1: Write the failing test**

```java
package com.towinly.embedding;

import com.towinly.common.enums.NeedCategory;
import com.towinly.need.entity.Need;
import com.towinly.profile.entity.ElderProfile;
import com.towinly.profile.entity.HelperProfile;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** One short paragraph per person or request, with empty fields left out. */
class EmbeddingTextTest {

    @Test
    void anElder_isRoleBioInterestsLanguagesOccupation() {
        ElderProfile p = ElderProfile.builder().bio("I like a slow walk and a chat.")
                .interests(new String[] {"Reading", "Gardening"}).languages(new String[] {"English", "French"})
                .occupation("Retired teacher").build();

        assertThat(EmbeddingText.forElder(p)).isEqualTo(
                "Elder. About: I like a slow walk and a chat. Interests: Reading, Gardening. "
                + "Languages: English, French. Occupation: Retired teacher.");
    }

    @Test
    void aHelper_isRoleBioSkillsHobbiesLanguagesOccupation() {
        HelperProfile p = HelperProfile.builder().bio("Student, free on weekends.")
                .skillsOffered(new String[] {"Driving", "Errands"}).hobbies(new String[] {"Walking"})
                .languages(new String[] {"English"}).build();

        assertThat(EmbeddingText.forHelper(p)).isEqualTo(
                "Helper. About: Student, free on weekends. Can help with: Driving, Errands. "
                + "Hobbies: Walking. Languages: English.");
    }

    @Test
    void aRequest_isTitleDescriptionCategory() {
        Need n = Need.builder().title("A ride to the clinic").description("Tuesday at 9, back by 11.")
                .category(NeedCategory.TRANSPORTATION).build();

        assertThat(EmbeddingText.forNeed(n)).isEqualTo(
                "Help request: A ride to the clinic. Tuesday at 9, back by 11. Category: transportation.");
    }

    @Test
    void emptyFields_areLeftOut_andNothingIsNull() {
        assertThat(EmbeddingText.forElder(ElderProfile.builder().build())).isEqualTo("Elder.");
        assertThat(EmbeddingText.forHelper(HelperProfile.builder().bio("  ").build())).isEqualTo("Helper.");
        assertThat(EmbeddingText.forNeed(Need.builder().title("Groceries").build())).isEqualTo("Help request: Groceries.");
    }
}
```

- [ ] **Step 2: Run to see it fail** (compilation error, `EmbeddingText`).

- [ ] **Step 3: Write `EmbeddingText`**

```java
package com.towinly.embedding;

import com.towinly.need.entity.Need;
import com.towinly.profile.entity.ElderProfile;
import com.towinly.profile.entity.HelperProfile;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * The words that get embedded for a person or a request: one short paragraph,
 * same shape every time, so two profiles that say the same thing land near each
 * other. Location is left out on purpose; distance is ranked separately.
 */
public final class EmbeddingText {

    private EmbeddingText() {}

    public static String forElder(ElderProfile p) {
        List<String> parts = new ArrayList<>();
        parts.add("Elder.");
        add(parts, "About", p.getBio());
        add(parts, "Interests", join(p.getInterests()));
        add(parts, "Languages", join(p.getLanguages()));
        add(parts, "Occupation", p.getOccupation());
        return String.join(" ", parts);
    }

    public static String forHelper(HelperProfile p) {
        List<String> parts = new ArrayList<>();
        parts.add("Helper.");
        add(parts, "About", p.getBio());
        add(parts, "Can help with", join(p.getSkillsOffered()));
        add(parts, "Hobbies", join(p.getHobbies()));
        add(parts, "Languages", join(p.getLanguages()));
        add(parts, "Occupation", p.getOccupation());
        return String.join(" ", parts);
    }

    public static String forNeed(Need n) {
        List<String> parts = new ArrayList<>();
        parts.add("Help request: " + clean(n.getTitle()) + ".");
        if (!clean(n.getDescription()).isEmpty()) parts.add(sentence(n.getDescription()));
        if (n.getCategory() != null) parts.add("Category: " + n.getCategory().name().toLowerCase(Locale.ROOT) + ".");
        return String.join(" ", parts);
    }

    private static void add(List<String> parts, String label, String value) {
        String v = clean(value);
        if (!v.isEmpty()) parts.add(label + ": " + sentence(v));
    }

    private static String join(String[] values) {
        if (values == null) return "";
        List<String> kept = new ArrayList<>();
        for (String v : values) if (!clean(v).isEmpty()) kept.add(clean(v));
        return String.join(", ", kept);
    }

    private static String clean(String s) {
        return s == null ? "" : s.trim();
    }

    /** Ends with one full stop, whatever the writer typed. */
    private static String sentence(String s) {
        String t = clean(s);
        while (t.endsWith(".")) t = t.substring(0, t.length() - 1).trim();
        return t + ".";
    }
}
```

- [ ] **Step 4: Run the tests** (4 pass). **Step 5: Commit** `feat: EmbeddingText, the paragraph that stands for a person or a request`.

### Task 2: Migration V63 and `EmbeddingStore`

**Files:**
- Create: `src/main/resources/db/migration/V63__create_profile_and_need_embeddings.sql`
- Modify: `src/main/java/com/towinly/embedding/EmbeddingClient.java` (`fromVectorLiteral`)
- Create: `src/main/java/com/towinly/embedding/EmbeddingStore.java`
- Test: `src/test/java/com/towinly/embedding/EmbeddingClientParseTest.java` (one test for `fromVectorLiteral`)
- Test (gated): `src/test/java/com/towinly/embedding/EmbeddingStoreDbTest.java`

- [ ] **Step 1: Add the failing literal test** to `EmbeddingClientParseTest`:

```java
    @Test
    void vectorLiteral_roundTrips() {
        float[] v = {0.1f, -2f, 3.25f};
        assertThat(EmbeddingClient.fromVectorLiteral(EmbeddingClient.toVectorLiteral(v))).containsExactly(v);
        assertThat(EmbeddingClient.fromVectorLiteral("[1,2]")).containsExactly(1f, 2f);
    }
```

- [ ] **Step 2: Run to see it fail.** **Step 3: Add to `EmbeddingClient`:**

```java
    /** The reverse of {@link #toVectorLiteral}: what {@code embedding::text} gives back. */
    public static float[] fromVectorLiteral(String literal) {
        String inner = literal.trim();
        inner = inner.substring(1, inner.length() - 1);
        if (inner.isBlank()) return new float[0];
        String[] parts = inner.split(",");
        float[] v = new float[parts.length];
        for (int i = 0; i < parts.length; i++) v[i] = Float.parseFloat(parts[i].trim());
        return v;
    }
```

- [ ] **Step 4: The migration**

```sql
-- Semantic matching in discovery: every profile and every help request gets one
-- embedding, refreshed only when its text changes (content_hash). The extension
-- is installed by V62.
CREATE TABLE profile_embeddings (
    user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    content_hash  TEXT NOT NULL,
    embedding     vector(1536) NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE need_embeddings (
    need_id       UUID PRIMARY KEY REFERENCES needs(id) ON DELETE CASCADE,
    content_hash  TEXT NOT NULL,
    embedding     vector(1536) NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- [ ] **Step 5: Write `EmbeddingStore`**

```java
package com.towinly.embedding;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** The two embedding tables, through plain SQL. One shape for profiles and requests. */
@Component
public class EmbeddingStore {

    public enum Kind {
        PROFILES("profile_embeddings", "user_id"),
        NEEDS("need_embeddings", "need_id");

        final String table;
        final String idColumn;

        Kind(String table, String idColumn) {
            this.table = table;
            this.idColumn = idColumn;
        }
    }

    private final JdbcTemplate jdbc;

    public EmbeddingStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Every stored id with its content hash. */
    public Map<UUID, String> hashes(Kind kind) {
        Map<UUID, String> out = new HashMap<>();
        jdbc.query("SELECT " + kind.idColumn + ", content_hash FROM " + kind.table,
                rs -> { out.put(UUID.fromString(rs.getString(1)), rs.getString(2)); });
        return out;
    }

    public void upsert(Kind kind, UUID id, String hash, float[] embedding) {
        jdbc.update("INSERT INTO " + kind.table + " (" + kind.idColumn + ", content_hash, embedding, updated_at) "
                        + "VALUES (?, ?, ?::vector, now()) ON CONFLICT (" + kind.idColumn + ") DO UPDATE SET "
                        + "content_hash = EXCLUDED.content_hash, embedding = EXCLUDED.embedding, updated_at = now()",
                id, hash, EmbeddingClient.toVectorLiteral(embedding));
    }

    public Optional<float[]> vector(Kind kind, UUID id) {
        List<String> rows = jdbc.queryForList(
                "SELECT embedding::text FROM " + kind.table + " WHERE " + kind.idColumn + " = ?", String.class, id);
        return rows.isEmpty() ? Optional.empty() : Optional.of(EmbeddingClient.fromVectorLiteral(rows.get(0)));
    }

    /** The embedding of the elder's newest open request, if it has one. */
    public Optional<float[]> latestOpenNeedVector(UUID elderId) {
        List<String> rows = jdbc.queryForList(
                "SELECT ne.embedding::text FROM need_embeddings ne JOIN needs n ON n.id = ne.need_id "
                        + "WHERE n.elder_id = ? AND n.status = 'OPEN' ORDER BY n.created_at DESC LIMIT 1",
                String.class, elderId);
        return rows.isEmpty() ? Optional.empty() : Optional.of(EmbeddingClient.fromVectorLiteral(rows.get(0)));
    }

    /** Cosine similarity of the query to each listed id; ids without a row are absent. */
    public Map<UUID, Double> similarity(Kind kind, float[] query, Collection<UUID> ids) {
        if (ids.isEmpty()) return Map.of();
        String placeholders = String.join(",", Collections.nCopies(ids.size(), "?"));
        Object[] args = new Object[ids.size() + 1];
        args[0] = EmbeddingClient.toVectorLiteral(query);
        int i = 1;
        for (UUID id : ids) args[i++] = id;
        Map<UUID, Double> out = new HashMap<>();
        jdbc.query("SELECT " + kind.idColumn + ", 1 - (embedding <=> ?::vector) AS sim FROM " + kind.table
                        + " WHERE " + kind.idColumn + " IN (" + placeholders + ")",
                rs -> { out.put(UUID.fromString(rs.getString(1)), rs.getDouble(2)); }, args);
        return out;
    }
}
```

Postgres returns UUID columns as `java.util.UUID` objects through the driver; `rs.getString` on them gives the canonical text, which `UUID.fromString` reads. If the gated test shows otherwise, use `rs.getObject(1, UUID.class)`.

- [ ] **Step 6: The gated DB test**

```java
package com.towinly.embedding;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/** Upsert, read back, and similarity on a real Postgres with pgvector. Gated on TOWINLY_DB_TESTS. */
@SpringBootTest(properties = "embeddings.api-key=")
@EnabledIfEnvironmentVariable(named = "TOWINLY_DB_TESTS", matches = "true")
class EmbeddingStoreDbTest {

    @Autowired private EmbeddingStore store;
    @Autowired private JdbcTemplate jdbc;

    private UUID user;

    private static float[] unit(int hot) {
        float[] v = new float[1536];
        v[hot] = 1f;
        return v;
    }

    @BeforeEach
    void aUserToHangTheRowOn() {
        user = UUID.randomUUID();
        jdbc.update("INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, 'ELDER')",
                user, "emb-" + user, user + "@example.test", "x");
    }

    @Test
    void upsertReadBackAndSimilarity() {
        store.upsert(EmbeddingStore.Kind.PROFILES, user, "h1", unit(0));
        assertThat(store.hashes(EmbeddingStore.Kind.PROFILES)).containsEntry(user, "h1");
        assertThat(store.vector(EmbeddingStore.Kind.PROFILES, user)).isPresent();

        store.upsert(EmbeddingStore.Kind.PROFILES, user, "h2", unit(1));
        assertThat(store.hashes(EmbeddingStore.Kind.PROFILES)).containsEntry(user, "h2");

        assertThat(store.similarity(EmbeddingStore.Kind.PROFILES, unit(1), List.of(user)).get(user))
                .isCloseTo(1.0, within(0.001));
        assertThat(store.similarity(EmbeddingStore.Kind.PROFILES, unit(0), List.of(user)).get(user))
                .isCloseTo(0.0, within(0.001));
        jdbc.update("DELETE FROM users WHERE id = ?", user);
    }
}
```

Check the `users` insert against V1 (column names and NOT NULL columns) before relying on it; adjust the test's insert, not the schema.

- [ ] **Step 7: Run the tests** (literal test passes; DB test skipped). **Step 8: Commit** `feat: profile and need embedding tables and their store`.

## Chunk 2: The index and the blend

### Task 3: `EmbeddingIndex`

**Files:**
- Create: `src/main/java/com/towinly/embedding/EmbeddingIndex.java`
- Test: `src/test/java/com/towinly/embedding/EmbeddingIndexTest.java`

- [ ] **Step 1: Write the failing tests**

```java
package com.towinly.embedding;

import com.towinly.assistant.guide.GuideChunk;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static com.towinly.embedding.EmbeddingStore.Kind.NEEDS;
import static com.towinly.embedding.EmbeddingStore.Kind.PROFILES;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Refresh only on change; the blend lifts a match by up to five kilometres; nothing without a key. */
class EmbeddingIndexTest {

    private static final UUID ME = UUID.randomUUID();
    private static final UUID NEAR = UUID.randomUUID();
    private static final UUID FAR = UUID.randomUUID();

    private EmbeddingClient client;
    private EmbeddingStore store;
    private EmbeddingIndex index;

    @BeforeEach
    void setUp() {
        client = mock(EmbeddingClient.class);
        when(client.isConfigured()).thenReturn(true);
        store = mock(EmbeddingStore.class);
        index = new EmbeddingIndex(client, store);
    }

    @Test
    void refreshProfile_skipsAnUnchangedText() {
        String text = "Elder. About: walks.";
        when(store.hashes(PROFILES)).thenReturn(Map.of(ME, GuideChunk.sha256(text)));

        index.refreshProfile(ME, text);

        verify(client, never()).embedOne(anyString());
        verify(store, never()).upsert(any(), any(), anyString(), any());
    }

    @Test
    void refreshProfile_embedsAndUpsertsAChangedText() {
        when(store.hashes(PROFILES)).thenReturn(Map.of(ME, "old"));
        when(client.embedOne("Elder. About: walks.")).thenReturn(Optional.of(new float[] {1f}));

        index.refreshProfile(ME, "Elder. About: walks.");

        verify(store).upsert(eq(PROFILES), eq(ME), eq(GuideChunk.sha256("Elder. About: walks.")), any());
    }

    @Test
    void refreshNeed_leavesTheRowAlone_whenTheCallFails() {
        when(store.hashes(NEEDS)).thenReturn(Map.of());
        when(client.embedOne(anyString())).thenReturn(Optional.empty());

        index.refreshNeed(ME, "Help request: Groceries.");

        verify(store, never()).upsert(any(), any(), anyString(), any());
    }

    @Test
    void withoutAKey_nothingIsReadOrWritten() {
        when(client.isConfigured()).thenReturn(false);

        index.refreshProfile(ME, "x");
        assertThat(index.queryVectorForElder(ME)).isEmpty();
        assertThat(index.similarity(PROFILES, new float[] {1f}, List.of(NEAR))).isEmpty();

        verify(store, never()).hashes(any());
    }

    @Test
    void refreshMany_embedsOnlyChangedTexts_inBatches_upToTheCap() {
        Map<UUID, String> texts = new LinkedHashMap<>();
        for (int i = 0; i < 150; i++) texts.put(UUID.randomUUID(), "Helper. About: " + i + ".");
        UUID unchanged = texts.keySet().iterator().next();
        when(store.hashes(PROFILES)).thenReturn(Map.of(unchanged, GuideChunk.sha256(texts.get(unchanged))));
        when(client.embed(anyList())).thenAnswer(inv -> {
            List<String> batch = inv.getArgument(0);
            return Optional.of(batch.stream().map(t -> new float[] {1f}).toList());
        });

        int done = index.refreshMany(PROFILES, texts, 120);

        assertThat(done).isEqualTo(120);
        verify(client, org.mockito.Mockito.times(2)).embed(anyList());
        verify(store, never()).upsert(eq(PROFILES), eq(unchanged), anyString(), any());
    }

    @Test
    void queryVectorForElder_prefersTheOpenRequest_thenTheProfile() {
        when(store.latestOpenNeedVector(ME)).thenReturn(Optional.of(new float[] {2f}));
        assertThat(index.queryVectorForElder(ME).orElseThrow()).containsExactly(2f);

        when(store.latestOpenNeedVector(ME)).thenReturn(Optional.empty());
        when(store.vector(PROFILES, ME)).thenReturn(Optional.of(new float[] {3f}));
        assertThat(index.queryVectorForElder(ME).orElseThrow()).containsExactly(3f);
    }

    @Test
    void aStoreError_readsAsNoMatch() {
        when(store.similarity(any(), any(), any())).thenThrow(new IllegalStateException("down"));

        assertThat(index.similarity(PROFILES, new float[] {1f}, List.of(NEAR))).isEmpty();
    }

    @Test
    void byMatch_liftsAGoodMatchByUpToFiveKilometres_andKeepsDistance() {
        List<Map.Entry<UUID, Double>> byDistance = List.of(Map.entry(NEAR, 3.0), Map.entry(FAR, 6.0));

        List<Map.Entry<UUID, Double>> ordered = EmbeddingIndex.byMatch(byDistance, Map.of(FAR, 0.7, NEAR, 0.1),
                Map.Entry::getKey, Map.Entry::getValue);

        assertThat(ordered).extracting(Map.Entry::getKey).containsExactly(FAR, NEAR);
        assertThat(ordered.get(0).getValue()).isEqualTo(6.0);
        assertThat(EmbeddingIndex.byMatch(byDistance, Map.of(), Map.Entry::getKey, Map.Entry::getValue))
                .isEqualTo(byDistance);
    }

    @Test
    void rankKey_isDistanceMinusFiveTimesSimilarity() {
        assertThat(EmbeddingIndex.rankKey(6.0, 0.7)).isEqualTo(2.5);
        assertThat(EmbeddingIndex.rankKey(3.0, null)).isEqualTo(3.0);
    }
}
```

- [ ] **Step 2: Run to see them fail.** **Step 3: Write `EmbeddingIndex`:**

```java
package com.towinly.embedding;

import com.towinly.assistant.guide.GuideChunk;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.function.ToDoubleFunction;

/**
 * Keeps one embedding per profile and per help request, refreshed only when the
 * text behind it changes, and turns similarity into a small lift in the distance
 * order. Every method is a no-op without an embeddings key, and every lookup
 * reads as "no match" on a failure, so discovery can never break because of this.
 */
@Slf4j
@Component
public class EmbeddingIndex {

    /** A perfect match is worth this much closeness: 6 km with a strong match sorts like 3 km. */
    public static final double MATCH_WORTH_KM = 5.0;

    private final EmbeddingClient client;
    private final EmbeddingStore store;

    public EmbeddingIndex(EmbeddingClient client, EmbeddingStore store) {
        this.client = client;
        this.store = store;
    }

    public void refreshProfile(UUID userId, String text) {
        refreshOne(EmbeddingStore.Kind.PROFILES, userId, text);
    }

    public void refreshNeed(UUID needId, String text) {
        refreshOne(EmbeddingStore.Kind.NEEDS, needId, text);
    }

    private void refreshOne(EmbeddingStore.Kind kind, UUID id, String text) {
        if (!client.isConfigured()) return;
        try {
            String hash = GuideChunk.sha256(text);
            if (hash.equals(store.hashes(kind).get(id))) return;
            client.embedOne(text).ifPresent(v -> store.upsert(kind, id, hash, v));
        } catch (Exception e) {
            log.warn("Embedding refresh ({}, {}) failed: {}", kind, id, e.getMessage());
        }
    }

    /**
     * Embeds every text whose hash differs from the stored one, in batches, at most
     * {@code cap} of them. Returns how many were written. Used by the boot backfill.
     */
    public int refreshMany(EmbeddingStore.Kind kind, Map<UUID, String> texts, int cap) {
        if (!client.isConfigured() || texts.isEmpty()) return 0;
        Map<UUID, String> stored = store.hashes(kind);
        List<UUID> ids = new ArrayList<>();
        List<String> hashes = new ArrayList<>();
        List<String> pending = new ArrayList<>();
        for (Map.Entry<UUID, String> e : texts.entrySet()) {
            if (ids.size() >= cap) break;
            String hash = GuideChunk.sha256(e.getValue());
            if (hash.equals(stored.get(e.getKey()))) continue;
            ids.add(e.getKey());
            hashes.add(hash);
            pending.add(e.getValue());
        }
        int written = 0;
        for (int from = 0; from < ids.size(); from += EmbeddingClient.MAX_BATCH) {
            int to = Math.min(from + EmbeddingClient.MAX_BATCH, ids.size());
            Optional<List<float[]>> vectors = client.embed(pending.subList(from, to));
            if (vectors.isEmpty()) {
                log.warn("Embedding backfill ({}): a batch failed; stopping this pass", kind);
                break;
            }
            for (int i = from; i < to; i++) {
                store.upsert(kind, ids.get(i), hashes.get(i), vectors.get().get(i - from));
                written++;
            }
        }
        return written;
    }

    /** What an elder is looking for: their newest open request, or failing that, themselves. */
    public Optional<float[]> queryVectorForElder(UUID elderId) {
        if (!client.isConfigured()) return Optional.empty();
        try {
            Optional<float[]> need = store.latestOpenNeedVector(elderId);
            return need.isPresent() ? need : store.vector(EmbeddingStore.Kind.PROFILES, elderId);
        } catch (Exception e) {
            log.warn("Embedding query for {} failed: {}", elderId, e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<float[]> profileVector(UUID userId) {
        if (!client.isConfigured()) return Optional.empty();
        try {
            return store.vector(EmbeddingStore.Kind.PROFILES, userId);
        } catch (Exception e) {
            log.warn("Embedding read for {} failed: {}", userId, e.getMessage());
            return Optional.empty();
        }
    }

    /** Similarity per id, or an empty map when off or on any failure (then nothing moves). */
    public Map<UUID, Double> similarity(EmbeddingStore.Kind kind, float[] query, Collection<UUID> ids) {
        if (!client.isConfigured() || ids.isEmpty()) return Map.of();
        try {
            return store.similarity(kind, query, ids);
        } catch (Exception e) {
            log.warn("Embedding similarity ({}) failed: {}", kind, e.getMessage());
            return Map.of();
        }
    }

    /** Distance minus the lift; a missing similarity lifts nothing. */
    public static double rankKey(double distanceKm, Double similarity) {
        return distanceKm - MATCH_WORTH_KM * (similarity == null ? 0.0 : similarity);
    }

    /**
     * Re-orders a distance-sorted list by {@link #rankKey}. Stable, so two equal keys
     * keep their distance order. The elements and their distances are unchanged.
     */
    public static <T> List<T> byMatch(List<T> byDistance, Map<UUID, Double> similarity,
                                      Function<T, UUID> idOf, ToDoubleFunction<T> distanceOf) {
        if (similarity.isEmpty()) return byDistance;
        List<T> ordered = new ArrayList<>(byDistance);
        ordered.sort(Comparator.comparingDouble(t -> rankKey(distanceOf.applyAsDouble(t), similarity.get(idOf.apply(t)))));
        return ordered;
    }
}
```

- [ ] **Step 4: Run the tests** (9 pass). **Step 5: Commit** `feat: EmbeddingIndex, refresh on change and the match lift`.

### Task 4: `EmbeddingBackfill`

**Files:**
- Create: `src/main/java/com/towinly/embedding/EmbeddingBackfill.java`
- Test: `src/test/java/com/towinly/embedding/EmbeddingBackfillTest.java`

- [ ] **Step 1: Write the failing test**

```java
package com.towinly.embedding;

import com.towinly.common.entity.User;
import com.towinly.common.enums.NeedCategory;
import com.towinly.common.enums.NeedStatus;
import com.towinly.need.entity.Need;
import com.towinly.need.repository.NeedRepository;
import com.towinly.profile.entity.ElderProfile;
import com.towinly.profile.entity.HelperProfile;
import com.towinly.profile.repository.ElderProfileRepository;
import com.towinly.profile.repository.HelperProfileRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** At boot, every profile and every open request is offered to the index, once, capped. */
class EmbeddingBackfillTest {

    @SuppressWarnings("unchecked")
    @Test
    void offersProfilesAndOpenNeeds_asTexts() {
        ElderProfileRepository elders = mock(ElderProfileRepository.class);
        HelperProfileRepository helpers = mock(HelperProfileRepository.class);
        NeedRepository needs = mock(NeedRepository.class);
        EmbeddingIndex index = mock(EmbeddingIndex.class);
        UUID e = UUID.randomUUID();
        UUID h = UUID.randomUUID();
        UUID n = UUID.randomUUID();
        when(elders.findAll()).thenReturn(List.of(ElderProfile.builder().user(User.builder().id(e).build()).bio("walks").build()));
        when(helpers.findAll()).thenReturn(List.of(HelperProfile.builder().user(User.builder().id(h).build()).bio("errands").build()));
        when(needs.findByStatusOrderByCreatedAtDesc(NeedStatus.OPEN)).thenReturn(List.of(
                Need.builder().id(n).title("Groceries").category(NeedCategory.ERRANDS).build()));

        new EmbeddingBackfill(elders, helpers, needs, index).run(null);

        ArgumentCaptor<Map<UUID, String>> profiles = ArgumentCaptor.forClass(Map.class);
        verify(index).refreshMany(eq(EmbeddingStore.Kind.PROFILES), profiles.capture(), anyInt());
        assertThat(profiles.getValue()).containsEntry(e, "Elder. About: walks.").containsEntry(h, "Helper. About: errands.");
        ArgumentCaptor<Map<UUID, String>> requests = ArgumentCaptor.forClass(Map.class);
        verify(index).refreshMany(eq(EmbeddingStore.Kind.NEEDS), requests.capture(), anyInt());
        assertThat(requests.getValue()).containsEntry(n, "Help request: Groceries. Category: errands.");
    }
}
```

`ElderProfile.user` and `HelperProfile.user` are the owning `User`; check the builder field name (`user`) in the entities.

- [ ] **Step 2: Run to see it fail.** **Step 3: Write `EmbeddingBackfill`:**

```java
package com.towinly.embedding;

import com.towinly.common.enums.NeedStatus;
import com.towinly.need.repository.NeedRepository;
import com.towinly.profile.repository.ElderProfileRepository;
import com.towinly.profile.repository.HelperProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Boot-time catch-up: profiles and open requests that have no embedding yet, or
 * whose text changed while embeddings were off, get one now. Capped per boot so
 * a first run can never become a runaway bill; the rest follow on the next boot
 * or on their next edit. A no-op without a key.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmbeddingBackfill implements ApplicationRunner {

    static final int CAP_PER_BOOT = 500;

    private final ElderProfileRepository elderProfiles;
    private final HelperProfileRepository helperProfiles;
    private final NeedRepository needs;
    private final EmbeddingIndex index;

    @Override
    public void run(ApplicationArguments args) {
        try {
            Map<UUID, String> profiles = new LinkedHashMap<>();
            elderProfiles.findAll().forEach(p -> profiles.put(p.getUser().getId(), EmbeddingText.forElder(p)));
            helperProfiles.findAll().forEach(p -> profiles.put(p.getUser().getId(), EmbeddingText.forHelper(p)));
            int wroteProfiles = index.refreshMany(EmbeddingStore.Kind.PROFILES, profiles, CAP_PER_BOOT);

            Map<UUID, String> requests = new LinkedHashMap<>();
            needs.findByStatusOrderByCreatedAtDesc(NeedStatus.OPEN).forEach(n -> requests.put(n.getId(), EmbeddingText.forNeed(n)));
            int wroteNeeds = index.refreshMany(EmbeddingStore.Kind.NEEDS, requests, Math.max(0, CAP_PER_BOOT - wroteProfiles));

            if (wroteProfiles + wroteNeeds > 0) {
                log.info("Embedding backfill: {} profiles and {} requests embedded", wroteProfiles, wroteNeeds);
            }
        } catch (Exception e) {
            log.warn("Embedding backfill failed, discovery keeps its distance order: {}", e.getMessage());
        }
    }
}
```

- [ ] **Step 4: Run the tests.** **Step 5: Commit** `feat: EmbeddingBackfill embeds existing profiles and open requests at boot`.

## Chunk 3: Wiring into the services

### Task 5: Refresh on save, match on read

**Files:**
- Modify: `src/main/java/com/towinly/profile/service/ProfileService.java`
- Modify: `src/main/java/com/towinly/need/service/NeedService.java`
- Modify: `src/main/java/com/towinly/discovery/service/DiscoveryService.java`
- Modify: `src/test/java/com/towinly/profile/service/ProfileServiceTest.java` (`@Mock EmbeddingIndex embeddingIndex;` + one test)
- Modify: `src/test/java/com/towinly/discovery/service/DiscoveryServiceTest.java` (`@Mock EmbeddingIndex embeddingIndex;` + one test)
- Modify: `src/test/java/com/towinly/need/service/NeedServiceTest.java` and `NeedOnBehalfTest.java` (13th constructor argument `embeddingIndex`, a mock; one test in `NeedServiceTest`)

- [ ] **Step 1: The failing tests**

`ProfileServiceTest`: add the mock field beside the others, then (mirroring an existing elder-save test's arrangement):

```java
    @Test
    void savingAnElderProfile_refreshesItsEmbedding() {
        // arrange exactly as the existing createOrUpdateElderProfile test does, with a bio of "I like walks."
        ...
        profileService.createOrUpdateElderProfile(userId, request);

        verify(embeddingIndex).refreshProfile(eq(userId), contains("About: I like walks."));
    }
```

`DiscoveryServiceTest`: add the mock field, then (mirroring an existing `discoverHelpers` test that places two helpers at different distances):

```java
    @Test
    void aHelperWhoMatchesTheOpenRequest_isLiftedAboveACloserStranger() {
        // arrange two helpers as the existing distance tests do: nearId at ~1 km, farId at ~4 km
        when(embeddingIndex.queryVectorForElder(requesterId)).thenReturn(Optional.of(new float[] {1f}));
        when(embeddingIndex.similarity(eq(EmbeddingStore.Kind.PROFILES), any(), any()))
                .thenReturn(Map.of(farId, 0.8, nearId, 0.1));

        List<DiscoveredUserResponse> result = discoveryService.discoverHelpers(requesterId, filter);

        assertThat(result).extracting(DiscoveredUserResponse::getUserId).containsExactly(farId, nearId);
        assertThat(result.get(0).getDistanceKm()).isGreaterThan(result.get(1).getDistanceKm());
    }
```

`NeedServiceTest`: pass `embeddingIndex` (a `mock(EmbeddingIndex.class)` field) as the last constructor argument in both test classes, then:

```java
    @Test
    void browseNearby_liftsARequestThatFitsTheHelper() {
        // arrange two open needs with locations as browseNearby_hidesRequests... does, near and far
        when(embeddingIndex.profileVector(helper.getId())).thenReturn(Optional.of(new float[] {1f}));
        when(embeddingIndex.similarity(eq(EmbeddingStore.Kind.NEEDS), any(), any()))
                .thenReturn(Map.of(farNeed.getId(), 0.9));

        List<NeedResponse> result = needService.browseNearby(helper.getId(), null, null, 50.0, 0, 20);

        assertThat(result).extracting(NeedResponse::getId).containsExactly(farNeed.getId(), nearNeed.getId());
    }

    @Test
    void postingARequest_refreshesItsEmbedding() {
        // arrange as the existing postNeed test does, title "Groceries"
        needService.postNeed(elder.getId(), request);

        verify(embeddingIndex).refreshNeed(any(), contains("Help request: Groceries."));
    }
```

Read the neighbouring tests first and copy their arrangement; do not invent new builders. `DiscoveredUserResponse` field names: check `getUserId` and `getDistanceKm` in the DTO.

- [ ] **Step 2: Run to see them fail.** **Step 3: Wire the services**

`ProfileService`: add `private final EmbeddingIndex embeddingIndex;` as the last final field (Lombok appends it to the constructor). After `elderProfileRepository.save(profile);` add `embeddingIndex.refreshProfile(userId, EmbeddingText.forElder(profile));` and after `helperProfileRepository.save(profile);` add `embeddingIndex.refreshProfile(userId, EmbeddingText.forHelper(profile));`.

`NeedService`: add `private final EmbeddingIndex embeddingIndex;` as the last final field. In `postNeed`, replace `return toResponse(needRepository.save(need), null);` with:

```java
        Need saved = needRepository.save(need);
        embeddingIndex.refreshNeed(saved.getId(), EmbeddingText.forNeed(saved));
        return toResponse(saved, null);
```

In `browseNearby`, after `List<Object[]> visible = ...;` add:

```java
        // A request that fits this helper is worth up to MATCH_WORTH_KM of closeness.
        Optional<float[]> me = embeddingIndex.profileVector(helperId);
        if (me.isPresent()) {
            Map<UUID, Double> match = embeddingIndex.similarity(EmbeddingStore.Kind.NEEDS, me.get(),
                    visible.stream().map(pair -> ((Need) pair[0]).getId()).toList());
            visible = EmbeddingIndex.byMatch(visible, match, pair -> ((Need) pair[0]).getId(), pair -> (double) pair[1]);
        }
```

`DiscoveryService`: add `private final EmbeddingIndex embeddingIndex;` last. In `discoverHelpers`, after the demo fallback and before paging:

```java
        Optional<float[]> query = embeddingIndex.queryVectorForElder(requestingUserId);
        if (query.isPresent()) {
            Map<UUID, Double> match = embeddingIndex.similarity(EmbeddingStore.Kind.PROFILES, query.get(),
                    visible.stream().map(e -> e.getKey().getUser().getId()).toList());
            visible = EmbeddingIndex.byMatch(visible, match, e -> e.getKey().getUser().getId(), Map.Entry::getValue);
        }
```

In `discoverElders`, the same with `embeddingIndex.profileVector(requestingUserId)` as the query. Add the imports (`Optional`, `EmbeddingIndex`, `EmbeddingStore`, `EmbeddingText`, `Need` where needed).

- [ ] **Step 4: Run the targeted suite** (all green; the existing fifty discovery tests pass because the unstubbed mock answers `Optional.empty()`).

- [ ] **Step 5: Commit** `feat: discovery and browse order by distance with a lift for a good text match`.

### Task 6: Close the step

- [ ] **Step 1: Full backend suite**: `caffeinate -i ./mvnw test 2>&1 | grep -E 'Tests run:.*Fail|BUILD' | tail -3`. Expected green, three gated tests skipped.
- [ ] **Step 2: Mark step 6 done** in `App/tasks/todo.md` with the commit hashes; commit that file alone in the App repo.
- [ ] **Step 3: Verification pass** (`verification-before-completion`): list every branch commit, run the targeted suites of all six steps once more, confirm nothing was pushed (`git log origin/main..HEAD` on the website branch; `git status` shows no push), and write the final report.

---

## Done when

- V63 creates both tables; the gated store test proves upsert, read-back and similarity.
- `EmbeddingText` gives one stable paragraph per person and per request.
- `EmbeddingIndex` refreshes only on a changed hash, batches a capped backfill, and lifts a match by up to five kilometres without changing any shown distance.
- Profile saves and request posts refresh their embedding; both discover lists and the browse list apply the lift; everything is a no-op without a key.
- Targeted and full suites green; nothing pushed.
- Owner actions: the same `EMBEDDINGS_API_KEY` from step 5 switches this on; the first boot embeds existing profiles and requests (capped at 500); the gated `EmbeddingStoreDbTest` once locally.
