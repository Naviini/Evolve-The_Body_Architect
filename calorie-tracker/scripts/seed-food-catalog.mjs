/**
 * Food Catalog Seeder
 *
 * Fetches ~5 000 food items from the USDA FoodData Central API
 * (heavily weighted toward South Asian / Sri Lankan / Indian cuisine)
 * and upserts them into your Supabase `food_items` table.
 *
 * ─── ONE-TIME SETUP ────────────────────────────────────────────
 * 1. Get a free USDA API key:  https://fdc.nal.usda.gov/api-key-signup.html
 * 2. Get your Supabase service-role key:
 *    Dashboard → Settings → API → "service_role" (starts with eyJ…)
 * 3. Run:
 *      USDA_API_KEY=<key> \
 *      SUPABASE_URL=https://<ref>.supabase.co \
 *      SUPABASE_SERVICE_ROLE_KEY=<key> \
 *      node scripts/seed-food-catalog.mjs
 *
 *    Or create a `.env.seed` file and use:
 *      node --env-file=.env.seed scripts/seed-food-catalog.mjs
 *
 * 4. Add a public SELECT policy in Supabase SQL editor:
 *      CREATE POLICY "Public read food items"
 *        ON food_items FOR SELECT USING (true);
 * ───────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';

// ── Config ──────────────────────────────────────────────────────
const USDA_API_KEY  = process.env.USDA_API_KEY  || 'DEMO_KEY';
const SUPABASE_URL  = process.env.SUPABASE_URL  || process.env.EXPO_PUBLIC_SUPABASE_URL  || '';
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── USDA nutrient IDs ────────────────────────────────────────────
const NID = {
  calories : 1008,
  protein  : 1003,
  carbs    : 1005,
  fat      : 1004,
  fiber    : 1079,
};

// ── South-Asian-focused search terms ────────────────────────────
// 60 terms × up to 200 results = up to 12 000 raw hits.
// After deduplication by fdcId we target ~5 000 unique items.
const SEARCH_TERMS = [
  // Rice & staple grains
  'basmati rice', 'jasmine rice', 'white rice', 'brown rice', 'parboiled rice',
  'red rice', 'sona masoori', 'idiyappam', 'rice flour', 'semolina',
  // Breads / rotis
  'chapati', 'roti', 'naan', 'paratha', 'puri', 'bhatura',
  'appam', 'hoppers', 'string hoppers', 'pittu', 'pol roti',
  // Lentils / legumes / pulses
  'toor dal', 'moong dal', 'chana dal', 'urad dal', 'masoor dal',
  'red lentil', 'green lentil', 'chickpea', 'rajma kidney bean',
  'black gram', 'green gram', 'pigeon pea', 'soybean',
  // South-Asian dishes
  'biryani', 'pulao', 'khichdi', 'sambar', 'rasam', 'avial',
  'idli', 'dosa', 'uttapam', 'vada', 'upma', 'poha', 'dhokla',
  'kottu', 'kiri bath', 'pol sambola', 'mallung',
  // Curries / proteins
  'chicken curry', 'fish curry', 'mutton curry', 'lamb curry',
  'prawn curry', 'egg curry', 'crab curry', 'sardine curry',
  'paneer', 'tofu',
  // Vegetables
  'aloo potato', 'palak spinach', 'bhindi okra', 'baingan eggplant',
  'gobi cauliflower', 'matar peas', 'jackfruit', 'bitter gourd',
  'drumstick moringa', 'taro', 'yam', 'raw banana',
  'bottle gourd', 'ridge gourd', 'ash gourd',
  // Fats / dairy / condiments
  'ghee clarified butter', 'coconut milk', 'coconut oil',
  'yogurt curd', 'lassi', 'raita', 'paneer cheese',
  // Fruits (South-Asian common)
  'mango', 'papaya', 'guava', 'tamarind', 'banana',
  'jackfruit', 'pineapple', 'coconut', 'lime',
  // Snacks & sweets
  'samosa', 'pakora', 'halwa', 'kheer', 'ladoo', 'barfi', 'jalebi',
  // Flours / dry goods
  'wheat flour', 'chickpea flour besan', 'rice flour', 'semolina rava',
  'jaggery', 'coconut sugar',
  // Spices (for completeness — common cooking ingredients)
  'turmeric', 'cumin', 'coriander', 'cardamom', 'fenugreek',
  // General high-volume terms to fill quota
  'lentil soup', 'vegetable curry', 'fish rice', 'egg rice',
  'chicken rice', 'lamb rice', 'beef curry', 'pork curry',
];

// ── Helpers ──────────────────────────────────────────────────────
function getNutrient(nutrients = [], id) {
  return nutrients.find(n => n.nutrientId === id)?.value ?? 0;
}

function round1(v) { return Math.round(v * 10) / 10; }

/**
 * Convert a USDA fdcId integer into a valid UUID so Supabase's uuid column
 * accepts it. The format is deterministic — same fdcId always yields the
 * same UUID, so re-running the seeder is safe (upsert deduplicates).
 * Example: 2089564  →  "00000000-0000-0000-0000-000002089564"
 */
