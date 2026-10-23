import { mountDemo } from './app.js';

const asset = (path) => new URL(`../${path}`, import.meta.url).href;

const isOff = (value) => /^(false|0|no|off)$/i.test(value || '');

class GBScribeEmulator extends HTMLElement {
  connectedCallback() {
    if (this._demo) return;
    this._demo = mountDemo(this, {
      romUrl: this.getAttribute('rom-url') || asset('assets/roms/GBScribe.gba'),
      biosUrl: this.getAttribute('bios-url') || asset('vendor/gbajs/resources/bios.bin'),
      vendorBase: this.getAttribute('vendor-base') || asset('vendor/gbajs/js/'),
      fontUrl: this.getAttribute('font-url') || asset('assets/fonts/PressStart2P-Regular.woff2'),
      gbaImageUrl: this.getAttribute('gba-image') || asset('assets/img/gba.webp'),
      printerImageUrl: this.getAttribute('printer-image') || asset('assets/img/printer.webp'),
      printerSwitchOnUrl:
        this.getAttribute('printer-switch-on') || asset('assets/img/printer-switch-on.webp'),
      printerSwitchOffUrl:
        this.getAttribute('printer-switch-off') || asset('assets/img/printer-switch-off.webp'),
      guidePrompt: !isOff(this.getAttribute('guide-prompt')),
    });
    this.setAttribute('data-ready', '');
    window.__gbsDemo = this._demo;
    this.dispatchEvent(new CustomEvent('gbs-ready', { bubbles: true, detail: this._demo }));
  }

  disconnectedCallback() {
    this._demo?.destroy();
    this._demo = null;
  }
}

if (!customElements.get('gbscribe-emulator')) {
  customElements.define('gbscribe-emulator', GBScribeEmulator);
}

// Also support the copy-paste form: <div id="gbscribe-demo"></div>
const placeholder = document.getElementById('gbscribe-demo');
if (placeholder && placeholder.tagName !== 'GBSCRIBE-EMULATOR') {
  const element = document.createElement('gbscribe-emulator');
  for (const attribute of ['rom-url', 'bios-url', 'vendor-base', 'font-url', 'gba-image', 'printer-image', 'printer-switch-on', 'printer-switch-off', 'guide-prompt']) {
    if (placeholder.hasAttribute(attribute)) element.setAttribute(attribute, placeholder.getAttribute(attribute));
  }
  placeholder.replaceWith(element);
}

export { GBScribeEmulator, mountDemo };
