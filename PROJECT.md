# Bible Study External Brain — Project Brief

## Context

I'm a senior software engineer (Ruby expert, proficient in TypeScript/Java/SQL,
shipping iOS/Android apps with Express+TypeORM backends). Previously worked 5
years at Olive Tree Bible Software, including a major rewrite of their text
rendering engine from custom graphics/layout to EPUB+webview.

I'm building a personal Bible study system that functions as an "external
brain" — markdown notes with wiki-style cross-linking, integrated with a
reading experience good enough to pull me back from passive audio consumption
to active reading with note-taking.

## Why This Exists

- I currently listen to audio Bible during commutes and take zero notes
- When I used to read text, I took notes but was constantly frustrated by
  poor cross-linking in existing apps (including the one I helped build)
- My notes are siloed in proprietary formats I don't control
- I want compounding value: notes from today should make tomorrow's reading
  richer, and six months from now my corpus should be a genuine personal
  reference work
- I want LLM-assisted reading prep as a first-class workflow

## Core Design Principles

1. **Markdown files are the source of truth, always.** Notes live as `.md`
   files on disk. Any database is a cache/index, rebuildable from the files.
   If the app disappears tomorrow, the vault still opens in any markdown
   editor and makes sense.

2. **Reading and note-taking share one surface.** Context-switching between
   reader and note app is where note-taking dies. The whole point is to
   eliminate that friction.

3. **Behavior change is the goal, not feature parity.** I'm not trying to
   rebuild Olive Tree or Logos. I'm trying to build something that makes me
   actually read more. The note system being excellent matters more than the
   reader being feature-rich.

4. **Server as vault, clients as views.** The authoritative vault lives on a
   server I control. Each client (iOS, eventually Android, laptop) is a view
   with a local cache for offline use. Laptop has a synced local mirror so
   Claude Code can work against fresh files.

5. **Portability is a discipline, not a default.** Every feature gets
   evaluated against "does this lock data into my app?" If yes, redesign or
   reject.

## Stack Decisions Already Made

- **Storage format**: Markdown with YAML frontmatter for notes; markdown
  with verse anchors for Bible text
- **Bible text source**: BSB (Berean Standard Bible, public domain) imported
  from USFM, preserving paragraph semantics. Per `docs/planning/DECISIONS.md`
  D1–D2.
- **Local index**: SQLite with FTS5 for full-text search and verse lookups
- **Backend**: Express + TypeORM (matches existing infrastructure)
- **Mobile**: iOS/macOS first (SwiftUI). Android is later but architecture
  must not preclude it.
- **Sync**: Server-authoritative vault, clients pull/push, last-write-wins
  with conflict files for now (server holds canonical state, conflicts surface
  as `filename.conflict-{timestamp}.md`). Phase 1 is local-only; Obsidian Sync
  bridges laptop ↔ phone in the interim per D7.

## What I'm NOT Building (Scope Discipline)

