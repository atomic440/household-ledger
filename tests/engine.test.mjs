// Run: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS, DEFAULT_SETTINGS } from '../js/data.js';
import {
  buildRequirements, generateList, solvePacks, totals, mergeLists, applyEdit,
  applyPurchases, applyConsumption, productMap, recipeNutrition, defaultPlanWeek,
} from '../js/engine.js';
import { makeBackup, validateBackup, migrateBackup } from '../js/backup.js';

const S = DEFAULT_SETTINGS;
const pm = productMap(PRODUCTS);
const basePlan = (o = {}) => ({ weekStart: '2026-11-09', missed: {}, lunchProtein: 'chicken', veg: ['brocauli', 'rootmix', 'sprouts'], gifts: [], optional: {}, specials: [], ...o });
const gen = (plan, stock = {}, products = PRODUCTS) => generateList(plan, { products, stock, settings: S });
const line = (lines, pid) => lines.find((l) => l.productId === pid);
const packStr = (l) => l.packs.map((p) => `${p.count}x${p.id}`).sort().join(',');

test('1. Normal chicken week: requirements', () => {
  const { req } = buildRequirements(basePlan(), S);
  assert.equal(req.chicken.qty, 2000);
  assert.equal(req.eggs.qty, 21);
  assert.equal(req.chorizo.qty, 14);
  assert.equal(req.leerdammer.qty, 7);
  assert.equal(req.butter.qty, 35 + 15 + 10);
  assert.equal(req.wheatbix.qty, 14);
  assert.equal(req.milk.qty, 2000);
  assert.equal(req.lettuce.qty, 750);
  assert.equal(req.tomatoes.qty, 450);
  assert.equal(req.onion.qty, 350);
  assert.equal(req.salsa.qty, 225);
  assert.equal(req.yoghurt.qty, 375 + 100 + 120);
  assert.equal(req.properchips.qty, 12);
  assert.equal(req.popchips.qty, 7);
  assert.equal(req.skinny.qty, 14);
  assert.equal(req.tuna.qty, 2);
  assert.equal(req.tacoseason.qty, 1);
  assert.equal(req.potatoes.qty, 1350);
  assert.equal(req.rice.qty, 300);
  assert.equal(req.passata.qty, 500);
  assert.equal(req.garlic.qty, 16);
  assert.equal(req.lime.qty, 2.5);
  assert.equal(req.soup.qty, 5);
  assert.equal(req.brocauli.qty, 400);
  assert.equal(req.rootmix.qty, 400);
  assert.equal(req.sprouts.qty, 400);
  assert.equal(req.scallions.qty, 1);
  assert.equal(req.sparkling.qty, 6);
  assert.equal(req.beef, undefined);
});

test('1b. Normal chicken week: packs and costs', () => {
  const L = gen(basePlan());
  assert.equal(packStr(line(L, 'chicken')), '2xch-1000');
  assert.equal(line(L, 'chicken').estCost, 14.00);
  assert.equal(packStr(line(L, 'eggs')), '1xeggs-15,1xeggs-6');
  assert.equal(line(L, 'eggs').estCost, 4.65);
  assert.equal(packStr(line(L, 'yoghurt')), '1xyog-1000');
  assert.equal(packStr(line(L, 'salsa')), '1xsalsa-226');
  assert.equal(packStr(line(L, 'lettuce')), '4xlet-200');
  assert.equal(line(L, 'lettuce').estCost, 2.56);
  assert.equal(packStr(line(L, 'properchips')), '3xpc-5');
  assert.equal(line(L, 'properchips').leftover, 3);
  assert.equal(packStr(line(L, 'popchips')), '2xpop-5');
  assert.equal(packStr(line(L, 'skinny')), '3xsk-5');
  assert.equal(line(L, 'skinny').estCost, 2.85);
  assert.equal(packStr(line(L, 'tuna')), '2xtuna-1'); // same price as 3-pack, no spare tin
  assert.equal(line(L, 'onion').purchaseUnits, 350);
  assert.equal(line(L, 'onion').estCost, 0.33);
  assert.equal(packStr(line(L, 'garlic')), '2xgar-bulb');
  assert.equal(packStr(line(L, 'lime')), '3xlime-1');
  const t = totals(L);
  assert.ok(t.estimated > 50 && t.estimated < 200, `total ${t.estimated}`);
  assert.equal(t.missingPrices, 0);
  console.log(`   Chicken week from empty stock: £${t.estimated.toFixed(2)} across ${t.itemsTotal} lines`);
});

