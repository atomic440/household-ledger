// The Household Ledger: calculation engine.
// Pure functions only (no DOM, no storage) so the maths can be unit-tested in Node.
import { RECIPES, WEEKLY_FIXED, DAY_SHORT, CATEGORIES } from './data.js';

const EPS = 1e-6;
export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const ceilSafe = (n) => Math.ceil(n - EPS);
export const productMap = (products) => Object.fromEntries(products.map((p) => [p.id, p]));

// ---------------------------------------------------------------------------
// 1. Schedule: who eats what, when.
// ---------------------------------------------------------------------------
export const MEALS = ['breakfast', 'lunch', 'dinner'];

export function isMissed(plan, day, meal, person) {
  const v = plan.missed?.[`${day}-${meal}`];
  return v === 'both' || v === person;
}

export function buildSchedule(plan) {
  const lunchA = plan.lunchProtein === 'beef' ? 'tacoBeef' : 'tacoChicken';
  const dinners = ['paprika', 'buffalo', 'lemon', 'curry', 'curry'];
  const out = [];
  for (let d = 0; d < 7; d++) {
    const weekday = d < 5;
    const slots = [];
    slots.push({ meal: 'breakfast', person: 'A', recipe: 'omelette' });
    slots.push({ meal: 'breakfast', person: 'B', recipe: 'partnerBreakfast' });
    if (weekday) {
      slots.push({ meal: 'lunch', person: 'A', recipe: d < 3 ? lunchA : 'tacoTuna' });
      slots.push({ meal: 'lunch', person: 'B', recipe: 'partnerLunch' });
      slots.push({ meal: 'dinner', person: 'A', recipe: dinners[d], veg: d < 3 ? plan.veg?.[d] : null });
      slots.push({ meal: 'dinner', person: 'B', recipe: dinners[d], veg: d < 3 ? plan.veg?.[d] : null });
    } else {
      slots.push({ meal: 'lunch', person: 'both', recipe: null, note: 'Eaten out' });
      slots.push({ meal: 'dinner', person: 'both', recipe: null, note: d === 5 ? 'Takeaway' : 'Family Sunday dinner' });
    }
    slots.push({ meal: 'snack', person: 'A', recipe: 'snacks' });
    for (const s of slots) s.missed = weekday && s.person !== 'both' && s.meal !== 'snack' ? isMissed(plan, d, s.meal, s.person) : false;
    out.push({ day: d, slots });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2. Ingredient requirements (before stock).
// ---------------------------------------------------------------------------
export function buildRequirements(plan, settings) {
  const req = {};
  const add = (pid, qty, source) => {
    if (!qty) return;
    const r = (req[pid] ||= { qty: 0, sources: {} });
    r.qty += qty;
    r.sources[source] = (r.sources[source] || 0) + qty;
  };
  const schedule = buildSchedule(plan);
  let curryPortions = 0;
  for (const { day, slots } of schedule) {
    for (const s of slots) {
      if (!s.recipe || s.missed) continue;
      const r = RECIPES[s.recipe];
      if (r.per === 'batch') { curryPortions++; continue; }
      const src = `${r.short}`;
      for (const [pid, q] of r.ingredients) add(pid, q, src);
      if (s.veg) add(s.veg, settings.vegPerPerson, `${DAY_SHORT[day]} dinner veg`);
    }
  }
  if (curryPortions > 0) {
    const c = RECIPES.curry;
    for (const [pid, q] of c.ingredients) add(pid, q, c.short);
    for (const [pid, q] of c.perPortion) add(pid, q * curryPortions, c.short);
  }
  for (const f of WEEKLY_FIXED) add(f.productId, f.qty, f.label);
  // Tidy floating point (e.g. 3 × ⅓ packet).
  for (const r of Object.values(req)) r.qty = Math.round(r.qty * 1000) / 1000;
  return { req, curryPortions };
}

// ---------------------------------------------------------------------------
// 3. Pack solver. Never returns fewer units than needed.
//    Default: cheapest combination (ties → less surplus, then fewer packs).
//    wasteRule {maxSurplus, minSaving}: prefer the least-surplus combination,
//    and accept a cheaper combination only if its surplus ≤ maxSurplus and it
//    saves at least minSaving.
// ---------------------------------------------------------------------------
export function enumerateCombos(packs, need) {
  const res = [];
  const valid = packs.filter((p) => p.size > 0);
  if (need <= EPS) return [{ counts: valid.map(() => 0), units: 0, cost: 0, surplus: 0, n: 0, packs: [] }];
  const counts = new Array(valid.length).fill(0);
  const rec = (i, units, cost, n) => {
    if (units >= need - EPS) {
      res.push({ counts: [...counts], units, cost: round2(cost), surplus: Math.round((units - need) * 1000) / 1000, n });
      return;
    }
    if (i >= valid.length) return;
    const p = valid[i];
    const maxK = ceilSafe((need - units) / p.size);
    for (let k = 0; k <= maxK; k++) {
      counts[i] = k;
      rec(i + 1, units + k * p.size, cost + k * (p.price ?? 0), n + k);
    }
    counts[i] = 0;
  };
  rec(0, 0, 0, 0);
  return res.map((c) => ({ ...c, packs: valid.map((p, i) => ({ ...p, count: c.counts[i] })).filter((p) => p.count > 0) }));
}

export function solvePacks(product, need) {
  if (product.byWeight) {
    const units = need <= EPS ? 0 : Math.ceil((need - EPS) / 10) * 10;
    const cost = round2((units / 1000) * product.byWeight.pricePerKg);
    return { packs: units ? [{ id: product.id + '-loose', label: `${fmtQty(units, product.unit)} loose`, size: units, price: cost, count: 1, loose: true }] : [], units, cost, surplus: units - need };
  }
  const combos = enumerateCombos(product.packs || [], need);
  if (!combos.length) return { packs: [], units: 0, cost: 0, surplus: 0, impossible: true };
  const byCost = [...combos].sort((a, b) => a.cost - b.cost || a.surplus - b.surplus || a.n - b.n);
  let pick = byCost[0];
  const rule = product.wasteRule;
  if (rule) {
    const bySurplus = [...combos].sort((a, b) => a.surplus - b.surplus || a.cost - b.cost || a.n - b.n);
    const leastWaste = bySurplus[0];
    const cheapOk = byCost.find((c) => c.surplus <= rule.maxSurplus + EPS);
    pick = leastWaste;
    if (cheapOk && leastWaste.cost - cheapOk.cost >= rule.minSaving - EPS) pick = cheapOk;
    else if (cheapOk && cheapOk.surplus <= leastWaste.surplus) pick = cheapOk;
  }
  return { packs: pick.packs, units: pick.units, cost: pick.cost, surplus: pick.surplus };
}

// ---------------------------------------------------------------------------
// 4. Shopping list.
// ---------------------------------------------------------------------------
export function fmtQty(q, unit) {
  const n = Math.round(q * 100) / 100;
  if (unit === 'g') return n >= 1000 ? `${round2(n / 1000)}kg` : `${Math.round(n)}g`;
  if (unit === 'ml') return n >= 1000 ? `${round2(n / 1000)} L` : `${Math.round(n)}ml`;
  const plural = { each: '', slice: ' slices', bag: ' bags', bar: ' bars', tin: ' tins', clove: ' cloves', biscuit: ' biscuits', bottle: ' bottles', bunch: ' bunches', packet: ' packets', pack: ' packs' };
  const single = { slice: ' slice', bag: ' bag', bar: ' bar', tin: ' tin', clove: ' clove', biscuit: ' biscuit', bottle: ' bottle', bunch: ' bunch', packet: ' packet', pack: ' pack' };
  const disp = Number.isInteger(n) ? n : n.toFixed(n < 1 ? 2 : 1).replace(/\.?0+$/, '');
  return `${disp}${(n === 1 ? single[unit] : plural[unit]) ?? ''}`;
}

export const packsLabel = (packs) => packs.map((p) => (p.loose ? p.label : `${p.count} × ${p.label}`)).join(' + ');
const packsCost = (packs) => round2(packs.reduce((s, p) => s + (p.loose ? p.price : p.count * (p.price ?? 0)), 0));
const packsUnits = (packs) => packs.reduce((s, p) => s + (p.loose ? p.size : p.count * p.size), 0);

function productLine(p, extra) {
  return {
    key: 'p:' + p.id, productId: p.id, name: p.name, brand: p.brand, category: CATEGORIES[p.category] || p.category,
    retailer: p.retailer, unit: p.unit, checked: false, actualPrice: null, ...extra,
  };
}

export function generateList(plan, { products, stock = {}, settings }) {
  const pm = productMap(products);
  const { req } = buildRequirements(plan, settings);
  const lines = [];
  for (const [pid, r] of Object.entries(req)) {
    const p = pm[pid];
    if (!p) continue;
    const have = Math.max(0, stock[pid]?.qty || 0);
    const toBuy = Math.max(0, r.qty - have);
    const sol = solvePacks(p, toBuy);
    const priceMissing = !p.byWeight && sol.packs.some((x) => x.price == null);
    const line = productLine(p, {
      source: WEEKLY_FIXED.some((f) => f.productId === pid) && Object.keys(r.sources).length === 1 ? 'weekly' : 'meals',
      required: r.qty, inStock: have, toBuy, packs: sol.packs, purchaseUnits: sol.units,
      leftover: Math.round((have + sol.units - r.qty) * 1000) / 1000, estCost: sol.cost, priceMissing,
      sources: r.sources, covered: toBuy <= EPS,
    });
    lines.push(line);
  }
  for (const [pid, count] of Object.entries(plan.optional || {})) {
    const p = pm[pid];
    if (!p || !count) continue;
    const pk = p.packs[0];
    const existing = lines.find((l) => l.productId === pid);
    const packs = [{ ...pk, count }];
    if (existing) { // Selected manually AND needed by recipes: add the extra packs on top.
      existing.packs = mergePacks(existing.packs, packs);
      existing.purchaseUnits = packsUnits(existing.packs);
      existing.estCost = packsCost(existing.packs);
      existing.covered = false;
      continue;
    }
    lines.push(productLine(p, {
      key: 'o:' + pid, source: 'optional', required: null, inStock: stock[pid]?.qty || 0, toBuy: count * pk.size,
      packs, purchaseUnits: count * pk.size, leftover: null, estCost: round2(count * (pk.price ?? 0)), priceMissing: pk.price == null,
    }));
  }
  for (const g of plan.gifts || []) {
    const base = { productId: null, brand: '', category: CATEGORIES.gifts, retailer: g.retailer || 'Tesco', unit: 'each', source: 'gift', checked: false, actualPrice: null, required: null, inStock: 0, leftover: null };
    lines.push({ ...base, key: 'g:' + g.id, name: g.desc || 'Birthday present', packs: [{ label: 'present', count: 1, size: 1, price: num(g.price) }], purchaseUnits: 1, estCost: round2(num(g.price) ?? 0), priceMissing: num(g.price) == null });
    if (g.card) lines.push({ ...base, key: 'g:' + g.id + ':card', name: `Birthday card: ${g.desc || 'present'}`, packs: [{ label: 'card', count: 1, size: 1, price: num(g.cardCost) }], purchaseUnits: 1, estCost: round2(num(g.cardCost) ?? 0), priceMissing: num(g.cardCost) == null });
    if (g.bag) lines.push({ ...base, key: 'g:' + g.id + ':bag', name: `Gift bag: ${g.desc || 'present'}`, packs: [{ label: 'gift bag', count: 1, size: 1, price: num(g.bagCost) }], purchaseUnits: 1, estCost: round2(num(g.bagCost) ?? 0), priceMissing: num(g.bagCost) == null });
  }
  for (const s of plan.specials || []) {
    const qty = Math.max(1, Math.round(num(s.qty) ?? 1));
    const cost = num(s.cost);
    lines.push({
      key: 's:' + s.id, productId: null, name: s.desc || 'Special purchase', brand: '', category: CATEGORIES.special, retailer: s.retailer || 'Tesco',
      unit: 'each', source: 'special', checked: false, actualPrice: null, required: null, inStock: 0, leftover: null,
      packs: [{ label: 'item', count: qty, size: 1, price: cost }], purchaseUnits: qty, estCost: round2((cost ?? 0) * qty), priceMissing: cost == null,
    });
  }
  return lines;
}

function mergePacks(a, b) {
  const out = a.map((p) => ({ ...p }));
  for (const p of b) {
    const e = out.find((x) => x.id === p.id);
    if (e) e.count += p.count; else out.push({ ...p });
  }
  return out;
}

export const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));

