// USFM → Obsidian-flavoured markdown importer for the BSB corpus.
// See ../docs/planning/DECISIONS.md (D11 output format, D13 parser choice)
// and ../docs/planning/phase-1.md for the marker mapping table.

import { readdir, readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join, basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { runSetup } from "./setup-vault.ts";

// ---------------------------------------------------------------------------
// Book metadata
// ---------------------------------------------------------------------------

// USFM 3-letter code → display name. Order roughly canonical.
const BOOK_NAMES: Record<string, string> = {
  GEN: "Genesis", EXO: "Exodus", LEV: "Leviticus", NUM: "Numbers", DEU: "Deuteronomy",
  JOS: "Joshua", JDG: "Judges", RUT: "Ruth", "1SA": "1 Samuel", "2SA": "2 Samuel",
  "1KI": "1 Kings", "2KI": "2 Kings", "1CH": "1 Chronicles", "2CH": "2 Chronicles",
  EZR: "Ezra", NEH: "Nehemiah", EST: "Esther", JOB: "Job", PSA: "Psalms",
  PRO: "Proverbs", ECC: "Ecclesiastes", SNG: "Song of Solomon", ISA: "Isaiah",
  JER: "Jeremiah", LAM: "Lamentations", EZK: "Ezekiel", DAN: "Daniel",
  HOS: "Hosea", JOL: "Joel", AMO: "Amos", OBA: "Obadiah", JON: "Jonah", MIC: "Micah",
  NAM: "Nahum", HAB: "Habakkuk", ZEP: "Zephaniah", HAG: "Haggai", ZEC: "Zechariah", MAL: "Malachi",
  MAT: "Matthew", MRK: "Mark", LUK: "Luke", JHN: "John", ACT: "Acts", ROM: "Romans",
  "1CO": "1 Corinthians", "2CO": "2 Corinthians", GAL: "Galatians", EPH: "Ephesians",
  PHP: "Philippians", COL: "Colossians", "1TH": "1 Thessalonians", "2TH": "2 Thessalonians",
  "1TI": "1 Timothy", "2TI": "2 Timothy", TIT: "Titus", PHM: "Philemon", HEB: "Hebrews",
  JAS: "James", "1PE": "1 Peter", "2PE": "2 Peter", "1JN": "1 John", "2JN": "2 John", "3JN": "3 John",
  JUD: "Jude", REV: "Revelation",
};

// USFM uppercase → vault path code (mixed case per `vault/_templates/CLAUDE.md`).
const PATH_CODE: Record<string, string> = {
  GEN: "Gen", EXO: "Exo", LEV: "Lev", NUM: "Num", DEU: "Deu", JOS: "Jos", JDG: "Jdg",
  RUT: "Rut", "1SA": "1Sa", "2SA": "2Sa", "1KI": "1Ki", "2KI": "2Ki", "1CH": "1Ch",
  "2CH": "2Ch", EZR: "Ezr", NEH: "Neh", EST: "Est", JOB: "Job", PSA: "Psa",
  PRO: "Pro", ECC: "Ecc", SNG: "Sng", ISA: "Isa", JER: "Jer", LAM: "Lam", EZK: "Ezk",
  DAN: "Dan", HOS: "Hos", JOL: "Jol", AMO: "Amo", OBA: "Oba", JON: "Jon", MIC: "Mic",
  NAM: "Nam", HAB: "Hab", ZEP: "Zep", HAG: "Hag", ZEC: "Zec", MAL: "Mal",
  MAT: "Mat", MRK: "Mrk", LUK: "Luk", JHN: "Jhn", ACT: "Act", ROM: "Rom",
  "1CO": "1Co", "2CO": "2Co", GAL: "Gal", EPH: "Eph", PHP: "Php", COL: "Col",
  "1TH": "1Th", "2TH": "2Th", "1TI": "1Ti", "2TI": "2Ti", TIT: "Tit", PHM: "Phm",
  HEB: "Heb", JAS: "Jas", "1PE": "1Pe", "2PE": "2Pe", "1JN": "1Jn", "2JN": "2Jn",
  "3JN": "3Jn", JUD: "Jud", REV: "Rev",
};

// English book name (any case) → path code, for footnote/parallel-ref linkification.
// "Psalm" and "Psalms" both map to Psa (in singular reference: "Psalm 23").
const NAME_TO_CODE: ReadonlyMap<string, string> = new Map(
  Object.entries({
    Genesis: "Gen", Exodus: "Exo", Leviticus: "Lev", Numbers: "Num", Deuteronomy: "Deu",
    Joshua: "Jos", Judges: "Jdg", Ruth: "Rut",
    "1 Samuel": "1Sa", "2 Samuel": "2Sa", "1 Kings": "1Ki", "2 Kings": "2Ki",
    "1 Chronicles": "1Ch", "2 Chronicles": "2Ch",
    Ezra: "Ezr", Nehemiah: "Neh", Esther: "Est", Job: "Job",
    Psalm: "Psa", Psalms: "Psa", Proverbs: "Pro", Ecclesiastes: "Ecc",
    "Song of Solomon": "Sng", "Song of Songs": "Sng", Song: "Sng",
    Isaiah: "Isa", Jeremiah: "Jer", Lamentations: "Lam", Ezekiel: "Ezk", Daniel: "Dan",
    Hosea: "Hos", Joel: "Jol", Amos: "Amo", Obadiah: "Oba", Jonah: "Jon", Micah: "Mic",
    Nahum: "Nam", Habakkuk: "Hab", Zephaniah: "Zep", Haggai: "Hag", Zechariah: "Zec", Malachi: "Mal",
    Matthew: "Mat", Mark: "Mrk", Luke: "Luk", John: "Jhn", Acts: "Act", Romans: "Rom",
    "1 Corinthians": "1Co", "2 Corinthians": "2Co", Galatians: "Gal", Ephesians: "Eph",
    Philippians: "Php", Colossians: "Col",
    "1 Thessalonians": "1Th", "2 Thessalonians": "2Th",
    "1 Timothy": "1Ti", "2 Timothy": "2Ti", Titus: "Tit", Philemon: "Phm", Hebrews: "Heb",
    James: "Jas", "1 Peter": "1Pe", "2 Peter": "2Pe",
    "1 John": "1Jn", "2 John": "2Jn", "3 John": "3Jn",
    Jude: "Jud", Revelation: "Rev",
  }),
);

// Sorted longest-first so "1 Corinthians" matches before "1 Co…"-something else.
const SORTED_BOOK_NAMES = [...NAME_TO_CODE.keys()].sort((a, b) => b.length - a.length);

// Canonical 66-book ordering (Protestant OT then NT). Used for chapter-nav
// neighbors at book boundaries (Gen 50 → Exo 1, Mal 4 → Mat 1, etc.) and for
// rendering the master Bible index.
const CANONICAL_ORDER: readonly string[] = [
  "GEN", "EXO", "LEV", "NUM", "DEU",
  "JOS", "JDG", "RUT", "1SA", "2SA",
  "1KI", "2KI", "1CH", "2CH",
  "EZR", "NEH", "EST",
  "JOB", "PSA", "PRO", "ECC", "SNG",
  "ISA", "JER", "LAM", "EZK", "DAN",
  "HOS", "JOL", "AMO", "OBA", "JON", "MIC",
  "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL",
  "MAT", "MRK", "LUK", "JHN", "ACT", "ROM",
  "1CO", "2CO", "GAL", "EPH", "PHP", "COL",
  "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB",
  "JAS", "1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV",
];

// Index of the first NT book; everything before is OT. Used by the Bible
// index seed.
const NT_START_INDEX = CANONICAL_ORDER.indexOf("MAT");

// Chapter counts per book of the 66-book canon. Stable across translations
// (chapter divisions are a versification artifact, not a translation
// choice). Hardcoded so chapter-nav neighbors work even with `--only Gen`
// in this run — the next book's file may already exist from a prior run.
const CHAPTER_COUNTS: Record<string, number> = {
  GEN: 50, EXO: 40, LEV: 27, NUM: 36, DEU: 34,
  JOS: 24, JDG: 21, RUT: 4, "1SA": 31, "2SA": 24,
  "1KI": 22, "2KI": 25, "1CH": 29, "2CH": 36,
  EZR: 10, NEH: 13, EST: 10,
  JOB: 42, PSA: 150, PRO: 31, ECC: 12, SNG: 8,
  ISA: 66, JER: 52, LAM: 5, EZK: 48, DAN: 12,
  HOS: 14, JOL: 3, AMO: 9, OBA: 1, JON: 4, MIC: 7,
  NAM: 3, HAB: 3, ZEP: 3, HAG: 2, ZEC: 14, MAL: 4,
  MAT: 28, MRK: 16, LUK: 24, JHN: 21, ACT: 28, ROM: 16,
  "1CO": 16, "2CO": 13, GAL: 6, EPH: 6, PHP: 4, COL: 4,
  "1TH": 5, "2TH": 3, "1TI": 6, "2TI": 4, TIT: 3, PHM: 1, HEB: 13,
  JAS: 5, "1PE": 5, "2PE": 3, "1JN": 5, "2JN": 1, "3JN": 1, JUD: 1, REV: 22,
};

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type Token =
  | { t: "id"; arg: string }
  | { t: "h" | "toc1" | "toc2" | "mt1"; arg: string }
  | { t: "c"; n: number }
  | { t: "v"; n: number }
  | { t: "s1" | "s2" | "ms1" | "mr" | "r" | "d" | "qa"; arg: string }
  | { t: "p"; ptype: "m" | "pmo" | "pc" | "nb" }
  | { t: "q"; level: 1 | 2 | 3; isQr: boolean }
  | { t: "li"; level: 1 | 2 }
  | { t: "b" }
  | { t: "w"; word: string; strong: string | null }
  | { t: "f"; raw: string }
  | { t: "it"; text: string }
  | { t: "txt"; text: string };

// Markers whose argument runs to the end of the line.
const TEXT_ARG_MARKERS = new Set([
  "h", "toc1", "toc2", "mt1", "s1", "s2", "ms1", "mr", "r", "d", "qa",
]);

// Standalone block markers (no argument).
const PARA_TYPES = new Set(["m", "pmo", "pc", "nb"]);

class Scanner {
  private i = 0;
  constructor(private readonly src: string) {}

  done(): boolean { return this.i >= this.src.length; }
  peek(off = 0): string { return this.src[this.i + off] ?? ""; }
  advance(n = 1): void { this.i += n; }

  /** Read a backslash-marker name like "v" / "q1" / "f" / "fr" / "id". */
  readMarkerName(): string | null {
    if (this.peek() !== "\\") return null;
    let j = this.i + 1;
    while (j < this.src.length) {
      const c = this.src[j]!;
      if (/[a-zA-Z0-9]/.test(c)) j++;
      else break;
    }
    if (j === this.i + 1) return null;
    const name = this.src.slice(this.i + 1, j);
    this.i = j;
    return name;
  }

  /** Read until end-of-line (excluding newline), trim trailing whitespace. */
  readToEol(): string {
    let j = this.i;
    while (j < this.src.length && this.src[j] !== "\n") j++;
    const out = this.src.slice(this.i, j);
    this.i = j;
    return out.replace(/\s+$/, "").replace(/^\s+/, "");
  }

  /** Skip a single space directly after a marker name (separator). */
  skipMarkerSep(): void {
    if (this.peek() === " " || this.peek() === "\t") this.advance();
  }

  skipNewline(): void {
    if (this.peek() === "\n") this.advance();
  }
}

/**
 * Tokenize an entire book file into a flat token stream.
 *
 * Inline markers (`\w`, `\f`, `\it`) are absorbed into single tokens so the
 * downstream walker doesn't have to manage open/close state.
 */
function tokenize(src: string): Token[] {
  const out: Token[] = [];
  const sc = new Scanner(src);

  // Buffered plain-text run; emitted whenever we hit a marker boundary.
  let textBuf = "";
  const flushText = () => {
    if (textBuf.length === 0) return;
    out.push({ t: "txt", text: textBuf });
    textBuf = "";
  };

  while (!sc.done()) {
    if (sc.peek() === "\\") {
      const startedAt = (sc as unknown as { i: number }).i;
      const name = sc.readMarkerName();
      if (name === null) {
        // Stray backslash; treat as literal.
        textBuf += sc.peek();
        sc.advance();
        continue;
      }

      // Inline word: \w lemma|strong="…"\w*
      if (name === "w") {
        flushText();
        sc.skipMarkerSep();
        // Read until \w*
        const closeIdx = src.indexOf("\\w*", (sc as unknown as { i: number }).i);
        if (closeIdx === -1) throw new Error(`Unterminated \\w at offset ${startedAt}`);
        const inner = src.slice((sc as unknown as { i: number }).i, closeIdx);
        (sc as unknown as { i: number }).i = closeIdx + 3; // past \w*
        const pipe = inner.indexOf("|");
        const word = (pipe === -1 ? inner : inner.slice(0, pipe)).trim();
        let strong: string | null = null;
        if (pipe !== -1) {
          const attrs = inner.slice(pipe + 1);
          const m = /strong="([^"]+)"/.exec(attrs);
          if (m) strong = m[1] ?? null;
        }
        out.push({ t: "w", word, strong });
        continue;
      }

      // Inline italic: \it text\it*
      if (name === "it") {
        flushText();
        sc.skipMarkerSep();
        const closeIdx = src.indexOf("\\it*", (sc as unknown as { i: number }).i);
        if (closeIdx === -1) throw new Error(`Unterminated \\it at offset ${startedAt}`);
        const inner = src.slice((sc as unknown as { i: number }).i, closeIdx).trim();
        (sc as unknown as { i: number }).i = closeIdx + 4;
        out.push({ t: "it", text: inner });
        continue;
      }

      // Inline footnote: \f + … \f*
      if (name === "f") {
        flushText();
        sc.skipMarkerSep();
        // BSB always opens with "+ " — discard the caller char.
        const closeIdx = src.indexOf("\\f*", (sc as unknown as { i: number }).i);
        if (closeIdx === -1) throw new Error(`Unterminated \\f at offset ${startedAt}`);
        const inner = src.slice((sc as unknown as { i: number }).i, closeIdx);
        (sc as unknown as { i: number }).i = closeIdx + 3;
        out.push({ t: "f", raw: inner });
        continue;
      }

      // Block markers from here on.
      flushText();

      if (name === "id") {
        sc.skipMarkerSep();
        out.push({ t: "id", arg: sc.readToEol() });
        sc.skipNewline();
        continue;
      }

      if (name === "c") {
        sc.skipMarkerSep();
        const num = parseInt(sc.readToEol(), 10);
        if (!Number.isFinite(num)) throw new Error(`Bad chapter number near offset ${startedAt}`);
        out.push({ t: "c", n: num });
        sc.skipNewline();
        continue;
      }

      if (name === "v") {
        sc.skipMarkerSep();
        // Verse number can be "12" or "12-13" (BSB doesn't use ranges, but be defensive).
        let j = (sc as unknown as { i: number }).i;
        while (j < src.length && /[0-9-]/.test(src[j]!)) j++;
        const numStr = src.slice((sc as unknown as { i: number }).i, j);
        (sc as unknown as { i: number }).i = j;
        const num = parseInt(numStr, 10);
        if (!Number.isFinite(num)) throw new Error(`Bad verse number near offset ${startedAt}: '${numStr}'`);
        out.push({ t: "v", n: num });
        sc.skipMarkerSep();
        continue;
      }

      if (TEXT_ARG_MARKERS.has(name)) {
        sc.skipMarkerSep();
        const arg = sc.readToEol();
        out.push({ t: name as "s1", arg });
        sc.skipNewline();
        continue;
      }

      if (PARA_TYPES.has(name)) {
        out.push({ t: "p", ptype: name as "m" });
        // \m, \pmo etc. may be followed by inline content on the same line.
        sc.skipMarkerSep();
        continue;
      }

      const qm = /^q([1-3]r?)$/.exec(name) ?? (name === "qr" ? ["qr", "1r"] : null);
      if (name === "qr") {
        out.push({ t: "q", level: 1, isQr: true });
        sc.skipMarkerSep();
        continue;
      }
      if (qm && qm[1]) {
        const lvl = parseInt(qm[1]!.replace("r", ""), 10) as 1 | 2 | 3;
        out.push({ t: "q", level: lvl, isQr: false });
        sc.skipMarkerSep();
        continue;
      }

      if (name === "li1" || name === "li2") {
        out.push({ t: "li", level: name === "li1" ? 1 : 2 });
        sc.skipMarkerSep();
        continue;
      }

      if (name === "b") {
        out.push({ t: "b" });
        sc.skipMarkerSep();
        continue;
      }

      // Unknown marker: log once and skip its content to end of line so we
      // don't silently corrupt text. BSB's marker set is closed (per phase-1.md);
      // anything new is a flag that the corpus shape changed.
      console.warn(`[importer] unknown marker \\${name} at offset ${startedAt}; skipping line`);
      sc.readToEol();
      sc.skipNewline();
      continue;
    }

    // Plain text byte.
    textBuf += sc.peek();
    sc.advance();
  }

  flushText();
  return out;
}

