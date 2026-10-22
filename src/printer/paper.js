/**
 * Paper model and on-screen renderer.
 *
 * A printed sheet is stored as one 160-pixel row per dot row, with null for
 * blank feed. This mirrors the Game Boy Printer's 160-dot head and keeps
 * exports independent of the display canvas.
 *
 * MIT License. See LICENSE.md.
 */

/**
 * Printer data is 160 dots wide. A real Game Boy Camera print photographed
 * against its paper shows the printed area at about 57% of the paper width, so
 * the model centers the 160-dot image in a 281-dot paper strip. This is purely
 * the paper presentation width; the serial/print buffer remains 160 dots.
 */
export const PRINT_WIDTH = 160;
export const PAPER_WIDTH = 281;
export const PRINT_OFFSET = Math.floor((PAPER_WIDTH - PRINT_WIDTH) / 2);

const DISPLAY_SHADES = [
  [0, 0, 0, 0],
  [168, 158, 139, 255],
  [93, 85, 72, 255],
  [35, 31, 27, 255],
];

const EXPORT_SHADES = [
  [248, 244, 233, 255],
  [196, 187, 168, 255],
  [112, 103, 89, 255],
  [36, 32, 28, 255],
];

/** Neutral four-level grayscale for sending a sheet to a real printer. */
export const GRAY_SHADES = [
  [255, 255, 255, 255],
  [170, 170, 170, 255],
  [85, 85, 85, 255],
  [0, 0, 0, 255],
];

let nextSheetId = 1;

