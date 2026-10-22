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
  grid-template-columns: minmax(340px, 420px) minmax(0, 1fr);
  gap: clamp(20px, 4vw, 54px);
  align-items: center;
  padding-top: 22px;
}

.gbs-gba-column, .gbs-printer-column { position: relative; min-width: 0; z-index: 1; }
.gbs-printer-column { order: 0; }
.gbs-gba-column { order: 1; }

/* ------------------------------------------------------------------ GBA */
.gbs-gba-photo {
  position: relative;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  filter: drop-shadow(0 26px 28px #3a101b66);
  user-select: none;
}
.gbs-gba-image {
  display: block;
  width: 100%;
  height: auto;
  pointer-events: none;
}
.gbs-gba-power-led {
  position: absolute;
  left: 84.08%;
  top: 18.36%;
  width: 1.35%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle at 34% 28%, #7b3834 0 8%, #4a1717 42%, #1a0303 100%);
  box-shadow:
    0 1px 2px #12000099 inset,
    0 0 0 1px #2a0000aa,
    0 1px 0 #ffffff26 inset;
  transform: translate(-50%, -50%);
  z-index: 16;
  pointer-events: none;
  transition: box-shadow .15s ease, filter .15s ease;
}
.gbs-gba-power-led.on {
  background: radial-gradient(
    circle at 34% 28%,
    #fff8f8 0 7%,
    #ffb6bc 14%,
    #ff4052 36%,
    #df001d 65%,
    #730009 100%
  );
  box-shadow:
    0 0 5px #ff2238d9,
    0 0 12px #ff001f73,
    0 0 0 1px #640008,
    0 1px 1px #ffffffb8 inset,
    0 -1px 2px #4a0006 inset;
  filter: saturate(1.08);
}
.gbs-under-gba {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  gap: 8px;
  width: 100%;
  margin-top: 13px;
}
.gbs-screen-mount {
  position: absolute;
  left: 25.7%;
  top: 17.5%;
  width: 46.4%;
  height: 54%;
  background: #050508;
  overflow: hidden;
  border-radius: 2.2% / 4.2%;
  box-shadow: 0 0 0 2px #060608, 0 0 18px #00000080 inset;
  z-index: 3;
}
.gbs-screen-mount canvas {
  position: absolute;
  left: 1.6%;
  top: 1.6%;
  display: block;
  width: 96.8%;
  height: 96.8%;
  background: #101018;
  border-radius: 1.8% / 3.4%;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
.gbs-screen-mount::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(118deg, #ffffff1c 0%, transparent 34%, transparent 72%, #ffffff08 100%),
    radial-gradient(90% 45% at 50% 0%, #ffffff14, transparent 70%);
  z-index: 2;
}
.gbs-screen-loading {
  position: absolute;
  inset: 1.6%;
  display: grid;
  place-items: center;
  gap: 8px;
  background: #0e0e14;
  color: #d8d3ca;
  font-family: "GBS Pixel", ui-monospace, monospace;
  font-size: clamp(7px, 1.1vw, 11px);
  text-align: center;
  line-height: 1.8;
  z-index: 3;
  padding: 12px;
  border-radius: 1.8% / 3.4%;
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

.gbs-hit {
  position: absolute;
  z-index: 14;
  padding: 0;
  border: 0;
  background: transparent;
  color: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: none;
  border-radius: 50%;
  transition: background .12s ease, box-shadow .12s ease;
}
.gbs-hit:hover { background: #ffffff26; box-shadow: 0 0 0 2px #ffffffb0; }
.gbs-hit:active, .gbs-hit.is-pressed { background: #ffffff3d; box-shadow: 0 0 0 3px #fff; }
.gbs-hit:focus-visible { outline: 3px solid #ffffffd9; outline-offset: 2px; }

.gbs-hit-a { left: 89.5%; top: 33.8%; width: 8%; height: 13%; }
.gbs-hit-b { left: 79.8%; top: 39.4%; width: 8%; height: 13%; }
.gbs-hit-start { left: 16%; top: 62.5%; width: 5.4%; height: auto; aspect-ratio: 1; }
.gbs-hit-select { left: 16.1%; top: 72.2%; width: 5.4%; height: auto; aspect-ratio: 1; }
.gbs-hit-l { left: 8%; top: 1%; width: 22%; height: 5.5%; border-radius: 0 0 18px 18px; }
.gbs-hit-r { right: 7%; top: 1%; width: 22%; height: 5.5%; border-radius: 0 0 18px 18px; }

.gbs-dpad-photo {
  position: absolute;
  left: 4.7%;
  top: 31.6%;
  width: 13.3%;
  height: 22.2%;
  z-index: 14;
}
.gbs-dpad-photo button {
  position: absolute;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  border-radius: 8px;
  transition: background .12s ease, box-shadow .12s ease;
}
.gbs-dpad-photo button:hover { background: #ffffff26; box-shadow: 0 0 0 2px #ffffffb0; }
.gbs-dpad-photo button:active, .gbs-dpad-photo button.is-pressed { background: #ffffff3d; box-shadow: 0 0 0 3px #fff; }
.gbs-dpad-photo button:focus-visible { outline: 3px solid #ffffffd9; outline-offset: 2px; }
.gbs-dpad-photo .dpad-up { left: 31%; top: 0; width: 38%; height: 38%; }
.gbs-dpad-photo .dpad-down { left: 31%; bottom: 0; width: 38%; height: 38%; }
.gbs-dpad-photo .dpad-left { left: 0; top: 31%; width: 38%; height: 38%; }
.gbs-dpad-photo .dpad-right { right: 0; top: 31%; width: 38%; height: 38%; }

.gbs-port {
  position: absolute;
  border-radius: 3px;
  background: linear-gradient(#342d29, #100d0b 70%);
  box-shadow: 0 0 0 1px #080605, 0 1px 0 #ffffff2e inset;
  z-index: 16;
}
.gbs-port-top {
  top: -1.2%;
  left: 37.5%;
  width: 7%;
  height: 2.4%;
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
  max-width: 400px;
  justify-self: center;
}
.gbs-printer-scene {
  position: relative;
  width: 100%;
  z-index: 1;
}
.gbs-printer-image {
  display: block;
  width: 100%;
  height: auto;
  pointer-events: none;
  filter: drop-shadow(0 30px 34px #3d332266);
}
.gbs-printer-scene.is-printing .gbs-printer-image { animation: gbs-print-shake .18s linear infinite; }
.gbs-printer-scene.is-feeding .gbs-printer-image { animation: gbs-print-shake .24s linear infinite; }
@keyframes gbs-print-shake {
  0%, 100% { transform: translate(0, 0) rotate(0); }
  25% { transform: translate(.4px, -.3px) rotate(.015deg); }
  75% { transform: translate(-.3px, .4px) rotate(-.015deg); }
}

.gbs-hit-cover {
  left: 14%;
  top: 1%;
  width: 72%;
  height: 33%;
  border-radius: 14% 14% 8% 8% / 20% 20% 6% 6%;
}
.gbs-hit-feed {
  left: 12.8%;
  top: 77.2%;
  width: 21.5%;
  height: 11%;
  border-radius: 50%;
}
.gbs-hit-power {
  left: 54.3%;
  top: 78%;
  width: 27.2%;
  height: 14.7%;
  border-radius: 7px;
}
.gbs-port-printer {
  right: -5px;
  top: 61%;
  width: 10px;
  height: 30px;
  border-radius: 3px 5px 5px 3px;
}
.gbs-printer-led {
  position: absolute;
  left: 89.7%;
  top: 54.5%;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4f4a42;
  box-shadow: 0 0 0 1px #00000055, 0 0 0 2px #ffffff33 inset;
  z-index: 20;
  pointer-events: none;
}
.gbs-printer-led.on { background: #48b961; box-shadow: 0 0 8px #48b961cc, 0 0 0 1px #2b7a3c; }
.gbs-printer-led.busy { background: var(--gbs-amber); box-shadow: 0 0 9px #e8a51bdd, 0 0 0 1px #8c5e0e; animation: gbs-pulse .7s ease-in-out infinite alternate; }
.gbs-printer-led.error { background: var(--gbs-red); box-shadow: 0 0 9px #bf3b30dd, 0 0 0 1px #6d1812; }
.gbs-printer-link-led { left: auto; right: 1.4%; top: 59.4%; width: 5px; height: 5px; }
.gbs-printer-link-led.on { background: #5aa5e8; box-shadow: 0 0 8px #5aa5e8cc; }
@keyframes gbs-pulse { to { opacity: .45; } }

.gbs-paper-stage {
  position: absolute;
  left: 50%;
  top: 0.5%;
  width: 62%;
  height: 39.4%;
  transform: translateX(-50%);
  z-index: 18;
  overflow: hidden;
  border-radius: 2px 2px 0 0;
}
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
.gbs-paper-empty:empty { display: none; }
.gbs-paper-scroll {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
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
  margin: auto 0 0;
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
.gbs-paper.is-near { transform: translateY(-2px); }
.gbs-paper.is-tearing { transform: translateY(-16px) rotate(-.5deg); }
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
  border-bottom: 1px dashed #9d927f;
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
  top: 1.5%;
  right: -1%;
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
  width: 100%;
  gap: 8px;
  margin-top: 18px;
  padding: 7px 10px;
  border: 1px solid var(--gbs-line);
  border-radius: 8px;
  background: #fffdf7b8;
  font-size: 11px;
  color: var(--gbs-ink-soft);
}
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
.gbs-export {
  flex: 0 0 320px;
  width: 320px;
  max-width: 100%;
  gap: 0;
  border: 1px solid var(--gbs-line);
  border-radius: 9px;
  overflow: hidden;
}
.gbs-export .gbs-btn {
  flex: 1 1 0;
  min-width: 0;
  justify-content: center;
  border: 0;
  border-left: 1px solid var(--gbs-line);
  border-radius: 0;
  box-shadow: none;
  min-height: 32px;
  padding: 0 8px;
  background: transparent;
  font-size: 11px;
}
.gbs-export .gbs-btn:first-child { border-left: 0; }
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
  .gbs-printer-column { order: 2; max-width: 420px; margin: 0 auto; width: 100%; }
  .gbs-gba-photo { max-width: 700px; }
  .gbs-under-gba { max-width: 700px; margin: 13px auto 0; }
}
@media (max-width: 640px) {
  .gbs-root { padding: 13px; border-radius: 18px; }
  .gbs-header { align-items: flex-start; }
  .gbs-title h2 { font-size: 16px; }
  .gbs-title p { font-size: 12px; }
  .gbs-header-actions .gbs-btn { font-size: 11px; }
  .gbs-stage { padding-top: 16px; }
  .gbs-printer-column { max-width: 360px; }
  .gbs-screen-mount { box-shadow: 0 0 0 4px #08080b, 0 0 18px #00000080 inset; }
  .gbs-scissors { top: 29%; right: 0; width: 30px; height: 30px; }
  .gbs-tear-tab { font-size: 6px; height: 21px; }
  .gbs-toolbar { align-items: stretch; }
  .gbs-tools { width: 100%; }
  .gbs-tools .gbs-btn { flex: 1 1 auto; }
  .gbs-export { flex: 1 1 100%; width: 100%; justify-content: space-between; }
  .gbs-export .gbs-btn { flex: 1; }
  .gbs-paper-panel { grid-template-columns: 1fr; }
  .gbs-paper-visual { height: 90px; }
  .gbs-toast { position: fixed; top: auto; bottom: 12px; }
}
/* ------------------------------------------------------------------ guide */
.gbs-guide-intro { width: min(520px, 92vw); }
.gbs-guide-intro .gbs-dialog-body p { margin: 0; }
.gbs-guide {
  position: fixed;
  inset: 0;
  z-index: 60;
  cursor: pointer;
}
.gbs-guide[hidden] { display: none; }
.gbs-guide-hole {
  position: fixed;
  border-radius: 14px;
  box-shadow: 0 0 0 9999px rgba(24, 20, 14, .66);
  pointer-events: none;
  transition: left .18s ease, top .18s ease, width .18s ease, height .18s ease;
  z-index: 1;
}
.gbs-guide-ring {
  position: fixed;
  border: 2px solid #ffd36a;
  border-radius: 13px;
  box-shadow: 0 0 0 4px #ffd36a2e, 0 0 22px #ffd36a99;
  pointer-events: none;
  z-index: 2;
  animation: gbs-guide-pulse 1.25s ease-in-out infinite alternate;
}
@keyframes gbs-guide-pulse { to { box-shadow: 0 0 0 7px #ffd36a1f, 0 0 30px #ffd36acc; } }
.gbs-guide-callout {
  position: fixed;
  z-index: 3;
  width: min(360px, calc(100vw - 28px));
  padding: 13px 15px 12px;
  border: 1px solid #c8bda9;
  border-radius: 13px;
  background: #fffdf7;
  color: var(--gbs-ink);
  box-shadow: 0 18px 50px #0007;
  pointer-events: none;
}
.gbs-guide-callout strong {
  display: block;
  margin-bottom: 4px;
  font-family: "GBS Pixel", ui-monospace, monospace;
  font-size: 11px;
  line-height: 1.5;
}
.gbs-guide-callout span { display: block; color: var(--gbs-ink-soft); font-size: 12px; line-height: 1.5; }
.gbs-guide-callout em {
  display: block;
  margin-top: 9px;
  color: var(--gbs-crimson);
  font-size: 10px;
  font-style: normal;
  font-weight: 700;
  letter-spacing: .05em;
  text-transform: uppercase;
}
.gbs-guide-callout em[data-waiting="true"] { color: var(--gbs-ink-faint); }
.gbs-guide-arrow {
  position: absolute;
  width: 13px;
  height: 13px;
  background: #fffdf7;
  border: 1px solid #c8bda9;
  transform: rotate(45deg);
}
.gbs-guide-callout[data-placement="below"] .gbs-guide-arrow {
  top: -7px;
  left: var(--gbs-arrow-x, 24px);
  border-right: 0;
  border-bottom: 0;
}
.gbs-guide-callout[data-placement="above"] .gbs-guide-arrow {
  bottom: -7px;
  left: var(--gbs-arrow-x, 24px);
  border-left: 0;
  border-top: 0;
}
.gbs-guide-end {
  position: fixed;
  top: 14px;
  right: 14px;
  z-index: 70;
  padding: 8px 13px;
  border: 1px solid #c8bda9;
  border-radius: 99px;
  background: #fffdf7;
  color: var(--gbs-ink);
  font: 700 10px/1 ui-monospace, monospace;
  letter-spacing: .04em;
  cursor: pointer;
  box-shadow: 0 6px 18px #0004;
  pointer-events: auto;
}
.gbs-guide-end:hover { background: #fff; color: var(--gbs-crimson); }
.gbs-guide-end:focus-visible { outline: 3px solid #ffd36a; outline-offset: 2px; }
@media (max-width: 640px) {
  .gbs-guide-callout { width: calc(100vw - 22px); }
  .gbs-guide-end { top: 8px; right: 8px; }
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
