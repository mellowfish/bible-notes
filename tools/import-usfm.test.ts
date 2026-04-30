// Regression tests for the USFM importer. Each test exercises a specific
// shape we have already had to debug; if any of them go red, the symptom
// usually maps directly to the named bug.

import { describe, it, expect } from "vitest";
import {
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
} from "./import-usfm.ts";

// Minimal book wrapper: every fixture starts with the metadata header USFM
// expects (\id / \h / \toc1 / \mt1 / \c 1) so parser invariants hold.
function fixtureHeader(code: string, name: string): string {
  return [
    `\\id ${code} - Berean Standard Bible`,
    `\\h ${name}`,
    `\\toc1 ${name}`,
    `\\toc2 ${name}`,
    `\\mt1 ${name}`,
    `\\c 1`,
  ].join("\n");
}

function buildBook(usfm: string) {
  const tokens = tokenize(usfm);
  return parse(tokens);
}

function buildChapter(usfm: string) {
  const book = buildBook(usfm);
  const chapter = book.chapters[0];
  if (!chapter) throw new Error("fixture has no chapter");
  return { book, chapter };
}

function render(usfm: string): string {
  const { book, chapter } = buildChapter(usfm);
  return renderChapter(book, chapter, "BSB");
}

describe("toSuperscript", () => {
  it("maps single digits", () => {
    expect(toSuperscript(1)).toBe("¹");
    expect(toSuperscript(5)).toBe("⁵");
  });
  it("maps multi-digit numbers (e.g. Psa 119)", () => {
    expect(toSuperscript(119)).toBe("¹¹⁹");
    expect(toSuperscript(176)).toBe("¹⁷⁶");
  });
});

describe("tokenize", () => {
  it("captures \\w word + Strong's attribute", () => {
    const tokens = tokenize(`${fixtureHeader("GEN", "Genesis")}
\\m
\\v 1 \\w In|strong="H8064"\\w*.`);
    const wordToken = tokens.find((t) => t.t === "w");
    expect(wordToken).toEqual({ t: "w", word: "In", strong: "H8064" });
  });

  it("treats \\b as a paragraph separator token", () => {
    const tokens = tokenize(`${fixtureHeader("GEN", "Genesis")}
\\m
\\v 1 word.
\\b
\\m
\\v 2 word.`);
    expect(tokens.filter((t) => t.t === "b")).toHaveLength(1);
  });

  it("captures \\f footnote bodies as raw strings", () => {
    const tokens = tokenize(`${fixtureHeader("GEN", "Genesis")}
\\m
\\v 1 word\\f + \\fr 1:1 \\ft Cited in 2 Corinthians 4:6\\f*.`);
    const fn = tokens.find((t) => t.t === "f");
    expect(fn).toBeDefined();
    if (fn?.t === "f") expect(fn.raw).toContain("Cited in 2 Corinthians 4:6");
  });
});

describe("linkifyRefs", () => {
  it("wraps a plain Genesis ref", () => {
    expect(linkifyRefs("Genesis 2:24")).toBe("[[bible/Gen/02#^v24|Genesis 2:24]]");
  });

  it("handles numeric-prefixed books (1 Corinthians)", () => {
    expect(linkifyRefs("1 Corinthians 15:45")).toBe(
      "[[bible/1Co/15#^v45|1 Corinthians 15:45]]",
    );
  });

  it("treats Psalm and Psalms as the same path code", () => {
    expect(linkifyRefs("Psalm 23")).toBe("[[bible/Psa/23|Psalm 23]]");
    expect(linkifyRefs("Psalms 23:1")).toBe("[[bible/Psa/23#^v1|Psalms 23:1]]");
  });

  it("links the start verse for a range, keeping the range in display", () => {
    expect(linkifyRefs("Hebrews 4:1–11")).toBe(
      "[[bible/Heb/04#^v1|Hebrews 4:1–11]]",
    );
  });

  it("links multiple refs in one sentence", () => {
    const out = linkifyRefs("Cited in Matthew 19:4 and Mark 10:6");
    expect(out).toContain("[[bible/Mat/19#^v4|Matthew 19:4]]");
    expect(out).toContain("[[bible/Mrk/10#^v6|Mark 10:6]]");
  });

  it("leaves unrecognized strings alone", () => {
    expect(linkifyRefs("written by Tertullian, c. AD 200")).toBe(
      "written by Tertullian, c. AD 200",
    );
  });
});

