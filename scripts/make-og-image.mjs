/**
 * One-off script to generate the Open Graph social-share image.
 * Outputs public/og-image.png at 1200×630 — the ratio Facebook, LinkedIn,
 * Twitter, WhatsApp etc. all look best at.
 *
 * Run:  node scripts/make-og-image.mjs
 * Requires sharp (dev dep).
 */
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(__dirname, '..', 'public', 'og-image.png');

const W = 1200;
const H = 630;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1E5EFF"/>
      <stop offset="0.55" stop-color="#2041D1"/>
      <stop offset="1" stop-color="#0A1B6B"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.35" r="0.6">
      <stop offset="0"   stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="0.7" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- Decorative circles -->
  <circle cx="1050" cy="110" r="140" fill="#ffffff" fill-opacity="0.08"/>
  <circle cx="1100" cy="520" r="90"  fill="#ffffff" fill-opacity="0.06"/>
  <circle cx="930"  cy="330" r="40"  fill="#ffffff" fill-opacity="0.1"/>

  <!-- Left: brand lockup + tagline -->
  <!-- Pill: 'Built for Ghana' -->
  <g transform="translate(70, 90)">
    <rect x="0" y="0" width="275" height="42" rx="21" fill="#ffffff" fill-opacity="0.18" stroke="#ffffff" stroke-opacity="0.3"/>
    <text x="24" y="27" font-family="Inter, -apple-system, Segoe UI, sans-serif" font-size="15" font-weight="800" fill="#ffffff" letter-spacing="2">
      BUILT FOR GHANA · 2026
    </text>
  </g>

  <!-- Logo mark -->
  <g transform="translate(70, 160)">
    <rect x="0" y="0" width="64" height="64" rx="16" fill="#ffffff"/>
    <path d="M32 14 L46 22 L46 36 C46 44 40 50 32 52 C24 50 18 44 18 36 L18 22 Z" fill="#1E5EFF"/>
    <path d="M27 32 L31 36 L39 28" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="150" y="207" font-family="Inter, -apple-system, Segoe UI, sans-serif" font-size="34" font-weight="800" fill="#ffffff" letter-spacing="-0.5">
    Doctor Cares
  </text>

  <!-- Hero headline -->
  <text x="70" y="320" font-family="Inter, -apple-system, Segoe UI, sans-serif" font-size="68" font-weight="800" fill="#ffffff" letter-spacing="-2">
    Healthcare,
  </text>
  <text x="70" y="398" font-family="Inter, -apple-system, Segoe UI, sans-serif" font-size="68" font-weight="800" fill="#ffffff" letter-spacing="-2">
    anytime, anywhere.
  </text>

  <!-- Subtext -->
  <text x="70" y="462" font-family="Inter, -apple-system, Segoe UI, sans-serif" font-size="24" font-weight="500" fill="#ffffff" fill-opacity="0.85">
    Book Ghana doctors + nurses. Chat, video visits,
  </text>
  <text x="70" y="494" font-family="Inter, -apple-system, Segoe UI, sans-serif" font-size="24" font-weight="500" fill="#ffffff" fill-opacity="0.85">
    vitals, NHIS claims — all in one app.
  </text>

  <!-- CTA pill -->
  <g transform="translate(70, 528)">
    <rect x="0" y="0" width="245" height="56" rx="28" fill="#ffffff"/>
    <text x="123" y="37" text-anchor="middle" font-family="Inter, -apple-system, Segoe UI, sans-serif" font-size="20" font-weight="800" fill="#1E5EFF">
      doctor-cares-ten.vercel.app
    </text>
  </g>

  <!-- Right: shield / medical card illustration -->
  <g transform="translate(830, 170)">
    <!-- Phone-frame-ish card -->
    <rect x="0" y="0" width="290" height="360" rx="36" fill="#ffffff" fill-opacity="0.1" stroke="#ffffff" stroke-opacity="0.2"/>

    <!-- Shield icon -->
    <g transform="translate(60, 50)">
      <path d="M85 0 L170 36 L170 110 C170 160 130 200 85 215 C40 200 0 160 0 110 L0 36 Z"
            fill="#ffffff" fill-opacity="0.95"/>
      <path d="M60 108 L80 128 L120 88" stroke="#1E5EFF" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>

    <!-- Three mini-rows -->
    <g transform="translate(24, 280)">
      <rect x="0" y="0" width="242" height="22" rx="6" fill="#ffffff" fill-opacity="0.75"/>
      <rect x="0" y="32" width="200" height="18" rx="6" fill="#ffffff" fill-opacity="0.5"/>
      <rect x="0" y="58" width="170" height="18" rx="6" fill="#ffffff" fill-opacity="0.5"/>
    </g>
  </g>
</svg>`;

await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9 })
  .toFile(outPath);

console.log(`✓ Wrote ${outPath} (1200×630)`);
