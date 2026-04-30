# CLAUDE.md — Bible Notes Project

Operating manual for AI agents working on the **bible-notes project itself** — tooling, importer, planning, scaffolding. For vault-side conventions (slug rules, frontmatter schemas, link syntax, what AI may do without asking inside the vault), see `vault/CLAUDE.md` (a per-user copy of the tracked starter at `vault/_templates/CLAUDE.md`).

## Read first

- `PROJECT.md` — project brief, vision, scope, principles
- `docs/planning/DECISIONS.md` — locked architectural decisions
- `docs/planning/phase-1.md` — current-phase working doc
- `vault/_templates/CLAUDE.md` — vault format spec + AI defaults (tracked starter; copied to `vault/CLAUDE.md` on first vault setup)

## Repo layout

```
bible-notes/
├── PROJECT.md              — project brief
├── CLAUDE.md               — this file
├── docs/                   — pure documentation only (planning, decisions, roadmap)
│   └── planning/
├── tools/                  — TypeScript importer + scripts (npm)
│   ├── prompts/            — Claude Code prompts (e.g., reading-prep)
│   └── snippets/           — Obsidian CSS snippets shipped with the project
├── data/                   — raw source bundles (USFM, reading-plan XLSX, …; gitignored, re-downloadable)
└── vault/                  — Obsidian vault (mostly gitignored content)
    ├── CLAUDE.md           — per-user vault operating manual (gitignored)
    ├── _templates/         — tracked vault scaffolding (templates + CLAUDE.md starter)
    ├── bible/              — generated chapter files (gitignored)
    ├── docs/               — vault-side reference data (reading plans, …; gitignored; per D23)
    └── notes/              — user notes (gitignored content; .gitkeep dirs tracked)
```

`docs/` is documentation only. Production-ish artifacts (prompts, templates, snippets, vault format spec) live where they are consumed: `tools/` (code-adjacent) or `vault/_templates/` (vault scaffolding).

## Project framing

The **vault** is the portable product — a personal Bible-study external brain on plain markdown files. The **tooling** in `tools/` is one optional interface for working with that vault; Claude Code + Obsidian is what the user happens to use today, but the vault must remain readable and editable in any markdown tool.

Vault content (`vault/bible/`, `vault/docs/`, `vault/notes/`, `vault/CLAUDE.md`) is per-user data and gitignored. Tracked vault scaffolding lives in `vault/_templates/` and `.gitkeep` markers.

## Tooling conventions

- `tools/` is npm + TypeScript (ESM). All TS, no plain JS.
- Importers (idempotent — re-running overwrites their outputs):
  - `tools/import-usfm.ts` — Bible text → `vault/bible/`.
  - `tools/import-mcheyne.ts` — M'Cheyne reading plan XLSX → `vault/docs/reading_plans/m_cheyne.md` (per D23).
- Setup wiring: importer (or `tools/setup-vault.ts`) copies `vault/_templates/CLAUDE.md` → `vault/CLAUDE.md` and `tools/snippets/bible-flow.css` → `vault/.obsidian/snippets/` on first run if missing.
- When the USFM importer's output format changes, update `docs/planning/DECISIONS.md` D11 first; the doc leads, the code follows.

## Markdown style (project-wide)

- Italic uses `*word*`, never `_word_`.
- Bold uses `**word**`.
- Avoid HTML in markdown unless markdown has no equivalent — HTML breaks plain-text search and `cat`-readability.
- Wiki-links to entities whose name overlaps a Bible book overview note (Job, Ruth, Matthew, …) use the full vault-relative path: `[[notes/people/Job|Job]]`, never bare `[[Job]]` (per D27). Applies to anything tools or prompts emit into the vault. Full rule in `vault/_templates/CLAUDE.md`.

## Keeping documents aligned

When locking a new architectural decision in `docs/planning/DECISIONS.md`, also check whether anything in `PROJECT.md` is now stale (translation choices, sync mechanism, file layout, vault-vs-tooling framing) and update it in the same pass. `PROJECT.md` is the brief, not the canonical state — but it should not contradict the canonical state.

Same rule for `vault/_templates/CLAUDE.md`, `phase-1.md`, and this file: when a decision changes a fact they assert, update them. Drift is the cost of skipping this.

## What requires the user's confirmation

- Don't commit changes without explicit user approval.
- Don't push to remote without explicit user approval.
- Don't bypass git hooks (`--no-verify`) or signing without explicit user approval.
- Don't modify frontmatter schemas, link conventions, or directory structure without first updating `docs/planning/DECISIONS.md`.
- Don't hand-edit files under `vault/bible/`. Edit the importer in `tools/` and re-run.

## Hard rules

- Don't use emojis in any committed file unless the user explicitly asks.
- Don't put production-ish artifacts (prompts, templates, snippets, code-consumed specs) under `docs/`. They live in `tools/` or `vault/_templates/`.
- Don't put time estimates (hours, days, weeks, "by Friday", etc.) on tasks, milestones, or phases. They're noise — this is one person's project on no fixed schedule, and concrete dates rot the moment real life intervenes. When sizing matters for comparing parallel options, use T-shirt sizes (S / M / L / XL) — enough signal to prioritize, no false precision. Same rule applies to docs you update on the user's behalf: strip durations rather than carry them forward.