describe("renderChapter — multi-paragraph verse", () => {
  // Gen 1:5 is the canonical case: \v 5 ... \b \pmo And there was evening...
  // The verse-number marker must land on the FIRST paragraph; the `^v5`
  // block-ref must land on the LAST paragraph.
  const fixture = `${fixtureHeader("GEN", "Genesis")}
\\s1 The First Day
\\m
\\v 5 God called the light "day," and the darkness He called "night."
\\b
\\pmo And there was evening, and there was morning—the first day.`;

  it("places the verse-number marker on the first paragraph", () => {
    const md = render(fixture);
    const lines = md.split("\n");
    const firstVerseLine = lines.find((l) => l.startsWith("**⁵**"));
    expect(firstVerseLine).toContain('God called the light "day,"');
  });

  it("places the ^v5 anchor on the last paragraph, not the first", () => {
    const md = render(fixture);
    const lines = md.split("\n");
    const evening = lines.find((l) => l.includes("And there was evening"));
    expect(evening).toContain("^v5");
    const firstVerseLine = lines.find((l) => l.startsWith("**⁵**"));
    expect(firstVerseLine).not.toContain("^v5");
  });
});

describe("renderChapter — phantom whitespace segments (regression)", () => {
  // Pre-fix bug: whitespace between block markers (\b ... \m) was being
  // attached as a phantom segment under the previous verse, dragging that
  // verse's `^vN` anchor into the next paragraph.
  it("never lands ^v1 inside verse 2's paragraph", () => {
    const md = render(`${fixtureHeader("GEN", "Genesis")}
\\s1 The Creation
\\m
\\v 1 In the beginning God created the heavens and the earth.
\\b
\\m
\\v 2 Now the earth was formless and void.`);
    const lines = md.split("\n");
    const verse2Line = lines.find((l) => l.includes("Now the earth"));
    expect(verse2Line).toBeDefined();
    expect(verse2Line).not.toMatch(/\^v1/);
    const verse1Line = lines.find((l) => l.startsWith("**¹**"));
    expect(verse1Line).toContain("^v1");
  });
});

describe("renderChapter — footnote tightness (regression)", () => {
  it("collapses the BSB-spec separator space before \\f", () => {
    const md = render(`${fixtureHeader("GEN", "Genesis")}
\\m
\\v 3 And God said, "Let there be light,"\\f + \\fr 1:3 \\ft Cited in 2 Corinthians 4:6\\f* and there was light.`);
    // Footnote pin should sit tight against the closing quote/comma.
    expect(md).toContain('"Let there be light,"[^1] and there was light. ^v3');
    // The body is rendered at the bottom, with the bible ref linkified.
    expect(md).toContain("[^1]: Cited in [[bible/2Co/04#^v6|2 Corinthians 4:6]]");
  });
});

describe("renderChapter — omitted verses (BSB critical-text choice)", () => {
  // Mat 17:21 is omitted entirely in BSB (relegated to a footnote at v20).
  // Our parser must accept the gap without throwing, and emit no `^v21`.
  it("does not throw when source skips a verse number", () => {
    expect(() =>
      render(`${fixtureHeader("MAT", "Matthew")}
\\m
\\v 20 He answered.
\\v 22 When they gathered.`),
    ).not.toThrow();
  });

  it("does not emit ^v21 for an omitted verse", () => {
    const md = render(`${fixtureHeader("MAT", "Matthew")}
\\m
\\v 20 He answered.
\\v 22 When they gathered.`);
    expect(md).toContain("^v20");
    expect(md).toContain("^v22");
    expect(md).not.toContain("^v21");
  });

  it("frontmatter total_verses still tracks the highest verse seen", () => {
    const md = render(`${fixtureHeader("MAT", "Matthew")}
\\m
\\v 20 a.
\\v 22 b.`);
    expect(md).toMatch(/^total_verses: 22$/m);
  });
});

