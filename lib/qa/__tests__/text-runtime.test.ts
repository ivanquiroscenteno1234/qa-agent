import { describe, it, expect } from "vitest";
import {
  normalizeText,
  cleanLabel,
  selectDiscoveryLabels,
  expandedTerms,
  toRegex
} from "../text-runtime";

describe("normalizeText", () => {
  it("should convert to lowercase, trim, and collapse spaces", () => {
    expect(normalizeText("  Hello   World  ")).toBe("hello world");
    expect(normalizeText("\tTabbed\nText ")).toBe("tabbed text");
  });

  it("should remove diacritics", () => {
    expect(normalizeText("Menú")).toBe("menu");
    expect(normalizeText("Café")).toBe("cafe");
    expect(normalizeText("jalapeño")).toBe("jalapeno");
    expect(normalizeText("MÄßig")).toBe("maßig"); // ß usually doesn't decompose, ä does
  });

  it("should replace specific mojibake characters", () => {
    expect(normalizeText("Ã¡")).toBe("a");
    expect(normalizeText("Ã©")).toBe("e");
    expect(normalizeText("Ã­")).toBe("i");
    expect(normalizeText("Ã³")).toBe("o");
    expect(normalizeText("Ãº")).toBe("u");
    expect(normalizeText("Ã±")).toBe("n");
    expect(normalizeText("Ã")).toBe("a");
  });

  it("should handle edge cases", () => {
    expect(normalizeText("")).toBe("");
    expect(normalizeText("   ")).toBe("");
    expect(normalizeText("\n")).toBe("");
  });
});

describe("cleanLabel", () => {
  it("should collapse spaces and trim", () => {
    expect(cleanLabel("  Extra   Spaces  ")).toBe("Extra Spaces");
    expect(cleanLabel("\tNew\nLine\t")).toBe("New Line");
  });

  it("should handle empty strings", () => {
    expect(cleanLabel("")).toBe("");
    expect(cleanLabel("   ")).toBe("");
  });
});

describe("selectDiscoveryLabels", () => {
  it("should filter, score, and limit labels", () => {
    const labels = [
      "menu", // high score
      "123", // ignored (only digits)
      "cancel", // ignored (stopword/cancel)
      "dashboard", // score > 0
      "a", // low score, length < 3 -> ignored
      "sucursales", // penalty
      "perfil" // high score
    ];

    const selected = selectDiscoveryLabels(labels, 3);

    expect(selected.length).toBeLessThanOrEqual(3);
    expect(selected).toContain("menu");
    expect(selected).toContain("perfil");
    expect(selected).toContain("dashboard");
    expect(selected).not.toContain("123");
    expect(selected).not.toContain("cancel");
  });

  it("should sort correctly with same scores but different lengths or alphabetical", () => {
    const labels = ["config", "pedido", "combo", "promo"];
    // They will all have the same score (+6 keywords, +4 alpha, +3 length) -> +13
    const selected = selectDiscoveryLabels(labels, 4);
    // Sorts by right.score - left.score, then localeCompare
    expect(selected).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
  });
});

describe("expandedTerms", () => {
  it("should tokenize and remove stopwords", () => {
    const terms = expandedTerms("the menu options");
    expect(terms).toContain("menu");
    expect(terms).not.toContain("the");
    expect(terms).not.toContain("options");
  });

  it("should add synonyms", () => {
    const terms = expandedTerms("dashboard");
    expect(terms).toContain("dashboard");
    expect(terms).toContain("panel");
    expect(terms).toContain("home");
    expect(terms).toContain("inicio");
  });

  it("should add dessert specific expansions", () => {
    const terms = expandedTerms("sweet dessert");
    expect(terms).toContain("postre");
    expect(terms).toContain("postres");
    expect(terms).toContain("dessert");
  });

  it("should handle an empty string", () => {
     const terms = expandedTerms("");
     expect(terms).toEqual([""]);
  });
});

describe("toRegex", () => {
  it("should create a regex matching expanded terms and escape special characters", () => {
    const regex = toRegex("menu (test)");
    expect(regex.test("menu test")).toBe(true);
    expect(regex.test("test")).toBe(true);

    const specialRegex = toRegex("cost $100");
    // "cost $100" normalizes to "cost 100".
    // tokens: >= 4 chars, so "cost" is kept, "100" is discarded (length < 4).
    // expansions: ["cost 100", "cost"]
    // regex: /cost\ 100|cost/i

    expect(specialRegex.test("cost 100")).toBe(true);
    expect(specialRegex.test("cost")).toBe(true);
  });
});