// ---------------------------------------------------------------------------
// AST: structured per-chapter blocks
// ---------------------------------------------------------------------------

type Inline =
  | { kind: "text"; text: string }
  | { kind: "word"; text: string; strong: string | null }
  | { kind: "italic"; text: string }
  | { kind: "footnote"; id: number };

type Segment = {
  verse: number;        // verse number this segment belongs to
  hasVerseStart: boolean; // first segment of this verse in the chapter
  inline: Inline[];
};

type Block =
  | { kind: "section"; level: 1 | 2; text: string }
  | { kind: "mr"; text: string }
  | { kind: "see-also"; text: string }       // \r
  | { kind: "superscription"; text: string } // \d
  | { kind: "acrostic"; letter: string }     // \qa
  | { kind: "blank" }                          // \b at top level (rare)
  | { kind: "paragraph"; ptype: string; quoteLevel: 0 | 1 | 2 | 3; isQr: boolean; segments: Segment[] }
  | { kind: "list-item"; level: 1 | 2; segments: Segment[] };

type Footnote = { id: number; verse: number; rawText: string };

type StrongsEntry = { w: string; s: string | null };

type Chapter = {
  number: number;
  totalVerses: number;
  blocks: Block[];
  footnotes: Footnote[];
  strongs: Map<number, StrongsEntry[]>;
};