describe("renderChapter — poetry blockquote nesting (Psa 23 pattern)", () => {
  it("wraps q1 in `> ` and q2 in `>> `", () => {
    const md = render(`${fixtureHeader("PSA", "Psalms")}
\\d A Psalm of David.
\\q1
\\v 1 The LORD is my shepherd;
\\q2 I shall not want.`);
    expect(md).toContain("> **¹** The LORD is my shepherd;");
    expect(md).toContain(">> I shall not want. ^v1");
  });

  it("renders \\d superscriptions as italic, not as a verse", () => {
    const md = render(`${fixtureHeader("PSA", "Psalms")}
\\d A Psalm of David.
\\q1
\\v 1 The LORD is my shepherd.`);
    expect(md).toContain("*A Psalm of David.*");
  });
});

describe("renderChapter — acrostic letters (Psa 119, D15)", () => {
  it("renders \\qa as a level-4 heading on its own line", () => {
    const md = render(`${fixtureHeader("PSA", "Psalms")}
\\s1 Your Word Is a Lamp
\\qa ALEPH
\\q1
\\v 1 Blessed are those whose way is blameless,
\\q2 who walk in the Law of the LORD.
\\b
\\qa BETH
\\b
\\q1
\\v 2 How can a young man keep his way pure?`);
    expect(md).toContain("#### ALEPH");
    expect(md).toContain("#### BETH");
    // Per D15: no longer emitted as bold — the CSS selector that targeted
    // bold-only paragraphs over-matched verses.
    expect(md).not.toMatch(/\n\*\*ALEPH\*\*\n/);
  });
});

describe("renderChapter — \\r parallel-passage refs", () => {
  it("emits a See-also line with linkified semicolon-separated refs", () => {
    const md = render(`${fixtureHeader("GEN", "Genesis")}
\\s1 The Creation
\\r (John 1:1–5; Hebrews 11:1–3)
\\m
\\v 1 In the beginning.`);
    expect(md).toContain(
      "*See also: [[bible/Jhn/01#^v1|John 1:1–5]] · [[bible/Heb/11#^v1|Hebrews 11:1–3]]*",
    );
  });
});

describe("renderChapter — frontmatter shape", () => {
  it("includes cssclasses bible-flow for snippet scoping", () => {
    const md = render(`${fixtureHeader("GEN", "Genesis")}
\\m
\\v 1 word.`);
    expect(md).toContain("cssclasses:\n  - bible-flow");
  });

  it("uses 'Psalm' (singular) in the chapter title for Psa", () => {
    const md = render(`${fixtureHeader("PSA", "Psalms")}
\\m
\\v 1 word.`);
    expect(md).toContain("# Psalm 1");
    // Frontmatter still uses the canonical book name.
    expect(md).toMatch(/^book_name: Psalms$/m);
  });
});

describe("renderStrongs — sidecar JSON shape", () => {
  it("aligns word-indexes with the rendered verse, including untagged words", () => {
    // BSB leaves some words without a Strong's tag (e.g., 'separated' in
    // Gen 1:4). Per D11.1, those still appear with s:null so positions match.
    const { book, chapter } = buildChapter(`${fixtureHeader("GEN", "Genesis")}
\\m
\\v 4 \\w And|strong="H7200"\\w* God \\w saw|strong="H7200"\\w* the light.`);
    const json = JSON.parse(renderStrongs(book, chapter, "BSB")) as {
      verses: Record<string, Array<{ w: string; s: string | null }>>;
    };
    const v4 = json.verses["4"]!;
    expect(v4.map((e) => e.w)).toEqual(["And", "God", "saw", "the", "light"]);
    expect(v4.map((e) => e.s)).toEqual(["H7200", null, "H7200", null, null]);
  });

  it("captures Greek Strong's prefixes (G…) for NT books", () => {
    const { book, chapter } = buildChapter(`${fixtureHeader("EPH", "Ephesians")}
\\m
\\v 1 \\w Be|strong="G1096"\\w* \\w imitators|strong="G3402"\\w* \\w of|strong="G2316"\\w* \\w God|strong="G2316"\\w*.`);
    const json = JSON.parse(renderStrongs(book, chapter, "BSB")) as {
      verses: Record<string, Array<{ w: string; s: string | null }>>;
    };
    expect(json.verses["1"]!.every((e) => e.s?.startsWith("G"))).toBe(true);
  });
});

describe("renderChapter — \\it inline italics", () => {
  it("renders \\it word\\it* as *word*, not _word_", () => {
    const md = render(`${fixtureHeader("GEN", "Genesis")}
\\m
\\v 1 He said, \\it surely\\it* it is so.`);
    expect(md).toContain("He said, *surely* it is so.");
    expect(md).not.toContain("_surely_");
  });
});