test('2. Normal beef week', () => {
  const { req } = buildRequirements(basePlan({ lunchProtein: 'beef' }), S);
  assert.equal(req.chicken.qty, 1550);
  assert.equal(req.beef.qty, 450);
  const L = gen(basePlan({ lunchProtein: 'beef' }));
  // Waste rule: 1.6kg (£10.65, 50g spare) beats the exact £14.67 combination.
  assert.equal(packStr(line(L, 'chicken')), '1xch-1600');
  assert.equal(line(L, 'chicken').leftover, 50);
  assert.equal(packStr(line(L, 'beef')), '1xbeef-500');
});

test('3. Chicken week with 300g freezer stock', () => {
  const L = gen(basePlan(), { chicken: { qty: 300 } });
  const c = line(L, 'chicken');
  assert.equal(c.required, 2000);
  assert.equal(c.inStock, 300);
  assert.equal(c.toBuy, 1700);
  assert.equal(packStr(c), '1xch-1000,2xch-350');
  assert.equal(c.estCost, 12.34);
  assert.equal(c.leftover, 0);
});

test('4. One person lunch skipped', () => {
  const { req } = buildRequirements(basePlan({ missed: { '1-lunch': 'A', '4-lunch': 'B' } }), S);
  assert.equal(req.chicken.qty, 1850);      // one taco salad fewer
  assert.equal(req.lettuce.qty, 600);
  assert.equal(req.properchips.qty, 11);
  assert.equal(req.soup.qty, 4);            // partner's Friday lunch removed
  assert.equal(req.banana.qty, 4);
  assert.equal(req.orange.qty, 4);
  assert.equal(req.tacoseason.qty, 0.667); // still one packet for the batch
  const L = gen(basePlan({ missed: { '1-lunch': 'A' } }));
  assert.equal(packStr(line(L, 'tacoseason')), '1xtaco-1');
  assert.equal(packStr(line(L, 'lettuce')), '3xlet-200');
});

test('5. Both people dinner skipped', () => {
  const { req } = buildRequirements(basePlan({ missed: { '2-dinner': 'both' } }), S);
  assert.equal(req.chicken.qty, 2000 - 300);
  assert.equal(req.potatoes.qty, 900);
  assert.equal(req.sprouts, undefined);      // Wednesday's veg removed
  assert.equal(req.lemon, undefined);
  assert.equal(req.mustard, undefined);
  assert.equal(req.yoghurt.qty, 595 - 60);
  // Curry: one portion missed → batch still made, rice for 3 portions
  const c1 = buildRequirements(basePlan({ missed: { '4-dinner': 'A' } }), S).req;
  assert.equal(c1.rice.qty, 225);
  assert.equal(c1.passata.qty, 500);
  // All four curry portions missed → no curry shopping
  const c0 = buildRequirements(basePlan({ missed: { '3-dinner': 'both', '4-dinner': 'both' } }), S).req;
  assert.equal(c0.rice, undefined);
  assert.equal(c0.passata, undefined);
  assert.equal(c0.chicken.qty, 2000 - 650);
});

test('6. Multiple birthday presents', () => {
  const plan = basePlan({ gifts: [
    { id: 'a', desc: 'Book for Mum', price: '15', retailer: 'Tesco', card: true, cardCost: '2.5', bag: true, bagCost: '1.5' },
    { id: 'b', desc: 'Candle', price: 12.99, retailer: 'The Range', card: true, cardCost: 3, bag: false },
  ] });
  const L = gen(plan);
  const gifts = L.filter((l) => l.source === 'gift');
  assert.equal(gifts.length, 5);
  assert.equal(round(gifts.reduce((s, l) => s + l.estCost, 0)), 34.99);
  assert.equal(gifts.find((g) => g.name === 'Candle').retailer, 'The Range');
  assert.equal(round(totals(L).estimated - totals(gen(basePlan())).estimated), 34.99);
});

test('7. Multiple occasional replenishments', () => {
  const L = gen(basePlan({ optional: { catfood: 2, catlitter: 1, toiletroll: 1, coffee: 1 } }));
  const o = L.filter((l) => l.source === 'optional');
  assert.equal(o.length, 4);
  assert.equal(line(L, 'catfood').estCost, 30);
  assert.equal(line(L, 'catlitter').retailer, 'Jollyes');
  assert.equal(round(o.reduce((s, l) => s + l.estCost, 0)), 30 + 12 + 5.85 + 7.8);
});

