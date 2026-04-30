---
created: 2026-04-24
updated: 2026-04-28
status: living document
---

# Roadmap

PROJECT.md has the broader vision; this file tracks what's actually being built in what order. Update as items move.

## Phase 1: Vault Prototype (validate workflow in Obsidian)

**Goal:** real usage — long enough that the early-novelty bump fades and routine takes over — to find out if the vault structure + Claude-assisted reading prep changes my reading behavior. If it doesn't, no amount of Phase 2 polish will save it.

### Phase 1.0 — Setup

- [x] Project brief (`PROJECT.md`)
- [x] Locked-in decisions (`docs/planning/DECISIONS.md`)
- [x] Repo structure: `vault/`, `tools/`, `data/`, `docs/planning/`
- [x] Repo scope: tooling-only — `vault/bible/` + `vault/notes/` outside git (D10)
- [x] Vault skeleton (dirs, `vault/CLAUDE.md`, templates, `.gitkeep` placeholders)
- [x] BSB USFM source acquired into `data/usfm/BSB/`
- [x] **Importer output-format decisions** (D11.1–D11.7, amended by D14/D15)
- [x] USFM importer (TS) — emits `vault/bible/{Book}/{NN}.md`
- [x] Importer validated on hard chapters (Gen 1, Psalm 119, Eph 5–6)
- [x] Bulk import all 66 books / 1,189 chapters
- [x] Daily reading-prep prompt drafted (multi-passage shape locked by D16)
- [x] First end-to-end reading-prep run on a real passage (2026-04-26)

### Phase 1.1 — Daily Use (active; slow cadence)

- [~] Daily reading prep + note capture in vault — underway, three daily notes so far (2026-04-26 through 2026-04-28)
- [~] Friction journal at `vault/notes/_meta/Friction Journal.md` (raw, gitignored) + distilled signal at `docs/planning/phase-1-journal.md` (committed)
- [ ] Mid-period checkpoint: anything broken structurally? Adjust.
- [ ] Retrospective once routine has set in: ship to Phase 2 / iterate on Phase 1 / abandon.

### Phase 1.2 — Stale-Note Linter (deferred until eager stubs become a problem)

- [ ] Scan `vault/notes/**/*.md` for stubs with empty body + zero inbound links + age > N days
- [ ] Dry-run mode and cleanup mode
- [ ] Run as a `tools/lint-stubs.ts` script

## Phase 1.5: Obsidian plugin (push the laptop+Obsidian setup as far as possible)

**Goal:** before committing to Phase 2's iOS app + sync server, find out how much friction can be removed by a focused Obsidian plugin. Verse picker, link helper, Strong's lookup, and inline-note affordances on desktop and mobile. If the plugin delivers, Phase 2's scope may shrink (or shift) substantially.

**Hard guardrail (D24):** the plugin enhances the vault format; it does not change it. No plugin-only frontmatter, link syntax, or file conventions. Format changes go through DECISIONS first.

**Mobile parity is a target.** Phase 1's audio + dictation workflow runs on Obsidian Mobile; the plugin doesn't get to drop mobile.

### Sequencing

- [ ] **Auto reader-mode** for Bible chapter files (S) — first deliverable; proves plugin scaffolding ships.
- [ ] **Verse picker + link helper + range support** (L) — single UI surface; navigate / insert-link / range-aware.
- [ ] **Bible search via FTS5** (M, candidate) — `tools/build-search-index.ts` builds a SQLite FTS5 index with the trigram tokenizer for OliveTree-style wildcard search. Same index reusable by Phase 2's reader app (PROJECT.md Phase 2 item 2). Consider promoting from Phase 2.
- [ ] **Strong's integration** (L) — `tools/import-strongs.ts` ingests a public-domain Strong's source into per-entry markdown notes (D25); plugin renders popover by reading per-chapter sidecar (D11.1) + entry note.
- [ ] **Inline notes** (XL, stretch) — surface inbound-link presence in chapter view; punt-able.

### Phase 1.5 deliverable

- [ ] Plugin in real daily use across desktop and mobile
- [ ] Decision document: ship to Phase 2 / iterate on plugin / abandon. Outcome may shrink Phase 2.

See `phase-1-5.md` for working detail.

## Phase 2: iOS/macOS App + Sync Server

See PROJECT.md "Phase 2" for build order. Not started; revisit after the Phase 1.5 retrospective. Phase 1.5 outcome may shrink or reshape Phase 2's deliverables.

### Open architectural questions to answer before Phase 2 design

Lifted from PROJECT.md so they're tracked, not buried. Each gets a real answer informed by Phase 1 usage.

| # | Question | Phase 1 stance |
|---|---|---|
| 1 | Note identity scheme (path / UUID / timestamp-prefix) | path-based slugs; revisit if rename pain emerges |
| 2 | Verse reference syntax | full block-ref links (D4); shortcut tooling later |
| 3 | Translation pinning in references | implicit single-translation (BSB); pinning deferred |
| 4 | Stub creation policy | eager + linter (D5); revisit if graveyard forms |
| 5 | Sync conflict UX | N/A in Phase 1 (local-only) |
| 6 | Vault structure for entities | type-folders + tags (D6) |
| 7 | Server ↔ laptop mirror mechanics | N/A in Phase 1 |
| 8 | iOS app data path (Documents vs sandbox) | open |
| 9 | Markdown rendering in-app (custom vs library) | open |
| 10 | Authentication for sync server (bearer vs full auth) | open |