// Apply a user's manual edit (pack counts / retailer) to a freshly generated line.
export function applyEdit(line, edit) {
  if (!edit) return line;
  const l = { ...line, edit };
  if (edit.retailer) l.retailer = edit.retailer;
  if (edit.packCounts) {
    l.packs = l.packs.map((p) => ({ ...p, count: edit.packCounts[p.id] ?? p.count })).filter((p) => p.count > 0 || p.loose);
    for (const [id, c] of Object.entries(edit.packCounts)) {
      if (!l.packs.some((p) => p.id === id) && c > 0 && edit.packDefs?.[id]) l.packs.push({ ...edit.packDefs[id], count: c });
    }
    l.purchaseUnits = packsUnits(l.packs);
    l.estCost = packsCost(l.packs);
    if (l.required != null) l.leftover = Math.round((l.inStock + l.purchaseUnits - l.required) * 1000) / 1000;
  }
  return l;
}

// Regeneration: keep ticks, actual prices, manual edits, manual items and removals.
export function mergeLists(newLines, oldLines = [], removed = []) {
  const old = Object.fromEntries(oldLines.map((l) => [l.key, l]));
  const out = [];
  for (const nl of newLines) {
    if (removed.includes(nl.key)) continue;
    const ol = old[nl.key];
    let l = ol?.edit ? applyEdit(nl, ol.edit) : nl;
    if (ol) l = { ...l, checked: ol.checked, actualPrice: ol.actualPrice, checkedAt: ol.checkedAt };
    out.push(l);
  }
  // Ticked items that are no longer required are kept (you already bought them).
  for (const ol of oldLines) {
    if (out.some((l) => l.key === ol.key) || removed.includes(ol.key)) continue;
    if (ol.source === 'manual' || ol.checked) out.push({ ...ol, orphan: ol.source !== 'manual' });
  }
  return out;
}

