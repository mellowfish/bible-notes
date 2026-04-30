// Regression tests for the M'Cheyne plan importer's passage-parser. Each test
// pins one shape from the source XLSX so a future regression maps directly to
// the named edge case.

import { describe, it, expect } from "vitest";
import { parsePassage } from "./import-mcheyne.ts";

describe("parsePassage", () => {
  it("single chapter", () => {
    expect(parsePassage("Gn 1")).toBe("[[bible/Gen/01\\|Genesis 1]]");
    expect(parsePassage("Mt 28")).toBe("[[bible/Mat/28\\|Matthew 28]]");
  });

  it("zero-pads chapter to 2 digits", () => {
    expect(parsePassage("Ps 9")).toBe("[[bible/Psa/09\\|Psalm 9]]");
    expect(parsePassage("Ps 119")).toBe("[[bible/Psa/119\\|Psalm 119]]");
  });

  it("Psalms display as singular Psalm for citations", () => {
    expect(parsePassage("Ps 23")).toBe("[[bible/Psa/23\\|Psalm 23]]");
  });

  it("chapter range — link first chapter, en-dash range in display", () => {
    expect(parsePassage("Gn 9-10")).toBe("[[bible/Gen/09\\|Genesis 9–10]]");
    expect(parsePassage("Ps 132-134")).toBe("[[bible/Psa/132\\|Psalm 132–134]]");
  });

  it("verse range within chapter — verse anchor on start", () => {
    expect(parsePassage("Lk 1:1-38")).toBe("[[bible/Luk/01#^v1\\|Luke 1:1–38]]");
    expect(parsePassage("Ps 119:1-24")).toBe("[[bible/Psa/119#^v1\\|Psalm 119:1–24]]");
  });

  it("cross-chapter verse range — link to start verse", () => {
    expect(parsePassage("Ex 11:1-12:21")).toBe(
      "[[bible/Exo/11#^v1\\|Exodus 11:1–12:21]]",
    );
    expect(parsePassage("Jsh 5:1-6:5")).toBe(
      "[[bible/Jos/05#^v1\\|Joshua 5:1–6:5]]",
    );
  });

  it("single-chapter book without chapter number", () => {
    expect(parsePassage("Jude")).toBe("[[bible/Jud/01\\|Jude]]");
    expect(parsePassage("Obadiah")).toBe("[[bible/Oba/01\\|Obadiah]]");
    expect(parsePassage("Philemon")).toBe("[[bible/Phm/01\\|Philemon]]");
  });

  it("single-chapter book with explicit chapter '1' — display omits redundant chapter", () => {
    expect(parsePassage("2Jn 1")).toBe("[[bible/2Jn/01\\|2 John]]");
    expect(parsePassage("3 Jn 1")).toBe("[[bible/3Jn/01\\|3 John]]");
  });

  it("comma-separated non-contiguous chapters — two links", () => {
    expect(parsePassage("Jer 36,45")).toBe(
      "[[bible/Jer/36\\|Jeremiah 36]], [[bible/Jer/45\\|Jeremiah 45]]",
    );
  });

  it("trims leading/trailing whitespace from input", () => {
    expect(parsePassage("  Mt 1  ")).toBe("[[bible/Mat/01\\|Matthew 1]]");
  });

  it("throws on unknown book key", () => {
    expect(() => parsePassage("Foo 1")).toThrow(/Unknown book key/);
  });

  it("throws on empty input", () => {
    expect(() => parsePassage("")).toThrow(/Empty passage/);
  });
});
