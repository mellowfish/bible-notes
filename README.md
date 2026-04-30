# bible-notes

Personal Bible-study external brain on plain markdown files. The **vault** under `vault/` is the portable product (Bible chapters + study notes); the **tooling** under `tools/` is one optional interface for scaffolding and maintaining it. Currently used in Obsidian, but the format stays tool-agnostic — every note should round-trip through any markdown viewer.

For the full picture, see (in this order):

- [`PROJECT.md`](PROJECT.md) — project brief, scope, principles
- [`CLAUDE.md`](CLAUDE.md) — project/tooling AI operating manual
- [`docs/planning/DECISIONS.md`](docs/planning/DECISIONS.md) — architectural decisions
- [`vault/_templates/CLAUDE.md`](vault/_templates/CLAUDE.md) — vault format spec (frontmatter, slugs, link syntax)

## Quick start

### 1. Install tools

```bash
cd tools
npm install
```

Requires Node ≥ 20.

### 2. Download the BSB USFM bundle

The Bible source is not in the repo — it's public-domain text from upstream and regenerable. Download the **Berean Standard Bible** USFM bundle from eBible.org (engbsb package): <https://ebible.org/engbsb/>.

Unzip it into `data/usfm/BSB/` so the layout looks like:

```
data/usfm/BSB/
├── 02-GENengbsb.usfm
├── 03-EXOengbsb.usfm
├── …
└── 96-REVengbsb.usfm
```

(BSB is public domain — no licensing asterisks for personal use or future redistribution. License notice is in `copr.htm` of the bundle. See [DECISIONS D1](docs/planning/DECISIONS.md) for translation choice rationale.)

### 3. Run the Bible importer

```bash
cd tools
npm run import -- --src ../data/usfm/BSB --out ../vault/bible --translation BSB
```

This emits chapter-per-file markdown into `vault/bible/{Book}/{NN}.md`, per-chapter Strong's sidecars (`{NN}_strongs.json`), book-overview index notes under `vault/notes/bible/`, the `bible-flow.css` snippet (copied into `vault/.obsidian/snippets/`), and on first run a per-user copy of `vault/_templates/CLAUDE.md` → `vault/CLAUDE.md`.

The importer is idempotent: re-running overwrites generated chapter files but preserves your notes and the per-user CLAUDE.md.

### 4. (Optional) Import the M'Cheyne reading plan

Source XLSX URL is recorded in [DECISIONS D23](docs/planning/DECISIONS.md). Drop the file under `data/` and run:

```bash
npm run import-mcheyne
```

Emits `vault/docs/reading_plans/m_cheyne.md`.

### 5. Open `vault/` in Obsidian

On first open, enable the `bible-flow` snippet in **Settings → Appearance → CSS snippets** so verse paragraphs flow as prose instead of stacked blocks.

## Layout

```
bible-notes/
├── PROJECT.md, CLAUDE.md, README.md
├── docs/planning/    — decisions, roadmap, phase docs
├── tools/            — TypeScript importers + reading-prep prompt + CSS snippet
├── data/             — raw source bundles (gitignored, re-downloadable)
└── vault/            — Obsidian vault
    ├── _templates/   — note + scaffolding templates (tracked)
    ├── bible/        — generated chapter files (gitignored)
    ├── docs/         — generated vault-side reference data (gitignored)
    └── notes/        — your study notes (content gitignored; structure tracked)
```

## Tests

```bash
cd tools && npm test
```

Vitest suite covering the USFM importer and the M'Cheyne reading-plan parser.

## License

[BSD Zero Clause License](LICENSE) (0BSD) — public-domain-equivalent, no attribution required. Use this however you'd like. The Bible text itself is BSB (public domain) per [DECISIONS D1](docs/planning/DECISIONS.md).
