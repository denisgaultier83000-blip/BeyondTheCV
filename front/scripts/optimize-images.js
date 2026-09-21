const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

// Generate responsive WebP/AVIF variants for the heaviest landing-page images.
const images = [
  { name: 'dashboard-preview.png', widths: [800, 1200] },
  { name: 'dashboard-preview-night.png', widths: [800, 1200] },
  { name: 'evaluation-preview.png', widths: [600, 885] },
  { name: 'evaluation-preview-night.png', widths: [600, 881] },
  { name: 'denis-gaultier.png', widths: [132, 186] },
];

async function optimize() {
  for (const img of images) {
    const inputPath = path.join(publicDir, img.name);
    if (!fs.existsSync(inputPath)) {
      console.warn(`[optimize-images] Missing: ${inputPath}`);
      continue;
    }

    const meta = await sharp(inputPath).metadata();
    const baseName = path.basename(img.name, path.extname(img.name));

    for (const w of img.widths) {
      if (w > meta.width) {
        console.log(`[optimize-images] Skipping ${baseName}-${w} (larger than original ${meta.width}px)`);
        continue;
      }
      const h = Math.round((meta.height / meta.width) * w);
      const outBase = path.join(publicDir, `${baseName}-${w}`);

      await sharp(inputPath)
        .resize(w, h, { withoutEnlargement: true, fit: 'inside' })
        .webp({ quality: 85, effort: 4 })
        .toFile(`${outBase}.webp`);

      await sharp(inputPath)
        .resize(w, h, { withoutEnlargement: true, fit: 'inside' })
        .avif({ quality: 80, effort: 4 })
        .toFile(`${outBase}.avif`);

      console.log(`[optimize-images] ${baseName}-${w}.webp / .avif (${w}x${h})`);
    }
  }
}

optimize().catch((err) => {
  console.error('[optimize-images] Failed:', err);
  process.exit(1);
});
