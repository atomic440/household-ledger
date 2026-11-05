# The Household Ledger

*Shopping & Meal Planning*: a Dark Academia, mobile-first planner for a two-person household.

Tap **Plan This Week**, answer up to eight short questions, and the Ledger writes the week's meal schedule and a costed shopping list grouped by shop. It does the maths: combining ingredients across recipes, subtracting what's already at home, and rounding up to real supermarket packs. You tick items off as you shop, then file the week in your history.

- Static site: plain HTML, CSS and JavaScript. No frameworks, no build step, no paid services, no server.
- Data is stored **only in the browser on your phone** (IndexedDB). GitHub Pages hosts the app files; it does **not** store or sync your data. Use **Ledger → Backup & Restore** regularly.
- Installable Progressive Web App that works offline after the first visit.

---

## 1. Put it on GitHub Pages (about 10 minutes, no coding)

1. Sign in at **github.com** and click **New repository**.
   - Name it, e.g. `household-ledger`. Choose **Public** (free GitHub Pages needs a public repo on free accounts). Your personal data is never in the repo; it stays on your phone.
   - Click **Create repository**.
2. On the new repo page click **uploading an existing file**.
3. Unzip `household-ledger.zip` on your computer and drag **everything inside the folder** (`index.html`, `sw.js`, `manifest.webmanifest`, `.nojekyll`, and the `css`, `js`, `fonts`, `icons`, `tests` folders) into the upload area. `index.html` must sit at the top level of the repo, not inside another folder.
4. Click **Commit changes**.
5. Go to **Settings → Pages**. Under *Build and deployment* choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
6. Wait a minute or two. The address appears at the top of the Pages screen, e.g. `https://YOUR-USERNAME.github.io/household-ledger/`.

### Install it on your phone
- **iPhone (Safari):** open the address → **Share** → **Add to Home Screen**.
- **Android (Chrome):** open the address → **⋮** menu → **Install app** (or *Add to Home screen*).

It then opens full-screen like a normal app, and works without signal once it has been opened once.

> Use the same browser every time. Safari and Chrome (and the installed app vs a browser tab on some phones) keep **separate** storage.

### Updating the app later
1. Upload the changed files to the repo (same steps, *Add file → Upload files*).
2. In `sw.js`, change `const VERSION = 'ledger-v1.0.0'` to a new value (e.g. `ledger-v1.0.1`) and commit. This tells phones to fetch the new files.
3. Close and reopen the app (sometimes twice). Your data is unaffected by updates.

---

## 2. Using it each week

1. **Plan This Week** (Friday–Sunday it plans the coming week by default; Monday–Thursday the current week. You can switch on the first page).
2. Events → missed meals → presents → Chicken/Beef week → dinner vegetables → occasional restocking → special purchases → review.
3. **Generate My Shopping List.** Tap the box to tick; tap an item to change packs, record the actual price, move it to another shop, or remove it.
4. Changed your mind? **Edit plan** regenerates the list and keeps everything you've ticked, priced or edited.
5. **Finish Shopping** adds ticked items to Household Stock and files the week in History.

### How stock stays honest (no double-counting)
| Event | What happens to stock | Happens |
|---|---|---|
| Generating or regenerating a list | Nothing. The list only *reads* stock. | Any number of times |
| **Finish Shopping** | Ticked purchases are added | Once per week (Reopen reverses it exactly) |
| Planning the **next** week | Last week's planned meals are deducted; fresh items (salad, herbs, opened yoghurt, passata, milk, bananas, chillies, scallions, roast veg) reset to zero | Once per week |

Spare durable items such as crisps, rice, potatoes, frozen veg and spices carry forward, so the following week buys less. Adjust anything by hand in **Stock**.

### Backups
**Ledger → Backup & Restore → Download backup** saves one `.json` file (catalogue, prices, stock, settings, all history). Keep it in Files / iCloud / Google Drive. **Restore** checks the file before replacing anything. The home screen reminds you if you haven't backed up for 30 days.

---

## 3. What's inside

```
index.html              App shell
manifest.webmanifest    PWA manifest (relative paths, so it works in a repo subfolder)
sw.js                   Service worker: offline cache, subfolder-safe
.nojekyll               Tells GitHub Pages to serve files as-is
css/styles.css          Dark Academia design system (colour, type, spacing, components)
js/data.js              Approved catalogue (93 spreadsheet lines + additions), recipes, schedule, references
js/engine.js            Calculation engine: pure functions, unit-tested
js/db.js                IndexedDB storage, versioned schema, safe catalogue upgrades
js/backup.js            Backup format, validation, migrations
js/app.js               Screens, wizard, list, stock, history, catalogue, backup
fonts/                  Cormorant Garamond + Inter (self-hosted, SIL OFL)
icons/                  App icons (incl. maskable + Apple touch icon)
tests/engine.test.mjs   Automated calculation tests
```

### Data model (short version)
- **Product**: one base unit (`g`, `ml`, `each`, `slice`, `bag`, `bar`, `tin`, `clove`…), one or more **packs** `{label, size, price}`, or `byWeight {pricePerKg}`; shop, category, storage, `perishable`, and nutrition per base unit (`label` or `estimate`).
- **Recipe**: ingredient lines in product base units, per serving or per batch (curry: batch of 4 + 75g rice per portion).
- **Plan**: week start, missed meals (`"day-meal": "A" | "B" | "both"`), lunch protein, vegetables, gifts, optional items, specials.
- **Week**: plan + generated **lines** (frozen copies of prices) + removals + requirements snapshot + `purchasesApplied` / `consumptionApplied` flags.
- **Stock**: `{productId: {qty, unit, location, expiry, updated}}`.

### Calculation engine
1. Expand the fixed schedule, removing only the missing person's portions (the curry batch is still made unless all four portions are missed).
2. Combine identical ingredients across every meal (yoghurt, garlic, chicken, onion and so on).
3. Subtract usable stock.
4. Choose packs: the cheapest combination that covers the need, never less. Chicken uses the agreed waste rule: prefer an exact match, but accept up to **100g spare if it saves at least £1**.
5. Price it, keep the breakdown (need / in stock / buy / spare), and group by shop.

### Run the tests
Needs Node 18+:
```bash
npm test
```
Covers: chicken week, beef week, freezer stock, skipped lunches/dinners, curry portions, presents, replenishments, egg and crisp multipacks, repeated ingredients, missing prices, edits surviving regeneration, ticks preserved, frozen history prices, stock without double-counting, and backup validation.

---

## 4. Assumptions you can change (Ledger → Catalogue & Prices)
- Nearby spice bags assumed ≈400g (black pepper, chilli powder, cumin, smoked paprika, ground coriander, garam masala).
- Frank's RedHot ≈148ml, Frank's Wings Sauce ≈354ml, ginger purée tube ≈80g.
- Light gravy ≈5g granules per person; mash ≈5g butter per person; salad garlic 1 clove, cumin ½ tsp, lime ½ per salad.
- Nutrition: branded items from pack labels (Leerdammer Light, Tesco chorizo, Popchips, PROPERCHIPS, Skinny bars, Tesco Finest 0% yoghurt, Princes tuna, Old El Paso salsa, Tesco wheat biscuits, Heinz Big Soup range); everything else uses UK generic values and is labelled as an estimate.

Prices are Nov 2026 estimates. Editing a price affects future lists only; saved weeks keep the prices they were written with.
