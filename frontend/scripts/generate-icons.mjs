/**
 * Generates minimal solid-color PNG icons for the PWA manifest.
 * Uses only Node.js built-ins — no external dependencies.
 *
 * Color: #6366f1 (indigo-500)
 * Sizes: 192×192 and 512×512
 */

import { createWriteStream } from "fs";
import { createDeflate } from "zlib";
import { Writable } from "stream";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "..", "public");

// PNG color: #6366f1 → R=99 G=102 B=241
const R = 99, G = 102, B = 241;

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function uint32BE(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const len = uint32BE(data.length);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crc = uint32BE(crc32(crcInput));
  return Buffer.concat([len, typeBytes, data, crc]);
}

function ihdr(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;  // bit depth
  data[9] = 2;  // color type: RGB
  data[10] = 0; // compression
  data[11] = 0; // filter
  data[12] = 0; // interlace
  return chunk("IHDR", data);
}

async function idat(width, height) {
  // Build raw scanlines: each row = filter byte (0) + RGB pixels
  const scanline = Buffer.alloc(1 + width * 3);
  scanline[0] = 0; // filter none
  for (let x = 0; x < width; x++) {
    scanline[1 + x * 3] = R;
    scanline[2 + x * 3] = G;
    scanline[3 + x * 3] = B;
  }
  const raw = Buffer.concat(Array(height).fill(scanline));

  return new Promise((resolve, reject) => {
    const chunks = [];
    const deflate = createDeflate({ level: 9 });
    deflate.on("data", (c) => chunks.push(c));
    deflate.on("end", () => resolve(chunk("IDAT", Buffer.concat(chunks))));
    deflate.on("error", reject);
    deflate.end(raw);
  });
}

async function writePng(filePath, size) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const idatChunk = await idat(size, size);
  const iendChunk = chunk("IEND", Buffer.alloc(0));

  const png = Buffer.concat([PNG_SIG, ihdr(size, size), idatChunk, iendChunk]);

  await new Promise((resolve, reject) => {
    const ws = createWriteStream(filePath);
    ws.on("finish", resolve);
    ws.on("error", reject);
    ws.end(png);
  });

  console.log(`Written: ${filePath} (${size}x${size})`);
}

await writePng(path.join(PUBLIC, "icon-192.png"), 192);
await writePng(path.join(PUBLIC, "icon-512.png"), 512);
console.log("PWA icons generated successfully.");
