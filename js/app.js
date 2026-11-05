// The Household Ledger: application shell, screens and interactions.
import * as DB from './db.js';
import {
  PRODUCTS, RECIPES, DAYS, DAY_SHORT, PEOPLE, VEG_OPTIONS, OPTIONAL_GROUPS, CATEGORIES, RETAILERS,
  REFERENCES, PREP_GUIDE, DEFAULT_SETTINGS,
} from './data.js';
import {
  buildSchedule, buildRequirements, generateList, mergeLists, applyEdit, totals, groupByRetailer, lineCost,
  applyPurchases, applyConsumption, productMap, recipeNutrition, fmtQty, packsLabel, round2, num,
  defaultPlanWeek, parseIso, isoDate, mondayOf,
} from './engine.js';
import { makeBackup, validateBackup, migrateBackup } from './backup.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const S = {
  products: [], pm: {}, stock: {}, settings: { ...DEFAULT_SETTINGS }, weeks: {}, meta: {},
  draft: null, openLine: null, stockFilter: 'have', catSearch: '', stockSearch: '',
};
const app = document.getElementById('app');
const tabbar = document.getElementById('tabbar');

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => (n == null || Number.isNaN(n) ? '—' : `£${Number(n).toFixed(2)}`);
const todayIso = () => isoDate(new Date());
const uid = () => Math.random().toString(36).slice(2, 9);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso) => { const d = parseIso(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const shortDate = (iso) => { const d = parseIso(iso); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`; };
const weekLabel = (iso) => `Week commencing ${DAYS[0]} ${longDate(iso)}`;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

const I = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 4l9 6.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/></svg>',
  meals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5c2.5-1 5-1 8 .8v13c-3-1.8-5.5-1.8-8-.8z"/><path d="M20 5.5c-2.5-1-5-1-8 .8v13c3-1.8 5.5-1.8 8-.8z"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M9 8.5h6M9 12h6M9 15.5h4"/></svg>',
  stock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8l8-4 8 4-8 4z"/><path d="M4 8v8l8 4 8-4V8"/><path d="M12 12v8"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  chev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  left: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  quill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4c-6 1-11 6-13 13l-2 3"/><path d="M20 4c0 6-4 10-9 11"/><path d="M9 13l3 3"/></svg>',
  history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/><path d="M12 8v4l3 2"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12V4h8l9 9-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  fleuron: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4c1.5 2.5 1.5 4.5 0 6-1.5-1.5-1.5-3.5 0-6zM4 12c2.5-1.5 4.5-1.5 6 0-1.5 1.5-3.5 1.5-6 0zm16 0c-2.5 1.5-4.5 1.5-6 0 1.5-1.5 3.5-1.5 6 0zM12 20c-1.5-2.5-1.5-4.5 0-6 1.5 1.5 1.5 3.5 0 6z"/><circle cx="12" cy="12" r="1.3"/></svg>',
  crest: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M32 5l22 8v16c0 14-9 24-22 30C19 53 10 43 10 29V13z"/><path d="M32 11l16 6v12c0 10-6 18-16 23-10-5-16-13-16-23V17z" opacity=".5"/><path d="M24 24h16M24 30h16M24 36h10" stroke-linecap="round"/></svg>',
};
const ornament = () => `<div class="ornament" aria-hidden="true">${I.fleuron}</div>`;

function toast(msg, err = false) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.setAttribute('role', 'status');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function openSheet(html, onMount) {
  closeSheet();
  const b = document.createElement('div');
  b.className = 'sheet-backdrop';
  b.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grip"></div>${html}</div>`;
  b.addEventListener('click', (e) => { if (e.target === b) closeSheet(); });
  document.body.appendChild(b);
  onMount?.(b.querySelector('.sheet'));
  b.querySelector('input, select, button')?.focus({ preventScroll: true });
}
function closeSheet() { document.querySelectorAll('.sheet-backdrop').forEach((s) => s.remove()); }

function confirmSheet({ title, body, ok = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    openSheet(`<h2>${esc(title)}</h2><div class="mt-3 muted">${body}</div>
      <div class="btn-row mt-5"><button class="btn btn-secondary" data-r="0">Cancel</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-r="1">${esc(ok)}</button></div>`, (sh) => {
      sh.querySelectorAll('[data-r]').forEach((b) => b.addEventListener('click', () => { closeSheet(); resolve(b.dataset.r === '1'); }));
    });
  });
}

// ---------------------------------------------------------------------------
// Persistence wrappers
// ---------------------------------------------------------------------------
async function load() {
  S.products = await DB.getAll('products');
  S.pm = productMap(S.products);
  S.stock = (await DB.getKV('stock')) || {};
  S.settings = { ...DEFAULT_SETTINGS, ...((await DB.getKV('settings')) || {}) };
  S.meta = (await DB.getKV('meta')) || {};
  S.weeks = Object.fromEntries((await DB.getAll('weeks')).map((w) => [w.id, w]));
  S.draft = (await DB.getKV('draft')) || null;
}
const saveStock = () => DB.setKV('stock', S.stock);
const saveMeta = () => DB.setKV('meta', S.meta);
const saveDraft = () => DB.setKV('draft', S.draft);
async function saveWeek(w) { w.updatedAt = new Date().toISOString(); S.weeks[w.id] = w; await DB.put('weeks', w); }

const weeksDesc = () => Object.values(S.weeks).sort((a, b) => (a.id < b.id ? 1 : -1));
const currentWeek = () => S.weeks[S.meta.currentWeekId] || null;

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const routes = {
  '': renderHome, plan: renderWizard, list: renderList, meals: renderMeals, stock: renderStock, more: renderMore,
  references: renderReferences, recipe: renderRecipe, history: renderHistory, catalogue: renderCatalogue,
  backup: renderBackup, settings: renderSettings,
};
function parts() { return location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent); }
function go(path) { location.hash = '#/' + path; }

function render() {
  const [r, ...rest] = parts();
  const fn = routes[r] || renderHome;
  const wizard = r === 'plan';
  document.body.classList.toggle('wizard', wizard);
  app.classList.toggle('wizard-mode', wizard);
  const routeKey = location.hash + '|' + (r === 'plan' ? S.draft?.step : '');
  try {
    app.innerHTML = fn(...rest) || '';
    if (routeKey === S.lastRouteKey) app.querySelector('.page-enter')?.classList.remove('page-enter');
    S.lastRouteKey = routeKey;
  } catch (err) { console.error(err); app.innerHTML = `<div class="page-head"><h1>Something went wrong</h1><p>${esc(err.message)}</p><a class="btn btn-secondary" href="#/">Return home</a></div>`; }
  renderTabbar(r);
  if (app.querySelector('.page-enter')) app.querySelector('[tabindex="-1"]')?.focus?.({ preventScroll: true });
}