test('8. Multipack calculations: eggs and crisps', () => {
  assert.equal(packStr(solvePacks(pm.eggs, 21)), '1xeggs-15,1xeggs-6');
  assert.equal(packStr(solvePacks(pm.eggs, 11)), '1xeggs-15');         // £2.85 beats 2×6 at £3.60
  assert.equal(packStr(solvePacks(pm.eggs, 5)), '1xeggs-6');
  assert.equal(packStr(solvePacks(pm.eggs, 27)), '2xeggs-15');            // £5.70 beats 15+6+6 at £6.45
  assert.equal(packStr(solvePacks(pm.popchips, 4)), '1xpop-5');
  assert.equal(packStr(solvePacks(pm.properchips, 12)), '3xpc-5');
  const L = gen(basePlan(), { popchips: { qty: 3 }, properchips: { qty: 3 } });
  assert.equal(line(L, 'popchips').toBuy, 4);
  assert.equal(packStr(line(L, 'popchips')), '1xpop-5');
  assert.equal(packStr(line(L, 'properchips')), '2xpc-5');
  assert.equal(line(L, 'properchips').leftover, 1);
  for (const n of [1, 7, 13, 22, 40, 1999, 2001, 3333]) {
    const s = solvePacks(pm.chicken, n);
    assert.ok(s.units >= n, `chicken ${n} → ${s.units}`);
  }
  for (let n = 0; n <= 60; n++) assert.ok(solvePacks(pm.eggs, n).units >= n);
});

test('9. Repeated ingredients are combined across recipes', () => {
  const L = gen(basePlan());
  const y = line(L, 'yoghurt');
  assert.deepEqual(Object.keys(y.sources).sort(), ['Buffalo chicken & wedges', 'Chicken curry & rice', 'Chicken taco salad', 'Lemon garlic chicken', 'Tuna taco salad'].sort());
  assert.equal(L.filter((l) => l.productId === 'chicken').length, 1);
  assert.equal(L.filter((l) => l.productId === 'garlic').length, 1);
  assert.equal(L.filter((l) => l.productId === 'onion').length, 1);
  // Repeated veg choice pools: broccoli on all three nights = 1,200g → 2 × 900g bags.
  const L2 = gen(basePlan({ veg: ['brocauli', 'brocauli', 'brocauli'] }));
  assert.equal(line(L2, 'brocauli').required, 1200);
  assert.equal(packStr(line(L2, 'brocauli')), '2xbc-900');
});

test('10. Missing product prices', () => {
  const products = PRODUCTS.map((p) => (p.id === 'salsa' ? { ...p, packs: [{ ...p.packs[0], price: null }] } : p));
  const L = gen(basePlan({ specials: [{ id: 'x', desc: 'Picture frame', qty: 1, cost: '' }] }), {}, products);
  assert.equal(line(L, 'salsa').priceMissing, true);
  const t = totals(L);
  assert.equal(t.missingPrices, 2);
  assert.ok(Number.isFinite(t.estimated));
});

test('11. Shopping list edited after generation survives regeneration', () => {
  const L = gen(basePlan());
  const eggs = line(L, 'eggs');
  const edited = applyEdit(eggs, { packCounts: { 'eggs-15': 2, 'eggs-6': 0 }, retailer: 'Nearby' });
  assert.equal(edited.purchaseUnits, 30);
  assert.equal(edited.estCost, 5.70);
  assert.equal(edited.retailer, 'Nearby');
  const old = L.map((l) => (l.key === eggs.key ? edited : l));
  old.push({ key: 'm:1', source: 'manual', name: 'Batteries', retailer: 'Tesco', packs: [{ count: 1, price: 4, size: 1, label: 'pack' }], estCost: 4, checked: false });
  const regen = mergeLists(gen(basePlan({ lunchProtein: 'beef' })), old, ['p:sparkling']);
  const e2 = regen.find((l) => l.productId === 'eggs');
  assert.equal(e2.purchaseUnits, 30);
  assert.equal(e2.retailer, 'Nearby');
  assert.ok(regen.some((l) => l.key === 'm:1'));
  assert.ok(!regen.some((l) => l.key === 'p:sparkling')); // removed stays removed
  assert.ok(regen.some((l) => l.productId === 'beef'));
});

test('12. Completed purchases preserved when regenerating', () => {
  const L = gen(basePlan());
  for (const l of L) if (['chicken', 'eggs', 'tuna'].includes(l.productId)) { l.checked = true; l.actualPrice = l.productId === 'eggs' ? 4.4 : null; }
  const regen = mergeLists(gen(basePlan({ missed: { '3-lunch': 'A', '4-lunch': 'A' } })), L, []);
  assert.equal(regen.find((l) => l.productId === 'chicken').checked, true);
  assert.equal(regen.find((l) => l.productId === 'eggs').actualPrice, 4.4);
  // Tuna no longer needed (both tuna lunches missed) but already bought → kept, flagged.
  const tuna = regen.find((l) => l.productId === 'tuna');
  assert.ok(tuna && tuna.checked && tuna.orphan);
  const t = totals(regen);
  assert.ok(t.purchased >= 14 + 4.4);
});