- Not building a Logos competitor
- Not building original-language tooling (Strong's, morphology) in v1
- Not building commentaries integration
- Not building audio
- Not building social/sharing features
- Not building multiple translations side-by-side initially (one translation
  is enough to start)

## Phase 1: Prototype (No Custom App)

**Goal**: Validate that the Claude-assisted reading prep workflow actually
changes my reading behavior. Find out if the vault structure makes sense
before committing to building UI around it.

**Approach**:
- Set up a local vault with conventions (templates, vault format spec at
  `vault/_templates/CLAUDE.md`, project AI manual at root `CLAUDE.md`, seed
  data) — three-layer documentation split per D12.
- Import BSB as chapter-per-file markdown with verse anchors (per D11 format
  spec).
- Use Obsidian as the reading/note interface temporarily (accept that it's
  ugly for reading, focus on validating the data model and workflow). Vault
  remains tool-agnostic — Obsidian is one optional interface, not the product.
- Use Claude Code to prep daily readings, create entity stubs, etc. Claude
  Code is also one optional interface; the vault stands alone if removed.
- Local-only on laptop during Phase 1 (per D7); sync correctness isn't being
  validated in this phase.
- Keep a journal of friction points and "I wish it could..." moments.

**Phase 1 Deliverables**:
- Working vault with full Bible text in chosen translation
- Documented vault conventions (CLAUDE.md, template files, frontmatter
  schemas, naming rules, link syntax)
- A reading prep prompt/workflow that I run daily
- Enough actual usage data to know whether the workflow has changed
  reading behavior (long enough that early novelty wears off and routine
  sets in)
- Decision document: ship to Phase 1.5, iterate on Phase 1, or abandon

## Phase 1.5: Obsidian Plugin (push the laptop+Obsidian setup as far as possible)

**Goal**: before committing to Phase 2's app + sync build, find out how much
of the friction can be removed by a focused Obsidian plugin (verse picker +
link helper, Strong's popover, inline-note indicators, auto reader-mode for
chapter files). Mobile parity is a target — Phase 1's audio + dictation
workflow runs on Obsidian Mobile.

**Hard guardrail (D24)**: the plugin enhances the vault format; it does not
change it. Format changes go through `docs/planning/DECISIONS.md` first.

**Phase 1.5 outcome may shrink Phase 2's scope.** If the plugin delivers
enough on its own, Phase 2 could narrow to "sync only" or shift entirely.
See `docs/planning/phase-1-5.md` for the working detail.

## Phase 2: iOS/macOS App + Sync Server

**Goal**: A reading experience good enough to pull me away from audio, with
notes integrated tightly enough that capture friction is near zero.

**Build order within Phase 2**:

1. **Sync server** (Express+TypeORM): file storage + metadata + revision
   tracking. Push/pull endpoints with conflict detection. No app yet.

2. **Reader-only iOS/macOS app**: beautiful typography, paragraph mode,
   verse numbers as superscripts, swipe between chapters, FTS5 search
   across the Bible text. Reads from local cache synced from server. Read-only
   — no notes yet. Goal: prove I'll actually read in this app.

3. **Notes layer**: tap verse → create/open note linking to that verse.
   Markdown files written to vault, synced to server. Wiki-link resolution
   between notes. In-app rendering of notes with proper styling.

4. **Cross-reference navigation**: tap a verse reference in any note, jump to
   reader at that verse. Backlink panel showing all notes that reference the
   current verse.

5. **Claude Code workflow as first-class feature**: in-app "prep today's
   reading" that triggers a server-side or laptop-side workflow against the
   vault. (This requires the laptop-vault-mirror story to be working.)

## Open Questions / Decisions to Make Before Phase 2

These are real architectural decisions that have teeth. I want help thinking
through them, not just implementing whatever I say first.

1. **Note identity scheme**: path-based, UUID-in-frontmatter, or
   timestamp-prefixed (`20260423143022-melchizedek.md`)? Each has tradeoffs
   for renaming, linking stability, and human readability.

2. **Verse reference syntax in notes**: `[[Gen 1:1]]`, `{{Gen.1.1}}`,
   `[Gen 1:1](bible://Gen.1.1)`, or fenced transclusion blocks? Needs to be
   parseable AND degrade gracefully in generic markdown viewers AND not
   conflict with wiki-link syntax.

3. **Translation pinning in references**: does `Gen 1:1` resolve to default
   translation, or do notes pin to a specific translation? Pinning is more
   honest but creates friction.

4. **Stub creation policy**: when Claude generates entity stubs during reading
   prep, what's the criterion? Every proper noun? Frequency-based? User
   approval before file creation? Need to avoid stub graveyards.

5. **Sync conflict UX**: conflict files are the safe default, but how do they
   surface in the app? Dedicated "conflicts" view? Notification? Inline?

6. **Vault structure for entities**: flat (`/notes/melchizedek.md`) or
   hierarchical (`/notes/people/melchizedek.md`, `/notes/places/jerusalem.md`)?
   Hierarchical helps Claude generate correctly-typed stubs but adds rigidity.

7. **Server ↔ laptop mirror mechanics**: how does the laptop-side vault stay
   fresh for Claude Code? Periodic pull? File-watcher pushing changes? Manual
   sync command? This is the linchpin of the LLM workflow.

8. **iOS app data path**: where does the local cache live? App Documents
   directory (visible in Files.app, user-accessible) vs. app sandbox (hidden,
   safer)? Visibility matters for "vault is plain files" principle.

9. **Markdown rendering in-app**: roll my own renderer (control, work) or use
   a library like swift-markdown / Down (faster, less control)? Bible text
   rendering specifically has unique needs (verse anchors, paragraph
   reflow) that may push toward custom.

10. **Authentication for sync server**: simple bearer token (single user,
    minimal complexity) vs. proper auth flow (future-proofing for if family
    members ever want their own vaults)?

## Architectural Constraints (Non-Negotiable)

- Vault format must remain documented and tool-agnostic
- No data lives only in the database — everything reconstructable from .md files
- Android port must be feasible without rewriting core logic (suggests
  considering shared Kotlin Multiplatform / Rust core / well-defined
  server-side logic boundary, depending on what makes sense)
- Sync must be aware of the data model (not generic file sync) so it can
  handle markdown-specific concerns (frontmatter merging, wiki-link integrity)

## What I Need Help With Right Now

Starting with **Phase 1 setup**. Specifically:

1. Vault directory structure and conventions
2. CLAUDE.md content for the vault (so Claude Code knows the rules)
3. Template files for daily readings, person/place/concept/event stubs
4. Bible text import script (USFM → chapter-per-file markdown with verse
   anchors and preserved paragraph breaks). BSB USFM bundle is in
   `data/usfm/BSB/`; importer format spec is in `docs/planning/DECISIONS.md`
   D11.
5. A reading prep prompt I can use daily

After Phase 1 is set up and I've used it for a couple weeks, we'll revisit
the open questions list and start Phase 2 design.

## How I Want to Work

- Direct, honest feedback. Push back on bad ideas; don't validate them.
- Lots of detail and reasoning, not just code dumps.
- Source citations when relevant (especially for OSIS/USFM spec questions,
  open Bible data sources, licensing).
- Treat me as a senior engineer who knows this domain — don't over-explain
  Bible structure, but DO surface implementation details I might not know
  about parsing biblical markup formats.
- When I'm about to make a mistake or paint myself into a corner, say so.