function renderTabbar(r) {
  const tab = { '': 'home', list: 'list', meals: 'meals', stock: 'stock' }[r] ?? 'more';
  const w = currentWeek();
  const left = w && w.status !== 'completed' ? totals(w.lines).itemsRemaining : 0;
  const t = (id, href, icon, label, extra = '') => `<a href="${href}" ${tab === id ? 'aria-current="page"' : ''}>${icon}<span>${label}</span>${extra}</a>`;
  tabbar.innerHTML = `<div class="inner">${t('home', '#/', I.home, 'Home')}${t('meals', '#/meals', I.meals, 'Meals')}${t('list', '#/list', I.list, 'List', left ? `<span class="dot">${left}</span>` : '')}${t('stock', '#/stock', I.stock, 'Stock')}${t('more', '#/more', I.more, 'Ledger')}</div>`;
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------
function renderHome() {
  const thisMonday = isoDate(mondayOf(new Date()));
  const w = currentWeek();
  const t = w ? totals(w.lines) : null;
  const stockCount = Object.values(S.stock).filter((s) => s.qty > 0).length;
  const soon = Object.values(S.stock).filter((s) => s.qty > 0 && s.expiry && (parseIso(s.expiry) - new Date()) / 864e5 <= 3).length;
  const histCount = Object.keys(S.weeks).length;
  const lastBackup = S.meta.lastBackup;
  const needsBackup = histCount > 0 && (!lastBackup || (Date.now() - new Date(lastBackup)) / 864e5 > 30);
  const dow = (new Date().getDay() + 6) % 7;
  const tonight = w && w.id === thisMonday ? buildSchedule(w.plan)[dow].slots.find((s) => s.meal === 'dinner') : null;
  const tonightName = tonight ? (tonight.recipe ? RECIPES[tonight.recipe].short : tonight.note) : null;

  let listSub = 'No list yet. Plan the week to create one.';
  if (w) listSub = w.status === 'completed' ? `Completed · ${money(t.purchased)} spent` : `${t.itemsRemaining} of ${t.itemsTotal} left · ${money(t.estimated)} est.`;

  const card = (href, icon, title, sub) => `<a class="card card-link" href="${href}"><span class="ico">${icon}</span><span class="body"><h3>${title}</h3><span class="sub">${sub}</span></span><span class="chev">${I.chev}</span></a>`;
  return `<div class="page-enter" tabindex="-1">
    <header class="home-hero">
      <span class="crest" aria-hidden="true">${I.crest}</span>
      <h1>The Household Ledger</h1>
      <div class="subtitle">Shopping &amp; Meal Planning</div>
    </header>
    <div class="week-banner">
      <div class="eyebrow">This week</div>
      <div class="w">${DAYS[0]} ${longDate(thisMonday)}</div>
    </div>
    <a class="btn btn-primary btn-lg btn-block" href="#/plan" data-act="start-plan">${I.quill} Plan This Week</a>
    ${S.draft ? `<p class="center small muted mt-3">You have an unfinished plan. <a href="#/plan">Resume it</a> · <a href="#" data-act="discard-draft">discard</a></p>` : ''}
    ${ornament()}
    ${card('#/list', I.list, 'Current Shopping List', esc(listSub))}
    ${card('#/meals', I.meals, "This Week's Meals", tonightName ? `Tonight: ${esc(tonightName)}` : 'The fixed weekly schedule')}
    ${card('#/stock', I.stock, 'Household Stock', `${stockCount} item${stockCount === 1 ? '' : 's'} recorded${soon ? ` · <span class="gold">${soon} expiring soon</span>` : ''}`)}
    ${card('#/references', I.book, 'References', 'Portions, principles &amp; the recipe library')}
    ${card('#/history', I.history, 'Shopping History', histCount ? `${histCount} week${histCount === 1 ? '' : 's'} recorded` : 'Nothing saved yet')}
    ${needsBackup ? `<div class="note warn mt-4">It's been a while since your last backup. Your data lives only on this phone. <a href="#/backup">Back up now</a>.</div>` : ''}
    ${DB.isMemoryOnly() ? `<div class="note warn mt-4">This browser is blocking storage (private mode?). Nothing will be saved after you close it.</div>` : ''}
  </div>`;
}

// ---------------------------------------------------------------------------
// Planning wizard
// ---------------------------------------------------------------------------
const STEPS = ['events', 'missed', 'gifts', 'lunch', 'veg', 'optional', 'special', 'review'];

function newPlan(weekStart) {
  const last = weeksDesc()[0];
  return {
    weekStart, hasEvents: null, missed: {}, gifts: [], specials: [], optional: {},
    lunchProtein: last?.plan?.lunchProtein || S.settings.lunchProtein || 'chicken',
    veg: [...(S.settings.defaultVeg || ['brocauli', 'rootmix', 'sprouts'])],
  };
}

function startPlan(weekStart) {
  const ws = weekStart || defaultPlanWeek();
  const existing = S.weeks[ws];
  const plan = existing ? JSON.parse(JSON.stringify(existing.plan)) : newPlan(ws);
  S.draft = { step: 'events', plan, editing: !!existing };
  saveDraft();
}

function visibleSteps(plan) { return plan.hasEvents === false ? STEPS.filter((s) => !['missed', 'gifts'].includes(s)) : STEPS; }

function renderWizard() {
  if (!S.draft) startPlan();
  const { plan, step } = S.draft;
  const existing = S.weeks[plan.weekStart];
  if (existing?.purchasesApplied) {
    return `<div class="page-enter"><div class="page-head"><span class="eyebrow">Planning</span><h1>This week is closed</h1>
      <p>You finished shopping for the ${esc(weekLabel(plan.weekStart).toLowerCase())}. Reopen the list first if you need to change the plan. Purchases will be taken back out of stock so nothing is counted twice.</p></div>
      <button class="btn btn-secondary btn-block" data-act="reopen-week" data-id="${plan.weekStart}">Reopen this week</button>
      <button class="btn btn-ghost btn-block mt-3" data-act="wiz-other-week">Plan a different week instead</button>
      <a class="btn btn-ghost btn-block mt-3" href="#/" data-act="wiz-cancel">Cancel</a></div>`;
  }
  const steps = visibleSteps(plan);
  const idx = Math.max(0, steps.indexOf(step));
  const body = WIZ[step]?.(plan) ?? '';
  const isReview = step === 'review';
  const canNext = step === 'events' ? plan.hasEvents !== null : true;
  return `<div class="page-enter" tabindex="-1">
    <div class="wiz-progress" aria-label="Step ${idx + 1} of ${steps.length}">
      <span class="pg">Page ${ROMAN[idx]} of ${ROMAN[steps.length - 1]}</span>
      <span class="bar"><i style="width:${((idx + 1) / steps.length) * 100}%"></i></span>
      <a href="#/" class="btn btn-ghost btn-sm" data-act="wiz-cancel">Close</a>
    </div>
    ${body}
  </div>
  <div class="wiz-foot"><div class="inner">
    ${idx > 0 ? `<button class="btn btn-secondary" data-act="wiz-back">${I.left} Back</button>` : `<a class="btn btn-secondary" href="#/" data-act="wiz-cancel">Cancel</a>`}
    ${isReview ? `<button class="btn btn-primary" data-act="generate">Generate My Shopping List</button>`
      : `<button class="btn btn-primary" data-act="wiz-next" ${canNext ? '' : 'disabled'}>Continue ${I.chev}</button>`}
  </div></div>`;
}

const head = (eyebrow, title, text) => `<div class="page-head"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1>${text ? `<p>${text}</p>` : ''}</div>`;

const WIZ = {
  events(plan) {
    const thisW = isoDate(mondayOf(new Date()));
    const next = new Date(parseIso(thisW)); next.setDate(next.getDate() + 7);
    const nextW = isoDate(next);
    return `${head('The week ahead', 'Do you have any events or birthdays coming up this week?', '')}
      <div class="card mb-4"><div class="small muted mb-2">Planning for</div>
        <div class="seg" role="group" aria-label="Which week">
          <button data-act="wiz-week" data-v="${thisW}" aria-pressed="${plan.weekStart === thisW}">This week · ${shortDate(thisW)}</button>
          <button data-act="wiz-week" data-v="${nextW}" aria-pressed="${plan.weekStart === nextW}">Next week · ${shortDate(nextW)}</button>
        </div>
        ${S.weeks[plan.weekStart] ? `<p class="small gold mt-3 mb-0">A plan already exists for this week. Continuing will update it and keep anything you've ticked off.</p>` : ''}
      </div>
      <div class="choices two" role="radiogroup">
        <button class="choice" role="radio" data-act="wiz-events" data-v="1" aria-checked="${plan.hasEvents === true}"><span class="t">Yes</span><span class="d">Adjust meals &amp; buy presents</span></button>
        <button class="choice" role="radio" data-act="wiz-events" data-v="0" aria-checked="${plan.hasEvents === false}"><span class="t">No</span><span class="d">Straight to lunches</span></button>
      </div>`;
  },
  missed(plan) {
    const opts = [['', 'Eating'], ['A', 'Me'], ['B', 'Partner'], ['both', 'Both']];
    const rows = DAYS.slice(0, 5).map((d, di) => `<div class="card day-block"><h3>${d}</h3>
      ${['breakfast', 'lunch', 'dinner'].map((m) => {
        const cur = plan.missed[`${di}-${m}`] || '';
        return `<div class="meal-row"><span class="lbl">${m[0].toUpperCase() + m.slice(1)}</span>
          <div class="seg danger" role="group" aria-label="${d} ${m}: who is missing it">
          ${opts.map(([v, l]) => `<button data-act="wiz-miss" data-k="${di}-${m}" data-v="${v}" aria-pressed="${cur === v}">${l}</button>`).join('')}</div></div>`;
      }).join('')}</div>`).join('');
    const n = Object.keys(plan.missed).length;
    return `${head('Events', "Are there any planned meals you're going to miss?", 'Mark who will miss each meal. Only that person\'s ingredients are removed. Weekends are already eaten out.')}
      <button class="choice mb-4" data-act="wiz-nomiss" aria-pressed="${n === 0}"><span class="t">No, we're eating every meal</span><span class="d">Continue without changes</span></button>
      ${rows}`;
  },
  gifts(plan) {
    const g = plan.gifts.map((x) => `<div class="card entry" data-gift="${x.id}">
      <button class="icon-btn remove" data-act="gift-del" data-id="${x.id}" aria-label="Remove present">${I.x}</button>
      <label class="field"><span>Present</span><input type="text" data-gift-f="desc" value="${esc(x.desc)}" placeholder="e.g. Book for Mum"></label>
      <div class="row"><label class="field"><span>Estimated price</span><div class="prefix"><input type="number" inputmode="decimal" step="0.01" min="0" data-gift-f="price" value="${esc(x.price ?? '')}"></div></label>
      <label class="field"><span>Shop</span>${retailerSelect(x.retailer, 'data-gift-f="retailer"')}</label></div>
      <div class="row"><label class="check"><input type="checkbox" data-gift-f="card" ${x.card ? 'checked' : ''}> Birthday card</label>
        <div class="prefix ${x.card ? '' : 'hidden'}"><input type="number" inputmode="decimal" step="0.01" min="0" data-gift-f="cardCost" value="${esc(x.cardCost ?? '')}" aria-label="Card cost"></div></div>
      <div class="row"><label class="check"><input type="checkbox" data-gift-f="bag" ${x.bag ? 'checked' : ''}> Gift bag</label>
        <div class="prefix ${x.bag ? '' : 'hidden'}"><input type="number" inputmode="decimal" step="0.01" min="0" data-gift-f="bagCost" value="${esc(x.bagCost ?? '')}" aria-label="Gift bag cost"></div></div>
    </div>`).join('');
    return `${head('Events', 'Are there any birthday presents you need to buy?', 'Each present, card and gift bag is added to the list under its shop.')}
      <button class="choice mb-4" data-act="wiz-nogifts" aria-pressed="${plan.gifts.length === 0}"><span class="t">No presents this week</span></button>
      ${g}
      <button class="btn btn-secondary btn-block" data-act="gift-add">${I.plus} Add a present</button>`;
  },
  lunch(plan) {
    return `${head('Lunches', 'What are we eating for lunch this week?', 'Monday to Wednesday. Thursday and Friday stay tuna. Partner\'s soup lunches are included automatically.')}
      <div class="choices" role="radiogroup">
        <button class="choice" role="radio" data-act="wiz-lunch" data-v="chicken" aria-checked="${plan.lunchProtein === 'chicken'}"><span class="t">Chicken week</span><span class="d">450g chicken breast with taco seasoning, cooked Monday</span></button>
        <button class="choice" role="radio" data-act="wiz-lunch" data-v="beef" aria-checked="${plan.lunchProtein === 'beef'}"><span class="t">Beef week</span><span class="d">450g lean 5% beef mince with taco seasoning, cooked Monday</span></button>
      </div>
      <div class="note mt-4">Tuna taco salad on Thursday and Friday, one tin each, opened on the day.</div>`;
  },
  veg(plan) {
    const per = S.settings.vegPerPerson;
    const names = ['Paprika chicken &amp; mash', 'Buffalo chicken &amp; wedges', 'Lemon &amp; garlic chicken'];
    const days = [0, 1, 2].map((d) => {
      const eaters = ['A', 'B'].filter((p) => !(plan.missed[`${d}-dinner`] === 'both' || plan.missed[`${d}-dinner`] === p)).length;
      return `<div class="veg-day"><div class="flex mb-2"><h3 class="flex-1">${DAYS[d]}</h3><span class="small muted">${names[d]}</span></div>
      <div class="choices" role="radiogroup" aria-label="${DAYS[d]} vegetables">
        ${VEG_OPTIONS.map((v) => `<button class="choice" role="radio" data-act="wiz-veg" data-d="${d}" data-v="${v.id}" aria-pressed="${plan.veg[d] === v.id}"><span class="t">${v.label}</span><span class="d">${eaters ? `${per * eaters}g` : 'Skipped'}</span></button>`).join('')}
      </div></div>`;
    }).join('');
    const pooled = {};
    [0, 1, 2].forEach((d) => {
      const eaters = ['A', 'B'].filter((p) => !(plan.missed[`${d}-dinner`] === 'both' || plan.missed[`${d}-dinner`] === p)).length;
      pooled[plan.veg[d]] = (pooled[plan.veg[d]] || 0) + per * eaters;
    });
    const pooledTxt = Object.entries(pooled).filter(([, q]) => q).map(([id, q]) => `${VEG_OPTIONS.find((v) => v.id === id).label}: <b>${fmtQty(q, 'g')}</b>`).join(' · ');
    return `${head('Dinners', 'Choose the vegetables', `${per}g per person per dinner. Repeated choices are combined into one purchase.`)}
      ${days}<div class="note">${pooledTxt || 'No vegetables needed.'}</div>`;
  },
  optional(plan) {
    const groups = OPTIONAL_GROUPS.map(([cat, label]) => {
      const items = S.products.filter((p) => p.role === 'optional' && p.category === cat);
      if (!items.length) return '';
      const sel = items.filter((p) => plan.optional[p.id]).length;
      return `<details class="group" ${sel ? 'open' : ''}><summary><span class="t">${label}</span>${sel ? `<span class="badge gold">${sel} selected</span>` : ''}<span class="chev">${I.chev}</span></summary><div class="inner">
        ${items.map((p) => optItem(p, plan)).join('')}</div></details>`;
    }).join('');
    return `${head('Replenishment', 'Anything to restock?', 'All optional items start unticked. Recipe ingredients and staples are added automatically when your stock is short. You don\'t need to select them here.')}
      ${groups}
      <details class="group"><summary><span class="t">Recipe staples in stock</span><span class="chev">${I.chev}</span></summary><div class="inner">
        <p class="small muted mt-3">Spices, sauces, oil, rice and similar. Adjust what you have, and the list will only buy what's short.</p>
        ${S.products.filter((p) => p.role === 'food' && ['spices', 'cupboard', 'cereal'].includes(p.category)).map((p) => stockMini(p)).join('')}
      </div></details>`;
  },
  special(plan) {
    const rows = plan.specials.map((x) => `<div class="card entry" data-spec="${x.id}">
      <button class="icon-btn remove" data-act="spec-del" data-id="${x.id}" aria-label="Remove">${I.x}</button>
      <label class="field"><span>Description</span><input type="text" data-spec-f="desc" value="${esc(x.desc)}" placeholder="e.g. Picture frame"></label>
      <div class="row"><label class="field"><span>Quantity</span><input type="number" inputmode="numeric" min="1" step="1" data-spec-f="qty" value="${esc(x.qty ?? 1)}"></label>
      <label class="field"><span>Est. cost each</span><div class="prefix"><input type="number" inputmode="decimal" step="0.01" min="0" data-spec-f="cost" value="${esc(x.cost ?? '')}"></div></label></div>
      <label class="field"><span>Shop</span>${retailerSelect(x.retailer, 'data-spec-f="retailer"')}</label>
    </div>`).join('');
    return `${head('One-offs', 'Are there any special purchases you need to buy this week?', '')}
      ${rows}
      <button class="btn btn-secondary btn-block" data-act="spec-add">${I.plus} Add a special purchase</button>
      ${plan.specials.length ? '' : '<p class="center small muted mt-4">Nothing to add? Just press Continue to skip.</p>'}`;
  },
  review(plan) {
    const missed = Object.entries(plan.missed).map(([k, v]) => { const [d, m] = k.split('-'); return `${DAY_SHORT[d]} ${m} (${v === 'both' ? 'both' : PEOPLE[v].toLowerCase()})`; });
    const veg = plan.veg.map((v, d) => `${DAY_SHORT[d]}: ${VEG_OPTIONS.find((o) => o.id === v)?.label}`);
    const opt = Object.entries(plan.optional).filter(([, c]) => c).map(([id, c]) => `${S.pm[id]?.name}${c > 1 ? ` ×${c}` : ''}`);
    const gifts = plan.gifts.map((g) => `${g.desc || 'Present'}${g.price ? ` (${money(num(g.price))})` : ''}${g.card ? ' + card' : ''}${g.bag ? ' + bag' : ''}`);
    const specs = plan.specials.map((s) => `${s.desc || 'Item'}${s.qty > 1 ? ` ×${s.qty}` : ''}`);
    const li = (k, v, step) => `<li><span class="k">${k}</span><span class="v">${v.length ? v.map(esc).join('<br>') : '<span class="faint">None</span>'} <a href="#" class="small" data-act="wiz-goto" data-v="${step}">Edit</a></span></li>`;
    return `${head('Review', 'Your week at a glance', esc(weekLabel(plan.weekStart)))}
      <div class="card"><ul class="summary-list">
        ${li('Lunch protein', [plan.lunchProtein === 'beef' ? 'Beef week' : 'Chicken week'], 'lunch')}
        ${li('Meals missed', missed, plan.hasEvents ? 'missed' : 'events')}
        ${li('Dinner vegetables', veg, 'veg')}
        ${li('Birthday purchases', gifts, plan.hasEvents ? 'gifts' : 'events')}
        ${li('Replenishments', opt, 'optional')}
        ${li('Special purchases', specs, 'special')}
      </ul></div>
      <p class="small muted center">Quantities are worked out from the fixed meal plan, then reduced by your household stock and rounded up to real supermarket packs.</p>`;
  },
};

function retailerSelect(cur, attrs) {
  const opts = [...new Set([...RETAILERS, cur].filter(Boolean))];
  return `<select ${attrs}>${opts.map((r) => `<option ${r === (cur || 'Tesco') ? 'selected' : ''}>${esc(r)}</option>`).join('')}<option value="__other">Other…</option></select>`;
}

function optItem(p, plan) {
  const c = plan.optional[p.id] || 0;
  const have = S.stock[p.id]?.qty || 0;
  return `<div class="opt-item">
    <input type="checkbox" class="big-check" style="width:26px;height:26px;accent-color:var(--gold)" data-act="opt-toggle" data-id="${p.id}" ${c ? 'checked' : ''} aria-label="Buy ${esc(p.name)}">
    <div><div>${esc(p.name)}</div><div class="meta">${esc(p.brand)} · ${esc(p.packs[0].label)} · ${money(p.packs[0].price)} · ${esc(p.retailer)}</div>
      <div class="instock">In stock <button class="mini-step" data-act="stock-step" data-id="${p.id}" data-d="-1" aria-label="One fewer in stock">−</button><b class="num">${have}</b><button class="mini-step" data-act="stock-step" data-id="${p.id}" data-d="1" aria-label="One more in stock">+</button></div></div>
    <div class="controls">${c ? `<div class="stepper"><button data-act="opt-step" data-id="${p.id}" data-d="-1" aria-label="Fewer">${I.minus}</button><output>${c}</output><button data-act="opt-step" data-id="${p.id}" data-d="1" aria-label="More">${I.plus}</button></div>` : ''}</div>
  </div>`;
}

function stockMini(p) {
  const have = S.stock[p.id]?.qty || 0;
  const step = p.packs?.[0]?.size || 1;
  return `<div class="opt-item" style="grid-template-columns:1fr auto">
    <div><div>${esc(p.name)}</div><div class="meta">${esc(p.brand)} · pack ${esc(p.packs?.[0]?.label || '')}</div></div>
    <div class="flex"><span class="num small">${fmtQty(have, p.unit)}</span>
    <div class="stepper"><button data-act="stock-step" data-id="${p.id}" data-d="-1" aria-label="Less">${I.minus}</button><button data-act="stock-step" data-id="${p.id}" data-d="1" aria-label="One more pack (${fmtQty(step, p.unit)})">${I.plus}</button></div></div>
  </div>`;
}

function wizMove(dir) {
  const steps = visibleSteps(S.draft.plan);
  const i = steps.indexOf(S.draft.step);
  const n = steps[Math.min(steps.length - 1, Math.max(0, i + dir))];
  S.draft.step = n;
  saveDraft();
  render();
  window.scrollTo({ top: 0 });
}

async function generate() {
  const plan = S.draft.plan;
  // Clean empty entries
  plan.gifts = plan.gifts.filter((g) => g.desc || g.price);
  plan.specials = plan.specials.filter((s) => s.desc || s.cost);
  if (!plan.hasEvents) { plan.missed = {}; plan.gifts = []; }
  // 1. Deduct earlier weeks' meals from stock (once only).
  let consumed = 0;
  for (const w of Object.values(S.weeks).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (w.id < plan.weekStart && !w.consumptionApplied && w.req) {
      S.stock = applyConsumption(S.stock, w.req, S.products, todayIso());
      w.consumptionApplied = true; consumed++;
      await saveWeek(w);
    }
  }
  if (consumed) await saveStock();
  // 2. Build the list against current stock, keeping ticks/edits from an earlier version of this week.
  const existing = S.weeks[plan.weekStart];
  const fresh = generateList(plan, { products: S.products, stock: S.stock, settings: S.settings });
  const lines = mergeLists(fresh, existing?.lines || [], existing?.removed || []);
  const { req } = buildRequirements(plan, S.settings);
  const week = {
    ...(existing || { createdAt: new Date().toISOString(), removed: [], purchasesApplied: false, consumptionApplied: false }),
    id: plan.weekStart, plan: JSON.parse(JSON.stringify(plan)), lines, req, status: 'active', stockAtGeneration: JSON.parse(JSON.stringify(S.stock)),
  };
  await saveWeek(week);
  S.meta.currentWeekId = week.id; await saveMeta();
  S.draft = null; await DB.setKV('draft', null);
  toast(existing ? 'Shopping list updated. Ticked items kept.' : consumed ? "Shopping list ready. Last week's meals were deducted from stock." : 'Shopping list ready.');
  go('list');
}

// ---------------------------------------------------------------------------
// Shopping list
// ---------------------------------------------------------------------------
function renderList() {
  const w = currentWeek();
  if (!w) return `<div class="page-enter">${head('Shopping list', 'No list yet', '')}<div class="empty"><div class="serif">The ledger awaits.</div><p>Plan your week and the list will be written for you.</p><a class="btn btn-primary" href="#/plan" data-act="start-plan">Plan This Week</a></div></div>`;
  return listView(w, w.status === 'completed' ? 'completed' : 'active');
}

function listView(w, mode) {
  const readOnly = mode !== 'active';
  const t = totals(w.lines);
  const buy = w.lines.filter((l) => !l.covered);
  const covered = w.lines.filter((l) => l.covered);
  const groups = groupByRetailer(buy);
  const order = [...RETAILERS, ...Object.keys(groups).filter((r) => !RETAILERS.includes(r))].filter((r) => groups[r]);
  const catOrder = Object.values(CATEGORIES);
  const pct = t.itemsTotal ? ((t.itemsTotal - t.itemsRemaining) / t.itemsTotal) * 100 : 0;
  const sections = order.map((r) => {
    const items = groups[r].sort((a, b) => catOrder.indexOf(a.category) - catOrder.indexOf(b.category) || a.name.localeCompare(b.name));
    const sub = round2(items.reduce((s, l) => s + (l.estCost || 0), 0));
    const left = items.filter((l) => !l.checked).length;
    let lastCat = null;
    const rows = items.map((l) => { const h = l.category !== lastCat ? `<div class="cat-head">${esc(l.category)}</div>` : ''; lastCat = l.category; return h + itemRow(l, w, readOnly); }).join('');
    return `<details class="retailer" open><summary><h2>${esc(r)}</h2><span class="sub">${left ? `${left} left · ` : '✓ · '}${money(sub)}</span><span class="chev">${I.chev}</span></summary>${rows}</details>`;
  }).join('');
  return `<div class="page-enter" tabindex="-1">
    <div class="page-head" style="padding-bottom:var(--s2)"><span class="eyebrow">${mode === 'active' ? 'Shopping list' : w.status === 'completed' ? 'Completed' : 'In progress'}</span><h1 class="list-title">Week of ${esc(longDate(w.id).replace(/ \d{4}$/, ''))}</h1></div>
    <div class="ledger-head">
      <div class="top"><div><div class="small muted">Estimated total</div><div class="big-total">${money(t.estimated)}</div></div>
        <div class="center"><div class="small muted">Items left</div><div class="serif" style="font-size:1.9rem;line-height:1">${t.itemsRemaining}<span class="faint" style="font-size:1rem"> / ${t.itemsTotal}</span></div></div></div>
      <div class="ledger-stats"><div>Purchased<b>${money(t.purchased)}</b></div><div>Remaining<b>${money(t.remaining)}</b></div><div>Missing prices<b>${t.missingPrices}</b></div></div>
      <div class="progress"><i style="width:${pct}%"></i></div>
    </div>
    ${t.missingPrices ? `<div class="note warn mt-4">${t.missingPrices} item${t.missingPrices > 1 ? 's have' : ' has'} no price, so the total is incomplete. Tap an item to add its price.</div>` : ''}
    ${sections || '<div class="empty"><div class="serif">Nothing to buy.</div><p>Everything needed is already in stock.</p></div>'}
    ${covered.length ? `<details class="group mt-5"><summary><span class="t">Already in stock</span><span class="badge green">${covered.length}</span><span class="chev">${I.chev}</span></summary><div class="inner">
      ${covered.map((l) => `<div class="stock-item"><div>${esc(l.name)}<div class="meta">Need ${fmtQty(l.required, l.unit)} · have ${fmtQty(l.inStock, l.unit)}</div></div><span class="badge green">Covered</span></div>`).join('')}</div></details>` : ''}
    ${mode === 'active' ? `<div class="btn-row mt-5"><button class="btn btn-secondary" data-act="add-item">${I.plus} Add item</button><a class="btn btn-secondary" href="#/plan" data-act="edit-plan" data-id="${w.id}">Edit plan</a></div>
      <button class="btn btn-primary btn-lg btn-block mt-3" data-act="finish">Finish Shopping</button>
      <p class="small faint center mt-3">Finishing adds the ticked items to Household Stock and files this week in your history.</p>`
      : w.status === 'completed' ? `<div class="note mt-5">This list was completed${w.completedAt ? ` on ${shortDate(w.completedAt.slice(0, 10))}` : ''}. Purchases were added to Household Stock.</div>
      ${mode === 'completed' || w.id === S.meta.currentWeekId ? `<button class="btn btn-secondary btn-block mt-4" data-act="reopen-week" data-id="${w.id}">Reopen list</button>` : ''}` : ''}
  </div>`;
}

function itemRow(l, w, readOnly) {
  const open = S.openLine === l.key && !readOnly;
  const qtyBits = [];
  if (l.packs?.length) qtyBits.push(`Buy <b>${esc(packsLabel(l.packs))}</b>`);
  if (l.required != null) qtyBits.push(`need ${fmtQty(l.required, l.unit)}`);
  if (l.inStock > 0 && l.required != null) qtyBits.push(`${fmtQty(l.inStock, l.unit)} in stock`);
  if (l.leftover > 0) qtyBits.push(`${fmtQty(l.leftover, l.unit)} spare`);
  if (l.orphan) qtyBits.push('<span class="gold">no longer needed by the plan</span>');
  const single = l.packs?.length === 1 && l.packs[0].count > 1 && !l.packs[0].loose ? `<span class="each">${money(l.packs[0].price)} each</span>` : '';
  const price = l.actualPrice != null ? `${money(l.actualPrice)}<span class="each">est ${money(l.estCost)}</span>` : l.priceMissing ? '<span class="badge red">Price?</span>' : `${money(l.estCost)}${single}`;
  return `<div class="item ${l.checked ? 'done' : ''}" data-key="${esc(l.key)}">
    <button class="tick" ${readOnly ? 'disabled' : ''} data-act="tick" data-key="${esc(l.key)}" role="checkbox" aria-checked="${!!l.checked}" aria-label="${esc(l.name)}"><span class="box">${I.check}</span></button>
    <div class="main" data-act="open-line" data-key="${esc(l.key)}"><div class="name">${esc(l.name)}</div>${l.brand ? `<div class="brand">${esc(l.brand)}</div>` : ''}<div class="qty">${qtyBits.join(' · ')}</div></div>
    <div class="price num" data-act="open-line" data-key="${esc(l.key)}">${price}</div>
    ${open ? lineEditor(l) : ''}
  </div>`;
}

function lineEditor(l) {
  const p = l.productId ? S.pm[l.productId] : null;
  let packRows = '';
  if (p && !p.byWeight) {
    packRows = p.packs.map((pk) => {
      const c = l.packs.find((x) => x.id === pk.id)?.count || 0;
      return `<div class="pack-edit"><span class="small">${esc(pk.label)} <span class="faint">${money(pk.price)}</span></span>
        <div class="stepper"><button data-act="pack-step" data-key="${esc(l.key)}" data-pack="${pk.id}" data-d="-1" aria-label="Fewer">${I.minus}</button><output>${c}</output><button data-act="pack-step" data-key="${esc(l.key)}" data-pack="${pk.id}" data-d="1" aria-label="More">${I.plus}</button></div></div>`;
    }).join('');
  } else if (!p) {
    const pk = l.packs[0];
    packRows = `<div class="pack-edit"><span class="small">Quantity</span><div class="stepper"><button data-act="pack-step" data-key="${esc(l.key)}" data-pack="${pk.id || 'x'}" data-d="-1">${I.minus}</button><output>${pk.count}</output><button data-act="pack-step" data-key="${esc(l.key)}" data-pack="${pk.id || 'x'}" data-d="1">${I.plus}</button></div></div>`;
  }
  const src = l.sources ? Object.entries(l.sources).map(([k, q]) => `${esc(k)}: ${fmtQty(q, l.unit)}`).join(' · ') : '';
  return `<div class="item-editor">
    ${src ? `<p class="small faint">${src}</p>` : ''}
    ${packRows}
    <div class="row mt-3"><label class="field"><span>Actual price paid</span><div class="prefix"><input type="number" inputmode="decimal" step="0.01" min="0" data-line-f="actualPrice" data-key="${esc(l.key)}" value="${l.actualPrice ?? ''}" placeholder="${(l.estCost || 0).toFixed(2)}"></div></label>
    <label class="field"><span>Shop</span>${retailerSelect(l.retailer, `data-line-f="retailer" data-key="${esc(l.key)}"`)}</label></div>
    <div class="btn-row"><button class="btn btn-ghost btn-sm" data-act="close-line">Done</button><button class="btn btn-danger btn-sm" data-act="remove-line" data-key="${esc(l.key)}">Remove from list</button></div>
  </div>`;
}

async function updateLine(key, fn) {
  const w = currentWeek();
  const i = w.lines.findIndex((l) => l.key === key);
  if (i < 0) return;
  w.lines[i] = fn(w.lines[i]) || w.lines[i];
  await saveWeek(w);
}

function addItemSheet() {
  const foods = S.products.slice().sort((a, b) => a.name.localeCompare(b.name));
  openSheet(`<h2>Add an item</h2>
    <label class="field mt-4"><span>From the catalogue</span><select id="ai-prod"><option value="">Something else (type below)…</option>${foods.map((p) => `<option value="${p.id}">${esc(p.name)}, ${esc(p.packs?.[0]?.label || 'loose')}</option>`).join('')}</select></label>
    <label class="field"><span>Description</span><input type="text" id="ai-name" placeholder="e.g. Batteries"></label>
    <div class="row"><label class="field"><span>Quantity</span><input type="number" id="ai-qty" min="1" value="1" inputmode="numeric"></label>
    <label class="field"><span>Price each</span><div class="prefix"><input type="number" id="ai-price" step="0.01" min="0" inputmode="decimal"></div></label></div>
    <label class="field"><span>Shop</span>${retailerSelect('Tesco', 'id="ai-ret"')}</label>
    <div class="btn-row mt-4"><button class="btn btn-secondary" data-act="close-sheet">Cancel</button><button class="btn btn-primary" id="ai-ok">Add to list</button></div>`, (sh) => {
    const prod = sh.querySelector('#ai-prod');
    prod.addEventListener('change', () => {
      const p = S.pm[prod.value];
      if (p) { sh.querySelector('#ai-name').value = p.name; sh.querySelector('#ai-price').value = p.packs?.[0]?.price ?? ''; sh.querySelector('#ai-ret').value = p.retailer; }
    });
    sh.querySelector('#ai-ok').addEventListener('click', async () => {
      const p = S.pm[prod.value];
      const name = sh.querySelector('#ai-name').value.trim();
      if (!name) { toast('Add a description first', true); return; }
      const qty = Math.max(1, Math.round(num(sh.querySelector('#ai-qty').value) || 1));
      const price = num(sh.querySelector('#ai-price').value);
      let ret = sh.querySelector('#ai-ret').value; if (ret === '__other') ret = 'Other';
      const w = currentWeek();
      const pk = p?.packs?.[0];
      w.lines.push({
        key: 'm:' + uid(), productId: p && pk ? p.id : null, name, brand: p?.brand || '', category: p ? CATEGORIES[p.category] : CATEGORIES.other, retailer: ret, unit: p?.unit || 'each',
        source: 'manual', checked: false, actualPrice: null, required: null, inStock: 0, leftover: null,
        packs: [{ id: pk?.id || 'x', label: pk?.label || 'item', size: pk?.size || 1, price, count: qty }], purchaseUnits: (pk?.size || 1) * qty,
        estCost: round2((price || 0) * qty), priceMissing: price == null,
      });
      await saveWeek(w); closeSheet(); render(); toast('Added to the list');
    });
  });
}

async function finishShopping() {
  const w = currentWeek();
  const t = totals(w.lines);
  const ok = await confirmSheet({
    title: 'Finish shopping?', ok: 'Finish & file it',
    body: `<p>Ticked items will be added to Household Stock and this week will be filed in your history.</p>
      <ul class="summary-list"><li><span class="k">Spent (actual or estimated)</span><span class="v num">${money(t.purchased)}</span></li>
      <li><span class="k">Not ticked</span><span class="v">${t.itemsRemaining} item${t.itemsRemaining === 1 ? '' : 's'}</span></li></ul>
      ${t.itemsRemaining ? '<p class="small mt-3">Unticked items are not added to stock.</p>' : ''}`,
  });
  if (!ok) return;
  if (!w.purchasesApplied) {
    S.stock = applyPurchases(S.stock, w.lines, S.products, todayIso());
    w.purchasesApplied = true;
    await saveStock();
  }
  w.status = 'completed'; w.completedAt = new Date().toISOString();
  await saveWeek(w);
  toast('Filed in the ledger. Stock updated.');
  render();
}

async function reopenWeek(id) {
  const w = S.weeks[id];
  if (!w) return;
  const ok = await confirmSheet({ title: 'Reopen this list?', ok: 'Reopen', body: '<p>The items you bought will be taken back out of Household Stock so nothing is counted twice when you finish again.</p>' });
  if (!ok) return;
  if (w.purchasesApplied) {
    for (const l of w.lines) {
      if (!l.checked || !l.productId || !S.stock[l.productId]) continue;
      S.stock[l.productId].qty = Math.max(0, Math.round((S.stock[l.productId].qty - (l.purchaseUnits || 0)) * 1000) / 1000);
    }
    w.purchasesApplied = false;
    await saveStock();
  }
  w.status = 'active'; delete w.completedAt;
  await saveWeek(w);
  S.meta.currentWeekId = w.id; await saveMeta();
  if (S.draft?.plan?.weekStart === id) { S.draft.step = 'events'; await saveDraft(); }
  toast('List reopened');
  render();
}

// ---------------------------------------------------------------------------
// Meals
// ---------------------------------------------------------------------------
function renderMeals() {
  const thisMonday = isoDate(mondayOf(new Date()));
  const w = currentWeek();
  const plan = w?.plan || newPlan(thisMonday);
  const sched = buildSchedule(plan);
  const isThisWeek = (w?.id || thisMonday) === thisMonday;
  const dow = (new Date().getDay() + 6) % 7;
  const mealName = (s) => {
    if (!s.recipe) return `<span class="muted">${esc(s.note)}</span>`;
    const r = RECIPES[s.recipe];
    const v = s.veg ? ` <span class="faint">with ${esc(VEG_OPTIONS.find((o) => o.id === s.veg)?.label.toLowerCase())}</span>` : '';
    return `<a href="#/recipe/${s.recipe}" class="${s.missed ? 'missed' : ''}">${esc(r.short)}</a>${v}${s.missed ? ' <span class="badge red">missed</span>' : ''}`;
  };
  const cards = sched.map(({ day, slots }) => {
    const byMeal = ['breakfast', 'lunch', 'dinner'].map((m) => {
      const ss = slots.filter((s) => s.meal === m);
      const both = ss.length === 2 && ss[0].recipe === ss[1].recipe && !ss[0].missed && !ss[1].missed;
      const body = ss[0].person === 'both' ? mealName(ss[0])
        : both ? `${mealName(ss[0])} <span class="who">· both</span>`
          : ss.map((s) => `<div><span class="who">${PEOPLE[s.person]}:</span> ${mealName(s)}</div>`).join('');
      return `<div class="meal"><span class="when">${m}</span><div class="what">${body}</div></div>`;
    }).join('');
    const prep = day === 0 ? `<div class="note mt-3"><b>Monday prep.</b> Cook the three ${plan.lunchProtein === 'beef' ? 'beef' : 'chicken'} salad portions. <a href="#/references">Prep guide</a></div>` : '';
    return `<div class="card day-card ${isThisWeek && day === dow ? 'today' : ''}"><div class="flex mb-2"><h3 class="flex-1">${DAYS[day]}</h3>${isThisWeek && day === dow ? '<span class="badge gold">Today</span>' : ''}</div>${byMeal}
      <div class="meal"><span class="when">Evening</span><div class="what"><span class="who">Me:</span> Popchips, PROPERCHIPS &amp; 2 Skinny bars</div></div>${prep}</div>`;
  }).join('');
  return `<div class="page-enter" tabindex="-1">${head('The schedule', "This Week's Meals", w ? esc(weekLabel(w.id)) : 'Default plan: tap Plan This Week to tailor it.')}${cards}</div>`;
}

// ---------------------------------------------------------------------------
// Stock
// ---------------------------------------------------------------------------
const LOCATIONS = ['Fridge', 'Freezer', 'Cupboard', 'Cleaning cupboard', 'Bathroom', 'Other'];

function renderStock() {
  const q = S.stockSearch.toLowerCase();
  const have = S.stockFilter === 'have';
  const items = S.products.filter((p) => (!have || (S.stock[p.id]?.qty || 0) > 0) && (!q || (p.name + ' ' + p.brand).toLowerCase().includes(q)));
  const byLoc = {};
  for (const p of items) { const loc = S.stock[p.id]?.location || p.storage || 'Other'; (byLoc[loc] ||= []).push(p); }
  const blocks = LOCATIONS.filter((l) => byLoc[l]).map((loc) => `<div class="loc-head"><h3>${loc}</h3><span class="small faint">${byLoc[loc].length}</span></div>
    ${byLoc[loc].sort((a, b) => a.name.localeCompare(b.name)).map((p) => {
      const e = S.stock[p.id] || {};
      const exp = e.expiry ? (parseIso(e.expiry) - new Date()) / 864e5 : null;
      return `<div class="stock-item"><div data-act="stock-edit" data-id="${p.id}" style="cursor:pointer"><div>${esc(p.name)}</div><div class="meta">${esc(p.brand)}${e.updated ? ` · updated ${shortDate(e.updated)}` : ''}${e.expiry ? ` · <span class="${exp <= 3 ? 'gold' : ''}">use by ${shortDate(e.expiry)}</span>` : ''}</div></div>
        <div class="flex"><span class="q">${fmtQty(e.qty || 0, p.unit)}</span><div class="stepper"><button data-act="stock-step" data-id="${p.id}" data-d="-1" aria-label="Less">${I.minus}</button><button data-act="stock-step" data-id="${p.id}" data-d="1" aria-label="More">${I.plus}</button></div></div></div>`;
    }).join('')}`).join('');
  return `<div class="page-enter" tabindex="-1">${head('Inventory', 'Household Stock', 'What\'s already at home. The list subtracts it automatically. The − and + buttons move one pack at a time; tap a name for exact amounts.')}
    <div class="seg mb-4" role="group"><button data-act="stock-filter" data-v="have" aria-pressed="${have}">In stock</button><button data-act="stock-filter" data-v="all" aria-pressed="${!have}">All products</button></div>
    <input type="search" placeholder="Search…" value="${esc(S.stockSearch)}" data-bind="stockSearch" aria-label="Search stock">
    ${blocks || `<div class="empty"><div class="serif">The shelves are bare.</div><p>Switch to <b>All products</b> to record what you already have, or finish a shopping trip to fill this in automatically.</p></div>`}
    <p class="small faint mt-5">Ticked purchases are added when you finish shopping. Each week's meals are deducted when you plan the next week. Fresh items (salad, herbs, opened yoghurt and passata) aren't carried over.</p>
  </div>`;
}

function stockStep(id, dir) {
  const p = S.pm[id];
  const step = p.byWeight ? 100 : p.packs?.[0]?.size || 1;
  const e = (S.stock[id] ||= { qty: 0, unit: p.unit, location: p.storage || 'Other' });
  e.qty = Math.max(0, Math.round((e.qty + dir * step) * 1000) / 1000);
  e.updated = todayIso();
  saveStock();
}

function stockEditSheet(id) {
  const p = S.pm[id];
  const e = S.stock[id] || { qty: 0, location: p.storage || 'Other' };
  openSheet(`<h2>${esc(p.name)}</h2><p class="muted small">${esc(p.brand)} · amounts in ${p.unit === 'g' ? 'grams' : p.unit === 'ml' ? 'millilitres' : p.unit + 's'}</p>
    <label class="field mt-3"><span>Quantity at home (${esc(p.unit)})</span><input type="number" id="se-q" min="0" step="any" inputmode="decimal" value="${e.qty || 0}"></label>
    <label class="field"><span>Storage</span><select id="se-loc">${LOCATIONS.map((l) => `<option ${l === (e.location || p.storage) ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="field"><span>Use-by date (optional)</span><input type="date" id="se-exp" value="${e.expiry || ''}"></label>
    <div class="btn-row mt-4"><button class="btn btn-secondary" data-act="close-sheet">Cancel</button><button class="btn btn-primary" id="se-ok">Save</button></div>`, (sh) => {
    sh.querySelector('#se-ok').addEventListener('click', async () => {
      const qv = num(sh.querySelector('#se-q').value);
      if (qv == null || qv < 0) { toast('Enter a quantity of zero or more', true); return; }
      S.stock[id] = { ...(S.stock[id] || {}), qty: qv, unit: p.unit, location: sh.querySelector('#se-loc').value, expiry: sh.querySelector('#se-exp').value || null, updated: todayIso() };
      await saveStock(); closeSheet(); render(); toast('Stock updated');
    });
  });
}

// ---------------------------------------------------------------------------
// More / references / recipes
// ---------------------------------------------------------------------------
function renderMore() {
  const card = (href, icon, title, sub) => `<a class="card card-link" href="${href}"><span class="ico">${icon}</span><span class="body"><h3>${title}</h3><span class="sub">${sub}</span></span><span class="chev">${I.chev}</span></a>`;
  return `<div class="page-enter" tabindex="-1">${head('The ledger', 'More', '')}
    ${card('#/references', I.book, 'References', 'Portions, prep guide and recipe cards')}
    ${card('#/history', I.history, 'Shopping History', 'Every past week, with its prices preserved')}
    ${card('#/catalogue', I.tag, 'Catalogue &amp; Prices', 'Products, pack sizes, shops and prices')}
    ${card('#/backup', I.save, 'Backup &amp; Restore', S.meta.lastBackup ? `Last backup ${shortDate(S.meta.lastBackup.slice(0, 10))}` : 'No backup yet')}
    ${card('#/settings', I.gear, 'Preferences', 'Vegetable portions and defaults')}
    <p class="center faint small mt-5">The Household Ledger · data stays on this device</p></div>`;
}

function renderReferences() {
  const refs = REFERENCES.map((r) => `<div class="ref-card ${r.quote ? 'quote' : ''}"><div class="k">${esc(r.title)}</div><div class="v">${esc(r.value)}</div>${r.quote ? '' : `<div class="n">${esc(r.note)}</div>`}</div>`).join('');
  const lib = Object.entries(RECIPES).filter(([, r]) => !r.hidden).map(([id, r]) => `<a class="card card-link" href="#/recipe/${id}" style="min-height:60px"><span class="body"><h3 style="font-size:1.12rem">${esc(r.name)}</h3><span class="sub">${r.template ? "Partner's template" : r.per === 'batch' ? `Batch of ${r.servings} portions` : r.who === 'both' ? 'Per person · both' : 'Per serving'} · ${r.prep + r.cook} min</span></span><span class="chev">${I.chev}</span></a>`).join('');
  return `<div class="page-enter" tabindex="-1">${head('Reference', 'References', '')}
    <div class="ref-grid">${refs}</div>
    ${ornament()}
    <h2 class="mb-2">Monday preparation</h2>
    <div class="card"><ol class="method">${PREP_GUIDE.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    <p class="small faint mt-3 mb-0">Cautious UK guidance: chill cooked food within 1–2 hours, keep the fridge at 5°C or below, reheat once only until steaming hot throughout.</p></div>
    ${ornament()}
    <h2 class="mb-2">Recipe library</h2>${lib}</div>`;
}

function renderRecipe(id) {
  const r = RECIPES[id];
  if (!r) return renderReferences();
  const nut = recipeNutrition(id, S.products, S.settings);
  const ingLabel = (pid, q) => r.display?.[pid] || `${fmtQty(q, S.pm[pid]?.unit)} ${S.pm[pid]?.name.toLowerCase() || pid}`;
  const ings = r.ingredients.map(([pid, q]) => `<li>${esc(ingLabel(pid, q))}</li>`).join('')
    + (r.perPortion || []).map(([pid, q]) => `<li>${esc(ingLabel(pid, q))}</li>`).join('')
    + (r.veg ? `<li>${S.settings.vegPerPerson}g vegetables per person (your weekly choice)</li>` : '');
  const servingTxt = r.per === 'batch' ? `Makes ${r.servings} portions (two evenings for two)` : r.who === 'both' ? 'Quantities per person · cooked for two' : 'Serves 1';
  return `<div class="page-enter" tabindex="-1"><a class="back" href="#/references">${I.left} References</a>
    <div class="page-head" style="padding-top:var(--s3)"><span class="eyebrow">${r.template ? 'Reference template' : 'Recipe card'}</span><h1>${esc(r.name)}</h1></div>
    <div class="recipe-meta"><span class="badge">${servingTxt}</span><span class="badge">Prep ${r.prep} min</span>${r.cook ? `<span class="badge">Cook ${r.cook} min</span>` : ''}</div>
    <div class="grid-2 mb-4"><div class="card center"><div class="eyebrow">Est. calories</div><div class="big-total" style="font-size:2rem">${nut.kcal}</div><div class="small faint">kcal per ${r.per === 'batch' ? 'portion inc. rice' : 'serving'}</div></div>
      <div class="card center"><div class="eyebrow">Est. protein</div><div class="big-total" style="font-size:2rem">${nut.protein}g</div><div class="small faint">per ${r.per === 'batch' ? 'portion' : 'serving'}</div></div></div>
    <p class="small faint">Estimates: branded items use their pack labels; fresh produce, meat and staples use UK generic values${r.veg ? '; vegetables counted as broccoli &amp; cauliflower' : ''}. A guide, not a tracker.</p>
    ${r.batchNote ? `<div class="note mb-4">${esc(r.batchNote)}</div>` : ''}
    <h2 class="mb-2">Ingredients</h2><ul class="ing card">${ings}</ul>
    <h2 class="mb-2 mt-5">Method</h2><div class="card"><ol class="method">${(r.method || []).map((m) => `<li>${esc(m)}</li>`).join('')}</ol></div>
    <h2 class="mb-2 mt-5">Storage</h2><div class="note">${esc(r.storage || '')}</div></div>`;
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------
function renderHistory(id) {
  if (id && S.weeks[id]) {
    const w = S.weeks[id];
    const p = w.plan;
    const missed = Object.entries(p.missed || {}).map(([k, v]) => { const [d, m] = k.split('-'); return `${DAY_SHORT[d]} ${m} (${v === 'both' ? 'both' : PEOPLE[v].toLowerCase()})`; });
    return `<div class="page-enter" tabindex="-1"><a class="back" href="#/history">${I.left} History</a>
      <div class="card mt-3"><ul class="summary-list">
        <li><span class="k">Lunches</span><span class="v">${p.lunchProtein === 'beef' ? 'Beef week' : 'Chicken week'}</span></li>
        <li><span class="k">Vegetables</span><span class="v">${p.veg.map((v, d) => `${DAY_SHORT[d]}: ${esc(VEG_OPTIONS.find((o) => o.id === v)?.label)}`).join('<br>')}</span></li>
        <li><span class="k">Missed meals</span><span class="v">${missed.length ? missed.map(esc).join('<br>') : 'None'}</span></li>
        <li><span class="k">Status</span><span class="v">${w.status === 'completed' ? 'Completed' : 'In progress'}</span></li>
      </ul>${w.id === S.meta.currentWeekId && w.status !== 'completed' ? '<a class="btn btn-secondary btn-block mt-3" href="#/list">Open shopping list</a>' : ''}</div>
      ${listView(w, 'history')}</div>`;
  }
  const ws = weeksDesc();
  if (!ws.length) return `<div class="page-enter">${head('Archive', 'Shopping History', '')}<div class="empty"><div class="serif">No weeks recorded yet.</div><p>Each list you generate is kept here, with its prices exactly as they were.</p></div></div>`;
  const cards = ws.map((w) => {
    const t = totals(w.lines);
    const actual = w.lines.filter((l) => l.checked).reduce((s, l) => s + lineCost(l), 0);
    return `<a class="card card-link" href="#/history/${w.id}"><span class="body"><h3>${DAYS[0]} ${longDate(w.id)}</h3>
      <span class="sub">${w.plan.lunchProtein === 'beef' ? 'Beef' : 'Chicken'} week · est. ${money(t.estimated)}${w.status === 'completed' ? ` · spent ${money(round2(actual))}` : ''}</span></span>
      <span class="status-pill ${w.status === 'completed' ? 'ok' : ''}">${w.status === 'completed' ? 'Filed' : 'Open'}</span></a>`;
  }).join('');
  return `<div class="page-enter" tabindex="-1">${head('Archive', 'Shopping History', 'Past lists keep the prices they were written with.')}${cards}</div>`;
}

// ---------------------------------------------------------------------------
// Catalogue & prices
// ---------------------------------------------------------------------------
function renderCatalogue() {
  const q = S.catSearch.toLowerCase();
  const byCat = {};
  for (const p of S.products) {
    if (q && !(p.name + ' ' + p.brand + ' ' + p.retailer).toLowerCase().includes(q)) continue;
    (byCat[p.category] ||= []).push(p);
  }
  const blocks = Object.keys(CATEGORIES).filter((c) => byCat[c]).map((c) => `<div class="loc-head"><h3>${CATEGORIES[c]}</h3></div>
    ${byCat[c].sort((a, b) => a.name.localeCompare(b.name)).map((p) => `<div class="stock-item" data-act="cat-edit" data-id="${p.id}" style="cursor:pointer"><div><div>${esc(p.name)}</div>
      <div class="meta">${esc(p.brand)} · ${esc(p.retailer)}${p.assumed ? ` · <span class="gold">assumed ${esc(p.assumed)}</span>` : ''}</div></div>
      <div class="num small" style="text-align:right">${p.byWeight ? `${money(p.byWeight.pricePerKg)}/kg` : p.packs.map((pk) => `${esc(pk.label)} <b>${money(pk.price)}</b>`).join('<br>')}</div></div>`).join('')}`).join('');
  return `<div class="page-enter" tabindex="-1"><a class="back" href="#/more">${I.left} More</a>${head('Catalogue', 'Catalogue &amp; Prices', 'Change a price here and future lists use it; saved weeks keep their original prices.')}
    <input type="search" placeholder="Search products…" value="${esc(S.catSearch)}" data-bind="catSearch" aria-label="Search catalogue">
    <button class="btn btn-secondary btn-block mt-3" data-act="cat-new">${I.plus} Add a product</button>
    ${blocks}</div>`;
}

function catEditSheet(id) {
  const p = id ? JSON.parse(JSON.stringify(S.pm[id])) : { id: 'u-' + uid(), name: '', brand: '', category: 'other', retailer: 'Tesco', unit: 'pack', role: 'optional', storage: 'Other', packs: [{ id: 'u-' + uid(), label: '1 pack', size: 1, price: null }] };
  const packRows = () => p.byWeight
    ? `<label class="field"><span>Price per kg</span><div class="prefix"><input type="number" step="0.01" min="0" data-pk="perkg" value="${p.byWeight.pricePerKg}"></div></label>`
    : p.packs.map((pk, i) => `<div class="row" style="align-items:end"><label class="field" style="flex:2"><span>Pack ${i + 1}</span><input type="text" data-pk="label" data-i="${i}" value="${esc(pk.label)}"></label>
      <label class="field"><span>Size (${esc(p.unit)})</span><input type="number" min="0" step="any" data-pk="size" data-i="${i}" value="${pk.size}"></label>
      <label class="field"><span>Price</span><div class="prefix"><input type="number" min="0" step="0.01" data-pk="price" data-i="${i}" value="${pk.price ?? ''}"></div></label></div>`).join('');
  openSheet(`<h2>${id ? 'Edit product' : 'New product'}</h2>
    <label class="field mt-3"><span>Name</span><input type="text" id="ce-name" value="${esc(p.name)}"></label>
    <div class="row"><label class="field"><span>Brand</span><input type="text" id="ce-brand" value="${esc(p.brand)}"></label>
    <label class="field"><span>Shop</span>${retailerSelect(p.retailer, 'id="ce-ret"')}</label></div>
    ${id ? '' : `<label class="field"><span>Category</span><select id="ce-cat">${OPTIONAL_GROUPS.map(([c, l]) => `<option value="${c}">${l}</option>`).join('')}</select></label>`}
    <div id="ce-packs">${packRows()}</div>
    ${!p.byWeight && id ? '<button class="btn btn-ghost btn-sm" id="ce-addpack">+ Add a pack size</button>' : ''}
    ${p.note ? `<p class="small faint">${esc(p.note)}</p>` : ''}
    <div class="btn-row mt-4"><button class="btn btn-secondary" data-act="close-sheet">Cancel</button><button class="btn btn-primary" id="ce-ok">Save</button></div>`, (sh) => {
    sh.querySelector('#ce-addpack')?.addEventListener('click', () => {
      sync(); p.packs.push({ id: p.id + '-' + uid(), label: 'New pack', size: p.packs[0]?.size || 1, price: null });
      sh.querySelector('#ce-packs').innerHTML = packRows();
    });
    function sync() {
      sh.querySelectorAll('[data-pk]').forEach((inp) => {
        if (inp.dataset.pk === 'perkg') { p.byWeight.pricePerKg = num(inp.value) ?? p.byWeight.pricePerKg; return; }
        const pk = p.packs[+inp.dataset.i];
        if (inp.dataset.pk === 'label') pk.label = inp.value;
        if (inp.dataset.pk === 'size') pk.size = num(inp.value) ?? pk.size;
        if (inp.dataset.pk === 'price') pk.price = num(inp.value);
      });
    }
    sh.querySelector('#ce-ok').addEventListener('click', async () => {
      sync();
      p.name = sh.querySelector('#ce-name').value.trim();
      if (!p.name) { toast('A product needs a name', true); return; }
      p.brand = sh.querySelector('#ce-brand').value.trim();
      const ret = sh.querySelector('#ce-ret').value; p.retailer = ret === '__other' ? 'Other' : ret;
      if (!id) p.category = sh.querySelector('#ce-cat').value;
      if (!p.byWeight && p.packs.some((pk) => !(pk.size > 0))) { toast('Pack sizes must be above zero', true); return; }
      await DB.put('products', p);
      S.products = S.products.filter((x) => x.id !== p.id).concat(p); S.pm = productMap(S.products);
      closeSheet(); render(); toast('Catalogue saved. Regenerate the list to use new prices.');
    });
  });
}

// ---------------------------------------------------------------------------
// Backup, settings
// ---------------------------------------------------------------------------
function renderBackup() {
  return `<div class="page-enter" tabindex="-1"><a class="back" href="#/more">${I.left} More</a>${head('Safekeeping', 'Backup &amp; Restore', 'Your ledger is stored only in this browser on this device. Nothing is sent anywhere, and GitHub Pages does not store or sync data. Export a backup regularly and keep it somewhere safe (Files, iCloud, Google Drive, email to yourself).')}
    <div class="card"><h3>Export a backup</h3><p class="small muted">A single .json file with your catalogue, prices, stock, settings and every saved week.</p>
      <button class="btn btn-primary btn-block" data-act="export">${I.save} Download backup</button>
      <p class="small faint mt-3 mb-0">${S.meta.lastBackup ? `Last exported ${shortDate(S.meta.lastBackup.slice(0, 10))}` : 'Never exported'}</p></div>
    <div class="card"><h3>Restore from a backup</h3><p class="small muted">Replaces everything on this device with the backup's contents. The file is checked before anything changes.</p>
      <label class="btn btn-secondary btn-block" style="cursor:pointer">Choose backup file<input type="file" accept="application/json,.json" data-act-change="import" class="sr-only"></label></div>
    <div class="card"><h3>Move to a new phone</h3><p class="small muted mb-0">Export here, send the file to the new phone, open this app there and restore.</p></div>
  </div>`;
}

async function exportBackup() {
  const data = makeBackup({ products: S.products, stock: S.stock, weeks: Object.values(S.weeks), settings: S.settings });
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  const name = `household-ledger-backup-${todayIso()}.json`;
  const file = new File([blob], name, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) await navigator.share({ files: [file], title: 'Household Ledger backup' });
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
    S.meta.lastBackup = new Date().toISOString(); await saveMeta(); render(); toast('Backup exported');
  } catch (err) { if (err.name !== 'AbortError') toast('Export failed: ' + err.message, true); }
}

async function importBackup(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { toast('That file is not valid JSON.', true); return; }
  const v = validateBackup(data);
  if (!v.ok) { openSheet(`<h2>Can't restore this file</h2><ul class="mt-3">${v.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul><button class="btn btn-secondary btn-block mt-4" data-act="close-sheet">Close</button>`); return; }
  data = migrateBackup(data);
  const ok = await confirmSheet({ title: 'Restore this backup?', danger: true, ok: 'Replace everything', body: `<p>Exported ${esc((data.exportedAt || '').slice(0, 10))}: ${data.products.length} products, ${data.weeks.length} saved weeks, ${Object.keys(data.stock).length} stock entries.</p><p class="small">Everything currently on this device will be replaced.</p>` });
  if (!ok) return;
  try {
    await DB.replaceAll(data);
    await load();
    S.meta.currentWeekId = weeksDesc()[0]?.id || null; await saveMeta();
    toast('Backup restored'); go('');
  } catch (err) { toast('Restore failed. Nothing was changed: ' + err.message, true); }
}

function renderSettings() {
  const s = S.settings;
  return `<div class="page-enter" tabindex="-1"><a class="back" href="#/more">${I.left} More</a>${head('Preferences', 'Preferences', '')}
    <div class="card"><h3>Dinner vegetables per person</h3><p class="small muted">The agreed range is 150–200g.</p>
      <div class="seg" role="group">${[150, 175, 200].map((g) => `<button data-act="set" data-k="vegPerPerson" data-v="${g}" aria-pressed="${s.vegPerPerson === g}">${g}g</button>`).join('')}</div></div>
    <div class="card"><h3>Default lunch protein</h3>
      <div class="seg" role="group">${['chicken', 'beef'].map((x) => `<button data-act="set" data-k="lunchProtein" data-v="${x}" aria-pressed="${s.lunchProtein === x}">${x === 'beef' ? 'Beef' : 'Chicken'}</button>`).join('')}</div></div>
    <div class="card"><h3>Default vegetables</h3>${[0, 1, 2].map((d) => `<label class="field"><span>${DAYS[d]}</span><select data-act-change="set-veg" data-d="${d}">${VEG_OPTIONS.map((v) => `<option value="${v.id}" ${s.defaultVeg[d] === v.id ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>`).join('')}</div>
    <div class="card"><h3>Your targets</h3><p class="small muted mb-0">≈${s.calorieTarget.toLocaleString()} kcal a day · ${s.proteinRange[0]}–${s.proteinRange[1]}g protein. Shown on reference cards only; this isn't a tracker.</p></div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
const actions = {
  'start-plan': (el, e) => { if (!S.draft) startPlan(); },
  'discard-draft': async (el, e) => { e.preventDefault(); S.draft = null; await DB.setKV('draft', null); render(); },
  'edit-plan': (el) => { startPlan(el.dataset.id); },
  'wiz-cancel': () => { /* draft kept for resume */ },
  'wiz-other-week': async () => {
    const d = parseIso(S.draft.plan.weekStart); d.setDate(d.getDate() + 7);
    S.draft = null; startPlan(isoDate(d)); render();
  },
  'wiz-next': () => wizMove(1),
  'wiz-back': () => wizMove(-1),
  'wiz-goto': (el, e) => { e.preventDefault(); S.draft.step = el.dataset.v; saveDraft(); render(); window.scrollTo({ top: 0 }); },
  'wiz-week': (el) => {
    const ws = el.dataset.v; const ex = S.weeks[ws];
    S.draft.plan = ex ? JSON.parse(JSON.stringify(ex.plan)) : { ...S.draft.plan, weekStart: ws };
    saveDraft(); render();
  },
  'wiz-events': (el) => { S.draft.plan.hasEvents = el.dataset.v === '1'; saveDraft(); wizMove(1); },
  'wiz-miss': (el) => { const { k, v } = el.dataset; if (v) S.draft.plan.missed[k] = v; else delete S.draft.plan.missed[k]; saveDraft(); render(); },
  'wiz-nomiss': () => { S.draft.plan.missed = {}; saveDraft(); wizMove(1); },
  'wiz-nogifts': () => { S.draft.plan.gifts = []; saveDraft(); wizMove(1); },
  'gift-add': () => { S.draft.plan.gifts.push({ id: uid(), desc: '', price: '', retailer: 'Tesco', card: true, cardCost: 2.5, bag: false, bagCost: 1.5 }); saveDraft(); render(); },
  'gift-del': (el) => { S.draft.plan.gifts = S.draft.plan.gifts.filter((g) => g.id !== el.dataset.id); saveDraft(); render(); },
  'spec-add': () => { S.draft.plan.specials.push({ id: uid(), desc: '', qty: 1, cost: '', retailer: 'Tesco' }); saveDraft(); render(); },
  'spec-del': (el) => { S.draft.plan.specials = S.draft.plan.specials.filter((g) => g.id !== el.dataset.id); saveDraft(); render(); },
  'wiz-lunch': (el) => { S.draft.plan.lunchProtein = el.dataset.v; saveDraft(); render(); },
  'wiz-veg': (el) => { S.draft.plan.veg[+el.dataset.d] = el.dataset.v; saveDraft(); render(); },
  'opt-toggle': (el) => { const id = el.dataset.id; if (S.draft.plan.optional[id]) delete S.draft.plan.optional[id]; else S.draft.plan.optional[id] = 1; saveDraft(); keepScroll(render); },
  'opt-step': (el) => { const id = el.dataset.id; const n = (S.draft.plan.optional[id] || 0) + +el.dataset.d; if (n <= 0) delete S.draft.plan.optional[id]; else S.draft.plan.optional[id] = Math.min(n, 99); saveDraft(); keepScroll(render); },
  'stock-step': (el) => { stockStep(el.dataset.id, +el.dataset.d); keepScroll(render); },
  'stock-filter': (el) => { S.stockFilter = el.dataset.v; render(); },
  'stock-edit': (el) => stockEditSheet(el.dataset.id),
  generate: () => generate(),
  tick: async (el) => {
    const key = el.dataset.key;
    await updateLine(key, (l) => ({ ...l, checked: !l.checked, checkedAt: !l.checked ? new Date().toISOString() : null }));
    if (navigator.vibrate) try { navigator.vibrate(8); } catch { /* ignore */ }
    keepScroll(render);
  },
  'open-line': (el) => { if (currentWeek()?.status === 'completed' || parts()[0] === 'history') return; S.openLine = S.openLine === el.dataset.key ? null : el.dataset.key; keepScroll(render); },
  'close-line': () => { S.openLine = null; keepScroll(render); },
  'pack-step': async (el) => {
    const { key, pack, d } = el.dataset;
    await updateLine(key, (l) => {
      const p = l.productId ? S.pm[l.productId] : null;
      if (p && !p.byWeight && l.source !== 'manual') {
        const counts = Object.fromEntries(p.packs.map((pk) => [pk.id, l.packs.find((x) => x.id === pk.id)?.count || 0]));
        counts[pack] = Math.max(0, counts[pack] + +d);
        const defs = Object.fromEntries(p.packs.map((pk) => [pk.id, pk]));
        const nl = applyEdit({ ...l, packs: l.packs.map((x) => ({ ...x })) }, { ...(l.edit || {}), packCounts: counts, packDefs: defs });
        nl.covered = false;
        return nl;
      }
      const pk = { ...l.packs[0], count: Math.max(1, l.packs[0].count + +d) };
      return { ...l, packs: [pk], purchaseUnits: pk.count * (pk.size || 1), estCost: round2((pk.price || 0) * pk.count), edit: { ...(l.edit || {}), count: pk.count } };
    });
    keepScroll(render);
  },
  'remove-line': async (el) => {
    const w = currentWeek(); const key = el.dataset.key;
    w.lines = w.lines.filter((l) => l.key !== key);
    if (!key.startsWith('m:')) w.removed = [...new Set([...(w.removed || []), key])];
    S.openLine = null; await saveWeek(w); keepScroll(render); toast('Removed. It will stay off when you regenerate.');
  },
  'add-item': () => addItemSheet(),
  finish: () => finishShopping(),
  'reopen-week': (el) => reopenWeek(el.dataset.id),
  'close-sheet': () => closeSheet(),
  'cat-edit': (el) => catEditSheet(el.dataset.id),
  'cat-new': () => catEditSheet(null),
  export: () => exportBackup(),
  set: async (el) => { const { k, v } = el.dataset; S.settings[k] = k === 'vegPerPerson' ? +v : v; await DB.setKV('settings', S.settings); render(); },
};

function keepScroll(fn) { const y = window.scrollY; fn(); window.scrollTo(0, y); }

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (!fn) return;
  if (el.tagName === 'BUTTON' || (el.tagName === 'A' && el.getAttribute('href') === '#')) e.preventDefault();
  if (el.tagName === 'INPUT' && el.type === 'checkbox') { /* let the checkbox change, then act */ }
  fn(el, e);
});

document.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.dataset.actChange === 'import' && el.files?.[0]) { await importBackup(el.files[0]); el.value = ''; return; }
  if (el.dataset.actChange === 'set-veg') { S.settings.defaultVeg[+el.dataset.d] = el.value; await DB.setKV('settings', S.settings); toast('Saved'); return; }
  if (el.matches('select') && el.value === '__other') {
    const name = prompt('Shop name');
    if (name) { const o = document.createElement('option'); o.textContent = name.trim(); el.insertBefore(o, el.lastElementChild); el.value = name.trim(); } else { el.selectedIndex = 0; }
  }
  if (el.dataset.lineF) {
    const f = el.dataset.lineF; const key = el.dataset.key;
    await updateLine(key, (l) => (f === 'actualPrice'
      ? { ...l, actualPrice: num(el.value) != null ? round2(num(el.value)) : null }
      : { ...l, retailer: el.value, edit: { ...(l.edit || {}), retailer: el.value } }));
    if (f === 'retailer') { S.openLine = null; keepScroll(render); toast(`Moved to ${el.value}`); } else keepScroll(render);
    return;
  }
  wizField(el, true);
});

