// Generates the Vitals app icons (no external deps — pure Node + zlib).
// Draws a bedside-monitor motif: dark slate field, faint grid, a green ECG
// retrieval trace. Run with: node scripts/gen-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "icons");
mkdirSync(OUT, { recursive: true });

// --- palette (from the brief) ---
const BG = [0x0e, 0x14, 0x19];
const GRID = [0x24, 0x30, 0x39];
const TRACE = [0x35, 0xe0, 0xa1];

// --- tiny framebuffer + PNG encoder ---
function Canvas(w, h) {
  const buf = new Uint8Array(w * h * 4);
  return {
    w,
    h,
    buf,
    set(x, y, [r, g, b], a = 255) {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const i = (y * w + x) * 4;
      const af = a / 255;
      buf[i] = Math.round(buf[i] * (1 - af) + r * af);
      buf[i + 1] = Math.round(buf[i + 1] * (1 - af) + g * af);
      buf[i + 2] = Math.round(buf[i + 2] * (1 - af) + b * af);
      buf[i + 3] = 255;
    },
    fill([r, g, b]) {
      for (let i = 0; i < buf.length; i += 4) {
        buf[i] = r;
        buf[i + 1] = g;
        buf[i + 2] = b;
        buf[i + 3] = 255;
      }
    },
  };
}

function crc32(bytes) {
  let c = ~0;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const body = Buffer.concat([t, Buffer.from(data)]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(canvas) {
  const { w, h, buf } = canvas;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    buf.subarray(y * w * 4, (y + 1) * w * 4).forEach((v, x) => {
      raw[y * (w * 4 + 1) + 1 + x] = v;
    });
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Draw a soft, thick polyline with a faint glow.
function stroke(c, pts, color, thickness) {
  const r = thickness / 2;
  for (let s = 0; s < pts.length - 1; s++) {
    const [x0, y0] = pts[s];
    const [x1, y1] = pts[s + 1];
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
    for (let t = 0; t <= steps; t++) {
      const x = x0 + ((x1 - x0) * t) / steps;
      const y = y0 + ((y1 - y0) * t) / steps;
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          const d = Math.hypot(dx, dy);
          if (d > r) continue;
          const a = d < r - 1 ? 255 : Math.max(0, (r - d) * 255);
          c.set(Math.round(x + dx), Math.round(y + dy), color, a);
        }
      }
    }
  }
}

function drawIcon(size, { maskable = false } = {}) {
  const c = Canvas(size, size);
  c.fill(BG);
  const inset = maskable ? Math.round(size * 0.12) : 0; // safe zone for maskable
  const area = size - inset * 2;

  // faint grid
  const step = Math.max(8, Math.round(area / 8));
  for (let g = inset; g <= size - inset; g += step) {
    for (let p = inset; p < size - inset; p++) {
      c.set(g, p, GRID, 70);
      c.set(p, g, GRID, 70);
    }
  }

  // ECG retrieval trace across the middle
  const mid = size / 2;
  const u = area / 100;
  const x = (p) => inset + p * u;
  const y = (p) => mid - p * u;
  const pts = [
    [x(4), y(0)],
    [x(28), y(0)],
    [x(34), y(6)],
    [x(40), y(-10)],
    [x(48), y(34)],
    [x(56), y(-22)],
    [x(62), y(6)],
    [x(68), y(0)],
    [x(96), y(0)],
  ];
  const thick = Math.max(2, Math.round(size * 0.03));
  stroke(c, pts, TRACE, thick + 2); // soft halo via overlapping pass
  stroke(c, pts, TRACE, thick);
  return c;
}

const targets = [
  ["icon-192.png", 192, {}],
  ["icon-512.png", 512, {}],
  ["icon-maskable-512.png", 512, { maskable: true }],
  ["apple-touch-icon.png", 180, {}],
];
for (const [name, size, opts] of targets) {
  writeFileSync(join(OUT, name), encodePNG(drawIcon(size, opts)));
  console.log("wrote", name, size);
}
console.log("icons done");
