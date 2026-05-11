/**
 * FitStore — 1 000-product Supabase seeder
 *
 * Usage:
 *   node --env-file=.env scripts/seed-store-1000.mjs
 *
 * Requires EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 * Products are generated deterministically — safe to re-run (upsert on conflict).
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── Deterministic helpers ────────────────────────────────────────────────────
const V = (arr, i) => arr[Math.abs(i) % arr.length];
const RATINGS   = [4.9,4.8,4.7,4.6,4.5,4.4,4.3,4.2,4.1,4.0,3.9,4.8,4.7,4.6,4.5];
const MULTIPLIERS = [1.0,0.95,1.05,0.9,1.1,0.85,1.15,1.0,0.95,1.05];
const price = (base, i) => Math.round(base * MULTIPLIERS[i % MULTIPLIERS.length] / 50) * 50;
const rating = (i)       => RATINGS[i % RATINGS.length];
const isNew  = (i)       => i % 7 === 0;
const onSale = (i)       => i % 5 === 0;

// ── Product builder ──────────────────────────────────────────────────────────
function build(id, name, category, basePrice, description, image, tags, nutrition = null, i = 0) {
  const p = price(basePrice, i);
  return {
    id,
    name,
    category,
    price:         p,
    previous_price: onSale(i) ? Math.round(p * 1.2 / 50) * 50 : null,
    description,
    image,
    tags_json:     tags,
    rating:        rating(i),
    is_new:        isNew(i),
    on_sale:       onSale(i),
    nutrition_json: nutrition,
  };
}

// ── Generator ────────────────────────────────────────────────────────────────
function generate() {
  const all = [];
  let n = 0;
  const id = () => `p${String(++n).padStart(4,'0')}`;

  // ═══════════════════════════════════════════════════════════
  //  SUPPLEMENTS  (~270 products)
  // ═══════════════════════════════════════════════════════════

  // 1. Protein Powders  10 types × 8 flavors = 80
  const proteinDefs = [
    ['Whey Isolate',       3199, 26, 'image/jpeg', ['supplement','protein','muscle','recovery'],           {protein:26,allergens:['milk']}],
    ['Whey Concentrate',   2499, 22, 'image/jpeg', ['supplement','protein','muscle'],                      {protein:22,allergens:['milk']}],
    ['Casein Protein',     2799, 24, 'image/jpeg', ['supplement','protein','sleep','recovery'],             {protein:24,allergens:['milk']}],
    ['Pea Protein',        2299, 21, 'image/jpeg', ['supplement','protein','vegan','plant-based'],          {protein:21}],
    ['Brown Rice Protein', 1999, 20, 'image/jpeg', ['supplement','protein','vegan','gluten-free'],         {protein:20}],
    ['Hemp Protein',       1799, 15, 'image/jpeg', ['supplement','protein','vegan','omega-3'],             {protein:15}],
    ['Egg White Protein',  2999, 25, 'image/jpeg', ['supplement','protein','muscle','low-carb'],           {protein:25,allergens:['egg']}],
    ['Hydrolyzed Whey',    3999, 27, 'image/jpeg', ['supplement','protein','muscle','fast-absorb'],        {protein:27,allergens:['milk']}],
    ['Mass Gainer 3000',   3499, 30, 'image/jpeg', ['supplement','protein','muscle','weight-gain'],        {protein:30,carbs:50,calories:400}],
    ['Lean Mass Builder',  2999, 28, 'image/jpeg', ['supplement','protein','lean-muscle','bulk'],          {protein:28,carbs:20}],
  ];
  const proteinFlavors = ['Chocolate Fudge','Vanilla Bean','Strawberry Cream','Cookies & Cream','Banana Split','Salted Caramel','Double Mocha','Unflavored'];
  for (const [type, base, , , tags, nutr] of proteinDefs) {
    for (const flavor of proteinFlavors) {
      const i = all.length;
      all.push(build(id(), `${type} — ${flavor}`, 'Supplements', base,
        `Premium ${type.toLowerCase()} in ${flavor} flavour. ${nutr.protein}g protein per serving, ultra-low sugar.`,
        'https://source.unsplash.com/900x700/?protein,powder,supplement,fitness', tags, nutr, i));
    }
  }

  // 2. Pre-Workouts  10 names × 6 flavors = 60 → take 20
  const pwNames   = ['Ignite X','Surge Pro','Fury Max','Blast Elite','Rush V2','Pump Extreme','Stim Boost','Alpha Drive','Nitro Force','Volt Energy'];
  const pwFlavors = ['Fruit Punch','Blue Raspberry','Watermelon','Lemon Lime','Green Apple','Grape Burst'];
  for (let i = 0; i < 20; i++) {
    const nm = V(pwNames, i); const fl = V(pwFlavors, i);
    all.push(build(id(), `${nm} Pre-Workout — ${fl}`, 'Supplements', price(1799, i),
      'High-stimulant pre-workout formula for intensity, focus, vascularity and pump.',
      'https://source.unsplash.com/900x700/?preworkout,supplement,energy',
      ['supplement','pre-workout','energy','focus','pump'], null, i));
  }

  // 3. Creatine  7 types × 3 sizes = 21 → take 15
  const creatineTypes = ['Monohydrate','HCL','Micronized','Buffered','Kre-Alkalyn','Ethyl Ester','Nitrate'];
  const creatineSizes = ['250g','500g','1kg'];
  for (let i = 0; i < 15; i++) {
    const tp = V(creatineTypes, i); const sz = V(creatineSizes, i);
    all.push(build(id(), `Creatine ${tp} ${sz}`, 'Supplements', price(899, i),
      `Pure creatine ${tp.toLowerCase()} for explosive power, strength and muscle volume.`,
      'https://source.unsplash.com/900x700/?creatine,supplement,powder',
      ['supplement','creatine','strength','power','muscle'], null, i));
  }

  // 4. BCAAs & Amino Acids  8 types × 6 flavors → take 25
  const aminoTypes   = ['BCAA 2:1:1','BCAA 8:1:1','EAA Complex','L-Glutamine','L-Arginine','L-Citrulline','Beta-Alanine','Taurine'];
  const aminoFlavors = ['Watermelon','Grape','Fruit Punch','Lemon','Unflavored','Mango'];
  for (let i = 0; i < 25; i++) {
    const tp = V(aminoTypes, i); const fl = V(aminoFlavors, i);
    all.push(build(id(), `${tp} — ${fl} (300g)`, 'Supplements', price(999, i),
      `${tp} for muscle recovery, reduced soreness and intra-workout endurance.`,
      'https://source.unsplash.com/900x700/?bcaa,amino,supplement',
      ['supplement','amino-acids','recovery','muscle'], null, i));
  }

  // 5. Fat Burners  10 names, 3 forms = 15
  const fbNames = ['Thermo Shred','Lean Cuts','Fat Torch','Burn Elite','Cut Pro','Ripped Max','Shred Stack','Slimcore','Metabolite X','Lipo Ignite'];
  const fbForms = ['Capsules','Powder','Liquid Drops'];
  for (let i = 0; i < 15; i++) {
    all.push(build(id(), `${V(fbNames,i)} ${V(fbForms,i)}`, 'Supplements', price(1299, i),
      'Stimulant-based thermogenic for fat loss, metabolic acceleration and appetite control.',
      'https://source.unsplash.com/900x700/?fat,burner,supplement,capsule',
      ['supplement','fat-loss','thermogenic','metabolism','energy'], null, i));
  }

  // 6. Sleep & Recovery Supplements  15
  const sleepNames = ['ZMA Formula','Melatonin 5mg','Magnesium Glycinate 400mg','Ashwagandha KSM-66','Valerian Root','L-Theanine 200mg','GABA 750mg','Rest & Recover Stack','Sleep Elite','Cortisol Control','Night Time Protein','Reishi Mushroom Sleep','Passionflower Extract','5-HTP 100mg','Phosphatidylserine'];
  for (let i = 0; i < sleepNames.length; i++) {
    all.push(build(id(), `${sleepNames[i]} (60 caps)`, 'Supplements', price(799, i),
      'Sleep and recovery formula for deeper rest, hormonal balance and overnight muscle repair.',
      'https://source.unsplash.com/900x700/?sleep,supplement,capsule,recovery',
      ['supplement','sleep','recovery','hormone','stress'], null, i));
  }

  // 7. Mass Gainers  15 (5 names × 3 flavors)
  const mgNames = ['Serious Mass','True Mass','Mega Gainer','Bulk XL','Weight Stack Pro'];
  const mgFlavors = ['Chocolate','Vanilla','Strawberry'];
  for (let i = 0; i < 15; i++) {
    all.push(build(id(), `${V(mgNames,i)} ${V(mgFlavors,i)} 3kg`, 'Supplements', price(3499, i),
      '1000+ calorie mass gainer shake with 50g protein, complex carbs and healthy fats.',
      'https://source.unsplash.com/900x700/?mass,gainer,protein,supplement',
      ['supplement','mass-gainer','calories','muscle','bulk'],
      {protein:50,carbs:120,fat:15,calories:1000}, i));
  }

  // 8. Nootropics  15
  const nNames = ['Neuro Boost','Focus Max','Brain Fuel','Cognitive Edge','Mental Flow','Clear Mind','Alpha Edge','Think Sharp','Clarity Pro','Mind Surge','Neuro Alpha','Lion\'s Mane Pro','Bacopa Cognition','Ginkgo Biloba','Phosphatidylcholine'];
  for (let i = 0; i < nNames.length; i++) {
    all.push(build(id(), `${nNames[i]} (60 caps)`, 'Supplements', price(999, i),
      'Nootropic blend for focus, mental clarity, memory and cognitive performance.',
      'https://source.unsplash.com/900x700/?nootropic,brain,supplement,focus',
      ['supplement','nootropic','focus','cognitive','performance'], null, i));
  }

  // 9. Gut Health & Probiotics  15
  const gutNames = ['Probiotic 50B CFU','Digestive Enzyme Complex','Prebiotic Fibre Blend','Gut Shield Pro','Liver Detox Support','Collagen Peptides Powder','Inulin Prebiotic 500g','Lactobacillus Pro 10-Strain','Bifidobacterium Blend','Synbiotic Full Spectrum','Butyrate Complex','Leaky Gut Repair','Psyllium Husk 500g','Slippery Elm Bark','Berberine 500mg'];
  for (let i = 0; i < gutNames.length; i++) {
    all.push(build(id(), gutNames[i], 'Supplements', price(799, i),
      'Gut health formula for improved digestion, microbiome diversity and nutrient absorption.',
      'https://source.unsplash.com/900x700/?probiotic,gut,supplement,health',
      ['supplement','gut-health','digestion','immunity','probiotic'], null, i));
  }

  // 10. Greens & Superfoods  20
  const greensNames = ['Athletic Greens AG1','Spirulina Powder 500g','Chlorella Tablets','Superfood Daily Blend','Wheatgrass Powder 250g','Barley Grass Juice','Moringa Leaf Capsules','Matcha Green Tea Extract','Acai Berry 8000mg','Beetroot Performance Powder','Maca Root 3000mg','Reishi Mushroom Complex','Lion\'s Mane 1000mg','Chaga Mushroom Extract','Sea Moss Gel 250g','Cacao Nibs 500g','Goji Berry Powder','Turmeric + Black Pepper','Chlorophyll Liquid Drops','Phytonutrient Complex'];
  for (let i = 0; i < greensNames.length; i++) {
    all.push(build(id(), greensNames[i], 'Supplements', price(699, i),
      'Superfoods blend rich in antioxidants, phytonutrients and trace minerals.',
      'https://source.unsplash.com/900x700/?greens,superfood,supplement,powder',
      ['supplement','greens','superfood','antioxidant','health'], null, i));
  }

  // 11. Energy & Endurance  15
  const endNames = ['Caffeine + L-Theanine 100mg','Guarana Extract 1200mg','Panax Ginseng 1000mg','Cordyceps Sinensis 500mg','Coenzyme Q10 200mg','Beetroot Capsules 3000mg','Iron Active Sport','B12 + Iron Liquid','Carnitine 1500mg Liquid','Acetyl L-Carnitine 500mg','Ribose Energy Powder','Electrolyte + Caffeine Caps','MCT Oil Powder 500g','Coconut MCT Liquid 500ml','NADH Energy 20mg'];
  for (let i = 0; i < endNames.length; i++) {
    all.push(build(id(), endNames[i], 'Supplements', price(799, i),
      'Energy and endurance supplement for sustained performance and reduced fatigue.',
      'https://source.unsplash.com/900x700/?energy,endurance,supplement,performance',
      ['supplement','energy','endurance','fatigue','performance'], null, i));
  }

  // 12. Hormone & Testosterone Support  15
  const hormNames = ['TestoBoost Pro','Fadogia Agrestis 600mg','Tongkat Ali 400mg','D-Aspartic Acid 3g','Boron Citrate 10mg','DHEA 25mg','Tribulus 90% Saponins','Fenugreek 600mg Extract','Stinging Nettle Root','Free Testosterone Stack','DIM Diindolylmethane','Calcium D-Glucarate','Saw Palmetto 320mg','Zinc + Magnesium + B6','Anastrozole Herbal Blend'];
  for (let i = 0; i < hormNames.length; i++) {
    all.push(build(id(), `${hormNames[i]} (90 caps)`, 'Supplements', price(1199, i),
      'Natural hormone support for testosterone balance, vitality and lean body composition.',
      'https://source.unsplash.com/900x700/?testosterone,supplement,hormone,capsule',
      ['supplement','testosterone','hormone','vitality','strength'], null, i));
  }

  // ═══════════════════════════════════════════════════════════
  //  FOOD & DRINK  (~230 products)
  // ═══════════════════════════════════════════════════════════

  // 13. Protein Bars  10 brands × 8 flavors = 80 → take 40
  const barBrands  = ['FitBar','ProSnack','MuscleBar','CleanBar','PowerBar','NutriBar','PeakBar','ZeroBar','AthletiBar','WheyBar'];
  const barFlavors = ['Chocolate Peanut','Vanilla Almond','Cookies & Cream','Strawberry Yogurt','Caramel Crisp','Dark Chocolate','Mint Choc Chip','Blueberry Cheesecake'];
  for (let i = 0; i < 40; i++) {
    const variant = i < 20 ? 'Single' : 'Box of 12';
    const bprice  = i < 20 ? 199 : 1899;
    all.push(build(id(), `${V(barBrands,i)} ${V(barFlavors,i)} Protein Bar — ${variant}`, 'Food & Drink', price(bprice, i),
      `${V(barFlavors,i)} flavoured bar with 20g protein, low sugar and high fibre.`,
      'https://source.unsplash.com/900x700/?protein,bar,snack,fitness',
      ['food','protein','snack','bar','energy'], {protein:20,carbs:22,fat:9,calories:230}, i));
  }

  // 14. Nut Butters & Spreads  20
  const nbNames = ['Almond Butter Smooth 500g','Almond Butter Crunchy 500g','Peanut Butter Smooth 1kg','Peanut Butter Crunchy 1kg','Cashew Butter 250g','Macadamia Butter 250g','Sunflower Seed Butter 500g','Hazelnut Protein Spread 350g','Dark Choc Almond Spread 350g','Coconut Butter 300g','Walnut Butter 250g','Brazil Nut Butter 250g','Pistachio Cream 200g','Tahini Sesame Paste 500g','Mixed Nut Butter 500g','Peanut & Almond Blend 750g','High-Protein Nut Butter 500g','Keto Nut Butter 300g','Cacao Almond Spread 350g','Vanilla Peanut Butter 500g'];
  for (let i = 0; i < nbNames.length; i++) {
    all.push(build(id(), nbNames[i], 'Food & Drink', price(499, i),
      'Natural nut butter with no added palm oil, refined sugar or preservatives. High in healthy fats.',
      'https://source.unsplash.com/900x700/?nut,butter,almond,healthy',
      ['food','healthy-fat','protein','energy','natural'], {protein:7,fat:16,calories:180}, i));
  }

  // 15. Healthy Snacks  30
  const snackNames = ['Roasted Chickpeas Sea Salt','Edamame Crisps Chilli','Kale Chips Cheesy','Seaweed Snack Original','Pumpkin Seeds Roasted 250g','Mixed Trail Mix 400g','Sunflower Seeds 300g','Dried Mango Strips 150g','Medjool Dates 500g','Dark Chocolate Almonds 200g','Coconut Chips Toasted 150g','Cashews Honey Roasted 200g','Freeze-Dried Strawberries 80g','Biltong Snack Pack 100g','Turkey Jerky Original 80g','Salmon Jerky Teriyaki 70g','Oat Biscuits Protein 200g','Quinoa Puffs BBQ 120g','Chia Pudding Pouch Vanilla 200g','Protein Popcorn Caramel 80g','Veggie Straws Sea Salt 130g','Lentil Chips Paprika 120g','Flaxseed Crackers 200g','Almond Flour Crackers 150g','Buckwheat Crackers 200g','Protein Pretzels 150g','Soy Crisps Ranch 120g','Brown Rice Crackers 200g','Avocado Crisps Sea Salt 90g','Chickpea Puffs BBQ 120g'];
  for (let i = 0; i < snackNames.length; i++) {
    all.push(build(id(), snackNames[i], 'Food & Drink', price(299, i),
      'Clean, nutrient-dense snack for on-the-go energy, travel and guilt-free munching.',
      'https://source.unsplash.com/900x700/?healthy,snack,food,natural',
      ['food','snack','healthy','natural','energy'], null, i));
  }

  // 16. Cereals, Granola & Oats  25
  const cerealNames = ['Protein Granola Chocolate 500g','Muesli Berry Blend 750g','Steel-Cut Oats 1kg','Instant Oats Banana 1kg','Overnight Oat Mix Vanilla 500g','Protein Granola Peanut Butter 500g','Gluten-Free Granola 400g','Crunchy Nut Granola 500g','Quinoa Porridge Mix 600g','Buckwheat Flakes 500g','Spelt Flakes 500g','Amaranth Puffs 300g','Protein Cereal Chocolate 400g','Low-Sugar Granola 500g','Honey Almond Granola 500g','Coconut Granola 400g','Keto Granola Nut Cluster 300g','Nut & Seed Muesli 750g','Goji Berry Granola 400g','Hemp Seed Granola 400g','Flaxseed Oatmeal Mix 600g','Protein Overnight Oats Berry 500g','Vanilla Almond Cereal 400g','Cacao Nibs Granola 400g','Maca Superfood Porridge 500g'];
  for (let i = 0; i < cerealNames.length; i++) {
    all.push(build(id(), cerealNames[i], 'Food & Drink', price(449, i),
      'Wholesome, high-fibre breakfast with natural ingredients for sustained energy.',
      'https://source.unsplash.com/900x700/?granola,oats,cereal,breakfast,healthy',
      ['food','breakfast','fiber','energy','carbs'], {carbs:35,protein:8,calories:220}, i));
  }

  // 17. Sports Drinks & Hydration  25
  const drinkNames = ['Electrolyte Powder Lemon 300g','Electrolyte Powder Berry 300g','Hydration Tabs Orange 20pk','Isotonic Drink Tropical 500ml','Coconut Water Concentrate 250ml','Sports Drink Grape 500ml','Endurance Fuel Mix Cherry 500g','Recovery Drink Orange 400g','BCAA Water Watermelon 500ml','Collagen Drink Berry 500ml','Sugar-Free Energy Drink 330ml','Caffeine-Free Isotonic 500ml','Alkaline Water Booster 100ml','Electrolyte Capsules 60pk','Post-Workout Shake Vanilla 330ml','Intra-Workout Fuel Lemon 500g','Hydration Multiplier Strawberry','Zero Carb Sports Drink 500ml','Tart Cherry Concentrate 500ml','Pomegranate Recovery Shot 60ml','Turmeric Wellness Shot 60ml','Ginger Lemon Energy Shot 60ml','Beetroot Nitrate Shot 70ml','Liquid IV Hydration Multiplier','ORS Sachets Mango 24pk'];
  for (let i = 0; i < drinkNames.length; i++) {
    all.push(build(id(), drinkNames[i], 'Food & Drink', price(249, i),
      'Replenish electrolytes, stay hydrated and sustain peak performance.',
      'https://source.unsplash.com/900x700/?sports,drink,hydration,electrolyte',
      ['food','drink','hydration','electrolytes','sports'], null, i));
  }

  // 18. Coffee & Tea  20
  const cNames = ['Cold Brew Concentrate Black 250ml','Cold Brew Vanilla Oat Milk 250ml','Pre-Workout Coffee Sachets 15pk','Mushroom Coffee Blend 150g','Green Tea Matcha Powder 150g','Matcha Latte Mix Sweetened 250g','Oolong Slimming Tea 50 Bags','Yerba Mate Powder 500g','Guayusa Energy Tea 30 Bags','Herbal Recovery Tea 30 Bags','Turmeric Golden Latte 250g','Ashwagandha Chai Blend 250g','Chaga Mushroom Tea 30 Bags','Kombucha Starter Kit','Protein Coffee Sachets 10pk','Whey Iced Coffee RTD 330ml','Decaf Green Tea Extract 90 caps','Hibiscus & Ginger Wellness Tea','Cinnamon Apple Metabolism Tea','Lavender Chamomile Sleep Tea'];
  for (let i = 0; i < cNames.length; i++) {
    all.push(build(id(), cNames[i], 'Food & Drink', price(349, i),
      'Performance-focused beverage with clean energy and functional health benefits.',
      'https://source.unsplash.com/900x700/?coffee,tea,healthy,drink,matcha',
      ['food','drink','caffeine','energy','wellness'], null, i));
  }

  // 19. Protein & Whole Foods  20
  const pfNames = ['Canned Tuna Spring Water 4pk','Canned Tuna Olive Oil 4pk','Wild Alaskan Salmon Pouch','Smoked Mackerel Fillet 2pk','Ready Chicken Breast 3pk','Tuna Protein Pouch Lemon','High-Protein Greek Yogurt 450g','Cottage Cheese Full Fat 500g','Protein Pancake Mix Vanilla 500g','Protein Waffle Mix 400g','Protein Pasta Penne 500g','High-Protein Bread Mix 500g','Edamame Protein Noodles 250g','Lentil Protein Pasta 500g','Chickpea Fusilli 500g','Quinoa & Lentil Blend 500g','Brown Rice Microwave Pouch 250g','Microwaveable Rice & Lentil 250g','Tempeh Organic 200g','Seitan Deli Slices 200g'];
  for (let i = 0; i < pfNames.length; i++) {
    all.push(build(id(), pfNames[i], 'Food & Drink', price(299, i),
      'High-protein, minimally processed whole food for clean muscle fuel and meal prep.',
      'https://source.unsplash.com/900x700/?protein,food,healthy,meal,tuna',
      ['food','protein','whole-food','meal-prep','clean'], {protein:20,fat:5,calories:130}, i));
  }

  // 20. Meal Replacements  20
  const mrNames = ['Huel Powder Vanilla 1.7kg','Huel Powder Chocolate 1.7kg','Soylent Powder Original 1.5kg','310 Shake Vanilla 945g','Isagenix IsaLean Chocolate','Optavia Lean Shake Vanilla','SlimFast Advanced Nutrition','Vegan Meal Replacement Berry','Keto Meal Shake Coconut','Weight Loss Shake Strawberry','Breakfast Shake Original','All-in-One Shake Unflavored','Diet Shake Caramel 500g','Protein Diet Shake Vanilla 1kg','EatRight Shake Chocolate 500g','Soya Meal Replacement 500g','Raw Meal Vanilla 488g','Garden of Life Sport Shake','Super Meal Greens Blend 500g','Athlete Meal Powder Chocolate'];
  for (let i = 0; i < mrNames.length; i++) {
    all.push(build(id(), mrNames[i], 'Food & Drink', price(1799, i),
      'Complete meal replacement with balanced macros, vitamins and minerals.',
      'https://source.unsplash.com/900x700/?meal,replacement,shake,powder,nutrition',
      ['food','meal-replacement','balanced','weight-management','protein'],
      {protein:27,carbs:37,fat:13,calories:400}, i));
  }

  // 21. Protein Desserts  15
  const dessertNames = ['Protein Ice Cream Chocolate 500ml','Protein Ice Cream Vanilla 500ml','Protein Brownie 100g','High-Protein Flapjack Oat','Protein Donut Chocolate','Protein Cookie Peanut Butter','Protein Fudge Bites','Protein Mug Cake Mix','Protein Cheesecake Mix 300g','Protein Chocolate Mousse','Protein Tiramisu Mix','Frozen Protein Yogurt Bar','Protein Pudding Cup Vanilla','Protein Rice Pudding 300g','Protein Jelly Cups Strawberry'];
  for (let i = 0; i < dessertNames.length; i++) {
    all.push(build(id(), dessertNames[i], 'Food & Drink', price(299, i),
      'High-protein dessert treat with 15–20g protein and minimal sugar guilt.',
      'https://source.unsplash.com/900x700/?protein,dessert,healthy,sweet',
      ['food','protein','dessert','sweet','snack'], {protein:17,fat:4,calories:180}, i));
  }

  // 22. Healthy Cooking Ingredients  15
  const cookNames = ['Extra Virgin Coconut Oil 500ml','Avocado Oil Spray 250ml','Apple Cider Vinegar 500ml','Himalayan Pink Salt 500g','Nutritional Yeast 200g','Coconut Aminos 250ml','Cacao Powder Raw 250g','Collagen Peptides Powder 500g','Xylitol Natural Sweetener 500g','Erythritol 500g','Monk Fruit Sweetener 200g','Almond Flour 500g','Coconut Flour 500g','Psyllium Husk 400g','Ground Flaxseed 500g'];
  for (let i = 0; i < cookNames.length; i++) {
    all.push(build(id(), cookNames[i], 'Food & Drink', price(349, i),
      'Clean, natural cooking ingredient for healthy meal prep and baking.',
      'https://source.unsplash.com/900x700/?cooking,oil,healthy,ingredient,natural',
      ['food','cooking','natural','healthy','ingredient'], null, i));
  }

  // ═══════════════════════════════════════════════════════════
  //  GEAR  (~200 products)
  // ═══════════════════════════════════════════════════════════

  // 23. Dumbbells & Kettlebells  30
  const fwTypes   = ['Cast Iron Dumbbell','Rubber Hex Dumbbell','Neoprene Dumbbell','Chrome Dumbbell','Cast Iron Kettlebell','Powder-Coat Kettlebell','Competition Kettlebell'];
  const fwWeights = [2,4,6,8,10,12,16,20,24,32];
  for (let i = 0; i < 30; i++) {
    const tp = V(fwTypes, i); const kg = V(fwWeights, i);
    all.push(build(id(), `${tp} ${kg}kg`, 'Gear', price(kg*120+199, i),
      `${tp} ${kg}kg for strength training, HIIT and functional conditioning.`,
      'https://source.unsplash.com/900x700/?dumbbell,kettlebell,weight,gym',
      ['gear','strength','free-weights','home-gym'], null, i));
  }

  // 24. Barbells & Weight Plates  20
  const bbItems = ['Olympic Barbell 20kg','EZ Curl Bar 10kg','Hex Trap Bar','Safety Squat Bar','Cambered Bar','Log Bar','Axle Bar 50mm','Swiss Multi-Grip Bar','Standard Barbell 15kg','Weight Plate 5kg Pair','Weight Plate 10kg Pair','Weight Plate 15kg Pair','Weight Plate 20kg Pair','Bumper Plate 10kg Pair','Bumper Plate 15kg Pair','Bumper Plate 20kg Pair','Fractional Plate Set','Olympic Collar Clips','Barbell Pad Squat','Power Rack Safety Spotter Arms'];
  for (let i = 0; i < bbItems.length; i++) {
    all.push(build(id(), bbItems[i], 'Gear', price(1499, i),
      'Commercial-grade barbell or weight plate for serious strength training.',
      'https://source.unsplash.com/900x700/?barbell,plates,gym,powerlifting',
      ['gear','strength','barbell','powerlifting','home-gym'], null, i));
  }

  // 25. Cardio & Agility  20
  const cardioItems = ['Speed Jump Rope Steel','Weighted Jump Rope 500g','Agility Ladder 6m','Speed Parachute','Battle Rope 9m Poly','Battle Rope 15m Heavy','Balance Disc Inflatable','BOSU Balance Trainer','Aerobic Step Platform','Agility Training Cones 20pk','Mini Hurdles Set 6pk','Plyometric Box 3-in-1','Agility Dot Mat 9 Circles','Speed Rings Training Set','Weighted Vest 5kg Adjustable','Weighted Vest 10kg Adjustable','Ankle Weights 2kg Pair','Wrist Weights 1kg Pair','Sled Drag Harness Strap','Resistance Running Parachute'];
  for (let i = 0; i < cardioItems.length; i++) {
    all.push(build(id(), cardioItems[i], 'Gear', price(499, i),
      'Cardio and agility tool for speed, endurance, coordination and explosive power.',
      'https://source.unsplash.com/900x700/?cardio,fitness,agility,training,speed',
      ['gear','cardio','conditioning','endurance','agility'], null, i));
  }

  // 26. Resistance Bands  20
  const rbItems = ['Resistance Loop Band Light','Resistance Loop Band Medium','Resistance Loop Band Heavy','Resistance Loop Band Extra Heavy','Pull-Up Assist Band Light','Pull-Up Assist Band Heavy','Superband Set of 5','Hip Circle Glute Band','Glute Band Fabric Set 3pk','Resistance Tube with Handles','Door Anchor System','Therapy Band Roll 2m','Lateral Walk Band Set','Mini Loop Band Pack 5pk','Fabric Booty Band Pink','Stackable Band System 5-Level','Resistance Bar + Band Kit','Underseat Band Anchor','Full Body Home Band Set','Mobility Stretch Band 2m'];
  for (let i = 0; i < rbItems.length; i++) {
    all.push(build(id(), rbItems[i], 'Gear', price(399, i),
      'Premium resistance band for strength training, rehab, yoga and mobility work.',
      'https://source.unsplash.com/900x700/?resistance,band,exercise,fitness,training',
      ['gear','resistance','strength','mobility','home-gym'], null, i));
  }

  // 27. Yoga & Pilates  15
  const yogaItems = ['Premium Cork Yoga Mat 6mm','Non-Slip PVC Yoga Mat 6mm','Travel Yoga Mat 1.5mm','Yoga Block Foam Pair','Cork Yoga Block Pair','Yoga Strap 3m Cotton','Yoga Wheel Large 33cm','Yoga Wheel Mini 25cm','Pilates Ring 14in','Pilates Ball 25cm','Yoga Bolster Meditation','Zafu Meditation Cushion','Yoga Towel Non-Slip Full','Balance Cushion Disc','Yoga Wedge Foam Pair'];
  for (let i = 0; i < yogaItems.length; i++) {
    all.push(build(id(), yogaItems[i], 'Gear', price(699, i),
      'Yoga or pilates prop for flexibility, balance and mind-body training.',
      'https://source.unsplash.com/900x700/?yoga,pilates,mat,meditation,flexibility',
      ['gear','yoga','pilates','flexibility','mobility'], null, i));
  }

  // 28. Boxing & Combat Sports  15
  const boxItems = ['Boxing Gloves 10oz','Boxing Gloves 12oz','Boxing Gloves 14oz','MMA Gloves Open Palm','Boxing Hand Wraps 4.5m Pair','Inner Gloves Gel Padded','Speed Bag','Double End Bag','Heavy Bag 30kg Filled','Focus Mitts Pair','Kick Pads Thai Pair','Muay Thai Shin Guards','MMA Groin Protector','Gum Shield Double','Headguard Training'];
  for (let i = 0; i < boxItems.length; i++) {
    all.push(build(id(), boxItems[i], 'Gear', price(799, i),
      'Combat sports equipment for boxing, MMA, Muay Thai and martial arts training.',
      'https://source.unsplash.com/900x700/?boxing,gloves,martial,arts,fighting',
      ['gear','boxing','combat','martial-arts','cardio'], null, i));
  }

  // 29. Recovery Equipment  20
  const recItems = ['Foam Roller Standard 45cm','Foam Roller Deep Ridged','Vibrating Foam Roller Pro','Massage Gun Percussion Pro','Massage Gun Mini Travel','Massage Roller Stick','Spiky Ball Reflexology','Lacrosse Ball Twin Pack','Cold Therapy Knee Wrap','Cold Therapy Shoulder Wrap','Compression Recovery Boots','TENS Muscle Stimulator','Infrared Sauna Blanket','Posture Corrector Brace','Inversion Table Premium','Stretching Mat Thick 15mm','Stretching Strap Multi-Loop','Acupressure Mat + Pillow Set','Epsom Salt 2kg Lavender','Ice Bath Tub Portable'];
  for (let i = 0; i < recItems.length; i++) {
    all.push(build(id(), recItems[i], 'Gear', price(599, i),
      'Recovery tool to reduce DOMS, improve circulation and speed post-workout healing.',
      'https://source.unsplash.com/900x700/?recovery,foam,roller,massage,therapy',
      ['gear','recovery','massage','mobility','wellness'], null, i));
  }

  // 30. Home Gym Systems  15
  const hgItems = ['Pull-Up & Dip Station Combo','Power Rack Squat Stand','Adjustable Weight Bench FID','Foldable Flat Bench','Smith Machine Compact','Wall-Mounted Pull-Up Bar','Free-Standing Dip Bars','Power Tower 4-in-1','Lat Pulldown Machine','Seated Cable Row Machine','Leg Press Plate Loaded','Pec Deck Fly Machine','Functional Trainer Cable','Hyperextension Roman Chair','Preacher Curl Bench'];
  for (let i = 0; i < hgItems.length; i++) {
    all.push(build(id(), hgItems[i], 'Gear', price(4999, i),
      'Heavy-duty home gym equipment for serious strength, hypertrophy and conditioning.',
      'https://source.unsplash.com/900x700/?home,gym,equipment,weights,fitness',
      ['gear','home-gym','strength','equipment','fitness'], null, i));
  }

  // 31. Sport-Specific Equipment  25 (running/cycling/swimming/basketball/tennis/football)
  const sportItems = ['Running Hydration Vest 5L','GPS Running Watch Sport','Cycling Bike Computer GPS','Road Cycling Gloves Padded','Mountain Bike Gloves Full-Finger','Swim Paddles Training','Pull Buoy Float','Kickboard Foam','Goggles Competitive Anti-Fog','Silicone Swim Cap','Basketball Grip Socks','Basketball Shooting Sleeve','Tennis Overgrip Roll 3pk','Squash Eye Guard','Badminton Shuttlecocks 6pk','Football Shin Guards Junior','Rugby Mouthguard','Cycling Helmet Lightweight','Trail Running Gaiters','Cross-Country Ski Poles','Golf Glove Left Hand','Table Tennis Paddle Pro','Volleyball Knee Pads','Rock Climbing Chalk Bag','Skateboard Helmet CE'];
  for (let i = 0; i < sportItems.length; i++) {
    all.push(build(id(), sportItems[i], 'Gear', price(899, i),
      'Sport-specific equipment for performance and protection during competition and training.',
      'https://source.unsplash.com/900x700/?sport,equipment,fitness,outdoor,performance',
      ['gear','sport','performance','outdoor','training'], null, i));
  }

  // ═══════════════════════════════════════════════════════════
  //  ACCESSORIES  (~120 products)
  // ═══════════════════════════════════════════════════════════

  // 32. Bags  20
  const bagItems = ['Gym Duffle Bag 40L Black','Gym Duffle Bag 60L XL','Backpack Gym 25L','Drawstring Gym Sack','Waterproof Duffle Bag','Rolling Sports Bag','Weekender Duffel Grey','Cross-Body Sports Bag','Belt Bag Fitness','Packable Nylon Bag','Shoe Bag Inner Compartment','Wet & Dry Gym Bag','Yoga Mat Tote Bag','Yoga Mat Carrier Strap Set','Swim Mesh Bag','Running Hydration Waist Pack','Trail Running Vest 5L','Race Number Belt','Running Waist Pouch','Arm Band Phone Holder'];
  for (let i = 0; i < bagItems.length; i++) {
    all.push(build(id(), bagItems[i], 'Accessories', price(699, i),
      'Durable, functional sports bag for gym, travel and outdoor activities.',
      'https://source.unsplash.com/900x700/?gym,bag,sports,backpack,duffle',
      ['accessory','bag','gym','travel','storage'], null, i));
  }

  // 33. Bottles & Shakers  20
  const bottleItems = ['Classic Shaker 700ml','Stainless Steel Shaker 500ml','BlenderBottle Pro 32oz','Smart Shaker Storage Compartment','Double-Wall Water Bottle 1L','Hydration Jug 1.5L','Gallon Water Jug 3.8L','Fruit Infuser Water Bottle','Protein Powder Funnel Set','Pill Organiser Travel 7-Day','Thermal Coffee Tumbler 480ml','Glass Water Bottle 750ml','BPA-Free Tritan Bottle 800ml','Cycling Bidon 650ml','Running Flask 250ml Soft','2-Bottle Hydration Belt','Collapsible Silicone Bottle','Kids Sports Bottle 400ml','Wide-Mouth Stainless 900ml','Straw Lid Bottle 1.2L'];
  for (let i = 0; i < bottleItems.length; i++) {
    all.push(build(id(), bottleItems[i], 'Accessories', price(449, i),
      'BPA-free, leak-proof bottle or shaker for gym, office and outdoor adventures.',
      'https://source.unsplash.com/900x700/?water,bottle,shaker,gym,fitness',
      ['accessory','bottle','hydration','shaker','gym'], null, i));
  }

  // 34. Gloves, Wraps & Grips  20
  const gloveItems = ['Weightlifting Gloves Full Finger','Weightlifting Gloves Half Finger','Palm Grip Pads Leather','Chalk Block Gym 8pc','Liquid Chalk Spray 250ml','Wrist Wraps 18in Stiff','Wrist Wraps 24in Pro','Figure-8 Lifting Straps','Lasso Cotton Straps','Deadlift Grip Socks','Elbow Wraps Padded 2m','Elbow Sleeves 7mm Pair','Knee Wraps 2.5m Pair','Knee Sleeves 7mm Pair','Wrist Brace Support Right','Thumb Loop Straps Leather','Versa Gripps Pro Medium','Gymnastics Grips Palm','Pull-Up Grips Silicone','Callous Shaver Tool'];
  for (let i = 0; i < gloveItems.length; i++) {
    all.push(build(id(), gloveItems[i], 'Accessories', price(499, i),
      'Training grip, support or protection gear for safer and more effective lifting.',
      'https://source.unsplash.com/900x700/?gym,gloves,wraps,grip,fitness',
      ['accessory','gloves','grip','support','strength'], null, i));
  }

  // 35. Towels, Hygiene & Wearable Accessories  20
  const towelItems = ['Microfibre Gym Towel Small','Microfibre Gym Towel Large','XL Cooling Sports Towel','Gym Towel 3-Pack','Antibacterial Gym Wipes 100pk','Hand Sanitiser Sport 100ml','Equipment Cleaning Spray 300ml','Non-Slip Yoga Mat Towel','Beach & Gym Towel 2-in-1','Sweat Headband Wide','Sweat Wristbands 2-Pack','Silicone Swim Cap','Nose Clip Swimming','Ear Plugs Silicone Swimming','Flip Flops Gym EVA','Lifting Belt Neoprene 4in','Shin Guards Soccer Foam','Compression Arm Sleeve UV','High-Vis Running Vest','Reflective Running Arm Band'];
  for (let i = 0; i < towelItems.length; i++) {
    all.push(build(id(), towelItems[i], 'Accessories', price(299, i),
      'Gym hygiene and wearable essential for cleanliness, safety and performance.',
      'https://source.unsplash.com/900x700/?gym,towel,hygiene,accessories,sport',
      ['accessory','hygiene','towel','gym','sport'], null, i));
  }

  // 36. Tech & Wearables  20
  const techItems = ['Sport Wireless Earbuds IPX5','Bone Conduction Headphones','Fitness Smart Band HR','GPS Running Watch Budget','Heart Rate Chest Strap Polar','Body Composition Scale Wi-Fi','Jump Rope Digital Counter','Interval Timer Gym Tabata','Stopwatch Clip-On 1/100s','Portable Speaker Waterproof','Workout Log Notebook A5','Exercise Dice Set 2pk','Fitness Playing Cards','Training Planner Journal','QR Code Gym Locker Tag','Smart Protein Scale 500g','Posture Sensor Wearable','Hydration Reminder Bottle LED','UV Steriliser Phone Box','Cable Organiser Gym Bag'];
  for (let i = 0; i < techItems.length; i++) {
    all.push(build(id(), techItems[i], 'Accessories', price(999, i),
      'Smart fitness accessory to track, monitor and optimise your training performance.',
      'https://source.unsplash.com/900x700/?fitness,tech,wearable,smartwatch,gadget',
      ['accessory','tech','wearable','tracking','performance'], null, i));
  }

  // 37. Misc Gym Accessories  20
  const miscItems = ['Gym Lock Combination','Gym Chalk Tray','Mirror Compact Sports','Resistance Band Storage Hook','Plate Tree Storage 10 Peg','Dumbbell Rack 3-Tier','Ab Mat Curved','GHD Sissy Squat Pad','Landmine Core Attachment','Dip Belt Chain 1m','Gymnastic Rings Wood Pair','TRX Style Suspension Trainer','Rogue Parallettes Low','Push-Up Handles Rotating','Ab Wheel Double Roller','Parallette Bar Set','Stretching Aid Stick','Trigger Point Needle 10cm','Self-Myofascial Knobber','Muscle Stick Vibrating'];
  for (let i = 0; i < miscItems.length; i++) {
    all.push(build(id(), miscItems[i], 'Accessories', price(399, i),
      'Versatile gym accessory to enhance your training setup and workout quality.',
      'https://source.unsplash.com/900x700/?gym,accessory,training,equipment,fitness',
      ['accessory','gym','training','equipment','versatile'], null, i));
  }

  // ═══════════════════════════════════════════════════════════
  //  HEALTH  (~130 products)
  // ═══════════════════════════════════════════════════════════

  // 38. Vitamins  30
  const vitNames = ['Vitamin C 1000mg','Vitamin D3 5000IU','Vitamin D3 + K2','Vitamin B12 Methylcobalamin','Vitamin B-Complex','Vitamin A Retinyl Palmitate','Vitamin E 400IU Mixed','Vitamin K2 MK-7 200mcg','Folate 5-MTHF 400mcg','Biotin 10000mcg','Niacin B3 Flush-Free 500mg','Pantothenic Acid B5 500mg','Pyridoxine B6 100mg','Vitamin C Liposomal 1000mg','Vitamin D3 Oral Spray','Zinc + Vitamin C Complex','Kids Multivitamin Gummies','Men\'s Sport Multivitamin','Women\'s Active Multivitamin','Over-50 Multivitamin Formula','One-A-Day Active Multi','Antioxidant Defence Complex','Fat-Soluble Vitamin Pack A+D+E+K','Whole Food Multivitamin','Sport Elite Multivitamin','Iron + Vitamin C 14mg','Calcium + D3 + K2','Magnesium + B6 Bisglycinate','Methylated B-Complex Active','Immune Vitamin Blend C+D+Zinc'];
  for (let i = 0; i < vitNames.length; i++) {
    all.push(build(id(), `${vitNames[i]} (90 caps)`, 'Health', price(499, i),
      'High-quality vitamin supplement for daily nutritional support and wellbeing.',
      'https://source.unsplash.com/900x700/?vitamin,supplement,capsule,health',
      ['health','vitamin','immunity','wellness','supplement'], null, i));
  }

  // 39. Minerals  20
  const minNames = ['Zinc Gluconate 50mg','Zinc Picolinate 15mg','Magnesium Citrate 400mg','Magnesium Malate 200mg','Magnesium Taurate 200mg','Calcium Carbonate 600mg','Calcium Citrate 500mg','Iron Bisglycinate 14mg','Selenium 200mcg','Chromium Picolinate 200mcg','Potassium Citrate 400mg','Copper Glycinate 2mg','Iodine Kelp 150mcg','Manganese Gluconate 5mg','Molybdenum 150mcg','Boron Citrate 10mg','Trace Mineral Complex Ionic','Silica 50mg Orthosilicic','Full Spectrum Mineral Complex','Ocean Minerals 60 capsules'];
  for (let i = 0; i < minNames.length; i++) {
    all.push(build(id(), `${minNames[i]} (120 tabs)`, 'Health', price(399, i),
      'Essential mineral for metabolic health, bones, immunity and enzymatic function.',
      'https://source.unsplash.com/900x700/?mineral,supplement,health,capsule',
      ['health','mineral','immunity','bone','wellness'], null, i));
  }

  // 40. Herbal & Adaptogens  25
  const herbNames = ['Rhodiola Rosea 500mg','Panax Ginseng Extract','Maca Root 3000mg','Tribulus Terrestris 90%','Fenugreek Extract 600mg','Holy Basil Tulsi 450mg','Shatavari Root 500mg','Brahmi Bacopa 300mg','Triphala Complex 1000mg','Amla Indian Gooseberry 1000mg','Neem Leaf Capsules','Hawthorn Berry Extract','Elderberry 4000mg Extract','Black Seed Nigella 500mg','Milk Thistle Silymarin 150mg','Dandelion Root 500mg','Burdock Root 450mg','Stinging Nettle Root 500mg','Red Clover Isoflavone Extract','Schisandra Berry 500mg','Gotu Kola Centella 450mg','Eleuthero Siberian Ginseng','Mucuna Pruriens L-Dopa 20%','Shilajit Resin 200mg','Cordyceps CS-4 Mycelia'];
  for (let i = 0; i < herbNames.length; i++) {
    all.push(build(id(), `${herbNames[i]} (60 caps)`, 'Health', price(699, i),
      'Adaptogenic herb for stress resilience, energy and hormonal balance.',
      'https://source.unsplash.com/900x700/?herbal,supplement,adaptogen,herb,natural',
      ['health','herbal','adaptogen','stress','hormones'], null, i));
  }

  // 41. Heart & Essential Fats  15
  const heartNames = ['Omega-3 Fish Oil 1000mg','Omega-3 Triple Strength 3000mg','Omega-3 EPA & DHA High Potency','Algae Omega-3 Vegan DHA','CLA Safflower Oil 1000mg','CoQ10 Ubiquinone 100mg','CoQ10 Ubiquinol 200mg','Red Yeast Rice 600mg','Nattokinase 2000FU','Aged Garlic Allicin 1000mg','Hawthorn + CoQ10 Blend','Berberine 500mg','Resveratrol 500mg Trans','Grape Seed Extract 300mg OPC','Alpha Lipoic Acid 600mg'];
  for (let i = 0; i < heartNames.length; i++) {
    all.push(build(id(), `${heartNames[i]} (90 softgels)`, 'Health', price(699, i),
      'Heart health supplement for cardiovascular support and healthy cholesterol levels.',
      'https://source.unsplash.com/900x700/?omega,fish,oil,heart,cardiovascular',
      ['health','heart','omega-3','cardiovascular','supplement'], null, i));
  }

  // 42. Immunity & Specialty  15
  const immNames = ['Echinacea + Zinc 1000mg','Elderberry Syrup 120ml','Vitamin C + Quercetin 1000mg','NAC N-Acetyl Cysteine 600mg','Glutathione Liposomal 250mg','Lactoferrin 250mg','Beta Glucan 500mg','Olive Leaf Extract 500mg','Oil of Oregano 150mg','Monolaurin 600mg','Colostrum 1000mg','Transfer Factor 200mg','Astragalus Root 500mg','Andrographis 400mg','Propolis Extract 500mg'];
  for (let i = 0; i < immNames.length; i++) {
    all.push(build(id(), `${immNames[i]} (60 caps)`, 'Health', price(599, i),
      'Immunity and antioxidant defence supplement for year-round health protection.',
      'https://source.unsplash.com/900x700/?immunity,supplement,vitamin,health,wellness',
      ['health','immunity','antioxidant','defence','supplement'], null, i));
  }

  // 43. Bone, Joint & Collagen  15
  const boneNames = ['Glucosamine Sulphate 1500mg','Chondroitin 1200mg','Glucosamine + Chondroitin + MSM','Collagen Type I & III Powder','Collagen Type II Chicken','Marine Collagen Peptides 10g','Hyaluronic Acid 200mg','Bone Broth Protein Powder','Silica 50mg + Calcium','Strontium Citrate 680mg','Ipriflavone 300mg','Vitamin K2 MK-4 + D3','Methylsulfonylmethane MSM 1g','UC-II Undenatured Collagen','Boswellia Serrata 400mg'];
  for (let i = 0; i < boneNames.length; i++) {
    all.push(build(id(), `${boneNames[i]} (90 caps)`, 'Health', price(799, i),
      'Bone and joint supplement for cartilage health, flexibility and mobility support.',
      'https://source.unsplash.com/900x700/?joint,collagen,bone,supplement,health',
      ['health','joint','bone','collagen','mobility'], null, i));
  }

  // ═══════════════════════════════════════════════════════════
  //  BODY CARE  (~50 products)
  // ═══════════════════════════════════════════════════════════

  // 44. Muscle & Joint Topicals  15
  const muscleTopicals = ['Deep Heat Muscle Cream 100g','Arnica Gel Pain Relief 100ml','CBD Muscle Balm 500mg 100ml','Magnesium Muscle Spray 200ml','Sports Recovery Lotion 200ml','Glucosamine Joint Cream 100g','Cooling Menthol Roll-On 50ml','Tiger Balm Red 50g','Deep Freeze Cold Gel 100g','Biofreeze Pro Gel 110g','Pain Relief Patch 10pk','Kinesiology Tape Roll 5m','Epsom Salt Muscle Soak 2kg','Post-Workout Recover Cream 150g','DMSO Dimethyl Sulphoxide Gel'];
  for (let i = 0; i < muscleTopicals.length; i++) {
    all.push(build(id(), muscleTopicals[i], 'Body Care', price(399, i),
      'Topical muscle and joint care product for soreness relief and faster recovery.',
      'https://source.unsplash.com/900x700/?muscle,cream,recovery,body,care,massage',
      ['body-care','recovery','muscle','pain-relief','topical'], null, i));
  }

  // 45. Active Skin Care  15
  const skinCare = ['SPF 50 Sport Sunscreen 200ml','SPF 30 Tinted Face Moisturiser','After-Sun Aloe Recovery Gel 150ml','Salicylic Sport Face Wash 150ml','Oil-Control Face Moisturiser 50ml','Sport Lip Balm SPF 30','Sweat-Proof Setting Spray 100ml','Pore-Clearing Clay Mask 100g','Vitamin C Brightening Serum 30ml','Hyaluronic Acid Serum 30ml','Retinol Night Repair Cream 50ml','Eye Cream Caffeine + Peptide','Exfoliating Face Scrub 100ml','Anti-Chafe Body Glide Stick','Natural Deodorant Sport 75g'];
  for (let i = 0; i < skinCare.length; i++) {
    all.push(build(id(), skinCare[i], 'Body Care', price(449, i),
      'Active skincare formulated for athletes with high sweat output and UV exposure.',
      'https://source.unsplash.com/900x700/?skincare,face,cream,sunscreen,athlete',
      ['body-care','skin','athlete','hydration','protection'], null, i));
  }

  // 46. Hair Care for Athletes  10
  const hairCare = ['Anti-Chlorine Shampoo 300ml','Protein Repair Shampoo 300ml','Dry Shampoo Sport Spray 200ml','Scalp Refresh Tonic 100ml','Post-Swim Conditioner 300ml','Sweat-Resistant Hair Gel 150ml','Biotin Hair Gummies 60pk','Keratin Repair Mask 200g','Argan Oil Hair Serum 100ml','Caffeine Shampoo 300ml'];
  for (let i = 0; i < hairCare.length; i++) {
    all.push(build(id(), hairCare[i], 'Body Care', price(349, i),
      'Hair care formulated for active lifestyles — handles frequent washing and heavy sweat.',
      'https://source.unsplash.com/900x700/?hair,care,shampoo,conditioner,athlete',
      ['body-care','hair','athlete','hygiene','natural'], null, i));
  }

  // 47. Personal Care  10
  const personalCare = ['Sports Deodorant 72h 50ml','Antibacterial Active Body Wash 300ml','Activated Charcoal Scrub 200g','Tea Tree Foot Cream 100ml','Blister Prevention Stick 42g','Compression Socks Pair EU42-44','Antifungal Foot Powder 100g','Shock-Absorbing Insoles UK9','Nail Clipper Sports Stainless','Foot Roller Wood Massage'];
  for (let i = 0; i < personalCare.length; i++) {
    all.push(build(id(), personalCare[i], 'Body Care', price(249, i),
      'Personal care essential designed for active, health-focused lifestyles.',
      'https://source.unsplash.com/900x700/?personal,care,hygiene,sport,wellness',
      ['body-care','hygiene','personal','athlete','wellness'], null, i));
  }

  // ── Extra Supplements to reach 1000 ──────────────────
  // 48. Sports Nutrition Specialty  20
  const sportsNutrNames = ['Betaine Anhydrous 2.5g','Citrulline Malate 2:1 5g','Nitrosigine Arginine Silicate','Hydromax Glycerol Powder','Agmatine Sulphate 500mg','S7 Plant-Based NO Blend','PeakATP Adenosine 400mg','ElevATP Ancient Peat Extract','TeaCrine Theacrine 100mg','Dynamine Methylliberine 100mg','CarnoSyn Beta-Alanine 3.2g','GlycerSize Powder 65%','HMB Free Acid 3g','Epicatechin 250mg','Laxogenin 100mg','Turkesterone 500mg Ajuga','Ecdysterone 300mg','KSM-66 Full-Spectrum 600mg','Sensoril Ashwagandha 500mg','Safr-Inside Saffron 28mg'];
  for (let i = 0; i < sportsNutrNames.length; i++) {
    all.push(build(id(), `${sportsNutrNames[i]} (60 caps)`, 'Supplements', price(1299, i),
      'Cutting-edge sports nutrition compound for advanced performance and body composition.',
      'https://source.unsplash.com/900x700/?supplement,sports,nutrition,capsule',
      ['supplement','sports-nutrition','performance','advanced','muscle'], null, i));
  }

  // 49. Gym Storage & Organisation  15 (Accessories)
  const storageItems = ['Plate Tree 10-Peg Black','Dumbbell Rack A-Frame 3-Tier','Kettlebell Storage Tree','Weight Bench Mat 1.2m','Cable Management Box','Gym Mirror 120×60cm','Whiteboard Workout Planner','Resistance Band Hanger Hook','Barbell Storage Rack Wall','Foam Tile Gym Floor 30×30cm','Gym Floor Tile Set 9pk','Wall Padding 60×60cm Panel','Cable Pulley Carabiner Set','Olympic Plate Holder Wall','Equipment Dolly Trolley'];
  for (let i = 0; i < storageItems.length; i++) {
    all.push(build(id(), storageItems[i], 'Accessories', price(599, i),
      'Gym organisation and storage solution to keep your training space safe and tidy.',
      'https://source.unsplash.com/900x700/?gym,storage,organisation,equipment,rack',
      ['accessory','storage','gym','organisation','home-gym'], null, i));
  }

  // Trim to exactly 1000
  return all.slice(0, 1000);
}

// ── Seed ─────────────────────────────────────────────────────────────────────
async function seed() {
  const products = generate();
  console.log(`Generated ${products.length} products. Seeding to Supabase in batches…`);

  const BATCH = 50;
  let total = 0;

  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    const { error } = await supabase
      .from('store_products')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`❌  Batch ${Math.floor(i/BATCH)+1} failed:`, error.message);
      process.exit(1);
    }

    total += batch.length;
    process.stdout.write(`\r   Seeded ${total} / ${products.length}…`);
  }

  console.log(`\n✅  Done! ${total} products seeded into store_products.`);
}

seed();
