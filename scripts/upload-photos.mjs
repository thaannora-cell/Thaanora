// Resize product photos from photos/, upload them to the "product-photos" bucket,
// and link each one to its product by the product code found in the file name.
//
//   npm run photos -- --dry-run     show matches only, change nothing
//   npm run photos                  resize, upload and link
//   npm run photos -- --dir=other   use another folder
//
// File names must contain the full product code, e.g. "SP-62078-Gulahmed.webp" or "U3PEST26V930_2.jpg".
// Several photos for one product are ordered by file name.

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const BUCKET = "product-photos";
const MAX_SIDE = 1400;
const WEBP_QUALITY = 82;
const SUPPORTED = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff"]);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dir = path.resolve(args.find((a) => a.startsWith("--dir="))?.slice(6) ?? "photos");

try {
  process.loadEnvFile(".env.local");
} catch {
  fail("Could not read .env.local. Run this from the project folder.");
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.");
if (!fs.existsSync(dir)) fail(`Folder not found: ${dir}`);

const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// A code matches only as a whole: "U4094SU-3PC-143" must not match product "U4094SU-3PC-582".
function findProduct(fileName, products) {
  const name = path.parse(fileName).name.toLowerCase();
  const hits = products.filter((p) =>
    new RegExp(`(^|[^a-z0-9])${escapeRe(p.code.toLowerCase())}($|[^a-z0-9])`).test(name)
  );
  if (hits.length <= 1) return { product: hits[0] ?? null };
  const longest = Math.max(...hits.map((p) => p.code.length));
  const best = hits.filter((p) => p.code.length === longest);
  return best.length === 1 ? { product: best[0] } : { ambiguous: best.map((p) => p.code) };
}

const { data: products, error: productsError } = await supabase
  .from("products")
  .select("id, code, brand, name")
  .order("sort_order");
if (productsError) fail(`Could not read products: ${productsError.message}`);

if (!dryRun) {
  const { data: bucket, error } = await supabase.storage.getBucket(BUCKET);
  if (error || !bucket) fail(`Bucket "${BUCKET}" not found. Run supabase/migrations/20261109000001_product_photos.sql first.`);
}

const files = fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile()).sort();
const unsupported = [];
const unmatched = [];
const ambiguous = [];
const byProduct = new Map();

for (const file of files) {
  if (file.startsWith(".")) continue;
  if (!SUPPORTED.has(path.extname(file).toLowerCase())) {
    unsupported.push(file);
    continue;
  }
  const match = findProduct(file, products);
  if (match.ambiguous) ambiguous.push(`${file}  (${match.ambiguous.join(", ")})`);
  else if (!match.product) unmatched.push(file);
  else byProduct.set(match.product, [...(byProduct.get(match.product) ?? []), file]);
}

console.log(`\n${dryRun ? "DRY RUN — nothing will be uploaded" : "Uploading"} · ${files.length} files in ${path.relative(process.cwd(), dir) || "."}\n`);

let uploaded = 0;
let failed = 0;
for (const [product, list] of byProduct) {
  for (const [i, file] of list.entries()) {
    const storagePath = `${product.code}/${slug(path.parse(file).name)}.webp`;
    const label = `${product.code.padEnd(18)} ${file}`;
    if (dryRun) {
      console.log(`  ✓ ${label}  →  ${storagePath}`);
      continue;
    }
    try {
      const { data: buffer, info } = await sharp(path.join(dir, file))
        .rotate()
        .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY, effort: 5 })
        .toBuffer({ resolveWithObject: true });

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: "image/webp", cacheControl: "3600", upsert: true });
      if (upErr) throw new Error(`upload: ${upErr.message}`);

      const { error: rowErr } = await supabase.from("product_images").upsert(
        {
          product_id: product.id,
          storage_path: storagePath,
          alt: `${product.brand} — ${product.name}`,
          width: info.width,
          height: info.height,
          sort_order: (i + 1) * 10,
        },
        { onConflict: "storage_path" }
      );
      if (rowErr) throw new Error(`link: ${rowErr.message}`);

      uploaded++;
      console.log(`  ✓ ${label}  →  ${info.width}×${info.height}, ${Math.round(buffer.length / 1024)} KB`);
    } catch (e) {
      failed++;
      console.log(`  ✗ ${label}  →  ${e.message}`);
    }
  }
}

const section = (title, list) => {
  if (!list.length) return;
  console.log(`\n${title} (${list.length}):`);
  list.forEach((x) => console.log(`  · ${x}`));
};
section("No matching product — not uploaded", unmatched);
section("Matches more than one product — not uploaded, rename the file", ambiguous);
section("Not an image this script handles — skipped", unsupported);
section(
  "Products with no photo in this folder",
  products.filter((p) => !byProduct.has(p)).map((p) => `${p.code}  ${p.brand} — ${p.name}`)
);

const matchedFiles = [...byProduct.values()].reduce((n, l) => n + l.length, 0);
console.log(
  `\nSummary: ${matchedFiles} matched, ${dryRun ? "0 uploaded (dry run)" : `${uploaded} uploaded`}, ${failed} failed, ${unmatched.length + ambiguous.length} unmatched, ${unsupported.length} skipped.\n`
);
process.exit(failed ? 1 : 0);
