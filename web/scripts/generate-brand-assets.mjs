// Original clip-and-dot geometry shared with components/brand/medot-logo.tsx.
// Uses Next's already installed sharp dependency; no new runtime dependency.
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const geometry = '<path d="M30 8H18C10 8 7 14 7 22v10c0 6 4 9 10 9h14c6 0 10-4 10-10v-8M15 29v4c0 1 1 2 2 2h13" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="36" cy="12" r="6" fill="currentColor"/>';
const mark = color => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" color="${color}"><title>MEDOT</title>${geometry}</svg>`;
const wordmark = color => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 48" color="${color}"><title>MEDOT</title>${geometry}<text x="61" y="34" fill="currentColor" font-family="Manrope,Arial,sans-serif" font-size="30" font-weight="700" letter-spacing="1.2">MEDOT</text></svg>`;
await mkdir(root + "public/brand", { recursive: true });
for (const [name, color] of [["", "#215c50"], ["-mono", "#172f2b"], ["-light", "#ffffff"]]) {
  await writeFile(root + `public/brand/medot-mark${name}.svg`, mark(color));
  await writeFile(root + `public/brand/medot-wordmark${name}.svg`, wordmark(color));
}
await writeFile(root + "src/app/icon.svg", mark("#215c50"));
const apple = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect width="180" height="180" rx="36" fill="#f6f7f2"/><g transform="translate(26 26) scale(2.6667)" color="#215c50">${geometry}</g></svg>`;
await sharp(Buffer.from(apple)).png().toFile(root + "src/app/apple-icon.png");
const png = await sharp(Buffer.from(mark("#215c50"))).resize(32, 32).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
header[6] = 32; header[7] = 32; header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12); header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18);
await writeFile(root + "src/app/favicon.ico", Buffer.concat([header, png]));
console.log("Generated six brand SVG variants, app icon, 32px favicon and 180px apple icon.");
