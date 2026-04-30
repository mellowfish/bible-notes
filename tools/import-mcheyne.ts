// M'Cheyne reading-plan XLSX → vault markdown table importer.
// See ../docs/planning/DECISIONS.md (D23 vault/docs/ scope).
// Source spreadsheet: https://jonathanvajda.com/2021/01/11/bible-reading-plan-spreadsheet/

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Book metadata: XLSX abbreviation → (vault path code, display name, chapters)
// ---------------------------------------------------------------------------

interface BookMeta {
  code: string;       // vault path code (e.g. "Gen")
  display: string;    // English display name (e.g. "Genesis")
  chapters: number;   // BSB chapter count — used to detect single-chapter books
}

const BOOK_MAP: Record<string, BookMeta> = {
  // OT
  "Gn":      { code: "Gen", display: "Genesis",         chapters: 50 },
  "Ex":      { code: "Exo", display: "Exodus",          chapters: 40 },
  "Lv":      { code: "Lev", display: "Leviticus",       chapters: 27 },
  "Nu":      { code: "Num", display: "Numbers",         chapters: 36 },
  "Dt":      { code: "Deu", display: "Deuteronomy",     chapters: 34 },
  "Jsh":     { code: "Jos", display: "Joshua",          chapters: 24 },
  "Jdg":     { code: "Jdg", display: "Judges",          chapters: 21 },
  "Ruth":    { code: "Rut", display: "Ruth",            chapters: 4  },
  "1Sa":     { code: "1Sa", display: "1 Samuel",        chapters: 31 },
  "2Sa":     { code: "2Sa", display: "2 Samuel",        chapters: 24 },
  "1Ki":     { code: "1Ki", display: "1 Kings",         chapters: 22 },
  "2Ki":     { code: "2Ki", display: "2 Kings",         chapters: 25 },
  "1Ch":     { code: "1Ch", display: "1 Chronicles",    chapters: 29 },
  "2Ch":     { code: "2Ch", display: "2 Chronicles",    chapters: 36 },
  "Ezra":    { code: "Ezr", display: "Ezra",            chapters: 10 },
  "Neh":     { code: "Neh", display: "Nehemiah",        chapters: 13 },
  "Esth":    { code: "Est", display: "Esther",          chapters: 10 },
  "Job":     { code: "Job", display: "Job",             chapters: 42 },
  // "Ps" displays as "Psalm" (singular for citations, matching chapter-file H1).
  "Ps":      { code: "Psa", display: "Psalm",           chapters: 150 },
  "Pr":      { code: "Pro", display: "Proverbs",        chapters: 31 },
  "Eccl":    { code: "Ecc", display: "Ecclesiastes",    chapters: 12 },
  "Song":    { code: "Sng", display: "Song of Solomon", chapters: 8  },
  "Is":      { code: "Isa", display: "Isaiah",          chapters: 66 },
  "Jer":     { code: "Jer", display: "Jeremiah",        chapters: 52 },
  "La":      { code: "Lam", display: "Lamentations",    chapters: 5  },
  "Eze":     { code: "Ezk", display: "Ezekiel",         chapters: 48 },
  "Dn":      { code: "Dan", display: "Daniel",          chapters: 12 },
  "Ho":      { code: "Hos", display: "Hosea",           chapters: 14 },
  "Joel":    { code: "Jol", display: "Joel",            chapters: 3  },
  "Am":      { code: "Amo", display: "Amos",            chapters: 9  },
  "Obadiah": { code: "Oba", display: "Obadiah",         chapters: 1  },
  "Jonah":   { code: "Jon", display: "Jonah",           chapters: 4  },
  "Mic":     { code: "Mic", display: "Micah",           chapters: 7  },
  "Nah":     { code: "Nam", display: "Nahum",           chapters: 3  },
  "Hab":     { code: "Hab", display: "Habakkuk",        chapters: 3  },
  "Zph":     { code: "Zep", display: "Zephaniah",       chapters: 3  },
  "Hag":     { code: "Hag", display: "Haggai",          chapters: 2  },
  "Zech":    { code: "Zec", display: "Zechariah",       chapters: 14 },
  "Mal":     { code: "Mal", display: "Malachi",         chapters: 4  },
  // NT
  "Mt":       { code: "Mat", display: "Matthew",         chapters: 28 },
  "Mk":       { code: "Mrk", display: "Mark",            chapters: 16 },
  "Lk":       { code: "Luk", display: "Luke",            chapters: 24 },
  "Jn":       { code: "Jhn", display: "John",            chapters: 21 },
  "Act":      { code: "Act", display: "Acts",            chapters: 28 },
  "Ro":       { code: "Rom", display: "Romans",          chapters: 16 },
  "1Co":      { code: "1Co", display: "1 Corinthians",   chapters: 16 },
  "2Co":      { code: "2Co", display: "2 Corinthians",   chapters: 13 },
  "Gal":      { code: "Gal", display: "Galatians",       chapters: 6  },
  "Eph":      { code: "Eph", display: "Ephesians",       chapters: 6  },
  "Phil":     { code: "Php", display: "Philippians",     chapters: 4  },
  "Col":      { code: "Col", display: "Colossians",      chapters: 4  },
  "1Th":      { code: "1Th", display: "1 Thessalonians", chapters: 5  },
  "2Th":      { code: "2Th", display: "2 Thessalonians", chapters: 3  },
  "1Ti":      { code: "1Ti", display: "1 Timothy",       chapters: 6  },
  "2Ti":      { code: "2Ti", display: "2 Timothy",       chapters: 4  },
  "Tit":      { code: "Tit", display: "Titus",           chapters: 3  },
  "Philemon": { code: "Phm", display: "Philemon",        chapters: 1  },
  "He":       { code: "Heb", display: "Hebrews",         chapters: 13 },
  "Jas":      { code: "Jas", display: "James",           chapters: 5  },
  "1Pe":      { code: "1Pe", display: "1 Peter",         chapters: 5  },
  "2Pe":      { code: "2Pe", display: "2 Peter",         chapters: 3  },
  "1 Jn":     { code: "1Jn", display: "1 John",          chapters: 5  },
  "2Jn":      { code: "2Jn", display: "2 John",          chapters: 1  },
  "3 Jn":     { code: "3Jn", display: "3 John",          chapters: 1  },
  "Jude":     { code: "Jud", display: "Jude",            chapters: 1  },
  "Rev":      { code: "Rev", display: "Revelation",      chapters: 22 },
};

