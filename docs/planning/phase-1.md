---
created: 2026-04-24
updated: 2026-04-28
status: active — Phase 1.1 daily-use validation underway (cadence is slow; real life crowding reading time)
---

# Phase 1 — Working Document

**Purpose:** capture the live state of Phase 1 setup so a session reset (or a week away) doesn't lose context. When Phase 1.0 is done and we transition to Phase 1.1 (daily use), most of this becomes archive.

For canonical references, see (in this order):
- `../../PROJECT.md` — project brief, scope, principles
- `./ROADMAP.md` — milestone tracker
- `./DECISIONS.md` — locked architectural decisions (D1–D10) with rationale
- `../../vault/CLAUDE.md` — vault conventions for AI agents working inside the vault

---

## Where we are right now

**Completed (Phase 1.0):**
- Project brief (`PROJECT.md`) — scope, principles, open questions
- Repo scaffolding: `vault/`, `tools/`, `data/`, `docs/planning/` separated per D8
- Repo scope: tooling-only — `vault/bible/` and `vault/notes/` outside git per D10
- Vault skeleton: type-folder structure with `.gitkeep` markers; vault format spec + AI defaults at `vault/_templates/CLAUDE.md` (tracked starter; copied to `vault/CLAUDE.md` per D12)
- Project/tooling AI operating manual at `CLAUDE.md` (root) per D12
- Templates: `_templates/{person,place,concept,event,reading}-template.md`
- Locked decisions D1–D13 in `DECISIONS.md`
- BSB USFM bundle sourced into `data/usfm/BSB/` (66 books + license/metadata)
- **USFM importer** (`tools/import-usfm.ts`): hand-rolled per D13 after `usfm-grammar` failed on the BSB Psalms; emits chapter markdown + sidecar Strong's JSON per D11. Validated on Gen 1, Psa 23, Psa 119, Eph 5–6.
- **Bulk import:** all 66 BSB books (1,189 chapters) generated under `vault/bible/`.
- **CSS snippet** at `tools/snippets/bible-flow.css`, scoped via `cssclasses: [bible-flow]` frontmatter the importer writes.
- **Reading-prep prompt** at `tools/prompts/reading-prep.md`.
- **Vault setup wiring:** `tools/setup-vault.ts` copies `vault/_templates/CLAUDE.md` → `vault/CLAUDE.md` and the CSS snippet into `vault/.obsidian/snippets/` on first run; `tools/import-usfm.ts` invokes it on every import (idempotent — skips files already present).
- **Test suite:** `tools/import-usfm.test.ts` with 28 vitest tests covering tokenizer, linkifier, multi-paragraph verses, footnote tightness, omitted verses, poetry, acrostic, frontmatter, and Strong's sidecar alignment.

**In progress (Phase 1.1):**
- Daily reading prep + note capture — three daily notes in `vault/notes/readings/` (2026-04-26 through 2026-04-28); cadence is slow, working as time allows
- Friction journal at `vault/notes/_meta/Friction Journal.md` (gitignored, raw capture)
- Distilled wins/friction at `docs/planning/phase-1-journal.md` (committed)

**Not yet started:**
- Mid-period checkpoint
- Phase 1 retrospective (the deliverable: ship to Phase 2 / iterate / abandon)

---

## Format decisions — locked

All seven D11 sub-decisions are resolved in `DECISIONS.md` D11 (2026-04-25). Parser choice amended by D13 (2026-04-25). Summary:

| # | Decision | Resolution |
|---|---|---|
| D11.1 | Strong's numbers | sidecar JSON at `vault/bible/{Book}/{NN}_strongs.json` |
| D11.2 | Translator footnotes | markdown `[^N]` footnotes; bible refs inside become wiki-links |
| D11.3 | Parallel refs (`\r`) | italic "*See also: …*" line of wiki-links under section heading |
| D11.4 | Verse anchors | per-verse paragraph blocks + CSS snippet for margin-collapse (paragraph-type comments dropped, see D14) |
| D11.5 | Poetry indentation | blockquote nesting (`>`/`>>`/`>>>`) |
| D11.6 | Acrostic letters | `#### LETTER` h4 heading (per D15, was `**LETTER**`) |
| D11.7 | `\it` italics | markdown `*word*` (project-wide: `*` not `_`) |

