---
created: 2026-04-24
updated: 2026-04-24
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
**Decided:** 2026-04-24 · **Status:** locked (Phase 1)

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

### D11.6 — Acrostic letters (Psalm 119): bold on its own line

`\qa ALEPH` → `**ALEPH**` on its own line, between sections. Phase 2 renderer detects pattern (single bold-only paragraph between section breaks).

### D11.7 — Translator-supplied italics: markdown `*word*`

`\it word\it*` → `*word*`. **Project-wide convention:** emphasis uses `*…*` form, never `_…_`. Applies in chapter files, footnote text, "see also" lines, and `\d` superscriptions (`*A Psalm of David.*`).

### Paragraph-type metadata

Each verse paragraph is preceded by an HTML comment recording the USFM paragraph type: `<!-- p:m -->`, `<!-- p:pmo -->`, etc. Invisible in Obsidian rendering; survives markdown round-trips; consumed by Phase 2 renderer for paragraph-aware layout.

### Other locked details

- **Verse-number markers:** Unicode superscript digits (⁰¹²³⁴⁵⁶⁷⁸⁹), bolded. `\v 119` → `**¹¹⁹**`.
- **`\d` superscriptions** (Psalm headings): `*A Psalm of David.*`.
- **`\b` blank-line markers:** rendered as a blank line in markdown source.
- **Section headings inside poetry:** break out of the blockquote; section heading + blockquote are separate top-level blocks in markdown anyway.

### Tooling

- **Package manager:** npm
- **Language:** TypeScript (ESM)
- **Parser:** `usfm-grammar`
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
