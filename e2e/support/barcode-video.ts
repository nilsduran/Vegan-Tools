/**
 * Writes a Y4M video of an EAN-13 barcode for Chromium's fake camera
 * (--use-file-for-fake-video-capture), so E2E tests can scan a real barcode
 * through getUserMedia and the same reader the app uses on each device.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { crc32, deflateSync } from "node:zlib";

const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

export function ean13CheckDigit(first12: string): string {
  const sum = [...first12].reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}

function ean13Modules(code: string): string {
  const digits = [...code].map(Number);
  const parity = PARITY[digits[0]!]!;
  let modules = "101";
  for (let index = 1; index <= 6; index += 1) {
    modules += (parity[index - 1] === "L" ? L : G)[digits[index]!]!;
  }
  modules += "01010";
  for (let index = 7; index <= 12; index += 1) modules += R[digits[index]!]!;
  return modules + "101";
}

/** The EAN-13 the fake camera shows to the scanner. */
export const SCANNED_GTIN = `841007647253${ean13CheckDigit("841007647253")}`;

export function writeBarcodeVideo(path: string, code: string): void {
  const width = 640;
  const height = 480;
  const moduleWidth = 5;
  const modules = ean13Modules(code);
  const left = Math.floor((width - modules.length * moduleWidth) / 2);
  const top = 90;
  const bottom = height - 90;

  const luma = Buffer.alloc(width * height, 255);
  for (let y = top; y < bottom; y += 1) {
    for (let index = 0; index < modules.length; index += 1) {
      if (modules[index] !== "1") continue;
      luma.fill(0, y * width + left + index * moduleWidth, y * width + left + (index + 1) * moduleWidth);
    }
  }
  const chroma = Buffer.alloc((width / 2) * (height / 2), 128);
  const frame = Buffer.concat([Buffer.from("FRAME\n"), luma, chroma, chroma]);
  const header = Buffer.from(`YUV4MPEG2 W${width} H${height} F10:1 Ip A1:1 C420jpeg\n`);

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.concat([header, ...Array.from({ length: 10 }, () => frame)]));
}

/** A grayscale PNG photo of the same EAN-13, for the "photo of the barcode" fallback. */
export function barcodePng(code: string): Buffer {
  const width = 640;
  const height = 360;
  const moduleWidth = 5;
  const modules = ean13Modules(code);
  const left = Math.floor((width - modules.length * moduleWidth) / 2);
  const rows: Buffer[] = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(width + 1, 255);
    row[0] = 0; // no PNG filter
    if (y >= 60 && y < height - 60) {
      for (let index = 0; index < modules.length; index += 1) {
        if (modules[index] === "1") row.fill(0, 1 + left + index * moduleWidth, 1 + left + (index + 1) * moduleWidth);
      }
    }
    rows.push(row);
  }
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 0; // grayscale
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
