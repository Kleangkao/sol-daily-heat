/**
 * Resize + WebP compress beach backdrop props for public/beach/.
 * Run: node scripts/optimize-beach-assets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const BEACH_DIR = path.resolve("public/beach");
const SOURCE_DIR =
  "f:/Work/Star Atlas/Post general/5-31/ISLANDDAO/Untitled design (1)";

/** Max width per asset — props render small in CSS; keeps files light. */
const MAX_WIDTH = {
  "1": 640,
  "2": 720,
  "3": 480,
  "4": 640,
  "5": 560,
  "6": 560,
  "7": 480,
  "8": 400,
  "9": 480,
  "10": 560,
};

async function optimizePng(pngPath) {
  const base = path.basename(pngPath, ".png");
  const maxW = MAX_WIDTH[base] ?? 640;
  const webpPath = path.join(BEACH_DIR, `${base}.webp`);

  const before = fs.statSync(pngPath).size;
  await sharp(pngPath)
    .resize({ width: maxW, withoutEnlargement: true })
    .webp({ quality: 76, alphaQuality: 78, effort: 6 })
    .toFile(webpPath);
  const after = fs.statSync(webpPath).size;

  console.log(
    `${base}: ${(before / 1024).toFixed(1)}KB png -> ${(after / 1024).toFixed(1)}KB webp (maxW ${maxW})`
  );
}

async function main() {
  fs.mkdirSync(BEACH_DIR, { recursive: true });

  for (const n of ["8", "9", "10"]) {
    const src = path.join(SOURCE_DIR, `${n}.png`);
    if (!fs.existsSync(src)) {
      console.error(`Missing source: ${src}`);
      process.exit(1);
    }
    const dest = path.join(BEACH_DIR, `${n}.png`);
    if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
  }

  const pngs = fs
    .readdirSync(BEACH_DIR)
    .filter((f) => f.endsWith(".png"))
    .map((f) => path.join(BEACH_DIR, f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  for (const png of pngs) await optimizePng(png);

  let totalWebp = 0;
  for (const f of fs.readdirSync(BEACH_DIR)) {
    if (f.endsWith(".webp")) totalWebp += fs.statSync(path.join(BEACH_DIR, f)).size;
  }
  console.log(`Total webp in public/beach: ${(totalWebp / 1024).toFixed(1)}KB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