describe("renderChapter — per-verse paragraphs (D11.4 / D14)", () => {
  // Pre-D14 bug: the renderer emitted one markdown paragraph per USFM \m,
  // so multi-verse USFM paragraphs (Eph 5:22–24 in one \m) shared a markdown
  // paragraph. Obsidian only honors one block-id per paragraph, so #^v22 and
  // #^v23 links into such a paragraph couldn't navigate. Each verse must be
  // its own markdown paragraph.
  it("splits a multi-verse USFM paragraph into one markdown paragraph per verse", () => {
    const md = render(`${fixtureHeader("EPH", "Ephesians")}
\\m
\\v 22 Wives, submit to your husbands.
\\v 23 For the husband is the head of the wife.
\\v 24 Now as the church submits to Christ.`);
    // Each verse ends its own paragraph with its own block-ref.
    expect(md).toContain("**²²** Wives, submit to your husbands. ^v22");
    expect(md).toContain("**²³** For the husband is the head of the wife. ^v23");
    expect(md).toContain("**²⁴** Now as the church submits to Christ. ^v24");
    // Paragraphs are blank-line separated in source.
    expect(md).toMatch(/\^v22\n\n\*\*²³\*\*/);
    expect(md).toMatch(/\^v23\n\n\*\*²⁴\*\*/);
  });

  it("never emits two block-refs on the same line", () => {
    const md = render(`${fixtureHeader("EPH", "Ephesians")}
\\m
\\v 1 First verse.
\\v 2 Second verse.
\\v 3 Third verse.`);
    for (const line of md.split("\n")) {
      const refCount = (line.match(/\^v\d+/g) ?? []).length;
      expect(refCount, `line had multiple block-refs: ${line}`).toBeLessThanOrEqual(1);
    }
  });
});

describe("chapterNeighbors — boundaries across the 66-book canon", () => {
  it("Gen 1 has no prev (canon start) and Gen 2 as next", () => {
    expect(chapterNeighbors("GEN", 1)).toEqual({
      prev: null,
      next: { bookCode: "GEN", chapter: 2 },
    });
  });

  it("Gen 50 jumps to Exo 1 across the book boundary", () => {
    expect(chapterNeighbors("GEN", 50)).toEqual({
      prev: { bookCode: "GEN", chapter: 49 },
      next: { bookCode: "EXO", chapter: 1 },
    });
  });

  it("Mal 4 jumps to Mat 1 (OT → NT)", () => {
    expect(chapterNeighbors("MAL", 4)).toEqual({
      prev: { bookCode: "MAL", chapter: 3 },
      next: { bookCode: "MAT", chapter: 1 },
    });
  });

  it("Rev 22 has no next (canon end)", () => {
    expect(chapterNeighbors("REV", 22)).toEqual({
      prev: { bookCode: "REV", chapter: 21 },
      next: null,
    });
  });

  it("single-chapter Obadiah connects Amos 9 ↔ Jonah 1", () => {
    expect(chapterNeighbors("OBA", 1)).toEqual({
      prev: { bookCode: "AMO", chapter: 9 },
      next: { bookCode: "JON", chapter: 1 },
    });
  });

  it("single-chapter Jude connects 3 John 1 ↔ Rev 1", () => {
    expect(chapterNeighbors("JUD", 1)).toEqual({
      prev: { bookCode: "3JN", chapter: 1 },
      next: { bookCode: "REV", chapter: 1 },
    });
  });
});

describe("navLine — formatting", () => {
  it("emits arrows inside the link text and a · separator", () => {
    expect(navLine("GEN", 50)).toBe(
      "[[bible/Gen/49|← Genesis 49]] · [[bible/Exo/01|Exodus 1 →]]",
    );
  });

  it("uses singular 'Psalm' in display for Psalms (matches chapter H1)", () => {
    expect(navLine("PSA", 23)).toBe(
      "[[bible/Psa/22|← Psalm 22]] · [[bible/Psa/24|Psalm 24 →]]",
    );
  });

  it("renders only the next link at the canon start (Gen 1)", () => {
    expect(navLine("GEN", 1)).toBe("[[bible/Gen/02|Genesis 2 →]]");
  });

  it("renders only the prev link at the canon end (Rev 22)", () => {
    expect(navLine("REV", 22)).toBe("[[bible/Rev/21|← Revelation 21]]");
  });
});

