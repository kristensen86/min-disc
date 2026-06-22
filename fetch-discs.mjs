// fetch-discs.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Henter alle discs fra discit-api.fly.dev og gemmer dem i public/discs.json.
// Kør manuelt:   node fetch-discs.mjs
// Køres også automatisk nattligt via GitHub Actions (.github/workflows/update-discs.yml).
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const API_URL = "https://discit-api.fly.dev/disc";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR  = join(__dirname, "public");
const OUT_FILE = join(OUT_DIR, "discs.json");

// Manual overrides for discs the API miscategorizes
const MANUAL_OVERRIDES = {
  "f9e72357-2714-53a1-8202-0dfb92d7630c": { type: "Putter" }, // Discraft Zone (API says Midrange, it's an approach disc)
};

// Mapper discit-api's category-felt til de fire typer Min Disc kender
function resolveType(category = "") {
  const c = category.toLowerCase();
  if (c.includes("putter") || c.includes("approach")) return "Putter";
  if (c.includes("midrange")) return "Midrange";
  if (c.includes("control") || c.includes("fairway") || c.includes("hybrid")) return "Fairway";
  return "Distance";
}

async function main() {
  console.log(`⬇  Henter discs fra ${API_URL} …`);

  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

  const raw = await res.json();
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("Tom eller ugyldig respons fra API");
  }

  const discs = raw
    .map((d) => ({
      id:        d.id,
      name:      d.name,
      brand:     d.brand,
      category:  d.category  ?? "",
      type:      MANUAL_OVERRIDES[d.id]?.type ?? resolveType(d.category),
      speed:     Number(d.speed),
      glide:     Number(d.glide),
      turn:      Number(d.turn),
      fade:      Number(d.fade),
      stability: d.stability ?? "",
      pic:       d.pic       ?? null,
      link:      d.link      ?? null,
    }))
    .sort((a, b) =>
      a.brand.localeCompare(b.brand, "da") || a.name.localeCompare(b.name, "da")
    );

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(discs, null, 2), "utf-8");

  const brands = new Set(discs.map((d) => d.brand)).size;
  console.log(`✓  ${discs.length} discs fra ${brands} mærker gemt → ${OUT_FILE}`);
}

main().catch((err) => {
  console.error("✗  Fejl:", err.message);
  process.exit(1);
});