export function lineCost(l) { return l.actualPrice != null ? l.actualPrice : l.estCost || 0; }

export function totals(lines) {
  const buy = lines.filter((l) => !l.covered);
  const t = { estimated: 0, purchased: 0, remaining: 0, itemsRemaining: 0, itemsTotal: buy.length, missingPrices: 0 };
  for (const l of buy) {
    t.estimated += l.estCost || 0;
    if (l.priceMissing && l.actualPrice == null) t.missingPrices++;
    if (l.checked) t.purchased += lineCost(l);
    else { t.remaining += l.estCost || 0; t.itemsRemaining++; }
  }
  for (const k of ['estimated', 'purchased', 'remaining']) t[k] = round2(t[k]);
  return t;
}

export function groupByRetailer(lines) {
  const g = {};
  for (const l of lines) (g[l.retailer] ||= []).push(l);
  return g;
}

// ---------------------------------------------------------------------------
// 5. Stock movements. Each is applied once per week (flags held by the caller).
// ---------------------------------------------------------------------------
export function applyPurchases(stock, lines, products, today) {
  const pm = productMap(products);
  const s = structuredCloneSafe(stock);
  for (const l of lines) {
    if (!l.checked || !l.productId || !pm[l.productId]) continue;
    const p = pm[l.productId];
    const e = (s[l.productId] ||= { qty: 0, unit: p.unit, location: p.storage || 'Other' });
    e.qty = round3((e.qty || 0) + (l.purchaseUnits || 0));
    e.updated = today;
  }
  return s;
}