describe("renderChapter — chapter nav line", () => {
  it("appears under the H1 and again after the footnotes block", () => {
    const md = render(`${fixtureHeader("GEN", "Genesis")}
\\m
\\v 1 In the beginning God created the heavens and the earth.\\f + \\fr 1:1 \\ft Note text.\\f*`);
    const expected = "[[bible/Gen/02|Genesis 2 →]]";
    // Top: between H1 and the first content block.
    expect(md).toMatch(new RegExp(`# Genesis 1\\n\\n${escapeRegex(expected)}\\n\\n`));
    // Bottom: after the [^1]: footnote definition.
    expect(md).toMatch(new RegExp(`\\[\\^1\\]: Note text\\.\\n\\n${escapeRegex(expected)}\\n`));
  });

  it("renders prev-only at the canon end (Rev 22)", () => {
    // fixtureHeader injects `\c 1`; we add `\c 22` so the parsed book has
    // chapters [1 (empty), 22]. Render the last one explicitly.
    const book = buildBook(`${fixtureHeader("REV", "Revelation")}
\\c 22
\\m
\\v 1 Then the angel showed me a river.`);
    const ch22 = book.chapters[book.chapters.length - 1]!;
    const md = renderChapter(book, ch22, "BSB");
    expect(md).toContain("[[bible/Rev/21|← Revelation 21]]");
    expect(md).not.toContain("Revelation 23");
  });
});

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("renderBibleIndex — master Bible.md seed", () => {
  const md = renderBibleIndex();

  it("opens with the H1 and the OT/NT split", () => {
    expect(md.startsWith("# Bible\n\n## Old Testament\n\n")).toBe(true);
    expect(md).toContain("\n\n## New Testament\n\n");
  });

  it("lists 39 OT books then 27 NT books, in order, as full-path wikilinks (per D27)", () => {
    const lines = md.split("\n");
    const otStart = lines.indexOf("## Old Testament") + 2;
    const ntHeader = lines.indexOf("## New Testament");
    const otBooks = lines.slice(otStart, ntHeader).filter((l) => l.startsWith("- "));
    const ntBooks = lines.slice(ntHeader + 2).filter((l) => l.startsWith("- "));
    expect(otBooks).toHaveLength(39);
    expect(ntBooks).toHaveLength(27);
    expect(otBooks[0]).toBe("- [[notes/bible/Genesis|Genesis]]");
    expect(otBooks[otBooks.length - 1]).toBe("- [[notes/bible/Malachi|Malachi]]");
    expect(ntBooks[0]).toBe("- [[notes/bible/Matthew|Matthew]]");
    expect(ntBooks[ntBooks.length - 1]).toBe("- [[notes/bible/Revelation|Revelation]]");
  });
});

describe("renderBookIndex — per-book {Book}.md seed", () => {
  it("emits H1 + chapter list with verse-range labels and file-level links", () => {
    const { book } = buildChapter(`${fixtureHeader("GEN", "Genesis")}
\\m
\\v 1 First.
\\v 31 Last.`);
    const md = renderBookIndex(book);
    expect(md.startsWith("# Genesis\n\n")).toBe(true);
    // Link target is the chapter file, not `^v1` — display carries the range.
    expect(md).toContain("- [[bible/Gen/01|Genesis 1:1–31]]\n");
  });

  it("uses singular 'Psalm' in chapter labels for Psalms", () => {
    const { book } = buildChapter(`${fixtureHeader("PSA", "Psalms")}
\\m
\\v 1 First.
\\v 6 Last.`);
    const md = renderBookIndex(book);
    expect(md.startsWith("# Psalms\n\n")).toBe(true);
    expect(md).toContain("- [[bible/Psa/01|Psalm 1:1–6]]\n");
  });
});

describe("renderChapter — paragraph-type comments dropped (D14)", () => {
  it("never emits the legacy <!-- p:* --> markers", () => {
    const md = render(`${fixtureHeader("GEN", "Genesis")}
\\s1 Heading
\\m
\\v 1 First.
\\b
\\pmo
\\v 2 Second.
\\q1
\\v 3 Third.`);
    expect(md).not.toContain("<!-- p:");
  });
});
