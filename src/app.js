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
import {
  LocalStore,
  BINDINGS_KEY,
  SOUND_KEY,
  GUIDE_KEY,
  PAGES_KEY,
} from './persistence.js';

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
    this.pressTimes = new Map();
    this.abort = new AbortController();
    this.uiDirty = false;
    this.followPaper = true;
    this.viewSheetId = null;
    this.toastTimer = null;
    this.guideActive = false;
    this.guideReady = false;
    this.guideRunId = 0;
    this.guideSteps = [];
    this.guideIndex = -1;
    this.guideTargetSpecs = [];
    this.guidePromptShown = false;
    this.guideStatus = null;
    this.store = new LocalStore();
    this.privacyDecided = this.store.decided;
    this.sessionStarted = false;
    this.storageWarningShown = false;
    this.refs.gbaImage.src =
      options.gbaImageUrl || new URL('../assets/img/gba.webp', import.meta.url).href;
    this.refs.printerImage.src =
      options.printerImageUrl || new URL('../assets/img/printer.webp', import.meta.url).href;
    this.bindings = { ...DEFAULT_BINDINGS };
    this.muted = false;
    this.sound = new SoundBoard({ muted: this.muted });
    this.paperStore = new PaperStore({ onChange: (type, sheet, store) => this.onPaperChange(type, sheet, store) });
    this.paperView = new PaperCanvasView(this.refs.paperCanvas, { scale: 2 });
    this.printer = new GBPrinterDevice({
      onEvent: (event) => this.onPrinterEvent(event),
      printSpeed: 50,
      feedSpeed: 32,
    });
    // Start connected so the first print works without an extra power step.
    // The printer's POWER control still turns it off and on.
    this.printer.powered = true;
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
      gbaImage: q('[data-gba-image]'),
      printerImage: q('[data-printer-image]'),
      loading: q('[data-loading]'),
      printerBody: q('[data-printer-body]'),
      paper: q('[data-paper]'),
      paperClip: q('[data-paper-clip]'),
      paperCanvas: q('[data-paper-canvas]'),
      paperScroll: q('[data-paper-scroll]'),
      paperEmpty: q('[data-paper-empty]'),
      tearTab: q('[data-tear-tab]'),
      statusbar: q('[data-statusbar]'),
      status: q('[data-status]'),
      statusLed: q('[data-status-led]'),
      pilot: q('[data-pilot]'),
      linkPilot: q('[data-link-pilot]'),
      rollFill: q('[data-roll-fill]'),
      rollLabel: q('[data-roll-label]'),
      gbaPower: q('[data-gba-power]'),
      muteLabel: q('[data-mute-label]'),
      pages: q('[data-pages]'),
      pageList: q('[data-page-list]'),
      pagesCount: q('[data-pages-count]'),
      toast: q('[data-toast]'),
      guide: q('[data-guide]'),
      guideHole: q('[data-guide-hole]'),
      guideRings: q('[data-guide-rings]'),
      guideCallout: q('[data-guide-callout]'),
      guideTitle: q('[data-guide-title]'),
      guideBody: q('[data-guide-body]'),
      guideHint: q('[data-guide-hint]'),
      guideEnd: q('[data-guide-end]'),
      guideIntro: q('[data-dialog="guide-intro"]'),
      guideYes: q('[data-guide-yes]'),
      guideNo: q('[data-guide-no]'),
      cookieDialog: q('[data-dialog="cookie-policy"]'),
      cookieAccept: q('[data-cookie-accept]'),
      cookieReject: q('[data-cookie-reject]'),
      cookieState: q('[data-cookie-state]'),
      privacyButtons: qa('[data-action="privacy"]'),
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
    if (!this.store.decided) {
      this.showCookiePolicy();
      return;
    }
    this.beginSession();
  }

  beginSession() {
    if (this.sessionStarted) return;
    this.sessionStarted = true;
    this.privacyDecided = true;
    this.applySavedState();
    this.boot().catch((error) => {
      console.error(error);
      this.loaded = false;
      this.showLoading('Could not start the demo.\n\n' + (error.message || 'Unknown error') + '\n\nServe the folder over HTTP (GitHub Pages or a local server), not file://.');
      this.toast('The emulator could not start. See the message on the GBA screen.', true);
      this.updateUI();
    });
  }

  applySavedState() {
    if (!this.store.accepted) {
      this.updateMuteUi();
      this.renderBindings();
      return;
    }
    const savedBindings = this.store.read(BINDINGS_KEY, {});
    if (savedBindings && typeof savedBindings === 'object' && !Array.isArray(savedBindings)) {
      this.bindings = { ...DEFAULT_BINDINGS, ...savedBindings };
    }
    this.muted = Boolean(this.store.read(SOUND_KEY, false));
    this.guideStatus = this.normalizeGuideStatus(this.store.read(GUIDE_KEY, null));
    const savedPages = this.store.read(PAGES_KEY, null);
    if (savedPages) this.paperStore.restore(savedPages);
    this.sound.setMuted(this.muted);
    this.updateMuteUi();
    this.renderBindings();
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
    const retrieveSavedata = gba.retrieveSavedata.bind(gba);
    gba.retrieveSavedata = () => (this.store.accepted ? retrieveSavedata() : false);
    const storeSavedata = gba.storeSavedata.bind(gba);
    gba.storeSavedata = () => {
      if (this.store.accepted) storeSavedata();
    };
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
    this.refs.gbaPower?.classList.add('on');
    await sleep(650);
    this.refs.loading.classList.add('is-hidden');
    this.updateUI();
    this.layoutCable();
    if (!window.matchMedia('(max-width: 640px)').matches) {
      this.toast('GBScribe is ready. Click Start, then choose "Print test page".', false, 5200);
    }
    if (this.shouldShowGuidePrompt()) {
      window.setTimeout(() => this.showGuidePrompt(), 900);
    }
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
    for (const button of $$('[data-action="guide"]')) {
      button.addEventListener('click', () => this.startGuide(), { signal });
    }
    this.refs.guideYes?.addEventListener('click', () => {
      this.refs.guideIntro.close();
      this.startGuide();
    }, { signal });
    this.refs.guideNo?.addEventListener('click', () => {
      this.refs.guideIntro.close();
      this.markGuideStatus('skipped');
      this.toast('You can start the guide anytime from the Guide button.');
    }, { signal });
    for (const button of this.refs.privacyButtons) {
      button.addEventListener('click', () => this.openPrivacySettings(), { signal });
    }
    this.refs.cookieAccept?.addEventListener('click', () => this.chooseStorage('accepted'), { signal });
    this.refs.cookieReject?.addEventListener('click', () => this.chooseStorage('rejected'), { signal });
    this.refs.cookieDialog?.addEventListener('cancel', (event) => event.preventDefault(), { signal });
    this.refs.cookieDialog?.addEventListener('close', () => {
      if (this.openDialogElement === this.refs.cookieDialog) this.openDialogElement = null;
    }, { signal });
    window.addEventListener('pagehide', () => this.persistPages(), { signal });
    this.refs.guideIntro?.addEventListener('click', (event) => {
      if (event.target === this.refs.guideIntro) this.refs.guideIntro.close();
    }, { signal });
    this.refs.guideIntro?.addEventListener('close', () => {
      if (this.openDialogElement === this.refs.guideIntro) this.openDialogElement = null;
    }, { signal });
    this.refs.guideEnd?.addEventListener('click', (event) => {
      event.stopPropagation();
      this.stopGuide(true);
    }, { signal });
    this.refs.guide?.addEventListener('pointerdown', (event) => {
      if (event.target.closest('[data-guide-end]')) return;
      event.preventDefault();
      if (this.guideReady) this.advanceGuide();
    }, { signal });
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
      if (button.classList.contains('gbs-feed') || button.classList.contains('gbs-hit-feed')) continue;
      button.addEventListener('click', () => {
        this.printer.feedRows(8);
        this.sound.feed();
        this.scheduleUI();
      }, { signal });
    }

    const photoFeed = this.shadow.querySelector('.gbs-hit-feed');
    if (photoFeed) {
      photoFeed.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        photoFeed.setPointerCapture?.(event.pointerId);
        photoFeed.classList.add('is-pressed');
        this.printer.startFeed();
      }, { signal });
      const stopFeed = () => {
        photoFeed.classList.remove('is-pressed');
        this.printer.stopFeed();
      };
      photoFeed.addEventListener('pointerup', stopFeed, { signal });
      photoFeed.addEventListener('pointercancel', stopFeed, { signal });
      photoFeed.addEventListener('lostpointercapture', stopFeed, { signal });
      photoFeed.addEventListener('contextmenu', (event) => event.preventDefault(), { signal });
      photoFeed.addEventListener('selectstart', (event) => event.preventDefault(), { signal });
      photoFeed.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.printer.startFeed();
        }
      }, { signal });
      photoFeed.addEventListener('keyup', stopFeed, { signal });
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
      this.store.write(BINDINGS_KEY, this.bindings);
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
    const turnY = sy - 88;
    const cableX = ex + 34;
    const r = Math.min(22, Math.abs(sx - cableX) / 2, Math.abs(ey - turnY) / 2);
    // Up from the GBA, rounded 90° left, across, rounded 90° down, down the
    // right side of the printer, then rounded into its side port.
    const d =
      `M ${sx.toFixed(1)} ${sy.toFixed(1)} ` +
      `L ${sx.toFixed(1)} ${(turnY + r).toFixed(1)} ` +
      `Q ${sx.toFixed(1)} ${turnY.toFixed(1)} ${(sx - r).toFixed(1)} ${turnY.toFixed(1)} ` +
      `L ${(cableX + r).toFixed(1)} ${turnY.toFixed(1)} ` +
      `Q ${cableX.toFixed(1)} ${turnY.toFixed(1)} ${cableX.toFixed(1)} ${(turnY + r).toFixed(1)} ` +
      `L ${cableX.toFixed(1)} ${(ey - r).toFixed(1)} ` +
      `Q ${cableX.toFixed(1)} ${ey.toFixed(1)} ${(cableX - r).toFixed(1)} ${ey.toFixed(1)} ` +
      `L ${ex.toFixed(1)} ${ey.toFixed(1)}`;
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
      this.pressTimes.set(action, performance.now());
      this.gba.keypad.currentDown &= ~(1 << BUTTON_INDEX[action]);
      this.markButton(action, true);
    }
  }

  releaseButton(action, source) {
    const sources = this.held.get(action);
    if (!sources) return;
    sources.delete(source);
    if (sources.size > 0) return;

    // A mouse/touch click can be shorter than one 60 Hz frame. Hold it just
    // long enough for the ROM's key_hit() to see the edge.
    const heldFor = performance.now() - (this.pressTimes.get(action) || 0);
    const delay = source.startsWith('pointer:') ? Math.max(0, 50 - heldFor) : 0;
    const finish = () => {
      const remaining = this.held.get(action);
      if (remaining && remaining.size > 0) return;
      this.held.delete(action);
      this.pressTimes.delete(action);
      if (this.gba) this.gba.keypad.currentDown |= 1 << BUTTON_INDEX[action];
      this.markButton(action, false);
    };
    if (delay > 0) setTimeout(finish, delay);
    else finish();
  }

  releaseAll() {
    for (const action of Array.from(this.held.keys())) {
      this.held.delete(action);
      this.pressTimes.delete(action);
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
      this.store.write(BINDINGS_KEY, this.bindings);
      const action = this.listeningAction;
      this.listeningAction = null;
      this.renderBindings();
      this.toast(`${action} is now ${formatKey(event.code)}.`);
      return;
    }

    if (this.guideActive) return;
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

  /* ------------------------------------------------------------- privacy */

  showCookiePolicy(fromSettings = false) {
    if (!this.refs.cookieDialog || this.refs.cookieDialog.open) return;
    if (fromSettings && this.guideActive) return;
    this.closeDialogs();
    const decision = this.store.decision;
    this.refs.cookieState.hidden = !decision;
    this.refs.cookieState.textContent = decision
      ? `Current choice: ${decision === 'accepted' ? 'Accepted' : 'Rejected'}`
      : '';
    this.openDialogElement = this.refs.cookieDialog;
    this.refs.cookieDialog.showModal();
  }

  openPrivacySettings() {
    this.showCookiePolicy(true);
  }

  chooseStorage(decision) {
    const previous = this.store.decision;
    this.store.setDecision(decision);
    if (decision === 'rejected') {
      this.store.clearSavedData();
    } else if (this.sessionStarted) {
      this.store.write(BINDINGS_KEY, this.bindings);
      this.store.write(SOUND_KEY, this.muted);
      if (this.guideStatus) this.store.write(GUIDE_KEY, this.guideStatus);
      this.persistPages();
    }
    this.refs.cookieDialog.close();
    this.privacyDecided = true;
    if (!this.sessionStarted) {
      this.beginSession();
    } else if (decision !== previous) {
      window.location.reload();
    }
  }

  /* --------------------------------------------------------------- guide */

  normalizeGuideStatus(value) {
    return value === 'completed' || value === 'skipped' ? value : null;
  }

  markGuideStatus(status) {
    if (status !== 'completed' && status !== 'skipped') return;
    if (status === 'skipped' && this.guideStatus === 'completed') return;
    this.guideStatus = status;
    this.store.write(GUIDE_KEY, status);
  }

  shouldShowGuidePrompt() {
    if (this.options.guidePrompt === false) return false;
    if (!this.privacyDecided || this.guideStatus) return false;
    try {
      return new URLSearchParams(window.location.search).get('guide') !== '0';
    } catch {
      return true;
    }
  }

  showGuidePrompt() {
    if (this.destroyed || !this.loaded || this.guideActive || this.guidePromptShown) return;
    if (!this.refs.guideIntro || this.refs.guideIntro.open) return;
    if (this.openDialogElement || this.demoRunning) return;
    this.guidePromptShown = true;
    this.openDialogElement = this.refs.guideIntro;
    this.refs.guideIntro.showModal();
  }

  closeDialogs() {
    for (const dialog of Object.values(this.refs.dialogs)) {
      if (dialog?.open) dialog.close();
    }
    if (this.refs.guideIntro?.open) this.refs.guideIntro.close();
    this.openDialogElement = null;
  }

  async startGuide() {
    if (!this.loaded || this.guideActive) return;
    this.closeDialogs();
    this.guideActive = true;
    this.guideReady = false;
    const run = ++this.guideRunId;
    this.refs.guide.hidden = false;
    this.refs.guide.dataset.ready = 'false';
    this.refs.guide.dataset.step = '';
    this.refs.guideEnd.hidden = false;
    this.guidePromptShown = true;
    this.sound.ensure();

    this.printer.powered = true;
    this.printer.coverClosed = true;
    if (this.printer.rollRows < 700) this.printer.replaceRoll();
    this.scheduleUI();
    this.bindGuideKeys();
    await this.resetGba(false);
    await sleep(1200);
    if (!this.guideActive || run !== this.guideRunId) return;
    this.guideSteps = this.createGuideSteps();
    this.guideIndex = -1;
    this.toast('Guide started. Tap, click, or press any key to continue.', false, 2600);
    await this.nextGuideStep(run);
  }

  createGuideSteps() {
    return [
      {
        id: 'start',
        title: 'Open GBScribe',
        body: 'Press Start on the GBA to open the GBScribe menu.',
        targets: () => ['[data-button="START"]'],
        advance: async () => {
          await this.guideTap('START');
          await sleep(500);
        },
      },
      {
        id: 'mode',
        title: 'Choose a mode',
        body: 'Use Up and Down to choose Text or Drawing, then press A to confirm.',
        targets: () => ['.gbs-dpad-photo', '.gbs-hit-a'],
        advance: async () => {
          await this.guideTap('DOWN');
          await sleep(150);
          await this.guideTap('UP');
          await sleep(150);
          await this.guideTap('A');
          await sleep(600);
        },
      },
      {
        id: 'writing',
        title: 'Writing controls',
        body: 'The D-pad moves around the keyboard, A types the selected key, B backspaces, and Start opens the menu.',
        targets: () => ['.gbs-gba-photo'],
        advance: async () => {
          await this.guideTap('A');
          await sleep(300);
        },
      },
      {
        id: 'print-menu',
        title: 'Find Print',
        body: 'Open the menu with Start, then choose Print document.',
        targets: () => ['[data-button="START"]'],
        advance: async () => {
          await this.guideTap('START');
          await sleep(450);
          await this.guideTap('DOWN');
          await sleep(350);
        },
      },
      {
        id: 'print-option',
        title: 'Print document',
        body: 'This is the print option in the GBScribe menu. Select it to open the print confirmation.',
        targets: () => [this.guideScreenRect(8, 6, 17, 1.35)],
        advance: async () => {
          await this.guideTap('A');
          await sleep(500);
        },
      },
      {
        id: 'printing',
        title: 'Print the page',
        body: 'GBScribe sends the page to the printer; paper feeds up out of the white slot.',
        targets: () => ['.gbs-hit-a'],
        advance: async (run) => {
          const baselineRows = this.paperStore.current.rowCount;
          await this.guideTap('A');
          await this.waitForGuidePrint(run, baselineRows);
        },
      },
      {
        id: 'tear',
        title: 'Tear off the sheet',
        body: 'Drag the paper up or use the scissors to cut the sheet off.',
        targets: () => ['.gbs-scissors', '.gbs-tear-tab'],
        advance: async () => {
          await sleep(700);
          if (this.paperStore.hasPaper) this.tearPaper();
          await sleep(600);
        },
      },
      {
        id: 'export',
        title: 'Export your sheet',
        body: 'The sheet is now in Printed pages. Use PNG, BMP, PDF, or Print in the export bar to keep it or send it to a real printer.',
        targets: () => ['.gbs-export'],
      },
    ];
  }

  async guideTap(action, hold = 90) {
    this.pressButton(action, 'guide');
    await sleep(hold);
    this.releaseButton(action, 'guide');
    await sleep(80);
  }

  async waitForGuidePrint(run, baselineRows = 0) {
    const deadline = Date.now() + 25_000;
    while (this.guideActive && run === this.guideRunId && Date.now() < deadline) {
      const printed =
        this.paperStore.current.rowCount > baselineRows && !this.printer.printJob;
      if (printed) return;
      await sleep(150);
    }
  }

  guideScreenRect(x, y, w, h) {
    const rect = this.refs.screen.getBoundingClientRect();
    return {
      left: rect.left + (x / 30) * rect.width,
      top: rect.top + (y / 20) * rect.height,
      width: (w / 30) * rect.width,
      height: (h / 20) * rect.height,
    };
  }

  resolveGuideTargets(specs) {
    const rects = [];
    let scrollElement = null;
    for (const spec of specs) {
      if (!spec) continue;
      if (typeof spec === 'object') {
        rects.push(spec);
        continue;
      }
      const element = this.shadow.querySelector(spec);
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      if (!rect.width && !rect.height) continue;
      rects.push(rect);
      if (!scrollElement) scrollElement = element;
    }
    return { rects, scrollElement };
  }

  async renderGuideStep(step) {
    this.guideTargetSpecs = step.targets ? step.targets() : [];
    let { rects, scrollElement } = this.resolveGuideTargets(this.guideTargetSpecs);
    if (
      scrollElement &&
      (rects.some((rect) => rect.bottom < 0 || rect.top > window.innerHeight))
    ) {
      scrollElement.scrollIntoView({ block: 'center', inline: 'center' });
      await sleep(140);
      ({ rects } = this.resolveGuideTargets(this.guideTargetSpecs));
    }
    this.guideRects = rects;
    this.refs.guideTitle.textContent = step.title;
    this.refs.guideBody.textContent = step.body;
    this.updateGuideHint(false);
    this.applyGuideGeometry();
  }

  updateGuideHint(ready) {
    this.refs.guideHint.textContent = ready
      ? 'Tap, click, or press any key to continue'
      : 'Watch the guide...';
    this.refs.guideHint.dataset.waiting = String(!ready);
    this.refs.guide.dataset.ready = String(ready);
  }

  applyGuideGeometry() {
    const rects = this.guideRects || [];
    if (!rects.length) {
      this.refs.guideHole.style.left = '0';
      this.refs.guideHole.style.top = '0';
      this.refs.guideHole.style.width = '100vw';
      this.refs.guideHole.style.height = '100vh';
      this.refs.guideHole.style.boxShadow = 'none';
      this.refs.guideHole.style.background = 'rgba(24, 20, 14, .66)';
      this.refs.guideRings.replaceChildren();
      return;
    }
    this.refs.guideHole.style.background = 'transparent';
    this.refs.guideHole.style.boxShadow = '0 0 0 9999px rgba(24, 20, 14, .66)';

    const pad = 10;
    const left = Math.max(6, Math.min(...rects.map((r) => r.left)) - pad);
    const top = Math.max(6, Math.min(...rects.map((r) => r.top)) - pad);
    const right = Math.min(window.innerWidth - 6, Math.max(...rects.map((r) => r.right)) + pad);
    const bottom = Math.min(window.innerHeight - 6, Math.max(...rects.map((r) => r.bottom)) + pad);
    const width = Math.max(24, right - left);
    const height = Math.max(24, bottom - top);

    Object.assign(this.refs.guideHole.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    });

    const rings = document.createDocumentFragment();
    for (const rect of rects) {
      const ring = document.createElement('div');
      ring.className = 'gbs-guide-ring';
      Object.assign(ring.style, {
        left: `${rect.left - 7}px`,
        top: `${rect.top - 7}px`,
        width: `${Math.max(18, rect.width + 14)}px`,
        height: `${Math.max(18, rect.height + 14)}px`,
      });
      rings.appendChild(ring);
    }
    this.refs.guideRings.replaceChildren(rings);

    const callout = this.refs.guideCallout;
    const calloutWidth = Math.min(360, window.innerWidth - 28);
    const calloutHeight = callout.offsetHeight || 150;
    const centerX = left + width / 2;
    const below = bottom + calloutHeight + 24 < window.innerHeight;
    const calloutTop = below
      ? bottom + 18
      : Math.max(12, top - calloutHeight - 18);
    const calloutLeft = Math.max(
      12,
      Math.min(window.innerWidth - calloutWidth - 12, centerX - calloutWidth / 2),
    );
    Object.assign(callout.style, {
      left: `${calloutLeft}px`,
      top: `${calloutTop}px`,
      width: `${calloutWidth}px`,
    });
    callout.dataset.placement = below ? 'below' : 'above';
    callout.style.setProperty('--gbs-arrow-x', `${Math.max(18, centerX - calloutLeft - 6)}px`);
  }

  bindGuideKeys() {
    if (this._guideKeyHandler) return;
    this._guideKeyHandler = (event) => {
      if (!this.guideActive) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') {
        this.stopGuide(true);
        return;
      }
      if (this.guideReady) this.advanceGuide();
    };
    this._guideReposition = () => {
      if (!this.guideActive) return;
      const { rects } = this.resolveGuideTargets(this.guideTargetSpecs || []);
      this.guideRects = rects;
      this.applyGuideGeometry();
    };
    window.addEventListener('keydown', this._guideKeyHandler, true);
    window.addEventListener('scroll', this._guideReposition, true);
    window.addEventListener('resize', this._guideReposition);
  }

  unbindGuideKeys() {
    if (this._guideKeyHandler) {
      window.removeEventListener('keydown', this._guideKeyHandler, true);
      this._guideKeyHandler = null;
    }
    if (this._guideReposition) {
      window.removeEventListener('scroll', this._guideReposition, true);
      window.removeEventListener('resize', this._guideReposition);
      this._guideReposition = null;
    }
  }

  async nextGuideStep(run) {
    if (!this.guideActive || run !== this.guideRunId) return;
    this.guideIndex++;
    if (this.guideIndex >= this.guideSteps.length) {
      this.finishGuide();
      return;
    }
    const step = this.guideSteps[this.guideIndex];
    this.guideReady = false;
    this.refs.guide.dataset.ready = 'false';
    this.refs.guide.dataset.step = step.id;
    await this.renderGuideStep(step);
    if (!this.guideActive || run !== this.guideRunId) return;
    this.guideReady = true;
    this.updateGuideHint(true);
  }

  async advanceGuide() {
    if (!this.guideActive || !this.guideReady) return;
    this.guideReady = false;
    this.updateGuideHint(false);
    const run = this.guideRunId;
    const step = this.guideSteps[this.guideIndex];
    try {
      await step.advance?.(run);
      if (!this.guideActive || run !== this.guideRunId) return;
      await this.nextGuideStep(run);
    } catch (error) {
      console.error(error);
      this.stopGuide(true);
    }
  }

  finishGuide() {
    this.stopGuide(false);
    this.markGuideStatus('completed');
    this.toast('Guide complete. The Guide button can replay it anytime.', false, 4200);
  }

  stopGuide(endedByUser) {
    if (!this.guideActive) return;
    if (endedByUser) this.markGuideStatus('skipped');
    this.guideActive = false;
    this.guideReady = false;
    this.guideRunId++;
    this.unbindGuideKeys();
    this.refs.guide.hidden = true;
    this.refs.guideEnd.hidden = true;
    this.refs.guideRings.replaceChildren();
    this.refs.guide.dataset.ready = 'false';
    if (endedByUser) this.toast('Tutorial ended. You can restart it with the Guide button.');
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
    this.store.write(SOUND_KEY, this.muted);
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
        this.toast('Print complete. Drag the paper up to tear it off.', false, 4200);
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
    if (type === 'tear' || type === 'remove' || type === 'clear' || type === 'end') {
      this.persistPages();
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
      if (Math.abs(dy) > 12) this.refs.paper.classList.add('is-near');
      if (Math.abs(dy) > 52) {
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

  persistPages() {
    if (!this.store.accepted) return;
    const saved = this.store.write(PAGES_KEY, this.paperStore.toJSON());
    if (!saved && !this.storageWarningShown) {
      this.storageWarningShown = true;
      this.toast('The browser could not save the printed pages. They are still available this session.', true, 5000);
    }
  }

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

    let status = 'Printer on';
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
      status = 'Paper low';
    }
    this.refs.status.textContent = status;
    this.refs.statusLed.className = `gbs-status-led ${ledClass}`.trim();
    this.refs.rollFill.style.width = `${printer.paperPercent.toFixed(1)}%`;
    this.refs.rollLabel.textContent = `${Math.round(printer.paperPercent)}%`;

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
    this.refs.gbaPower?.classList.toggle('on', this.loaded);
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
    this.guideActive = false;
    this.unbindGuideKeys();
    cancelAnimationFrame(this.raf);
    clearTimeout(this.toastTimer);
    this.abort.abort();
    this.resizeObserver?.disconnect();
    this.sound.stopMotor();
    this.gba?.pause();
  }
}
