// The Household Ledger: seed catalogue, recipes and meal schedule.
// Source: "2026-27 Health App.xlsx" (Nov-26 prices) reconciled with the confirmed
// meal plan and the owner's clarifications (Stage 1 catalogue v2, approved 5 Nov 2026).
//
// Conventions
// - Every product has ONE base unit (g, ml, each, slice, bag, bar, tin, clove, biscuit, bottle, bunch, packet, pack).
// - Recipe quantities are always expressed in the product's base unit.
// - packs[]: retail options. size is in base units, price in GBP for one pack.
// - byWeight: sold loose by weight; price per kg; bought to the gram (rounded up to 10g).
// - nutrition: per ONE base unit. src "label" = taken from the product label; "estimate" = UK generic reference value.
// - perishable: leftovers are NOT carried into next week's stock (cautious food-safety default).
// - assumed: a pack size or usage the owner did not state; editable in Catalogue.

export const CATALOGUE_VERSION = 2;

export const RETAILERS = ['Tesco', 'Nearby', 'Jollyes', 'The Range'];

export const CATEGORIES = {
  meat: 'Meat & Fish', dairy: 'Dairy & Eggs', produce: 'Fruit & Veg', frozen: 'Frozen',
  cereal: 'Cereal', cupboard: 'Cupboard', spices: 'Herbs & Spices', snacks: 'Snacks',
  drinks: 'Drinks', staples: 'Household staples', pets: 'Pet supplies', cleaning: 'Cleaning',
  toiletries: 'Toiletries', beauty: 'Beauty', car: 'Car products', other: 'Other',
  gifts: 'Gifts & cards', special: 'Special purchases',
};

// Which categories appear in the wizard's "Occasional replenishment" step, in order.
export const OPTIONAL_GROUPS = [
  ['staples', 'Household staples'], ['snacks', 'Partner snacks'], ['pets', 'Pet supplies'],
  ['cleaning', 'Cleaning'], ['toiletries', 'Toiletries'], ['beauty', 'Beauty'], ['car', 'Car products'], ['other', 'Other'],
];

const P = (id, o) => ({ id, retailer: 'Tesco', storage: 'Cupboard', role: 'food', ...o });
const pack = (id, label, size, price) => ({ id, label, size, price });
const est = (kcal, protein) => ({ kcal, protein, src: 'estimate' });
const lab = (kcal, protein) => ({ kcal, protein, src: 'label' });
const opt = (id, name, brand, category, label, price, extra = {}) =>
  P(id, { name, brand, category, unit: 'pack', role: 'optional', packs: [pack(id + '-1', label, 1, price)], storage: extra.storage || 'Other', ...extra });