test('13. History: saved list prices are frozen copies', () => {
  const products = JSON.parse(JSON.stringify(PRODUCTS));
  const L = gen(basePlan(), {}, products);
  const before = line(L, 'chicken').estCost;
  products.find((p) => p.id === 'chicken').packs.forEach((p) => { p.price *= 2; });
  assert.equal(line(L, 'chicken').estCost, before);
  assert.equal(line(L, 'chicken').packs[0].price, 7.0);
  const L2 = gen(basePlan(), {}, products);
  assert.equal(line(L2, 'chicken').estCost, 28.0);
});

test('14. Inventory: no double counting', () => {
  const stock = { chicken: { qty: 300 }, lettuce: { qty: 100 } };
  const snapshot = JSON.stringify(stock);
  const a = gen(basePlan(), stock); const b = gen(basePlan(), stock);
  assert.equal(JSON.stringify(stock), snapshot, 'generation must not mutate stock');
  assert.deepEqual(a.map((l) => [l.key, l.toBuy]), b.map((l) => [l.key, l.toBuy]));
  // Shop (tick everything) → stock gains exactly what was bought
  a.forEach((l) => { l.checked = true; });
  const afterShop = applyPurchases(stock, a, PRODUCTS, '2026-11-08');
  assert.equal(afterShop.chicken.qty, 300 + 1700);
  assert.equal(afterShop.properchips.qty, 15);
  // Week consumed → recipe amounts deducted; perishables cleared; durable spares kept
  const { req } = buildRequirements(basePlan(), S);
  const afterWeek = applyConsumption(afterShop, req, PRODUCTS, '2026-11-15');
  assert.equal(afterWeek.chicken.qty, 0);
  assert.equal(afterWeek.properchips.qty, 3);
  assert.equal(afterWeek.popchips.qty, 3);
  assert.equal(afterWeek.potatoes.qty, 650);
  assert.equal(afterWeek.lettuce.qty, 0);   // perishable
  assert.equal(afterWeek.yoghurt.qty, 0);   // opened tub: not carried over
  assert.equal(afterWeek.rice.qty, 1700);
  // Next week uses the carried stock
  const next = gen(basePlan(), afterWeek);
  assert.equal(line(next, 'properchips').toBuy, 9);
  assert.equal(packStr(line(next, 'properchips')), '2xpc-5');
  assert.equal(line(next, 'rice').covered, true);
  assert.equal(line(next, 'potatoes').toBuy, 700);
});

test('15. JSON backup and restore', () => {
  const data = makeBackup({ products: PRODUCTS, stock: { eggs: { qty: 4 } }, weeks: [{ id: '2026-11-09', lines: gen(basePlan()) }], settings: S });
  const round = JSON.parse(JSON.stringify(data));
  assert.equal(validateBackup(round).ok, true);
  assert.deepEqual(migrateBackup(round).weeks[0].lines.length, data.weeks[0].lines.length);
  assert.equal(validateBackup({ app: 'other' }).ok, false);
  assert.equal(validateBackup({ ...round, weeks: 'x' }).ok, false);
  assert.equal(validateBackup({ ...round, schemaVersion: 99 }).ok, false);
});

test('Nutrition estimates are sane', () => {
  const om = recipeNutrition('omelette', PRODUCTS, S);
  assert.ok(om.kcal > 330 && om.kcal < 400, `omelette ${om.kcal}`);
  const sal = recipeNutrition('tacoChicken', PRODUCTS, S);
  assert.ok(sal.kcal > 320 && sal.kcal < 420 && sal.protein >= 44, JSON.stringify(sal));
  const cur = recipeNutrition('curry', PRODUCTS, S);
  assert.ok(cur.kcal > 480 && cur.kcal < 620, `curry ${cur.kcal}`);
  console.log('   Nutrition:', ['omelette', 'tacoChicken', 'tacoBeef', 'tacoTuna', 'paprika', 'buffalo', 'lemon', 'curry', 'snacks'].map((r) => `${r} ${recipeNutrition(r, PRODUCTS, S).kcal}kcal/${recipeNutrition(r, PRODUCTS, S).protein}g`).join(' · '));
});

test('Default planning week', () => {
  assert.equal(defaultPlanWeek(new Date(2026, 10, 5)), '2026-11-02');  // Thu → this week
  assert.equal(defaultPlanWeek(new Date(2026, 10, 7)), '2026-11-09');  // Sat → next week
  assert.equal(defaultPlanWeek(new Date(2026, 10, 9)), '2026-11-09');  // Mon → this week
});

function round(n) { return Math.round(n * 100) / 100; }