// ---------------------------------------------------------------------------
// XLSX extraction (XLSX = ZIP; shell out to `unzip -p` for stdlib-only deps)
// ---------------------------------------------------------------------------

function extractXmlFromXlsx(xlsxPath: string, innerPath: string): string {
  return execFileSync("unzip", ["-p", xlsxPath, innerPath], {
    encoding: "utf-8",
    maxBuffer: 50 * 1024 * 1024,
  });
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// Parse <sst><si>…<t>text</t>…</si>…</sst>. Each <si> may contain multiple
// <r><t>…</t></r> runs; concatenate their text content.
function parseSharedStrings(xml: string): string[] {
  const result: string[] = [];
  const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = siRegex.exec(xml)) !== null) {
    const inner = m[1]!;
    const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let combined = "";
    let mt: RegExpExecArray | null;
    while ((mt = tRegex.exec(inner)) !== null) combined += mt[1]!;
    result.push(decodeXmlEntities(combined));
  }
  return result;
}

type SheetRow = Record<string, string>;

// Parse <row><c r="B2" t="s"><v>idx</v></c>…</row>. `t="s"` cells reference
// shared-strings indexes; numeric cells store the value directly. Empty cells
// appear self-closing (`<c r="A1" s="5"/>`); we skip those (no `<v>`).
function parseSheet(xml: string, strings: string[]): SheetRow[] {
  const rows: SheetRow[] = [];
  const rowRegex = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  const cellRegex = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let mr: RegExpExecArray | null;
  while ((mr = rowRegex.exec(xml)) !== null) {
    const cells: SheetRow = {};
    const rowInner = mr[2]!;
    cellRegex.lastIndex = 0;
    let mc: RegExpExecArray | null;
    while ((mc = cellRegex.exec(rowInner)) !== null) {
      const attrs = mc[1]!;
      const cellInner = mc[2]; // undefined for self-closing cells
      if (!cellInner) continue;
      const refMatch = attrs.match(/\br="([^"]+)"/);
      if (!refMatch) continue;
      const col = refMatch[1]!.replace(/[0-9]/g, "");
      const typeMatch = attrs.match(/\bt="([^"]+)"/);
      const vMatch = cellInner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
      if (!vMatch) continue;
      let val = decodeXmlEntities(vMatch[1]!);
      if (typeMatch?.[1] === "s") {
        const s = strings[parseInt(val, 10)];
        if (s === undefined) continue;
        val = s;
      }
      cells[col] = val;
    }
    rows.push(cells);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Passage parsing — XLSX strings → vault wiki-link
