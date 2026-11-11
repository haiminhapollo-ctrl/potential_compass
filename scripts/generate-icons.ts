/**
 * Sinh icon PWA (PNG) tu SVG bang sharp - chi chay 1 lan luc scaffold du an.
 * Icon tam thoi (la ban / compass don gian) - THAY BANG LOGO THAT truoc khi
 * public app cho phu huynh/hoc sinh dung.
 * Chay: tsx scripts/generate-icons.ts
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public", "icons");

function compassSvg(size: number, padding: number): string {
  const c = size / 2;
  const r = c - padding;
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="#2563eb"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="#eff6ff" stroke="#1e3a8a" stroke-width="${size * 0.02}"/>
    <polygon points="${c},${c - r * 0.65} ${c + r * 0.22},${c} ${c},${c + r * 0.65} ${c - r * 0.22},${c}"
      fill="#2563eb" />
    <polygon points="${c},${c - r * 0.65} ${c + r * 0.22},${c} ${c},${c}"
      fill="#1d4ed8" />
    <polygon points="${c},${c + r * 0.65} ${c - r * 0.22},${c} ${c},${c}"
      fill="#93c5fd" />
    <circle cx="${c}" cy="${c}" r="${r * 0.06}" fill="#1e3a8a"/>
  </svg>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const targets: { name: string; size: number; padding: number }[] = [
    { name: "icon-192.png", size: 192, padding: 8 },
    { name: "icon-512.png", size: 512, padding: 20 },
    { name: "icon-maskable-512.png", size: 512, padding: 80 }, // padding rong hon cho vung an toan maskable
  ];

  for (const t of targets) {
    const svg = compassSvg(t.size, t.padding);
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    await writeFile(path.join(OUT_DIR, t.name), png);
    console.log(`✅ Da tao ${t.name} (${png.length} bytes)`);
  }

  // favicon don gian
  const favicon = await sharp(Buffer.from(compassSvg(64, 4))).png().toBuffer();
  await writeFile(path.join(process.cwd(), "src", "app", "icon.png"), favicon);
  console.log("✅ Da tao src/app/icon.png (favicon)");
}

main().catch((err) => {
  console.error("❌ Loi khi tao icon:", err);
  process.exit(1);
});