export function applyConsumption(stock, req, products, today) {
  const pm = productMap(products);
  const s = structuredCloneSafe(stock);
  for (const [pid, r] of Object.entries(req)) {
    const p = pm[pid];
    if (!p) continue;
    const e = (s[pid] ||= { qty: 0, unit: p.unit, location: p.storage || 'Other' });
    e.qty = p.perishable ? 0 : Math.max(0, round3((e.qty || 0) - r.qty));
    e.updated = today;
  }
  return s;
}

const round3 = (n) => Math.round(n * 1000) / 1000;
function structuredCloneSafe(o) { return JSON.parse(JSON.stringify(o || {})); }

// ---------------------------------------------------------------------------
// 6. Nutrition (estimates). Per serving / per portion.
// ---------------------------------------------------------------------------
export function recipeNutrition(recipeId, products, settings, vegId = 'brocauli') {
  const pm = productMap(products);
  const r = RECIPES[recipeId];
  let kcal = 0, protein = 0, labelled = true;
  const addIng = (pid, q, mult = 1) => {
    const n = pm[pid]?.nutrition;
    if (!n) return;
    kcal += n.kcal * q * mult; protein += n.protein * q * mult;
    if (n.src !== 'label') labelled = false;
  };
  if (r.per === 'batch') {
    for (const [pid, q] of r.ingredients) addIng(pid, q, 1 / r.servings);
    for (const [pid, q] of r.perPortion || []) addIng(pid, q);
  } else {
    for (const [pid, q] of r.ingredients) addIng(pid, q);
    if (r.veg) addIng(vegId, settings.vegPerPerson);
  }
  return { kcal: Math.round(kcal / 5) * 5, protein: Math.round(protein), allLabel: labelled };
}

// ---------------------------------------------------------------------------
// 7. Dates (weeks start Monday, local time).
// ---------------------------------------------------------------------------
export function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d;
}
export const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function parseIso(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
export function defaultPlanWeek(now = new Date()) {
  const m = mondayOf(now);
  const dow = (now.getDay() + 6) % 7;
  if (dow >= 4) m.setDate(m.getDate() + 7); // Fri–Sun: plan for the coming week
  return isoDate(m);
}
