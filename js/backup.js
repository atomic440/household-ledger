// Backup format + validation (pure; used by the app and by the tests).
export const APP_ID = 'household-ledger';
export const SCHEMA_VERSION = 1;

export function makeBackup({ products, stock, weeks, settings }) {
  return { app: APP_ID, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), products, stock, weeks, settings };
}

export function validateBackup(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return { ok: false, errors: ['File is not valid JSON data.'] };
  if (data.app !== APP_ID) errors.push('This file was not exported from The Household Ledger.');
  if (typeof data.schemaVersion !== 'number') errors.push('Missing schema version.');
  else if (data.schemaVersion > SCHEMA_VERSION) errors.push(`Backup is from a newer version (schema ${data.schemaVersion}). Update the app first.`);
  if (!Array.isArray(data.products) || !data.products.length) errors.push('No product catalogue found.');
  else if (data.products.some((p) => !p || typeof p.id !== 'string' || typeof p.name !== 'string')) errors.push('Some products are malformed.');
  if (!data.stock || typeof data.stock !== 'object' || Array.isArray(data.stock)) errors.push('Stock data is missing or malformed.');
  if (!Array.isArray(data.weeks)) errors.push('Shopping history is missing.');
  else if (data.weeks.some((w) => !w || typeof w.id !== 'string' || !Array.isArray(w.lines))) errors.push('Some saved weeks are malformed.');
  if (!data.settings || typeof data.settings !== 'object') errors.push('Settings are missing.');
  return { ok: errors.length === 0, errors };
}

// Future schema upgrades go here, in order. Each takes data at version n and returns n+1.
export const MIGRATIONS = {
  // 1: (d) => ({ ...d, schemaVersion: 2, ... }),
};
export function migrateBackup(data) {
  let d = data;
  while (d.schemaVersion < SCHEMA_VERSION) {
    const m = MIGRATIONS[d.schemaVersion];
    if (!m) throw new Error(`No migration from schema ${d.schemaVersion}`);
    d = m(d);
  }
  return d;
}
