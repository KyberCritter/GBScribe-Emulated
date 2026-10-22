/**
 * Local-only persistence for controls, printed pages, guide progress, and the
 * emulator save file. Nothing here talks to a server.
 *
 * The consent choice is stored alongside the data so the policy question can
 * be skipped on later visits. Rejecting clears the demo's keys but keeps the
 * choice itself, so the policy is not shown on every page load.
 *
 * MIT License. See LICENSE.md.
 */

export const CONSENT_KEY = 'gbscribe-emulated.consent.v1';
export const BINDINGS_KEY = 'gbscribe-emulated.bindings.v1';
export const SOUND_KEY = 'gbscribe-emulated.sound.v1';
export const GUIDE_KEY = 'gbscribe-emulated.guide.v1';
export const PAGES_KEY = 'gbscribe-emulated.pages.v1';

const DEMO_KEYS = [BINDINGS_KEY, SOUND_KEY, GUIDE_KEY, PAGES_KEY];
const GBA_SAVE_PREFIX = 'com.endrift.gbajs.';

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export class LocalStore {
  constructor(storage = browserStorage()) {
    this.storage = storage;
    this.decision = this.readDecision();
  }

  readDecision() {
    try {
      const value = this.storage?.getItem(CONSENT_KEY);
      return value === 'accepted' || value === 'rejected' ? value : null;
    } catch {
      return null;
    }
  }

  get decided() {
    return this.decision !== null;
  }

  get accepted() {
    return this.decision === 'accepted';
  }

  setDecision(decision) {
    if (decision !== 'accepted' && decision !== 'rejected') return false;
    this.decision = decision;
    try {
      this.storage?.setItem(CONSENT_KEY, decision);
      return Boolean(this.storage);
    } catch {
      return false;
    }
  }

  read(key, fallback) {
    if (!this.accepted) return fallback;
    try {
      const raw = this.storage?.getItem(key);
      return raw === null || raw === undefined ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  write(key, value) {
    if (!this.accepted) return false;
    try {
      this.storage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  remove(key) {
    try {
      this.storage?.removeItem(key);
    } catch {
      // Storage can be unavailable in private modes.
    }
  }

  clearSavedData() {
    for (const key of DEMO_KEYS) this.remove(key);
    try {
      if (!this.storage) return;
      for (let index = this.storage.length - 1; index >= 0; index--) {
        const key = this.storage.key(index);
        if (key?.startsWith(GBA_SAVE_PREFIX)) this.storage.removeItem(key);
      }
    } catch {
      // Ignore storage enumeration failures.
    }
  }
}
