---
created: 2026-04-24
updated: 2026-04-29
status: living document
---

# Decision Log

Architectural and process decisions. Each entry: what was decided, when, why, and what was considered. Update or supersede entries when something changes — do not delete history; mark `Status: superseded by Dn`.

---

## D1. Translation: Berean Standard Bible (BSB) for Phase 1
**Decided:** 2026-04-24 · **Status:** locked (Phase 1)

BSB is public domain, modern English, USFM available from Bible Hub / eBible.org. No licensing asterisks for any future redistribution; importer can be exercised freely.

**Considered:**
- **WEB** — public domain, but reads dated (1901 ASV revision).
- **NET** — *not* PD; under Bible.org "Ministry First" license. Personal use is fine, app distribution requires a separate agreement. The main differentiator is the ~60K translator notes, but the user explicitly does not want others' notes in his corpus, so NET's license cost buys no unique value here.
- **BSB** — PD, modern, no asterisks. Chosen.

**Implication:** importer is BSB-specific in v1. When a second translation is added, `vault/bible/` will be reorganized into per-translation subdirs (`vault/bible/{translation}/{Book}/{NN}.md`). Until then, plain `vault/bible/{Book}/{NN}.md` is BSB. Each chapter file declares `translation: BSB` in frontmatter for explicitness.

---

## D2. Source format: USFM (not OSIS)
**Decided:** 2026-04-24 · **Status:** locked

USFM has wider source availability and better parser tooling (`usfm-grammar` JS, `pyusfm`, `proskomma`). OSIS is more semantically rich on paper but ecosystem and spec-clarity are worse.

**Importer must explicitly handle:**
- Poetry markers (`\q1`, `\q2`, `\q3`) — preserved as indented blocks
- Section headings (`\s1`, `\s2`) — translator-added; preserved as `##`/`###` outside the verse anchor flow
- Divine name small caps (`\nd LORD\nd*`) — preserved (representation TBD; likely `<span class="nd">LORD</span>` until we have an in-app renderer)
- Words of Christ (`\wj`) — preserved similarly
- Footnotes / cross-refs (`\f`, `\x`) — sparse in BSB; rendered as Markdown footnotes
- Verse boundaries spanning paragraphs/chapters — handled by emitting block-ref anchors `^vN` *inside* the paragraph rather than splitting paragraphs at verse breaks

---

## D3. File layout: chapter-per-file at `vault/bible/{Book}/{NN}.md`
**Decided:** 2026-04-24 · **Status:** locked (Phase 1)

`bible/Gen/01.md` through `bible/Rev/22.md`. Verse boundaries are Obsidian block refs `^v1`, `^v2`, … making them targetable from `[[bible/Gen/01#^v1|Gen 1:1]]` links.

- Book directory uses USFM 3-letter abbreviations (Gen, Exo, … Rev). Index of abbreviations lives in `vault/CLAUDE.md`.
- Chapter numbers are 2-digit zero-padded (`01.md` not `1.md`) so file ordering matches reading order in any sorted file listing.
- `:` is invalid in Windows filenames; never used in paths. Display text uses human `Gen 1:1`; storage uses `/`-separated paths.

---

## D4. Verse-reference syntax: full Obsidian block-ref wiki-links
**Decided:** 2026-04-24 · **Status:** locked (Phase 1; may shorten in Phase 2)

In notes, write verse references as:
```
[[bible/Gen/01#^v1|Gen 1:1]]
[[bible/Rom/08#^v28|Rom 8:28]]
```

**Considered:**
- `[[Gen 1:1]]` shorthand — does not resolve in stock Obsidian; would require a plugin or pre-save resolver.
- `[Gen 1:1](bible://Gen.1.1)` URI — needs custom URI handler; doesn't navigate in Obsidian.
- Full block-ref form — verbose to type, but actually navigates today. Chosen.

**Phase 2 follow-up:** add an Obsidian plugin or pre-commit resolver so `[[Gen 1:1]]` shorthand auto-expands. Until then, full form everywhere.

---

## D5. Stub creation: eager + future linter
**Decided:** 2026-04-24 · **Status:** locked (Phase 1; seed-content rule amended by D22)

When Claude encounters an entity without a note (during reading prep or otherwise), it creates the stub file immediately in `vault/notes/{type}/{slug}.md` using the matching template. No approval gate.

A stale-note linter (deferred until needed) will scan for stubs with empty bodies + zero inbound links + age past a threshold, and flag/delete.

**Considered:**
- Approve-then-create — safe but slow; can't run unattended.
- Quarantine + weekly review — requires discipline that may not materialize.
- Eager + linter — chosen. Friction is informative; linter handles cleanup when it becomes real.

---

## D6. Note hierarchy: type-folders + tag/category metadata
**Decided:** 2026-04-24 · **Status:** locked (Phase 1)

Folders are the *default creation location*:
- `vault/notes/people/`
- `vault/notes/places/`
- `vault/notes/concepts/`
- `vault/notes/events/`
- `vault/notes/readings/`

Cross-cutting classification lives in frontmatter `tags:` (and/or `category:` where useful). A person can live in `notes/people/aaron.md` and be tagged `[priest, levite, exodus-generation]`.

**Rule:** folder is identity (where the file lives); tags are facets (what the file is about).

---

## D7. Sync: local-only for Phase 1; Obsidian Sync later
**Decided:** 2026-04-24 · **Status:** locked (Phase 1)

Vault stays on local disk during Phase 1. Obsidian Sync (already in use at work) handles the laptop ↔ phone bridge once needed. iCloud is out — known conflict-file issues with `.obsidian/workspace.json` are not worth dealing with in a phase whose explicit purpose is *not* validating sync.

---

## D8. Repo layout: separated tools / data / vault
**Decided:** 2026-04-24 · **Status:** locked

```
bible-notes/
├── PROJECT.md
├── docs/planning/
│   ├── ROADMAP.md
│   └── DECISIONS.md
├── tools/        — TS importer + scripts that manipulate the vault
├── data/         — raw USFM source bundles (gitignored; re-downloadable)
└── vault/        — the Obsidian vault (committed)
```

Importer reads from `data/`, writes to `vault/bible/`. Vault remains tool-agnostic: it could be opened standalone if `tools/` and `data/` were absent.

---

## D9. Claude conventions live in `vault/CLAUDE.md`, not in `PROJECT.md`
**Decided:** 2026-04-24 · **Status:** superseded by D12 (2026-04-25)

`PROJECT.md` is the human-facing project brief — vision, scope, decisions to make.
`vault/CLAUDE.md` is the AI-facing conventions doc — file layout, frontmatter schemas, link syntax, slug rules, what Claude may do without asking, what requires confirmation.

This split lets `PROJECT.md` stay readable as a brief and `vault/CLAUDE.md` stay precise as a spec.

**Why superseded:** the AI-facing layer is actually two distinct audiences (project/tooling work vs in-vault note-taking work), not one. D12 introduces the three-layer split.

---

## D10. Repository scope: tooling-only; vault content lives outside git
**Decided:** 2026-04-24 · **Status:** locked (revised 2026-04-25 to reflect D12)

**This repo tracks:**
- `PROJECT.md` (brief), `CLAUDE.md` (project/tooling AI operating manual)
- `docs/planning/` (planning, decision log, roadmap) — pure documentation only
- `tools/` (importer + scripts, including `tools/prompts/` and `tools/snippets/`)
- `vault/_templates/` (vault scaffolding, including the tracked `CLAUDE.md` starter)
- `.gitignore` and repo meta

**This repo does NOT track:**
- `vault/CLAUDE.md` — per-user vault operating manual; copy of `vault/_templates/CLAUDE.md` made on first vault setup, then user-edited.
- `vault/bible/` — generated by `tools/import-usfm.ts`. Re-run after clone or after importer changes; committing it would mean ~1,189-file diffs every time the importer is tweaked.
- `vault/notes/` — personal study content. Backed up via Obsidian Sync (which provides its own version history). Keeping it out of git means this repo could be made public later without leaking personal notes.
- `vault/.obsidian/` — per-machine Obsidian state. Snippets ship from `tools/snippets/` and are copied here at vault-setup time.

