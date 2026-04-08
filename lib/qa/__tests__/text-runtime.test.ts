import { describe, expect, it } from "vitest";
import { expandedTerms, normalizeText, toRegex } from "../text-runtime";

describe("text-runtime", () => {
  describe("expandedTerms", () => {
    it("returns an array containing the normalized original string", () => {
      const result = expandedTerms("Hello World");
      expect(result).toContain("hello world");
    });

    it("filters out stopwords and words shorter than 4 characters", () => {
      const result = expandedTerms("the menu in view options");
      // "the", "in", "view", "options" are stopwords
      // "menu" is >= 4 chars and not a stopword
      expect(result).toContain("the menu in view options");
      expect(result).toContain("menu");
      expect(result).not.toContain("the");
      expect(result).not.toContain("in");
      expect(result).not.toContain("view");
      expect(result).not.toContain("options");
    });

    it("expands tokens using synonymMap", () => {
      const result = expandedTerms("dashboard");
      expect(result).toContain("dashboard");
      expect(result).toContain("panel");
      expect(result).toContain("home");
      expect(result).toContain("inicio");
    });

    it("includes custom hardcoded logic for dessert", () => {
      const result = expandedTerms("my dessert");
      // "my dessert" is normalized to "my dessert"
      // "my" is < 4 characters
      // "dessert" will be expanded via synonymMap AND the hardcoded dessert logic
      // Note: "sweet" and "sweet menu" come from synonymMap. The hardcoded logic only adds "postre" and "postres"
      expect(result).toContain("my dessert");
      expect(result).toContain("dessert");
      expect(result).toContain("postre");
      expect(result).toContain("postres");
    });

    it("normalizes text by removing accents before processing", () => {
      const result = expandedTerms("menú");
      // "menú" normalizes to "menu", which is a token >= 4 and has synonyms in the map
      expect(result).toContain("menu");
    });

    it("removes duplicate terms from expansions", () => {
      const result = expandedTerms("menu menu");
      expect(result).toHaveLength(2); // "menu menu", "menu"
      expect(result).toEqual(expect.arrayContaining(["menu menu", "menu"]));
    });
  });

  describe("normalizeText", () => {
    it("converts strings to lower case", () => {
      expect(normalizeText("HELLO WORLD")).toBe("hello world");
    });

    it("removes diacritics and accents", () => {
      expect(normalizeText("Café con leche y un pingüino")).toBe("cafe con leche y un pinguino");
      expect(normalizeText("áéíóúñÁÉÍÓÚÑ")).toBe("aeiounaeioun");
    });

    it("collapses multiple spaces into a single space and trims", () => {
      expect(normalizeText("  multiple   spaces   here  ")).toBe("multiple spaces here");
    });
  });

  describe("toRegex", () => {
    it("creates a regex from expanded terms", () => {
      const regex = toRegex("dashboard");
      expect(regex.test("dashboard")).toBe(true);
      expect(regex.test("panel")).toBe(true);
      expect(regex.test("home")).toBe(true);
      expect(regex.test("inicio")).toBe(true);
      expect(regex.test("random")).toBe(false);
    });

    it("escapes special characters correctly", () => {
      const regex = toRegex("c++ options.");
      expect(regex.test("c++ options.")).toBe(true);
    });
  });
});
