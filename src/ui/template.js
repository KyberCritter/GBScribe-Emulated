import { icons } from './icons.js';

const controlRows = [
  ['UP', 'D-pad up'],
  ['DOWN', 'D-pad down'],
  ['LEFT', 'D-pad left'],
  ['RIGHT', 'D-pad right'],
  ['A', 'A button'],
  ['B', 'B button'],
  ['L', 'L shoulder'],
  ['R', 'R shoulder'],
  ['START', 'Start'],
  ['SELECT', 'Select'],
];

export function buildTemplate() {
  return `
<div class="gbs-root" data-root>
  <header class="gbs-header">
    <div class="gbs-title">
      <span class="gbs-kicker">Interactive hardware demo</span>
      <h2>GBScribe <span class="gbs-x">×</span> Game Boy Printer</h2>
      <p>Write or draw on a <b>real GBScribe ROM</b>, then watch a Game Boy Printer burn it onto thermal paper one dot row at a time. The paper is real data, not a canned animation — tear it off, export it, or print it again.</p>
    </div>
    <div class="gbs-header-actions">
      <button class="gbs-btn is-primary" data-action="demo" type="button">${icons.sparkle}<span>Try a test print</span></button>
      <button class="gbs-btn" data-action="help" type="button">${icons.help}<span>How it works</span></button>
      <button class="gbs-btn" data-action="controls" type="button">${icons.gamepad}<span>Controls</span></button>
    </div>
  </header>

  <div class="gbs-stage">
    <svg class="gbs-cable" data-cable viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path data-cable-path d="M 40 8 C 52 1, 74 1, 87 14 S 100 44, 98 60" />
      <path class="highlight" data-cable-highlight d="M 40 8 C 52 1, 74 1, 87 14 S 100 44, 98 60" />
    </svg>
    <div class="gbs-link-chip" aria-label="Link Cable connected">${icons.link} Link Cable</div>
    <section class="gbs-gba-column" aria-label="Game Boy Advance running GBScribe">
      <div class="gbs-gba-photo">
        <img class="gbs-gba-image" data-gba-image alt="" draggable="false">
        <span class="gbs-gba-power-led" data-gba-power aria-hidden="true"></span>
        <div class="gbs-screen-mount">
          <canvas data-screen width="240" height="160" aria-label="Game Boy Advance screen"></canvas>
          <div class="gbs-screen-loading" data-loading>
            <span class="gbs-spinner"></span>
            <span>Loading GBScribe…</span>
          </div>
        </div>
        <div class="gbs-dpad-photo" aria-label="D-pad">
          <button class="dpad-up" data-button="UP" type="button" aria-label="D-pad up" title="Up"></button>
          <button class="dpad-left" data-button="LEFT" type="button" aria-label="D-pad left" title="Left"></button>
          <button class="dpad-right" data-button="RIGHT" type="button" aria-label="D-pad right" title="Right"></button>
          <button class="dpad-down" data-button="DOWN" type="button" aria-label="D-pad down" title="Down"></button>
        </div>
        <button class="gbs-hit gbs-hit-a" data-button="A" type="button" aria-label="A button" title="A"></button>
        <button class="gbs-hit gbs-hit-b" data-button="B" type="button" aria-label="B button" title="B"></button>
        <button class="gbs-hit gbs-hit-start" data-button="START" type="button" aria-label="Start" title="Start"></button>
        <button class="gbs-hit gbs-hit-select" data-button="SELECT" type="button" aria-label="Select" title="Select"></button>
        <button class="gbs-hit gbs-hit-l" data-button="L" type="button" aria-label="L shoulder" title="L"></button>
        <button class="gbs-hit gbs-hit-r" data-button="R" type="button" aria-label="R shoulder" title="R"></button>
        <span class="gbs-port gbs-port-top" data-port-gba aria-hidden="true"></span>
      </div>
      <div class="gbs-under-gba">
        <button class="gbs-btn gbs-small" data-action="reset" type="button">${icons.reset}<span>Reset GBA</span></button>
        <button class="gbs-btn gbs-small" data-action="mute" type="button" data-mute-button>${icons.sound}<span data-mute-label>Sound on</span></button>
      </div>
    </section>

    <section class="gbs-printer-column" aria-label="Game Boy Printer">
      <div class="gbs-printer-scene" data-printer-body>
        <img class="gbs-printer-image" data-printer-image alt="Game Boy Printer" draggable="false">
        <button class="gbs-hit gbs-hit-cover" data-action="paper" type="button" aria-label="Open the paper compartment" title="Open paper compartment"></button>
        <button class="gbs-hit gbs-hit-feed" data-action="feed" type="button" aria-label="Feed paper" title="Feed paper"></button>
        <button class="gbs-hit gbs-hit-power" data-action="power" type="button" aria-label="Turn printer power on or off" title="Power"></button>
        <span class="gbs-port gbs-port-printer" data-port-printer aria-hidden="true"></span>
        <span class="gbs-printer-led" data-pilot title="Printer status"></span>
        <span class="gbs-printer-led gbs-printer-link-led" data-link-pilot title="Link cable"></span>
        <span hidden data-roll-label>100%</span>
        <span hidden class="gbs-roll-fill"><i data-roll-fill style="width:100%"></i></span>

        <div class="gbs-paper-stage" data-paper-stage>
          <div class="gbs-paper-empty" data-paper-empty aria-hidden="true"></div>
          <div class="gbs-paper-scroll" data-paper-scroll>
            <div class="gbs-paper is-empty" data-paper hidden>
              <div class="gbs-tear-tab" data-tear-tab role="button" tabindex="0" aria-label="Drag up to tear the paper off">
                ${icons.scissors}<span>Drag up to tear</span>
              </div>
              <div class="gbs-paper-canvas-clip" data-paper-clip>
                <canvas data-paper-canvas width="281" height="512" aria-label="Printed Game Boy Printer paper"></canvas>
              </div>
            </div>
          </div>
        </div>
        <button class="gbs-scissors" data-action="tear" type="button" aria-label="Cut the paper off with scissors" disabled>${icons.scissors}</button>
      </div>

      <div class="gbs-statusbar" data-statusbar aria-live="polite">
        <span class="gbs-status-led" data-status-led></span>
        <span data-status>Printer on</span>
      </div>
    </section>
  </div>

  <div class="gbs-toolbar">
    <div class="gbs-tools">
      <button class="gbs-btn" data-action="tear" type="button" data-tear-button>${icons.scissors}<span>Tear off</span></button>
      <button class="gbs-btn" data-action="feed" type="button">${icons.feed}<span>Feed paper</span></button>
      <button class="gbs-btn" data-action="paper" type="button">${icons.roll}<span>Replace paper</span></button>
      <button class="gbs-btn" data-action="power" type="button">${icons.power}<span>Printer on/off</span></button>
    </div>
    <div class="gbs-export">
      <span class="gbs-export-label">${icons.download} Export</span>
      <button class="gbs-btn" data-export="png" type="button">PNG</button>
      <button class="gbs-btn" data-export="bmp" type="button">BMP</button>
      <button class="gbs-btn" data-export="pdf" type="button">PDF</button>
      <button class="gbs-btn" data-export="print" type="button">Print</button>
    </div>
  </div>

  <section class="gbs-pages" data-pages hidden>
    <div class="gbs-pages-head">
      <h3>Printed pages</h3>
      <span data-pages-count></span>
    </div>
    <div class="gbs-page-list" data-page-list></div>
  </section>

  <div class="gbs-toast" data-toast role="status" aria-live="polite"></div>

  <dialog class="gbs-dialog" data-dialog="help" aria-label="How this works">
    <div class="gbs-dialog-head">
      <h3>How this works</h3>
      <button class="gbs-btn gbs-dialog-close" data-close type="button" aria-label="Close">${icons.close}</button>
    </div>
    <div class="gbs-dialog-body">
      <p>GBScribe is a real GBA homebrew word processor and drawing tool. This page runs an unmodified <b>GBScribe ROM</b> in an in-browser GBA emulator, with a new Game Boy Printer emulated at the serial-pin level.</p>
      <div class="gbs-help-grid">
        <div class="gbs-help-card">
          <h4>1 · Use the GBA</h4>
          <p>Click the on-screen buttons or use your keyboard. Press <kbd>Enter</kbd> (Start), then choose <b>Print test page</b> from the menu. Use <b>Controls</b> to remap every button.</p>
        </div>
        <div class="gbs-help-card">
          <h4>2 · Watch the wire</h4>
          <p>GBScribe bit-bangs the DMG printer protocol over the GBA link port in GPIO mode. The emulator shifts each byte into the printer on the clock edge and returns keepalive/status bytes through SI.</p>
        </div>
        <div class="gbs-help-card">
          <h4>3 · Handle the paper</h4>
          <p>The printer consumes paper as it prints. Drag the tear tab up or click the scissors to cut a sheet off. Open the paper compartment to fit a fresh roll, and use <b>Feed</b> to advance blank paper.</p>
        </div>
        <div class="gbs-help-card">
          <h4>4 · Keep it</h4>
          <p>Every sheet is stored at the printer's native 160-dot width. Export the current output as PNG, BMP, or a multi-page PDF, or send it to your real printer.</p>
        </div>
      </div>
      <h4>Controls at a glance</h4>
      <p><kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> move · <kbd>Z</kbd> A · <kbd>X</kbd> B · <kbd>Enter</kbd> Start · <kbd>Backspace</kbd> Select · <kbd>A</kbd>/<kbd>S</kbd> L/R. Buttons can be remapped.</p>
      <h4>Good to know</h4>
      <ul>
        <li>GBScribe's own save slots live in your browser's localStorage. They survive a reload.</li>
        <li>Powering the printer off makes the GBA report “Printer: disconnected”; that is the ROM's real detection path, not a UI trick.</li>
        <li>The test page is 54 tile rows. GBScribe streams it in 18-row chunks, so you can watch the paper advance chunk by chunk.</li>
        <li>Nothing is uploaded. The ROM, BIOS, and all processing stay in this page.</li>
      </ul>
      <div class="gbs-legal">
        GBScribe and AdvancePrint © Scott Ratchford 2026. GBScribe and AdvancePrint are free software, licensed under the MIT License.
        Emulator core: GBA.js © 2012–2013 Jeffrey Pfau, licensed under the BSD 2-Clause License.
        Not affiliated with, endorsed by, or sponsored by Nintendo. Game Boy, Game Boy Advance, and Game Boy Printer are trademarks of Nintendo.
      </div>
    </div>
    <div class="gbs-dialog-footer">
      <button class="gbs-btn is-primary" data-action="demo" type="button">${icons.sparkle}<span>Run the test print</span></button>
      <button class="gbs-btn" data-close type="button">Close</button>
    </div>
  </dialog>

  <dialog class="gbs-dialog" data-dialog="controls" aria-label="Keyboard controls">
    <div class="gbs-dialog-head">
      <h3>Keyboard controls</h3>
      <button class="gbs-btn gbs-dialog-close" data-close type="button" aria-label="Close">${icons.close}</button>
    </div>
    <div class="gbs-dialog-body">
      <p>Click a key, then press the key you want. Bindings are stored in this browser. The on-screen GBA buttons always work, including touch and multi-touch.</p>
      <table class="gbs-controls-table">
        <thead><tr><th>GBA button</th><th>Key</th><th></th></tr></thead>
        <tbody data-bindings>
          ${controlRows.map(([id, label]) => `
            <tr data-bind-row="${id}">
              <td>${label}</td>
              <td><span class="gbs-key gbs-binding" data-binding="${id}">—</span></td>
              <td><button class="gbs-btn gbs-small" data-rebind="${id}" type="button">Rebind</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="gbs-dialog-footer">
      <button class="gbs-btn is-quiet" data-reset-bindings type="button">Reset defaults</button>
      <span class="gbs-spacer"></span>
      <button class="gbs-btn" data-close type="button">Done</button>
    </div>
  </dialog>

  <dialog class="gbs-dialog" data-dialog="paper" aria-label="Paper compartment">
    <div class="gbs-dialog-head">
      <h3>Paper compartment</h3>
      <button class="gbs-btn gbs-dialog-close" data-close type="button" aria-label="Close">${icons.close}</button>
    </div>
    <div class="gbs-dialog-body">
      <div class="gbs-paper-panel">
        <div class="gbs-paper-visual" aria-hidden="true">
          <div class="gbs-roll-fill"><i data-dialog-roll-fill style="width:100%"></i></div>
        </div>
        <div class="gbs-paper-copy">
          <strong>Thermal paper roll</strong>
          <span class="gbs-cover-state" data-cover-state>Cover closed</span>
          <div class="gbs-paper-stats">
            <span>Remaining <b data-dialog-roll-percent>100%</b></span>
            <span><b data-dialog-roll-meters>1.00 m</b> left</span>
          </div>
          <p>Each printed dot row is 0.2375 mm tall. The printer will stop with a paper jam when the roll runs out — just like real life.</p>
        </div>
      </div>
      <h4>Actions</h4>
      <p>Open the cover to inspect or change the roll. Inserting a new roll closes the cover automatically.</p>
    </div>
    <div class="gbs-dialog-footer">
      <button class="gbs-btn" data-paper-cover type="button">Open cover</button>
      <button class="gbs-btn is-danger" data-paper-remove type="button">Remove roll</button>
      <span class="gbs-spacer"></span>
      <button class="gbs-btn is-primary" data-paper-replace type="button">${icons.roll}<span>Insert new roll</span></button>
      <button class="gbs-btn" data-close type="button">Close</button>
    </div>
  </dialog>
</div>`;
}