type Book = {
  bookCode: string;   // "GEN" (USFM uppercase)
  pathCode: string;   // "Gen"
  bookName: string;   // "Genesis"
  chapters: Chapter[];
};

// ---------------------------------------------------------------------------
// Parser: walk tokens, build per-chapter Block lists.
// ---------------------------------------------------------------------------

function parse(tokens: Token[]): Book {
  let bookCode = "";
  let bookName = "";

  const chapters: Chapter[] = [];
  let chapter: Chapter | null = null;
  let currentVerse = 0;
  let footnoteCounter = 0;
  // Track which verses have already had their first segment, so multi-paragraph
  // verses only get the verse-number marker on the first paragraph.
  let verseStarted: Set<number> = new Set();

  // Active paragraph (mutable). Null between blocks.
  let activeParagraph: Extract<Block, { kind: "paragraph" }> | null = null;
  // Active list-item.
  let activeListItem: Extract<Block, { kind: "list-item" }> | null = null;

  const flushActive = () => {
    if (activeParagraph) {
      // Drop empty paragraphs (e.g., \m on its own at chapter start before any \v).
      if (activeParagraph.segments.some((s) => s.inline.length > 0)) {
        chapter!.blocks.push(activeParagraph);
      }
      activeParagraph = null;
    }
    if (activeListItem) {
      if (activeListItem.segments.some((s) => s.inline.length > 0)) {
        chapter!.blocks.push(activeListItem);
      }
      activeListItem = null;
    }
  };

  const ensureParagraph = (ptype = "m", quoteLevel: 0 | 1 | 2 | 3 = 0, isQr = false) => {
    if (activeListItem) {
      flushActive();
    }
    if (!activeParagraph) {
      activeParagraph = { kind: "paragraph", ptype, quoteLevel, isQr, segments: [] };
    }
  };

  const segmentForVerse = (): Segment => {
    if (!chapter) throw new Error("verse content before chapter");
    if (currentVerse === 0) throw new Error("verse content before \\v");
    const target = activeParagraph?.segments ?? activeListItem?.segments;
    if (!target) {
      // No active paragraph (verse text starting with no \m before it). Synthesize one.
      ensureParagraph("m", 0);
      return segmentForVerse();
    }
    const last = target[target.length - 1];
    if (last && last.verse === currentVerse) return last;
    const isFirstAppearance = !verseStarted.has(currentVerse);
    if (isFirstAppearance) verseStarted.add(currentVerse);
    const seg: Segment = { verse: currentVerse, hasVerseStart: isFirstAppearance, inline: [] };
    target.push(seg);
    return seg;
  };

  const pushInline = (item: Inline) => {
    const seg = segmentForVerse();
    // Coalesce adjacent text nodes; cleaner output and simpler renderer.
    const last = seg.inline[seg.inline.length - 1];
    if (item.kind === "text" && last?.kind === "text") {
      last.text += item.text;
    } else {
      seg.inline.push(item);
    }
  };

  for (const tok of tokens) {
    switch (tok.t) {
      case "id": {
        // "GEN - Berean Study Bible" → take first whitespace-bounded token as the code.
        const code = tok.arg.trim().split(/\s+/)[0]?.toUpperCase() ?? "";
        bookCode = code;
        // Provisional; \h / \toc1 / \mt1 below typically overwrite.
        bookName = BOOK_NAMES[code] ?? code;
        break;
      }
      case "h":
      case "toc1":
      case "toc2":
      case "mt1": {
        // Prefer \toc1 (long form), then \mt1, then \h. \mt1 wins because it's
        // the canonical title element in USFM.
        if (tok.t === "mt1" || (tok.t === "toc1" && bookName === "") || bookName === "") {
          // Allow override only if we don't already have a curated mapping.
          // BOOK_NAMES is curated; trust it over the source's "Berean Study Bible" quirk.
          if (!BOOK_NAMES[bookCode]) bookName = tok.arg;
        }
        break;
      }
      case "c": {
        flushActive();
        chapter = {
          number: tok.n,
          totalVerses: 0,
          blocks: [],
          footnotes: [],
          strongs: new Map(),
        };
        chapters.push(chapter);
        currentVerse = 0;
        verseStarted = new Set();
        footnoteCounter = 0;
        break;
      }
      case "v": {
        if (!chapter) throw new Error("\\v before \\c");
        currentVerse = tok.n;
        chapter.totalVerses = Math.max(chapter.totalVerses, tok.n);
        chapter.strongs.set(tok.n, chapter.strongs.get(tok.n) ?? []);
        // No paragraph break implied by \v alone — verse text continues whatever
        // paragraph the previous \m / \q1 / \pmo opened.
        ensureParagraph(activeParagraph?.ptype ?? "m", activeParagraph?.quoteLevel ?? 0, activeParagraph?.isQr ?? false);
        break;
      }
      case "s1":
      case "s2":
      case "ms1": {
        flushActive();
        const level = tok.t === "s2" ? 2 : 1;
        chapter!.blocks.push({ kind: "section", level, text: tok.arg });
        break;
      }
      case "mr":
        flushActive();
        chapter!.blocks.push({ kind: "mr", text: tok.arg });
        break;
      case "r":
        flushActive();
        chapter!.blocks.push({ kind: "see-also", text: tok.arg });
        break;
      case "d":
        flushActive();
        chapter!.blocks.push({ kind: "superscription", text: tok.arg });
        break;
      case "qa":
        flushActive();
        chapter!.blocks.push({ kind: "acrostic", letter: tok.arg });
        break;
      case "p": {
        flushActive();
        activeParagraph = { kind: "paragraph", ptype: tok.ptype, quoteLevel: 0, isQr: false, segments: [] };
        break;
      }
      case "q": {
        flushActive();
        const ptype = tok.isQr ? "qr" : `q${tok.level}`;
        activeParagraph = {
          kind: "paragraph",
          ptype,
          quoteLevel: tok.level,
          isQr: tok.isQr,
          segments: [],
        };
        break;
      }
      case "li": {
        flushActive();
        activeListItem = { kind: "list-item", level: tok.level, segments: [] };
        break;
      }
      case "b": {
        // \b is a paragraph separator. If we're inside a paragraph, that
        // paragraph closes; the next \v that arrives will need a new \m or \q1
        // before it (BSB always supplies one). If we're outside any paragraph,
        // it's an explicit blank line — record it so spacing in poetry sections
        // (e.g., between Psalm 119 stanzas) survives.
        if (activeParagraph || activeListItem) {
          flushActive();
        } else {
          chapter?.blocks.push({ kind: "blank" });
        }
        break;
      }
      case "w": {
        if (!chapter || currentVerse === 0) {
          // Stray \w before any verse — ignore.
          break;
        }
        pushInline({ kind: "word", text: tok.word, strong: tok.strong });
        const list = chapter.strongs.get(currentVerse)!;
        list.push({ w: tok.word, s: tok.strong });
        break;
      }
      case "it": {
        if (!chapter || currentVerse === 0) break;
        pushInline({ kind: "italic", text: tok.text });
        // Italicized word(s) still count for Strong's index (per D11.1) — split
        // by whitespace, strip punctuation, and emit s:null entries.
        recordUntaggedWords(chapter.strongs.get(currentVerse)!, tok.text);
        break;
      }
      case "f": {
        if (!chapter || currentVerse === 0) break;
        footnoteCounter++;
        const id = footnoteCounter;
        chapter.footnotes.push({ id, verse: currentVerse, rawText: tok.raw });
        pushInline({ kind: "footnote", id });
        break;
      }
      case "txt": {
        if (!chapter || currentVerse === 0) {
          // Pre-verse plain text (whitespace between block markers) is dropped.
          break;
        }
        if (tok.text.trim() === "") {
          // Pure whitespace only matters as a join between two pieces of
          // existing inline content for the current verse. Otherwise it's a
          // structural separator between block markers and would create a
          // phantom segment that drags the previous verse's `^vN` anchor into
          // the next paragraph.
          const target = activeParagraph?.segments ?? activeListItem?.segments;
          const lastSeg = target?.[target.length - 1];
          if (!lastSeg || lastSeg.inline.length === 0 || lastSeg.verse !== currentVerse) break;
        }
        pushInline({ kind: "text", text: tok.text });
        recordUntaggedWords(chapter.strongs.get(currentVerse)!, tok.text);
        break;
      }
    }
  }

  flushActive();

  return {
    bookCode,
    pathCode: PATH_CODE[bookCode] ?? bookCode,
    bookName: BOOK_NAMES[bookCode] ?? bookName,
    chapters,
  };
}