export const PRODUCTS = [
  // ---- Breakfast (Person A) ----
  P('eggs', { name: 'Eggs (medium)', brand: "Tesco's Own", category: 'dairy', unit: 'each', storage: 'Fridge',
    packs: [pack('eggs-15', '15 pack', 15, 2.85), pack('eggs-6', '6 pack', 6, 1.80)], nutrition: est(66, 6.3) }),
  P('chorizo', { name: 'Chorizo slices', brand: "Tesco's Own Spanish", category: 'meat', unit: 'slice', storage: 'Fridge',
    packs: [pack('chorizo-15', '15 slices (150g)', 15, 1.25)], nutrition: lab(38.6, 2.35), note: '≈10g per slice' }),
  P('leerdammer', { name: 'Leerdammer Light slices', brand: 'Leerdammer Light', category: 'dairy', unit: 'slice', storage: 'Fridge',
    packs: [pack('leer-8', '8 slices (160g)', 8, 2.25)], nutrition: lab(52, 5.9) }),
  P('butter', { name: 'Butter', brand: 'Ballyrashane', category: 'dairy', unit: 'g', storage: 'Fridge',
    packs: [pack('butter-500', '500g', 500, 3.90)], nutrition: est(7.4, 0.006) }),
  // ---- Breakfast (Person B) ----
  P('wheatbix', { name: 'Wheat biscuits', brand: "Tesco's Own", category: 'cereal', unit: 'biscuit',
    packs: [pack('wb-48', '48 pack', 48, 3.00)], nutrition: lab(68, 2.3) }),
  P('milk', { name: 'Skimmed milk', brand: "Tesco's Own", category: 'dairy', unit: 'ml', storage: 'Fridge', perishable: true,
    packs: [pack('milk-2l', '2 litres', 2000, 1.75)], nutrition: est(0.35, 0.035) }),
  // ---- Meat & fish ----
  P('chicken', { name: 'Chicken breast', brand: "Tesco's Own", category: 'meat', unit: 'g', storage: 'Freezer',
    packs: [
      pack('ch-350', 'Fillets 350g', 350, 2.67), pack('ch-650', 'Fillets 650g', 650, 4.90),
      pack('ch-1000', 'Fillets 1kg', 1000, 7.00), pack('ch-1600', 'Fillets 1.6kg', 1600, 10.65),
      pack('ch-mini400', 'Mini fillets 400g', 400, 4.00), pack('ch-mini650', 'Mini fillets 650g', 650, 5.40),
      pack('ch-dice400', 'Diced breast 400g', 400, 4.00), pack('ch-dice650', 'Diced breast 650g', 650, 5.40),
    ],
    wasteRule: { maxSurplus: 100, minSaving: 1.0 }, nutrition: est(1.06, 0.24) }),
  P('beef', { name: 'Lean beef mince 5%', brand: "Tesco's Own", category: 'meat', unit: 'g', storage: 'Freezer',
    packs: [pack('beef-500', '500g', 500, 5.05)], nutrition: est(1.25, 0.21) }),
  P('tuna', { name: 'Tuna chunks in spring water', brand: 'Princes', category: 'cupboard', unit: 'tin',
    packs: [pack('tuna-1', 'Single 145g tin', 1, 1.75), pack('tuna-3', '3 × 145g', 3, 3.50)], nutrition: lab(101, 24), note: '102g drained' }),
  // ---- Taco salad ----
  P('tacoseason', { name: 'Taco seasoning', brand: "Tesco's Own", category: 'spices', unit: 'packet',
    packs: [pack('taco-1', '1 packet', 1, 0.85)], nutrition: est(90, 2) }),
  P('lettuce', { name: 'Sliced iceberg lettuce', brand: "Tesco's Own", category: 'produce', unit: 'g', storage: 'Fridge', perishable: true,
    packs: [pack('let-200', '200g bag', 200, 0.64)], nutrition: est(0.14, 0.009) }),
  P('tomatoes', { name: 'Tomatoes on the vine', brand: "Tesco's Own", category: 'produce', unit: 'g', storage: 'Fridge', perishable: true,
    packs: [pack('tom-500', '500g', 500, 1.55)], nutrition: est(0.18, 0.009) }),
  P('onion', { name: 'Onions (loose)', brand: "Tesco's Own", category: 'produce', unit: 'g',
    byWeight: { pricePerKg: 0.95 }, nutrition: est(0.4, 0.011) }),
  P('coriander', { name: 'Fresh coriander', brand: "Tesco's Own", category: 'produce', unit: 'g', storage: 'Fridge', perishable: true,
    packs: [pack('cor-30', '30g', 30, 0.50)], nutrition: est(0.23, 0.02) }),
  P('salsa', { name: 'Hot salsa', brand: "Old El Paso Thick 'n' Chunky", category: 'cupboard', unit: 'g', perishable: true,
    packs: [pack('salsa-226', '226g jar', 226, 2.35)], nutrition: lab(0.35, 0.013), note: 'Opened: fridge, use within a week' }),
  P('jalapenos', { name: 'Pickled jalapeños', brand: "Tesco's Own", category: 'cupboard', unit: 'g', storage: 'Fridge',
    packs: [pack('jal-300', '300g jar (135g drained)', 135, 1.60)], nutrition: est(0.2, 0.01), note: 'Quantities are drained weight' }),
  P('yoghurt', { name: '0% fat Greek yoghurt', brand: "Tesco's Finest", category: 'dairy', unit: 'g', storage: 'Fridge', perishable: true,
    packs: [pack('yog-500', '500g tub', 500, 2.60), pack('yog-1000', '1kg tub', 1000, 4.10)], nutrition: lab(0.65, 0.098) }),
  P('lime', { name: 'Limes', brand: 'Loose', category: 'produce', unit: 'each', storage: 'Fridge',
    packs: [pack('lime-1', 'each', 1, 0.23)], nutrition: est(7, 0.2) }),
  P('cumin', { name: 'Ground cumin', brand: 'Large bag', category: 'spices', unit: 'g', retailer: 'Nearby',
    packs: [pack('cumin-bag', 'Large bag (≈400g)', 400, 1.99)], assumed: 'bag weight', nutrition: est(3.75, 0.18) }),
  P('franks', { name: "Frank's RedHot sauce", brand: "Frank's", category: 'cupboard', unit: 'ml',
    packs: [pack('franks-148', 'Bottle (≈148ml)', 148, 2.50)], assumed: 'bottle size', nutrition: est(0.1, 0) }),
  P('properchips', { name: 'PROPERCHIPS (14g bags)', brand: 'Properchips, various', category: 'snacks', unit: 'bag',
    packs: [pack('pc-5', 'Multipack of 5', 5, 2.25)], nutrition: lab(67, 1.5) }),
  // ---- Partner lunch ----
  P('soup', { name: 'Tinned soup', brand: 'Heinz Big Soup, various', category: 'cupboard', unit: 'tin',
    packs: [pack('soup-1', '400g tin', 1, 2.20)], nutrition: lab(230, 9), note: 'Nutrition varies by flavour' }),
  P('banana', { name: 'Bananas', brand: "Tesco's Own", category: 'produce', unit: 'each', perishable: true,
    packs: [pack('ban-5', 'Bunch of 5', 5, 0.78)], nutrition: est(95, 1.2) }),
  P('orange', { name: 'Oranges', brand: "Tesco's Own", category: 'produce', unit: 'each',
    packs: [pack('or-5', 'Bag of 5', 5, 1.50)], nutrition: est(60, 1.1) }),
  // ---- Dinners ----
  P('potatoes', { name: 'Maris Piper potatoes', brand: "Tesco's Own", category: 'produce', unit: 'g',
    packs: [pack('pot-2k', '2kg bag', 2000, 1.85)], nutrition: est(0.77, 0.02) }),
  P('scallions', { name: 'Scallions (spring onions)', brand: "Tesco's Own", category: 'produce', unit: 'bunch', storage: 'Fridge', perishable: true,
    packs: [pack('scal-1', '1 bunch', 1, 0.65)], nutrition: est(25, 1.5) }),
  P('brocauli', { name: 'Broccoli & cauliflower (frozen)', brand: "Tesco's Own", category: 'frozen', unit: 'g', storage: 'Freezer',
    packs: [pack('bc-900', '900g bag', 900, 1.50)], nutrition: est(0.28, 0.025) }),
  P('rootmix', { name: 'Carrot & parsnip roasting mix', brand: "Tesco's Finest", category: 'produce', unit: 'g', storage: 'Fridge', perishable: true,
    packs: [pack('rm-500', '500g bag', 500, 2.75)], nutrition: est(0.45, 0.01) }),
  P('sprouts', { name: 'Brussels sprouts (frozen)', brand: "Tesco's Own", category: 'frozen', unit: 'g', storage: 'Freezer',
    packs: [pack('sp-1k', '1kg bag', 1000, 1.40)], nutrition: est(0.42, 0.035) }),
  P('oliveoil', { name: 'Extra virgin olive oil', brand: "Tesco's Own", category: 'cupboard', unit: 'ml',
    packs: [pack('oil-1l', '1 litre', 1000, 7.75)], nutrition: est(8.2, 0) }),
  P('gravy', { name: 'Gravy granules', brand: 'Bisto Low Salt', category: 'cupboard', unit: 'g',
    packs: [pack('gravy-450', '450g carton', 450, 4.75)], nutrition: est(3.6, 0.03) }),
  P('wingsauce', { name: "Frank's Wings Sauce", brand: "Frank's", category: 'cupboard', unit: 'ml',
    packs: [pack('wing-354', 'Bottle (≈354ml)', 354, 2.50)], assumed: 'bottle size', nutrition: est(0.3, 0) }),
  P('smokedpaprika', { name: 'Smoked paprika', brand: 'Large bag', category: 'spices', unit: 'g', retailer: 'Nearby',
    packs: [pack('pap-bag', 'Large bag (≈400g)', 400, 1.99)], assumed: 'bag weight', nutrition: est(2.8, 0.14) }),
  P('lemon', { name: 'Lemons', brand: 'Loose', category: 'produce', unit: 'each', storage: 'Fridge',
    packs: [pack('lemon-1', 'each', 1, 0.37)], nutrition: est(17, 0.6) }),
  P('mustard', { name: 'Wholegrain mustard', brand: 'Maille', category: 'cupboard', unit: 'g', storage: 'Fridge',
    packs: [pack('mus-210', '210g jar', 210, 3.25)], nutrition: est(1.6, 0.07) }),
  P('garlic', { name: 'Garlic', brand: "Tesco's Own", category: 'produce', unit: 'clove',
    packs: [pack('gar-bulb', '1 bulb (≈10 cloves)', 10, 0.50)], nutrition: est(4, 0.2) }),
  P('ginger', { name: 'Ginger purée', brand: 'Chop purée tube', category: 'cupboard', unit: 'g', storage: 'Fridge',
    packs: [pack('gin-tube', 'Tube (≈80g)', 80, 1.50)], assumed: 'tube size', nutrition: est(0.8, 0.02) }),
  P('passata', { name: 'Passata', brand: "Tesco's Own", category: 'cupboard', unit: 'g', perishable: true,
    packs: [pack('pass-500', '500g carton', 500, 0.60)], nutrition: est(0.3, 0.013) }),
  P('redchilli', { name: 'Red chillies', brand: "Tesco's Own", category: 'produce', unit: 'each', storage: 'Fridge', perishable: true,
    packs: [pack('chil-3', 'Bag of 3', 3, 0.51)], nutrition: est(4, 0.2) }),
  P('groundcoriander', { name: 'Ground coriander', brand: 'Large bag', category: 'spices', unit: 'g', retailer: 'Nearby',
    packs: [pack('gc-bag', 'Large bag (≈400g)', 400, 1.99)], assumed: 'bag weight', nutrition: est(3, 0.12) }),
  P('garammasala', { name: 'Garam masala', brand: 'Large bag', category: 'spices', unit: 'g', retailer: 'Nearby',
    packs: [pack('gm-bag', 'Large bag (≈400g)', 400, 1.99)], assumed: 'bag weight', nutrition: est(3.8, 0.15) }),
  P('blackpepper', { name: 'Black pepper', brand: 'Large bag', category: 'spices', unit: 'g', retailer: 'Nearby',
    packs: [pack('bp-bag', 'Large bag (≈400g)', 400, 1.99)], assumed: 'bag weight', nutrition: est(2.5, 0.1) }),
  P('chillipowder', { name: 'Chilli powder', brand: 'Large bag', category: 'spices', unit: 'g', retailer: 'Nearby',
    packs: [pack('cp-bag', 'Large bag (≈400g)', 400, 1.99)], assumed: 'bag weight', nutrition: est(2.8, 0.13) }),
  P('rice', { name: 'Basmati rice', brand: "Tesco's Own", category: 'cupboard', unit: 'g',
    packs: [pack('rice-2k', '2kg bag', 2000, 3.60)], nutrition: est(3.5, 0.075) }),
  // ---- Evening snacks (Person A) ----
  P('popchips', { name: 'Popchips (17g bags)', brand: 'Popchips, various', category: 'snacks', unit: 'bag',
    packs: [pack('pop-5', 'Multipack of 5', 5, 2.25)], nutrition: lab(72, 1.0) }),
  P('skinny', { name: 'Skinny Whip / Skinny Crunch bars', brand: 'Skinny, various', category: 'snacks', unit: 'bar',
    packs: [pack('sk-5', 'Multipack of 5', 5, 0.95)], nutrition: lab(74, 0.7) }),
  // ---- Weekly default ----
  P('sparkling', { name: 'Sparkling water', brand: "Tesco's Own", category: 'drinks', unit: 'bottle',
    packs: [pack('sw-6', '6 pack', 6, 2.50)] }),

  // ---- Optional / occasional (all unchecked by default) ----
  P('turmeric', { name: 'Turmeric', brand: 'Large bag', category: 'staples', unit: 'pack', role: 'optional', retailer: 'Nearby',
    packs: [pack('tur-bag', 'Large bag', 1, 1.99)], note: 'Sometimes used in omelettes' }),
  opt('coffee', 'Coffee', 'Nescafé Gold Strength 7', 'staples', '1 jar', 7.80),
  opt('snackajacks-sv', 'Rice cakes: salt & vinegar', 'Snack a Jacks', 'snacks', '1 pack', 2.50),
  opt('snackajacks-scc', 'Rice cakes: sour cream & chive', 'Snack a Jacks', 'snacks', '1 pack', 2.50),
  opt('gherkins', 'Gherkins', "Tesco's Own", 'snacks', '1 jar', 1.40, { storage: 'Cupboard' }),
  opt('catfood', 'Cat food', 'Felix', 'pets', '40 pouch pack', 15.00),
  opt('catlitter', 'Cat litter', 'Ultra Anti-bac', 'pets', '10L bag', 12.00, { retailer: 'Jollyes' }),
  opt('dreamies', 'Cat treats', 'Dreamies', 'pets', '200g pack', 3.40),
  opt('fairy', 'Washing-up liquid', 'Fairy Lemon', 'cleaning', '654ml bottle', 2.00, { storage: 'Cleaning cupboard' }),
  opt('kitchenroll', 'Kitchen roll', "Tesco's Own", 'cleaning', '2 roll pack', 2.45, { storage: 'Cleaning cupboard' }),
  opt('sponges', 'Sponges', 'Spontex', 'cleaning', '4 pack', 1.45, { storage: 'Cleaning cupboard' }),
  opt('washtabs', 'Washing tablets', 'Surf', 'cleaning', '26 washes', 6.50, { storage: 'Cleaning cupboard' }),
  opt('wipes', 'Anti-bac wipes', 'Tesco', 'cleaning', '120 wipes', 2.15, { storage: 'Cleaning cupboard' }),
  opt('bathspray', 'Bathroom spray', 'Flash', 'cleaning', '800ml bottle', 2.50, { storage: 'Cleaning cupboard' }),
  opt('toiletcleaner', 'Toilet cleaner', 'Harpic 10x Power Plus', 'cleaning', '1 bottle', 1.80, { storage: 'Cleaning cupboard' }),
  opt('soda', 'Soda crystals', 'Tesco', 'cleaning', '1kg bag', 2.00, { storage: 'Cleaning cupboard' }),
  opt('microfibre', 'Microfibre cloths', 'Any brand', 'cleaning', '1 pack', 1.50, { storage: 'Cleaning cupboard' }),
  opt('windowclean', 'Window cleaner', "Tesco's Own", 'cleaning', '750ml bottle', 0.79, { storage: 'Cleaning cupboard' }),
  opt('febreze', 'Fabric refresher', 'Febreze', 'cleaning', '1 bottle', 3.10, { storage: 'Cleaning cupboard' }),
  opt('toiletroll', 'Toilet roll', 'Little Duck', 'cleaning', '16 rolls', 5.85, { storage: 'Bathroom' }),
  opt('bleach', 'Thick bleach', 'Tesco', 'cleaning', '1 bottle', 0.80, { storage: 'Cleaning cupboard' }),
  opt('blackbags', 'Black bags 50L', 'Tesco', 'cleaning', '20 tie-top', 2.75, { storage: 'Cleaning cupboard' }),
  opt('clearbags', 'Clear bags 50L', 'Tesco', 'cleaning', '30 drawstring', 2.25, { storage: 'Cleaning cupboard' }),
  opt('toiletbags', 'Toilet bin bags 20L', 'Tesco', 'cleaning', '30 tie-top', 2.50, { storage: 'Cleaning cupboard' }),
  opt('greenbags', 'Green bags 20L', 'Tesco', 'cleaning', '20 pack', 1.80, { storage: 'Cleaning cupboard' }),
  opt('vinegarspray', 'Vinegar spray', 'Stardrops', 'cleaning', '850ml bottle', 1.19, { retailer: 'The Range', storage: 'Cleaning cupboard' }),
  opt('hooverbags', 'Hoover bags', 'Henry', 'cleaning', '5 pack', 6.99, { retailer: 'The Range', storage: 'Cleaning cupboard' }),
  opt('soap', 'Hand soap', 'Tesco Magnolia', 'toiletries', '500ml bottle', 0.47, { storage: 'Bathroom' }),
  opt('showergel', 'Shower gel', 'Sanex Zero', 'toiletries', '450ml bottle', 3.75, { storage: 'Bathroom' }),
  opt('shampoo', 'Shampoo', 'Herbal Essences XL', 'toiletries', '650ml bottle', 4.00, { storage: 'Bathroom' }),
  opt('conditioner', 'Conditioner', 'Herbal Essences Coconut', 'toiletries', '275ml bottle', 1.95, { storage: 'Bathroom' }),
  opt('toothpaste', 'Toothpaste', 'Colgate Triple Action Xtra', 'toiletries', '1 tube', 1.50, { storage: 'Bathroom' }),
  opt('floss', 'Dental floss', 'Oral-B 50m', 'toiletries', '1 pack', 2.50, { storage: 'Bathroom' }),
  opt('razors', 'Razors', 'Gillette Blue II', 'toiletries', '8 razors', 3.60, { storage: 'Bathroom' }),
  opt('shavefoam', 'Shaving foam', 'Gillette', 'toiletries', '1 can', 1.90, { storage: 'Bathroom' }),
  opt('deodorant', 'Deodorant', 'Nivea Men', 'toiletries', '1 can', 3.00, { storage: 'Bathroom' }),
  opt('bodyscrubber', 'Body scrubber', "Tesco's Own", 'toiletries', '1', 2.00, { storage: 'Bathroom' }),
  opt('breathestrips', 'Nasal strips', 'Breathe Right', 'toiletries', '10 strips', 5.15, { storage: 'Bathroom' }),
  opt('bodymoist', 'Body moisturiser', 'Childs Farm', 'beauty', '200ml bottle', 6.00, { storage: 'Bathroom' }),
  opt('facemoist', 'Facial moisturiser SPF15', "L'Oréal Men", 'beauty', '1 tub', 10.50, { storage: 'Bathroom' }),
  opt('curlcream', 'Curl cream', 'Aussie Work That Curl', 'beauty', '1 tube', 6.00, { storage: 'Bathroom' }),
  opt('hairspray', 'Hairspray', 'Wella Silvikrin 4', 'beauty', '400ml', 5.15, { storage: 'Bathroom' }),
  opt('hairwax', 'Hair wax', 'VO5 Styling Wax', 'beauty', '75ml tub', 5.00, { storage: 'Bathroom' }),
  opt('facewash', 'Face wash', 'Nivea Sensitive', 'beauty', '1 tube', 5.40, { storage: 'Bathroom' }),
  opt('screenwash', 'Screen wash', 'Tesco', 'car', '5 litres', 5.00),
  opt('caroil', 'Engine oil 5W30', 'Redex', 'car', '2 litres', 28.00),
];

