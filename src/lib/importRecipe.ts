import * as cheerio from "cheerio";
import { parseIngredientLines } from "./ingredients";
import type { Ingredient } from "./units";

export interface ImportedRecipe {
  title: string;
  description: string;
  imageUrl: string | null;
  sourceUrl: string;
  sourceName: string | null;
  servings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  ingredients: Ingredient[];
  steps: string[];
}

/* ---------- helpers ---------- */

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function firstString(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v)) {
    for (const item of v) {
      const s = firstString(item);
      if (s) return s;
    }
    return null;
  }
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return firstString(o.url ?? o["@id"] ?? o.name ?? o.text);
  }
  return null;
}

/** ISO-8601 duration ("PT1H30M") → minutes. */
function durationToMinutes(v: unknown): number | null {
  const s = firstString(v);
  if (!s) return null;
  const m = s.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return null;
  const [, d, h, min] = m;
  const total = (parseInt(d ?? "0") || 0) * 1440 + (parseInt(h ?? "0") || 0) * 60 + (parseInt(min ?? "0") || 0);
  return total > 0 ? total : null;
}

function yieldToServings(v: unknown): number {
  const s = firstString(v);
  if (typeof v === "number" && v > 0) return Math.round(v);
  if (s) {
    const m = s.match(/\d+/);
    if (m) {
      const n = parseInt(m[0], 10);
      if (n > 0 && n < 100) return n;
    }
  }
  return 4;
}

/** Decode HTML entities (named and numeric) and strip any embedded tags. */
function decodeEntities(s: string): string {
  if (!/[&<]/.test(s)) return s;
  return cheerio.load(`<div>${s}</div>`)("div").text();
}

function extractInstructions(v: unknown): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (node == null) return;
    if (typeof node === "string") {
      const t = decodeEntities(node).replace(/<[^>]*>/g, "").trim();
      if (t) out.push(t);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node === "object") {
      const o = node as Record<string, unknown>;
      const type = firstString(o["@type"]);
      if (type === "HowToSection") {
        walk(o.itemListElement);
        return;
      }
      const text = firstString(o.text) ?? firstString(o.name);
      if (text) {
        out.push(decodeEntities(text).replace(/<[^>]*>/g, "").trim());
      } else {
        walk(o.itemListElement);
      }
    }
  };
  walk(v);
  return out.filter(Boolean);
}

function isRecipeNode(node: unknown): node is Record<string, unknown> {
  if (!node || typeof node !== "object") return false;
  const t = (node as Record<string, unknown>)["@type"];
  const types = asArray(t).map((x) => String(x).toLowerCase());
  return types.includes("recipe");
}

/** Walk arbitrary JSON-LD (including @graph) looking for a Recipe node. */
function findRecipeNode(data: unknown): Record<string, unknown> | null {
  if (data == null) return null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof data === "object") {
    if (isRecipeNode(data)) return data as Record<string, unknown>;
    const o = data as Record<string, unknown>;
    for (const key of ["@graph", "mainEntity", "mainEntityOfPage", "itemListElement"]) {
      if (o[key]) {
        const found = findRecipeNode(o[key]);
        if (found) return found;
      }
    }
  }
  return null;
}

/* ---------- main ---------- */

export async function importRecipeFromUrl(url: string): Promise<ImportedRecipe> {
  const parsed = new URL(url); // throws on invalid URL
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error("Only http(s) URLs are supported.");
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 MiseRecipeImporter/1.0",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`The site responded with ${res.status}. Try copying the recipe in manually.`);
  const html = await res.text();
  const $ = cheerio.load(html);

  // 1) JSON-LD (covers the vast majority of recipe sites).
  let recipeNode: Record<string, unknown> | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (recipeNode) return;
    const raw = $(el).contents().text();
    if (!raw) return;
    try {
      recipeNode = findRecipeNode(JSON.parse(raw));
    } catch {
      // Some sites ship slightly invalid JSON; try a gentle cleanup.
      try {
        recipeNode = findRecipeNode(JSON.parse(raw.replace(/[\u0000-\u001F]+/g, " ")));
      } catch {
        /* ignore this block */
      }
    }
  });

  if (recipeNode) {
    const node = recipeNode as Record<string, unknown>;
    const ingredientLines = asArray(node.recipeIngredient ?? node.ingredients)
      .map((x) => decodeEntities(String(x)))
      .filter(Boolean);
    const title = firstString(node.name) ?? $("title").text().trim() ?? "Imported recipe";
    return {
      title: decodeEntities(title),
      description: decodeEntities(firstString(node.description) ?? ""),
      imageUrl: firstString(node.image),
      sourceUrl: url,
      sourceName: firstString((node.publisher as Record<string, unknown> | undefined)?.name) ?? parsed.hostname.replace(/^www\./, ""),
      servings: yieldToServings(node.recipeYield ?? node.yield),
      prepMinutes: durationToMinutes(node.prepTime),
      cookMinutes: durationToMinutes(node.cookTime) ?? durationToMinutes(node.totalTime),
      ingredients: parseIngredientLines(ingredientLines),
      steps: extractInstructions(node.recipeInstructions),
    };
  }

  // 2) Microdata fallback (itemprop attributes).
  const ingredientLines = $('[itemprop="recipeIngredient"], [itemprop="ingredients"]')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  if (ingredientLines.length > 0) {
    const steps = $('[itemprop="recipeInstructions"]')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean);
    return {
      title: $('[itemprop="name"]').first().text().trim() || $("title").text().trim() || "Imported recipe",
      description: $('[itemprop="description"]').first().text().trim(),
      imageUrl: $('[itemprop="image"]').first().attr("src") ?? null,
      sourceUrl: url,
      sourceName: parsed.hostname.replace(/^www\./, ""),
      servings: yieldToServings($('[itemprop="recipeYield"]').first().text()),
      prepMinutes: null,
      cookMinutes: null,
      ingredients: parseIngredientLines(ingredientLines),
      steps,
    };
  }

  throw new Error(
    "Couldn't find structured recipe data on that page. You can still add it manually — paste the ingredients into the recipe editor.",
  );
}
