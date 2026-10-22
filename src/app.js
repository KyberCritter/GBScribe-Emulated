/**
 * GBScribe × Game Boy Printer — demo orchestration.
 *
 * Mounts the device UI, boots the GBScribe ROM in GBA.js, plugs the emulated
 * printer into the GBA's GPIO link port, and wires the paper/export UI.
 *
 * MIT License. See LICENSE.md.
 */

import { GBPrinterDevice, PAPER_FULL_ROLL_ROWS, STATUS } from './printer/gb-printer.js';
import { PaperStore, PaperCanvasView, PaperSheet, PAPER_WIDTH, renderSheetToCanvas } from './printer/paper.js';
import {
  downloadBlob,
  printSheets,
  sheetToBmpBlob,
  sheetToPngBlob,
  sheetsToPdfBlob,
  timestamp,
} from './export/exporters.js';
import { buildTemplate } from './ui/template.js';
import { buildStyles } from './ui/styles.js';
import { icons } from './ui/icons.js';
import { SoundBoard } from './ui/sound.js';
import { installGbaLinkPort } from './linkport/gba-linkport.js';

const BUTTON_INDEX = {
  A: 0,
  B: 1,
  SELECT: 2,
  START: 3,
  RIGHT: 4,
  LEFT: 5,
  UP: 6,
  DOWN: 7,
  R: 8,
  L: 9,
};

const DEFAULT_BINDINGS = {
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  A: 'KeyZ',
  B: 'KeyX',
  L: 'KeyA',
  R: 'KeyS',
  START: 'Enter',
  SELECT: 'Backspace',
};

const BINDINGS_KEY = 'gbscribe-emulated.bindings.v1';
const SOUND_KEY = 'gbscribe-emulated.sound.v1';
const MM_PER_DOT = 38 / 160;
const VENDOR_SCRIPTS = [
  'util.js',
  'core.js',
  'arm.js',
  'thumb.js',
  'mmu.js',
  'io.js',
  'audio.js',
  'video.js',
  'video/proxy.js',
  'video/software.js',
  'irq.js',
  'keypad.js',
  'sio.js',
  'savedata.js',
  'gpio.js',
  'gba.js',
];

let vendorLoader = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.dataset.gbsVendor = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureVendor(baseUrl) {
  if (typeof window !== 'undefined' && window.GameBoyAdvance) return;
  if (!vendorLoader) {
    vendorLoader = (async () => {
      const base = String(baseUrl).replace(/\/?$/, '/');
      for (const file of VENDOR_SCRIPTS) {
        await loadScript(base + file);
      }
      if (!window.GameBoyAdvance) throw new Error('GBA.js did not initialise');
    })();
  }
  await vendorLoader;
}

async function fetchBuffer(url) {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
  return await response.arrayBuffer();
}

function formatLength(rows) {
  const mm = rows * MM_PER_DOT;
  if (mm >= 1000) return `${(mm / 1000).toFixed(2)} m`;
  if (mm >= 100) return `${(mm / 10).toFixed(1)} cm`;
  return `${Math.round(mm)} mm`;
}

function formatKey(code) {
  if (!code) return '—';
  if (/^Key([A-Z])$/.test(code)) return code.slice(3);
  if (/^Digit([0-9])$/.test(code)) return code.slice(5);
  const named = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Enter: 'Enter',
    NumpadEnter: 'Num Enter',
    Backspace: 'Backspace',
    Space: 'Space',
    Tab: 'Tab',
    Escape: 'Esc',
    ShiftLeft: 'L Shift',
    ShiftRight: 'R Shift',
    ControlLeft: 'L Ctrl',
    ControlRight: 'R Ctrl',
    AltLeft: 'L Alt',
    AltRight: 'R Alt',
    Comma: ',',
    Period: '.',
    Slash: '/',
    Semicolon: ';',
    Quote: "'",
    BracketLeft: '[',
    BracketRight: ']',
    Backslash: '\\',
    Minus: '-',
    Equal: '=',
    Backquote: '`',
  };
  return named[code] || code.replace(/^Numpad/, 'Num ').replace(/^Key/, '');
}

