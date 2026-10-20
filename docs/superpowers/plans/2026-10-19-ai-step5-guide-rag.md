# AI Step 5: Ask AI Answers From the User Guide (RAG on pgvector) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan (subagents are off in this project unless the owner asks). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The tortoise answers "how do I" questions from the 4,200-line user guide by retrieving the few passages that match the question, stored as vectors in the Postgres Towinly already pays for.

**Architecture:** A Python exporter turns `guide_content.py` into `guide-chunks.json` (one chunk per chapter section, about 1,200 characters, with a content hash). At boot, `GuideIndexer` embeds any chunk whose hash is not in the `assistant_guide_chunks` table through `EmbeddingClient` (an OpenAI-compatible `/embeddings` call) and removes rows whose hash is gone. On each question, `GuideRetriever` embeds the question, asks pgvector for the four nearest chunks by cosine distance, and `AssistantService` adds them to the system prompt under a "FROM THE USER GUIDE" heading. With no embeddings key, every piece is a no-op and Ask AI behaves exactly as before.

**Tech Stack:** Spring Boot 3.5 (JdbcTemplate, RestClient, Flyway), pgvector 0.8.6 (available on the Railway Postgres 18.6, checked 2026-10-19, not yet installed), Python 3 standard library for the exporter, JUnit 5 + Mockito. Repo: `~/Documents/Projects/ToWin/.worktrees/ai-roadmap`, branch `ai/ask-ai-roadmap`; backend paths relative to `backend/`. The exporter and its test live in the ToWin App project at `docs/user-guide/tools/`.

Spec: `App/docs/superpowers/specs/2026-10-19-ai-roadmap-design.md`, section "Step 5". Steps 1 to 3 are on the branch.

Gate (already passed): `select name, default_version, installed_version from pg_available_extensions where name = 'vector'` on the Towinly Railway database returned `vector | 0.8.6 | not installed`. `CREATE EXTENSION IF NOT EXISTS vector` will therefore succeed at the next deploy.

Test command (targeted):

```bash
cd ~/Documents/Projects/ToWin/.worktrees/ai-roadmap/backend
caffeinate -i ./mvnw -Dtest='Assistant*,Groq*,PromptSanitizer*,Eval*,Embedding*,Guide*' -Dsurefire.failIfNoSpecifiedTests=false test 2>&1 | grep -E 'Tests run:|BUILD|ERROR\]' | tail -18
```

Baseline before this plan: `Tests run: 101, Failures: 0, Skipped: 1`, BUILD SUCCESS.

Provider facts (OpenAI-compatible embeddings, the shape OpenAI, Gemini and Mistral all expose): `POST {base-url}/embeddings` with `{"model": "...", "input": ["text", ...], "dimensions": 1536}` and `Authorization: Bearer <key>`; the reply is `{"data": [{"index": 0, "embedding": [0.01, ...]}, ...], "usage": {"prompt_tokens": n, "total_tokens": n}}`, data ordered by index. pgvector facts (pgvector README, read 2026-10-19 through Context7): column `vector(1536)`, a vector is written as the literal `'[0.1,0.2,...]'`, cosine distance is `embedding <=> '[...]'`, nearest first is `ORDER BY embedding <=> '[...]' LIMIT n`.

---

## File structure

| File | Change | One job |
|---|---|---|
| `docs/user-guide/tools/export_chunks.py` (ToWin App project) | create | Guide source to `guide-chunks.json` |
| `docs/user-guide/tools/test_export_chunks.py` (ToWin App project) | create | The flattening and splitting rules |
| `src/main/resources/assistant/guide-chunks.json` | create (generated) | The chunks the indexer reads |
| `src/main/resources/db/migration/V62__create_assistant_guide_chunks.sql` | create | The extension and the table |
| `src/main/java/com/towinly/embedding/EmbeddingClient.java` | create | One call to the embeddings endpoint; parse; vector literal |
| `src/main/java/com/towinly/assistant/guide/GuideChunk.java` | create | One chunk record |
| `src/main/java/com/towinly/assistant/guide/GuideChunks.java` | create | Loads the JSON |
| `src/main/java/com/towinly/assistant/guide/GuideChunkStore.java` | create | JdbcTemplate: hashes, insert, delete, nearest |
| `src/main/java/com/towinly/assistant/guide/GuideIndexer.java` | create | Boot-time sync of file to table |
| `src/main/java/com/towinly/assistant/guide/GuideRetriever.java` | create | Question in, passages out |
| `src/main/java/com/towinly/assistant/service/AssistantService.java` | modify | Adds the guide block to the prompt |
| `src/main/resources/application.yml` | modify | `embeddings.*` |
| tests: `EmbeddingClientParseTest`, `GuideChunksTest`, `GuideIndexerTest`, `GuideRetrieverTest`, `AssistantServiceGuideTest`, `GuideChunkStoreDbTest` (gated) | create | |
| four service tests + `AssistantEvalsTest` | modify | One more constructor argument |
| App: `src/components/AskAiAssistant.jsx`, `src/i18n/fr.js`, `src/i18n/ta.js`, `docs/store/privacy-labels.md` | modify | Consent names the second provider |
| Website: `frontend/src/lib/legalCopy.js` | modify | Privacy policy names both AI services |

---

## Chunk 1: The corpus

### Task 1: The exporter and its test

**Files:**
- Create: `/Users/aghar/Documents/Projects/ToWin App/docs/user-guide/tools/export_chunks.py`
- Test: `/Users/aghar/Documents/Projects/ToWin App/docs/user-guide/tools/test_export_chunks.py`

The guide source is `docs/user-guide/guide/guide_content.py`: `PARTS` is a list of parts (`id`, `title`, `roles`, `intro`, `chapters`); each chapter has `id`, `title`, `roles`, `lead`, `blocks`; each block is a one-key dict by kind: `p` (paragraph), `h` and `h3` (headings), `side` (a figure beside nested `blocks`, with a `caption`), `table` (rows of cells), `note`, `care`, `tip` (callouts), `steps` and `bullets` (lists), `fig` and `figs` (pictures with `caption` or `captions`). Markup inside strings: `[[Name]]` is a button, `*x*` italic, `**x**` bold. The file imports reportlab, so the exporter reads it with `ast` instead of importing it.

- [ ] **Step 1: Write the failing test**