document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.bind) { S[el.dataset.bind] = el.value; const pos = el.selectionStart; render(); const n = app.querySelector(`[data-bind="${el.dataset.bind}"]`); n?.focus(); try { n?.setSelectionRange(pos, pos); } catch { /* search inputs */ } return; }
  wizField(el, false);
});

function wizField(el, rerender) {
  const gf = el.dataset.giftF, sf = el.dataset.specF;
  if (!gf && !sf) return;
  const card = el.closest(gf ? '[data-gift]' : '[data-spec]');
  const list = gf ? S.draft.plan.gifts : S.draft.plan.specials;
  const item = list.find((x) => x.id === (gf ? card.dataset.gift : card.dataset.spec));
  const f = gf || sf;
  item[f] = el.type === 'checkbox' ? el.checked : el.value;
  saveDraft();
  if (rerender && el.type === 'checkbox') keepScroll(render);
}

window.addEventListener('hashchange', () => { closeSheet(); S.openLine = null; render(); window.scrollTo({ top: 0 }); });

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
(async function boot() {
  try {
    await DB.init();
    await load();
    render();
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="page-head"><h1>The ledger could not open</h1><p>${esc(err.message)}</p><p class="small muted">Try closing other tabs of this app and reloading.</p></div>`;
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW registration failed', e));
  }
})();

// Exposed for automated browser tests only.
window.__ledger = { S, render, go };
