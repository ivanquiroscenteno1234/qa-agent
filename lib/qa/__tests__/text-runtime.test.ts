import { describe, it, expect } from "vitest";
import { expandedTerms, normalizeText } from "../text-runtime";

describe("normalizeText", () => {
  it("removes diacritics and converts to lowercase", () => {
    expect(normalizeText("Menú")).toBe("menu");
    expect(normalizeText("POSTRES")).toBe("postres");
    expect(normalizeText("Crème Brûlée")).toBe("creme brulee");
    expect(normalizeText("canción")).toBe("cancion");
  });

  it("trims and collapses whitespace", () => {
    expect(normalizeText("  hello   world  ")).toBe("hello world");
    expect(normalizeText("single  spaces")).toBe("single spaces");
  });

  it("handles edge case characters", () => {
    expect(normalizeText("CafÃ©")).toBe("cafe");
  });
});

describe("expandedTerms", () => {
  it("expands a string into its full string and tokens", () => {
    const terms = expandedTerms("chicken sandwich");
    expect(terms).toContain("chicken sandwich");
    expect(terms).toContain("chicken");
    expect(terms).toContain("sandwich");
  });

  it("filters out short tokens (<4 characters)", () => {
    const terms = expandedTerms("cat and dogs");
    // "cat" is 3 chars, "and" is a stopword and 3 chars. "dogs" is 4 chars.
    expect(terms).toContain("cat and dogs");
    expect(terms).toContain("dogs");
    expect(terms).not.toContain("cat");
  });

  it("filters out stop words", () => {
    const terms = expandedTerms("view the options menu");
    // "view", "the", "options" are in the stopword list
    expect(terms).toContain("view the options menu");
    expect(terms).toContain("menu");
    expect(terms).not.toContain("view");
    expect(terms).not.toContain("options");
  });

  it("expands synonyms from the synonym map", () => {
    const terms = expandedTerms("dashboard");
    expect(terms).toContain("dashboard");
    expect(terms).toContain("panel");
    expect(terms).toContain("home");
    expect(terms).toContain("inicio");
  });

  it("applies hardcoded logic for dessert", () => {
    const terms = expandedTerms("strawberry dessert");
    expect(terms).toContain("strawberry dessert");
    expect(terms).toContain("strawberry");
    expect(terms).toContain("dessert");
    // Explicitly added by the hardcoded rule
    expect(terms).toContain("postre");
    expect(terms).toContain("postres");
  });

  it("handles empty strings and strings with only special characters gracefully", () => {
    expect(expandedTerms("")).toEqual([""]);
    expect(expandedTerms("!!! ???")).toEqual(["!!! ???"]);
    expect(expandedTerms("   ")).toEqual([""]);
  });

  it("splits correctly on non-alphanumeric characters", () => {
    const terms = expandedTerms("hello/world-test");
    expect(terms).toContain("hello/world-test");
    expect(terms).toContain("hello");
    expect(terms).toContain("world");
    expect(terms).toContain("test");
  });
});