/**
 * Append untagged words found in plain text to the verse's Strong's list, with
 * `s: null`. Per D11.1 this keeps word indexes 1:1 with the rendered verse so
 * the Phase 2 renderer can overlay Strong's by position.
 */
function recordUntaggedWords(into: StrongsEntry[], rawText: string): void {
  // Strip footnote-marker placeholder text — but we tokenize footnotes
  // separately, so plain text never contains them. Still, defensively skip.
  const cleaned = rawText.replace(/\[\^\d+\]/g, "");
  for (const tok of cleaned.split(/\s+/)) {
    if (!tok) continue;
    const stripped = tok.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
    if (stripped.length === 0) continue;
    into.push({ w: stripped, s: null });
  }
}

// ---------------------------------------------------------------------------
// Linkifier: convert "Genesis 2:24" → [[bible/Gen/02#^v24|Genesis 2:24]]
// ---------------------------------------------------------------------------

const NUMERIC_PREFIX_BOOKS = SORTED_BOOK_NAMES.filter((n) => /^[123] /.test(n));
const PLAIN_BOOKS = SORTED_BOOK_NAMES.filter((n) => !/^[123] /.test(n));

// Match e.g. "Genesis 2:24", "1 Corinthians 15:45", "Hebrews 4:1–11", "Psalm 23".
// Captures: 1=name, 2=ch, 3=optional verse, 4=optional end-verse for range.
const REF_RE = (() => {
  // Build alternation. Word-boundary anchors handle spacing; longer matches first.
  const namePattern = [...NUMERIC_PREFIX_BOOKS, ...PLAIN_BOOKS]
    .map((n) => n.replace(/ /g, "\\s+"))
    .join("|");
  return new RegExp(
    `\\b(${namePattern})\\s+(\\d+)(?::(\\d+)(?:[\\u2013\\u2014-](\\d+))?)?`,
    "g",
  );
})();

