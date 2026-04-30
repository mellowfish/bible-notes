---
created: 2026-04-28
updated: 2026-04-28
status: planned — opens after Phase 1.1 retrospective lands a ship-or-iterate verdict
---

# Phase 1.5 — Working Document

**Purpose:** scope and sequence the Obsidian plugin that pushes the laptop+Obsidian setup as far as possible before committing to Phase 2's iOS app + sync server. Phase 1.5 sits between Phase 1 (vault prototype, validate workflow) and Phase 2 (app + sync); its ship/iterate/abandon decision is independent of Phase 1's, and may legitimately reshape Phase 2's scope.

For canonical references, see (in this order):
- `../../PROJECT.md` — project brief, scope, principles
- `./ROADMAP.md` — milestone tracker
- `./DECISIONS.md` — locked architectural decisions
- `./phase-1.md` — Phase 1 working doc (active during Phase 1.1)
- `../../vault/CLAUDE.md` — vault conventions for AI agents working inside the vault

---

## Why this exists

Phase 2 (iOS/macOS app + sync server) is a substantial build: server, reader app, notes layer, sync, mobile typography. Before committing to that, there's a question worth answering: **how much of the friction can a focused Obsidian plugin remove instead?** If the plugin delivers verse picker, link helper, Strong's lookup, and inline-note affordances on desktop and mobile, Phase 2 may shrink to "sync + reader-typography polish" — or shift entirely.

Phase 1.5 is "wring everything possible out of Obsidian via plugin." Phase 2 then becomes "build whatever Phase 1.5 confirms Obsidian can't do."

## Hard guardrail (D24)

The plugin enhances the vault format; it does not change it. No plugin-only frontmatter, link syntax, or file conventions. Format changes go through DECISIONS first. Test: disable the plugin (or open the vault in vim / glow / VS Code) and notes still parse and link.

## Mobile parity is a target

Per `phase-1-journal.md` (2026-04-27), mobile dictation during commute is a load-bearing workflow. Every Phase 1.5 feature aims for mobile parity:

- **Verse picker** — full-screen modal on mobile (already validated by the OliveTree-style layout the user has used elsewhere); same component, different breakpoint.
- **Inline-note indicators** — preferred direction is "inline only" on both surfaces, unifying the rendering rather than splitting desktop (gutter) from mobile (inline).

If a feature can't reach mobile parity, that itself is signal for what Phase 2 must build.

## Features

### Auto reader-mode for Bible chapter files
**Size:** S
**What:** when a file with `cssclasses: [bible-flow]` (or a path under `vault/bible/`) is opened, force Obsidian into reading view rather than the user's default editor mode. Toggle reachable as usual.
**Why:** verse-flow CSS only renders correctly in reading view. The toggle-on-every-open is daily friction.
**Role:** first plugin deliverable — proves plugin scaffolding ships end-to-end.

### Verse picker grid + link helper + range support
**Size:** L (combined UI surface, three behaviors)
**What:**
- Modeled on the OliveTree picker grid: book grid → chapter grid → verse grid.
- Two modes: **navigate** (open chapter file, scroll to verse) and **insert-link** (emit verse-anchor wiki-link to the active editor at cursor).
- Optional end-verse for ranges; emitted in the locked D4 form (link the start verse, show the range in display: `[[bible/Eph/05#^v22|Ephesians 5:22-33]]`). When following a range link in reading view, the plugin scrolls and visually highlights the range.

**Why:** typing the full link form by hand is the largest friction in note-taking today (per D4, the form is locked through Phase 1+; tooling to generate it was always intended).
**Mobile:** full-screen modal; same component.

