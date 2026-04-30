# Reading-prep prompt

You are preparing a daily Bible reading. The user will give you one or more
passages — e.g. `Genesis 12-15`, or a list like:

```
- Exodus 4:1-31
- Luke 7:1-50
- Job 21:1-34
- 1 Corinthians 8:1-13
```

Your job is to scaffold a reading-prep note in the vault and seed any missing
entity stubs the passages will touch. Per D21 (supersedes D17), the prep is
intentionally minimal: AI fills entity links and connections back to prior
notes; everything else is the user's freeform scratchpad.

You are running inside the user's vault (`vault/` is the current directory or
a subdirectory of it). Conventions you must follow are in `vault/CLAUDE.md`
and `vault/_templates/CLAUDE.md` (the universal starter the user's copy was
forked from). Defer to those for anything not stated here.

## Input shape

The user typically already has a stubbed daily note at
`vault/notes/readings/YYYY-MM-DD (Day).md` containing the day's passages.
That file is the target — fill it in, don't create a new one. If they invoke
this prompt with just a passage and no existing note, create the daily note
at the same path using today's date.

Multi-passage and single-passage days share the same shape: a list of one is
just the degenerate case (per D16).

**Plan-based shorthand.** If the user invokes the prompt with `Day N` or
`M'Cheyne Day N` (no explicit passages), resolve the day's 4 passages by
reading the row whose first column is `N` in
`vault/docs/reading_plans/m_cheyne.md` (per D23). Use those resolved
passages as the day's list and proceed normally. If the daily note doesn't
exist yet, default the H1 to `# M'Cheyne - Day N` when creating it.

## What you fill (and what you don't)

Per D21, AI-filled sections are minimal and mechanical:

| Section | Who fills | Notes |
|---|---|---|
| Frontmatter | AI | `passages`, `passage_links`, dates, status |
| `# H1` | preserve user's | e.g. `# M'Cheyne - Day 52`. Default to `# Reading` if creating fresh. |
| `### Entities` (per passage) | AI | links to people/places/concepts/events stubs (eager-create per D5/D22) |
| `### Notes` (per passage) | **leave blank** | user-fill scratchpad — header only |
| `## Connections back to prior notes` | AI | grep results — the user's own prior notes that link into today's passages |

**Do not pre-populate the per-passage `### Notes`.** Even factual content
(BSB editorial parallels, footnoted refs) shapes the reading. The user will
pull those in themselves; the chapter file's `*See also: …*` lines and
footnotes are already navigable from the verse-link in the section heading.

## What to produce

1. **The daily reading-prep note** at
   `vault/notes/readings/YYYY-MM-DD (Day).md`. Use today's date unless the
   user specifies otherwise. Fill from `vault/_templates/reading-template.md`
   as the structural source, with one per-passage subsection (`## <link>`
   block) per passage in the day's list.

2. **Entity stubs** — eagerly per D5/D22 — for every named person, place,
   concept, or named event in any passage that doesn't already have a note
   in `vault/notes/{type}/`. Use the matching `_templates/{type}-template.md`.
   Seed `## Key passages` with the spawning verse-link; add a body lede only
   if title + aliases leave scope ambiguous.

3. **Cross-reference surfacing (back-direction only)** — search
   `vault/notes/` for inbound links to any verse in any of the day's
   passages (links of the form `[[bible/{Code}/{NN}#^v{N}|...]]`) and list
   them in the file's single `## Connections back to prior notes` section.
   This surfaces *the user's own* prior work, not editorial parallels.

## How to do it

### Step 1 — Resolve each passage

For each passage in the day's list, translate the user's free-form reference
into specific verse-anchor wiki-links.

- Use the book name → `pathCode` mapping in `vault/_templates/CLAUDE.md`
  (Genesis → `Gen`, John → `Jhn`, 1 Corinthians → `1Co`, etc.).
- Read the chapter file's `total_verses` frontmatter to bound any "to end of
  chapter" ranges.
- Verse-range link form: link the start verse, show the range in display.
  ```markdown
  [[bible/Exo/04#^v1|Exodus 4:1–31]]
  ```
- Multi-chapter passages produce one link per chapter section, plus prose
  explaining the boundary if the passage straddles a literary unit (e.g.
  Eph 5:22–6:9 is one household-codes block across the chapter line).

### Step 2 — Read each passage

Open every chapter file the day's passages touch under `vault/bible/`. Read
the verses to extract entities. **Do not** draft a summary, mine for
themes, list parallels, or formulate interpretive questions — those are
either the user's job (during/after reading, in the per-passage Notes) or
removed entirely from the prep per D21.

### Step 3 — Extract entities (per passage)

While reading each passage, list:

- **People**: named individuals (Abraham, Hagar, Pharaoh). Skip generic
  roles ("a servant", "the priest") unless the passage names them.
- **Places**: named locations (Ur, Egypt, Bethel, Mount Moriah).
- **Events**: named or clearly-bounded events worth their own note (the
  call of Abram, the binding of Isaac, the Exodus). Skip generic actions.
- **Concepts**: theologically loaded terms the passage hinges on (covenant,
  faith, righteousness, household). Be selective — don't stub every
  abstract noun. If a concept already has a note, use the existing slug.

For each, name files per the rules in `vault/_templates/CLAUDE.md` (title
case with spaces, ASCII + apostrophes; disambiguate ambiguous names in
the filename — D18; apostrophes go in aliases — D20).