Plus: paragraph-type HTML comments dropped per D14 (Obsidian doesn't hide them in reading view, and per-verse paragraphs multiplied them 3–5×); if Phase 2 needs paragraph metadata, the importer re-derives it from the USFM source. CSS snippet shipped from `tools/snippets/bible-flow.css` (copied to `vault/.obsidian/snippets/` at setup); reading-prep prompt at `tools/prompts/reading-prep.md` (per D12, code-adjacent not vault-adjacent); tools/ uses npm + TypeScript ESM with a hand-rolled line-based USFM parser (per D13).

---

## Source-bundle facts — what we know about `data/usfm/BSB/`

**License:** Public Domain (per `data/usfm/BSB/copr.htm`). No restrictions on redistribution.

**Source:** eBible.org `engbsb` package, bundle dated 2026-03-11.

**Layout:**
- 66 USFM files: `02-GENengbsb.usfm` through `96-REVengbsb.usfm`
  - The `NN-` prefix is eBible bundle ordering (NOT canonical); `02-`=Genesis, `40-`=Malachi, jump to `70-`=Matthew, `96-`=Revelation. Gap 41–69 reflects deuterocanonical books not in BSB.
- `copr.htm` — Public Domain notice (formal title: "Berean Standard Bible")
- `dejavuserif.css`, `keys.asc`, `signature.txt.asc` — display CSS, PGP authenticity

**Naming quirk:** The `\id` tag in each USFM file says `"… - Berean Study Bible"` (legacy text, eBible hasn't refreshed). The formal title and license in `copr.htm` are "Berean Standard Bible". Same translation, different version of the name. Importer should treat the formal title as canonical.

**Complete USFM marker set found in BSB corpus** (run `cat data/usfm/BSB/*.usfm | grep -oE '\\[a-z]+[0-9]*' | sort -u`):
```
\b \c \d \f \fr \ft \h \id \it \li1 \li2 \m \mr \ms1 \mt1
\pc \pmo \q1 \q2 \qa \qr \r \s1 \s2 \toc1 \toc2 \v \w
```

**Markers NOT in BSB** (importer can skip handlers for these):
- `\nd` (divine name small caps) — BSB renders divine name as plain inline `LORD` (uppercase).
- `\wj` (words of Christ) — BSB does not red-letter Jesus' words.

These two absences simplify the importer significantly compared to translations like NET or NIV.

**Strong's numbers** are pervasive (`\w word|strong="HNNNN"\w*`) on every word. See D11.1 for handling.

**Paragraph behavior in BSB:** mostly verse-per-paragraph in source — BSB uses `\m` / `\pmo` paragraph markers separated by `\b` (blank line) before each `\v`. But verses can span multiple paragraphs (e.g., Gen 1:5 splits across two paragraphs around the "evening … morning" clause). Importer must handle multi-paragraph verses: verse-number marker `**⁵**` on first paragraph of the verse, block-ref `^v5` on last paragraph of the verse.

---

## Importer design

### Output structure

```
vault/bible/{Book}/{NN}.md            — chapter markdown
vault/bible/{Book}/{NN}_strongs.json  — sidecar Strong's (per D11.1)
```

Book: USFM 3-letter abbreviation (Gen, Exo, …, Rev). Index of abbreviations is in `vault/CLAUDE.md`.
Chapter: 2-digit zero-padded (`01.md` … `150.md` for Psalms).

### Per-chapter file shape (prose example: Genesis 1)

```markdown
---
translation: BSB
book: Gen
book_name: Genesis
chapter: 1
total_verses: 31
cssclasses:
  - bible-flow
---

# Genesis 1

## The Creation

*See also: [[bible/Jhn/01#^v1|John 1:1–5]] · [[bible/Heb/11#^v1|Hebrews 11:1–3]]*

**¹** In the beginning God created the heavens and the earth. ^v1

**²** Now the earth was formless and void, and darkness was over the surface of the deep. And the Spirit of God was hovering over the surface of the waters. ^v2

### The First Day

**³** And God said, "Let there be light,"[^1] and there was light. ^v3

**⁴** And God saw that the light was good, and He separated the light from the darkness. ^v4

**⁵** God called the light "day," and the darkness He called "night."

And there was evening, and there was morning—the first day.[^2] ^v5

…

[^1]: Cited in [[bible/2Co/04#^v6|2 Corinthians 4:6]]
[^2]: Literally *day one*
```

### Per-chapter file shape (poetry example: Psalm 23)

```markdown
---
translation: BSB
book: Psa
book_name: Psalms
chapter: 23
total_verses: 6
cssclasses:
  - bible-flow
---

# Psalm 23

## The LORD Is My Shepherd

*See also: [[bible/Ezk/34#^v11|Ezekiel 34:11–24]] · [[bible/Jhn/10#^v1|John 10:1–21]]*

*A Psalm of David.*

> **¹** The LORD is my shepherd;[^1]

>> I shall not want. ^v1

> **²** He makes me lie down in green pastures;

>> He leads me beside quiet waters. ^v2

…

[^1]: See [[bible/Rev/07#^v17|Revelation 7:17]].
```

### Sidecar JSON shape (`vault/bible/Gen/01_strongs.json`)

```json
{
  "translation": "BSB",
  "book": "Gen",
  "chapter": 1,
  "verses": {
    "1": [
      {"w": "In", "s": "H8064"},
      {"w": "the", "s": "H1254"},
      {"w": "beginning", "s": "H7225"},
      {"w": "God", "s": "H8064"},
      {"w": "created", "s": "H1254"},
      {"w": "the", "s": "H1254"},
      {"w": "heavens", "s": "H8064"},
      {"w": "and", "s": "H8064"},
      {"w": "the", "s": "H1254"},
      {"w": "earth", "s": "H8064"}
    ]
  }
}
```

`word_index` is the position (0-indexed) of a word within its verse after stripping markdown formatting and punctuation. Words without a Strong's tag in the source (`"He", "separated"` in Gen 1:4 — yes, BSB's tagger leaves some words untagged) are still emitted as entries with `"s": null`, so word indexes align 1:1 with the rendered verse.

### Marker mapping table

| USFM | Output |
|---|---|
| `\id` | parsed for book code; not emitted |
| `\h`, `\toc1`, `\toc2`, `\mt1` | parsed for `book_name` frontmatter; not emitted |
| `\c N` | starts new chapter file at `{Book}/{NN}.md` with `# {Book name} {N}` |
| `\s1 Heading` | `## Heading` |
| `\s2 Heading` | `### Heading` |
| `\ms1 Heading` | `## Heading` (Psalms book divisions, etc.) |
| `\mr range` | italic line under heading |
| `\r (refs)` | `*See also: [[wiki-links]]*` (D11.3) |
| `\d superscription` | `*italic superscription*` (Psalm headings, part of canonical text) |
| `\m`, `\pmo`, `\pc`, `\pi*`, `\nb` | new paragraph (paragraph-type HTML comments dropped per D14) |
| `\b` | paragraph separator (blank line) |
| `\q1`, `\q2`, `\q3`, `\qr` | blockquote nesting (`> ` / `>> ` / `>>> `) |
| `\qa LETTER` | `#### LETTER` h4 heading (Psalm 119 acrostic markers, per D15) |
| `\v N` | verse marker `**N (Unicode superscript)**` at start of verse paragraph(s); `^vN` block-ref at end of last paragraph of the verse |
| `\w word\|strong="…"\w*` | strip markup; emit just the word; record `(verse, word_index, strong)` to sidecar JSON |
| `\f + \fr ref \ft text \f*` | markdown footnote: `[^N]` inline, `[^N]: text` at file end. Bible refs in `\ft` text become wiki-links. |
| `\it word\it*` | `*word*` (markdown emphasis, `*` form) |
| `\li1`, `\li2` | `- item` (markdown list); indent for `\li2` |

### Parser library

Hand-rolled line-based scanner inside `tools/import-usfm.ts` (per D13, which amends D11). `usfm-grammar` was tried first per D11 and threw on the BSB Psalms file at `\q1\n\v` boundaries at both `LEVEL.STRICT` and `LEVEL.RELAXED`. Closed BSB marker set + paragraph-precise output requirement made a focused scanner the cheaper path than fighting the grammar.

Package manager: npm. Dependencies are stdlib-only at this point — `tsx` for dev runs and `typescript` for typecheck.

### Importer CLI shape

```sh
cd tools
npm install
npm run import -- --src ../data/usfm/BSB --out ../vault/bible --translation BSB
```

Idempotent: re-running overwrites `vault/bible/` (which is gitignored anyway). Optional `--only Gen,Psa` flag for iteration during validation phase.

---

## Validation plan (before bulk import)

Three chapters that exercise different parser landmines. Run importer, eyeball output, fix bugs, repeat until output for all three reads correctly.

| Chapter | What it tests |
|---|---|
| **Genesis 1** | mixed paragraph types (`\m`, `\pmo`); section headings (`\s1`, `\s2`); parallel refs (`\r`); inline footnotes; multi-paragraph verses (Gen 1:5) |
| **Psalm 119** | full poetry markup (`\q1`, `\q2`); acrostic letters (`\qa ALEPH`…); long chapter (176 verses); section headings within poetry |
| **Ephesians 5–6** | paragraph spanning the chapter boundary (household codes Eph 5:22–6:9); poetry quotation embedded in prose (Eph 5:14); multi-verse single paragraph |

After all three look right, run on the full 66 books and spot-check 5–10 random chapters across genres (history, prophecy, gospel, epistle, apocalyptic).

---

## After the importer — Phase 1.0 closeout

1. **Daily reading-prep prompt** at `tools/prompts/reading-prep.md` (D11 + D12 + D16 + D21). Accepts one or more passages; fills the user's date-named daily note at `notes/readings/YYYY-MM-DD (Day).md` (the Calendar plugin keys on filename per D16) with per-passage subsections — `### Entities` (AI) and `### Notes` (user) per D21. Eagerly creates entity stubs per D5/D22. Surfaces user-side connections by searching `vault/notes/` for inbound links to any of the day's passages.

2. **First end-to-end run** on a real passage. Iterate the prompt before declaring it "daily-ready."

3. **Journals:** `vault/notes/_meta/Friction Journal.md` (gitignored) for raw "I wish it could…" capture during Phase 1.1 daily use; `docs/planning/phase-1-journal.md` (committed) for distilled wins and friction observations that will feed the Phase 1 → Phase 2 decision.

---

## Picking up after a session reset

If you (or a fresh Claude session) come back to this cold:

1. Read `PROJECT.md` for vision/scope.
2. Read `DECISIONS.md` for what's locked (D1–D16 today).
3. Read this file (`phase-1.md`) for current state and pending work.
4. Read `CLAUDE.md` (root) for project/tooling conventions and `vault/_templates/CLAUDE.md` for vault format spec.
5. **Next concrete action:** continue daily reading at whatever cadence real life allows; capture friction in `vault/notes/_meta/Friction Journal.md` and pull distilled signal up into `docs/planning/phase-1-journal.md`. The retrospective comes when routine has set in (or when a clear ship/iterate/abandon signal emerges) — not before.

The source bundle is in `data/usfm/BSB/`. Inspect freely — sample chapters cited in the design section above are the ones to look at first if anything in the marker mapping seems off.