// ---------------------------------------------------------------------------

// Wiki-link pipes inside markdown table cells must be backslash-escaped so the
// table renderer doesn't treat them as column separators. Obsidian honors `\|`.
function link(code: string, chapter: string, display: string, verse?: string): string {
  const path = `bible/${code}/${chapter.padStart(2, "0")}`;
  const anchor = verse ? `#^v${verse}` : "";
  return `[[${path}${anchor}\\|${display}]]`;
}

function lookupBook(key: string): BookMeta {
  const meta = BOOK_MAP[key];
  if (!meta) throw new Error(`Unknown book key: ${JSON.stringify(key)}`);
  return meta;
}

export function parsePassage(raw: string): string {
  const p = raw.trim();
  if (!p) throw new Error("Empty passage");

  // Comma-separated non-contiguous chapters: "Jer 36,45" → two links. The
  // first piece carries the book name; later pieces inherit it.
  if (p.includes(",")) {
    const pieces = p.split(",").map((s) => s.trim());
    const first = pieces[0]!;
    const bookMatch = first.match(/^(.+?)\s+\d/);
    if (!bookMatch) throw new Error(`Could not parse comma-list head: ${JSON.stringify(p)}`);
    const bookKey = bookMatch[1]!;
    const expanded = pieces.map((piece, i) => (i === 0 ? piece : `${bookKey} ${piece}`));
    return expanded.map(parsePassage).join(", ");
  }

  // Whole single-chapter book (no number): "Jude", "Obadiah", "Philemon".
  if (/^[A-Za-z]+$/.test(p)) {
    const b = lookupBook(p);
    return link(b.code, "1", b.display);
  }

  // Cross-chapter verse range: "Ex 11:1-12:21".
  let m = p.match(/^(.+?)\s+(\d+):(\d+)\s*-\s*(\d+):(\d+)$/);
  if (m) {
    const key = m[1]!, ch1 = m[2]!, vs1 = m[3]!, ch2 = m[4]!, vs2 = m[5]!;
    const b = lookupBook(key);
    return link(b.code, ch1, `${b.display} ${ch1}:${vs1}–${ch2}:${vs2}`, vs1);
  }

  // Verse range within one chapter: "Lk 1:1-38".
  m = p.match(/^(.+?)\s+(\d+):(\d+)\s*-\s*(\d+)$/);
  if (m) {
    const key = m[1]!, ch = m[2]!, vs1 = m[3]!, vs2 = m[4]!;
    const b = lookupBook(key);
    return link(b.code, ch, `${b.display} ${ch}:${vs1}–${vs2}`, vs1);
  }

  // Single-verse anchor: "Lk 1:38".
  m = p.match(/^(.+?)\s+(\d+):(\d+)$/);
  if (m) {
    const key = m[1]!, ch = m[2]!, vs = m[3]!;
    const b = lookupBook(key);
    return link(b.code, ch, `${b.display} ${ch}:${vs}`, vs);
  }

  // Chapter range: "Gn 9-10".
  m = p.match(/^(.+?)\s+(\d+)\s*-\s*(\d+)$/);
  if (m) {
    const key = m[1]!, ch1 = m[2]!, ch2 = m[3]!;
    const b = lookupBook(key);
    return link(b.code, ch1, `${b.display} ${ch1}–${ch2}`);
  }

  // Single chapter: "Gn 1" or "2Jn 1".
  m = p.match(/^(.+?)\s+(\d+)$/);
  if (m) {
    const key = m[1]!, ch = m[2]!;
    const b = lookupBook(key);
    // Single-chapter books referenced as "Foo 1" display without the redundant chapter.
    if (b.chapters === 1 && ch === "1") {
      return link(b.code, "1", b.display);
    }
    return link(b.code, ch, `${b.display} ${ch}`);
  }

  throw new Error(`Could not parse passage: ${JSON.stringify(p)}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      src: { type: "string", default: resolve(__dirname, "../data/bible-reading-plan-mcheyne-based-on-edgington-1.xlsx") },
      out: { type: "string", default: resolve(__dirname, "../vault/docs/reading_plans/m_cheyne.md") },
    },
  });

  const srcPath = values.src!;
  const outPath = values.out!;

  // Verify XLSX is present (data/ is gitignored, so a fresh clone won't have it).
  try {
    await readFile(srcPath);
  } catch {
    console.error(`XLSX not found at ${srcPath}.`);
    console.error(`Download from https://jonathanvajda.com/2021/01/11/bible-reading-plan-spreadsheet/ and place under data/.`);
    process.exit(1);
  }

  const sharedStringsXml = extractXmlFromXlsx(srcPath, "xl/sharedStrings.xml");
  const sheetXml = extractXmlFromXlsx(srcPath, "xl/worksheets/sheet1.xml");

  const strings = parseSharedStrings(sharedStringsXml);
  const allRows = parseSheet(sheetXml, strings);

  // Day rows have a numeric value in column B. Header rows (one per month) and the
  // copyright row at the end do not. The XLSX resets day numbering per month
  // (1–31, 1–28, …); we re-number sequentially across the whole year (1–365).
  const dayRows = allRows.filter((r) => r.B && /^\d+$/.test(r.B));
  if (dayRows.length !== 365) {
    console.warn(`Expected 365 day rows; found ${dayRows.length}. Continuing.`);
  }

  type Entry = { day: number; passages: string[] };
  const entries: Entry[] = dayRows.map((r, i) => ({
    day: i + 1,
    passages: ["C", "E", "G", "I"]
      .map((c) => (r[c] ?? "").trim())
      .filter((s) => s.length > 0),
  }));

  // Render each passage to a wiki-link; surface unparseable cells loudly.
  const failures: { day: number; passage: string; err: string }[] = [];
  const rendered = entries.map((e) => ({
    day: e.day,
    links: e.passages.map((p) => {
      try {
        return parsePassage(p);
      } catch (err) {
        failures.push({ day: e.day, passage: p, err: (err as Error).message });
        return `\`?? ${p} ??\``;
      }
    }),
  }));

  if (failures.length > 0) {
    console.error(`Passage parse failures (${failures.length}):`);
    for (const f of failures) console.error(`  Day ${f.day}: ${JSON.stringify(f.passage)} — ${f.err}`);
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    "---",
    "type: plan",
    `created: ${today}`,
    `updated: ${today}`,
    "plan: mcheyne",
    "total_days: 365",
    "source_url: https://jonathanvajda.com/2021/01/11/bible-reading-plan-spreadsheet/",
    "tags: [reading-plan]",
    "---",
    "",
    "# M'Cheyne One-Year Bible Reading Plan",
    "",
    "Robert Murray M'Cheyne's traditional plan: 4 daily passages covering the Old Testament once and the New Testament + Psalms twice in a year. Day numbering is sequential (1–365) and intentionally calendar-agnostic; read at your own pace.",
    "",
    "Spreadsheet by Jonathan Vajda, based on formatting and organization derived directly from Ben Edgington (edginet.org). Source: <https://jonathanvajda.com/2021/01/11/bible-reading-plan-spreadsheet/>",
    "",
    "| Day | 1 | 2 | 3 | 4 |",
    "|-----|---|---|---|---|",
  ];
  for (const r of rendered) {
    lines.push(`| ${r.day} | ${r.links.join(" | ")} |`);
  }
  lines.push("");

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, lines.join("\n"));

  console.log(`Wrote ${rendered.length} day rows to ${outPath}`);
}

// Only run main when executed as a script (skip when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