// ---------------------------------------------------------------------------
// Recipes. `per` = 'serving' (scaled by servings) or 'batch' (fixed batch).
// times in minutes. Instructions are deliberately short.
// ---------------------------------------------------------------------------
export const VEG_OPTIONS = [
  { id: 'brocauli', label: 'Broccoli & cauliflower', note: 'Frozen 900g bag' },
  { id: 'rootmix', label: 'Carrots & parsnips', note: 'Finest roasting mix 500g' },
  { id: 'sprouts', label: 'Brussels sprouts', note: 'Frozen 1kg bag' },
];

const SALAD_BASE = [
  ['lettuce', 150], ['tomatoes', 90], ['onion', 30], ['coriander', 6], ['salsa', 45], ['yoghurt', 75],
  ['jalapenos', 25], ['franks', 5], ['lime', 0.5], ['garlic', 1], ['cumin', 1.25], ['blackpepper', 0.5], ['properchips', 1],
];

export const RECIPES = {
  omelette: {
    name: 'Chorizo & Leerdammer Light omelette', short: 'Chorizo omelette', who: 'A', per: 'serving', servings: 1,
    prep: 5, cook: 6,
    ingredients: [['eggs', 3], ['butter', 5], ['chorizo', 2], ['leerdammer', 1], ['blackpepper', 0.5], ['chillipowder', 0.5], ['franks', 5]],
    display: { eggs: '3 medium eggs', butter: '5g butter', chorizo: '2 slices chorizo (≈20g)', leerdammer: '1 slice Leerdammer Light', blackpepper: 'Black pepper', chillipowder: 'Pinch of chilli powder', franks: "Dash of Frank's hot sauce" },
    method: [
      'Beat the eggs with black pepper and a pinch of chilli powder.',
      'Melt the butter in a small non-stick pan over medium heat; warm the chorizo for 30 seconds.',
      'Pour in the eggs, draw the edges in as they set.',
      "When almost set, lay the Leerdammer on one half, fold, and finish with Frank's.",
    ],
    storage: 'Eat fresh. Keep opened chorizo and cheese wrapped in the fridge and use by the pack date.',
  },
  partnerBreakfast: {
    name: 'Wheat biscuits & milk', short: 'Wheat biscuits', who: 'B', per: 'serving', servings: 1, prep: 2, cook: 0, template: true,
    ingredients: [['wheatbix', 2], ['milk', 200]],
    display: { wheatbix: '2 wheat biscuits', milk: '≈200ml skimmed milk' },
    method: ['Two biscuits in a bowl, about 200ml milk.'],
    storage: 'Keep the box sealed in a dry cupboard.',
  },
  tacoChicken: {
    name: 'Chicken taco salad', short: 'Chicken taco salad', who: 'A', per: 'serving', servings: 1, prep: 10, cook: 20,
    ingredients: [['chicken', 150], ['tacoseason', 1 / 3], ...SALAD_BASE],
    batchNote: 'Monday: cook 450g chicken with one packet of taco seasoning for three lunches.',
  },
  tacoBeef: {
    name: 'Beef taco salad', short: 'Beef taco salad', who: 'A', per: 'serving', servings: 1, prep: 10, cook: 15,
    ingredients: [['beef', 150], ['tacoseason', 1 / 3], ...SALAD_BASE],
    batchNote: 'Monday: brown 450g 5% mince with one packet of taco seasoning for three lunches.',
  },
  tacoTuna: {
    name: 'Tuna taco salad', short: 'Tuna taco salad', who: 'A', per: 'serving', servings: 1, prep: 10, cook: 0,
    ingredients: [['tuna', 1], ...SALAD_BASE],
  },
  partnerLunch: {
    name: 'Soup, banana & orange', short: 'Soup & fruit', who: 'B', per: 'serving', servings: 1, prep: 2, cook: 5, template: true,
    ingredients: [['soup', 1], ['banana', 1], ['orange', 1]],
    display: { soup: '1 tin Heinz Big Soup', banana: '1 banana', orange: '1 orange' },
    method: ['Heat the soup gently on the hob or in the microwave until piping hot. Fruit on the side.'],
    storage: 'Unused soup: covered non-metal container in the fridge, eat within 2 days.',
  },
  paprika: {
    name: 'Smoky paprika chicken with scallion mash', short: 'Paprika chicken & mash', who: 'both', per: 'serving', servings: 2, prep: 10, cook: 30, veg: true,
    ingredients: [['chicken', 150], ['potatoes', 225], ['oliveoil', 5], ['smokedpaprika', 2.5], ['butter', 5], ['scallions', 0.5], ['gravy', 5], ['blackpepper', 0.5]],
    display: { scallions: 'Scallions (½ bunch per person)', gravy: '5g Bisto Low Salt granules (light gravy)' },
    method: [
      'Rub the chicken with oil, smoked paprika and pepper. Roast at 200°C (180°C fan) for 22–25 minutes until the juices run clear (75°C in the thickest part).',
      'Boil the potatoes 15–20 minutes, drain, mash with the butter and sliced scallions.',
      'Cook the vegetables. Make a light gravy with the granules and boiling water.',
    ],
    storage: 'Leftovers: cool within an hour, fridge, eat within 2 days. Reheat until piping hot.',
  },
  buffalo: {
    name: 'Buffalo chicken with seasoned wedges', short: 'Buffalo chicken & wedges', who: 'both', per: 'serving', servings: 2, prep: 10, cook: 35, veg: true,
    ingredients: [['chicken', 150], ['potatoes', 225], ['oliveoil', 5], ['smokedpaprika', 1.25], ['garlic', 0.5], ['blackpepper', 0.5], ['wingsauce', 15], ['yoghurt', 30]],
    display: { wingsauce: "15ml Frank's Wings Sauce", yoghurt: '30g 0% Greek yoghurt (sauce)' },
    method: [
      'Cut potatoes into wedges, toss with the oil, smoked paprika, crushed garlic and pepper. Roast at 220°C (200°C fan) for 30–35 minutes, turning once.',
      'Roast or pan-fry the chicken until cooked through (75°C), then toss in the wings sauce.',
      'Season the yoghurt with a little garlic or pepper for the cooling sauce. Serve with the vegetables.',
    ],
    storage: 'Leftovers: cool within an hour, fridge, eat within 2 days.',
  },
  lemon: {
    name: 'Lemon & garlic chicken with roast potatoes', short: 'Lemon garlic chicken', who: 'both', per: 'serving', servings: 2, prep: 10, cook: 40, veg: true,
    ingredients: [['chicken', 150], ['potatoes', 225], ['oliveoil', 5], ['lemon', 0.5], ['garlic', 2], ['blackpepper', 0.5], ['yoghurt', 30], ['mustard', 5]],
    display: { mustard: '1 tsp (5g) Maille wholegrain mustard', yoghurt: '30g 0% Greek yoghurt' },
    method: [
      'Par-boil the potato chunks for 8 minutes, drain, rough up, toss in half the oil. Roast at 220°C (200°C fan) for 35–40 minutes.',
      'Marinate the chicken in lemon zest and juice, crushed garlic, pepper and the remaining oil. Roast for 20–25 minutes until cooked through (75°C).',
      'Stir the mustard into the yoghurt with a squeeze of lemon. Serve with the vegetables.',
    ],
    storage: 'Leftovers: cool within an hour, fridge, eat within 2 days.',
  },
  curry: {
    name: 'Homemade Indian chicken curry', short: 'Chicken curry & rice', who: 'both', per: 'batch', servings: 4, prep: 15, cook: 40,
    ingredients: [['chicken', 650], ['butter', 15], ['onion', 200], ['garlic', 6], ['ginger', 10], ['passata', 500], ['groundcoriander', 28], ['garammasala', 21], ['blackpepper', 1], ['redchilli', 1], ['yoghurt', 100]],
    perPortion: [['rice', 75]],
    display: { ginger: '2 tsp ginger purée', groundcoriander: '4 tbsp ground coriander', garammasala: '3 tbsp garam masala', passata: '500g passata', redchilli: '1 red chilli', rice: '75g dry basmati per portion' },
    method: [
      'Melt the butter, soften the chopped onion for 8–10 minutes. Add garlic, ginger and chilli for 1 minute.',
      'Stir in the coriander, garam masala and pepper for 1 minute, then the passata and a splash of water.',
      'Add the diced chicken, simmer 20–25 minutes until cooked through (75°C). Off the heat, stir in the yoghurt.',
      'Cook 150g rice fresh each evening (75g per person). Minimal added salt.',
    ],
    storage: "Cool Friday's half within 1–2 hours, refrigerate, eat within 2 days, reheat once until piping hot. Cook rice fresh; don't keep cooked rice.",
  },
  snacks: {
    name: 'Evening snacks', short: 'Evening snacks', who: 'A', per: 'serving', servings: 1, prep: 0, cook: 0, hidden: true,
    ingredients: [['popchips', 1], ['properchips', 0], ['skinny', 2]],
  },
};
// Evening snacks: 1 Popchips + 1 Properchips + 2 Skinny bars. (Properchips listed separately to keep salad crunch distinct in breakdowns.)
RECIPES.snacks.ingredients = [['popchips', 1], ['properchips', 1], ['skinny', 2]];