// Display name for the human-facing chapter title and any verse-link label.
// "Psalms" (the curated book name) becomes "Psalm" in display because chapter
// pages render as "Psalm 23", matching common usage.
function displayBookName(pathCode: string, bookName: string): string {
  return pathCode === "Psa" ? "Psalm" : bookName;
}

// ---------------------------------------------------------------------------
// Chapter nav: previous/next links honoring the 66-book canon
// ---------------------------------------------------------------------------

type NavTarget = { bookCode: string; chapter: number };

function chapterNeighbors(
  bookCode: string,
  chapter: number,
): { prev: NavTarget | null; next: NavTarget | null } {
  const total = CHAPTER_COUNTS[bookCode];
  if (total === undefined) return { prev: null, next: null };
  let prev: NavTarget | null = null;
  let next: NavTarget | null = null;
  if (chapter > 1) {
    prev = { bookCode, chapter: chapter - 1 };
  } else {
    const idx = CANONICAL_ORDER.indexOf(bookCode);
    if (idx > 0) {
      const prevCode = CANONICAL_ORDER[idx - 1]!;
      prev = { bookCode: prevCode, chapter: CHAPTER_COUNTS[prevCode]! };
    }
  }
  if (chapter < total) {
    next = { bookCode, chapter: chapter + 1 };
  } else {
    const idx = CANONICAL_ORDER.indexOf(bookCode);
    if (idx >= 0 && idx < CANONICAL_ORDER.length - 1) {
      const nextCode = CANONICAL_ORDER[idx + 1]!;
      next = { bookCode: nextCode, chapter: 1 };
    }
  }
  return { prev, next };
}

