/**
 * Browser adapter for the mGBA WebAssembly core.
 *
 * Boots the emulator module, mounts the GBScribe ROM and its save file, and
 * presents the small surface the demo needs: the active-low keypad register,
 * audio volume, memory reads for the printed page checks, and the shared
 * link-port channel used to clock the printer device.
 *
 * MIT License. See LICENSE.md.
 */

const CORE_URL = new URL('../../vendor/mgba/mgba.js', import.meta.url).href;
const ROM_PATH = '/tmp/gbscribe.gba';
const SAVE_PATH = '/tmp/gbscribe.sav';

const BUTTON_NAMES = ['A', 'B', 'SELECT', 'START', 'RIGHT', 'LEFT', 'UP', 'DOWN', 'R', 'L'];

const RELEASED = 0x3ff;

export const SAVE_PREFIX = 'com.endrift.gbajs.';

export function romGameCode(rom) {
  const header = new Uint8Array(rom, 0xac, 4);
  return String.fromCharCode(...header).replace(/[^\x20-\x7e]/g, '');
}

export function encodeSave(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export function decodeSave(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function createGbaEmulator(options) {
  const { canvas, rom, printer, readSave, writeSave } = options;
  const { default: createModule } = await import(CORE_URL);
  const module = await createModule({ canvas });

  module.toggleInput(false);
  module.setCoreSettings({
    frameSkip: 0,
    autoSaveStateEnable: false,
    restoreAutoSaveStateOnLoad: false,
    allowOpposingDirections: false,
    rewindEnable: false,
  });
  await module.FSInit();

  try {
    module.FS.unlink(ROM_PATH);
  } catch {
    // No previous ROM in the in-memory filesystem.
  }
  try {
    module.FS.unlink(SAVE_PATH);
  } catch {
    // No previous save in the in-memory filesystem.
  }

  module.FS.writeFile(ROM_PATH, new Uint8Array(rom));
  const existingSave = readSave();
  if (existingSave) module.FS.writeFile(SAVE_PATH, decodeSave(existingSave));

  const memory = module.HEAPU8.buffer;
  printer.attachChannel(memory, module._gbsGpioGetChannel());
  await printer.ready;
  module._gbsGpioSetEnabled(1);
  module._gbsUseFlash1M();

  if (!module.loadGame(ROM_PATH, SAVE_PATH)) {
    throw new Error('The GBScribe ROM could not be loaded');
  }

  module.setVolume(options.muted ? 0 : 0.55);

  let down = RELEASED;
  const setKeys = (value) => {
    const next = value & RELEASED;
    const changed = (down ^ next) & RELEASED;
    down = next;
    for (let bit = 0; bit < BUTTON_NAMES.length; bit++) {
      if (!(changed & (1 << bit))) continue;
      if (next & (1 << bit)) module.buttonUnpress(BUTTON_NAMES[bit]);
      else module.buttonPress(BUTTON_NAMES[bit]);
    }
  };

  const liveSave = () => {
    const pointer = module._gbsSaveData();
    const size = module._gbsSaveSize();
    if (!size) return null;
    return module.HEAPU8.slice(pointer, pointer + size);
  };

  const persistSave = () => {
    const bytes = liveSave();
    if (bytes && bytes.length) writeSave(encodeSave(bytes));
  };

  const flushSaveToFs = () => {
    const bytes = liveSave();
    if (bytes && bytes.length) module.FS.writeFile(SAVE_PATH, bytes);
  };

  const registerCallbacks = () => {
    module.addCoreCallbacks({ saveDataUpdatedCallback: persistSave });
  };

  let volume = options.muted ? 0 : 0.55;

  registerCallbacks();

  const audio = {
    get context() {
      return module.SDL2?.audioContext || null;
    },
    get masterVolume() {
      return module.getVolume();
    },
    set masterVolume(value) {
      volume = value;
      module.setVolume(value);
    },
    pause(paused) {
      if (paused) module.pauseAudio();
      else module.resumeAudio();
    },
  };

  const emulator = {
    module,
    keypad: {
      get currentDown() {
        return down;
      },
      set currentDown(value) {
        setKeys(value);
      },
    },
    audio,
    mmu: {
      load8: (address) => module._gbsRead16(address & ~1) & 0xff,
      load16: (address) => module._gbsRead16(address) & 0xffff,
      load32: (address) => ((module._gbsRead16(address) & 0xffff) | ((module._gbsRead16(address + 2) & 0xffff) << 16)) >>> 0,
      get save() {
        const bytes = liveSave() || new Uint8Array(0);
        return { buffer: bytes.slice().buffer };
      },
    },
    sio: {
      attachDevice: (device) => device,
      detachDevice: () => null,
    },
    setRom() {
      flushSaveToFs();
      module._gbsGpioSetEnabled(1);
      module._gbsUseFlash1M();
      if (!module.loadGame(ROM_PATH, SAVE_PATH)) {
        throw new Error('The GBScribe ROM could not be loaded');
      }
      module.setVolume(volume);
      registerCallbacks();
    },
    storeSavedata: persistSave,
    pause() {
      module.pauseGame();
    },
  };

  window.__gbsLinkPort = { installed: true, devices: [printer] };
  return emulator;
}