### Bible search (FTS5 index)
**Size:** M (tokenizer + indexer + plugin search UI)
**Status:** candidate — consider promoting from Phase 2's reader-app build order. Plain-text `grep` across `vault/bible/` is fragile (multi-word phrases break across the per-verse paragraph layout; Strong's-tagged chapter files would break it further if D11.1 ever changes). The architecture every serious Bible reader has used since the Palm-era — separate binary search index, decoupled from the source — solves it once.
**What:** new `tools/build-search-index.ts` reads canonical USFM from `data/usfm/BSB/`, tokenizes verses (case-folded, punctuation-stripped, Strong's/footnote markup ignored), and emits a SQLite FTS5 index. Plugin exposes a search command: query input → verse-link results list → click navigates to chapter at the verse.
**Wildcard support:** SQLite FTS5 supports prefix wildcards (`righteous*`) natively in the default `unicode61` tokenizer. For OliveTree-style starred-word search (`*ness`, `*right*`), use the **trigram tokenizer** (SQLite 3.34+) — every token indexed by its 3-grams, so substring queries become fast trigram intersections. Trigram index is ~3–5× the size of the default; well under 100 MB for the BSB corpus.
**Reuse for Phase 2:** the same index file is what Phase 2's reader iOS/macOS app needs (PROJECT.md Phase 2 build order item 2 already lists FTS5 search). Built once in Phase 1.5; usable by the eventual app without rework.
**Open:** index location (in-vault under `vault/bible/_search/index.sqlite` vs. plugin asset out of vault), and SQLite-in-plugin runtime choice (`wa-sqlite` likely for desktop+mobile parity; `better-sqlite3` desktop-only). Both decisions land at implementation time.

### Strong's integration
**Size:** L (data pipeline + plugin rendering)
**What:** clicking a Strong's-tagged word in a chapter file opens a popover with the lemma, transliteration, gloss, and definition. Per D25, dictionary entries live as per-entry markdown notes at `vault/bible/_strongs/H1234.md` (Hebrew) and `G5547.md` (Greek). The plugin reads the chapter's existing sidecar JSON (D11.1) to look up the Strong's number for the clicked word, then opens the corresponding entry note in a popover.
**Data work:** new `tools/import-strongs.ts` ingests a public-domain Strong's source (TBD: Open Scriptures, BLB, …) into per-entry markdown notes. Idempotent like the other importers.
**Risk:** ~14,300 vault notes is unprecedented for this vault. D25 is provisional; performance fallbacks (per-letter chunked JSON, single dictionary JSON) remain available if Obsidian's indexer or mobile sync struggles.

### Inline notes (stretch)
**Size:** XL
**What:** indicate which verses in a chapter have inbound links from `vault/notes/`, and surface those notes either inline near the verse or in a chapter-side panel. Realistic first pass: chapter sidebar listing inbound notes. Second pass: per-verse marker (small inline indicator after the verse text, click-to-expand).
**Why:** "context is king" — visual signal that a verse is linked from somewhere in the user's notes, without leaving the chapter.
**Why XL:** Obsidian's reading view doesn't expose a clean per-verse hook. The markdown post-processor can inject elements adjacent to verse anchors, but doing it without breaking flow, search, or copy/paste is real work. Punt-able if priorities shift.

## Sequencing

Smallest-cheapest-first; each milestone is independently shippable.

1. **Auto reader-mode** — proves plugin scaffolding ships.
2. **Verse picker + link helper + range support** — biggest immediate daily-use win.
3. **Bible search (FTS5)** — trigram tokenizer for OliveTree-style wildcard search; reusable by Phase 2.
4. **Strong's integration** — `tools/import-strongs.ts` lands first; plugin popover second.
5. **Inline notes** (stretch) — reassess after the above are in real use.

## Open questions

- **Plugin distribution.** Sideloaded during Phase 1.5; community-registry submission deferred.
- **Strong's dictionary source.** Open Scriptures (en-strongs) vs. BLB vs. another public-domain set. Choose at the point of writing `tools/import-strongs.ts`.
- **Mobile post-processor parity.** Some Obsidian rendering APIs differ on mobile. Confirm with the first deliverable's smoke test.
- **Backlinks from chapter files to Strong's entries.** Deferred per D25; revisit if the "every verse using H3068" view becomes high-value during Phase 1.5 use. Would amend D11.1.

## Phase 1.5 deliverable

- Plugin in real daily use across desktop and mobile, with parity validated where targeted.
- Decision document: ship to Phase 2 / iterate on plugin / abandon. Outcome may shrink Phase 2's scope.

## Picking up after a session reset

1. Read `PROJECT.md` for vision/scope.
2. Read `DECISIONS.md`, especially D24 (plugin guardrail) and D25 (Strong's location).
3. Read this file for Phase 1.5 state and pending work.
4. **Next concrete action:** wait for Phase 1.1 retrospective. Phase 1.5 does not open until Phase 1's verdict lands.