**Considered:**
- Everything in one repo — mixed code+content history; importer regen would dominate diffs.
- Two repos (tooling here, vault as its own repo) — cleaner if note git-history later becomes valuable. Treat as the upgrade path from D10 if needed.
- Tooling-only — chosen.

**Mechanics:** `.gitkeep` files in each `vault/notes/{type}/` subdir preserve the directory structure on a fresh clone. `vault/notes/*/*.md` is the gitignore pattern that excludes content while letting `.gitkeep` through.

---

## D11. USFM-to-markdown format choices for the BSB importer
**Decided:** 2026-04-25 · **Status:** locked (Phase 1)

Resolves the seven format sub-decisions that shape every chapter file output by `tools/import-usfm.ts`. Direction is **pure markdown + sidecar metadata**: chapter files read as ordinary English text in any markdown viewer; an Obsidian CSS snippet handles reading-flow polish; sidecar JSON carries data not meant for inline display.

**Why this direction.** Two costs of HTML-rich source were heavier than initially framed: plain-text search across the vault breaks once words are tag-interrupted, and `cat`-readability of chapter files (a working principle from `PROJECT.md`) collapses. Sidecar/CSS-snippet preserves the data and the reading affordances at the cost of one extra file per chapter and one Obsidian setting toggle.

### D11.1 — Strong's numbers: sidecar JSON

Strong's data is stripped from chapter markdown and emitted to `vault/bible/{Book}/{NN}_strongs.json`. JSON keys verses by number; entries align by `(verse, word_index)` where `word_index` is the position in the verse after stripping markdown formatting and punctuation. Phase 2 renderer overlays Strong's from the sidecar; Phase 1 ignores the file.

**Why with the vault, not under `data/`?** The vault is the source of truth for content the project commits to retaining. `data/usfm/BSB/` is for re-downloadable raw bundles (gitignored per D10). Strong's data — once distilled out of the USFM — is project-owned content and belongs alongside the chapter file it describes.

**Considered:** strip entirely (loses data without re-import); preserve as inline `<w s="…">` HTML (breaks search; 7× source density).

### D11.2 — Translator footnotes: markdown footnotes

`\f + \fr ref \ft text \f*` becomes `[^N]` inline + `[^N]: text` at file end. Bible references inside footnote text are converted to wiki-links so the BSB editorial cross-reference dataset is navigable. Footnote numbering is per-file.

### D11.3 — Parallel-passage refs (`\r`): wiki-link "see also" line

Editor-supplied parallels after section headings render as a navigable italic line:

```markdown
## The Creation

*See also: [[bible/Jhn/01#^v1|John 1:1–5]] · [[bible/Heb/11#^v1|Hebrews 11:1–3]]*
```

### D11.4 — Verse anchors: per-verse paragraph blocks + CSS snippet

Each verse is its own markdown paragraph block, ending in `^vN` block-ref. Reading flow is restored by a CSS snippet shipped from `tools/snippets/bible-flow.css` and copied to `vault/.obsidian/snippets/bible-flow.css` at vault-setup time, that collapses margins between adjacent verse paragraphs. Vault renders flat in non-Obsidian markdown viewers; Obsidian users see paragraph flow once the snippet is enabled in Settings → Appearance.

**Multi-paragraph verses:** verse-number marker `**N**` (Unicode-superscript digits) on the *first* paragraph of the verse; `^vN` block-ref on the *last* paragraph. Compromise — block-ref click navigates to the end of the verse rather than the start. Phase 2 renderer's verse-aware navigation supersedes this affordance.

### D11.5 — Poetry: blockquote nesting

`\q1` → `> ` prefix; `\q2` → `>> `; `\q3` → `>>> `; `\qr` → treated like `\q1` in Phase 1 (paragraph-type comment preserves the distinction for Phase 2). Pure markdown, renders visually in any viewer.

**Trade-off accepted:** blockquote markup is nominally for quoted text, so a Phase 2 renderer needs file-context (under `bible/` → poetry; under `notes/` → quotation) to interpret it correctly. File-location-as-context is acceptable.

### D11.6 — Acrostic letters (Psalm 119): h4 heading on its own line

> **Amended by D15 (2026-04-25).** Originally specified `**LETTER**` as a bold-only paragraph; CSS couldn't distinguish it from verse paragraphs (which always start with `<strong>`). Now: `\qa ALEPH` → `#### ALEPH`. The h4 heading is structurally unique, gives CSS a clean target, and naturally breaks the prose flow.

### D11.7 — Translator-supplied italics: markdown `*word*`

`\it word\it*` → `*word*`. **Project-wide convention:** emphasis uses `*…*` form, never `_…_`. Applies in chapter files, footnote text, "see also" lines, and `\d` superscriptions (`*A Psalm of David.*`).

### Paragraph-type metadata

> **Superseded by D14 (2026-04-25).** The inline HTML comment was dropped after first-contact testing in Obsidian — it's visible in both live preview and reading view, contrary to the original framing. Paragraph-type metadata is deferred to Phase 2 (re-derive from USFM source or future sidecar JSON). Per-verse-paragraph rendering itself stands; see D14.

~~Each verse paragraph is preceded by an HTML comment recording the USFM paragraph type: `<!-- p:m -->`, `<!-- p:pmo -->`, etc. Invisible in Obsidian rendering; survives markdown round-trips; consumed by Phase 2 renderer for paragraph-aware layout.~~

### Other locked details

- **Verse-number markers:** Unicode superscript digits (⁰¹²³⁴⁵⁶⁷⁸⁹), bolded. `\v 119` → `**¹¹⁹**`.
- **`\d` superscriptions** (Psalm headings): `*A Psalm of David.*`.
- **`\b` blank-line markers:** rendered as a blank line in markdown source.
- **Section headings inside poetry:** break out of the blockquote; section heading + blockquote are separate top-level blocks in markdown anyway.

### Tooling

- **Package manager:** npm
- **Language:** TypeScript (ESM)
- **Parser:** hand-rolled line-based parser at `tools/import-usfm.ts` (see D13).
- **CSS snippet (source):** `tools/snippets/bible-flow.css`. Tracked. Setup wiring copies it to `vault/.obsidian/snippets/bible-flow.css` (gitignored, per-machine).
- **Reading-prep prompt:** `tools/prompts/reading-prep.md`. Tracked as a Claude Code-specific tool feature (per D12, not vault scaffolding).

---

## D12. Three-layer documentation split (supersedes D9)
**Decided:** 2026-04-25 · **Status:** locked

D9 framed AI guidance as one file (`vault/CLAUDE.md`). Real audiences are three:

1. **Project brief — `PROJECT.md`** (root, tracked). Human-facing: vision, scope, principles, what is *not* being built. Read once to understand the project.
2. **Project/tooling AI operating manual — `CLAUDE.md`** (root, tracked). AI-facing: repo layout, tooling conventions, commit/push norms, project-wide markdown style, "what requires the user's confirmation" for code-side work. Loaded by Claude Code when working anywhere in the repo.
3. **Vault format spec + AI defaults — `vault/_templates/CLAUDE.md`** (tracked starter). Universal vault conventions: file layout, slug rules, frontmatter schemas, link syntax, stub policy, vault-content hard rules ("quote, don't paraphrase"). Anyone using the vault — Claude Code user, vim+Obsidian user, future Phase 2 mobile app — needs this content.
4. **Per-user vault operating manual — `vault/CLAUDE.md`** (gitignored). Copy of the starter, then personalized. The user's own preferences for how AI interacts with their vault. Loaded by Claude Code when working under `vault/`.

### Why the split

