/**
 * Paper export: BMP, PNG, PDF, and the real printer.
 *
 * BMP and PDF are written by hand so the demo has no runtime dependencies.
 * PDF pages use 2-bit DeviceGray at 160 x rows, which is exactly the printer's
 * 160-dot, four-shade output. PNG uses the display renderer.
 *
 * MIT License. See LICENSE.md.
 */

import { GRAY_SHADES, PAPER_WIDTH, renderSheetRgba, renderSheetToCanvas } from '../printer/paper.js';

const MM_PER_DOT = 38 / 160; // 38 mm paper, 160 dots across
const PT_PER_MM = 72 / 25.4;
const PAGE_WIDTH_PT = 38 * PT_PER_MM;

function writeU32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

function writeU16(view, offset, value) {
  view.setUint16(offset, value & 0xffff, true);
}

/**
 * 24-bit uncompressed BMP from RGBA pixels (bottom-up BGR, 4-byte rows).
 * @param {{width:number,height:number,data:Uint8ClampedArray|Uint8Array}} image
 */
export function encodeBmp(image) {
  const { width, height, data } = image;
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelBytes = rowSize * height;
  const out = new Uint8Array(54 + pixelBytes);
  const view = new DataView(out.buffer);
  out[0] = 0x42; // B
  out[1] = 0x4d; // M
  writeU32(view, 2, out.length);
  writeU32(view, 10, 54);
  writeU32(view, 14, 40);
  writeU32(view, 18, width);
  writeU32(view, 22, height);
  writeU16(view, 26, 1);
  writeU16(view, 28, 24);
  writeU32(view, 30, 0); // BI_RGB
  writeU32(view, 34, pixelBytes);
  writeU32(view, 38, 2835); // 72 dpi
  writeU32(view, 42, 2835);
  writeU32(view, 46, 0);
  writeU32(view, 50, 0);

  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y; // BMP is bottom-up
    let dest = 54 + y * rowSize;
    for (let x = 0; x < width; x++) {
      const src = (srcY * width + x) * 4;
      out[dest++] = data[src + 2]; // B
      out[dest++] = data[src + 1]; // G
      out[dest++] = data[src]; // R
    }
  }
  return out;
}

function packSheet2bpp(sheet) {
  const height = Math.max(1, sheet.rowCount);
  const rowBytes = Math.ceil((PAPER_WIDTH * 2) / 8);
  const bytes = new Uint8Array(rowBytes * height);
  for (let y = 0; y < height; y++) {
    const row = sheet.rows[y] ?? null;
    for (let x = 0; x < PAPER_WIDTH; x++) {
      const shade = row ? row[x] & 3 : 0;
      const gray = 3 - shade; // PDF DeviceGray: 0 black, 3 white
      const shift = 6 - (x & 3) * 2;
      bytes[y * rowBytes + (x >> 2)] |= gray << shift;
    }
  }
  return { bytes, height };
}

/**
 * Multi-page PDF, one Game Boy Printer sheet per page, at physical 38mm width.
 * @param {import('../printer/paper.js').PaperSheet[]} sheets
 * @param {{title?: string}} [options]
 */
export function encodePdf(sheets, options = {}) {
  if (!sheets || sheets.length === 0) throw new Error('No printed sheets to export');
  const encoder = new TextEncoder();
  const chunks = [];
  let length = 0;

  const push = (value) => {
    const bytes = typeof value === 'string' ? encoder.encode(value) : value;
    chunks.push(bytes);
    length += bytes.length;
  };

  const objects = [];
  const addObject = (number, body, stream) => {
    objects[number] = length;
    push(`${number} 0 obj\n`);
    push(body);
    if (stream) {
      push('\nstream\n');
      push(stream);
      push('\nendstream');
    }
    push('\nendobj\n');
  };

  push('%PDF-1.4\n');
  // Binary comment tells viewers and tools this is not a text file.
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  const count = sheets.length;
  const pageNumbers = [];
  for (let i = 0; i < count; i++) pageNumbers.push(3 + i * 3);
  const kids = pageNumbers.map((n) => `${n} 0 R`).join(' ');
  addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
  addObject(2, `<< /Type /Pages /Kids [${kids}] /Count ${count} >>`);

  sheets.forEach((sheet, index) => {
    const base = 3 + index * 3;
    const pageNumber = base;
    const contentNumber = base + 1;
    const imageNumber = base + 2;
    const { bytes, height } = packSheet2bpp(sheet);
    const heightPt = height * MM_PER_DOT * PT_PER_MM;

    addObject(
      pageNumber,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH_PT.toFixed(4)} ${heightPt.toFixed(4)}] ` +
        `/Resources << /XObject << /Im0 ${imageNumber} 0 R >> >> /Contents ${contentNumber} 0 R >>`,
    );
    const content = `q\n${PAGE_WIDTH_PT.toFixed(4)} 0 0 ${heightPt.toFixed(4)} 0 0 cm\n/Im0 Do\nQ\n`;
    addObject(contentNumber, `<< /Length ${encoder.encode(content).length} >>`, encoder.encode(content));
    addObject(
      imageNumber,
      `<< /Type /XObject /Subtype /Image /Width ${PAPER_WIDTH} /Height ${height} ` +
        `/ColorSpace /DeviceGray /BitsPerComponent 2 /Length ${bytes.length} >>`,
      bytes,
    );
  });

  const maxObject = 2 + count * 3;
  const xrefOffset = length;
  push(`xref\n0 ${maxObject + 1}\n`);
  push('0000000000 65535 f \n');
  for (let n = 1; n <= maxObject; n++) {
    push(`${String(objects[n] ?? 0).padStart(10, '0')} 00000 n \n`);
  }
  push(`trailer\n<< /Size ${maxObject + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export function sheetToBmpBlob(sheet, scale = 4) {
  const rgba = renderSheetRgba(sheet, scale);
  return new Blob([encodeBmp(rgba)], { type: 'image/bmp' });
}

export function sheetsToPdfBlob(sheets, title = 'GBScribe print') {
  return new Blob([encodePdf(sheets, { title })], { type: 'application/pdf' });
}

export async function sheetToPngBlob(sheet, scale = 4) {
  if (typeof document === 'undefined') throw new Error('PNG export requires a browser');
  const canvas = renderSheetToCanvas(sheet, scale);
  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PNG encoding failed'));
    }, 'image/png');
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function timestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

/**
 * Print every sheet through the browser's real print dialog. The paper is
 * scaled up from its native 38mm width for readable output on A4/Letter.
 */
export function printSheets(sheets, options = {}) {
  if (!sheets || sheets.length === 0) return false;
  const win = window.open('', '_blank');
  if (!win) return false;

  const images = sheets.map((sheet, index) => {
    const canvas = renderSheetToCanvas(sheet, 4, GRAY_SHADES);
    return `<img alt="Game Boy Printer sheet ${index + 1}" src="${canvas.toDataURL('image/png')}">`;
  });

  win.document.open();
  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>GBScribe print</title>
<style>
  @page { margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  img { display: block; width: 100%; height: auto; image-rendering: pixelated; break-after: page; page-break-after: always; }
  img:last-child { break-after: auto; page-break-after: auto; }
</style></head><body>${images.join('')}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => {
    try {
      win.print();
    } catch (error) {
      // The user can still use the print button in the opened window.
      console.error(error);
    }
  }, 350);
  return true;
}