### Step 4 — Stub creation (eager, per D5/D22)

For each entity:

1. Check `vault/notes/{type}/{slug}.md`. If it exists, link to it and add
   the day's spawning verse-link to its `## Key passages` list (skip if
   already present). The new bullet is just the link — no annotation. Do
   not touch anything else in the body, and in particular do not strip
   summaries from existing bullets — those are user-written.
2. If it does not exist, copy `vault/_templates/{type}-template.md` to that
   path and:
   - Fill the obvious frontmatter (era for people, region for places,
     `participants` for events, etc.).
   - Seed `## Key passages` with the spawning verse-link from today's
     passage. If multiple of today's passages reference this entity, list
     all the spawning links. Each bullet is just the link — no annotation
     or summary. The user adds those during reading.
   - **Skip the body lede** when title + aliases identify the entity
     unambiguously (`Moses.md`, `Mount Sinai.md`, `Binding of Isaac.md`).
   - **Add a one-sentence blockquote lede** above `## Key passages` only
     when scope is genuinely unclear (`Antioch.md` — Pisidian vs Syrian;
     `Election.md` — theological term with multiple senses). One sentence
     max; the user develops the rest.
3. Use the link form `[[Filename]]` or `[[Filename|Display]]` in the prep
   note. When display matches the filename, drop the alias.

### Step 5 — Connections back to prior notes (whole day)

For every verse-anchor link across all of today's passages, grep
`vault/notes/` for inbound links of the form
`[[bible/{Code}/{NN}#^v{N}|...]]`. Group hits by referencing-note path; list
under the file's single `## Connections back to prior notes` section with a
one-line excerpt of the linking sentence (just enough that the user
remembers the connection).

If there are zero hits across all passages, write
`_(no prior notes reference today's passages)_` and move on. Don't
fabricate connections.

### Step 6 — Fill the file

Open the daily note and fill it. The H1 belongs to the user — preserve
whatever they wrote (e.g. `# M'Cheyne - Day 52`). If the file doesn't exist
yet and you're creating it, default the H1 to `# Reading`.

**Frontmatter:**
- `type: reading`, `status: prep`, `tags: []` (unless obvious)
- `created` and `updated` to today's date
- `passages` — list of the human-readable references, one per passage:
  `["Exodus 4:1-31", "Luke 7:1-50", …]`
- `passage_links` — list of the resolved verse-anchor wiki-links, one per
  passage

**Body — one `## <link>` block per passage:**
- **Section heading:** `## [[bible/{Code}/{NN}#^v{N}|{Book Ch:Vs–Vs}]]`.
- **`### Entities`:** the four bullets (People / Places / Concepts /
  Events), each linking to its stub. Use `—` for empty categories rather
  than omitting the bullet, so the shape stays predictable.
- **`### Notes`:** **leave blank** — header only. User scratchpad.

**Shared tail (after all passage blocks):**
- `## Connections back to prior notes` — pre-populated with Step 5's
  findings, or `_(no prior notes reference today's passages)_` if the
  grep returned nothing.

## What not to do

- **Don't write a summary.** Per D21, the per-passage Summary is removed.
  The verse-link in the section heading takes the user to the text
  directly; a paraphrase is redundant and primes the reading.
- **Don't pre-populate `### Notes`.** Even factual content (BSB editorial
  parallels, footnoted refs) shapes the reading. User-fill only.
- **Don't paraphrase Scripture.** Quote the verse and link it. Vault hard
  rule.
- **Don't interpret.** No themes, no "this likely emphasizes…", no
  pre-reading questions anywhere — including under the guise of "useful
  context."
- **Don't write commentary into stub bodies.** Per D22, the seed is the
  spawning verse-link under `## Key passages`, plus a one-sentence
  blockquote lede only when title + aliases leave scope ambiguous.
- **Don't annotate verse-link bullets.** In `## Key passages` (whether
  seeding a new stub or appending today's link to an existing one), the
  bullet is just `- [[bible/Job/22|Job 22]]` — no trailing dash-and-summary.
  Pick the right verse range so the link itself is informative, then stop.
  *Caveat for existing notes:* if a bullet already carries a summary,
  leave it — that's user-written. The rule is about what AI writes, not
  about scrubbing what's there.
- **Don't fabricate.** If you don't recognize an entity (rare — but
  obscure place names exist), write the stub with `unknown` for fields
  you can't fill, and flag it in the prep note. Don't guess at era or
  region.
- **Don't modify chapter files under `vault/bible/`.** They're generated.
- **Don't run the importer.** This prompt is a vault-side task, not a
  tooling task.
- **Don't ask for confirmation before each stub.** Eager creation is the
  policy (D5). Just do it and report what you created.
- **Don't add a `date` frontmatter field.** Filename carries the date
  (D16).
- **Don't rename or split the daily note.** One file per day with
  per-passage subsections (D16). If the user's H1 names a plan
  ("M'Cheyne - Day 52"), preserve it.

## Output to the user

When done, print:

- The path of the daily note filled.
- A bulleted list of stub notes created (path; flag any that got a body
  lede — those are the entities where title + aliases left scope
  ambiguous).
- Count of inbound prior-note connections surfaced (and per-passage
  breakdown if useful).
- Anything unexpected — e.g. "couldn't find a chapter file for X; was
  that book imported?", "Eph 5:14 contains a hymn fragment cross-referenced
  to Isaiah but the BSB footnote is empty here."

Keep it short. The note is the output; this summary is just a receipt.