function encodeBase64(bytes) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function decodeBase64(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export class PaperSheet {
  constructor(meta = {}) {
    this.id = `sheet-${nextSheetId++}`;
    this.rows = [];
    this.createdAt = meta.createdAt ?? Date.now();
    this.label = meta.label ?? '';
    this.printing = Boolean(meta.printing);
  }

  get rowCount() {
    return this.rows.length;
  }

  get isEmpty() {
    return this.rows.length === 0;
  }

  append(shades) {
    if (!shades) {
      this.rows.push(null);
    } else {
      const row = new Uint8Array(PAPER_WIDTH);
      const source = shades.subarray ? shades.subarray(0, PRINT_WIDTH) : shades.slice(0, PRINT_WIDTH);
      row.set(source, PRINT_OFFSET);
      this.rows.push(row);
    }
  }

  appendBlank(count = 1) {
    for (let i = 0; i < count; i++) this.rows.push(null);
  }

  truncate(count) {
    if (count < 0) count = 0;
    this.rows.length = Math.min(this.rows.length, count);
  }

  toJSON() {
    return {
      label: this.label,
      createdAt: this.createdAt,
      rows: this.rows.map((row) => (row ? encodeBase64(row) : null)),
    };
  }

  static fromJSON(data) {
    if (!data || !Array.isArray(data.rows)) return null;
    const sheet = new PaperSheet({
      label: typeof data.label === 'string' ? data.label : '',
      createdAt: Number.isFinite(data.createdAt) ? data.createdAt : Date.now(),
    });
    for (const row of data.rows) {
      if (row === null) {
        sheet.rows.push(null);
        continue;
      }
      if (typeof row !== 'string') continue;
      try {
        const bytes = decodeBase64(row);
        if (bytes.length !== PAPER_WIDTH) continue;
        sheet.rows.push(bytes);
      } catch {
        // Ignore a corrupt row and keep the rest of the sheet usable.
      }
    }
    return sheet;
  }
}

export class PaperStore {
  constructor(options = {}) {
    this.onChange = typeof options.onChange === 'function' ? options.onChange : () => {};
    this.current = new PaperSheet({ label: 'Current sheet' });
    this.detached = [];
    this.sheetNumber = 1;
    this.totalSheets = 0;
  }

  ensureSheet() {
    if (!this.current) {
      this.sheetNumber++;
      this.current = new PaperSheet({ label: `Print ${this.sheetNumber}` });
    }
    return this.current;
  }

  beginJob() {
    const sheet = this.ensureSheet();
    sheet.printing = true;
    this.notify('begin');
  }

  appendRow(shades) {
    const sheet = this.ensureSheet();
    sheet.append(shades);
    this.notify('row', sheet);
  }

  appendBlank(count = 1) {
    const sheet = this.ensureSheet();
    sheet.appendBlank(count);
    this.notify('row', sheet);
  }

  endJob() {
    if (this.current) this.current.printing = false;
    this.notify('end', this.current);
  }

  tear() {
    if (!this.current || this.current.isEmpty) return null;
    this.current.printing = false;
    const sheet = this.current;
    if (!sheet.label || sheet.label === 'Current sheet') {
      sheet.label = `Print ${this.sheetNumber}`;
    }
    this.detached.push(sheet);
    this.totalSheets++;
    this.sheetNumber++;
    this.current = new PaperSheet({ label: `Print ${this.sheetNumber}` });
    this.notify('tear', sheet);
    return sheet;
  }

  remove(id) {
    const before = this.detached.length;
    this.detached = this.detached.filter((sheet) => sheet.id !== id);
    if (this.detached.length !== before) this.notify('remove');
  }

  clear() {
    this.current = new PaperSheet({ label: 'Current sheet' });
    this.detached = [];
    this.sheetNumber = 1;
    this.totalSheets = 0;
    this.notify('clear');
  }

  /** Detached sheets first, then the sheet still in the printer. */
  exportableSheets({ includeCurrent = true } = {}) {
    const sheets = this.detached.slice();
    if (includeCurrent && this.current && !this.current.isEmpty) sheets.push(this.current);
    return sheets;
  }

  get hasPaper() {
    return Boolean(this.current && !this.current.isEmpty);
  }

  toJSON() {
    return {
      version: 1,
      sheetNumber: this.sheetNumber,
      totalSheets: this.totalSheets,
      current: this.current && !this.current.isEmpty ? this.current.toJSON() : null,
      detached: this.detached.map((sheet) => sheet.toJSON()),
    };
  }

  restore(data) {
    if (!data || data.version !== 1 || !Array.isArray(data.detached)) return false;
    this.detached = data.detached.map((sheet) => PaperSheet.fromJSON(sheet)).filter(Boolean);
    this.sheetNumber = Number.isFinite(data.sheetNumber)
      ? Math.max(1, Math.floor(data.sheetNumber))
      : this.detached.length + 1;
    this.totalSheets = Number.isFinite(data.totalSheets)
      ? Math.max(0, Math.floor(data.totalSheets))
      : this.detached.length;
    this.current =
      PaperSheet.fromJSON(data.current) ||
      new PaperSheet({ label: `Print ${this.sheetNumber}` });
    this.notify('restore', this.current.isEmpty ? null : this.current);
    return true;
  }

  notify(type, sheet) {
    try {
      this.onChange(type, sheet ?? null, this);
    } catch (error) {
      if (typeof console !== 'undefined') console.error('PaperStore listener failed', error);
    }
  }
}

/** Fill a `scale`-row-tall strip (one printer dot row) with four shades. */
function fillStrip(imageData, shades, colors, scale) {
  const data = imageData.data;
  for (let sy = 0; sy < scale; sy++) {
    const rowBase = sy * imageData.width * 4;
    for (let x = 0; x < PAPER_WIDTH; x++) {
      const shade = shades ? shades[x] & 3 : 0;
      const color = colors[shade];
      for (let sx = 0; sx < scale; sx++) {
        const px = rowBase + (x * scale + sx) * 4;
        data[px] = color[0];
        data[px + 1] = color[1];
        data[px + 2] = color[2];
        data[px + 3] = color[3];
      }
    }
  }
}

/**
 * Render a sheet into a canvas at `scale` device pixels per printer dot.
 * Returns a new canvas with an opaque paper background.
 */
export function renderSheetToCanvas(sheet, scale = 4, palette = EXPORT_SHADES) {
  if (typeof document === 'undefined') throw new Error('renderSheetToCanvas requires a browser');
  const rows = sheet.rows;
  const width = PAPER_WIDTH * scale;
  const height = Math.max(1, rows.length * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.fillStyle = `rgb(${palette[0][0]}, ${palette[0][1]}, ${palette[0][2]})`;
  context.fillRect(0, 0, width, height);

  const strip = context.createImageData(width, scale);
  for (let y = 0; y < rows.length; y++) {
    fillStrip(strip, rows[y], palette, scale);
    context.putImageData(strip, 0, y * scale);
  }
  return canvas;
}

/** RGBA pixels for encoders that do not need a canvas. */
export function renderSheetRgba(sheet, scale = 4, palette = EXPORT_SHADES) {
  const width = PAPER_WIDTH * scale;
  const height = Math.max(1, sheet.rows.length * scale);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < sheet.rows.length; y++) {
    const row = sheet.rows[y];
    for (let sy = 0; sy < scale; sy++) {
      const rowBase = (y * scale + sy) * width * 4;
      for (let x = 0; x < PAPER_WIDTH; x++) {
        const color = palette[row ? row[x] & 3 : 0];
        for (let sx = 0; sx < scale; sx++) {
          const px = rowBase + (x * scale + sx) * 4;
          data[px] = color[0];
          data[px + 1] = color[1];
          data[px + 2] = color[2];
          data[px + 3] = color[3];
        }
      }
    }
  }
  return { width, height, data };
}

/**
 * Live canvas view for the sheet currently leaving the printer.
 * The backing canvas grows in 512-row steps and only visible rows are shown.
 */
export class PaperCanvasView {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.scale = options.scale ?? 2;
    this.canvas.width = PAPER_WIDTH;
    this.canvas.height = 512;
    this.context = this.canvas.getContext('2d');
    this.context.imageSmoothingEnabled = false;
    this.sheet = null;
    this.backingRows = 512;
    this.strip = this.context.createImageData(PAPER_WIDTH, 1);
    this.clear();
  }

  clear() {
    this.sheet = null;
    this.clearCanvas();
  }

  clearCanvas() {
    this.canvas.height = 512;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.backingRows = 512;
  }

  setSheet(sheet) {
    this.sheet = sheet;
    this.redraw();
  }

  ensureRows(rows) {
    if (rows <= this.backingRows) return;
    let next = this.backingRows;
    while (next < rows) next += 512;
    const old = this.canvas;
    const replacement = document.createElement('canvas');
    replacement.width = PAPER_WIDTH;
    replacement.height = next;
    const context = replacement.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.drawImage(old, 0, 0);
    this.canvas.width = PAPER_WIDTH;
    this.canvas.height = next;
    this.context = this.canvas.getContext('2d');
    this.context.imageSmoothingEnabled = false;
    this.context.drawImage(replacement, 0, 0);
    this.backingRows = next;
    this.strip = this.context.createImageData(PAPER_WIDTH, 1);
  }

  appendRow(shades) {
    if (!this.sheet) return;
    const y = this.sheet.rowCount - 1;
    this.ensureRows(y + 1);
    const data = this.strip.data;
    for (let x = 0; x < PAPER_WIDTH; x++) {
      const color = DISPLAY_SHADES[shades ? shades[x] & 3 : 0];
      const px = x * 4;
      data[px] = color[0];
      data[px + 1] = color[1];
      data[px + 2] = color[2];
      data[px + 3] = color[3];
    }
    this.context.putImageData(this.strip, 0, y);
  }

  redraw() {
    const sheet = this.sheet;
    this.clearCanvas();
    if (!sheet) return;
    this.sheet = sheet;
    this.ensureRows(sheet.rowCount);
    for (let y = 0; y < this.sheet.rowCount; y++) {
      const shades = this.sheet.rows[y];
      const data = this.strip.data;
      for (let x = 0; x < PAPER_WIDTH; x++) {
        const color = DISPLAY_SHADES[shades ? shades[x] & 3 : 0];
        const px = x * 4;
        data[px] = color[0];
        data[px + 1] = color[1];
        data[px + 2] = color[2];
        data[px + 3] = color[3];
      }
      this.context.putImageData(this.strip, 0, y);
    }
  }
}

export { DISPLAY_SHADES, EXPORT_SHADES };