function fdcToUuid(fdcId) {
  return `00000000-0000-0000-0000-${String(fdcId).padStart(12, '0')}`;
}

function transformFood(food) {
  const n = food.foodNutrients ?? [];
  const calories = Math.round(getNutrient(n, NID.calories));
  if (calories === 0) return null;        // skip zero-calorie phantom entries

  // Normalise serving info
  let servingSize = food.servingSize ?? 100;
  let servingUnit = (food.servingSizeUnit ?? 'g').toLowerCase();
  if (!servingSize || servingSize <= 0) { servingSize = 100; servingUnit = 'g'; }

  // Clean name: remove all-caps → title-case
  const raw = (food.description ?? '').trim();
  const name = raw.length > 0
    ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
    : 'Unknown Food';

  return {
    id          : fdcToUuid(food.fdcId),
    name,
    brand       : food.brandName || food.brandOwner || null,
    serving_size: servingSize,
    serving_unit: servingUnit,
    calories,
    protein_g   : round1(getNutrient(n, NID.protein)),
    carbs_g     : round1(getNutrient(n, NID.carbs)),
    fat_g       : round1(getNutrient(n, NID.fat)),
    fiber_g     : round1(getNutrient(n, NID.fiber)),
    is_verified : true,
  };
}

async function fetchPage(query, pageNumber) {
  const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
  url.searchParams.set('query',      query);
  url.searchParams.set('api_key',    USDA_API_KEY);
  url.searchParams.set('pageSize',   '200');
  url.searchParams.set('pageNumber', String(pageNumber));

  const res = await fetch(url.toString());
  if (res.status === 429) {
    console.warn('  ⏳  Rate-limited — waiting 10 s …');
    await sleep(10_000);
    return fetchPage(query, pageNumber);
  }
  if (!res.ok) throw new Error(`USDA API ${res.status}: ${await res.text()}`);
  return res.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function upsertBatch(batch) {
  if (batch.length === 0) return;
  const { error } = await supabase
    .from('food_items')
    .upsert(batch, { onConflict: 'id', ignoreDuplicates: true });
  if (error) console.error('  Supabase upsert error:', error.message);
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('🌱  Food Catalog Seeder');
  console.log(`    Supabase: ${SUPABASE_URL}`);
  console.log(`    USDA key: ${USDA_API_KEY === 'DEMO_KEY' ? '⚠️  DEMO_KEY (limited)' : '✅  custom key'}`);
  console.log(`    Terms   : ${SEARCH_TERMS.length}`);
  console.log('');

  const seen      = new Set();
  let totalSaved  = 0;
  let termIdx     = 0;

  for (const term of SEARCH_TERMS) {
    termIdx++;
    process.stdout.write(`[${String(termIdx).padStart(2)}/${SEARCH_TERMS.length}] "${term}" … `);

    let termCount = 0;
    try {
      // Fetch first page (200 results) — enough per term
      const data  = await fetchPage(term, 1);
      const foods = data.foods ?? [];

      const batch = [];
      for (const food of foods) {
        if (seen.has(food.fdcId)) continue;
        seen.add(food.fdcId);

        const item = transformFood(food);
        if (item) batch.push(item);
      }

      await upsertBatch(batch);
      totalSaved += batch.length;
      termCount   = batch.length;
    } catch (err) {
      console.error(`\n  ⚠️  Failed: ${err.message}`);
    }

    console.log(`${termCount} new  (total ${totalSaved})`);

    // Be polite: ~2 requests/sec
    await sleep(500);

    // If we've exceeded our target, stop early
    if (totalSaved >= 5500) {
      console.log('\n🎯  Target of 5 500 items reached — stopping early.');
      break;
    }
  }

  console.log('');
  console.log(`✅  Done!  ${totalSaved} unique items saved to Supabase.`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Verify in Supabase Table Editor → food_items');
  console.log('  2. Add SELECT policy (if not already):');
  console.log('     CREATE POLICY "Public read food items" ON food_items FOR SELECT USING (true);');
  console.log('  3. Launch the app — it will sync to local SQLite on first open.');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
