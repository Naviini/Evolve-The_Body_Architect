/**
 * Seed FitStore products into Supabase store_products table.
 *
 * Usage:
 *   node --env-file=.env scripts/seed-store-products.mjs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env (bypasses RLS).
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const products = [
  { id: 'p001', name: 'Whey Protein Isolate', category: 'Supplements', price: 3199, previous_price: 3799, description: 'Fast-absorbing whey isolate for muscle recovery and lean mass support.', image: 'https://source.unsplash.com/900x700/?whey,protein', tags_json: ['protein','muscle','supplement','recovery','strength'], rating: 4.8, on_sale: true, nutrition_json: { protein: 26, allergens: ['milk'] } },
  { id: 'p002', name: 'ProGrip Yoga Mat', category: 'Gear', price: 1299, previous_price: 1699, description: 'Cushioned anti-slip mat made for yoga, mobility, and home training.', image: 'https://source.unsplash.com/900x700/?yoga,mat', tags_json: ['yoga','gear','mobility'], rating: 4.6, on_sale: true },
  { id: 'p003', name: 'Natural Almond Butter', category: 'Food & Drink', price: 549, description: 'Creamy almond butter with zero added sugar and no palm oil.', image: 'https://source.unsplash.com/900x700/?almond,butter', tags_json: ['almond','healthy','food','energy'], rating: 4.7, nutrition_json: { protein: 7, fat: 16, allergens: ['nuts'] } },
  { id: 'p004', name: 'Electrolyte Hydration Drink', category: 'Food & Drink', price: 249, previous_price: 299, description: 'Low-sugar hydration blend with essential electrolytes.', image: 'https://source.unsplash.com/900x700/?sports,drink,bottle', tags_json: ['hydration','drink','electrolytes','recovery'], rating: 4.4, on_sale: true, nutrition_json: { calories: 40, carbs: 9 } },
  { id: 'p005', name: 'Adjustable Dumbbell Set', category: 'Gear', price: 6999, previous_price: 8499, description: 'Space-saving adjustable dumbbells for strength workouts.', image: 'https://source.unsplash.com/900x700/?dumbbell,gym', tags_json: ['gear','strength','home-gym','muscle'], rating: 4.9, on_sale: true },
  { id: 'p006', name: 'Stainless Steel Shaker', category: 'Accessories', price: 799, description: 'Leak-proof 700ml shaker bottle with mixing ball.', image: 'https://source.unsplash.com/900x700/?shaker,bottle', tags_json: ['accessory','shaker','protein'], rating: 4.5, is_new: true },
  { id: 'p007', name: 'Omega-3 Fish Oil', category: 'Health', price: 999, description: 'Daily omega-3 support for heart and joint health.', image: 'https://source.unsplash.com/900x700/?fish,oil,supplement', tags_json: ['health','heart','recovery','supplement'], rating: 4.6, is_new: true },
  { id: 'p008', name: 'Aloe Cooling Body Lotion', category: 'Body Care', price: 449, description: 'Hydrating body lotion with aloe and vitamin E.', image: 'https://source.unsplash.com/900x700/?body,lotion,skincare', tags_json: ['body-care','skin','recovery'], rating: 4.3 },
  { id: 'p009', name: 'Plant Protein Bar Pack', category: 'Food & Drink', price: 899, previous_price: 1099, description: '12 high-protein snack bars for pre and post workout fuel.', image: 'https://source.unsplash.com/900x700/?protein,bar,snack', tags_json: ['protein','snack','food','energy'], rating: 4.5, on_sale: true },
  { id: 'p010', name: 'Resistance Band Kit', category: 'Gear', price: 1599, description: '5-band resistance kit for full-body training anywhere.', image: 'https://source.unsplash.com/900x700/?resistance,band,fitness', tags_json: ['gear','mobility','strength','home-gym'], rating: 4.7, is_new: true },
  { id: 'p011', name: 'Creatine Monohydrate', category: 'Supplements', price: 1899, previous_price: 2299, description: 'Micronized creatine to support power and high-intensity performance.', image: 'https://source.unsplash.com/900x700/?creatine,supplement', tags_json: ['supplement','strength','muscle','power'], rating: 4.8, on_sale: true },
  { id: 'p012', name: 'BCAA Recovery Formula', category: 'Supplements', price: 1499, description: 'Essential amino acids blend for quicker post-workout recovery.', image: 'https://source.unsplash.com/900x700/?bcaa,fitness,supplement', tags_json: ['supplement','recovery','muscle'], rating: 4.4 },
  { id: 'p013', name: 'Vitamin D3 + K2', category: 'Health', price: 899, description: 'Daily immune and bone support formula.', image: 'https://source.unsplash.com/900x700/?vitamin,capsule', tags_json: ['health','immunity','supplement'], rating: 4.6, is_new: true },
  { id: 'p014', name: 'Joint Support Collagen', category: 'Health', price: 1299, previous_price: 1599, description: 'Collagen peptides blend for joints, skin, and connective tissue.', image: 'https://source.unsplash.com/900x700/?collagen,powder', tags_json: ['health','recovery','joints'], rating: 4.5, on_sale: true },
  { id: 'p015', name: 'Steel Jump Rope', category: 'Gear', price: 749, description: 'Adjustable speed rope for cardio and conditioning.', image: 'https://source.unsplash.com/900x700/?jump,rope,fitness', tags_json: ['gear','cardio','conditioning'], rating: 4.5 },
  { id: 'p016', name: 'Foam Roller Pro', category: 'Accessories', price: 999, description: 'High-density foam roller for muscle release and mobility.', image: 'https://source.unsplash.com/900x700/?foam,roller', tags_json: ['accessory','recovery','mobility'], rating: 4.4 },
  { id: 'p017', name: 'Compression Wrist Wraps', category: 'Accessories', price: 649, description: 'Sturdy wrist support for push and press movements.', image: 'https://source.unsplash.com/900x700/?wrist,wrap,gym', tags_json: ['accessory','strength','support'], rating: 4.3 },
  { id: 'p018', name: 'Organic Peanut Butter', category: 'Food & Drink', price: 499, description: 'High-protein peanut spread made from roasted peanuts only.', image: 'https://source.unsplash.com/900x700/?peanut,butter', tags_json: ['food','protein','healthy','energy'], rating: 4.6 },
  { id: 'p019', name: 'Instant Oats Mix', category: 'Food & Drink', price: 699, previous_price: 799, description: 'High-fiber oats blend for quick, healthy breakfast bowls.', image: 'https://source.unsplash.com/900x700/?oats,breakfast', tags_json: ['food','fiber','energy'], rating: 4.5, on_sale: true },
  { id: 'p020', name: 'HydraSteel Water Bottle', category: 'Accessories', price: 1099, description: 'Insulated stainless bottle keeps drinks cold for 24 hours.', image: 'https://source.unsplash.com/900x700/?water,bottle,steel', tags_json: ['accessory','hydration','gym'], rating: 4.7, is_new: true },
  { id: 'p021', name: 'Body Wash Active Fresh', category: 'Body Care', price: 399, description: 'Refreshing post-workout body wash with menthol and aloe.', image: 'https://source.unsplash.com/900x700/?body,wash', tags_json: ['body-care','hygiene','fresh'], rating: 4.2 },
  { id: 'p022', name: 'Recovery Bath Salt', category: 'Body Care', price: 599, description: 'Magnesium-rich bath salts to relax sore muscles.', image: 'https://source.unsplash.com/900x700/?bath,salt,spa', tags_json: ['body-care','recovery','relax'], rating: 4.4, is_new: true },
  { id: 'p023', name: 'Kettlebell 12kg', category: 'Gear', price: 3499, previous_price: 3999, description: 'Cast-iron kettlebell for swings, squats, and core training.', image: 'https://source.unsplash.com/900x700/?kettlebell', tags_json: ['gear','strength','conditioning'], rating: 4.8, on_sale: true },
  { id: 'p024', name: 'Energy Gel Pack', category: 'Food & Drink', price: 799, description: 'Quick carb fuel for long workout sessions and endurance runs.', image: 'https://source.unsplash.com/900x700/?energy,gel,sports', tags_json: ['food','carbs','endurance','energy'], rating: 4.3 },
  { id: 'p025', name: 'Multivitamin Performance', category: 'Health', price: 1199, description: 'Comprehensive daily vitamins for active lifestyles.', image: 'https://source.unsplash.com/900x700/?multivitamin,health', tags_json: ['health','immunity','performance'], rating: 4.6 },
  { id: 'p026', name: 'Lifting Gloves', category: 'Accessories', price: 899, description: 'Breathable gym gloves with enhanced grip and palm padding.', image: 'https://source.unsplash.com/900x700/?gym,gloves', tags_json: ['accessory','strength','gear'], rating: 4.4 },
  { id: 'p027', name: 'Protein Pancake Mix', category: 'Food & Drink', price: 1099, previous_price: 1299, description: 'High-protein breakfast pancake mix, low sugar and tasty.', image: 'https://source.unsplash.com/900x700/?pancake,mix,protein', tags_json: ['food','protein','breakfast'], rating: 4.5, on_sale: true },
  { id: 'p028', name: 'Pre-Workout Ignite', category: 'Supplements', price: 2099, description: 'Caffeine-based pre-workout for focus and workout intensity.', image: 'https://source.unsplash.com/900x700/?preworkout,supplement', tags_json: ['supplement','energy','focus','performance'], rating: 4.7, is_new: true },

  // Supplements (continued)
  { id: 'p029', name: 'Casein Protein Overnight', category: 'Supplements', price: 2799, previous_price: 3299, description: 'Slow-digesting casein to fuel muscle repair while you sleep.', image: 'https://source.unsplash.com/900x700/?protein,powder,casein', tags_json: ['supplement','protein','muscle','recovery','sleep'], rating: 4.6, on_sale: true, nutrition_json: { protein: 24, allergens: ['milk'] } },
  { id: 'p030', name: 'L-Glutamine Powder', category: 'Supplements', price: 1199, description: 'Pure glutamine to speed up post-workout muscle recovery.', image: 'https://source.unsplash.com/900x700/?glutamine,supplement,powder', tags_json: ['supplement','recovery','muscle','gut-health'], rating: 4.5, is_new: true },
  { id: 'p031', name: 'ZMA Sleep & Recovery', category: 'Supplements', price: 1399, previous_price: 1699, description: 'Zinc, Magnesium and B6 blend for deep sleep and testosterone support.', image: 'https://source.unsplash.com/900x700/?sleep,supplement,capsule', tags_json: ['supplement','sleep','recovery','testosterone','health'], rating: 4.4, on_sale: true },
  { id: 'p032', name: 'Thermogenic Fat Burner', category: 'Supplements', price: 1899, description: 'Stimulant-based thermogenic blend to support fat loss and metabolism.', image: 'https://source.unsplash.com/900x700/?fat,burner,supplement', tags_json: ['supplement','fat-loss','metabolism','energy'], rating: 4.3, is_new: true },
  { id: 'p033', name: 'Vegan Protein Blend', category: 'Supplements', price: 2599, previous_price: 2999, description: 'Pea & brown rice protein blend — 22g protein, 100% plant-based.', image: 'https://source.unsplash.com/900x700/?vegan,protein,plant', tags_json: ['supplement','vegan','protein','plant-based','muscle'], rating: 4.5, on_sale: true, nutrition_json: { protein: 22, allergens: [] } },

  // Gear (continued)
  { id: 'p034', name: 'Pull-Up Bar (Doorframe)', category: 'Gear', price: 1799, description: 'No-screw doorframe pull-up bar for back, arms, and core training.', image: 'https://source.unsplash.com/900x700/?pullup,bar,fitness', tags_json: ['gear','strength','home-gym','back','calisthenics'], rating: 4.6, is_new: true },
  { id: 'p035', name: 'Ab Wheel Roller', category: 'Gear', price: 699, previous_price: 899, description: 'Double-wheel ab roller with knee pad for intense core workouts.', image: 'https://source.unsplash.com/900x700/?ab,wheel,core,exercise', tags_json: ['gear','core','abs','home-gym'], rating: 4.5, on_sale: true },
  { id: 'p036', name: 'Weightlifting Belt', category: 'Gear', price: 2499, description: 'Nylon lever belt for lower back support during heavy lifts.', image: 'https://source.unsplash.com/900x700/?weightlifting,belt,gym', tags_json: ['gear','strength','support','powerlifting'], rating: 4.7, is_new: true },
  { id: 'p037', name: 'Pro Gym Bag 40L', category: 'Gear', price: 1999, previous_price: 2499, description: 'Large compartment gym bag with wet shoe pocket and bottle holder.', image: 'https://source.unsplash.com/900x700/?gym,bag,sports', tags_json: ['gear','bag','travel','gym'], rating: 4.6, on_sale: true },
  { id: 'p038', name: 'Barbell Squat Pad', category: 'Gear', price: 799, description: 'High-density foam pad to cushion the bar during squats and hip thrusts.', image: 'https://source.unsplash.com/900x700/?barbell,squat,pad', tags_json: ['gear','strength','comfort','squat'], rating: 4.3 },

  // Food & Drink (continued)
  { id: 'p039', name: 'High-Protein Granola', category: 'Food & Drink', price: 749, description: 'Crunchy oat granola with 15g protein per serving, low sugar.', image: 'https://source.unsplash.com/900x700/?granola,oats,breakfast', tags_json: ['food','protein','breakfast','fiber','energy'], rating: 4.6, is_new: true, nutrition_json: { protein: 15, carbs: 28, fat: 7, calories: 220 } },
  { id: 'p040', name: 'Lean Beef Jerky Pack', category: 'Food & Drink', price: 899, previous_price: 1099, description: 'High-protein beef jerky with zero artificial preservatives.', image: 'https://source.unsplash.com/900x700/?beef,jerky,snack', tags_json: ['food','protein','snack','keto','energy'], rating: 4.7, on_sale: true, nutrition_json: { protein: 18, fat: 3, calories: 110 } },
  { id: 'p041', name: 'Dark Chocolate Protein Spread', category: 'Food & Drink', price: 649, description: 'Indulgent chocolate spread with 8g protein — guilt-free.', image: 'https://source.unsplash.com/900x700/?chocolate,spread,protein', tags_json: ['food','protein','chocolate','snack'], rating: 4.5, nutrition_json: { protein: 8, fat: 12, calories: 170, allergens: ['nuts','milk'] } },
  { id: 'p042', name: 'Rice Cake Snack Pack', category: 'Food & Drink', price: 299, previous_price: 349, description: 'Low-calorie rice cakes, perfect post-workout carb top-up.', image: 'https://source.unsplash.com/900x700/?rice,cake,snack', tags_json: ['food','carbs','snack','light'], rating: 4.2, on_sale: true, nutrition_json: { carbs: 22, calories: 100 } },
  { id: 'p043', name: 'Cold Brew Coffee Concentrate', category: 'Food & Drink', price: 549, description: 'Ready-to-dilute cold brew for a clean caffeine boost before workouts.', image: 'https://source.unsplash.com/900x700/?cold,brew,coffee', tags_json: ['food','caffeine','energy','drink'], rating: 4.6, is_new: true, nutrition_json: { calories: 10 } },

  // Accessories (continued)
  { id: 'p044', name: 'Massage Lacrosse Ball', category: 'Accessories', price: 349, description: 'Hard rubber ball for trigger point release and deep tissue massage.', image: 'https://source.unsplash.com/900x700/?massage,ball,recovery', tags_json: ['accessory','recovery','mobility','massage'], rating: 4.5 },
  { id: 'p045', name: 'Quick-Dry Gym Towel', category: 'Accessories', price: 499, previous_price: 599, description: 'Ultra-absorbent microfibre towel for gym and outdoor training.', image: 'https://source.unsplash.com/900x700/?gym,towel,microfibre', tags_json: ['accessory','hygiene','gym'], rating: 4.4, on_sale: true },
  { id: 'p046', name: 'Knee Compression Sleeves', category: 'Accessories', price: 1099, description: 'Neoprene knee sleeves for joint warmth and support during squats.', image: 'https://source.unsplash.com/900x700/?knee,sleeve,compression', tags_json: ['accessory','support','strength','recovery'], rating: 4.6, is_new: true },
  { id: 'p047', name: 'Ankle Resistance Bands', category: 'Accessories', price: 799, description: 'Set of 3 fabric ankle bands for glute activation and leg isolation.', image: 'https://source.unsplash.com/900x700/?ankle,band,glute,exercise', tags_json: ['accessory','glutes','legs','resistance','home-gym'], rating: 4.7, is_new: true },

  // Health (continued)
  { id: 'p048', name: 'Ashwagandha KSM-66', category: 'Health', price: 1099, previous_price: 1299, description: 'Clinically researched ashwagandha for stress, cortisol and recovery.', image: 'https://source.unsplash.com/900x700/?ashwagandha,supplement,herb', tags_json: ['health','stress','recovery','testosterone','sleep'], rating: 4.7, on_sale: true },
  { id: 'p049', name: 'Magnesium Glycinate 400mg', category: 'Health', price: 999, description: 'Highly bioavailable magnesium for muscle function, sleep and recovery.', image: 'https://source.unsplash.com/900x700/?magnesium,supplement,capsule', tags_json: ['health','sleep','recovery','muscle'], rating: 4.6, is_new: true },
  { id: 'p050', name: 'Turmeric Curcumin + Piperine', category: 'Health', price: 849, description: 'Anti-inflammatory turmeric with black pepper extract for absorption.', image: 'https://source.unsplash.com/900x700/?turmeric,supplement,curcumin', tags_json: ['health','inflammation','recovery','joints'], rating: 4.5 },

  // Body Care (continued)
  { id: 'p051', name: 'Muscle Relief Balm', category: 'Body Care', price: 699, previous_price: 849, description: 'Fast-acting menthol and camphor balm for sore muscles and joint pain.', image: 'https://source.unsplash.com/900x700/?muscle,balm,relief', tags_json: ['body-care','recovery','pain-relief','muscle'], rating: 4.6, on_sale: true },
  { id: 'p052', name: 'SPF 50 Sport Sunscreen', category: 'Body Care', price: 599, description: 'Sweat-resistant SPF 50 sunscreen for outdoor training and runs.', image: 'https://source.unsplash.com/900x700/?sunscreen,sport,spf', tags_json: ['body-care','outdoor','skin','protection'], rating: 4.4, is_new: true },
];

async function seed() {
    console.log(`Seeding ${products.length} products into store_products...`);
    // products array now contains 52 items (p001–p052)

    const { error } = await supabase
        .from('store_products')
        .upsert(products, { onConflict: 'id' });

    if (error) {
        console.error('❌ Seed failed:', error.message);
        process.exit(1);
    }

    console.log(`✅ Successfully seeded ${products.length} products.`);
}

seed();
