/**
 * Shadow-DOM styles for the demo. Everything is scoped to the component so
 * it can be dropped into a Jekyll post without inheriting the blog theme.
 */
export function buildStyles() {
  return `
:host {
  --gbs-ink: #211f1c;
  --gbs-ink-soft: #5e584f;
  --gbs-ink-faint: #8d8578;
  --gbs-paper: #faf6e9;
  --gbs-panel: #fffdf7;
  --gbs-panel-2: #f1ece0;
  --gbs-line: #d8d0c0;
  --gbs-line-strong: #b8ae9b;
  --gbs-crimson: #a51f3f;
  --gbs-crimson-deep: #651125;
  --gbs-amber: #e8a51b;
  --gbs-green: #3f9b57;
  --gbs-red: #bf3b30;
  --gbs-printer: #e9e2d2;
  --gbs-printer-dark: #c9c0ae;
  --gbs-paper-width: 320px;
  --gbs-display-scale: 2;
  --gbs-radius: 18px;
  display: block;
  color: var(--gbs-ink);
  font-family: ui-monospace, "SFMono-Regular", "Cascadia Code", "Liberation Mono", Menlo, monospace;
  font-size: 14px;
  line-height: 1.5;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

*, *::before, *::after { box-sizing: border-box; }

.gbs-root {
  position: relative;
  max-width: 1240px;
  margin: 0 auto;
  padding: clamp(16px, 3vw, 34px);
  border: 1px solid var(--gbs-line);
  border-radius: 24px;
  background:
    radial-gradient(1100px 420px at 15% -10%, #fffdf8 0%, transparent 60%),
    radial-gradient(700px 380px at 95% 4%, #f8f1e2 0%, transparent 64%),
    #f5f1e7;
  box-shadow: 0 1px 0 #fff inset, 0 24px 70px -40px #2c2416;
  overflow: hidden;
}

.gbs-root::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: .35;
  background-image: radial-gradient(#8c7f6814 1px, transparent 1px);
  background-size: 5px 5px;
  mix-blend-mode: multiply;
}

.gbs-header {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  padding-bottom: 18px;
  border-bottom: 1px dashed var(--gbs-line-strong);
}

.gbs-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 9px;
  font-size: 10px;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--gbs-crimson);
  font-weight: 700;
}
.gbs-kicker::before {
  content: "";
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--gbs-crimson);
  box-shadow: 0 0 0 3px #a51f3f1c;
}

.gbs-title h2 {
  margin: 0;
  font-family: "GBS Pixel", ui-monospace, monospace;
  font-size: clamp(17px, 2.4vw, 27px);
  line-height: 1.35;
  letter-spacing: -.02em;
}
.gbs-title h2 .gbs-x { color: var(--gbs-crimson); padding: 0 .18em; }
.gbs-title p {
  max-width: 62ch;
  margin: 10px 0 0;
  color: var(--gbs-ink-soft);
  font-size: 13.5px;
}
.gbs-title p b { color: var(--gbs-ink); }

.gbs-header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.gbs-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 34px;
  padding: 7px 12px;
  border: 1px solid var(--gbs-line-strong);
  border-radius: 9px;
  background: linear-gradient(#fffefa, #f2ede1);
  color: var(--gbs-ink);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  box-shadow: 0 1px 0 #fff inset, 0 2px 0 #d7cfbf;
  transition: transform .08s ease, box-shadow .08s ease, background .15s ease;
  -webkit-tap-highlight-color: transparent;
}
.gbs-btn:hover { background: linear-gradient(#fff, #f7f2e7); }
.gbs-btn:active { transform: translateY(1px); box-shadow: 0 1px 0 #d7cfbf; }
.gbs-btn:focus-visible { outline: 3px solid #a51f3f42; outline-offset: 2px; }
.gbs-btn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.gbs-btn[disabled] { opacity: .42; pointer-events: none; }
.gbs-btn.is-primary {
  border-color: var(--gbs-crimson-deep);
  background: linear-gradient(#bb2a4a, var(--gbs-crimson));
  color: #fff8f2;
  box-shadow: 0 1px 0 #e87990 inset, 0 3px 0 #6d1026, 0 8px 18px -8px #6d1026;
}
.gbs-btn.is-primary:hover { background: linear-gradient(#c83253, #ad2241); }
.gbs-btn.is-quiet { border-color: transparent; background: transparent; box-shadow: none; color: var(--gbs-ink-soft); }
.gbs-btn.is-quiet:hover { background: #00000008; }
.gbs-btn.is-danger { color: #8c1d1d; border-color: #d8b4ad; background: #fff7f5; }
.gbs-btn.gbs-small { min-height: 28px; padding: 4px 9px; font-size: 11px; }

.gbs-stage {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(400px, 500px);
  gap: clamp(20px, 4vw, 54px);
  align-items: center;
  padding-top: 22px;
}

.gbs-gba-column, .gbs-printer-column { position: relative; min-width: 0; z-index: 1; }

.gbs-device-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px 4px;
  font-size: 10px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--gbs-ink-faint);
  font-weight: 700;
}
.gbs-device-label .gbs-meta { margin-left: auto; letter-spacing: .04em; text-transform: none; font-weight: 500; }
.gbs-led {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--gbs-green);
  box-shadow: 0 0 0 3px #3f9b5720, 0 0 10px #3f9b5780;
}
.gbs-led.is-off { background: #9b9488; box-shadow: none; }

/* ------------------------------------------------------------------ GBA */
.gbs-gba {
  position: relative;
  width: 100%;
  aspect-ratio: 1.72 / 1;
  border-radius: 16px 92px 24px 20px / 26px 74px 30px 22px;
  background:
    radial-gradient(130% 95% at 18% -8%, #ffd7de42 0%, transparent 34%),
    radial-gradient(80% 110% at 94% 90%, #25000a99 0%, transparent 60%),
    radial-gradient(50% 70% at 16% 48%, #ffffff18 0%, transparent 46%),
    linear-gradient(146deg, #6f0b20 0%, #a51d39 30%, #8e102b 58%, #590817 100%);
  box-shadow:
    0 2px 0 #ffb8c866 inset,
    0 -9px 26px #26000a88 inset,
    0 30px 58px -28px #1c0006,
    0 3px 0 #ffffff2e inset;
  isolation: isolate;
}
.gbs-gba::before {
  content: "";
  position: absolute;
  inset: 2%;
  border-radius: inherit;
  background:
    linear-gradient(112deg, #fff3 0 16%, transparent 16.5% 54%, #fff1 54.5% 58%, transparent 58.5%),
    repeating-linear-gradient(103deg, #ffffff08 0 2px, transparent 2px 11px);
  opacity: .5;
  pointer-events: none;
  z-index: 2;
  mix-blend-mode: screen;
}
.gbs-gba::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 0 0 1px #390612, 0 0 0 3px #ffffff18 inset;
  pointer-events: none;
  z-index: 9;
}
.gbs-gba-internals {
  position: absolute;
  inset: 5%;
  border-radius: inherit;
  overflow: hidden;
  opacity: .55;
  mix-blend-mode: multiply;
  background:
    radial-gradient(ellipse 30% 24% at 14% 22%, #2a000a88 0%, transparent 72%),
    radial-gradient(ellipse 20% 30% at 88% 78%, #2a000a66 0%, transparent 70%),
    linear-gradient(90deg, transparent 0 55%, #ffffff0c 55.2% 55.8%, transparent 56%),
    repeating-linear-gradient(90deg, #2a000a22 0 1px, transparent 1px 21px),
    repeating-linear-gradient(0deg, #2a000a1c 0 1px, transparent 1px 27px);
  z-index: 0;
}
.gbs-gba-internals::before,
.gbs-gba-internals::after {
  content: "";
  position: absolute;
  border-radius: 10%;
  background: #2a000a55;
  box-shadow: 0 0 0 1px #ffffff12 inset;
}
.gbs-gba-internals::before { left: 8%; top: 60%; width: 25%; height: 24%; transform: rotate(-8deg); }
.gbs-gba-internals::after { right: 7%; top: 12%; width: 18%; height: 34%; transform: rotate(6deg); opacity: .6; }

.gbs-shoulder {
  position: absolute;
  touch-action: none;
  top: -13px;
  z-index: 1;
  width: 20%;
  height: 22px;
  border: 1px solid #7d1428;
  background: linear-gradient(#f7f3ea, #d6cfc2);
  color: #6e6659;
  font: 700 9px/1 ui-monospace, monospace;
  letter-spacing: .14em;
  cursor: pointer;
  box-shadow: 0 2px 0 #5f0a1c, 0 5px 9px #0006, 0 1px 0 #fff inset;
}
.gbs-shoulder.left { left: 4%; border-radius: 14px 5px 2px 2px; transform: skewX(12deg); }
.gbs-shoulder.right { right: 10%; border-radius: 5px 16px 2px 2px; transform: skewX(-12deg); }
.gbs-shoulder:active { transform: translateY(2px) skewX(12deg); }
.gbs-shoulder.right:active { transform: translateY(2px) skewX(-12deg); }

.gbs-bezel {
  position: absolute;
  left: 18%;
  top: 12%;
  width: 54%;
  height: 77%;
  display: flex;
  flex-direction: column;
  gap: 4%;
  padding: 4.2% 4.6% 3.2%;
  border-radius: 17% / 13%;
  background:
    linear-gradient(180deg, #fffdf8 0%, #f2eee5 46%, #e4ded1 84%, #d6cfc1 100%);
  box-shadow:
    0 2px 0 #fff inset,
    0 -2px 0 #b9b0a1 inset,
    0 0 0 1px #cfc6b6,
    0 10px 24px #2b000a44;
  z-index: 4;
}
.gbs-bezel::before {
  content: "";
  position: absolute;
  inset: 1.2%;
  border-radius: inherit;
  border: 1px solid #ffffffa8;
  pointer-events: none;
}
.gbs-screen-frame {
  position: relative;
  width: 100%;
  padding: 3%;
  border-radius: 5.5% / 8%;
  background: linear-gradient(155deg, #1b1a20, #0d0c10 62%, #060609);
  box-shadow:
    0 0 0 1px #3e3a3c,
    0 3px 0 #ffffff18 inset,
    0 -6px 14px #000d inset,
    0 7px 18px #1b000833;
  flex: 0 0 auto;
}
.gbs-screen-frame::after {
  content: "";
  position: absolute;
  inset: 4%;
  border-radius: 4% / 6%;
  pointer-events: none;
  background: linear-gradient(118deg, #ffffff1c 0%, transparent 33%, transparent 76%, #ffffff08 100%);
  z-index: 2;
}
.gbs-screen-frame canvas {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 3 / 2;
  background: #101018;
  border-radius: 3% / 5%;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
.gbs-screen-loading {
  position: absolute;
  inset: 3%;
  display: grid;
  place-items: center;
  gap: 8px;
  border-radius: 3% / 5%;
  background: #0e0e14;
  color: #d8d3ca;
  font-family: "GBS Pixel", ui-monospace, monospace;
  font-size: clamp(7px, 1.1vw, 11px);
  text-align: center;
  line-height: 1.8;
  z-index: 3;
  padding: 12px;
}
.gbs-screen-loading.is-hidden { display: none; }
.gbs-spinner {
  width: 18px; height: 18px;
  border-radius: 50%;
  border: 2px solid #ffffff2e;
  border-top-color: #d34a68;
  animation: gbs-spin .8s linear infinite;
}
@keyframes gbs-spin { to { transform: rotate(360deg); } }

.gbs-gba-brand {
  margin-top: auto;
  text-align: center;
  font-family: "GBS Pixel", ui-monospace, monospace;
  font-size: clamp(5px, .78vw, 8px);
  color: #a89f92;
  letter-spacing: .02em;
  text-shadow: 0 1px 0 #fff;
  line-height: 1.4;
}
.gbs-gba-brand b { color: #8f8678; font-weight: 400; }

.gbs-dpad {
  position: absolute;
  left: 5.2%;
  top: 40%;
  width: 18%;
  aspect-ratio: 1;
  z-index: 6;
  filter: drop-shadow(0 6px 6px #2b000b66);
}
.gbs-dpad button {
  position: absolute;
  touch-action: none;
  border: 1px solid #aaa298;
  background: linear-gradient(145deg, #fffefb, #e3ded3);
  color: #6b655c;
  padding: 0;
  display: grid;
  place-items: center;
  font-size: 0;
  cursor: pointer;
  box-shadow: 0 3px 0 #a59e92, 0 1px 0 #fff inset;
}
.gbs-dpad button:active, .gbs-dpad button.is-pressed { transform: translateY(2px); box-shadow: 0 0 0 #a59e92; background: linear-gradient(#d9d3c7, #f6f2e9); }
.gbs-dpad .up { left: 33.33%; top: 0; width: 33.33%; height: 34%; border-radius: 9px 9px 0 0; }
.gbs-dpad .down { left: 33.33%; bottom: 0; width: 33.33%; height: 34%; border-radius: 0 0 9px 9px; }
.gbs-dpad .left { left: 0; top: 33.33%; width: 34%; height: 33.33%; border-radius: 9px 0 0 9px; }
.gbs-dpad .right { right: 0; top: 33.33%; width: 34%; height: 33.33%; border-radius: 0 9px 9px 0; }
.gbs-dpad .center {
  position: absolute; left: 34%; top: 34%; width: 32%; height: 32%;
  background: linear-gradient(145deg, #f3eee5, #cfc8bc);
  box-shadow: 0 0 0 1px #aaa298 inset;
}
.gbs-dpad button::before {
  content: "";
  width: 0; height: 0;
  border: 5px solid transparent;
}
.gbs-dpad .up::before { border-bottom-color: #8b8377; margin-top: -4px; }
.gbs-dpad .down::before { border-top-color: #8b8377; margin-bottom: -4px; }
.gbs-dpad .left::before { border-right-color: #8b8377; margin-left: -4px; }
.gbs-dpad .right::before { border-left-color: #8b8377; margin-right: -4px; }

.gbs-face {
  position: absolute;
  right: 4%;
  top: 38%;
  width: 18%;
  height: 28%;
  transform: rotate(-19deg);
  z-index: 6;
}
.gbs-face button {
  position: absolute;
  touch-action: none;
  width: 47%;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 1px solid #b3aa9d;
  background: radial-gradient(circle at 35% 28%, #fff, #f2eee6 42%, #d9d3c7 100%);
  color: #6f675c;
  font: 700 clamp(8px, 1.2vw, 13px)/1 ui-monospace, monospace;
  cursor: pointer;
  box-shadow: 0 3px 0 #aaa296, 0 7px 10px #2b000b55, 0 1px 0 #fff inset;
  display: grid;
  place-items: center;
}
.gbs-face button:active, .gbs-face button.is-pressed { transform: translateY(3px); box-shadow: 0 0 0 #aaa296, 0 2px 4px #2b000b55; }
.gbs-face .b { left: 0; bottom: 0; }
.gbs-face .a { right: 0; top: 0; }

.gbs-startselect {
  position: absolute;
  left: 7%;
  top: 69%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 7;
  align-items: flex-start;
}
.gbs-startselect button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #f5dbe1;
  font: 700 5px/1 ui-monospace, monospace;
  letter-spacing: .08em;
  text-shadow: 0 1px 0 #43000f;
  cursor: pointer;
  touch-action: none;
  opacity: .9;
}
.gbs-startselect button::before {
  content: "";
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid #b3aa9d;
  background: radial-gradient(circle at 35% 28%, #fff, #f2eee6 42%, #d9d3c7 100%);
  box-shadow: 0 2px 0 #9f978b, 0 4px 7px #2b000b66, 0 1px 0 #fff inset;
}
.gbs-startselect button:active::before,
.gbs-startselect button.is-pressed::before {
  transform: translateY(2px);
  box-shadow: 0 0 0 #9f978b, 0 2px 3px #2b000b66;
}

.gbs-power-led {
  position: absolute;
  right: 8%;
  top: 17%;
  display: flex;
  align-items: center;
  gap: 5px;
  color: #e6aab6;
  font: 700 5px/1 ui-monospace, monospace;
  letter-spacing: .12em;
  z-index: 6;
}
.gbs-power-led i {
  width: 5px; height: 5px; border-radius: 50%;
  background: #ff3b47;
  box-shadow: 0 0 7px #ff3b47, 0 0 0 1px #5b0716 inset;
}

.gbs-speaker {
  position: absolute;
  right: 17%;
  bottom: 10%;
  width: 14%;
  height: 11%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  transform: rotate(-18deg);
  z-index: 5;
  opacity: .75;
}
.gbs-speaker i {
  display: block;
  height: 2px;
  border-radius: 2px;
  background: #4a0b18;
  box-shadow: 0 1px 0 #ff9db044;
  opacity: .8;
}

.gbs-port {
  position: absolute;
  border-radius: 3px;
  background: linear-gradient(#342d29, #100d0b 70%);
  box-shadow: 0 0 0 1px #080605, 0 1px 0 #ffffff2e inset;
  z-index: 8;
}
.gbs-port-top {
  top: -4px;
  right: 26%;
  width: 34px;
  height: 9px;
  border-radius: 2px 2px 4px 4px;
}

/* -------------------------------------------------------------- link cable */
.gbs-cable {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
  z-index: 5;
}
.gbs-cable path {
  fill: none;
  stroke: #302b27;
  stroke-width: 7;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  filter: drop-shadow(0 4px 3px #0004);
}
.gbs-cable path.highlight {
  stroke: #756c61;
  stroke-width: 2;
  stroke-dasharray: 3 10;
  opacity: .65;
}
.gbs-link-chip {
  display: none;
  align-items: center;
  gap: 7px;
  justify-self: center;
  padding: 5px 11px;
  border: 1px dashed var(--gbs-line-strong);
  border-radius: 99px;
  background: #fffdf7;
  color: var(--gbs-ink-faint);
  font: 700 8px/1 ui-monospace, monospace;
  letter-spacing: .12em;
  text-transform: uppercase;
}
.gbs-link-chip svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 2; }

/* ---------------------------------------------------------------- printer */
.gbs-printer-column {
  position: relative;
  min-width: 0;
  width: 100%;
  max-width: 500px;
  justify-self: center;
}
.gbs-printer-scene {
  position: relative;
  width: 100%;
  z-index: 1;
}
.gbs-printer {
  position: relative;
  width: 100%;
  aspect-ratio: 0.72 / 1;
  border-radius: 8% 8% 5% 5% / 4.5% 4.5% 3% 3%;
  background:
    radial-gradient(120% 70% at 25% 0%, #fffdf8 0%, transparent 55%),
    linear-gradient(180deg, #f0ebdf 0%, #e5decf 46%, #d2c9b8 100%);
  box-shadow:
    0 1px 0 #fff inset,
    0 -8px 20px #8a7d6524 inset,
    0 34px 46px -26px #3d3322,
    0 2px 0 #b8ae9b;
  color: #514b41;
}
.gbs-printer::before {
  content: "";
  position: absolute;
  inset: 2px;
  border-radius: 8% 8% 5% 5%;
  pointer-events: none;
  box-shadow: 0 0 0 1px #ffffff9c inset, 0 0 0 2px #a79a8324 inset;
}
.gbs-printer.is-printing { animation: gbs-print-shake .16s linear infinite; }
.gbs-printer.is-feeding { animation: gbs-print-shake .2s linear infinite; }
@keyframes gbs-print-shake {
  0%, 100% { transform: translate(0, 0) rotate(0); }
  25% { transform: translate(.5px, -.4px) rotate(.02deg); }
  75% { transform: translate(-.4px, .5px) rotate(-.02deg); }
}

.gbs-printer-cover {
  position: absolute;
  left: 21%;
  top: 1.5%;
  width: 58%;
  height: 26%;
  z-index: 3;
  border-radius: 13% 13% 5% 5% / 16% 16% 4% 4%;
  background:
    linear-gradient(155deg, #8f8d8dcc 0%, #565354dd 24%, #2c2a2ce8 58%, #171618f2 100%);
  box-shadow:
    0 2px 0 #ffffff30 inset,
    0 -2px 0 #0000006e inset,
    0 10px 20px #00000055,
    0 0 0 1px #1d1b1c;
  cursor: pointer;
  overflow: hidden;
}
.gbs-printer-cover::before {
  content: "";
  position: absolute;
  inset: 3% 4%;
  border-radius: inherit;
  border: 1px solid #ffffff28;
  pointer-events: none;
}
.gbs-printer-cover::after {
  content: "";
  position: absolute;
  left: 6%; right: 6%; top: 5%; height: 18%;
  border-radius: 50%;
  background: linear-gradient(180deg, #ffffff3d, transparent);
  pointer-events: none;
}
.gbs-printer-cover:focus-visible { outline: 3px solid #ffffff66; outline-offset: 3px; }
.gbs-cover-label {
  position: absolute;
  right: 4%;
  bottom: 3%;
  z-index: 4;
  font: 700 5px/1 ui-monospace, monospace;
  letter-spacing: .12em;
  color: #d8d4cd;
  opacity: .8;
}
.gbs-roll-window {
  position: absolute;
  inset: 9% 8% 13%;
  border-radius: 8% / 12%;
  overflow: hidden;
  background: #171417;
}
.gbs-roll-cylinder {
  position: absolute;
  left: 7%;
  right: 7%;
  top: 9%;
  height: 62%;
  border-radius: 50% / 42%;
  background:
    radial-gradient(ellipse at 32% 32%, #fffdf5 0%, #efe7d6 28%, #d8cfbd 56%, #b9ad96 78%, #8f836d 100%);
  box-shadow:
    0 5px 0 #ffffff45 inset,
    0 -10px 14px #00000088 inset,
    0 2px 4px #00000055;
}
.gbs-roll-core {
  position: absolute;
  left: 34%;
  right: 34%;
  top: 31%;
  height: 38%;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #e7dfcf, #a99e8a 58%, #796e5b);
  box-shadow: 0 4px 7px #00000066 inset, 0 0 0 2px #6f6553 inset;
}
.gbs-roll-fill {
  position: absolute;
  left: 12%; right: 12%; bottom: 6%;
  height: 4px;
  border-radius: 3px;
  background: #00000066;
  overflow: hidden;
  z-index: 3;
}
.gbs-roll-fill i { display: block; height: 100%; background: #efd9a8; box-shadow: 0 0 5px #f6e3b8; }
.gbs-roll-label {
  position: absolute;
  left: 50%;
  bottom: 2%;
  z-index: 4;
  transform: translateX(-50%);
  padding: 1px 4px;
  border-radius: 3px;
  background: #1d1a16a8;
  color: #fff8e8;
  font-size: 7px;
  line-height: 1.2;
  letter-spacing: .04em;
  text-shadow: 0 1px 2px #000;
}

.gbs-printer-band {
  position: absolute;
  left: 1%;
  right: 1%;
  top: 27.5%;
  height: 13.5%;
  z-index: 2;
  background:
    linear-gradient(180deg, #201e1c 0%, #121110 38%, #0b0a0a 100%);
  border-top: 1px solid #3d3934;
  border-bottom: 1px solid #3d3934;
  box-shadow: 0 2px 0 #ffffff12 inset, 0 -2px 5px #0009 inset;
}
.gbs-slot {
  position: absolute;
  left: 23%;
  top: 2.5%;
  width: 54%;
  height: 24%;
  border-radius: 2px;
  background: linear-gradient(#f0ecdf 0%, #d9d2c3 45%, #b6ad9d 100%);
  box-shadow:
    0 1px 0 #ffffff inset,
    0 2px 3px #00000088,
    0 0 0 1px #6f665a;
  overflow: visible;
  z-index: 5;
}
.gbs-slot::before {
  content: "";
  position: absolute;
  left: 5%; right: 5%; top: 38%;
  height: 2px;
  background: #35302a;
  box-shadow: 0 1px 0 #ffffff55;
}
.gbs-slot-teeth {
  position: absolute;
  left: 2%; right: 2%; bottom: -4px;
  height: 5px;
  background: repeating-linear-gradient(90deg, #e8e1d2 0 1px, #8e8576 1px 3px);
  opacity: .9;
}
.gbs-slot-tongue {
  position: absolute;
  left: 7%; right: 7%; bottom: 2px;
  height: 3px;
  background: #fbf7eb;
  box-shadow: 0 1px 2px #00000055;
}
.gbs-printer.is-printing .gbs-slot-tongue,
.gbs-printer.is-feeding .gbs-slot-tongue { height: 5px; }
.gbs-slot-glow { display: none; }

.gbs-printer-logo {
  position: absolute;
  left: 6%;
  top: 34%;
  z-index: 4;
  color: #ded9ce;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-style: italic;
  font-weight: 800;
  letter-spacing: -.03em;
  line-height: .95;
  text-shadow: 0 1px 0 #000;
  font-size: clamp(10px, 2vw, 18px);
}
.gbs-printer-logo b {
  display: block;
  margin-top: 1px;
  color: #f2eee5;
  font-weight: 800;
  font-size: 1.34em;
  letter-spacing: -.04em;
}
.gbs-printer-lights {
  position: absolute;
  right: 4%;
  top: 24%;
  display: flex;
  align-items: center;
  gap: 7px;
  z-index: 4;
}
.gbs-pilot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #4f4a42;
  box-shadow: 0 0 0 2px #00000022 inset;
}
.gbs-pilot.on { background: #48b961; box-shadow: 0 0 8px #48b961cc, 0 0 0 2px #2b7a3c33; }
.gbs-pilot.busy { background: var(--gbs-amber); box-shadow: 0 0 8px #e8a51bcc; animation: gbs-pulse .7s ease-in-out infinite alternate; }
.gbs-pilot.error { background: var(--gbs-red); box-shadow: 0 0 8px #bf3b30cc; }
.gbs-battery-label {
  color: #8c857b;
  font: 700 4.5px/1 ui-monospace, monospace;
  letter-spacing: .1em;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}
@keyframes gbs-pulse { to { opacity: .45; } }

.gbs-printer-front {
  position: absolute;
  left: 3%;
  right: 3%;
  top: 41%;
  bottom: 2.5%;
  border-radius: 3.5% 3.5% 4% 4%;
  background:
    linear-gradient(180deg, #ffffff3d, #00000006),
    linear-gradient(180deg, #e7e0d2 0%, #ded6c7 46%, #cfc6b5 100%);
  box-shadow:
    0 1px 0 #fff8 inset,
    0 -1px 0 #8f826d44 inset,
    0 3px 8px #6b5d4424;
  z-index: 1;
}
.gbs-nintendo {
  position: absolute;
  left: 50%;
  top: 8%;
  transform: translateX(-50%);
  padding: 2px 13px;
  border: 1px solid #c0b7a6;
  border-radius: 99px;
  color: #b7ae9d;
  font: italic 700 clamp(8px, 1.2vw, 11px)/1.1 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: .01em;
  text-shadow: 0 1px 0 #fff;
  box-shadow: 0 1px 0 #fff inset;
  z-index: 4;
  pointer-events: none;
}
.gbs-feed {
  position: absolute;
  left: 3%;
  bottom: 9%;
  width: 17%;
  aspect-ratio: 1;
  border: 1px solid #7f1731;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 28%, #e78098 0%, #c33f61 32%, #a11a3d 66%, #741027 100%);
  color: #f4d4dc;
  font: 700 clamp(7px, 1.2vw, 11px)/1 ui-monospace, monospace;
  letter-spacing: .06em;
  cursor: pointer;
  box-shadow:
    0 3px 0 #5d0c20,
    0 7px 12px #0004,
    0 1px 0 #ffffff55 inset,
    0 -4px 8px #47071a66 inset;
  z-index: 6;
}
.gbs-feed:active, .gbs-feed.is-pressed {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #5d0c20, 0 3px 5px #0004, 0 1px 0 #ffffff55 inset;
}
.gbs-feed[disabled] { opacity: .45; pointer-events: none; }

.gbs-power {
  position: absolute;
  right: 2.5%;
  bottom: 8%;
  width: 17%;
  border: 0;
  background: transparent;
  color: #81786a;
  font: 700 clamp(5px, .8vw, 7px)/1 ui-monospace, monospace;
  letter-spacing: .08em;
  cursor: pointer;
  z-index: 6;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.gbs-power-case {
  position: relative;
  display: block;
  width: 82%;
  aspect-ratio: 1.35 / 1;
  border: 1px solid #9f9583;
  border-radius: 3px;
  background: linear-gradient(180deg, #cfc7b8, #b8af9e);
  box-shadow: 0 2px 4px #0003, 0 1px 0 #fff6 inset;
}
.gbs-switch {
  position: absolute;
  left: 16%;
  bottom: 15%;
  width: 68%;
  height: 58%;
  border-radius: 3px;
  background: linear-gradient(145deg, #f0ece2, #c9c1b2);
  box-shadow: 0 2px 3px #0005, 0 1px 0 #fff inset;
  transition: transform .14s ease, background .14s ease;
}
.gbs-power.is-on .gbs-switch {
  background: linear-gradient(145deg, #e7e2d7, #bdb4a3);
  transform: translateY(-62%);
}
.gbs-power-label { margin-top: 1px; }
.gbs-onoff {
  position: absolute;
  right: -16%;
  top: 22%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 4.5px;
  color: #8b8274;
  letter-spacing: .06em;
}
.gbs-power.is-on .gbs-onoff span:first-child { color: #6e6557; }
.gbs-power:not(.is-on) .gbs-onoff span:last-child { color: #6e6557; }

.gbs-printer-feet {
  position: absolute;
  left: 7%; right: 7%; bottom: -7px;
  height: 10px;
  background: linear-gradient(#b5ab99, #8f8370);
  border-radius: 0 0 5px 5px;
  box-shadow: 0 3px 5px #0004;
}
.gbs-port-printer {
  right: -5px;
  top: 58%;
  width: 10px;
  height: 26px;
  border-radius: 3px 5px 5px 3px;
}

.gbs-paper-stage {
  position: absolute;
  left: 50%;
  top: 30.2%;
  width: 50%;
  height: 57.6%;
  transform: translateX(-50%);
  z-index: 8;
  overflow: hidden;
  border-radius: 0 0 2px 2px;
}
.gbs-paper-empty:empty { display: none; }
.gbs-paper-empty {
  position: absolute;
  left: 50%;
  top: 9px;
  transform: translateX(-50%);
  z-index: 9;
  padding: 4px 8px;
  border: 1px dashed #c8bda9;
  border-radius: 99px;
  background: #fffdf7d8;
  color: #7b7367;
  font: 700 7px/1 ui-monospace, monospace;
  letter-spacing: .1em;
  text-transform: uppercase;
  white-space: nowrap;
  pointer-events: none;
  backdrop-filter: blur(2px);
}
.gbs-paper-scroll {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  scrollbar-width: thin;
  scrollbar-color: #b9ae9b transparent;
  overscroll-behavior: contain;
}
.gbs-paper-scroll::-webkit-scrollbar { width: 5px; }
.gbs-paper-scroll::-webkit-scrollbar-thumb { background: #b9ae9b; border-radius: 6px; }

.gbs-paper {
  position: relative;
  width: 100%;
  flex: 0 0 auto;
  margin: 0;
  background: var(--gbs-paper);
  border-radius: 1px 1px 0 0;
  box-shadow:
    0 -1px 0 #fff inset,
    0 0 0 1px #cfc5b3,
    0 8px 18px #3f34223d,
    -8px 0 14px -12px #0005,
    8px 0 14px -12px #0005;
  transition: transform .18s ease;
  touch-action: pan-y;
}
.gbs-paper.is-near { transform: translateY(2px); }
.gbs-paper.is-tearing { transform: translateY(16px) rotate(.5deg); }
.gbs-paper::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  background:
    repeating-linear-gradient(0deg, #00000005 0 1px, transparent 1px 3px),
    radial-gradient(80% 30% at 20% 10%, #fff9 0%, transparent 60%);
  mix-blend-mode: multiply;
  opacity: .45;
}
.gbs-paper::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  box-shadow: inset 0 0 22px #a9956b1f;
}
.gbs-paper-canvas-clip {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 1px 1px 0 0;
  z-index: 1;
  cursor: grab;
}
.gbs-paper-canvas-clip:active { cursor: grabbing; }
.gbs-paper-canvas-clip canvas {
  display: block;
  width: 100%;
  height: auto;
  image-rendering: pixelated;
}
.gbs-tear-tab {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 24px;
  border-top: 1px dashed #9d927f;
  background: linear-gradient(#f4eedf, #eae2d1);
  color: #6b6357;
  font-size: 7px;
  letter-spacing: .08em;
  text-transform: uppercase;
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.gbs-tear-tab:active { cursor: grabbing; }
.gbs-tear-tab svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; }
.gbs-paper.is-empty .gbs-tear-tab { display: none; }

.gbs-scissors {
  position: absolute;
  top: 22%;
  right: -2%;
  z-index: 30;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid #c8bda9;
  border-radius: 50%;
  background: #fffdf7e8;
  color: #665f54;
  box-shadow: 0 4px 12px #3f34221f;
  cursor: pointer;
  backdrop-filter: blur(3px);
}
.gbs-scissors svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.gbs-scissors:hover { background: #fff; color: var(--gbs-crimson); }
.gbs-scissors[disabled] { opacity: .35; pointer-events: none; }

.gbs-statusbar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  padding: 7px 10px;
  border: 1px solid var(--gbs-line);
  border-radius: 8px;
  background: #fffdf7b8;
  font-size: 11px;
  color: var(--gbs-ink-soft);
}
.gbs-statusbar .gbs-roll-text { margin-left: auto; color: var(--gbs-ink-faint); font-variant-numeric: tabular-nums; }
.gbs-status-led { width: 7px; height: 7px; border-radius: 50%; background: var(--gbs-green); box-shadow: 0 0 6px #3f9b5780; flex: 0 0 auto; }
.gbs-status-led.busy { background: var(--gbs-amber); box-shadow: 0 0 7px #e8a51bcc; }
.gbs-status-led.error { background: var(--gbs-red); box-shadow: 0 0 7px #bf3b30cc; }
.gbs-status-led.off { background: #9b9488; box-shadow: none; }

/* ---------------------------------------------------------------- toolbar */
.gbs-toolbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;
  padding: 10px;
  border: 1px solid var(--gbs-line);
  border-radius: 13px;
  background: #fffdf7;
  box-shadow: 0 2px 0 #fff inset, 0 8px 20px -18px #3d3322;
}
.gbs-tools, .gbs-export { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.gbs-export { gap: 0; border: 1px solid var(--gbs-line); border-radius: 9px; overflow: hidden; }
.gbs-export-label { padding: 0 8px 0 10px; font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: var(--gbs-ink-faint); }
.gbs-export .gbs-btn { border: 0; border-left: 1px solid var(--gbs-line); border-radius: 0; box-shadow: none; min-height: 32px; background: transparent; font-size: 11px; }
.gbs-export .gbs-btn:hover { background: #00000007; }
.gbs-export .gbs-btn:active { transform: none; }

/* ------------------------------------------------------------------ pages */
.gbs-pages {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px dashed var(--gbs-line-strong);
}
.gbs-pages-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.gbs-pages h3 { margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: .13em; color: var(--gbs-ink-soft); }
.gbs-pages-head span { font-size: 10.5px; color: var(--gbs-ink-faint); }
.gbs-page-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.gbs-page-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 9px;
  border: 1px solid var(--gbs-line);
  border-radius: 10px;
  background: #fffdf8;
  box-shadow: 0 2px 0 #fff inset;
}
.gbs-page-thumb {
  display: grid;
  place-items: center;
  height: 130px;
  overflow: hidden;
  border-radius: 5px;
  background: #e7e0d1;
  box-shadow: 0 2px 6px #00000010 inset;
}
.gbs-page-thumb img { display: block; max-width: 84%; max-height: 120px; width: auto; height: auto; image-rendering: pixelated; box-shadow: 0 3px 8px #0003; background: #faf6e9; }
.gbs-page-meta { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; font-size: 10px; color: var(--gbs-ink-faint); }
.gbs-page-meta strong { color: var(--gbs-ink-soft); font-size: 10.5px; }
.gbs-page-actions { display: flex; gap: 4px; flex-wrap: wrap; }
.gbs-page-actions .gbs-btn { min-height: 25px; padding: 3px 7px; font-size: 10px; box-shadow: none; }
.gbs-page-actions .gbs-btn svg { width: 12px; height: 12px; }
.gbs-page-remove { position: absolute; top: 5px; right: 5px; width: 22px; height: 22px; padding: 0; border-radius: 50%; }
.gbs-page-remove svg { width: 12px; height: 12px; }

/* ------------------------------------------------------------------ toast */
.gbs-toast {
  position: absolute;
  left: 50%;
  bottom: 22px;
  z-index: 30;
  transform: translate(-50%, 18px);
  max-width: min(92%, 520px);
  padding: 9px 14px;
  border-radius: 9px;
  background: #211f1cf2;
  color: #fffdf6;
  font-size: 11.5px;
  line-height: 1.4;
  text-align: center;
  box-shadow: 0 10px 30px #0006;
  opacity: 0;
  pointer-events: none;
  transition: opacity .18s ease, transform .18s ease;
}
.gbs-toast.show { opacity: 1; transform: translate(-50%, 0); }
.gbs-toast.is-error { background: #7e1d1df2; }

/* ---------------------------------------------------------------- dialogs */
.gbs-dialog {
  width: min(700px, 92vw);
  max-height: 86vh;
  padding: 0;
  border: 1px solid #c8bda9;
  border-radius: 18px;
  background: var(--gbs-panel);
  color: var(--gbs-ink);
  box-shadow: 0 30px 80px #0007;
  overflow: hidden;
}
.gbs-dialog::backdrop { background: #17130d99; backdrop-filter: blur(3px); }
.gbs-dialog[open] { animation: gbs-dialog-in .16s ease-out; }
@keyframes gbs-dialog-in { from { transform: translateY(8px) scale(.99); opacity: .6; } }
.gbs-dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--gbs-line);
  background: linear-gradient(#fff, #f8f3e8);
}
.gbs-dialog-head h3 { margin: 0; font-family: "GBS Pixel", ui-monospace, monospace; font-size: 13px; line-height: 1.4; }
.gbs-dialog-close { width: 30px; height: 30px; min-height: 30px; padding: 0; border-radius: 50%; }
.gbs-dialog-close svg { width: 14px; height: 14px; }
.gbs-dialog-body { padding: 18px; overflow-y: auto; max-height: calc(86vh - 130px); font-size: 13px; }
.gbs-dialog-body p { margin: 0 0 11px; color: var(--gbs-ink-soft); }
.gbs-dialog-body h4 { margin: 18px 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: var(--gbs-ink-soft); }
.gbs-dialog-body ol, .gbs-dialog-body ul { margin: 0 0 12px; padding-left: 20px; }
.gbs-dialog-body li { margin: 5px 0; }
.gbs-dialog-body kbd, .gbs-key {
  display: inline-block;
  min-width: 26px;
  padding: 2px 6px;
  border: 1px solid #bdb29f;
  border-radius: 5px;
  background: #f8f4ea;
  box-shadow: 0 2px 0 #d6ccba;
  font: 600 10px/1.4 ui-monospace, monospace;
  text-align: center;
  color: #4b453c;
}
.gbs-dialog-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 12px 18px 16px; border-top: 1px solid var(--gbs-line); background: #fbf7ee; flex-wrap: wrap; }
.gbs-dialog-footer .gbs-spacer { margin-right: auto; }

.gbs-controls-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.gbs-controls-table th, .gbs-controls-table td { padding: 7px 6px; border-bottom: 1px solid #e5ddcd; text-align: left; }
.gbs-controls-table th { font-size: 9.5px; text-transform: uppercase; letter-spacing: .1em; color: var(--gbs-ink-faint); font-weight: 700; }
.gbs-controls-table td:last-child { text-align: right; }
.gbs-binding { min-width: 74px; font: 600 11px/1 ui-monospace, monospace; color: #3f3a32; }
.gbs-binding.is-listening { min-width: 90px; color: var(--gbs-crimson); border-color: var(--gbs-crimson); animation: gbs-pulse .6s infinite alternate; }

.gbs-paper-panel { display: grid; grid-template-columns: 120px 1fr; gap: 18px; align-items: center; }
.gbs-paper-visual {
  position: relative;
  height: 110px;
  border-radius: 14px;
  background: linear-gradient(160deg, #746b5e, #38342d);
  box-shadow: 0 2px 8px #0004 inset;
  overflow: hidden;
}
.gbs-paper-visual::before {
  content: "";
  position: absolute;
  left: 18%; right: 18%; top: 16%;
  height: 60%;
  border-radius: 50% / 38%;
  background: radial-gradient(circle at 32% 36%, #fffdf6, #e3dac8 45%, #b6aa93 72%, #8b7e68);
  box-shadow: 0 4px 0 #ffffff55 inset, 0 -8px 10px #00000066 inset;
}
.gbs-paper-visual::after {
  content: "";
  position: absolute;
  left: 18%; right: 18%; top: 21%;
  height: 13%;
  border-radius: 50%;
  border: 3px solid #8d806a;
  background: #4c4438;
  box-shadow: 0 2px 4px #0007 inset;
}
.gbs-paper-visual .gbs-roll-fill { left: 22%; right: 22%; bottom: 12%; width: auto; height: 6px; }
.gbs-paper-copy strong { display: block; font-size: 14px; margin-bottom: 4px; }
.gbs-paper-copy p { margin: 0 0 10px; font-size: 12px; }
.gbs-paper-stats { display: flex; gap: 14px; flex-wrap: wrap; margin: 9px 0 12px; font-size: 11px; color: var(--gbs-ink-faint); }
.gbs-paper-stats b { color: var(--gbs-ink); font-variant-numeric: tabular-nums; }
.gbs-cover-state { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: var(--gbs-ink-faint); }
.gbs-cover-state::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--gbs-green); }
.gbs-cover-state.is-open::before { background: var(--gbs-amber); }

.gbs-help-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
.gbs-help-card { padding: 12px; border: 1px solid var(--gbs-line); border-radius: 10px; background: #fffdf8; }
.gbs-help-card h4 { margin: 0 0 6px; }
.gbs-help-card p { margin: 0; font-size: 12px; }
.gbs-legal { margin-top: 16px; padding-top: 12px; border-top: 1px dashed var(--gbs-line); font-size: 10px; color: var(--gbs-ink-faint); line-height: 1.6; }
.gbs-legal a { color: inherit; }

.gbs-sr-only {
  position: absolute !important;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0);
  white-space: nowrap; border: 0;
}

/* -------------------------------------------------------------- responsive */
@media (max-width: 1040px) {
  .gbs-stage { grid-template-columns: 1fr; gap: 18px; }
  .gbs-cable { display: none; }
  .gbs-link-chip { display: inline-flex; order: 1; }
  .gbs-gba-column { order: 0; }
  .gbs-printer-column { order: 2; max-width: 460px; margin: 0 auto; width: 100%; }
  .gbs-gba { max-width: 680px; margin: 0 auto; }
  .gbs-device-label { max-width: 680px; margin: 0 auto 10px; }
  .gbs-under-gba { max-width: 680px; margin: 13px auto 0; }
  .gbs-printer-logo { font-size: 15px; }
}
@media (max-width: 640px) {
  .gbs-root { padding: 13px; border-radius: 18px; }
  .gbs-header { align-items: flex-start; }
  .gbs-title h2 { font-size: 16px; }
  .gbs-title p { font-size: 12px; }
  .gbs-header-actions .gbs-btn { font-size: 11px; }
  .gbs-stage { padding-top: 16px; }
  .gbs-gba { aspect-ratio: 1.58 / 1; border-radius: 11px 64px 18px 13px / 17px 54px 22px 15px; }
  .gbs-bezel { left: 16%; width: 63%; top: 11%; height: 79%; padding: 3.6% 4%; }
  .gbs-dpad { left: 3.5%; top: 42%; width: 17%; }
  .gbs-face { right: 4%; top: 40%; width: 19%; }
  .gbs-startselect { left: 5%; top: 70%; gap: 7px; }
  .gbs-startselect button { font-size: 4.5px; gap: 4px; }
  .gbs-startselect button::before { width: 15px; height: 15px; }
  .gbs-power-led { right: 6%; top: 16%; font-size: 4.5px; }
  .gbs-speaker { right: 17%; bottom: 10%; width: 15%; }
  .gbs-printer-column { max-width: 380px; }
  .gbs-printer-logo { font-size: 13px; }
  .gbs-printer-lights { gap: 5px; }
  .gbs-nintendo { font-size: 8px; padding: 1px 9px; }
  .gbs-tear-tab { font-size: 6px; height: 21px; }
  .gbs-toolbar { align-items: stretch; }
  .gbs-tools { width: 100%; }
  .gbs-tools .gbs-btn { flex: 1 1 auto; }
  .gbs-export { width: 100%; justify-content: space-between; }
  .gbs-export .gbs-btn { flex: 1; }
  .gbs-paper-panel { grid-template-columns: 1fr; }
  .gbs-paper-visual { height: 90px; }
  .gbs-save-hint { width: 100%; margin-left: 0; }
  .gbs-toast { position: fixed; top: auto; bottom: 12px; }
  .gbs-export-label { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .gbs-root *, .gbs-root *::before, .gbs-root *::after {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .001ms !important;
  }
}
`;
}
