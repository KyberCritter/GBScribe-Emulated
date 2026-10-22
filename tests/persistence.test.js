import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LocalStore,
  CONSENT_KEY,
  BINDINGS_KEY,
  PAGES_KEY,
} from '../src/persistence.js';

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  get length() {
    return this.values.size;
  }

  key(index) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

test('LocalStore remembers consent and persists JSON when accepted', () => {
  const storage = new MemoryStorage();
  const store = new LocalStore(storage);
  assert.equal(store.decided, false);

  assert.equal(store.setDecision('accepted'), true);
  assert.equal(storage.getItem(CONSENT_KEY), 'accepted');
  assert.equal(store.write(BINDINGS_KEY, { A: 'KeyQ' }), true);

  const reloaded = new LocalStore(storage);
  assert.equal(reloaded.decided, true);
  assert.equal(reloaded.accepted, true);
  assert.deepEqual(reloaded.read(BINDINGS_KEY, {}), { A: 'KeyQ' });
});

test('LocalStore ignores data and writes after rejection', () => {
  const storage = new MemoryStorage();
  storage.setItem(BINDINGS_KEY, JSON.stringify({ A: 'KeyQ' }));
  const store = new LocalStore(storage);

  store.setDecision('rejected');
  assert.equal(store.accepted, false);
  assert.deepEqual(store.read(BINDINGS_KEY, {}), {});
  assert.equal(store.write(PAGES_KEY, { version: 1, detached: [] }), false);
  assert.equal(storage.getItem(PAGES_KEY), null);
});

test('rejecting clears demo data and emulator saves but keeps the choice', () => {
  const storage = new MemoryStorage();
  storage.setItem(BINDINGS_KEY, '{}');
  storage.setItem(PAGES_KEY, '{}');
  storage.setItem('com.endrift.gbajs.TEST', 'save');
  const store = new LocalStore(storage);

  store.setDecision('accepted');
  store.clearSavedData();
  assert.equal(storage.getItem(BINDINGS_KEY), null);
  assert.equal(storage.getItem(PAGES_KEY), null);
  assert.equal(storage.getItem('com.endrift.gbajs.TEST'), null);
  assert.equal(storage.getItem(CONSENT_KEY), 'accepted');
});
