/**
 * tools/gen-icons.mjs
 * Generate PWA icons (PNG) tanpa dependency eksternal.
 * Output: assets/icons/icon-192.png, icon-512.png, icon-512-maskable.png
 * Menggunakan zlib bawaan Node untuk kompresi PNG.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'assets', 'icons');
mkdirSync(outDir, { recursive: true });

const GREEN = [8, 115, 51, 255];      // #087333
const GREEN_DARK = [5, 80, 36, 255];
const WHITE = [255, 255, 255, 255];

function makeCanvas(size) {
  return new Uint8Array(size * size * 4);
}

function setPx(canvas, size, x, y, color) {
  const i = (Math.round(y) * size + Math.round(x)) * 4;
  if (i < 0 || i + 3 >= canvas.length) return;
  canvas[i] = color[0];
  canvas[i + 1] = color[1];
  canvas[i + 2] = color[2];
  canvas[i + 3] = color[3];
}

function blendPx(canvas, size, x, y, color) {
  const i = (Math.round(y) * size + Math.round(x)) * 4;
  if (i < 0 || i + 3 >= canvas.length) return;
  const a = color[3] / 255;
  const ia = 1 - a;
  canvas[i] = Math.round(color[0] * a + canvas[i] * ia);
  canvas[i + 1] = Math.round(color[1] * a + canvas[i + 1] * ia);
  canvas[i + 2] = Math.round(color[2] * a + canvas[i + 2] * ia);
  canvas[i + 3] = Math.round(color[3] * a + canvas[i + 3] * ia);
}

function inRoundedRect(px, py, size, radius) {
  if (px < 0 || py < 0 || px >= size || py >= size) return false;
  const rx = Math.min(px, size - 1 - px);
  const ry = Math.min(py, size - 1 - py);
  if (rx >= radius || ry >= radius) return true;
  const cx = radius - 1;
  const cy = radius - 1;
  const dx = rx - cx;
  const dy = ry - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function inEllipse(px, py, cx, cy, rx, ry) {
  const dx = (px - cx) / rx;
  const dy = (py - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function drawIcon(size, { maskable = false, leafColor = WHITE } = {}) {
  const canvas = makeCanvas(size);
  const bg = maskable ? GREEN : GREEN;

  // background (rounded for regular, full square for maskable)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inside = maskable ? true : inRoundedRect(x, y, size, size * 0.22);
      if (inside) {
        setPx(canvas, size, x, y, bg);
      }
    }
  }

  // highlight band subtle (gives depth) — optional skip

  // Leaf shape: stem (vertical) + two rounded leaves
  const cx = size * 0.5;
  const baseY = size * 0.78;
  const stemTop = size * 0.34;
  const stemW = size * 0.035;

  // stem
  for (let y = stemTop; y <= baseY; y++) {
    for (let x = cx - stemW; x <= cx + stemW; x++) {
      blendPx(canvas, size, x, y, greenify(leafColor, 0.92));
    }
  }

  // left leaf
  const lcx = cx - size * 0.18, lcy = size * 0.42;
  const lrx = size * 0.16, lry = size * 0.09;
  // right leaf
  const rcx = cx + size * 0.18, rcy = size * 0.38;
  const rrx = size * 0.16, rry = size * 0.09;

  for (let y = Math.floor(Math.min(lcy - lry, rcy - rry)); y <= Math.ceil(Math.max(lcy + lry, rcy + rry)); y++) {
    for (let x = Math.floor(Math.min(lcx - lrx, rcx - rrx)); x <= Math.ceil(Math.max(lcx + lrx, rcx + rrx)); x++) {
      if (inEllipse(x, y, lcx, lcy, lrx, lry) || inEllipse(x, y, rcx, rcy, rrx, rry)) {
        blendPx(canvas, size, x, y, leafColor);
      }
    }
  }

  // add leaf vein highlight
  return canvas;
}

function greenify(color, alpha) {
  return [color[0], color[1], color[2], Math.round(255 * alpha)];
}

/* ---- PNG encoding ---- */
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // raw scanlines with filter byte 0
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < width * 4; x++) {
      raw[rowStart + 1 + x] = rgba[y * width * 4 + x];
    }
  }

  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ---- Generate ---- */
const specs = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-512-maskable.png', size: 512, maskable: true }
];

for (const spec of specs) {
  const canvas = drawIcon(spec.size, { maskable: spec.maskable });
  const png = encodePNG(spec.size, spec.size, canvas);
  // akses file sebelum dibuat — halaman fetch referensi ini
  const filePath = resolve(outDir, spec.file);
  writeFileSync(filePath, png);
  console.log(`generated: ${spec.file} (${png.length} bytes)`);
}
console.log('Icons done.');