function navLink(target: NavTarget, arrow: "left" | "right"): string {
  const pathCode = PATH_CODE[target.bookCode]!;
  const bookName = BOOK_NAMES[target.bookCode]!;
  const display = `${displayBookName(pathCode, bookName)} ${target.chapter}`;
  const chPad = String(target.chapter).padStart(2, "0");
  const inner = arrow === "left" ? `← ${display}` : `${display} →`;
  return `[[bible/${pathCode}/${chPad}|${inner}]]`;
}

function navLine(bookCode: string, chapter: number): string {
  const { prev, next } = chapterNeighbors(bookCode, chapter);
  const parts: string[] = [];
  if (prev) parts.push(navLink(prev, "left"));
  if (next) parts.push(navLink(next, "right"));
  return parts.join(" · ");
}

function linkifyRefs(text: string): string {
  return text.replace(REF_RE, (match, rawName: string, chStr: string, vStartStr?: string, vEndStr?: string) => {
    // Normalize internal whitespace in name back to single spaces.
    const name = rawName.replace(/\s+/g, " ");
    const code = NAME_TO_CODE.get(name);
    if (!code) return match;
    const ch = parseInt(chStr, 10);
    const chPad = String(ch).padStart(2, "0");
    if (!vStartStr) {
      // Whole-chapter reference. Link to chapter file (no block ref).
      return `[[bible/${code}/${chPad}|${match}]]`;
    }
    const vStart = parseInt(vStartStr, 10);
    return `[[bible/${code}/${chPad}#^v${vStart}|${match}]]`;
  });
}

// ---------------------------------------------------------------------------
// Renderer: Book → markdown + sidecar JSON files
// ---------------------------------------------------------------------------

const SUPERSCRIPT_DIGITS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

function toSuperscript(n: number): string {
  return String(n).split("").map((d) => SUPERSCRIPT_DIGITS[parseInt(d, 10)]!).join("");
}

function renderInline(items: Inline[]): string {
  let out = "";
  for (const item of items) {
    if (item.kind === "text") out += item.text;
    else if (item.kind === "word") out += item.text;
    else if (item.kind === "italic") out += `*${item.text}*`;
    else if (item.kind === "footnote") out += `[^${item.id}]`;
  }
  // BSB pads `\f` markers with a separator space; strip it so footnote pins
  // attach to the preceding word/punctuation. Then collapse whitespace.
  return out.replace(/\s+\[\^/g, "[^").replace(/\s+/g, " ").trim();
}

function renderSegment(seg: Segment): string {
  const inner = renderInline(seg.inline);
  if (seg.hasVerseStart) {
    return `**${toSuperscript(seg.verse)}** ${inner}`;
  }
  return inner;
}

type SegmentRef = { blockIdx: number; segIdx: number };

/**
 * Determine, for each verse N in the chapter, the (block, segment) pair that
 * contains the verse's last bit of content. That segment gets the `^vN`
 * block-ref. Per D11.4 / D14: each verse renders as its own markdown
 * paragraph, so we need segment-level granularity, not block-level — multi-
 * verse USFM paragraphs (e.g. Eph 5:22–24 in one `\m`) split into multiple
 * markdown paragraphs and Obsidian only honors one block-id per paragraph.
 */
function lastSegmentForVerse(blocks: Block[]): Map<number, SegmentRef> {
  const out = new Map<number, SegmentRef>();
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    if (b.kind === "paragraph" || b.kind === "list-item") {
      for (let j = 0; j < b.segments.length; j++) {
        const seg = b.segments[j]!;
        out.set(seg.verse, { blockIdx: i, segIdx: j });
      }
    }
  }
  return out;
}

function quotePrefix(level: 0 | 1 | 2 | 3): string {
  if (level === 0) return "";
  return ">".repeat(level) + " ";
}

function renderFootnote(fn: Footnote): string {
  // Strip leading "+ " caller and \fr / \ft prefixes; keep \ft body.
  // Pattern: "+ \fr 1:3 \ft Cited in 2 Corinthians 4:6"
  let body = fn.rawText;
  // Drop leading caller token (e.g. "+", "-", "?")
  body = body.replace(/^\s*[+\-?]\s*/, "");
  // Drop \fr verse-tag (we don't render it; the [^N] pin already locates the verse)
  body = body.replace(/\\fr\s+\S+\s*/g, "");
  // Drop \ft marker (just keeps the prose).
  body = body.replace(/\\ft\s*/g, "");
  // Strip any other inline markup we don't handle (rare in BSB footnotes).
  body = body.replace(/\\[a-z]+\*?/g, "");
  body = body.replace(/\s+/g, " ").trim();
  return `[^${fn.id}]: ${linkifyRefs(body)}`;
}

