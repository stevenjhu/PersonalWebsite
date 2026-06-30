/**
 * Optimize local photos and upload responsive AVIF/WebP variants to Cloudflare R2.
 *
 * Usage:
 *   1. Put web-sized source images (jpg/png) in ./photos (git-ignored).
 *   2. Provide R2 credentials in .env (see .env.example) — never commit them.
 *   3. Run: npm run photos
 *
 * For each source <name>.<ext> it uploads <name>-480, <name>-960, <name>-1600 in
 * both .avif and .webp. Add a matching R2Photo entry to src/data/photos.ts using
 * `base` = "<R2_PUBLIC_BASE>/<name>".
 */
import { readdir, readFile } from "node:fs/promises";
import { join, parse } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import "dotenv/config";

const WIDTHS = [480, 960, 1600];
const SOURCE_DIR = "photos";
const SOURCE_EXT = new Set([".jpg", ".jpeg", ".png", ".tif", ".tiff"]);

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`Missing required env var: ${key} (see .env.example)`);
    process.exit(1);
  }
  return value;
}

const accountId = requireEnv("R2_ACCOUNT_ID");
const bucket = requireEnv("R2_BUCKET_PHOTO");
const publicBase = process.env.R2_PUBLIC_BASE_PHOTO ?? "(set R2_PUBLIC_BASE_PHOTO)";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID_PHOTO"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY_PHOTO"),
  },
});

async function upload(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  console.log(`  ↑ ${key}`);
}

async function main(): Promise<void> {
  let files: string[];
  try {
    files = await readdir(SOURCE_DIR);
  } catch {
    console.error(
      `No ./${SOURCE_DIR} directory found. Create it and add images.`,
    );
    process.exit(1);
  }

  const images = files.filter((f) =>
    SOURCE_EXT.has(parse(f).ext.toLowerCase()),
  );
  if (images.length === 0) {
    console.log(`No images in ./${SOURCE_DIR}. Nothing to do.`);
    return;
  }

  for (const file of images) {
    const { name } = parse(file);
    const input = await readFile(join(SOURCE_DIR, file));
    console.log(`Processing ${file} → base "${name}"`);

    for (const width of WIDTHS) {
      const resized = sharp(input).resize({ width, withoutEnlargement: true });
      const avif = await resized.clone().avif({ quality: 55 }).toBuffer();
      const webp = await resized.clone().webp({ quality: 78 }).toBuffer();
      await upload(`${name}-${width}.avif`, avif, "image/avif");
      await upload(`${name}-${width}.webp`, webp, "image/webp");
    }

    console.log(`  → add to photos.ts:  base: "${publicBase}/${name}"`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
