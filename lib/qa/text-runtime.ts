const synonymMap: Record<string, string[]> = {
  menu: ["menu", "menú"],
  desserts: ["dessert", "desserts", "postre", "postres", "sweet", "sweet menu"],
  dashboard: ["dashboard", "panel", "home", "inicio"]
};

const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "into",
  "your",
  "view",
  "left",
  "side",
  "options",
  "option",
  "in",
  "de",
  "la",
  "el",
  "los",
  "las",
  "para",
  "con",
  "del",
  "menu view"
]);

// ⚡ Bolt: Cache normalized text to prevent redundant expensive regex string replacements and Unicode normalization
const normalizeTextCache = new Map<string, string>();

export function normalizeText(value: string): string {
  const cached = normalizeTextCache.get(value);
  if (cached !== undefined) {
    return cached;
  }

  const normalized = value
    .replace(/Ã¡/g, "a")
    .replace(/Ã©/g, "e")
    .replace(/Ã­/g, "i")
    .replace(/Ã³/g, "o")
    .replace(/Ãº/g, "u")
    .replace(/Ã±/g, "n")
    .replace(/Ã/g, "a")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  if (normalizeTextCache.size > 10000) {
    normalizeTextCache.clear();
  }
  normalizeTextCache.set(value, normalized);
  return normalized;
}

export function cleanLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isIgnoredDiscoveryLabel(value: string): boolean {
  const normalized = normalizeText(value);

  return (
    !normalized ||
    normalized.length < 3 ||
    /^\d+$/.test(normalized) ||
    /^(aceptar|accept|cancelar|cancel|cerrar|close|ok|si|no|next|back)$/.test(normalized) ||
    /(logout|log out|sign out|cerrar sesion|cerrar sesión)/.test(normalized)
  );
}

function scoreDiscoveryLabel(value: string): number {
  const normalized = normalizeText(value);

  if (isIgnoredDiscoveryLabel(normalized)) {
    return -100;
  }

  let score = 0;

  if (/[a-z]/i.test(value)) {
    score += 4;
  }

  if (normalized.length >= 4 && normalized.length <= 24) {
    score += 3;
  }

  if (/menu|men[uú]|inventario|config|pedido|combo|promo|chat|panel|perfil/.test(normalized)) {
    score += 6;
  }

  if (/todas las sucursales|sucursales/.test(normalized)) {
    score -= 2;
  }

  if (/\d/.test(normalized)) {
    score -= 1;
  }

  return score;
}

export function selectDiscoveryLabels(values: string[], limit: number): string[] {
  return Array.from(new Set(values.map((value) => cleanLabel(value)).filter(Boolean)))
    .map((value) => ({ value, score: scoreDiscoveryLabel(value) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.value.localeCompare(right.value))
    .slice(0, limit)
    .map((item) => item.value);
}

export function expandedTerms(value: string): string[] {
  const normalized = normalizeText(value);
  const tokens = normalized
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !stopWords.has(token));
  const expansions = new Set<string>([normalized, ...tokens]);

  for (const token of tokens) {
    const synonyms = synonymMap[token];
    if (synonyms) {
      for (const synonym of synonyms) {
        expansions.add(normalizeText(synonym));
      }
    }
  }

  if (normalized.includes("dessert")) {
    expansions.add("postre");
    expansions.add("postres");
  }

  return Array.from(expansions);
}

export function toRegex(value: string): RegExp {
  const alternatives = expandedTerms(value)
    .filter(Boolean)
    .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(alternatives.join("|"), "i");
}