function renderChapter(book: Book, chapter: Chapter, translation: string): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`translation: ${translation}`);
  lines.push(`book: ${book.pathCode}`);
  lines.push(`book_name: ${book.bookName}`);
  lines.push(`chapter: ${chapter.number}`);
  lines.push(`total_verses: ${chapter.totalVerses}`);
  // Obsidian `cssclasses` hook: lets `tools/snippets/bible-flow.css` target
  // chapter pages without leaking styling onto user notes.
  lines.push("cssclasses:");
  lines.push("  - bible-flow");
  lines.push("---");
  lines.push("");

  // Title: "Genesis 1" or "Psalm 23" (singular for Psalms).
  const titleBookName = displayBookName(book.pathCode, book.bookName);
  lines.push(`# ${titleBookName} ${chapter.number}`);
  lines.push("");

  // Chapter nav (prev/next), repeated below after footnotes. Plain wikilinks
  // (no italic) — bible-flow.css lifts paragraphs whose first child is a
  // wikilink out of the inline prose flow. Verse paragraphs always start
  // with `<strong>**N**</strong>`, so they don't match the same selector.
  const nav = navLine(book.bookCode, chapter.number);
  if (nav) {
    lines.push(nav);
    lines.push("");
  }

  const lastSegOf = lastSegmentForVerse(chapter.blocks);
  // Translations that follow critical-text editions (BSB included) omit certain
  // verses entirely (Mat 17:21, Mar 9:44, Act 8:37, etc.). Those gaps are
  // intentional — the verse number simply doesn't exist in the source. We
  // don't fabricate `^vN` anchors for verses we never saw; the frontmatter's
  // `total_verses` still reports the highest verse number the chapter contains.

  for (let i = 0; i < chapter.blocks.length; i++) {
    const b = chapter.blocks[i]!;
    switch (b.kind) {
      case "section": {
        lines.push(`${b.level === 1 ? "##" : "###"} ${b.text}`);
        lines.push("");
        break;
      }
      case "mr": {
        lines.push(`*${b.text}*`);
        lines.push("");
        break;
      }
      case "see-also": {
        // BSB's \r is parenthesized: "(Exodus 16:22–30; Hebrews 4:1–11)".
        // Strip outer parens, split on ; into individual refs, linkify each.
        const inner = b.text.replace(/^\(/, "").replace(/\)$/, "");
        const parts = inner.split(/\s*;\s*/).map((p) => linkifyRefs(p.trim())).filter(Boolean);
        lines.push(`*See also: ${parts.join(" · ")}*`);
        lines.push("");
        break;
      }
      case "superscription": {
        lines.push(`*${b.text}*`);
        lines.push("");
        break;
      }
      case "acrostic": {
        // Per D15: emit as h4. Gives CSS a clean structural hook
        // (`.bible-flow h4`) without the `:only-child` ambiguity that
        // `**LETTER**` introduced (every verse paragraph also matches that).
        lines.push(`#### ${b.letter}`);
        lines.push("");
        break;
      }
      case "blank": {
        // Already separated by surrounding blank lines from other blocks.
        break;
      }
      case "paragraph": {
        // Per D11.4 / D14: one markdown paragraph per verse segment, not per
        // USFM paragraph. Inline `<!-- p:type -->` comments are dropped (D14);
        // CSS in `tools/snippets/bible-flow.css` collapses the visual gap
        // between adjacent paragraphs so prose flows.
        const prefix = quotePrefix(b.quoteLevel);
        for (let j = 0; j < b.segments.length; j++) {
          const seg = b.segments[j]!;
          let rendered = renderSegment(seg);
          const last = lastSegOf.get(seg.verse);
          if (last && last.blockIdx === i && last.segIdx === j) {
            rendered = `${rendered} ^v${seg.verse}`;
          }
          lines.push(`${prefix}${rendered}`);
          lines.push("");
        }
        break;
      }
      case "list-item": {
        const indent = b.level === 1 ? "" : "  ";
        for (let j = 0; j < b.segments.length; j++) {
          const seg = b.segments[j]!;
          let rendered = renderSegment(seg);
          const last = lastSegOf.get(seg.verse);
          if (last && last.blockIdx === i && last.segIdx === j) {
            rendered = `${rendered} ^v${seg.verse}`;
          }
          lines.push(`${indent}- ${rendered}`);
        }
        lines.push("");
        break;
      }
    }
  }

  if (chapter.footnotes.length > 0) {
    for (const fn of chapter.footnotes) {
      lines.push(renderFootnote(fn));
    }
    lines.push("");
  }

  // Repeat the nav at the bottom so the reader can move forward without
  // scrolling back to the title.
  if (nav) {
    lines.push(nav);
    lines.push("");
  }

  // Single trailing newline.
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\n*$/, "\n");
}

function renderStrongs(book: Book, chapter: Chapter, translation: string): string {
  const versesObj: Record<string, StrongsEntry[]> = {};
  for (const [v, list] of [...chapter.strongs.entries()].sort((a, b) => a[0] - b[0])) {
    versesObj[String(v)] = list;
  }
  return JSON.stringify(
    {
      translation,
      book: book.pathCode,
      chapter: chapter.number,
      verses: versesObj,
    },
    null,
    2,
  ) + "\n";
}

// ---------------------------------------------------------------------------
// Structural seed notes (one-time, idempotent — never overwrites user edits)
// ---------------------------------------------------------------------------
//
// Seeded into `vault/notes/bible/`, not `vault/bible/`: these are commentary
// surfaces the user may extend (jumping-off pages, eventual book overviews),
// not part of the generated Bible text. `vault/bible/` is generated and
// regenerated on every import; `vault/notes/bible/` is user territory.

