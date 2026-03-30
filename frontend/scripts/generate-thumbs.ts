import sharp from "sharp";
import { readdir, mkdir } from "fs/promises";
import { join, extname, basename } from "path";

const SOURCE = "public/beer_images";
const DEST = "public/beer_images/thumbs";

await mkdir(DEST, { recursive: true });

for (const file of await readdir(SOURCE)) {
  if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
  const outName = basename(file, extname(file)) + ".webp";
  await sharp(join(SOURCE, file))
    .resize(96, 96, { fit: "cover" })
    .webp({ quality: 80 })
    .toFile(join(DEST, outName));
  console.log(`✓ ${file} → thumbs/${outName}`);
}
