/**
 * Sri Lankan Food Catalog Seeder
 *
 * Inserts ~150 authentic Sri Lankan foods that USDA FoodData Central
 * doesn't cover. Nutritional values are per 100 g (or stated portion)
 * and sourced from Sri Lanka Medical Nutrition Society guidelines,
 * MRC Cambridge food tables, and standard South-Asian nutrition references.
 *
 * IDs use the format  00000001-0000-0000-0000-<12-digit number>
 * (vs USDA which uses 00000000-0000-0000-0000-<fdcId>)
 * so there is zero collision with the USDA batch.
 *
 * Usage (run after seed-food-catalog.mjs):
 *   node --env-file=.env scripts/seed-srilankan-foods.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.SUPABASE_URL  || process.env.EXPO_PUBLIC_SUPABASE_URL  || '';
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// Deterministic UUID for Sri Lankan foods (prefix 00000001)
function slUuid(n) {
  return `00000001-0000-0000-0000-${String(n).padStart(12, '0')}`;
}

// Each entry: [name, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, brand?]
// All values are for the stated serving size.
const SL_FOODS = [

  // ── Rice & Staple Dishes ─────────────────────────────────────
  ['Kiri Bath (Milk Rice)',             200, 'g',  310, 5.5, 56, 7.0, 0.5],
  ['Red Raw Rice (cooked)',             200, 'g',  260, 5.4, 54, 1.0, 1.2],
  ['Samba Rice (cooked)',               200, 'g',  250, 5.0, 52, 0.8, 1.0],
  ['Kekulu Rice (white, cooked)',       200, 'g',  248, 4.8, 52, 0.6, 0.6],
  ['Yellow Rice / Kaha Bath',           200, 'g',  295, 5.2, 53, 7.0, 0.6],
  ['Ghee Rice',                         200, 'g',  365, 5.0, 53,14.0, 0.5],
  ['Pittu (plain)',                     150, 'g',  225, 4.5, 48, 1.5, 1.5],
  ['Pittu with Coconut',                150, 'g',  290, 4.5, 45, 9.5, 2.0],
  ['String Hoppers / Idiyappam',         60, 'g',  120, 2.0, 26, 0.4, 0.8],
  ['Hoppers / Appam (plain)',            60, 'g',  118, 2.5, 22, 2.5, 0.5],
  ['Egg Hoppers',                        90, 'g',  190, 8.5, 22, 8.0, 0.5],
  ['Pol Roti (Coconut Flatbread)',       80, 'g',  225, 4.0, 29,10.5, 2.5],
  ['Godamba Roti',                      100, 'g',  285, 5.0, 42,10.5, 1.0],
  ['Thosai (Dosa)',                      80, 'g',  133, 3.0, 24, 3.0, 0.8],

  // ── Kottu Roti ───────────────────────────────────────────────
  ['Kottu Roti (Plain)',                300, 'g',  490,12.0, 66,18.5, 3.0],
  ['Chicken Kottu Roti',               350, 'g',  585,28.5, 62,24.0, 3.0],
  ['Egg Kottu Roti',                   350, 'g',  550,22.0, 62,22.0, 2.8],
  ['Cheese Kottu Roti',                350, 'g',  625,24.0, 60,30.0, 2.5],
  ['Mutton Kottu Roti',                350, 'g',  610,26.0, 62,26.0, 3.0],
  ['Mixed Kottu Roti',                 400, 'g',  640,30.0, 64,26.0, 3.2],

  // ── Curries (per 150 g serving) ──────────────────────────────
  ['Parippu / Dhal Curry',             150, 'g',  185,10.5, 26, 4.5, 5.0],
  ['Tempered Dhal',                    150, 'g',  200,10.0, 27, 5.5, 4.5],
  ['Chicken Curry (Sri Lankan)',       150, 'g',  215,22.0,  5,12.0, 0.8],
  ['Fish Curry (Sri Lankan)',          150, 'g',  180,20.0,  4, 9.0, 0.5],
  ['Beef Curry (Sri Lankan)',          150, 'g',  250,25.0,  5,14.5, 0.6],
  ['Pork Curry (Sri Lankan)',          150, 'g',  270,23.0,  4,17.5, 0.5],
  ['Mutton Curry (Sri Lankan)',        150, 'g',  255,24.0,  5,15.5, 0.5],
  ['Egg Curry (Sri Lankan)',           150, 'g',  195,13.0,  5,13.5, 0.5],
  ['Prawn Curry (Sri Lankan)',         150, 'g',  165,18.0,  6, 8.0, 0.8],
  ['Crab Curry',                       200, 'g',  130,15.0,  5, 5.5, 0.5],
  ['Cuttlefish / Squid Curry',         150, 'g',  145,16.0,  8, 5.5, 0.5],
  ['Ambul Thiyal (Sour Fish Curry)',   100, 'g',  145,19.0,  3, 7.0, 0.8],
  ['Dried Fish Curry (Karavala)',      100, 'g',  195,26.0,  3, 9.0, 0.5],
  ['Sprats Curry (Halmasso)',          100, 'g',  165,20.0,  2, 9.0, 0.5],
  ['Mussel Curry',                     150, 'g',  130,14.0,  8, 5.0, 0.8],
  ['Jackfruit Curry / Polos',          150, 'g',  145, 3.0, 22, 5.0, 3.5],
  ['Ripe Jackfruit Curry / Kos',       150, 'g',  175, 3.0, 30, 5.0, 2.5],
  ['Young Jak Seed Curry',             150, 'g',  155, 3.5, 28, 3.5, 2.0],
  ['Ash Plantain Curry (Alu Kesel)',   150, 'g',  155, 2.0, 28, 4.0, 2.5],
  ['Brinjal Curry (Wambatu)',          150, 'g',  120, 2.0, 10, 8.0, 2.5],
  ['Wambatu Moju (Sweet-Sour Brinjal)',100, 'g',  135, 1.5, 14, 8.0, 2.0],
  ['Bitter Gourd Curry (Karawila)',    150, 'g',   90, 2.0,  8, 5.0, 2.5],
  ['Pumpkin Curry (Wattakka)',         150, 'g',   90, 2.0, 15, 2.5, 2.0],
  ['Drumstick Curry (Murunga)',        150, 'g',   85, 3.0, 10, 3.5, 2.5],
  ['Green Bean Curry (Bonchi)',        150, 'g',   85, 2.0,  9, 4.0, 2.5],
  ['Potato Curry (Ala)',               150, 'g',  160, 3.0, 24, 5.5, 2.0],
  ['Sweet Potato Curry',               150, 'g',  165, 2.0, 29, 5.0, 2.5],
  ['Cashew Curry (Kadju)',             150, 'g',  325, 9.0, 22,22.0, 2.5],
  ['Leeks Curry',                      150, 'g',   95, 2.0, 12, 4.0, 2.0],
  ['Manioc / Cassava Curry',           150, 'g',  175, 2.0, 35, 2.5, 2.0],
  ['Yam Curry (Innala)',               150, 'g',  195, 3.0, 36, 4.0, 3.0],
  ['Spinach Curry (Nivithi)',          150, 'g',   75, 3.5,  8, 3.0, 2.5],
  ['Lotus Root Curry',                 150, 'g',  130, 3.5, 22, 3.5, 2.5],

  // ── Sambols & Chutneys ───────────────────────────────────────
  ['Pol Sambol (Coconut Relish)',       50, 'g',  135, 1.5,  5,12.5, 2.0],
  ['Seeni Sambol (Caramelised Onion)', 50, 'g',  110, 1.5, 14, 5.5, 1.0],
  ['Lunumiris (Chilli Paste)',          15, 'g',   25, 0.8,  3, 1.0, 0.8],
  ['Katta Sambol (Dry Chilli)',         15, 'g',   30, 1.0,  3, 1.5, 1.2],
  ['Gotukola Sambol',                   50, 'g',   35, 1.5,  4, 1.5, 1.5],
  ['Coconut Chutney',                   30, 'g',   80, 1.0,  3, 7.5, 1.5],
  ['Mango Chutney',                     30, 'g',   55, 0.3, 14, 0.1, 0.5],
  ['Tamarind Chutney',                  20, 'g',   45, 0.5, 11, 0.1, 0.5],
  ['Seeni Onion Sambol',                50, 'g',  100, 1.2, 13, 5.0, 1.0],

  // ── Mallungs (Stir-fried Greens) ─────────────────────────────
  ['Gotukola Mallung',                 100, 'g',   45, 3.0,  5, 2.0, 3.5],
  ['Murunga Leaf Mallung',             100, 'g',   55, 4.0,  6, 2.0, 3.0],
  ['Kankun Mallung (Water Spinach)',   100, 'g',   40, 2.5,  5, 1.5, 2.0],
  ['Pol Mallung (Coconut Greens)',     100, 'g',  125, 3.0,  8, 9.5, 3.0],
  ['Cabbage Mallung',                  100, 'g',   60, 2.0,  7, 2.5, 2.5],
  ['Carrot Mallung',                   100, 'g',   70, 1.5, 10, 2.5, 2.0],
  ['Kohila Mallung',                   100, 'g',   75, 1.5, 12, 2.0, 3.0],
  ['Banana Flower Mallung',            100, 'g',   65, 3.5,  9, 1.5, 3.5],
  ['Gotu Kola Kanda (Porridge)',       250, 'ml',  95, 3.0, 16, 2.5, 2.5],

  // ── Short Eats & Street Food ─────────────────────────────────
  ['Fish Bun (Short Eats)',             80, 'g',  220, 9.0, 32, 7.0, 1.5],
  ['Egg Bun',                           80, 'g',  215, 8.0, 31, 7.0, 1.0],
  ['Fish Cutlets',                      40, 'g',  110, 7.0,  8, 5.5, 0.8],
  ['Fish Rolls',                        80, 'g',  185, 8.0, 22, 7.0, 1.0],
  ['Vegetable Patties (Short Eats)',    60, 'g',  190, 4.5, 22, 9.0, 1.5],
  ['Chicken Patties',                   60, 'g',  210, 8.0, 20,11.0, 1.0],
  ['Ulundu Wadai (Lentil Fritter)',     50, 'g',  145, 6.0, 16, 6.5, 1.5],
  ['Isso Vadai (Prawn Fritter)',         50, 'g',  130, 8.0, 12, 5.5, 0.8],
  ['Pani Pol Pancake (Coconut Crepe)', 80, 'g',  195, 4.0, 27, 8.0, 1.5],
  ['Plain Pancake (Sri Lankan)',        70, 'g',  150, 4.0, 20, 6.0, 0.8],
  ['Samosa (Sri Lankan)',               60, 'g',  175, 4.5, 20, 8.5, 1.5],
  ['Isso Tempered Prawns',             100, 'g',  165,18.0,  5, 8.5, 0.5],
  ['Devilled Chicken',                 150, 'g',  285,25.0,  8,17.0, 1.0],
  ['Devilled Pork',                    150, 'g',  310,24.0,  7,19.5, 0.8],
  ['Devilled Beef',                    150, 'g',  295,26.0,  7,17.5, 0.8],
  ['Devilled Cuttlefish',              150, 'g',  180,18.0,  8, 8.0, 1.0],
  ['String Hopper Kottu',              300, 'g',  420,14.0, 58,15.0, 3.0],

  // ── Sri Lankan Sweets & Desserts ──────────────────────────────
  ['Wattalappam (Coconut Custard)',    100, 'g',  225, 5.0, 30, 9.5, 0.5],
  ['Kalu Dodol',                       50, 'g',  205, 1.5, 36, 6.0, 0.8],
  ['Bibikkan (Coconut Cake)',          100, 'g',  320, 4.0, 55,10.0, 2.5],
  ['Kavum (Oil Cake)',                  40, 'g',  180, 2.0, 26, 8.0, 0.5],
  ['Kokis (Rice Crisp)',                20, 'g',  105, 1.0, 12, 5.5, 0.3],
  ['Aluwa (Rice Sweet)',                30, 'g',  120, 1.0, 25, 2.0, 0.3],
  ['Thala Guli (Sesame Balls)',         20, 'g',   95, 2.5, 11, 4.5, 1.0],
  ['Pani Walalu (Honey Rings)',         30, 'g',  115, 1.0, 21, 3.0, 0.3],
  ['Asmi (Lacy Crisp)',                 25, 'g',   90, 1.5, 15, 2.5, 0.3],
  ['Aggala (Rice Ball)',                50, 'g',  130, 2.0, 28, 1.0, 0.5],
  ['Kiribath with Lunumiris',          215, 'g',  335, 6.0, 57, 8.0, 1.0],
  ['Buffalo Curd',                     150, 'g',  165, 7.5,  8,12.0, 0.0],
  ['Kithul Treacle',                    30, 'g',   95, 0.2, 24, 0.0, 0.0],
  ['Coconut Milk Toffee',               25, 'g',  115, 1.0, 17, 4.5, 0.3],
  ['Coconut Ice Cream',                100, 'g',  200, 2.5, 24,10.5, 0.5],

  // ── Sri Lankan Drinks ─────────────────────────────────────────
  ['King Coconut Water (Thambili)',    300, 'ml',  75, 0.8, 18, 0.0, 0.0],
  ['Fresh Lime Juice (sweetened)',     200, 'ml',  60, 0.3, 15, 0.0, 0.0],
  ['Woodapple Juice',                  200, 'ml',  85, 1.0, 20, 0.3, 0.5],
  ['Faluda',                           300, 'ml', 285, 5.0, 49, 8.0, 0.5],
  ['Cinnamon Tea (plain)',             200, 'ml',  10, 0.0,  2, 0.0, 0.0],
  ['Ranawara Tea',                     200, 'ml',   5, 0.0,  1, 0.0, 0.0],
  ['Ginger Beer (local)',              300, 'ml', 110, 0.0, 28, 0.0, 0.0],
  ['Pol Kiri / Thick Coconut Milk',   100, 'ml', 230, 2.3,  6,24.0, 0.5],
  ['Thin Coconut Milk',               100, 'ml',  45, 0.5,  3, 4.5, 0.3],
  ['Roti Bread (Supermarket)',        100, 'g',  265, 7.5, 47, 4.5, 2.0],

  // ── Sri Lankan Fruits ─────────────────────────────────────────
  ['Woodapple (Beli)',                 100, 'g',  134, 3.0, 32, 0.3, 3.5],
  ['Rambutan',                         100, 'g',   82, 0.6, 21, 0.2, 0.9],
  ['Mangosteen',                       100, 'g',   73, 0.4, 18, 0.6, 1.8],
  ['Soursop (Katu Anoda)',             100, 'g',   66, 1.0, 17, 0.3, 3.3],
  ['Custard Apple (Anoda)',            100, 'g',  101, 1.7, 25, 0.6, 2.4],
  ['Breadfruit (Del)',                 100, 'g',  103, 1.1, 27, 0.2, 4.9],
  ['Nelli (Indian Gooseberry)',        100, 'g',   44, 0.8, 10, 0.6, 4.3],
  ['Jak Seed (Kos Ata, boiled)',       100, 'g',   98, 2.0, 22, 0.5, 1.5],
  ['Durian',                           100, 'g',  147, 1.5, 27, 5.0, 3.8],
  ['Beli (Bael) Fruit',               100, 'g',  137, 1.8, 32, 0.2, 2.9],
  ['Kolikuttu Banana',                 100, 'g',  112, 1.2, 27, 0.4, 2.0],
  ['Embul Banana (small, sour)',       100, 'g',   96, 1.0, 23, 0.3, 1.8],
  ['Pineapple (local variety)',        100, 'g',   50, 0.5, 13, 0.1, 1.4],
  ['Papaya (ripe)',                    100, 'g',   43, 0.5, 11, 0.1, 1.7],
  ['Guava (white)',                    100, 'g',   68, 2.6, 14, 1.0, 5.4],
  ['Mango (local, ripe)',              100, 'g',   65, 0.5, 17, 0.3, 1.8],

  // ── Sri Lankan Fish & Seafood ─────────────────────────────────
  ['Seer Fish / Thora (fresh)',        100, 'g',  103,19.0,  0, 3.0, 0.0],
  ['Yellowfin Tuna (Kelawalla)',       100, 'g',  139,24.0,  0, 4.5, 0.0],
  ['Mullet (Thilapia)',                100, 'g',  128,26.0,  0, 2.5, 0.0],
  ['Sprats (Halmasso, fresh)',         100, 'g',  155,19.0,  0, 8.5, 0.0],
  ['Dried Sprats (Karuvan)',           100, 'g',  295,40.0,  2,14.0, 0.0],
  ['Dried Fish / Karavala',            100, 'g',  280,42.0,  0,12.0, 0.0],
  ['Pomfret (fresh)',                  100, 'g',  119,21.0,  0, 3.5, 0.0],
  ['Jumbo Prawns (fresh)',             100, 'g',  106,20.0,  1, 2.5, 0.0],
  ['Lobster (cooked)',                 100, 'g',  112,24.0,  0, 1.5, 0.0],
  ['Squid / Dallo',                    100, 'g',   92,16.0,  3, 1.4, 0.0],
  ['Oysters',                          100, 'g',   81, 9.0,  5, 2.3, 0.0],
  ['River Crab (cooked)',              100, 'g',   87,16.0,  0, 2.0, 0.0],
  ['Freshwater Prawn',                 100, 'g',   98,19.0,  1, 2.0, 0.0],

  // ── Sri Lankan Vegetables ────────────────────────────────────
  ['Gotukola (raw)',                   100, 'g',   44, 4.0,  7, 1.0, 3.5],
  ['Murunga Leaves (Moringa)',         100, 'g',   64, 9.0,  8, 1.4, 2.0],
  ['Kankun (Water Spinach)',           100, 'g',   19, 2.6,  3, 0.2, 2.1],
  ['Kohila (Arrowroot)',               100, 'g',   65, 1.5, 13, 0.5, 3.0],
  ['Ash Plantain (raw)',               100, 'g',  106, 1.5, 24, 0.5, 2.0],
  ['Lotus Root',                       100, 'g',   74, 2.6, 17, 0.1, 4.9],
  ['Banana Flower (Kesel Muwa)',       100, 'g',   51, 1.6, 10, 0.6, 5.7],
  ['Thampala (Amaranth leaves)',       100, 'g',   23, 2.5,  4, 0.3, 2.0],
  ['Aguna Leaves',                     100, 'g',   40, 3.5,  5, 1.0, 3.5],

  // ── Miscellaneous Sri Lankan ─────────────────────────────────
  ['Kiri Pani (Curd & Treacle)',       200, 'g',  255, 7.0, 28,12.5, 0.0],
  ['Lavariya (Sweet Dumpling)',         80, 'g',  215, 4.0, 36, 6.0, 1.5],
  ['Mung Kavum',                        40, 'g',  170, 2.5, 25, 7.0, 0.8],
  ['Weli Thalapa (Rice Cake)',         100, 'g',  200, 3.5, 38, 4.0, 1.0],
  ['Pani Pussuwa (Honey Cake)',        100, 'g',  390, 3.5, 56,17.0, 1.0],
  ['Murunga Pod (Drumstick)',          100, 'g',   37, 2.1,  8, 0.2, 3.2],
  ['Sri Lankan Meatball Curry',        150, 'g',  245,20.0,  6,15.5, 0.8],
  ['Arrack & Soda (mixed)',            200, 'ml',  95, 0.0,  4, 0.0, 0.0],
];

async function main() {
  console.log('🇱🇰  Sri Lankan Food Seeder');
  console.log(`    Supabase : ${SUPABASE_URL}`);
  console.log(`    Foods    : ${SL_FOODS.length} items`);
  console.log('');

  const batch = SL_FOODS.map(([name, serving_size, serving_unit, calories,
                                protein_g, carbs_g, fat_g, fiber_g], i) => ({
    id          : slUuid(i + 1),
    name,
    brand       : null,
    serving_size,
    serving_unit,
    calories,
    protein_g,
    carbs_g,
    fat_g,
    fiber_g,
    is_verified : true,
  }));

  const { error } = await supabase
    .from('food_items')
    .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

  if (error) {
    console.error('❌  Supabase error:', error.message);
    process.exit(1);
  }

  console.log(`✅  Done!  ${batch.length} Sri Lankan foods upserted to Supabase.`);
  console.log('');
  console.log('Next: launch the app — it will pull the updated catalog on next sync.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