- **Vault is the portable product, tooling is one optional interface.** Vault content (notes, bible chapters, the user's CLAUDE.md) belongs to the user, not the project. Tooling and scaffolding belong to the project. Two different lifecycles, two different sharability defaults.
- **Project-tooling guidance is universal.** "Don't bypass git hooks," "use TypeScript ESM," "italic uses `*`" applies to anyone working on the project, regardless of which part. Belongs at the root where every AI session finds it.
- **Vault behavior is partially personal.** Slug rules and frontmatter schemas are universal (the format spec); but eagerness on stubs, "I want passages quoted not paraphrased," etc. are arguably preferences. Splitting the starter (universal) from the user copy (personal-allowed) lets both evolve without leaking personal style into the public starter.

### Setup wiring

`tools/import-usfm.ts` (or a separate `tools/setup-vault.ts`) copies `vault/_templates/CLAUDE.md` → `vault/CLAUDE.md` on first run, idempotently — only if `vault/CLAUDE.md` doesn't exist. Same pattern for `tools/snippets/bible-flow.css` → `vault/.obsidian/snippets/bible-flow.css`.

### `docs/` is documentation only

`docs/` holds planning material, decision log, roadmap, references — things humans read. It does **not** hold prompts, templates, snippets, or any artifact consumed at runtime by code or AI tools. Those live in `tools/` (code-adjacent) or `vault/_templates/` (vault scaffolding).

---

## D13. USFM parser: hand-rolled line-based, not `usfm-grammar` (amends D11)
**Decided:** 2026-04-25 · **Status:** locked (Phase 1)

D11 specified `usfm-grammar` as the parser. On first contact with the BSB corpus, `usfm-grammar` v2.3.1 throws on `20-PSAengbsb.usfm` at line 218 (`\q1\n\v 1 \w O|strong="H3068"\w* …`) at both `LEVEL.STRICT` and `LEVEL.RELAXED`. The failure happens during book-level parse, so *no* Psalm chapter is reachable through the library — not just the offending one.

**Pivot:** the importer parses USFM directly with a small line-based scanner over the BSB-specific marker subset already enumerated in `phase-1.md` (~25 markers). The output format locked in D11 is unchanged; only the parser layer changes.

**Why this is the right swap, not a workaround:**
- D11's load-bearing decisions are about *output shape* (sidecar JSON, blockquote nesting, paragraph-type comments, block-ref placement). The parser was an implementation detail, not a contract.
- We need precise control over paragraph boundaries (multi-paragraph verses, paragraph-type metadata in HTML comments). A grammar-based AST flattens that information; reconstructing it is more code than scanning USFM lines directly.
- The BSB corpus uses a closed, documented marker set. The "general USFM" surface that justifies a heavy library isn't relevant.
- One-time import. We're not maintaining ongoing compatibility with arbitrary USFM producers.

**Considered:**
- Pre-process USFM to coerce it through `usfm-grammar` (e.g., collapse `\q1\n\v` into `\q1 \v`). Rejected: every new translation or edge case becomes "tweak the preprocessor or fight the grammar."
- Pin to an older `usfm-grammar` version. Not investigated; the underlying mismatch (we want paragraph-precise output, the AST flattens) makes this a band-aid.
- `proskomma`. Heavier than `usfm-grammar` — full Bible-graph engine — for what would still be a one-shot import.

**Implication:** `usfm-grammar` is removed from `tools/package.json` dependencies. When a second translation is added in a later phase, this decision is revisited — if the new translation surfaces markers BSB doesn't use, extending the line-based parser or moving to a library is reconsidered then.

---

## D14. Drop inline `<!-- p:type -->` paragraph-type comments (amends D11.4)
**Decided:** 2026-04-25 · **Status:** locked (Phase 1)

D11 specified one HTML comment per paragraph (`<!-- p:m -->`, `<!-- p:pmo -->`, …) carrying USFM paragraph type for a future Phase 2 renderer. The framing was "invisible in Obsidian rendering; survives markdown round-trips."

First-contact testing in Obsidian during Phase 1.0 closeout: the comments are visible in **both** live preview and reading view. They're meaningful structural noise in the user's daily workflow. The per-verse-paragraph fix (correctly implementing D11.4's "each verse is its own markdown paragraph block" — see below) multiplies their density 3–5×, making the cost worse than initially estimated.

**Decision:** Drop the inline paragraph-type comments. Chapter markdown carries only content + verse markers (`**N**`) + verse-end block-refs (`^vN`) + visible structure (blockquote nesting for poetry, headings, see-also, superscriptions, acrostic letters) + footnotes.

**Per-verse-paragraph rendering (clarifies D11.4):** D11.4 already required "each verse is its own markdown paragraph block." The Phase 1 importer initially emitted one paragraph per *USFM* paragraph, leaving multi-verse paragraphs (e.g. Eph 5:22–24 in one `\m`) sharing a single markdown paragraph. Obsidian only honors one block-id per paragraph, so `#^v22` and `#^v23` links into such a paragraph failed to navigate. The renderer now emits one markdown paragraph per verse segment; CSS still collapses adjacent margins so prose flows. Multi-paragraph verses (Gen 1:5 pattern) keep the verse-number marker on the first segment and the `^vN` anchor on the last, unchanged.

**Where the paragraph-type metadata goes if Phase 2 needs it:**
- Re-import from `data/usfm/BSB/` with a future `--with-paragraph-meta` flag that emits a sidecar JSON in the shape of D11.1's Strong's sidecar.
- Or Phase 2's renderer reads the USFM source directly. The data isn't lost — it's in the bundle and re-deriving is cheap.

**Considered:**
- **Sidecar JSON now**: speculative — Phase 2 may not need it, or may want it shaped differently. Punted.
- **Frontmatter `paragraphs:` map**: 30–150 lines of YAML per chapter. Worse cost than the inline comment.
- **Keep, rely on reading view**: Obsidian's reading view does *not* hide HTML comments (verified in Phase 1.0 testing).

**Implication:** `tools/import-usfm.ts` no longer renders the comment. The `Block.ptype` field stays in the AST (cheap; useful for the future sidecar). A test in `tools/import-usfm.test.ts` asserts no `<!-- p:` substring appears in chapter output, so accidental re-introduction is caught.

---

## D15. Acrostic letters render as `#### LETTER` (h4), not `**LETTER**` (amends D11.6)
**Decided:** 2026-04-25 · **Status:** locked (Phase 1)

D11.6 specified `\qa ALEPH` → `**ALEPH**` on its own line. Looks fine in the markdown source, but causes a CSS-detection problem once we try to style chapter pages.

**The collision.** Chapter pages need a CSS rule that makes acrostic markers (and only acrostic markers) render with section-marker styling — small-caps, muted, on their own line. The only structural CSS hook available for `**ALEPH**` is `p:has(> strong:only-child)`. CSS `:only-child` ignores text-node siblings (only counts element siblings), so that selector also matches every verse paragraph (`<p><strong>¹</strong> verse text…</p>` — `<strong>` is the only *element* child). Result: every verse renders in small-caps, which is what surfaced during Phase 1.0 visual testing.

**Decision:** acrostic letters render as level-4 markdown headings. `\qa ALEPH` → `#### ALEPH`. This gives the CSS a clean unambiguous selector (`.bible-flow h4 { … }`) and the rest of the renderer doesn't change.

**Why h4 specifically:** the heading hierarchy in chapter files is already `#` (chapter title), `##` (`\s1`), `###` (`\s2`). h4 is the next free slot and visually appropriate for sub-section markers. Headings naturally break the prose flow (block-level), which is also exactly what we want for stanza separators.

**Considered:**
- **Keep `**LETTER**`, find a smarter CSS selector.** No structural way exists in CSS to differentiate "p containing only `<strong>` and nothing else" from "p starting with `<strong>` then text" without text-content detection. Dead end.
- **Custom HTML hook (`<div class="acrostic">…</div>`).** Breaks the project rule against HTML in markdown.
- **h5 or h6.** Too small visually. h4 sits at the right weight.

**Implication:** importer emits `#### LETTER`. Tests assert this shape. CSS targets h4 directly for acrostic styling. Phase 2 renderer (when it exists) can detect acrostic markers by heading level rather than by paragraph-content pattern — strictly an improvement.

---

## D16. Daily reading-prep note shape: filename-as-date, one note per day, multi-passage as list
**Decided:** 2026-04-26 · **Status:** locked (Phase 1)

The original reading template (and the matching frontmatter schema in `vault/_templates/CLAUDE.md`) assumed one passage per reading and a slug-based filename (`YYYY-MM-DD-{slug}.md`). First real use surfaced two mismatches: the user is on the M'Cheyne plan (four unrelated passages per day), and the Obsidian Calendar plugin keys daily notes by filename.

**Decision — three interlocking parts:**

1. **Filename is the date.** Daily reading-prep notes are named `YYYY-MM-DD (Day).md` (e.g. `2026-04-26 (Sunday).md`). The day-of-week parenthetical is optional but recommended — it costs nothing and helps when scanning the file list outside Calendar. The Calendar plugin parses the date prefix; any markdown viewer renders the rest.

2. **Drop `date` from frontmatter.** Filename is canonical. `created` and `updated` remain — they're meaningfully distinct (you can prep Saturday for Sunday). Per the `vault/_templates/CLAUDE.md` rule "keep fields minimal; every field is a maintenance burden."

3. **Multi-passage by default.** Rename `passage` → `passages` (list). `passage_links` was already a list. Single-passage days are a list of one — consistent shape across the schema.

**One note per day, not per passage.** Per-passage subsections (`## [[bible/Exo/04#^v1|Exodus 4:1–31]]` etc.) hold their own Summary / Entities / Cross-references / Themes / Questions. Shared `During reading` / `After reading` / `Connections back to prior notes` sections sit at the bottom of the file. Reasoning:
- The reading-prep note is a *launchpad for one session*, not a durable per-passage record. Durable per-passage knowledge accumulates in entity stubs.
- M'Cheyne's daily readings are intentionally unrelated; splitting into four files multiplies maintenance overhead without adding queryability the entity stubs don't already give.
- Thematic plans (e.g. three Psalms together) are equally well-served by sectioning inside one note.

**Plan signature lives in the H1, not frontmatter.** Daily notes start with `# M'Cheyne - Day 52` or similar. Adding `plan` / `plan_day` frontmatter fields would help only users on a named plan, and the H1 carries the same information without burdening users on no plan or on ad-hoc reading.

**Considered:**
- **Per-passage files embedded with `![[]]` from the daily note.** Only worthwhile if the per-passage notes are durable across years (cumulative knowledge per passage). They're not — entity stubs and the existing cross-reference surfacing in the prep prompt already cover that.
- **Date in frontmatter for query convenience.** Bases / Dataview / grep can extract the date from the filename trivially; redundant field with no payoff.
- **`passages` always-list schema for prep notes; `passage` singular for unrelated single-passage notes elsewhere.** No other note types carry passages. Keeping one shape is simpler.

**Implication:**
- `vault/_templates/reading-template.md` is restructured for multi-passage shape.
- `vault/_templates/CLAUDE.md` schema doc updated: `date` removed from `reading` extras; `passage` → `passages`; filename convention documented.
- `tools/prompts/reading-prep.md` rewritten to accept multi-passage input, fill the existing date-named note (not create a slug-based path), and scaffold per-passage subsections.

---

## D17. Pre-reading prep is descriptive only; interpretation is user-filled post-reading
**Decided:** 2026-04-26 · **Status:** superseded by D21 (2026-04-27)

The first end-to-end reading-prep run surfaced a category error in the prompt: AI-filled `Themes` and `Questions to carry into the reading` sections were *interpreting Scripture before the user read it* — exactly the bias the vault's "quote, don't paraphrase" / "mark interpretation as interpretation" hard rules exist to prevent. Even the AI-filled `Cross-references` (BSB editorial parallels + footnote refs), while factual, is the BSB editors' interpretation of which passages connect — and pre-listing them shapes the reading.

**Decision — split per-passage and shared sections by who fills them:**

**AI-filled (descriptive, mechanical):**
- `Summary` — quote-heavy 2–4 sentences describing what the passage *is*. Connective prose is permitted, but interpretation ("likely emphasizes…", "traditional reading is…") is not.
- `Entities` — links to people / places / concepts / events stubs.
- `Connections back to prior notes` (shared tail) — grep results from the user's own prior notes that link into the day's passages. Mechanical surfacing of *the user's own* prior work; not interpretation.

**User-filled (post-reading, blank placeholders):**
- `Cross-references` (per passage) — the user pulls in BSB editorial parallels, footnote refs, or their own observed cross-refs *if and when they want*. AI does not pre-populate these.
- `Themes` (per passage) — interpretation; user-only territory.
- `Questions/Reflections` (per passage; renamed from "Questions to carry into the reading" since the original framing presupposed pre-fill) — interpretation; user-only.
- `During reading` / `After reading` (shared tail) — already user-filled by design.

**Why per-passage for the post-reading sections.** Today's M'Cheyne reading was four unrelated passages; collapsing themes / cross-refs / questions into a shared block at the file tail would mash them together. Each passage gets its own `### Cross-references` / `### Themes` / `### Questions/Reflections` so the structure mirrors how the user actually engages each passage independently.

**Why pull `Cross-references` from AI-fill specifically.** It seemed like a free win — surfacing the BSB's pre-linked parallels costs nothing — but it primes the reader on what counts as "related." User decided: "I'll choose to read/include those if I want to." The chapter file under `vault/bible/` already has the BSB `*See also: …*` lines and footnotes inline, navigable from the verse-link in the section heading. No need to duplicate them in the prep.

**Considered:**
- **AI fills `Themes` but marks them as interpretation** ("Likely emphasizes…"). Rejected: the framing tag doesn't undo the priming effect of being told what to look for before opening the text.
- **AI fills `Questions` but marks them as starting points.** Same priming problem; same rejection.
- **AI fills `Cross-references` (factual surfacing) but not `Themes` or `Questions`.** Rejected per user preference above — even factual surfacing pre-shapes the reading.

**Implication:**
- `vault/_templates/reading-template.md` reordered: per-passage block has Summary → Entities → Cross-references → Themes → Questions/Reflections, with the last three left blank.
- `tools/prompts/reading-prep.md` updated: AI fills only Summary, Entities, and Connections-back-to-prior-notes; explicit instruction *not* to populate Cross-references / Themes / Questions/Reflections.
- `vault/_templates/CLAUDE.md` documents the AI-fill / user-fill split so any future agent (or successor prompt) honors it.
- The `reading` frontmatter `status` field gains practical meaning: `prep` = AI-filled descriptive scaffold; `read` = user has read the passage; `reflected` = user has filled in their own Cross-references / Themes / Questions/Reflections.

---

## D18. Note slugs use title case with spaces, not lowercase-hyphenated
**Decided:** 2026-04-26 · **Status:** locked (Phase 1)

Original slug rule (in `vault/_templates/CLAUDE.md`): lowercase, hyphenated, ASCII only — `mount-sinai.md`, `tower-of-babel.md`, `john-the-baptist.md`. First-use friction surfaced during the Phase 1.0 reading-prep validation: this is *not* the standard Obsidian convention. Obsidian's docs, the obsidian-markdown plugin examples (Kepano's), and Steph Ango's published vaults all use title case with spaces — `Mount Sinai.md`, `Tower of Babel.md`, `John the Baptist.md`. Lowercase-hyphenated reads as "web slug" rather than "note title"; inside Obsidian, title case is what `[[` autocomplete shows and what the user reads naturally.

**Decision — title case with spaces, ASCII (+ apostrophes):**

- Capitalize the first letter of nouns, verbs, adjectives, pronouns, adverbs.
- Lowercase articles (`a`, `an`, `the`), coordinating conjunctions (`and`, `but`, `or`, `nor`, `for`, `so`, `yet`), and short prepositions (`of`, `in`, `on`, `at`, `by`, `to`, `up`, `as`) — except when they are the first word.
- ~~Apostrophes are preserved (`Centurion's Servant.md`, `Widow's Son.md`).~~ **Amended by D20:** Obsidian doesn't accept ASCII apostrophes in filenames during rename. Filenames drop the apostrophe (`Centurions Servant.md`, `Widows Son.md`); the apostrophe form is carried as an alias in frontmatter so `[[Centurion's Servant]]` still resolves and autocomplete still works.
- Disambiguation lives in the filename, then alias for display: `Mary Mother of Jesus.md`, `[[Mary Mother of Jesus|Mary]]`.
- Numerals: spell out unless natural English keeps them (`First Temple`, not `1st Temple`); for Bible books keep numeric prefix in path codes (`1Sa`, `2Co`).
- **Aliases in frontmatter follow the same rule.** `aliases: ["Christ", "Jesus Christ", "the Lord"]`, not lowercased. Aliases serve the same lookup role as filenames; consistent casing keeps autocomplete and link resolution predictable.

**Why this is a real swap, not bikeshedding:**

- **Native Obsidian flow.** `[[` autocomplete surfaces titles. Title-case-with-spaces matches what the user types and reads; lowercase-hyphenated requires mental translation.
- **Display-alias often unnecessary.** `[[Moses]]` reads cleanly. The old form required `[[moses|Moses]]` for natural-language display; the alias paid for nothing.
- **Obsidian community conventions.** Kepano's vaults, the obsidian-skills examples, and Obsidian's own docs all use title case.
- **Portability untouched.** Spaces in filenames are valid in modern markdown viewers (vim, VS Code, GitHub, Obsidian, glow, bat). Apostrophes are valid. ASCII still holds.

**Considered:**
- **Sentence case** (`Mount sinai.md`): looks wrong; not the convention.
- **Mixed conventions** (slug-style for some folders, title-case for others): added cognitive load with no benefit.
- **Keep lowercase-hyphenated:** more web-native but conflicts with Obsidian's autocomplete and reading flow. The vault is the product; optimize for the vault.

**Implication:**
- All existing entity stubs (created during Phase 1.0 reading-prep validation, 2026-04-26) renamed.
- `vault/_templates/CLAUDE.md` slug rules + link examples updated.
- `tools/prompts/reading-prep.md` updated to use the new convention.
- Wiki-links in already-created notes (the daily reading note, event stub frontmatter) updated.
- macOS APFS default is case-insensitive; case-only renames (e.g. `moses.md` → `Moses.md`) require a two-step `mv` via temp name. Multi-word renames are direct.

---

## D19. No H1 in entity stubs; H1 only when it carries information beyond the filename
**Decided:** 2026-04-26 · **Status:** locked (Phase 1)

After D18 lands title-case-with-spaces filenames (`Moses.md`, `Hardening of Heart.md`), the H1 inside entity stubs is purely echoing the filename — and prone to drift (the `# Hardening of heart` vs `Hardening of Heart.md` mismatch surfaced during the sweep). Obsidian renders the filename as a title at the top of reading view, making the H1 visually redundant in the primary tool.

**Decision:** drop the explicit `# Title` H1 from entity stubs (people, places, concepts, events). The blockquote lede becomes the first body content, directly under frontmatter.

**Scope — this rule applies only to entity stubs.** Two classes of files keep their H1:
- **Bible chapter files** (`# Genesis 1`) — H1 is generated by the importer for `cat`-readability across non-Obsidian tools (a working principle from `PROJECT.md`). Per D11, chapter files are intentionally readable in any markdown viewer; the H1 is part of that.
- **Daily reading notes** (`# M'Cheyne - Day 52`) — H1 carries information that's *not* in the filename (`2026-04-26 (Sunday).md`). Plan signature stays in H1 per D16.

**Rule of thumb:** keep H1 when it would say something the filename doesn't. Drop H1 when it would just echo the filename.

**Tool-agnostic cost — small but real.** Without an H1, `cat Moses.md` opens with frontmatter then a blockquote — no rendered title. Same in `bat`, `glow`, GitHub's renderer, VS Code preview. The data is portable (frontmatter declares `type: person`; filename is in the path), but non-Obsidian rendering is mildly degraded. We accept this for entity stubs because they're working notes, primarily viewed in Obsidian, and the redundancy/drift cost of keeping H1 outweighs the rendering polish in tools that aren't the primary use case. Bible chapter files — which *are* primary candidates for non-Obsidian inspection — keep their H1 explicitly.

**Considered:**
- **Keep H1, sweep to match filename whenever renamed.** Adds friction to every rename; H1-vs-filename drift is now possible per stub. Rejected.
- **Drop H1 from all notes including Bible chapters.** Loses the cat-readability working principle for the corpus. Rejected.
- **Use a different placeholder line (e.g. an h2 lede label).** Adds noise without a payoff Obsidian's title-rendering doesn't already give for free.

**Implication:**
- The four entity templates (`person/place/concept/event-template.md`) drop the `# Name` line.
- The 30 existing entity stubs lose their H1 in a one-time sweep.
- `vault/_templates/CLAUDE.md` documents the rule.
- `tools/prompts/reading-prep.md` no longer instructs the AI to write an H1 inside entity stubs.

---

## D20. Apostrophes live in aliases, not in filenames (amends D18)
**Decided:** 2026-04-26 · **Status:** locked (Phase 1)

D18 originally specified "apostrophes preserved" in filenames (`Centurion's Servant.md`). First-use friction: Obsidian's rename interface won't accept ASCII apostrophes (U+0027) in filenames — possibly a deliberate filter, possibly a side effect of input-method handling. Files end up renamed without the apostrophe regardless of intent, so the rule has to align with what Obsidian will actually do.

**Decision:** Filenames are apostrophe-free. The apostrophe form is preserved as an alias in frontmatter.

Examples:
- File: `Healing of the Centurions Servant.md`
- Aliases: `["Healing of the Centurion's Servant", "Centurion's Servant"]`
- Effect: typing `[[Centurion's` in Obsidian autocomplete still finds the file; rendered display via alias still shows the natural-language form when desired.

**Why aliases are the right home for this:**

- **Autocomplete lookup still works.** Obsidian indexes aliases for `[[` resolution, so the natural-language form is reachable.
- **Display flexibility.** `[[Centurion's Servant|Centurion's Servant]]` still renders correctly; the alias-resolution machinery handles the apostrophe form even though the file lacks it.
- **No filesystem games.** Apostrophes vary across encoding, sync layers, and shell quoting. Keeping them out of filenames removes a class of portability hazards.

**Considered:**
- **Use Unicode right-single-quote (U+2019) in filenames** instead of ASCII apostrophe. Possibly works in Obsidian but adds a typing friction (special character on the keyboard) and creates a search-divergence between typed `'` and stored `'`. Rejected.
- **Strip apostrophes from displayed text too.** Loses the natural reading. Rejected.
- **Don't worry about it; just write filenames without apostrophes and don't bother with aliases.** Loses the autocomplete affordance — a user (or AI) typing `[[Centurion's` would not find the file. Rejected.

**Implication:**
- D18's "apostrophes preserved" is struck through and points here.
- `vault/_templates/CLAUDE.md` filename rules section updated.
- Existing event stubs (`Healing of the Centurions Servant.md`, `Raising of the Widows Son at Nain.md`) gain aliases for the apostrophe form.
- Future stubs created by the reading-prep prompt: when a name has a possessive, generate the filename without the apostrophe and seed both alias forms (`"Foo's Bar"`, `"Foo's"` short form) in frontmatter.

---

## D21. Reading-prep further simplified: Entities + per-passage Notes + Connections-back only (supersedes D17)
**Decided:** 2026-04-27 · **Status:** locked (Phase 1)

D17 split per-passage sections into AI-fill (Summary, Entities) and user-fill (Cross-references, Themes, Questions/Reflections), plus shared user-fill During/After-reading. First real use surfaced that even the AI-filled Summary primes the reading (and is rarely useful — the chapter file is one click away from the section heading), and the four user-fill sections (Cross-references / Themes / Questions/Reflections / During / After) artificially partition what is in practice freeform thought. The user dictates a single stream of notes during/after reading; carving it into category buckets adds friction without value.

**Decision — minimum viable reading-prep note:**

**Per passage (under each `## [[verse-link]]` H2):**
- `### Entities` (AI-filled) — bulleted People / Places / Concepts / Events links to stubs.
- `### Notes` (user-filled) — single freeform scratchpad, left blank by AI.

**Shared tail (one section):**
- `## Connections back to prior notes` (AI-filled) — grep results from the user's own prior notes that link into the day's passages. Unchanged from D17.

Dropped:
- `### Summary` (was AI-filled). The chapter file's verse link in the section heading already gives instant access to the text; a paraphrase is redundant and primes the reading.
- `### Cross-references`, `### Themes`, `### Questions/Reflections` (were user-filled placeholders). Folded into per-passage `### Notes`.
- `## During reading`, `## After reading` (were shared user-filled). Folded into per-passage `### Notes`.

**Why per-passage Notes (not one shared Notes section).** A day's reading often spans unrelated passages (M'Cheyne plan: 4 passages from different books). Dictation captured under the wrong passage is hard to disentangle later when pulling thoughts into entity notes. Keeping the scratchpad per-passage means the AI's verse-link section heading anchors the user's freeform thoughts to the right passage automatically.

**Why drop Summary specifically.** The summary was always one click away — the section heading itself links to the chapter file. Reading the summary inside the prep note instead of the chapter file is strictly worse (paraphrase, no verse anchors, ai-shaped). The "what is this passage" question is answered by opening the link.

**Implication:**
- `tools/prompts/reading-prep.md` rewritten: AI fills Entities (per passage) and Connections-back (shared). Nothing else.
- `vault/_templates/reading-template.md` restructured: per-passage block is `### Entities` + `### Notes`; shared tail is `## Connections back to prior notes`.
- `vault/_templates/CLAUDE.md` "Reading-prep section split" subsection rewritten.
- The `status` field's interpretation simplifies: `prep` = AI scaffold only (entities + connections-back filled); `read` = user has read; `reflected` = user has filled the per-passage `### Notes`.

**Considered:**
- **Single shared `## Notes` section** instead of per-passage. Simpler shape, but cross-passage dictation requires the user to remember which thought went with which passage when refining later. Per-passage anchoring wins.
- **Keep Summary, drop only the user-fill placeholders.** The Summary's marginal value over a verse-link click is near zero; removing it eliminates the priming concern entirely without losing utility.
- **Keep one of Themes/Questions, drop the rest.** All three were freeform thought wearing different category hats. Collapsing into Notes is honest about what was actually being captured.

---

## D22. Stub seed: blockquote only when name is ambiguous; always seed Key passages with spawning link (amends D5)
**Decided:** 2026-04-27 · **Status:** locked (Phase 1)

D5 specified that AI eagerly creates entity stubs with a one-sentence body seed during reading prep. First real use: the seed is most often redundant. Stubs named `Moses.md`, `Mount Sinai.md`, `Binding of Isaac.md` already telegraph what they are from the filename; `Abraham.md` with `aliases: ["Abram", "the patriarch"]` is fully identified before the body. The seed is only earning its keep when the title (and aliases) leave real ambiguity — a place name shared across regions ("Antioch"), a concept that's theologically loaded ("Election"), an obscure biblical term.

**Decision — two-rule stub seeding:**

1. **Blockquote lede is omitted by default.** Templates do not include the `> One-sentence …` placeholder anymore. The first body content under frontmatter is `## Key passages`.

2. **AI adds a blockquote lede only when title + aliases together leave the entity ambiguous.** Examples:
   - **Add a lede:** `Antioch.md` (Pisidian vs Syrian), `Election.md` (theological term with multiple senses), an obscure biblical term whose meaning isn't obvious from the name.
   - **Skip the lede:** `Moses.md`, `Mount Sinai.md`, `Binding of Isaac.md`, `Healing of the Centurions Servant.md`.

3. **Always seed `## Key passages` with the spawning verse-link.** When the AI creates a stub during reading prep, the entry under `## Key passages` is the verse-link from the day's passage that referenced the entity. If multiple of today's passages reference the same entity, list all the spawning links.

**Why amend D5 rather than supersede.** D5's eager-creation policy stands: stubs are still created without confirmation, the linter still handles cleanup. Only the seed-content rule changes.

**Why "skip" not "always omit".** Some entities genuinely need scope. The judgment is "would a reader knowing only the filename + aliases be confused about which entity this is?" If yes, add the lede; if no, skip.

**Implication:**
- `vault/_templates/{person,place,concept,event}-template.md`: blockquote line removed.
- `vault/_templates/CLAUDE.md` "Stub creation policy" updated.
- `tools/prompts/reading-prep.md` Step 4 (Stub creation) updated to match.
- Existing stubs (created before this decision) are not retroactively edited — they're not wrong, just less minimal than the new default.

**Considered:**
- **Keep the lede always, just write less.** "One sentence" was already the rule and it was still mostly redundant. Length wasn't the problem; existence-when-redundant was.
- **Drop the lede entirely, no exceptions.** Loses the disambiguation affordance for ambiguous names. Worth keeping as an opt-in.
- **Auto-seed `Key passages` was implicit before, formalize it.** The reading-prep prompt already creates a context-rich link surface, but the spawning passage wasn't durably recorded in the stub. Now it is.

---

## D23. Vault reference data lives at `vault/docs/`, peer to `notes/` and `bible/`
**Decided:** 2026-04-28 · **Status:** locked (Phase 1)

The vault has so far had three top-level locations: `_templates/` (tracked scaffolding), `bible/` (generated chapter files, gitignored), and `notes/` (user study notes, gitignored). Importing the M'Cheyne reading plan — a generated reference document, not a user note and not Bible text — surfaced the need for a fourth top-level location for vault-side reference data.

**Decision:** `vault/docs/` is the home for vault-side reference data — content the user reads or links to as a lookup, not as part of their personal study corpus.

Initial inhabitants:
- `vault/docs/reading_plans/m_cheyne.md` — generated by `tools/import-mcheyne.ts` from the XLSX in `data/`.

Anticipated future inhabitants (not yet built): Strong's concordance lookups, biblical-Hebrew/Greek glossaries, gazetteers, and similar look-up tables.

**Why a new top-level dir, not under `notes/`.** The `notes/{type}/` convention (D6) is for the user's own study notes — people, places, concepts, events, readings. Reference data is impersonal: regenerable from source, stable across users, exists to be linked to. Treating it as a peer of `bible/` (also reference, also regenerable) preserves the distinction. Putting reference data under `notes/` would conflate "things I wrote about" with "things I look up."

**Why `docs/` as the name.** "Plans" is too narrow for the first inhabitant. "Reference" and "docs" both work; `docs/` is shorter and was the user's preferred term. The naming overlap with the project's top-level `docs/` (project planning) is unambiguous in any path because every reference includes the leading directory: `docs/planning/...` for project planning, `vault/docs/...` for vault reference.

**Gitignore.** `vault/docs/**/*.md` is gitignored — reference content is regenerated by tools/, not committed. The directory is created by the importer (`mkdir -p`) on first run; no `.gitkeep` is needed.

**Implication:**
- `.gitignore` updated to add `vault/docs/**/*.md`.
- `tools/import-mcheyne.ts` added; emits to `vault/docs/reading_plans/m_cheyne.md` by default. XLSX source in `data/` is gitignored; URL recorded here.
- `vault/_templates/CLAUDE.md` "Layout" section gains a `docs/` entry and a brief description of what lives there.
- `tools/prompts/reading-prep.md` updated to recognize "Day N" / "M'Cheyne Day N" inputs and resolve passages from `vault/docs/reading_plans/m_cheyne.md`.

**Source URL for the M'Cheyne XLSX:** <https://jonathanvajda.com/2021/01/11/bible-reading-plan-spreadsheet/> (Jonathan Vajda, based on formatting from Ben Edgington at edginet.org).

**Considered:**
- **Under `notes/plans/`** — falls under existing gitignore, no decision needed. Rejected: reference data isn't user notes (D6 convention).
- **`vault/reference/`** — clearer term; longer; not the user's preferred naming.
- **`vault/data/`** — name overlaps with the top-level `data/` (raw source bundles). Avoided.
- **Per-day individual files (`vault/docs/reading_plans/m_cheyne/day-001.md` …)** — gives each day a navigable link target but creates 365 files for a use case (look up a day) the table answers in one screen of scroll. Defer until there's a real need to link individual days.

---

## D24. Phase 1.5 plugin enhances vault format; does not change it
**Decided:** 2026-04-28 · **Status:** locked (Phase 1.5 guardrail)

The Phase 1.5 Obsidian plugin (verse picker, link helper, Strong's popover, inline notes, etc.) reads the existing vault format and renders it better. It does not introduce new frontmatter fields, new link syntax, new file conventions, or any other format mutation. If a plugin feature wants a format change, the change goes through `DECISIONS.md` first, lands in `vault/_templates/CLAUDE.md`, and is implemented by the importer (or as a documented vault convention) — not silently by the plugin.

**Why:** The vault is the portable product; the plugin is one optional interface. Format changes that live only inside the plugin break tool-agnosticism (PROJECT.md "vault format must remain documented and tool-agnostic") — disabling the plugin or opening the vault in another markdown tool would silently lose data or produce broken renderings. Format is a contract; plugins are renderers.

**Tested by:** disable the plugin or open the vault in any non-Obsidian markdown tool (vim, glow, VS Code, GitHub render). Notes parse, render, and link as before. The plugin only adds affordances; it does not load-bear the format.

**Considered:**
- **Allow plugin-private frontmatter (`plugin:` namespace).** Slippery — once one field exists, others creep in, and the tool-agnostic line blurs. Rejected.
- **Allow custom link syntax that the plugin resolves.** Same problem — disabling the plugin breaks navigation. Rejected.
- **No guardrail; plugin can do what it wants.** First-pass simplicity, but loses the property that motivated the architecture (vault outlives any specific tool).

**Implication:**
- Plugin reads only documented format (frontmatter and link forms in `vault/_templates/CLAUDE.md`).
- New vault data the plugin needs (e.g. Strong's per-entry notes per D25) lands via the importer in a documented format.
- This decision is the entry gate for any Phase 1.5 feature: "does it require a format change?" If yes, decision-first. If no, build it.

---

## D25. Strong's dictionary as per-entry markdown notes at `vault/bible/_strongs/`
**Decided:** 2026-04-28 · **Status:** provisional (revisit after performance testing in Phase 1.5)

The Phase 1.5 plugin's Strong's popover needs lookup data for ~14,300 entries (Hebrew H1–H8674 + Greek G1–G5624). Per D24, this data lives in the vault, not as a plugin-private asset. Three storage shapes were considered:

- **Single sidecar JSON** at `vault/bible/_strongs/dictionary.json`. Compact, easy to load. Loses Obsidian-native graph integration: no entry note to navigate to, no backlinks.
- **Per-letter chunked JSON.** Same shape problem; mitigates only a hypothetical file-size concern.
- **Per-entry markdown notes** (`vault/bible/_strongs/H1234.md`, `G5547.md`). Each entry is first-class in the Obsidian graph; user can navigate to and edit any entry; gives the option (later) of treating Strong's-tagged words in chapter files as wiki-links to entries — backlinks ("which verses use this lemma?") would then fall out for free.

**Decision:** per-entry markdown notes. Most extensible; aligns with the vault-as-graph principle; matches the user's preference.

**Status: provisional.** Performance with 14,300 vault notes is unknown. Obsidian's indexer, mobile sync, and file-tree rendering may struggle. If Phase 1.5 testing surfaces unacceptable performance, fallbacks (per-letter chunked JSON or single dictionary JSON) remain available; the importer's idempotence makes a swap cheap.

**Phase 1.5 plugin reads from per-chapter sidecar JSON (per D11.1) + entry notes (per this decision).** Chapter files are not modified — they continue carrying word-by-word Strong's tags in the per-chapter sidecar JSON shipped by `tools/import-usfm.ts`. The plugin's word-click handler reads the chapter sidecar to find the Strong's number, then opens the corresponding `H1234.md` / `G5547.md` entry note in a popover. **No D11.1 supersession.**

**Backlink option (deferred):** if real use shows that "every verse using H3068" is a valuable view, a follow-on amendment to D11.1 can change chapter-file rendering so Strong's-tagged words become wiki-links to entry notes. That is a real format change and goes through DECISIONS as its own entry. Phase 1.5 does not block on it.

**Considered:**
- **Plugin asset, out of vault.** Best for performance; rejected per D24 / D8 — vault must remain portable.
- **Single dictionary JSON.** Performance-safer; loses graph integration. The graph integration is exactly the user's reason for choosing per-entry. If performance forces this, fall back at that point.
- **Lazy / partial corpus** (only Strong's numbers actually appearing in BSB). Cuts vault note count roughly in half, but the dictionary's own internal cross-references would dangle into uncreated notes. Whole-corpus is simpler. Revisit if performance rules out whole-corpus.

**Implication:**
- New importer `tools/import-strongs.ts`. Ingests a public-domain Strong's source (Open Scriptures, BLB, … — choice deferred to import-time). Emits one markdown note per entry into `vault/bible/_strongs/`. Idempotent.
- Entry note shape: `type: strongs`, `lemma`, `transliteration`, `pronunciation`, `language: hebrew | greek`, plus a body holding the gloss / definition. Per D19, no H1 — the filename (`H1234.md`) carries the title.
- New top-level path under `bible/`: `vault/bible/_strongs/`. Underscored to keep it visually grouped above the per-book directories in the file tree.
- `.gitignore` already covers `vault/bible/`; no change needed.

---

## D26. Chapter nav lines + structural index seed notes
**Decided:** 2026-04-29 · **Status:** locked (Phase 1)

Two reading-affordance additions surfaced after the bulk import landed: navigating chapter-to-chapter by clicking around backlinks was friction (no in-page prev/next), and there was no in-vault landing surface for "what's in this book" or "what books are there." Both cost very little to add and remove real friction for the daily-reading workflow.

### Chapter nav lines (importer-generated)

Each chapter file carries a single nav line under the H1 *and* a duplicate after the footnotes block. Format is plain wikilinks with arrows inside the link text:

```markdown
[[bible/Gen/49|← Genesis 49]] · [[bible/Exo/01|Exodus 1 →]]
```

- Arrows live inside the link text so the arrow itself is clickable.
- No italic — verse paragraphs in `bible-flow.css` reflow inline; nav paragraphs need a different block-out hook.
- Cross-book at boundaries: Gen 50's "next" links to Exo 1; Mal 4's "next" links to Mat 1; Rev 22 has no next; Gen 1 has no prev.
- Single-chapter books (Obadiah, Philemon, 2 John, 3 John, Jude) emit prev (last chapter of the previous book) and next (chapter 1 of the next book) — no within-book neighbors.
- Driven by static `CANONICAL_ORDER` + `CHAPTER_COUNTS` constants in `tools/import-usfm.ts`. Chapter counts are stable across translations of the 66-book canon, so hardcoding is safe and lets `--only Gen` still emit correct cross-book targets even when the next book isn't being parsed in this run.
- Display follows the chapter-file H1: `Psalm 23` (singular), not `Psalms 23`.

### CSS support: `bible-flow.css` block-out rule

Verse paragraphs render inline (per D11.4). To prevent the nav line from reflowing into the prose, `bible-flow.css` gains a sibling rule:

```css
.bible-flow .el-p:has(> p > a.internal-link:first-child) {
  display: block;
  margin-block: 0.7em 0.5em;
}
```

Verse paragraphs always start with `<strong>**N**</strong>`, see-also/superscriptions wrap in `<em>` — only the nav line has an internal-link `<a>` as the first child of the paragraph, so the selector is unambiguous.

### Structural seed notes at `vault/notes/bible/`

Two kinds of file are seeded into `vault/notes/bible/` (not `vault/bible/`) on every importer run, idempotently — created if missing, never overwritten:

- **`vault/notes/bible/Bible.md`** — H1 `# Bible`, two `##` sections (Old Testament / New Testament), each a bulleted list of `[[Genesis]]` … `[[Revelation]]` in canonical order. 39 OT + 27 NT entries.
- **`vault/notes/bible/{BookName}.md`** per book (`Genesis.md`, `1 Corinthians.md`, `Psalms.md`, …) — H1 with the book name, then a flat bulleted list of chapter links: `- [[bible/Gen/01|Genesis 1:1–31]]`. Link target is the chapter file (no `^v1` anchor) per the user's spec; the verse range in the display label is `1–{total_verses}`. Display uses the chapter-file H1 convention (`Psalm N`, not `Psalms N`).

**Why `notes/`, not `bible/`.** These are commentary surfaces — the user may extend them with overview notes, themes, structural reflections. Content under `vault/bible/` is generated text the user is told not to hand-edit (per `vault/_templates/CLAUDE.md`); content under `vault/notes/` is user territory. Putting the index pages under `notes/` aligns the no-hand-edit boundary with the actual convention.

**Why idempotent (skip if exists).** Once the user adds commentary to (e.g.) `Genesis.md`, re-running the importer must not clobber it. The same pattern as `setup-vault.ts` for `vault/CLAUDE.md`.

**Filename collision.** `Genesis.md`, `Matthew.md`, etc. take the bare-name slot, so `[[Genesis]]` resolves to the book index. The user can always rename if a personal note about Genesis-as-a-concept eventually wants the slot.

**No frontmatter.** Seeded files start without YAML frontmatter to keep them minimal and ungainly; if the user grows them into commentary they can add frontmatter at that point. The seed isn't claiming a `type:` taxonomy slot the templates don't have.

### Considered

- **Italic nav line** (`*[[…]] · [[…]]*`) — would have matched the existing `:has(em:only-child)` block-out rule for free, but the user prefers no italic.
- **Seed notes under `vault/bible/`** — colocated with chapter files but conflates generated/no-edit territory with user-editable territory. Rejected.
- **Seed notes under `vault/docs/`** (per D23) — `docs/` is for impersonal regenerated reference data (M'Cheyne plan, future Strong's index). Book-overview pages aren't impersonal — they're commentary stubs. Rejected.
- **Always regenerate, never preserve** — would let chapter counts auto-update but would burn user commentary on every importer run. Rejected for Phase 1; Bible chapter counts are stable so the lost auto-update isn't real value.
- **`Bible.md` always overwritten** (since its content is purely canonical) — symmetry with per-book idempotence wins; the user might still want to add their own header notes to `Bible.md`. Idempotent across the board.

### Implication

- `tools/import-usfm.ts` exports `chapterNeighbors`, `navLine`, `renderBibleIndex`, `renderBookIndex`, and seeds `vault/notes/bible/` after import.
- `tools/snippets/bible-flow.css` carries the new block-out rule; users who already enabled the snippet need to copy it again into `vault/.obsidian/snippets/` (the importer's setup step does this on first run only — manual copy required for an existing vault, or delete the destination and re-run).
- `vault/_templates/CLAUDE.md` "Layout" gains a `notes/bible/` entry.
- Existing `vault/bible/{Book}/{NN}.md` chapter files need to be regenerated to pick up the nav lines.

---

## D27. Wiki-links to entity notes whose name overlaps a book-overview note use full vault-relative paths
**Decided:** 2026-04-29 · **Status:** locked (Phase 1)

D26 seeded `vault/notes/bible/{BookName}.md` book-overview notes (`Genesis.md`, `Job.md`, `Matthew.md`, …, 67 files). Several of those names collide with existing entity stubs — `notes/people/Job.md` and `notes/bible/Job.md` are both real files with the same basename. Obsidian's `[[Job]]` shorthand resolves to whichever the indexer encounters first; the resolution is not stable across vaults, plugin states, or sync events. Surfaced during reading prep for M'Cheyne Days 56–57 (Job 25–27 day) when the existing prep convention `[[Job]]` was no longer unambiguous.

**Decision:** When linking to an entity whose filename collides with a book-overview note, use the full vault-relative path:

```markdown
[[notes/people/Job|Job]]      — the patriarch
[[notes/bible/Job|Job]]       — the book overview
[[notes/people/Jonah|Jonah]]  — the prophet (vs `notes/bible/Jonah.md`)
```

Verse-anchor links (`[[bible/Job/26#^v6|Job 26:6]]`) are unaffected — they already carry the full path. The ambiguity only exists for the unanchored short form.

**Common collision names** (any of these may be both a book *and* an entity): Job, Ruth, Esther, Daniel, Jonah, Joshua, Hosea, Joel, Amos, Obadiah, Habakkuk, Haggai, Zechariah, Malachi, Matthew, Mark, Luke, John, James, Jude, Titus, Philemon. When in doubt for any name that *might* be a book, default to the full path.

**Considered:**
- **Rename one side of every collision** (e.g., `notes/people/Job Patriarch.md`). Loses the natural `[[Job]]` autocomplete reach for the most common case (the person), and rewriting filenames retroactively breaks every existing inbound link. Rejected.
- **Suffix `(person)` / `(book)` on collision-side filenames.** Same retroactive-link breakage; uglier display. Rejected.
- **Always full-path everything.** Verbose for the 90% case where there's no collision. Rejected.
- **Trust Obsidian's first-found resolution.** Not stable; was the broken status quo. Rejected.

**Implication:**
- `vault/_templates/CLAUDE.md` and `vault/CLAUDE.md` document the rule under "Note-to-note links" / "Disambiguating book-name overlaps."
- Root `CLAUDE.md` "Markdown style (project-wide)" gets a brief pointer so tools/prompts that emit vault content honor the rule.
- `tools/prompts/reading-prep.md` defers to `vault/CLAUDE.md` already, so it picks up the rule transitively without a prompt-side edit.
- `tools/import-usfm.ts` `renderBibleIndex` is updated to emit `- [[notes/bible/{Name}|{Name}]]` for all 66 books — uniform shape for clarity, not just the names that currently collide. Existing per-vault `Bible.md` files seeded under the old shape need to be deleted and re-seeded (the importer is idempotent — it skips an existing file). Per-book index files (`Genesis.md`, …) already use full-path chapter links, so they are not affected.
- Existing entity stubs and reading notes that use bare `[[Job]]` etc. are not retroactively scrubbed — going forward only. The four pre-existing `[[Job]]` person-references (Eliphaz the Temanite stub, two prior reading notes) were updated as part of locking this decision. Future cleanup passes can sweep further if the ambiguity surfaces problems in practice.

**Alias-side collisions.** Some entity stubs carry a book-name as an alias (`notes/people/John the Apostle.md` aliases `"John"`; `notes/people/James Son of Zebedee.md` aliases `"James"`). The filename doesn't collide, but typing `[[John]]` is ambiguous between the alias and the book overview. Obsidian's autocomplete prompts the human to pick, so this is not a practical issue for hand-typed links — but AI agents writing links must remain explicit and never emit the bare alias. The rule: link the full filename (`[[John the Apostle]]`) or use a piped display form (`[[John the Apostle|John]]`). Documented alongside the filename-collision rule in the vault CLAUDE files so future agents see both cases together.
