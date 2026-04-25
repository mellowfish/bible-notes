---
created: 2026-04-24
updated: 2026-04-24
status: living document
---

# Roadmap

PROJECT.md has the broader vision; this file tracks what's actually being built in what order. Update as items move.

## Phase 1: Vault Prototype (validate workflow in Obsidian)

**Goal:** 2–4 weeks of real usage to find out if the vault structure + Claude-assisted reading prep changes my reading behavior. If it doesn't, no amount of Phase 2 polish will save it.

### Phase 1.0 — Setup

- [x] Project brief (`PROJECT.md`)
- [x] Locked-in decisions (`docs/planning/DECISIONS.md`)
- [x] Repo structure: `vault/`, `tools/`, `data/`, `docs/planning/`
- [x] Repo scope: tooling-only — `vault/bible/` + `vault/notes/` outside git (D10)
- [x] Vault skeleton (dirs, `vault/CLAUDE.md`, templates, `.gitkeep` placeholders)
- [x] BSB USFM source acquired into `data/usfm/BSB/`
- [ ] **Importer output-format decisions** (see `phase-1.md` D11.1–D11.7) — blocked on user
- [ ] USFM importer (TS) — emits `vault/bible/{Book}/{NN}.md`
- [ ] Importer validated on hard chapters (Gen 1, Psalm 119, Eph 5–6)
- [ ] Bulk import all 66 books / 1,189 chapters
- [ ] Daily reading-prep prompt drafted
- [ ] First end-to-end reading-prep run on a real passage

### Phase 1.1 — Daily Use (2–4 weeks)

- [ ] Daily reading prep + note capture in vault
- [ ] Friction journal (`vault/notes/_journal/` or similar) of "I wish it could…" moments
- [ ] Week 2 mid-checkpoint: anything broken structurally? Adjust.
- [ ] Week 4 retrospective: ship to Phase 2 / iterate on Phase 1 / abandon.

### Phase 1.2 — Stale-Note Linter (deferred until eager stubs become a problem)

- [ ] Scan `vault/notes/**/*.md` for stubs with empty body + zero inbound links + age > N days
- [ ] Dry-run mode and cleanup mode
- [ ] Run as a `tools/lint-stubs.ts` script

## Phase 2: iOS/macOS App + Sync Server

See PROJECT.md "Phase 2" for build order. Not started; revisit after the Phase 1 retrospective.

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
