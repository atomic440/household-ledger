// IndexedDB persistence with a versioned schema and an in-memory fallback.
import { PRODUCTS, DEFAULT_SETTINGS, CATALOGUE_VERSION } from './data.js';
import { SCHEMA_VERSION } from './backup.js';

const DB_NAME = 'household-ledger';
const DB_VERSION = 1; // IndexedDB structural version (object stores)
let db = null;
let memory = null; // fallback when IndexedDB is unavailable

function req(r) {
  return new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}

function open() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = (e) => {
      const d = r.result;
      // v0 → v1: initial stores. Future versions add `if (e.oldVersion < 2) {...}` blocks.
      if (e.oldVersion < 1) {
        d.createObjectStore('kv', { keyPath: 'key' });
        d.createObjectStore('products', { keyPath: 'id' });
        d.createObjectStore('weeks', { keyPath: 'id' });
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('Database upgrade blocked by another open tab.'));
  });
}

export async function init() {
  try {
    if (!('indexedDB' in self)) throw new Error('IndexedDB unavailable');
    db = await open();
  } catch (err) {
    console.warn('Falling back to memory storage', err);
    memory = { kv: new Map(), products: new Map(), weeks: new Map() };
  }
  let meta = await getKV('meta');
  if (!meta) {
    await putAll('products', PRODUCTS);
    await setKV('settings', DEFAULT_SETTINGS);
    await setKV('stock', {});
    meta = { schemaVersion: SCHEMA_VERSION, catalogueVersion: CATALOGUE_VERSION, createdAt: new Date().toISOString() };
    await setKV('meta', meta);
  } else if ((meta.catalogueVersion || 0) < CATALOGUE_VERSION) {
    // Safe catalogue upgrade: add new products, never overwrite the owner's edits or prices.
    const existing = new Set((await getAll('products')).map((p) => p.id));
    await putAll('products', PRODUCTS.filter((p) => !existing.has(p.id)));
    meta.catalogueVersion = CATALOGUE_VERSION;
    await setKV('meta', meta);
  }
  try { if (navigator.storage?.persist) await navigator.storage.persist(); } catch { /* optional */ }
  return { persistent: !memory };
}

export const isMemoryOnly = () => !!memory;

async function store(name, mode = 'readonly') { return db.transaction(name, mode).objectStore(name); }

export async function getKV(key) {
  if (memory) return clone(memory.kv.get(key)?.value);
  const r = await req((await store('kv')).get(key));
  return r?.value;
}
export async function setKV(key, value) {
  if (memory) { memory.kv.set(key, { key, value: clone(value) }); return; }
  await req((await store('kv', 'readwrite')).put({ key, value: clone(value) }));
}
export async function getAll(name) {
  if (memory) return [...memory[name].values()].map(clone);
  return req((await store(name)).getAll());
}
export async function get(name, id) {
  if (memory) return clone(memory[name].get(id));
  return req((await store(name)).get(id));
}
export async function put(name, value) {
  if (memory) { memory[name].set(value.id, clone(value)); return; }
  await req((await store(name, 'readwrite')).put(clone(value)));
}
export async function del(name, id) {
  if (memory) { memory[name].delete(id); return; }
  await req((await store(name, 'readwrite')).delete(id));
}
export async function putAll(name, values) {
  if (memory) { values.forEach((v) => memory[name].set(v.id, clone(v))); return; }
  await new Promise((resolve, reject) => {
    const tx = db.transaction(name, 'readwrite');
    const s = tx.objectStore(name);
    values.forEach((v) => s.put(clone(v)));
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
}

// Replace everything atomically (used by Restore).
export async function replaceAll({ products, stock, weeks, settings }) {
  if (memory) {
    memory.products = new Map(products.map((p) => [p.id, clone(p)]));
    memory.weeks = new Map(weeks.map((w) => [w.id, clone(w)]));
    memory.kv.set('stock', { key: 'stock', value: clone(stock) });
    memory.kv.set('settings', { key: 'settings', value: clone(settings) });
    return;
  }
  await new Promise((resolve, reject) => {
    const tx = db.transaction(['products', 'weeks', 'kv'], 'readwrite');
    const P = tx.objectStore('products'), W = tx.objectStore('weeks'), K = tx.objectStore('kv');
    P.clear(); W.clear();
    products.forEach((p) => P.put(clone(p)));
    weeks.forEach((w) => W.put(clone(w)));
    K.put({ key: 'stock', value: clone(stock) });
    K.put({ key: 'settings', value: clone(settings) });
    K.delete('draft');
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Restore aborted'));
  });
}

function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