function renderBibleIndex(): string {
  const ot = CANONICAL_ORDER.slice(0, NT_START_INDEX);
  const nt = CANONICAL_ORDER.slice(NT_START_INDEX);
  const lines: string[] = [];
  lines.push("# Bible");
  lines.push("");
  lines.push("## Old Testament");
  lines.push("");
  // Per D27, book-overview links use the full vault-relative path so they
  // remain unambiguous even when an entity stub shares the book's basename
  // (e.g., `notes/people/Job.md` vs `notes/bible/Job.md`). All 66 books emit
  // the same shape for consistency, not just the names that currently collide.
  for (const code of ot) {
    const name = BOOK_NAMES[code]!;
    lines.push(`- [[notes/bible/${name}|${name}]]`);
  }
  lines.push("");
  lines.push("## New Testament");
  lines.push("");
  for (const code of nt) {
    const name = BOOK_NAMES[code]!;
    lines.push(`- [[notes/bible/${name}|${name}]]`);
  }
  lines.push("");
  return lines.join("\n");
}

function renderBookIndex(book: Book): string {
  const lines: string[] = [];
  lines.push(`# ${book.bookName}`);
  lines.push("");
  const display = displayBookName(book.pathCode, book.bookName);
  for (const ch of book.chapters) {
    const chPad = String(ch.number).padStart(2, "0");
    // Link points at the chapter file (no `^v1` anchor) per the user's spec —
    // opening the chapter file lands on the H1, which is what they want when
    // navigating from the book index.
    lines.push(
      `- [[bible/${book.pathCode}/${chPad}|${display} ${ch.number}:1–${ch.totalVerses}]]`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function seedBibleIndexes(
  books: Book[],
  vaultRoot: string,
): Promise<{ created: string[]; skipped: string[] }> {
  const dir = join(vaultRoot, "notes", "bible");
  await mkdir(dir, { recursive: true });
  const created: string[] = [];
  const skipped: string[] = [];

  // Master Bible.md — content is independent of which books are imported in
  // this run (it's the canonical 66-book list), so seed it once and leave
  // any user edits alone on subsequent runs.
  const biblePath = join(dir, "Bible.md");
  const bibleLabel = "vault/notes/bible/Bible.md";
  if (await pathExists(biblePath)) {
    skipped.push(bibleLabel);
  } else {
    await writeFile(biblePath, renderBibleIndex());
    created.push(bibleLabel);
  }

  for (const book of books) {
    const filename = `${book.bookName}.md`;
    const target = join(dir, filename);
    const label = `vault/notes/bible/${filename}`;
    if (await pathExists(target)) {
      skipped.push(label);
      continue;
    }
    await writeFile(target, renderBookIndex(book));
    created.push(label);
  }

  return { created, skipped };
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

async function importBook(srcFile: string, outRoot: string, translation: string): Promise<Book> {
  const usfm = await readFile(srcFile, "utf-8");
  const tokens = tokenize(usfm);
  const book = parse(tokens);
  if (!book.bookCode) throw new Error(`No \\id marker found in ${srcFile}`);
  const bookDir = join(outRoot, book.pathCode);
  await mkdir(bookDir, { recursive: true });
  for (const chapter of book.chapters) {
    const chPad = String(chapter.number).padStart(2, "0");
    const md = renderChapter(book, chapter, translation);
    const json = renderStrongs(book, chapter, translation);
    await writeFile(join(bookDir, `${chPad}.md`), md);
    await writeFile(join(bookDir, `${chPad}_strongs.json`), json);
  }
  console.log(`✓ ${book.pathCode} (${book.chapters.length} chapters)`);
  return book;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      src: { type: "string" },
      out: { type: "string" },
      translation: { type: "string", default: "BSB" },
      only: { type: "string" },
    },
  });
  const src = values.src;
  const out = values.out;
  if (!src || !out) {
    console.error("Usage: npm run import -- --src <USFM dir> --out <vault/bible> [--translation BSB] [--only Gen,Psa]");
    process.exit(2);
  }
  const onlyFilter = values.only ? new Set(values.only.split(",").map((s) => s.trim())) : null;

  // Run vault setup before importing — first-run users get the per-user
  // CLAUDE.md and the bible-flow CSS snippet without a separate command.
  // `out` is the bible/ directory; the vault root is its parent.
  const vaultRoot = dirname(resolve(out));
  const { copied } = await runSetup(vaultRoot);
  for (const c of copied) console.log(`+ created ${c}`);

  const files = (await readdir(src)).filter((f) => f.endsWith(".usfm")).sort();
  const importedBooks: Book[] = [];
  for (const f of files) {
    // Filename like "02-GENengbsb.usfm"; pull the 3-letter code.
    const m = /^\d+-([A-Z0-9]{3})/i.exec(basename(f));
    const code = m?.[1]?.toUpperCase() ?? "";
    const pathCode = PATH_CODE[code];
    if (!pathCode) {
      console.warn(`[importer] skipping unrecognized filename ${f}`);
      continue;
    }
    if (onlyFilter && !onlyFilter.has(pathCode)) continue;
    const book = await importBook(join(src, f), out, values.translation ?? "BSB");
    importedBooks.push(book);
  }

  // Seed structural index notes (idempotent — skips files the user has
  // already created or edited).
  const { created: seeded } = await seedBibleIndexes(importedBooks, vaultRoot);
  for (const s of seeded) console.log(`+ seeded ${s}`);

  console.log(`Done: ${importedBooks.length} book${importedBooks.length === 1 ? "" : "s"}.`);
}

// Run the CLI only when this file is the script entry point. Imports from
// tests (or other tools) get the exports below without triggering main().
const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export {
  tokenize,
  parse,
  renderChapter,
  renderStrongs,
  linkifyRefs,
  toSuperscript,
  chapterNeighbors,
  navLine,
  renderBibleIndex,
  renderBookIndex,
};
export type { Token, Book, Chapter, Block, Segment, Inline, NavTarget };