// Salad display/method shared by the three taco salads.
for (const k of ['tacoChicken', 'tacoBeef', 'tacoTuna']) {
  Object.assign(RECIPES[k], {
    display: {
      chicken: '150g raw chicken breast', beef: '150g raw 5% beef mince', tuna: '1 tin tuna in spring water (≈102g drained)',
      tacoseason: '⅓ packet taco seasoning (whole packet for the Monday batch)',
      lettuce: '150g iceberg lettuce', tomatoes: '90g tomato', onion: '30g onion', coriander: 'Small handful fresh coriander (≈6g)',
      salsa: '45g hot salsa', yoghurt: '75g 0% Greek yoghurt', jalapenos: '25g pickled jalapeños (drained)', franks: "Frank's hot sauce",
      lime: '½ lime, juiced', garlic: '1 small garlic clove', cumin: '½ tsp ground cumin', blackpepper: 'Black pepper', properchips: '1 × 14g bag PROPERCHIPS, crushed over',
    },
    method: k === 'tacoTuna'
      ? ['Open the tin on the day; drain well.', 'Mix the yoghurt with lime juice, garlic, cumin, pepper and Frank\'s.', 'Build: lettuce, tomato, onion, tuna, salsa, jalapeños, coriander, dressing. Crunch the Properchips over at the table.']
      : ['Monday: cook the three portions with the taco seasoning until cooked through (75°C for chicken; no pink for mince).', 'Mix the yoghurt with lime juice, garlic, cumin, pepper and Frank\'s.', 'Build: lettuce, tomato, onion, protein, salsa, jalapeños, coriander, dressing. Crunch the Properchips over at the table.'],
    storage: k === 'tacoTuna'
      ? 'Open tuna on the day. Leftover tuna: covered container in the fridge, within 2 days. Keep lettuce, dressing and crisps separate until eating.'
      : 'Mon fresh · Tue: refrigerate within 1–2 hours of cooking · Wed: freeze once cooled, thaw overnight in the fridge, reheat until piping hot. Keep lettuce, dressing and crisps separate.',
  });
}

