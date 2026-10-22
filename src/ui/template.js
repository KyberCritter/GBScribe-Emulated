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
      <div class="gbs-device-label">
        <span class="gbs-led" data-gba-led></span>
        <span>Game Boy Advance</span>
        <span class="gbs-meta">GBScribe · 240 × 160</span>
      </div>
      <div class="gbs-gba">
        <div class="gbs-gba-internals" aria-hidden="true"></div>
        <button class="gbs-shoulder left" data-button="L" type="button" aria-label="L shoulder button">L</button>
        <button class="gbs-shoulder right" data-button="R" type="button" aria-label="R shoulder button">R</button>
        <div class="gbs-bezel">
          <div class="gbs-screen-frame">
            <canvas data-screen width="240" height="160" aria-label="Game Boy Advance screen"></canvas>
            <div class="gbs-screen-loading" data-loading>
              <span class="gbs-spinner"></span>
              <span>Loading GBScribe…</span>
            </div>
          </div>
          <div class="gbs-gba-brand">GAME BOY <b>ADVANCE</b></div>
        </div>
        <div class="gbs-dpad" aria-label="D-pad">
          <button class="up" data-button="UP" type="button" aria-label="Up"></button>
          <button class="left" data-button="LEFT" type="button" aria-label="Left"></button>
          <span class="center" aria-hidden="true"></span>
          <button class="right" data-button="RIGHT" type="button" aria-label="Right"></button>
          <button class="down" data-button="DOWN" type="button" aria-label="Down"></button>
        </div>
        <div class="gbs-face" aria-label="A and B buttons">
          <button class="b" data-button="B" type="button" aria-label="B button">B</button>
          <button class="a" data-button="A" type="button" aria-label="A button">A</button>
        </div>
        <div class="gbs-startselect" aria-label="Start and Select buttons">
          <button data-button="START" type="button" aria-label="Start"><span>START</span></button>
          <button data-button="SELECT" type="button" aria-label="Select"><span>SELECT</span></button>
        </div>
        <div class="gbs-power-led" aria-hidden="true"><i></i><span>POWER</span></div>
        <div class="gbs-speaker" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
        <span class="gbs-port gbs-port-top" data-port-gba aria-hidden="true"></span>
      </div>
      <div class="gbs-under-gba">
        <button class="gbs-btn gbs-small" data-action="reset" type="button">${icons.reset}<span>Reset GBA</span></button>
        <button class="gbs-btn gbs-small" data-action="mute" type="button" data-mute-button>${icons.sound}<span data-mute-label>Sound on</span></button>
        <span class="gbs-save-hint" data-save-hint>Click the GBA to use the keyboard</span>
      </div>
    </section>

    <section class="gbs-printer-column" aria-label="Game Boy Printer">
      <div class="gbs-printer-scene">
        <div class="gbs-printer" data-printer-body>
          <span class="gbs-port gbs-port-printer" data-port-printer aria-hidden="true"></span>
          <div class="gbs-printer-cover" data-action="paper" role="button" tabindex="0" aria-label="Open the paper compartment">
            <div class="gbs-roll-window">
              <div class="gbs-roll-cylinder"><span class="gbs-roll-core"></span></div>
              <div class="gbs-roll-fill"><i data-roll-fill style="width:100%"></i></div>
              <span class="gbs-roll-label" data-roll-label>100%</span>
            </div>
            <span class="gbs-cover-label">PAPER</span>
          </div>
          <div class="gbs-printer-band">
            <div class="gbs-slot">
              <span class="gbs-slot-teeth"></span>
              <span class="gbs-slot-tongue"></span>
            </div>
            <div class="gbs-printer-logo">GAME BOY <b>printer</b></div>
            <div class="gbs-printer-lights">
              <span class="gbs-pilot" data-pilot title="Printer status"></span>
              <span class="gbs-pilot" data-link-pilot title="Link cable"></span>
              <span class="gbs-battery-label">BATTERY</span>
            </div>
          </div>
          <div class="gbs-printer-front">
            <div class="gbs-nintendo">Nintendo</div>
            <button class="gbs-feed" data-action="feed" type="button" aria-label="Feed paper">FEED</button>
            <button class="gbs-power is-on" data-action="power" type="button" aria-label="Turn printer power on or off">
              <span class="gbs-onoff"><span>ON</span><span>OFF</span></span>
              <span class="gbs-power-case"><span class="gbs-switch"></span></span>
              <span class="gbs-power-label">POWER</span>
            </button>
          </div>
          <div class="gbs-printer-feet" aria-hidden="true"></div>
        </div>

        <div class="gbs-paper-stage" data-paper-stage>
          <div class="gbs-paper-empty" data-paper-empty aria-hidden="true"></div>
          <div class="gbs-paper-scroll" data-paper-scroll>
            <div class="gbs-paper is-empty" data-paper hidden>
              <div class="gbs-paper-canvas-clip" data-paper-clip>
                <canvas data-paper-canvas width="281" height="512" aria-label="Printed Game Boy Printer paper"></canvas>
              </div>
              <div class="gbs-tear-tab" data-tear-tab role="button" tabindex="0" aria-label="Drag down to tear the paper off">
                ${icons.scissors}<span>Drag down to tear</span>
              </div>
            </div>
          </div>
        </div>
        <button class="gbs-scissors" data-action="tear" type="button" aria-label="Cut the paper off with scissors" disabled>${icons.scissors}</button>
      </div>

      <div class="gbs-statusbar" aria-live="polite">
        <span class="gbs-status-led" data-status-led></span>
        <span data-status>Printer ready</span>
        <span class="gbs-roll-text" data-roll-text>1.0 m paper</span>
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
          <p>The printer consumes paper as it prints. Drag the tear tab down or click the scissors to cut a sheet off. Open the paper compartment to fit a fresh roll, and use <b>Feed</b> to advance blank paper.</p>
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
        GBScribe and AdvancePrint by Scott Ratchford, MIT licensed. Emulator core: GBA.js by Jeffrey Pfau, BSD-2-Clause, with a GPIO link-port device added for this demo.
        Not affiliated with, endorsed by, or sponsored by Nintendo. Game Boy, Game Boy Advance and Game Boy Printer are trademarks of Nintendo.
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
