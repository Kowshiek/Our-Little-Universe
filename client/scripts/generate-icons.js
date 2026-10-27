import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPng(width, height, drawFn) {
  const bytesPerPixel = 4;
  const rowSize = 1 + width * bytesPerPixel;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * bytesPerPixel;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // non-interlaced

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(8 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);

    // Compute CRC32
    const crc = computeCrc(Buffer.concat([Buffer.from(type, 'ascii'), data]));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 implementation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function computeCrc(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Cosmic gradient & couple heart icon drawer
function cosmicDraw(x, y, w, h, maskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxR = w / 2;

  // Background Cosmic radial gradient
  let normDist = Math.min(dist / maxR, 1.0);
  let r = Math.round(45 * (1 - normDist) + 11 * normDist);
  let g = Math.round(27 * (1 - normDist) + 8 * normDist);
  let b = Math.round(105 * (1 - normDist) + 29 * normDist);
  let a = 255;

  // Maskable or standard rounded corner
  if (!maskable) {
    const cornerR = w * 0.22;
    const qx = Math.max(Math.abs(dx) - (w / 2 - cornerR), 0);
    const qy = Math.max(Math.abs(dy) - (h / 2 - cornerR), 0);
    if (Math.sqrt(qx * qx + qy * qy) > cornerR) {
      return [0, 0, 0, 0];
    }
  }

  // Heart formula: (x^2 + (y - sqrt(|x|))^2) <= 1
  const hx = (x - cx) / (w * 0.28);
  const hy = -(y - cy * 0.95) / (h * 0.28); // invert y for math coords
  const heartEq = hx * hx + Math.pow(hy - Math.sqrt(Math.abs(hx)), 2);

  if (heartEq <= 1.05) {
    // Inside cosmic pink-lavender heart
    const t = (hy + 1) / 2;
    r = Math.round(244 * t + 138 * (1 - t));
    g = Math.round(114 * t + 101 * (1 - t));
    b = Math.round(182 * t + 212 * (1 - t));
    return [r, g, b, 255];
  }

  // Couple Stars: Star 1 (Yellow) & Star 2 (Cyan)
  const d1 = Math.hypot(x - (cx - w * 0.1), y - (cy - h * 0.05));
  if (d1 < w * 0.05) {
    return [255, 209, 102, 255]; // Yellow starlight
  }
  const d2 = Math.hypot(x - (cx + w * 0.1), y - (cy - h * 0.03));
  if (d2 < w * 0.045) {
    return [56, 189, 248, 255]; // Cyan starlight
  }

  // Twinkling stars scattered
  if ((x * 17 + y * 31) % 199 === 0) {
    return [255, 255, 255, 240];
  }

  return [r, g, b, a];
}

const outDir = path.resolve('client/public/icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Generate all standard PWA icon sizes
const sizes = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-192.png', size: 192, maskable: true },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
];

for (const { file, size, maskable } of sizes) {
  const pngBuf = createPng(size, size, (x, y, w, h) => cosmicDraw(x, y, w, h, maskable));
  fs.writeFileSync(path.join(outDir, file), pngBuf);
  console.log(`Generated ${file} (${size}x${size})`);
}
