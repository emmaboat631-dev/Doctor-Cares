/**
 * One-off script to generate the Open Graph social-share image.
 * Outputs public/og-image.png at 1200×630 — the ratio Facebook, LinkedIn,
 * Twitter, WhatsApp etc. all look best at.
 *
 * Composites the real brand-illustration.png onto a brand-colored background
 * so the preview actually looks like the Doctor Cares app.
 *
 * Run:  node scripts/make-og-image.mjs
 * Requires sharp (dev dep).
 */
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brandPath = path.resolve(__dirname, '..', 'public', 'brand-illustration.png');
const outPath   = path.resolve(__dirname, '..', 'public', 'og-image.png');

const W = 1200;
const H = 630;

// --- Background layer: gradient + decorative circles + text ------------------
const backgroundSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0"   stop-color="#2066FF"/>
      <stop offset="0.5" stop-color="#1E5EFF"/>
      <stop offset="1"   stop-color="#0A1B6B"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.78" cy="0.5" r="0.55">
      <stop offset="0"   stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="0.7" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- Decorative accents -->
  <circle cx="1100" cy="120" r="120" fill="#ffffff" fill-opacity="0.06"/>
  <circle cx="1130" cy="540" r="80"  fill="#ffffff" fill-opacity="0.05"/>
  <circle cx="580"  cy="80"  r="40"  fill="#ffffff" fill-opacity="0.08"/>

  <!-- 'Built for Ghana' pill -->
  <g transform="translate(70, 90)">
    <rect x="0" y="0" width="285" height="42" rx="21" fill="#ffffff" fill-opacity="0.18" stroke="#ffffff" stroke-opacity="0.3"/>
    <text x="24" y="27" font-family="Inter, -apple-system, Segoe UI, Roboto, sans-serif"
          font-size="15" font-weight="800" fill="#ffffff" letter-spacing="2">
      BUILT FOR GHANA · 2026
    </text>
  </g>

  <!-- Wordmark -->
  <text x="70" y="200" font-family="Inter, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="38" font-weight="800" fill="#ffffff" letter-spacing="-1">
    Doctor Cares
  </text>

  <!-- Hero -->
  <text x="70" y="305" font-family="Inter, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="64" font-weight="800" fill="#ffffff" letter-spacing="-2">
    Healthcare,
  </text>
  <text x="70" y="378" font-family="Inter, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="64" font-weight="800" fill="#ffffff" letter-spacing="-2">
    anytime, anywhere.
  </text>

  <!-- Subtext -->
  <text x="70" y="438" font-family="Inter, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="22" font-weight="500" fill="#ffffff" fill-opacity="0.9">
    Book Ghana doctors + nurses. Chat, video visits,
  </text>
  <text x="70" y="468" font-family="Inter, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="22" font-weight="500" fill="#ffffff" fill-opacity="0.9">
    vitals, NHIS claims — all in one app.
  </text>

  <!-- URL pill -->
  <g transform="translate(70, 510)">
    <rect x="0" y="0" width="310" height="56" rx="28" fill="#ffffff"/>
    <text x="155" y="37" text-anchor="middle"
          font-family="Inter, -apple-system, Segoe UI, Roboto, sans-serif"
          font-size="19" font-weight="800" fill="#1E5EFF">
      doctor-cares-ten.vercel.app
    </text>
  </g>
</svg>`;

// --- Compose: background + the real brand illustration on the right ---------
// Illustration sits in the right half, slightly offset vertically for balance.
const ILLU_SIZE = 460;   // final rendered size inside the canvas
const ILLU_X    = 700;   // left edge
const ILLU_Y    = 85;    // top edge

// Pre-process the illustration: resize + add a subtle white glow behind it so
// it reads well against the brand-blue background.
const illuBuffer = await sharp(brandPath)
  .resize(ILLU_SIZE, ILLU_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

await sharp(Buffer.from(backgroundSvg))
  .composite([{ input: illuBuffer, left: ILLU_X, top: ILLU_Y }])
  .png({ compressionLevel: 9 })
  .toFile(outPath);

console.log(`✓ Wrote ${outPath} (${W}×${H})`);