```python
"""Rules for turning guide_content.py into guide-chunks.json. Run:
    python3 -I -m unittest docs/user-guide/tools/test_export_chunks.py
"""
import unittest

import export_chunks as ec


class FlattenTest(unittest.TestCase):
    def test_markup_is_stripped(self):
        self.assertEqual(ec.strip_markup("Tap [[Log In]], then *wait* and **read**."),
                         "Tap Log In, then wait and read.")

    def test_each_block_kind_becomes_plain_text(self):
        blocks = [
            {"h": "Three kinds of account"},
            {"p": "When somebody joins, they choose one of three seats."},
            {"steps": ["Open Towinly.", "Tap [[Try as an Elder]]."]},
            {"bullets": ["One person linked.", "Two people."]},
            {"table": [["Seat", "Who"], ["Elder", "Someone older"]]},
            {"note": "A family member can never post a request."},
            {"care": "Do not type anything private."},
            {"tip": "Look in Spam."},
            {"fig": "elder-ask-ai", "caption": "[[Ask AI]] opens as a panel."},
            {"figs": ["a", "b"], "captions": ["Screen 1.", "Screen 2."]},
            {"side": "guide", "caption": "The [[Guide]] screen.", "blocks": [{"p": "Inside the side."}]},
        ]
        text = ec.flatten(blocks)
        self.assertIn("Three kinds of account\n", text)
        self.assertIn("When somebody joins, they choose one of three seats.", text)
        self.assertIn("1. Open Towinly.\n2. Tap Try as an Elder.", text)
        self.assertIn("- One person linked.\n- Two people.", text)
        self.assertIn("Seat | Who\nElder | Someone older", text)
        self.assertIn("Note: A family member can never post a request.", text)
        self.assertIn("Take care: Do not type anything private.", text)
        self.assertIn("Tip: Look in Spam.", text)
        self.assertIn("Ask AI opens as a panel.", text)
        self.assertIn("Screen 1. Screen 2.", text)
        self.assertIn("The Guide screen.", text)
        self.assertIn("Inside the side.", text)
        self.assertNotIn("[[", text)
        self.assertNotIn("elder-ask-ai", text)


class SplitTest(unittest.TestCase):
    def test_short_text_is_one_piece(self):
        self.assertEqual(ec.split_text("a\n\nb", 1200), ["a\n\nb"])

    def test_long_text_splits_on_paragraph_boundaries(self):
        paras = ["x" * 500, "y" * 500, "z" * 500]
        pieces = ec.split_text("\n\n".join(paras), 1200)
        self.assertEqual(pieces, ["x" * 500 + "\n\n" + "y" * 500, "z" * 500])

    def test_a_single_oversized_paragraph_is_kept_whole(self):
        pieces = ec.split_text("w" * 3000, 1200)
        self.assertEqual(pieces, ["w" * 3000])


class ChunksTest(unittest.TestCase):
    PARTS = [{
        "id": "start", "title": "Start here", "roles": ["elder", "helper", "family"], "intro": "Intro.",
        "chapters": [{
            "id": "what", "title": "What Towinly is", "roles": ["elder", "helper"],
            "lead": "Towinly introduces older people to younger helpers.",
            "blocks": [{"p": "A friendship climbs seven steps."}],
        }],
    }]

    def test_chunks_carry_part_chapter_roles_text_and_hash(self):
        chunks = ec.chunks_from(self.PARTS, 1200)
        self.assertEqual(len(chunks), 1)
        c = chunks[0]
        self.assertEqual(c["part"], "start")
        self.assertEqual(c["chapter"], "what")
        self.assertEqual(c["heading"], "Start here / What Towinly is")
        self.assertEqual(c["roles"], ["elder", "helper"])
        self.assertEqual(c["text"], "Towinly introduces older people to younger helpers.\n\nA friendship climbs seven steps.")
        self.assertEqual(len(c["hash"]), 64)

    def test_a_long_chapter_becomes_numbered_pieces(self):
        parts = [dict(self.PARTS[0])]
        parts[0]["chapters"] = [dict(self.PARTS[0]["chapters"][0], blocks=[{"p": "p" * 900}, {"p": "q" * 900}])]
        chunks = ec.chunks_from(parts, 1200)
        self.assertEqual([c["heading"] for c in chunks],
                         ["Start here / What Towinly is (1)", "Start here / What Towinly is (2)"])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run to see it fail**

```bash
cd "/Users/aghar/Documents/Projects/ToWin App/docs/user-guide/tools" && python3 -I -m unittest test_export_chunks 2>&1 | tail -3
```

Expected: `ModuleNotFoundError: No module named 'export_chunks'`.

- [ ] **Step 3: Write the exporter**

```python
#!/usr/bin/env python3
"""Turns the user guide's words into chunks the backend can embed.

Reads PARTS out of guide/guide_content.py with ast (the file imports reportlab,
so it is never imported), flattens every block to plain text, splits each
chapter at about 1,200 characters on paragraph boundaries, and writes a JSON
list of {part, chapter, heading, roles, text, hash}. The backend's GuideIndexer
embeds a chunk only when its hash is new, so re-running this after a guide edit
costs one embedding call per changed chunk.

Run from the ToWin App project root:
    python3 -I docs/user-guide/tools/export_chunks.py \
        --out ~/Documents/Projects/ToWin/.worktrees/ai-roadmap/backend/src/main/resources/assistant/guide-chunks.json
"""
import argparse
import ast
import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, "..", "guide", "guide_content.py")
MAX_CHARS = 1200

_BUTTON = re.compile(r"\[\[([^\]]+)\]\]")
_BOLD = re.compile(r"\*\*([^*]+)\*\*")
_ITALIC = re.compile(r"\*([^*]+)\*")


def strip_markup(text):
    """[[Name]] becomes Name; *x* and **x** become x."""
    text = _BUTTON.sub(r"\1", text)
    text = _BOLD.sub(r"\1", text)
    return _ITALIC.sub(r"\1", text)


def flatten(blocks):
    """Every block kind as plain text, one paragraph per block, nested sides included."""
    out = []
    for b in blocks:
        if not isinstance(b, dict):
            continue
        if "p" in b:
            out.append(strip_markup(b["p"]))
        elif "h" in b:
            out.append(strip_markup(b["h"]) + "\n")
        elif "h3" in b:
            out.append(strip_markup(b["h3"]) + "\n")
        elif "steps" in b:
            out.append("\n".join(f"{i}. {strip_markup(s)}" for i, s in enumerate(b["steps"], 1)))
        elif "bullets" in b:
            out.append("\n".join(f"- {strip_markup(s)}" for s in b["bullets"]))
        elif "table" in b:
            out.append("\n".join(" | ".join(strip_markup(str(cell)) for cell in row) for row in b["table"]))
        elif "note" in b:
            out.append("Note: " + strip_markup(b["note"]))
        elif "care" in b:
            out.append("Take care: " + strip_markup(b["care"]))
        elif "tip" in b:
            out.append("Tip: " + strip_markup(b["tip"]))
        elif "fig" in b:
            if b.get("caption"):
                out.append(strip_markup(b["caption"]))
        elif "figs" in b:
            captions = [strip_markup(c) for c in b.get("captions", []) if c]
            if captions:
                out.append(" ".join(captions))
        elif "side" in b:
            if b.get("caption"):
                out.append(strip_markup(b["caption"]))
            inner = flatten(b.get("blocks", []))
            if inner:
                out.append(inner)
    return "\n\n".join(piece.rstrip() for piece in out if piece and piece.strip())


def split_text(text, max_chars):
    """Pieces of at most max_chars, cut only between paragraphs; one huge paragraph stays whole."""
    paras = [p for p in text.split("\n\n") if p.strip()]
    pieces, current = [], ""
    for p in paras:
        candidate = p if not current else current + "\n\n" + p
        if current and len(candidate) > max_chars:
            pieces.append(current)
            current = p
        else:
            current = candidate
    if current:
        pieces.append(current)
    return pieces