// ---------------------------------------------------------------------------
// Weekly schedule. Days 0=Mon … 6=Sun.
// ---------------------------------------------------------------------------
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const PEOPLE = { A: 'Me', B: 'Partner' };

// Fixed weekly quantities not tied to meals.
export const WEEKLY_FIXED = [
  { productId: 'milk', qty: 600, label: "Partner's coffee" },
  { productId: 'sparkling', qty: 6, label: 'Weekly sparkling water' },
];

export const DEFAULT_SETTINGS = {
  vegPerPerson: 200,          // g per person per dinner (range 150–200)
  calorieTarget: 1900,
  proteinRange: [100, 120],
  defaultVeg: ['brocauli', 'rootmix', 'sprouts'],
  lunchProtein: 'chicken',
};

export const REFERENCES = [
  { title: 'Daily calorie target', value: '≈1,900 kcal', note: 'Subject to periodic review.' },
  { title: 'Potato portions', value: '225g raw', note: 'Per person.' },
  { title: 'Rice portions', value: '75g dry', note: 'Per person.' },
  { title: 'Dinner vegetables', value: '150–200g', note: 'Per person.' },
  { title: 'Chicken portions', value: '150g raw', note: 'Per person, for standard chicken dinners and salads.' },
  { title: 'Weekly principle', value: 'Consistency matters more than perfection.', quote: true },
];

export const PREP_GUIDE = [
  'Cook all three chicken or beef salad portions on Monday.',
  "Eat Monday's portion fresh.",
  "Refrigerate Tuesday's portion promptly: cool and chill within 1–2 hours.",
  "Freeze Wednesday's portion promptly once cooled.",
  "Thaw Wednesday's portion overnight in the fridge, never on the worktop, and reheat until piping hot.",
  'Store lettuce, dressing and crisps separately so nothing goes soggy.',
  'Open tuna on the day you eat it.',
];