function loadLocal(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveLocal(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function mountDemo(host, options = {}) {
  const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
  const fontUrl = options.fontUrl || new URL('../assets/fonts/PressStart2P-Regular.woff2', import.meta.url).href;
  // Chromium does not consistently register @font-face rules declared inside a
  // shadow root, so register the pixel face on the document once.
  if (!document.getElementById('gbs-pixel-font')) {
    const fontStyle = document.createElement('style');
    fontStyle.id = 'gbs-pixel-font';
    fontStyle.textContent = `@font-face {
      font-family: "GBS Pixel";
      src: url("${fontUrl}") format("woff2");
      font-display: swap;
      font-weight: 400;
    }`;
    document.head.appendChild(fontStyle);
  }
  shadow.innerHTML = `<style>${buildStyles()}</style>${buildTemplate()}`;
  const demo = new GBScribeDemo(host, shadow, options);
  demo.init();
  return demo;
}

class GBScribeDemo {
  constructor(host, shadow, options) {
    this.host = host;
    this.shadow = shadow;
    this.options = options;
    this.refs = this.queryRefs();
    this.printer = null;
    this.gba = null;
    this.romBuffer = null;
    this.loaded = false;
    this.destroyed = false;
    this.demoRunning = false;
    this.listeningAction = null;
    this.keyboardActive = false;
    this.held = new Map();
    this.abort = new AbortController();
    this.uiDirty = false;
    this.followPaper = true;
    this.viewSheetId = null;
    this.toastTimer = null;
    this.bindings = { ...DEFAULT_BINDINGS, ...loadLocal(BINDINGS_KEY, {}) };
    this.muted = loadLocal(SOUND_KEY, false);
    this.sound = new SoundBoard({ muted: this.muted });
    this.paperStore = new PaperStore({ onChange: (type, sheet, store) => this.onPaperChange(type, sheet, store) });
    this.paperView = new PaperCanvasView(this.refs.paperCanvas, { scale: 2 });
    this.printer = new GBPrinterDevice({
      onEvent: (event) => this.onPrinterEvent(event),
      printSpeed: 17,
      feedSpeed: 11,
    });
    this.attachUi();
    this.updateMuteUi();
    this.updateUI();
    this.tick = this.tick.bind(this);
    this.raf = requestAnimationFrame(this.tick);
    requestAnimationFrame(() => this.layoutCable());
    setTimeout(() => this.layoutCable(), 350);
    setTimeout(() => this.layoutCable(), 1200);
  }

  queryRefs() {
    const q = (selector) => this.shadow.querySelector(selector);
    const qa = (selector) => Array.from(this.shadow.querySelectorAll(selector));
    return {
      root: q('[data-root]'),
      stage: q('.gbs-stage'),
      cable: q('[data-cable]'),
      cablePath: q('[data-cable-path]'),
      cableHighlight: q('[data-cable-highlight]'),
      portGba: q('[data-port-gba]'),
      portPrinter: q('[data-port-printer]'),
      screen: q('[data-screen]'),
      loading: q('[data-loading]'),
      printerBody: q('[data-printer-body]'),
      paper: q('[data-paper]'),
      paperClip: q('[data-paper-clip]'),
      paperCanvas: q('[data-paper-canvas]'),
      paperScroll: q('[data-paper-scroll]'),
      paperEmpty: q('[data-paper-empty]'),
      tearTab: q('[data-tear-tab]'),
      status: q('[data-status]'),
      statusLed: q('[data-status-led]'),
      pilot: q('[data-pilot]'),
      linkPilot: q('[data-link-pilot]'),
      rollFill: q('[data-roll-fill]'),
      rollLabel: q('[data-roll-label]'),
      rollText: q('[data-roll-text]'),
      gbaLed: q('[data-gba-led]'),
      saveHint: q('[data-save-hint]'),
      muteLabel: q('[data-mute-label]'),
      pages: q('[data-pages]'),
      pageList: q('[data-page-list]'),
      pagesCount: q('[data-pages-count]'),
      toast: q('[data-toast]'),
      bindings: q('[data-bindings]'),
      dialogs: {
        help: q('[data-dialog="help"]'),
        controls: q('[data-dialog="controls"]'),
        paper: q('[data-dialog="paper"]'),
      },
      powerButtons: qa('[data-action="power"]'),
      tearButtons: qa('[data-action="tear"]'),
      feedButtons: qa('[data-action="feed"]'),
      demoButtons: qa('[data-action="demo"]'),
      exportButtons: qa('[data-export]'),
      pageButtons: qa('[data-page-action]'),
      dialogRollFill: q('[data-dialog-roll-fill]'),
      dialogRollPercent: q('[data-dialog-roll-percent]'),
      dialogRollMeters: q('[data-dialog-roll-meters]'),
      coverState: q('[data-cover-state]'),
      coverButton: q('[data-paper-cover]'),
      removeRollButton: q('[data-paper-remove]'),
    };
  }

  init() {
    this.showLoading('Loading GBScribe…');
    this.boot().catch((error) => {
      console.error(error);
      this.loaded = false;
      this.showLoading('Could not start the demo.\n\n' + (error.message || 'Unknown error') + '\n\nServe the folder over HTTP (GitHub Pages or a local server), not file://.');
      this.toast('The emulator could not start. See the message on the GBA screen.', true);
      this.updateUI();
    });
  }

  async boot() {
    this.renderBindings();
    this.renderPages();
    await ensureVendor(
      this.options.vendorBase ||
        new URL('../vendor/gbajs/js/', import.meta.url).href,
    );
    this.linkPort = installGbaLinkPort();
    await this.loadEmulator();
  }

  async loadEmulator() {
    const romUrl =
      this.options.romUrl ||
      new URL('../assets/roms/GBScribe.gba', import.meta.url).href;
    const biosUrl =
      this.options.biosUrl ||
      new URL('../vendor/gbajs/resources/bios.bin', import.meta.url).href;
    const [bios, rom] = await Promise.all([fetchBuffer(biosUrl), fetchBuffer(romUrl)]);
    if (!window.GameBoyAdvance) throw new Error('GBA.js is unavailable');

    const gba = new window.GameBoyAdvance();
    gba.logLevel = gba.LOG_ERROR | gba.LOG_WARN;
    gba.setLogger((level, message) => {
      if (level <= gba.LOG_WARN) console.warn('[GBScribe]', message);
    });
    gba.setCanvasDirect(this.refs.screen);
    gba.setBios(bios);
    if (!gba.setRom(rom)) throw new Error('The GBScribe ROM could not be loaded');

    // The printer is a device on the general-purpose link port. It survives
    // sio.clear(), but attaching again is harmless and explicit.
    gba.sio.attachDevice(this.printer);
    gba.audio.masterVolume = this.muted ? 0 : 0.55;
    gba.audio.pause(false);

    this.gba = gba;
    this.romBuffer = rom;
    gba.runStable();
    this.loaded = true;
    this.refs.gbaLed.classList.remove('is-off');
    await sleep(650);
    this.refs.loading.classList.add('is-hidden');
    this.updateUI();
    this.layoutCable();
    this.toast('GBScribe is ready. Click Start, then choose “Print test page”.', false, 5200);
  }

  showLoading(message) {
    this.refs.loading.classList.remove('is-hidden');
    this.refs.loading.textContent = '';
    const spinner = document.createElement('span');
    spinner.className = 'gbs-spinner';
    const text = document.createElement('span');
    text.textContent = message;
    text.style.whiteSpace = 'pre-wrap';
    this.refs.loading.append(spinner, text);
  }

  /* ------------------------------------------------------------------ UI */

  attachUi() {
    const signal = this.abort.signal;
    const $ = (selector) => this.shadow.querySelector(selector);
    const $$ = (selector) => Array.from(this.shadow.querySelectorAll(selector));

    this.refs.root.addEventListener(
      'pointerdown',
      () => {
        this.setKeyboardActive(true);
        this.sound.ensure();
        if (this.gba && this.gba.audio && this.gba.audio.context) {
          this.gba.audio.context.resume().catch(() => {});
        }
      },
      { signal },
    );
    this.refs.root.addEventListener('focusin', () => this.setKeyboardActive(true), { signal });

    document.addEventListener(
      'pointerdown',
      (event) => {
        if (!this.host.contains(event.target)) this.setKeyboardActive(false);
      },
      { capture: true, signal },
    );

    window.addEventListener('keydown', (event) => this.onKeyDown(event), { signal });
    window.addEventListener('keyup', (event) => this.onKeyUp(event), { signal });
    window.addEventListener('blur', () => this.releaseAll(), { signal });

    for (const button of $$('[data-button]')) {
      button.addEventListener(
        'pointerdown',
        (event) => {
          event.preventDefault();
          button.setPointerCapture?.(event.pointerId);
          this.pressButton(button.dataset.button, `pointer:${event.pointerId}`);
        },
        { signal },
      );
      const release = (event) => this.releaseButton(button.dataset.button, `pointer:${event.pointerId}`);
      button.addEventListener('pointerup', release, { signal });
      button.addEventListener('pointercancel', release, { signal });
      button.addEventListener('lostpointercapture', release, { signal });
      button.addEventListener('contextmenu', (event) => event.preventDefault(), { signal });
    }

    for (const button of $$('[data-action="power"]')) {
      button.addEventListener('click', () => this.togglePower(), { signal });
    }
    for (const button of $$('[data-action="paper"]')) {
      button.addEventListener('click', () => this.openDialog('paper'), { signal });
      if (button.getAttribute('role') === 'button') {
        button.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.openDialog('paper');
          }
        }, { signal });
      }
    }
    for (const button of $$('[data-action="tear"]')) {
      button.addEventListener('click', () => this.tearPaper(), { signal });
    }
    for (const button of $$('[data-action="help"]')) {
      button.addEventListener('click', () => this.openDialog('help'), { signal });
    }
    for (const button of $$('[data-action="controls"]')) {
      button.addEventListener('click', () => this.openDialog('controls'), { signal });
    }
    for (const button of $$('[data-action="reset"]')) {
      button.addEventListener('click', () => this.resetGba(), { signal });
    }
    for (const button of $$('[data-action="mute"]')) {
      button.addEventListener('click', () => this.toggleMute(), { signal });
    }
    for (const button of $$('[data-action="demo"]')) {
      button.addEventListener('click', () => this.runDemo(), { signal });
    }
    for (const button of $$('[data-export]')) {
      button.addEventListener('click', () => this.exportAll(button.dataset.export), { signal });
    }

    const feed = $('.gbs-feed');
    if (feed) {
      feed.addEventListener(
        'pointerdown',
        (event) => {
          event.preventDefault();
          feed.setPointerCapture?.(event.pointerId);
          feed.classList.add('is-pressed');
          this.printer.startFeed();
        },
        { signal },
      );
      const stop = () => {
        feed.classList.remove('is-pressed');
        this.printer.stopFeed();
      };
      feed.addEventListener('pointerup', stop, { signal });
      feed.addEventListener('pointercancel', stop, { signal });
      feed.addEventListener('lostpointercapture', stop, { signal });
    }
    for (const button of this.refs.feedButtons) {
      if (button.classList.contains('gbs-feed')) continue;
      button.addEventListener('click', () => {
        this.printer.feedRows(8);
        this.sound.feed();
        this.scheduleUI();
      }, { signal });
    }

    this.refs.tearTab.addEventListener('pointerdown', (event) => this.beginTearDrag(event), { signal });
    this.refs.tearTab.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.tearPaper();
      }
    }, { signal });
    // Mouse users can grab the paper itself, not only the tear tab.
    this.refs.paperClip.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') this.beginTearDrag(event);
    }, { signal });

    this.refs.paperScroll.addEventListener(
      'scroll',
      () => {
        const el = this.refs.paperScroll;
        this.followPaper = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
      },
      { passive: true, signal },
    );

    for (const dialog of Object.values(this.refs.dialogs)) {
      if (!dialog) continue;
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
      }, { signal });
      dialog.addEventListener('close', () => {
        if (!Object.values(this.refs.dialogs).some((candidate) => candidate?.open)) {
          this.openDialogElement = null;
        }
        this.scheduleUI();
      }, { signal });
    }
    for (const close of $$('[data-close]')) {
      close.addEventListener('click', () => close.closest('dialog')?.close(), { signal });
    }

    this.refs.coverButton.addEventListener('click', () => {
      this.printer.setCover(this.printer.coverClosed);
      this.scheduleUI();
    }, { signal });
    this.refs.removeRollButton.addEventListener('click', () => {
      this.printer.setCover(true);
      this.printer.removeRoll();
      this.sound.error();
      this.toast('Roll removed. Insert a new roll to keep printing.', true);
      this.scheduleUI();
    }, { signal });
    const replace = $('[data-paper-replace]');
    replace?.addEventListener('click', () => {
      this.printer.replaceRoll(PAPER_FULL_ROLL_ROWS);
      this.sound.beep(520, 0.08);
      this.toast('New thermal paper roll loaded.', false);
      this.scheduleUI();
    }, { signal });

    this.refs.pageList.addEventListener('click', (event) => this.onPageAction(event), { signal });

    for (const button of $$('[data-rebind]')) {
      button.addEventListener('click', () => this.startRebind(button.dataset.rebind), { signal });
    }
    $('[data-reset-bindings]')?.addEventListener('click', () => {
      this.bindings = { ...DEFAULT_BINDINGS };
      saveLocal(BINDINGS_KEY, this.bindings);
      this.renderBindings();
      this.toast('Controls reset to defaults.');
    }, { signal });

    // Keep the paper geometry correct if the blog resizes the column.
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.paperStore.current && this.paperStore.current.rowCount) {
          this.updatePaperGeometry(this.paperStore.current);
        }
        this.layoutCable();
      });
      this.resizeObserver.observe(this.refs.paperScroll);
      this.resizeObserver.observe(this.refs.root);
      window.addEventListener('resize', () => this.layoutCable(), { signal });
    }
  }

  setKeyboardActive(active) {
    this.keyboardActive = Boolean(active);
    if (this.refs.saveHint) {
      this.refs.saveHint.textContent = this.keyboardActive
        ? 'Keyboard active · GBScribe saves to this browser'
        : 'Click the GBA to use the keyboard';
    }
  }

  layoutCable() {
    const { stage, cable, cablePath, cableHighlight, portGba, portPrinter } = this.refs;
    if (!stage || !cable || !portGba || !portPrinter) return;
    if (window.matchMedia('(max-width: 1040px)').matches) return;
    const stageRect = stage.getBoundingClientRect();
    const gbaRect = portGba.getBoundingClientRect();
    const printerRect = portPrinter.getBoundingClientRect();
    if (!stageRect.width || !stageRect.height) return;
    const sx = gbaRect.left + gbaRect.width / 2 - stageRect.left;
    const sy = gbaRect.top - stageRect.top + 1;
    const ex = printerRect.right - stageRect.left + 2;
    const ey = printerRect.top + printerRect.height / 2 - stageRect.top;
    const lift = Math.max(48, Math.min(150, (ex - sx) * 0.26));
    const d = `M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${(sx + lift).toFixed(1)} ${(sy - lift).toFixed(1)}, ${(ex + lift * 0.55).toFixed(1)} ${(ey - lift * 1.25).toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`;
    cable.setAttribute('viewBox', `0 0 ${stageRect.width.toFixed(1)} ${stageRect.height.toFixed(1)}`);
    cablePath.setAttribute('d', d);
    cableHighlight.setAttribute('d', d);
  }

  tick() {
    if (this.destroyed) return;
    if (this.printer) this.printer.update(performance.now());
    if (this.uiDirty) {
      this.uiDirty = false;
      this.updateUI();
    }
    this.raf = requestAnimationFrame(this.tick);
  }

  scheduleUI() {
    this.uiDirty = true;
  }

  /* --------------------------------------------------------------- input */

  pressButton(action, source) {
    if (!this.gba || !BUTTON_INDEX.hasOwnProperty(action)) return;
    let sources = this.held.get(action);
    if (!sources) {
      sources = new Set();
      this.held.set(action, sources);
    }
    const wasEmpty = sources.size === 0;
    sources.add(source);
    if (wasEmpty) {
      this.gba.keypad.currentDown &= ~(1 << BUTTON_INDEX[action]);
      this.markButton(action, true);
    }
  }

  releaseButton(action, source) {
    const sources = this.held.get(action);
    if (!sources) return;
    sources.delete(source);
    if (sources.size === 0) {
      this.held.delete(action);
      if (this.gba) this.gba.keypad.currentDown |= 1 << BUTTON_INDEX[action];
      this.markButton(action, false);
    }
  }

  releaseAll() {
    for (const action of Array.from(this.held.keys())) {
      this.held.delete(action);
      if (this.gba) this.gba.keypad.currentDown |= 1 << BUTTON_INDEX[action];
      this.markButton(action, false);
    }
  }

  markButton(action, down) {
    for (const element of this.shadow.querySelectorAll(`[data-button="${action}"]`)) {
      element.classList.toggle('is-pressed', down);
    }
  }

  onKeyDown(event) {
    if (this.listeningAction) {
      event.preventDefault();
      event.stopPropagation();
      if (event.code === 'Escape') {
        this.cancelRebind();
        return;
      }
      this.bindings[this.listeningAction] = event.code;
      saveLocal(BINDINGS_KEY, this.bindings);
      const action = this.listeningAction;
      this.listeningAction = null;
      this.renderBindings();
      this.toast(`${action} is now ${formatKey(event.code)}.`);
      return;
    }

    if (!this.keyboardActive) return;
    if (this.openDialogElement) return;
    if (event.target && event.target.closest && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const action = this.actionForKey(event.code);
    if (!action) return;
    event.preventDefault();
    if (event.repeat) return;
    this.pressButton(action, `key:${event.code}`);
  }

  onKeyUp(event) {
    if (this.listeningAction) return;
    const action = this.actionForKey(event.code);
    if (action) this.releaseButton(action, `key:${event.code}`);
  }

  actionForKey(code) {
    for (const [action, binding] of Object.entries(this.bindings)) {
      if (binding === code) return action;
    }
    return null;
  }

  async tap(action, hold = 95) {
    this.pressButton(action, 'demo');
    await sleep(hold);
    this.releaseButton(action, 'demo');
    await sleep(80);
  }

  /* -------------------------------------------------------------- rebind */

  startRebind(action) {
    this.listeningAction = action;
    for (const element of this.shadow.querySelectorAll('[data-binding]')) {
      const isTarget = element.dataset.binding === action;
      element.classList.toggle('is-listening', isTarget);
      if (isTarget) element.textContent = 'Press a key…';
    }
    for (const button of this.shadow.querySelectorAll('[data-rebind]')) {
      button.textContent = button.dataset.rebind === action ? 'Listening…' : 'Rebind';
    }
  }

  cancelRebind() {
    this.listeningAction = null;
    this.renderBindings();
  }

  renderBindings() {
    for (const element of this.shadow.querySelectorAll('[data-binding]')) {
      const action = element.dataset.binding;
      element.classList.remove('is-listening');
      element.textContent = formatKey(this.bindings[action]);
    }
    for (const button of this.shadow.querySelectorAll('[data-rebind]')) {
      button.textContent = 'Rebind';
    }
  }

  /* -------------------------------------------------------------- dialogs */

  openDialog(name) {
    const dialog = this.refs.dialogs[name];
    if (!dialog) return;
    if (name === 'paper') this.updatePaperDialog();
    if (!dialog.open) dialog.showModal();
    this.openDialogElement = dialog;
    this.scheduleUI();
  }

  /* --------------------------------------------------------------- power */

  togglePower() {
    const turningOn = !this.printer.powered;
    this.printer.setPower(turningOn);
    this.sound.ensure();
    if (turningOn) this.sound.beep(440, 0.08);
    else this.sound.error();
    this.scheduleUI();
  }

  toggleMute() {
    this.muted = !this.muted;
    saveLocal(SOUND_KEY, this.muted);
    this.sound.setMuted(this.muted);
    if (this.gba && this.gba.audio) {
      this.gba.audio.masterVolume = this.muted ? 0 : 0.55;
    }
    this.updateMuteUi();
    this.scheduleUI();
  }

  updateMuteUi() {
    const button = this.shadow.querySelector('[data-mute-button]');
    if (!button) return;
    const icon = this.muted ? icons.mute : icons.sound;
    button.querySelector('svg')?.remove();
    button.insertAdjacentHTML('afterbegin', icon);
    if (this.refs.muteLabel) this.refs.muteLabel.textContent = this.muted ? 'Sound off' : 'Sound on';
    button.setAttribute('aria-pressed', String(!this.muted));
  }

  /* -------------------------------------------------------------- printer */

  onPrinterEvent(event) {
    switch (event.type) {
      case 'print-start':
        this.paperStore.beginJob();
        this.printerJob = event;
        this.sound.startMotor();
        this.scheduleUI();
        break;
      case 'row':
        this.paperStore.appendRow(event.shades);
        this.scheduleUI();
        break;
      case 'print-done':
        this.paperStore.endJob();
        this.sound.stopMotor();
        this.sound.success();
        this.printerJob = null;
        this.toast('Print complete. Drag the paper down to tear it off.', false, 4200);
        this.scheduleUI();
        break;
      case 'feed-start':
        this.sound.feed();
        this.scheduleUI();
        break;
      case 'feed-stop':
        this.scheduleUI();
        break;
      case 'paper-out':
        this.sound.stopMotor();
        this.toast('Out of paper. Open the paper compartment and insert a new roll.', true, 5200);
        this.scheduleUI();
        break;
      case 'low-paper':
        this.toast('The paper roll is running low.', false);
        this.scheduleUI();
        break;
      case 'error':
        this.sound.stopMotor();
        this.toast(event.message || 'Printer error.', true, 5200);
        this.scheduleUI();
        break;
      case 'power':
        this.sound.stopMotor();
        this.toast(event.on ? 'Printer powered on.' : 'Printer off. GBScribe will report it as disconnected.', false);
        this.scheduleUI();
        break;
      case 'cover':
        if (event.open) this.toast('Paper cover open. Close it to print.', false);
        this.sound.stopMotor();
        this.scheduleUI();
        break;
      case 'roll':
        this.scheduleUI();
        break;
      case 'protocol-error':
        console.warn('[GB Printer]', event);
        break;
      default:
        this.scheduleUI();
        break;
    }
  }

  onPaperChange(type, sheet) {
    if (type === 'tear' || type === 'remove' || type === 'clear') {
      this.renderPages();
    }
    if (!sheet) {
      // Non-row notifications (end/remove/clear) must not collapse the strip.
      this.scheduleUI();
      return;
    }
    if (sheet.rowCount > 0) {
      this.refs.paper.hidden = false;
      this.refs.paperEmpty.hidden = true;
      this.refs.paper.classList.remove('is-empty');
      if (this.viewSheetId !== sheet.id) {
        this.viewSheetId = sheet.id;
        this.paperView.setSheet(sheet);
      } else if (type === 'row') {
        this.paperView.appendRow(sheet.rows[sheet.rowCount - 1]);
      }
      this.updatePaperGeometry(sheet);
      if (this.followPaper) {
        requestAnimationFrame(() => {
          const scroll = this.refs.paperScroll;
          scroll.scrollTop = scroll.scrollHeight - scroll.clientHeight;
          requestAnimationFrame(() => {
            scroll.scrollTop = scroll.scrollHeight - scroll.clientHeight;
          });
        });
      }
    } else {
      this.refs.paper.hidden = true;
      this.refs.paper.classList.add('is-empty');
      this.refs.paperEmpty.hidden = false;
    }
    if (type === 'tear') {
      this.viewSheetId = null;
      this.paperView.clear();
      this.refs.paper.hidden = true;
      this.refs.paper.classList.add('is-empty');
      this.refs.paperEmpty.hidden = this.paperStore.hasPaper;
      this.renderPages();
    }
    this.scheduleUI();
  }

  updatePaperGeometry(sheet) {
    if (!sheet || sheet.rowCount <= 0) {
      this.refs.paperClip.style.aspectRatio = `${PAPER_WIDTH} / 1`;
      return;
    }
    this.refs.paperClip.style.aspectRatio = `${PAPER_WIDTH} / ${sheet.rowCount}`;
  }

  beginTearDrag(event) {
    if (!this.paperStore.hasPaper) return;
    event.preventDefault();
    const startY = event.clientY;
    let torn = false;
    const target = event.currentTarget || this.refs.tearTab;
    target.setPointerCapture?.(event.pointerId);

    const move = (moveEvent) => {
      const dy = moveEvent.clientY - startY;
      if (dy > 12) this.refs.paper.classList.add('is-near');
      if (dy > 52) {
        this.refs.paper.classList.add('is-tearing');
        torn = true;
      } else {
        this.refs.paper.classList.remove('is-tearing');
      }
    };
    const end = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', end);
      this.refs.paper.classList.remove('is-near');
      if (torn) {
        this.tearPaper();
      } else {
        this.refs.paper.classList.remove('is-tearing');
      }
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end, { once: true });
    target.addEventListener('pointercancel', end, { once: true });
  }

  tearPaper() {
    if (!this.printer || !this.paperStore.hasPaper) {
      this.toast('There is no printed paper to tear off yet.');
      return;
    }
    const wasPrinting = Boolean(this.printer.printJob);
    this.refs.paper.classList.add('is-tearing');
    this.sound.tear();
    const sheet = this.paperStore.tear();
    setTimeout(() => {
      this.refs.paper.classList.remove('is-tearing', 'is-near');
      this.paperView.clear();
      this.viewSheetId = null;
      this.refs.paper.hidden = true;
      this.refs.paper.classList.add('is-empty');
      this.refs.paperEmpty.hidden = false;
      this.renderPages();
      this.scheduleUI();
    }, 180);
    if (sheet) {
      const message = wasPrinting
        ? `Torn off ${formatLength(sheet.rowCount)} of paper mid-print — a fresh sheet is feeding.`
        : `Torn off ${formatLength(sheet.rowCount)} of paper. It is now in Printed pages.`;
      this.toast(message, false, 4200);
    }
  }

  /* ---------------------------------------------------------------- pages */

  renderPages() {
    const detached = this.paperStore.detached;
    if (!detached.length) {
      this.refs.pages.hidden = true;
      this.refs.pagesCount.textContent = '';
      this.refs.pageList.textContent = '';
      this.scheduleUI();
      return;
    }
    this.refs.pages.hidden = false;
    this.refs.pagesCount.textContent = `${detached.length} sheet${detached.length === 1 ? '' : 's'} torn off`;
    const fragment = document.createDocumentFragment();

    for (const sheet of detached.slice().reverse()) {
      const card = document.createElement('article');
      card.className = 'gbs-page-card';
      card.dataset.sheetId = sheet.id;

      const thumb = document.createElement('div');
      thumb.className = 'gbs-page-thumb';
      const image = document.createElement('img');
      image.alt = `Printed sheet ${sheet.label || ''}, showing the top of the receipt`;
      const preview = new PaperSheet({ createdAt: sheet.createdAt });
      preview.rows = sheet.rows.slice(0, 84);
      const canvas = renderSheetToCanvas(preview, 1);
      image.src = canvas.toDataURL('image/png');
      thumb.appendChild(image);

      const meta = document.createElement('div');
      meta.className = 'gbs-page-meta';
      const name = document.createElement('strong');
      name.textContent = sheet.label || 'Printed sheet';
      const size = document.createElement('span');
      size.textContent = `${formatLength(sheet.rowCount)} · ${sheet.rowCount} rows`;
      meta.append(name, size);

      const actions = document.createElement('div');
      actions.className = 'gbs-page-actions';
      for (const [action, label] of [
        ['png', 'PNG'],
        ['bmp', 'BMP'],
        ['pdf', 'PDF'],
        ['print', 'Print'],
      ]) {
        const button = document.createElement('button');
        button.className = 'gbs-btn gbs-small';
        button.type = 'button';
        button.dataset.pageAction = action;
        button.dataset.sheetId = sheet.id;
        button.textContent = label;
        actions.appendChild(button);
      }

      const remove = document.createElement('button');
      remove.className = 'gbs-btn gbs-small is-quiet gbs-page-remove';
      remove.type = 'button';
      remove.dataset.pageAction = 'delete';
      remove.dataset.sheetId = sheet.id;
      remove.setAttribute('aria-label', 'Delete this printed page');
      remove.innerHTML = icons.trash;

      card.append(thumb, meta, actions, remove);
      fragment.appendChild(card);
    }
    this.refs.pageList.replaceChildren(fragment);
    this.scheduleUI();
  }

  onPageAction(event) {
    const button = event.target.closest('[data-page-action]');
    if (!button) return;
    const sheet = this.paperStore.detached.find((candidate) => candidate.id === button.dataset.sheetId);
    if (!sheet) return;
    const action = button.dataset.pageAction;
    if (action === 'delete') {
      this.paperStore.remove(sheet.id);
      this.toast('Printed page removed.');
      return;
    }
    if (action === 'print') {
      printSheets([sheet], { title: 'GBScribe print' });
      return;
    }
    this.exportSheets([sheet], action);
  }

  async exportAll(kind) {
    const sheets = this.paperStore.exportableSheets();
    if (!sheets.length) {
      this.toast('Print something first — the export tray is empty.');
      return;
    }
    if (kind === 'print') {
      if (!printSheets(sheets, { title: 'GBScribe print' })) {
        this.toast('Your browser blocked the print window. Allow pop-ups and try again.', true);
      }
      return;
    }
    await this.exportSheets(sheets, kind);
  }

  async exportSheets(sheets, kind) {
    try {
      const stamp = timestamp();
      if (kind === 'pdf') {
        const blob = sheetsToPdfBlob(sheets, 'GBScribe print');
        downloadBlob(blob, `gbscribe-paper-${stamp}.pdf`);
        this.toast(`Exported ${sheets.length} page${sheets.length === 1 ? '' : 's'} as PDF.`);
        return;
      }
      for (let index = 0; index < sheets.length; index++) {
        const sheet = sheets[index];
        let blob;
        if (kind === 'png') blob = await sheetToPngBlob(sheet, 4);
        else if (kind === 'bmp') blob = sheetToBmpBlob(sheet, 4);
        else return;
        const suffix = sheets.length > 1 ? `-${String(index + 1).padStart(2, '0')}` : '';
        downloadBlob(blob, `gbscribe-paper-${stamp}${suffix}.${kind}`);
        if (index < sheets.length - 1) await sleep(180);
      }
      this.toast(`Exported ${sheets.length} sheet${sheets.length === 1 ? '' : 's'} as ${kind.toUpperCase()}.`);
    } catch (error) {
      console.error(error);
      this.toast(`Export failed: ${error.message || error}`, true);
    }
  }

  /* --------------------------------------------------------------- status */

  updateUI() {
    if (!this.printer) return;
    const printer = this.printer;
    const powered = printer.powered;
    const printing = Boolean(printer.printJob);
    const feeding = printer.feeding;
    const paperOut = printer.rollRows <= 0;
    const coverOpen = !printer.coverClosed;

    let status = 'Printer ready';
    let ledClass = '';
    if (!powered) {
      status = 'Printer off';
      ledClass = 'off';
    } else if (!coverOpen && paperOut) {
      status = 'Out of paper — replace the roll';
      ledClass = 'error';
    } else if (coverOpen) {
      status = 'Cover open';
      ledClass = 'error';
    } else if (printing) {
      status = `Printing ${Math.round(printer.jobProgress * 100)}%`;
      ledClass = 'busy';
    } else if (feeding) {
      status = 'Feeding paper';
      ledClass = 'busy';
    } else if (printer.rollRows <= printer.lowPaperRows) {
      status = 'Ready · paper low';
    }
    this.refs.status.textContent = status;
    this.refs.statusLed.className = `gbs-status-led ${ledClass}`.trim();
    this.refs.rollFill.style.width = `${printer.paperPercent.toFixed(1)}%`;
    this.refs.rollLabel.textContent = `${Math.round(printer.paperPercent)}%`;
    this.refs.rollText.textContent = `${formatLength(printer.rollRows)} paper`;

    this.refs.pilot.className = 'gbs-pilot';
    if (!powered) {
      // Pilot off.
    } else if (paperOut || coverOpen) {
      this.refs.pilot.classList.add('error');
    } else if (printing || feeding) {
      this.refs.pilot.classList.add('busy');
    } else {
      this.refs.pilot.classList.add('on');
    }
    this.refs.linkPilot.className = `gbs-pilot ${powered ? 'on' : ''}`.trim();
    this.refs.printerBody.classList.toggle('is-printing', printing);
    this.refs.printerBody.classList.toggle('is-feeding', feeding && !printing);

    for (const button of this.refs.powerButtons) {
      button.classList.toggle('is-on', powered);
      button.setAttribute('aria-pressed', String(powered));
    }

    const feedDisabled = !powered || coverOpen || paperOut || printing;
    for (const button of this.refs.feedButtons) {
      button.disabled = feedDisabled;
    }
    const noPaper = !this.paperStore.hasPaper;
    for (const button of this.refs.tearButtons) {
      button.disabled = noPaper;
    }
    const nothingToExport = this.paperStore.exportableSheets().length === 0;
    for (const button of this.refs.exportButtons) {
      button.disabled = nothingToExport;
    }
    for (const button of this.refs.demoButtons) {
      button.disabled = !this.loaded;
    }
    if (this.refs.gbaLed) this.refs.gbaLed.classList.toggle('is-off', !this.loaded);
    this.updatePaperDialog();
  }

  updatePaperDialog() {
    if (!this.refs.dialogRollFill) return;
    const printer = this.printer;
    const percent = printer.paperPercent;
    this.refs.dialogRollFill.style.width = `${percent.toFixed(1)}%`;
    this.refs.dialogRollPercent.textContent = `${Math.round(percent)}%`;
    this.refs.dialogRollMeters.textContent = formatLength(printer.rollRows);
    this.refs.coverState.textContent = printer.coverClosed ? 'Cover closed' : 'Cover open';
    this.refs.coverState.classList.toggle('is-open', !printer.coverClosed);
    this.refs.coverButton.textContent = printer.coverClosed ? 'Open cover' : 'Close cover';
    this.refs.removeRollButton.disabled = printer.rollRows <= 0;
  }

  /* ----------------------------------------------------------------- demo */

  async runDemo() {
    if (!this.loaded) {
      this.toast('The emulator is still loading.');
      return;
    }
    if (this.demoRunning) return;
    this.demoRunning = true;
    this.openDialogElement = null;
    for (const dialog of Object.values(this.refs.dialogs)) dialog?.close();

    try {
      if (!this.printer.powered) this.printer.setPower(true);
      if (!this.printer.coverClosed) this.printer.setCover(false);
      if (this.printer.rollRows < 600) this.printer.replaceRoll(PAPER_FULL_ROLL_ROWS);
      this.sound.ensure();
      this.toast('Loading GBScribe…', false, 1200);
      await this.resetGba(false);
      await sleep(1400);
      await this.tap('START');
      await sleep(260);
      await this.tap('DOWN');
      await this.tap('DOWN');
      await this.tap('DOWN');
      await sleep(120);
      await this.tap('A');
      await sleep(520);
      await this.tap('A');
      this.toast('Test print started. Watch the paper feed out of the white slot.', false, 4200);
    } catch (error) {
      console.error(error);
      this.toast('The guided demo could not run. Use the GBA buttons manually.', true);
    } finally {
      this.demoRunning = false;
      this.scheduleUI();
    }
  }

  async resetGba(showToast = true) {
    if (!this.gba || !this.romBuffer) return;
    this.releaseAll();
    this.gba.setRom(this.romBuffer);
    this.gba.sio.attachDevice(this.printer);
    this.gba.audio.masterVolume = this.muted ? 0 : 0.55;
    this.gba.audio.pause(false);
    if (showToast) this.toast('GBA reset. GBScribe is back at the title screen.');
    await sleep(120);
  }

  /* ---------------------------------------------------------------- toast */

  toast(message, isError = false, duration = 3200) {
    const element = this.refs.toast;
    if (!element) return;
    element.textContent = message;
    element.classList.toggle('is-error', Boolean(isError));
    element.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => element.classList.remove('show'), duration);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.toastTimer);
    this.abort.abort();
    this.resizeObserver?.disconnect();
    this.sound.stopMotor();
    this.gba?.pause();
  }
}