def chunks_from(parts, max_chars=MAX_CHARS):
    chunks = []
    for part in parts:
        for chapter in part.get("chapters", []):
            body = flatten(chapter.get("blocks", []))
            lead = strip_markup(chapter.get("lead", "") or "")
            text = "\n\n".join(t for t in (lead, body) if t)
            pieces = split_text(text, max_chars)
            base = f"{part['title']} / {chapter['title']}"
            for i, piece in enumerate(pieces, 1):
                heading = base if len(pieces) == 1 else f"{base} ({i})"
                chunks.append({
                    "part": part["id"],
                    "chapter": chapter["id"],
                    "heading": heading,
                    "roles": list(chapter.get("roles", part.get("roles", []))),
                    "text": piece,
                    "hash": hashlib.sha256(piece.encode("utf-8")).hexdigest(),
                })
    return chunks


class _Literal(ast.NodeTransformer):
    """Replaces the figure helper calls and names in PARTS with placeholders so literal_eval works."""

    def visit_Call(self, node):
        return ast.Constant(value=None)

    def visit_Name(self, node):
        return ast.Constant(value=None)

    def visit_BinOp(self, node):
        return ast.Constant(value="")


def load_parts(source=SOURCE):
    tree = ast.parse(open(source, encoding="utf-8").read())
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(getattr(t, "id", "") == "PARTS" for t in node.targets):
            return ast.literal_eval(_Literal().visit(ast.fix_missing_locations(node.value)))
    raise SystemExit("PARTS not found in " + source)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--out", required=True, help="where to write guide-chunks.json")
    ap.add_argument("--source", default=SOURCE)
    args = ap.parse_args(argv)
    chunks = chunks_from(load_parts(args.source))
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=1)
        f.write("\n")
    sizes = [len(c["text"]) for c in chunks]
    print(f"{len(chunks)} chunks, {sum(sizes)} chars, longest {max(sizes)}, written to {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

Note on `_Literal`: `visit_Name` turns a bare name into `None`; the only names inside PARTS are figure constants, and a `None` caption is skipped by `flatten`. If `literal_eval` still fails, print the offending node type and extend the transformer; do not hand-edit the guide.

- [ ] **Step 4: Run the tests**

```bash
cd "/Users/aghar/Documents/Projects/ToWin App/docs/user-guide/tools" && python3 -I -m unittest test_export_chunks 2>&1 | tail -3
```

Expected: `Ran 7 tests ... OK`.

- [ ] **Step 5: Generate the corpus**

```bash
cd "/Users/aghar/Documents/Projects/ToWin App" && python3 -I docs/user-guide/tools/export_chunks.py \
  --out ~/Documents/Projects/ToWin/.worktrees/ai-roadmap/backend/src/main/resources/assistant/guide-chunks.json
```

Expected: a line like `NNN chunks, ~200000 chars, longest < 3000`. Open the file and read three chunks end to end: no `[[`, no `**`, headings read as "Part / Chapter", roles are lists of elder, helper, family. The chunk count should land between 120 and 250 (26 chapters, most split into several pieces).

- [ ] **Step 6: Commit (two repos)**

The exporter lives in the ToWin App root `docs/`, which is not a git repo of its own; the App repo is. Record it there by reference only (no commit needed for the root docs). Commit the generated corpus in the backend branch:

```bash
cd ~/Documents/Projects/ToWin/.worktrees/ai-roadmap
git add backend/src/main/resources/assistant/guide-chunks.json
git commit -m "feat: the user guide as chunks the assistant can retrieve"
```

## Chunk 2: Vectors in Postgres

### Task 2: Migration V62

**Files:**
- Create: `src/main/resources/db/migration/V62__create_assistant_guide_chunks.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Ask AI answers "how do I" questions from the user guide. The guide is far too
-- long to send whole, so it is kept here as chunks with an embedding each, and
-- the few chunks nearest to a question are sent. pgvector 0.8.6 is available on
-- the Railway Postgres (checked 2026-10-19, pg_available_extensions).
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE assistant_guide_chunks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part          TEXT NOT NULL,
    chapter       TEXT NOT NULL,
    heading       TEXT NOT NULL,
    roles         TEXT NOT NULL,            -- comma-separated: elder,helper,family
    content       TEXT NOT NULL,
    content_hash  TEXT NOT NULL UNIQUE,     -- sha256 of content; the indexer's change detector
    embedding     vector(1536) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- No vector index: a few hundred rows scan in under a millisecond.
```

`gen_random_uuid()` is built into Postgres 13+. Check how V60 or V61 declares a UUID primary key and match it if it differs.

- [ ] **Step 2: Commit**

```bash
cd ~/Documents/Projects/ToWin/.worktrees/ai-roadmap
git add backend/src/main/resources/db/migration/V62__create_assistant_guide_chunks.sql
git commit -m "feat: pgvector and the assistant_guide_chunks table"
```

### Task 3: `EmbeddingClient`

**Files:**
- Create: `src/main/java/com/towinly/embedding/EmbeddingClient.java`
- Test: `src/test/java/com/towinly/embedding/EmbeddingClientParseTest.java`
- Modify: `src/main/resources/application.yml`

- [ ] **Step 1: Write the failing tests**

```java
package com.towinly.embedding;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/** What the client reads from an embeddings reply, and how a vector is written for pgvector. */
class EmbeddingClientParseTest {

    @Test
    void readsOneVectorPerInput_inIndexOrder() {
        Map<String, Object> response = Map.of("data", List.of(
                Map.of("index", 1, "embedding", List.of(0.5, 0.25)),
                Map.of("index", 0, "embedding", List.of(0.1, 0.2))));

        Optional<List<float[]>> vectors = EmbeddingClient.parse(response, 2, 2);

        assertThat(vectors).isPresent();
        assertThat(vectors.get().get(0)).containsExactly(0.1f, 0.2f);
        assertThat(vectors.get().get(1)).containsExactly(0.5f, 0.25f);
    }

    @Test
    void theWrongCountOrDimension_isEmpty() {
        Map<String, Object> one = Map.of("data", List.of(Map.of("index", 0, "embedding", List.of(0.1, 0.2))));

        assertThat(EmbeddingClient.parse(one, 2, 2)).as("fewer vectors than inputs").isEmpty();
        assertThat(EmbeddingClient.parse(one, 1, 3)).as("wrong dimension").isEmpty();
        assertThat(EmbeddingClient.parse(Map.of(), 1, 2)).isEmpty();
        assertThat(EmbeddingClient.parse(null, 1, 2)).isEmpty();
    }

    @Test
    void vectorLiteral_isWhatPgvectorReads() {
        assertThat(EmbeddingClient.toVectorLiteral(new float[] {0.1f, -2f, 3.25f})).isEqualTo("[0.1,-2.0,3.25]");
    }

    @Test
    void notConfigured_withoutAKey() {
        EmbeddingClient off = new EmbeddingClient("https://api.openai.com/v1", "", "text-embedding-3-small", 1536, true);
        EmbeddingClient disabled = new EmbeddingClient("https://api.openai.com/v1", "k", "text-embedding-3-small", 1536, false);

        assertThat(off.isConfigured()).isFalse();
        assertThat(disabled.isConfigured()).isFalse();
        assertThat(off.embed(List.of("hello"))).isEmpty();
    }
}
```

- [ ] **Step 2: Run to see them fail**

Run the test command. Expected: compilation error, `EmbeddingClient` does not exist.

- [ ] **Step 3: Write `EmbeddingClient`**

```java
package com.towinly.embedding;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Turns text into vectors through an OpenAI-compatible {@code /embeddings}
 * endpoint (OpenAI, Gemini and Mistral all expose this shape, so the provider is
 * a configuration change). Built like {@link com.towinly.assistant.service.GroqClient}:
 * bounded timeouts, and every failure is logged and swallowed into an empty
 * Optional, because a missing vector must never stop an answer or a boot.
 *
 * <p>A blank key means off: {@link #isConfigured()} is false and every call is
 * empty, so the indexer and the retriever quietly do nothing.
 */
@Slf4j
@Component
public class EmbeddingClient {

    /** OpenAI accepts 2,048 inputs per call; a hundred keeps each request small. */
    public static final int MAX_BATCH = 100;

    private final RestClient client;
    private final String apiKey;
    private final String model;
    private final int dimensions;
    private final boolean enabled;

    public EmbeddingClient(
            @Value("${embeddings.base-url:https://api.openai.com/v1}") String baseUrl,
            @Value("${embeddings.api-key:}") String apiKey,
            @Value("${embeddings.model:text-embedding-3-small}") String model,
            @Value("${embeddings.dimensions:1536}") int dimensions,
            @Value("${embeddings.enabled:true}") boolean enabled) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        // A question's embedding sits on the answer's path, so it must be quick; a
        // batch of a hundred guide chunks at boot takes a few seconds.
        factory.setReadTimeout(15000);
        this.client = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
        this.apiKey = apiKey;
        this.model = model;
        this.dimensions = dimensions;
        this.enabled = enabled;
    }

    /** True when a key is present and embeddings are switched on. */
    public boolean isConfigured() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    public int dimensions() {
        return dimensions;
    }

    /** One vector per text, in order. Empty on any failure or when not configured. */
    public Optional<List<float[]>> embed(List<String> texts) {
        if (!isConfigured() || texts == null || texts.isEmpty()) return Optional.empty();
        if (texts.size() > MAX_BATCH) {
            log.warn("Embeddings: batch of {} exceeds {}", texts.size(), MAX_BATCH);
            return Optional.empty();
        }
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("model", model);
            body.put("input", texts);
            body.put("dimensions", dimensions);
            Map<String, Object> response = client.post()
                    .uri("/embeddings")
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .body(body)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
            return parse(response, texts.size(), dimensions);
        } catch (Exception e) {
            log.warn("Embeddings call failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /** One text, one vector. */
    public Optional<float[]> embedOne(String text) {
        return embed(List.of(text)).map(v -> v.get(0));
    }

    /**
     * Reads {@code data[].embedding} ordered by {@code data[].index}. Empty unless
     * exactly {@code expected} vectors of {@code dimensions} numbers came back, so a
     * short or reshaped reply can never be written to the table.
     */
    static Optional<List<float[]>> parse(Map<String, Object> response, int expected, int dimensions) {
        if (response == null || !(response.get("data") instanceof List<?> data) || data.size() != expected) {
            return Optional.empty();
        }
        float[][] ordered = new float[expected][];
        for (Object item : data) {
            if (!(item instanceof Map<?, ?> row)) return Optional.empty();
            Object index = row.get("index");
            Object embedding = row.get("embedding");
            if (!(index instanceof Number i) || !(embedding instanceof List<?> values)) return Optional.empty();
            int at = i.intValue();
            if (at < 0 || at >= expected || values.size() != dimensions) return Optional.empty();
            float[] vector = new float[dimensions];
            for (int k = 0; k < dimensions; k++) {
                if (!(values.get(k) instanceof Number n)) return Optional.empty();
                vector[k] = n.floatValue();
            }
            ordered[at] = vector;
        }
        List<float[]> out = new ArrayList<>(expected);
        for (float[] v : ordered) {
            if (v == null) return Optional.empty();
            out.add(v);
        }
        return Optional.of(out);
    }

    /** The literal pgvector reads: {@code [0.1,0.2,...]}. */
    public static String toVectorLiteral(float[] vector) {
        StringBuilder sb = new StringBuilder(vector.length * 10).append('[');
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(vector[i]);
        }
        return sb.append(']').toString();
    }
}
```

- [ ] **Step 4: Configuration**

Append to `application.yml` after the `assistant:` block:

```yaml
# Embeddings turn text into vectors so Ask AI can find the user-guide passages
# that match a question (and, from step 6, so discovery can match a request to a
# profile). Any OpenAI-compatible /embeddings endpoint works: OpenAI (default),
# Gemini or Mistral. The key lives ONLY here (env var). A blank key switches the
# whole thing off: the guide is not indexed, questions are not embedded, and Ask
# AI answers from the knowledge base alone, exactly as before.
embeddings:
  api-key: ${EMBEDDINGS_API_KEY:}
  base-url: ${EMBEDDINGS_BASE_URL:https://api.openai.com/v1}
  model: ${EMBEDDINGS_MODEL:text-embedding-3-small}
  dimensions: ${EMBEDDINGS_DIMENSIONS:1536}
  enabled: ${EMBEDDINGS_ENABLED:true}
```

- [ ] **Step 5: Run the tests**

Run the test command. Expected: `EmbeddingClientParseTest` 4 tests pass; total `Tests run: 105, Skipped: 1`.

- [ ] **Step 6: Commit**

```bash
cd ~/Documents/Projects/ToWin/.worktrees/ai-roadmap
git add backend/src/main/java/com/towinly/embedding/EmbeddingClient.java \
        backend/src/test/java/com/towinly/embedding/EmbeddingClientParseTest.java \
        backend/src/main/resources/application.yml
git commit -m "feat: EmbeddingClient, one OpenAI-compatible embeddings call"
```

### Task 4: `GuideChunk`, `GuideChunks`, `GuideChunkStore`

**Files:**
- Create: `src/main/java/com/towinly/assistant/guide/GuideChunk.java`
- Create: `src/main/java/com/towinly/assistant/guide/GuideChunks.java`
- Create: `src/main/java/com/towinly/assistant/guide/GuideChunkStore.java`
- Test: `src/test/java/com/towinly/assistant/guide/GuideChunksTest.java`
- Test (gated): `src/test/java/com/towinly/assistant/guide/GuideChunkStoreDbTest.java`

- [ ] **Step 1: Write the failing file test**

```java
package com.towinly.assistant.guide;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** The committed corpus is well formed: enough chunks, unique hashes, clean text, known roles. */
class GuideChunksTest {

    private final List<GuideChunk> chunks = GuideChunks.load();

    @Test
    void thereIsAWholeGuideHere() {
        assertThat(chunks).hasSizeGreaterThanOrEqualTo(100);
    }

    @Test
    void hashesAreUnique_andMatchTheText() {
        Set<String> seen = new HashSet<>();
        for (GuideChunk c : chunks) {
            assertThat(seen.add(c.hash())).as("duplicate hash in " + c.heading()).isTrue();
            assertThat(c.hash()).isEqualTo(GuideChunk.sha256(c.text()));
        }
    }

    @Test
    void textIsPlain_andBounded() {
        for (GuideChunk c : chunks) {
            assertThat(c.text()).as(c.heading()).isNotBlank().doesNotContain("[[").doesNotContain("**");
            assertThat(c.text().length()).as(c.heading()).isLessThanOrEqualTo(4000);
            assertThat(c.heading()).contains(" / ");
        }
    }

    @Test
    void rolesAreTheThreeSeats() {
        for (GuideChunk c : chunks) {
            assertThat(c.roles()).as(c.heading()).isNotEmpty().isSubsetOf("elder", "helper", "family");
        }
    }
}
```

- [ ] **Step 2: Run to see it fail**

Expected: compilation error (`GuideChunk`, `GuideChunks`).

- [ ] **Step 3: Write the record, the loader and the store**

`GuideChunk.java`:

```java
package com.towinly.assistant.guide;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

/**
 * One passage of the user guide, as exported by docs/user-guide/tools/export_chunks.py.
 * The hash is the change detector: same text, same hash, no new embedding.
 */
public record GuideChunk(String part, String chapter, String heading, List<String> roles, String text, String hash) {

    public static String sha256(String text) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
```

`GuideChunks.java`:

```java
package com.towinly.assistant.guide;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

/** Loads the committed corpus from the classpath. */
public final class GuideChunks {

    public static final String RESOURCE = "assistant/guide-chunks.json";

    private GuideChunks() {}

    public static List<GuideChunk> load() {
        try (InputStream in = new ClassPathResource(RESOURCE).getInputStream()) {
            return new ObjectMapper().readValue(in, new TypeReference<List<GuideChunk>>() {});
        } catch (IOException e) {
            throw new IllegalStateException("Cannot read " + RESOURCE + ": " + e.getMessage(), e);
        }
    }
}
```

`GuideChunkStore.java`:

```java
package com.towinly.assistant.guide;

import com.towinly.embedding.EmbeddingClient;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * The guide chunks table. Plain SQL through JdbcTemplate, because the
 * {@code vector} column has no JPA mapping and needs none: four statements
 * cover everything the indexer and the retriever do.
 */
@Component
public class GuideChunkStore {

    private final JdbcTemplate jdbc;

    public GuideChunkStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Every content hash in the table. */
    public Set<String> hashes() {
        return new HashSet<>(jdbc.queryForList("SELECT content_hash FROM assistant_guide_chunks", String.class));
    }

    public void insert(GuideChunk chunk, float[] embedding) {
        jdbc.update("INSERT INTO assistant_guide_chunks (part, chapter, heading, roles, content, content_hash, embedding) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?::vector)",
                chunk.part(), chunk.chapter(), chunk.heading(), String.join(",", chunk.roles()),
                chunk.text(), chunk.hash(), EmbeddingClient.toVectorLiteral(embedding));
    }

    /** Removes rows whose hash is no longer in the corpus. Returns how many went. */
    public int deleteAllExcept(Collection<String> keep) {
        if (keep.isEmpty()) return jdbc.update("DELETE FROM assistant_guide_chunks");
        String placeholders = String.join(",", java.util.Collections.nCopies(keep.size(), "?"));
        return jdbc.update("DELETE FROM assistant_guide_chunks WHERE content_hash NOT IN (" + placeholders + ")",
                keep.toArray());
    }

    /** The chunks nearest to the query by cosine distance, nearest first. */
    public List<GuideChunk> nearest(float[] query, int limit) {
        return jdbc.query(
                "SELECT part, chapter, heading, roles, content, content_hash FROM assistant_guide_chunks "
                        + "ORDER BY embedding <=> ?::vector LIMIT ?",
                (rs, i) -> new GuideChunk(rs.getString("part"), rs.getString("chapter"), rs.getString("heading"),
                        List.of(rs.getString("roles").split(",")), rs.getString("content"), rs.getString("content_hash")),
                EmbeddingClient.toVectorLiteral(query), limit);
    }
}
```

- [ ] **Step 4: Write the gated DB test**

```java
package com.towinly.assistant.guide;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves the migration and the nearest-neighbour query on a real Postgres with
 * pgvector. Gated like the other DB tests:
 * <pre>
 *   TOWINLY_DB_TESTS=true SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/towin_test \
 *   ./mvnw test -Dtest=GuideChunkStoreDbTest
 * </pre>
 * The local Postgres must have pgvector installed (`CREATE EXTENSION vector` must work).
 */
@SpringBootTest(properties = "embeddings.api-key=")
@EnabledIfEnvironmentVariable(named = "TOWINLY_DB_TESTS", matches = "true")
class GuideChunkStoreDbTest {

    @Autowired private GuideChunkStore store;
    @Autowired private JdbcTemplate jdbc;

    private static float[] unit(int hot) {
        float[] v = new float[1536];
        v[hot] = 1f;
        return v;
    }

    @BeforeEach
    void clean() {
        jdbc.update("DELETE FROM assistant_guide_chunks");
    }

    @Test
    void nearestReturnsTheClosestChunkFirst_andDeleteKeepsOnlyTheNamedHashes() {
        GuideChunk a = new GuideChunk("start", "what", "Start / What", List.of("elder"), "A", GuideChunk.sha256("A"));
        GuideChunk b = new GuideChunk("start", "how", "Start / How", List.of("helper"), "B", GuideChunk.sha256("B"));
        store.insert(a, unit(0));
        store.insert(b, unit(1));
        assertThat(store.hashes()).containsExactlyInAnyOrder(a.hash(), b.hash());

        float[] nearA = unit(0);
        nearA[1] = 0.2f;
        assertThat(store.nearest(nearA, 2)).extracting(GuideChunk::text).containsExactly("A", "B");
        assertThat(store.nearest(nearA, 1).get(0).roles()).containsExactly("elder");

        assertThat(store.deleteAllExcept(Set.of(b.hash()))).isEqualTo(1);
        assertThat(store.hashes()).containsExactly(b.hash());
    }
}
```

- [ ] **Step 5: Run the tests**

Run the test command. Expected: `GuideChunksTest` 4 pass; the DB test is skipped; total `Tests run: 110, Skipped: 2`.

- [ ] **Step 6: Commit**

```bash
cd ~/Documents/Projects/ToWin/.worktrees/ai-roadmap
git add backend/src/main/java/com/towinly/assistant/guide/ backend/src/test/java/com/towinly/assistant/guide/
git commit -m "feat: guide chunks: record, loader, and the pgvector store"
```

## Chunk 3: Index and retrieve

### Task 5: `GuideIndexer`

**Files:**
- Create: `src/main/java/com/towinly/assistant/guide/GuideIndexer.java`
- Test: `src/test/java/com/towinly/assistant/guide/GuideIndexerTest.java`

- [ ] **Step 1: Write the failing test**

```java
package com.towinly.assistant.guide;

import com.towinly.embedding.EmbeddingClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.assertj.core.api.Assertions.assertThat;

/** The table ends up equal to the file, and only the changed chunks cost an embedding. */
class GuideIndexerTest {

    private static final GuideChunk A = new GuideChunk("start", "what", "Start / What", List.of("elder"), "A", GuideChunk.sha256("A"));
    private static final GuideChunk B = new GuideChunk("start", "how", "Start / How", List.of("helper"), "B", GuideChunk.sha256("B"));

    private EmbeddingClient embeddings;
    private GuideChunkStore store;

    @BeforeEach
    void setUp() {
        embeddings = mock(EmbeddingClient.class);
        when(embeddings.isConfigured()).thenReturn(true);
        store = mock(GuideChunkStore.class);
    }

    private GuideIndexer indexer(List<GuideChunk> file) {
        return new GuideIndexer(embeddings, store, () -> file);
    }

    @Test
    void embedsAndInsertsOnlyTheChunksTheTableLacks() {
        when(store.hashes()).thenReturn(Set.of(A.hash()));
        when(embeddings.embed(List.of("B"))).thenReturn(Optional.of(List.of(new float[] {1f})));

        indexer(List.of(A, B)).sync();

        verify(embeddings).embed(List.of("B"));
        verify(store).insert(eq(B), any());
        verify(store, never()).insert(eq(A), any());
    }

    @Test
    void removesRowsWhoseChunkLeftTheFile() {
        when(store.hashes()).thenReturn(Set.of(A.hash(), B.hash()));

        indexer(List.of(B)).sync();

        ArgumentCaptor<java.util.Collection<String>> keep = ArgumentCaptor.forClass(java.util.Collection.class);
        verify(store).deleteAllExcept(keep.capture());
        assertThat(keep.getValue()).containsExactly(B.hash());
        verify(embeddings, never()).embed(anyList());
    }

    @Test
    void aFailedEmbeddingCall_insertsNothing_andDeletesNothing() {
        when(store.hashes()).thenReturn(Set.of());
        when(embeddings.embed(anyList())).thenReturn(Optional.empty());

        indexer(List.of(A, B)).sync();

        verify(store, never()).insert(any(), any());
        verify(store, never()).deleteAllExcept(any());
    }

    @Test
    void withoutAKey_itTouchesNothing() {
        when(embeddings.isConfigured()).thenReturn(false);

        indexer(List.of(A)).sync();

        verify(store, never()).hashes();
    }
}
```

- [ ] **Step 2: Run to see it fail**

Expected: compilation error, `GuideIndexer` does not exist.

- [ ] **Step 3: Write `GuideIndexer`**

```java
package com.towinly.assistant.guide;

import com.towinly.embedding.EmbeddingClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.Supplier;
import java.util.stream.Collectors;

/**
 * At boot, makes the table equal to guide-chunks.json: embeds and inserts the
 * chunks whose hash the table lacks, then removes rows whose hash the file no
 * longer has. The first boot with a key embeds the whole guide (a few batch
 * calls); every later boot finds nothing to do unless the guide was re-exported.
 *
 * <p>Runs after Flyway (an ApplicationRunner starts once the context is ready).
 * Any failure is logged and the boot continues: Ask AI works without the guide.
 */
@Slf4j
@Component
public class GuideIndexer implements ApplicationRunner {

    private final EmbeddingClient embeddings;
    private final GuideChunkStore store;
    private final Supplier<List<GuideChunk>> corpus;

    @Autowired
    public GuideIndexer(EmbeddingClient embeddings, GuideChunkStore store) {
        this(embeddings, store, GuideChunks::load);
    }

    GuideIndexer(EmbeddingClient embeddings, GuideChunkStore store, Supplier<List<GuideChunk>> corpus) {
        this.embeddings = embeddings;
        this.store = store;
        this.corpus = corpus;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            sync();
        } catch (Exception e) {
            log.warn("Guide index: sync failed, Ask AI will answer without the guide: {}", e.getMessage());
        }
    }

    /** One pass: insert what is new, delete what is gone. Package-private for tests. */
    void sync() {
        if (!embeddings.isConfigured()) {
            log.info("Guide index: embeddings are not configured; the user guide is not indexed.");
            return;
        }
        List<GuideChunk> file = corpus.get();
        Set<String> inTable = store.hashes();
        List<GuideChunk> missing = file.stream().filter(c -> !inTable.contains(c.hash())).toList();

        for (int from = 0; from < missing.size(); from += EmbeddingClient.MAX_BATCH) {
            List<GuideChunk> batch = missing.subList(from, Math.min(from + EmbeddingClient.MAX_BATCH, missing.size()));
            Optional<List<float[]>> vectors = embeddings.embed(batch.stream().map(GuideChunk::text).toList());
            if (vectors.isEmpty()) {
                log.warn("Guide index: embedding a batch of {} failed; stopping this pass, nothing deleted", batch.size());
                return;
            }
            for (int i = 0; i < batch.size(); i++) {
                store.insert(batch.get(i), vectors.get().get(i));
            }
        }

        Set<String> keep = file.stream().map(GuideChunk::hash).collect(Collectors.toSet());
        int removed = inTable.stream().anyMatch(h -> !keep.contains(h)) ? store.deleteAllExcept(new ArrayList<>(keep)) : 0;
        log.info("Guide index: {} chunks in file, {} embedded now, {} removed", file.size(), missing.size(), removed);
    }
}
```

- [ ] **Step 4: Run the tests**

Expected: `GuideIndexerTest` 4 pass; total `Tests run: 114, Skipped: 2`.

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/Projects/ToWin/.worktrees/ai-roadmap
git add backend/src/main/java/com/towinly/assistant/guide/GuideIndexer.java \
        backend/src/test/java/com/towinly/assistant/guide/GuideIndexerTest.java
git commit -m "feat: GuideIndexer keeps the guide chunks table equal to the file"
```

### Task 6: `GuideRetriever` and the prompt block

**Files:**
- Create: `src/main/java/com/towinly/assistant/guide/GuideRetriever.java`
- Modify: `src/main/java/com/towinly/assistant/service/AssistantService.java`
- Modify: the four service tests and `AssistantEvalsTest` (constructor)
- Test: `src/test/java/com/towinly/assistant/guide/GuideRetrieverTest.java`
- Test: `src/test/java/com/towinly/assistant/service/AssistantServiceGuideTest.java`

- [ ] **Step 1: Write the failing tests**

`GuideRetrieverTest`:

```java
package com.towinly.assistant.guide;

import com.towinly.embedding.EmbeddingClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** A question in, the nearest passages out as one block; nothing when off or when the call fails. */
class GuideRetrieverTest {

    private EmbeddingClient embeddings;
    private GuideChunkStore store;
    private GuideRetriever retriever;

    @BeforeEach
    void setUp() {
        embeddings = mock(EmbeddingClient.class);
        when(embeddings.isConfigured()).thenReturn(true);
        store = mock(GuideChunkStore.class);
        retriever = new GuideRetriever(embeddings, store);
    }

    @Test
    void passages_areHeadedAndJoined() {
        when(embeddings.embedOne("How do I check in?")).thenReturn(Optional.of(new float[] {1f}));
        when(store.nearest(any(), anyInt())).thenReturn(List.of(
                new GuideChunk("elder", "checkin", "If you are an elder / Your daily check-in", List.of("elder"),
                        "Tap I'm here today.", "h1"),
                new GuideChunk("start", "what", "Start here / What Towinly is", List.of("elder"),
                        "Towinly introduces older people to younger helpers.", "h2")));

        Optional<String> block = retriever.passagesFor("How do I check in?");

        assertThat(block).isPresent();
        assertThat(block.get()).isEqualTo(
                "[If you are an elder / Your daily check-in]\nTap I'm here today.\n\n"
                + "[Start here / What Towinly is]\nTowinly introduces older people to younger helpers.");
        verify(store).nearest(any(), org.mockito.ArgumentMatchers.eq(GuideRetriever.PASSAGES));
    }

    @Test
    void nothing_whenNotConfigured() {
        when(embeddings.isConfigured()).thenReturn(false);

        assertThat(retriever.passagesFor("anything")).isEmpty();
        verify(embeddings, never()).embedOne(anyString());
    }

    @Test
    void nothing_whenTheEmbeddingFails_orNoChunksMatch() {
        when(embeddings.embedOne(anyString())).thenReturn(Optional.empty());
        assertThat(retriever.passagesFor("q")).isEmpty();

        when(embeddings.embedOne(anyString())).thenReturn(Optional.of(new float[] {1f}));
        when(store.nearest(any(), anyInt())).thenReturn(List.of());
        assertThat(retriever.passagesFor("q")).isEmpty();
    }

    @Test
    void aStoreError_isSwallowed() {
        when(embeddings.embedOne(anyString())).thenReturn(Optional.of(new float[] {1f}));
        when(store.nearest(any(), anyInt())).thenThrow(new IllegalStateException("no table"));

        assertThat(retriever.passagesFor("q")).isEmpty();
    }
}
```

`AssistantServiceGuideTest`:

```java
package com.towinly.assistant.service;

import com.towinly.assistant.dto.ChatRequest;
import com.towinly.assistant.guide.GuideRetriever;
import com.towinly.common.service.TrustScoreService;
import com.towinly.connection.repository.ConnectionRepository;
import com.towinly.need.repository.NeedRepository;
import com.towinly.profile.service.ProfileService;
import com.towinly.streak.service.StreakService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** The guide passages ride in the system prompt when the retriever has some, and only then. */
class AssistantServiceGuideTest {

    private GroqClient groq;
    private GuideRetriever retriever;
    private AssistantService service;

    @BeforeEach
    void setUp() {
        groq = mock(GroqClient.class);
        when(groq.isConfigured()).thenReturn(true);
        when(groq.complete(anyString(), any())).thenReturn(Optional.of(new GroqReply("ok", 0, 0, 0)));
        retriever = mock(GuideRetriever.class);
        service = new AssistantService(groq,
                mock(ProfileService.class), mock(StreakService.class), mock(ConnectionRepository.class),
                mock(NeedRepository.class), mock(TrustScoreService.class), mock(AssistantSpend.class),
                mock(AssistantTools.class), retriever);
    }

    private String promptFor(String question) {
        ChatRequest r = new ChatRequest();
        r.setMessage(question);
        service.answer(r, null, "en");
        ArgumentCaptor<String> prompt = ArgumentCaptor.forClass(String.class);
        verify(groq).complete(prompt.capture(), any());
        return prompt.getValue();
    }

    @Test
    void passagesAreAddedUnderTheirOwnHeading_withTheRule() {
        when(retriever.passagesFor("How do I check in?")).thenReturn(Optional.of("[A]\nTap I'm here today."));

        String prompt = promptFor("How do I check in?");

        assertThat(prompt).contains("=== FROM THE USER GUIDE ===");
        assertThat(prompt).contains("[A]\nTap I'm here today.");
        assertThat(prompt).contains("Prefer these passages for how-to steps and button names");
    }

    @Test
    void noPassages_noHeading() {
        when(retriever.passagesFor(anyString())).thenReturn(Optional.empty());

        assertThat(promptFor("Hello")).doesNotContain("FROM THE USER GUIDE");
    }

    @Test
    void theRetrieverSeesTheSanitizedQuestion() {
        when(retriever.passagesFor(anyString())).thenReturn(Optional.empty());

        promptFor("​How do I check in?");

        verify(retriever).passagesFor("How do I check in?");
    }

    @Test
    void anUnreadableQuestion_neverReachesTheRetriever() {
        ChatRequest r = new ChatRequest();
        r.setMessage("​​");
        service.answer(r, null, "en");

        verify(retriever, never()).passagesFor(anyString());
    }
}
```

- [ ] **Step 2: Run to see them fail**

Expected: compilation errors (`GuideRetriever`, 9-argument constructor).

- [ ] **Step 3: Write `GuideRetriever`**

```java
package com.towinly.assistant.guide;

import com.towinly.embedding.EmbeddingClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Finds the guide passages that match a question: embed the question, ask
 * pgvector for the nearest chunks, return them as one block the prompt can
 * carry. Empty when embeddings are off, when the call fails, or when the table
 * is empty, so Ask AI always has an answer path without the guide.
 */
@Slf4j
@Component
public class GuideRetriever {

    /** Four passages of about 1,200 characters: enough to cover a how-to, cheap enough to send every time. */
    static final int PASSAGES = 4;

    private final EmbeddingClient embeddings;
    private final GuideChunkStore store;

    public GuideRetriever(EmbeddingClient embeddings, GuideChunkStore store) {
        this.embeddings = embeddings;
        this.store = store;
    }

    public Optional<String> passagesFor(String question) {
        if (!embeddings.isConfigured()) return Optional.empty();
        try {
            Optional<float[]> query = embeddings.embedOne(question);
            if (query.isEmpty()) return Optional.empty();
            List<GuideChunk> nearest = store.nearest(query.get(), PASSAGES);
            if (nearest.isEmpty()) return Optional.empty();
            return Optional.of(nearest.stream()
                    .map(c -> "[" + c.heading() + "]\n" + c.text())
                    .collect(Collectors.joining("\n\n")));
        } catch (Exception e) {
            log.warn("Guide retrieval failed, answering without the guide: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
```

- [ ] **Step 4: Wire it into `AssistantService`**

Field and constructor parameter (ninth, after `tools`):

```java
    private final GuideRetriever retriever;
```

```java
                            AssistantTools tools,
                            GuideRetriever retriever) {
        ...
        this.tools = tools;
        this.retriever = retriever;
```

Add the import `com.towinly.assistant.guide.GuideRetriever;`. Then, in `answer(...)`, after the hidden-character warning and before `buildConversation`, add:

```java
        retriever.passagesFor(question).ifPresent(passages -> {
            // Appended last so it sits nearest the question; the stable prefix above it
            // stays cacheable at Groq.
        });
```

Because `systemPrompt` is a local that must be effectively final inside a lambda, write it plainly instead:

```java
        Optional<String> passages = retriever.passagesFor(question);
        if (passages.isPresent()) {
            systemPrompt += "\n\n=== FROM THE USER GUIDE ===\n"
                    + "These passages come from the Towinly user guide. Prefer these passages for how-to "
                    + "steps and button names. If they do not cover the question, use the knowledge base above.\n\n"
                    + passages.get();
        }
```

This sits after the question is sanitized (so the retriever sees clean text) and after the unreadable-question return (so a blank question never reaches it).

- [ ] **Step 5: Update the constructors**

`AssistantLanguageTest`, `AssistantServicePromptHardeningTest`, `AssistantServiceSpendTest`, `AssistantServiceToolsTest`: add `mock(GuideRetriever.class)` as the last argument (import `com.towinly.assistant.guide.GuideRetriever`). `AssistantEvalsTest.realService`: add `new GuideRetriever(new EmbeddingClient("https://api.openai.com/v1", "", "text-embedding-3-small", 1536, true), mock(GuideChunkStore.class))` as the last argument, so the live evals run with the guide off unless the owner wires a real store later; add the imports.

- [ ] **Step 6: Run the tests**

Expected: `GuideRetrieverTest` 4 and `AssistantServiceGuideTest` 4 pass; total `Tests run: 122, Skipped: 2`, BUILD SUCCESS.

- [ ] **Step 7: Commit**

```bash
cd ~/Documents/Projects/ToWin/.worktrees/ai-roadmap
git add backend/src/main/java/com/towinly/assistant/guide/GuideRetriever.java \
        backend/src/main/java/com/towinly/assistant/service/AssistantService.java \
        backend/src/test/java/com/towinly/assistant/guide/GuideRetrieverTest.java \
        backend/src/test/java/com/towinly/assistant/service/
        backend/src/test/java/com/towinly/assistant/evals/AssistantEvalsTest.java
git commit -m "feat: Ask AI carries the four nearest user-guide passages in its prompt"
```

## Chunk 4: Consent and close

### Task 7: The consent names the second service

**Files (App repo, `/Users/aghar/Documents/Projects/ToWin App/App`):**
- Modify: `src/components/AskAiAssistant.jsx` (the `confirm({...message})` string, around line 297)
- Modify: `src/i18n/fr.js` and `src/i18n/ta.js` (the key is the English sentence; both key and value change)
- Modify: `docs/store/privacy-labels.md` (the three places that say the AI data goes to Groq)

**Files (website, in the worktree):**
- Modify: `frontend/src/lib/legalCopy.js`, the "Where it is kept" privacy section: add one sentence naming the two AI services the helper uses and what each receives.

- [ ] **Step 1: Write the new English consent**

Replace the message string with:

```
Towinly's helper uses two outside AI services to answer. Groq writes the answers. OpenAI turns your question into a search of the user guide, so the helper can find the right page. Your question, this chat, and a short summary of your own Towinly activity (like your first name and trust score) are shared with Groq. Only your question is shared with OpenAI. Your contact details are never shared. The answers are written by a machine, so they can be wrong. Every answer has a "Report this answer" button if one looks wrong or upsetting. Is that okay?
```

Run the prose pipeline on it: invoke `humanizer` with the four brand taglines marked do-not-touch (none appear here), then `stop-slop`. Expect no change beyond what the passes flag; no em dashes, no "not X, it's Y".

- [ ] **Step 2: French and Tamil**

Update the key in both files to the new English sentence, and the values to:

French:
```
L'assistant de Towinly utilise deux services d'IA externes pour répondre. Groq écrit les réponses. OpenAI transforme votre question en recherche dans le guide, pour que l'assistant trouve la bonne page. Votre question, cette discussion et un court résumé de votre activité sur Towinly (comme votre prénom et votre score de confiance) sont partagés avec Groq. Seule votre question est partagée avec OpenAI. Vos coordonnées ne sont jamais partagées. Les réponses sont écrites par une machine et peuvent donc être fausses. Chaque réponse a un bouton « Signaler cette réponse » si elle semble fausse ou blessante. Êtes-vous d'accord?
```

Tamil:
```
Towinly உதவியாளர் பதில் சொல்ல இரண்டு வெளிப்புற AI சேவைகளைப் பயன்படுத்துகிறது. Groq பதில்களை எழுதுகிறது. OpenAI உங்கள் கேள்வியை வழிகாட்டியில் தேடலாக மாற்றுகிறது; அதனால் உதவியாளர் சரியான பக்கத்தைக் கண்டறிகிறது. உங்கள் கேள்வி, இந்த உரையாடல், உங்கள் Towinly செயல்பாட்டின் சிறு சுருக்கம் (உங்கள் முதல் பெயர், நம்பிக்கை மதிப்பெண் போன்றவை) Groq-உடன் பகிரப்படும். உங்கள் கேள்வி மட்டுமே OpenAI-உடன் பகிரப்படும். உங்கள் தொடர்பு விவரங்கள் ஒருபோதும் பகிரப்படாது. பதில்கள் இயந்திரத்தால் எழுதப்படுவதால் தவறாக இருக்கலாம். தவறாகவோ வருத்தமளிப்பதாகவோ தோன்றினால், ஒவ்வொரு பதிலுக்கும் "இந்தப் பதிலைப் புகார் செய்" பொத்தான் உண்டு. இது சரியா?
```

Run the app's i18n tests afterwards: `cd App && npx jest src/i18n __tests__/ask-ai* --forceExit 2>&1 | tail -5` (the suite hangs after passing without `--forceExit`; never pipe jest to head).

- [ ] **Step 3: Store privacy labels and the website policy**

In `docs/store/privacy-labels.md`, where it says the AI question and summary go to Groq (the consent-gate bullet near line 98 and the Name, User Content and Other Data rows), add that the question alone also goes to OpenAI for the guide search, after the same consent. In the website's `legalCopy.js` "Where it is kept" section, append one sentence in the section's own voice: the Ask AI helper sends your question and a short summary of your own activity to Groq to write its answer, and your question alone to OpenAI to find the matching guide page; neither gets your contact details. Run the website's legal-page tests: `cd frontend && npx vitest run src/pages/legal-pages.test.jsx src/pages/Register.privacy-copy.test.jsx` (check `frontend/package.json` for the test runner first).

- [ ] **Step 4: Commit (App repo and website branch)**

```bash
cd "/Users/aghar/Documents/Projects/ToWin App/App"
git add src/components/AskAiAssistant.jsx src/i18n/fr.js src/i18n/ta.js docs/store/privacy-labels.md
git commit -m "feat: Ask AI consent names OpenAI for the guide search beside Groq"

cd ~/Documents/Projects/ToWin/.worktrees/ai-roadmap
git add frontend/src/lib/legalCopy.js
git commit -m "docs: privacy policy names the two AI services the helper uses"
```

### Task 8: Close the step

- [ ] **Step 1: Full backend suite**

```bash
cd ~/Documents/Projects/ToWin/.worktrees/ai-roadmap/backend
caffeinate -i ./mvnw test 2>&1 | grep -E 'Tests run:.*Fail|BUILD' | tail -3
```

Expected: `Failures: 0, Errors: 0`, BUILD SUCCESS, the two gated tests skipped.

- [ ] **Step 2: Mark step 5 done**

In `App/tasks/todo.md`, mark `5. [x]` with the commit hashes and the owner actions: create an OpenAI key, set `EMBEDDINGS_API_KEY` on Railway, and run the gated `GuideChunkStoreDbTest` against a local Postgres with pgvector once. Commit that file alone in the App repo.

---

## Done when

- `guide-chunks.json` is committed with 100 or more clean chunks and matching hashes.
- V62 creates the extension and the table; the gated DB test proves insert, nearest and delete.
- `EmbeddingClient` parses strictly and is off without a key; `GuideIndexer` embeds only new hashes; `GuideRetriever` returns four headed passages or nothing.
- The prompt carries the passages under "=== FROM THE USER GUIDE ===" only when there are some.
- The app consent, its French and Tamil, the store privacy labels and the website policy name OpenAI for the guide search.
- Targeted suite 122 green (2 skipped); full suite green; nothing pushed.
- Owner actions: the embeddings key on Railway; the DB-gated test once locally; review the consent copy before the next store build.
