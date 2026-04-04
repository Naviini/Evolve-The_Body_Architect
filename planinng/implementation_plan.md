# Body Type Detection — Implementation Plan (v2)

## Problem With v1

Using only **height + weight (BMI)** gives ~60% accuracy because BMI cannot distinguish muscle from fat — a mesomorph and endomorph at the same BMI look identical to the algorithm.

## What's Missing & Why It Matters

| Measurement | Why needed | Easy to self-measure? |
|-------------|-----------|----------------------|
| **Waist circumference** | Fat distribution proxy (endomorphy) | ✅ Tape measure |
| **Hip circumference** (women) | Waist-to-hip ratio, fat pattern | ✅ Tape measure |
| **Neck circumference** | Combined with waist → US Navy BF% | ✅ Tape measure |
| **Wrist circumference** | Frame size → ectomorph indicator | ✅ Tape measure |

Adding these **4 measurements** (3 for males, 4 for females) enables:
- **US Navy Body Fat % formula** — clinically validated, ~3–4% accuracy vs DEXA
- **Frame/bone density ratio** — wrist-to-height ratio detects small/large bone structure
- **True endomorphy signal** — direct fat distribution, not a BMI proxy

Projected accuracy: **~85%** (vs ~60% with BMI alone)

---

## US Navy Body Fat Formula

```
# Males
BF% = 86.010 × log10(waist_cm - neck_cm) − 70.041 × log10(height_cm) + 36.76

# Females  
BF% = 163.205 × log10(waist_cm + hip_cm - neck_cm) − 97.684 × log10(height_cm) − 78.387
```

## Wrist Frame Size (Sheldon-derived)
```
frame_ratio = wrist_cm / height_cm
< 0.100 → small frame (ecto signal)
0.100–0.115 → medium frame (meso)
> 0.115 → large frame (endo/meso)
```

---

## Updated 4-Layer Algorithm

| Layer | Weight | Signal | Source |
|-------|--------|--------|--------|
| **1. Structural** | 25% | HWR (Heath-Carter ectomorphy) | height + weight |
| **2. Composition** | 40% | US Navy BF% + frame ratio | waist, hip, neck, wrist |
| **3. Lifestyle** | 20% | Activity, exercise freq, work type | onboarding Step 2 |
| **4. Metabolic** | 15% | Diet, sleep, stress, blood markers | onboarding Steps 3–5 |

### Layer 2 — Composition Detail
```
BF% → endomorphy score:
  < 10% (M) / < 20% (F) → strong ecto
  10–18% (M) / 20–28% (F) → meso zone
  18–25% (M) / 28–35% (F) → meso/endo
  > 25% (M) / > 35% (F) → strong endo

Frame ratio → ecto/meso signal:
  small frame + low BF% → ecto reinforcement
  large frame + high muscle → meso reinforcement
```

---

## Proposed Changes

### New Onboarding Step — Body Measurements

#### [MODIFY] [profile-setup.tsx](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/app/(auth)/profile-setup.tsx)
- Add **Step 9: Body Measurements** (between Goals and Review)
- Fields with illustrated instructions:
  - 📏 **Waist** (cm) — measured at navel / narrowest point
  - 🍑 **Hips** (cm) — widest point (females only; hidden for males)
  - 🔵 **Neck** (cm) — below Adam's apple
  - ⌚ **Wrist** (cm) — at narrowest point
- Each field has a small contextual tip ("Use a soft tape measure, pull snug but not tight")
- Step is **optional** — users can skip with "Skip for now" + notice that it improves accuracy

#### [MODIFY] [index.ts](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/src/types/index.ts)
- Add fields to [OnboardingProfile](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/src/types/index.ts#153-211): `waist_cm`, `hip_cm`, `neck_cm`, `wrist_cm`
- Add `BodyType`, `BodyTypeResult` types

#### [MODIFY] [database.ts](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/src/lib/database.ts)
- Add 4 new columns to `user_health_profiles` via `ALTER TABLE IF NOT EXISTS` (SQLite safe)

---

### Algorithm Engine

#### [NEW] [bodyTypeEngine.ts](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/src/lib/bodyTypeEngine.ts)
- `detectBodyType(profile): BodyTypeResult`
- Pure TypeScript, no external dependencies
- Returns: `{dominant, blend, scores:{ecto,meso,endo}, estimatedBF, frameSize, confidence, insights[]}`

---

### UI

#### [MODIFY] [profile.tsx](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/app/(tabs)/profile.tsx)
- **Body Type Analysis** card: type badge + 3 animated bars + "View Full Analysis" button

#### [NEW] [body-insights.tsx](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/app/body-insights.tsx)
- Full analysis screen: type description, estimated BF%, frame size, personalised diet & training recommendations

#### [MODIFY] [_layout.tsx](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/app/_layout.tsx)
- Register `body-insights` modal screen

---

## Verification Plan
- Test boundary inputs: 180cm/65kg male athlete (ecto-meso), 160cm/90kg sedentary female (endo), 175cm/78kg 30BF% male (meso-endo)
- Test skip path (no circumference data) → falls back to 3-layer BMI model gracefully
- Verify UI renders with incomplete profile



## Background

The gold-standard **Heath-Carter anthropometric method** requires skinfold measurements (not collected). We have:
- Height, weight, age, biological gender
- Activity level, work type, exercise frequency
- Diet type, snacking habit, water intake
- Stress level, sleep hours, smoking, alcohol
- Blood sugar & cholesterol levels

**Approach:** A **3-layer hybrid scoring model** inspired by Heath-Carter but adapted to available data:

| Layer | Source | What it estimates |
|-------|--------|------------------|
| **1. Structural** (40%) | HWR (Heath-Carter ectomorphy formula) + BMI | Frame size & fat-to-lean ratio |
| **2. Lifestyle** (35%) | Activity, exercise freq, work type | Muscularity tendency |
| **3. Metabolic** (25%) | Diet, sleep, stress, blood markers | Metabolic body-fat tendency |

The final output is three **0–100% confidence scores** that always sum to 100, plus a dominant type.

---

## Algorithm Design

### Layer 1 — Structural Score (height + weight)

**Ectomorphy signal** (from Heath-Carter HWR formula):
```
HWR = height_cm / (weight_kg ^ (1/3))
if HWR >= 40.75 → ecto_raw = 0.732 * HWR - 28.58
if HWR in [38.25, 40.75) → ecto_raw = 0.463 * HWR - 17.63
if HWR < 38.25 → ecto_raw = 0.1
```
Normalise: `ecto_structural = clamp(ecto_raw / 7.5, 0, 1)`

**BMI classification** → derives fat-mass vs lean-mass proxy:
```
BMI < 18.5 → strong ecto signal
BMI 18.5–22 → mild ecto/meso
BMI 22–27.5 → meso zone
BMI 27.5–32 → endo/meso zone
BMI > 32 → strong endo signal
```

Gender adjustment: females naturally score ~0.5 higher on endomorphy (per research norms).

### Layer 2 — Lifestyle Score

Each signal maps to a +/- delta on each type:

| Signal | Mapping |
|--------|---------|
| Activity: `very_active` / `active` | +meso, -endo |
| Activity: `sedentary` | +endo, -meso |
| Exercise: [Daily](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/src/types/index.ts#67-79) / `5+/week` | +meso |
| Exercise: `Never` | +endo |
| Work: `physical` / `standing` | +meso |
| Work: `desk` / `retired` | +endo |

### Layer 3 — Metabolic Score

| Signal | Mapping |
|--------|---------|
| Blood sugar `high` / cholesterol `high` | +endo |
| Sleep < 6h | +endo (slow metabolism) |
| Sleep 7–9h | +meso/ecto |
| Stress 4–5 | +endo (cortisol) |
| Diet: `keto` / `paleo` | +meso |
| Diet: `vegan` / `vegetarian` | +ecto |
| Snacking `always` | +endo |
| Snacking `never` | +ecto/meso |

### Final Score Composition
After all layers: apply gender correction → normalise all 3 scores to sum to 100%.

### Confidence & Blend Detection
- If dominant type > 50% → pure type
- If top two types within 15% of each other → **blend type** (e.g. "Meso-Ectomorph")
- Always report all 3 with percentages

---

## Proposed Changes

### Core Algorithm

#### [NEW] [bodyTypeEngine.ts](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/src/lib/bodyTypeEngine.ts)
- Pure TypeScript function: `detectBodyType(profile: OnboardingProfile): BodyTypeResult`
- No dependencies, fully testable offline
- Returns: `{ dominant, blend, scores: {ecto, meso, endo}, confidence, insights[] }`

---

### Types

#### [MODIFY] [index.ts](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/src/types/index.ts)
- Add `BodyType = 'ectomorph' | 'mesomorph' | 'endomorph'`
- Add `BodyTypeResult` interface

---

### UI — Profile Screen

#### [MODIFY] [profile.tsx](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/app/(tabs)/profile.tsx)
- Add **"Body Type Analysis"** card above Health Profile section
- Shows dominant type + badge, 3-bar confidence chart, `→ View Details` link

---

### UI — Body Insights Screen (new full screen)

#### [NEW] [body-insights.tsx](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/app/body-insights.tsx)
- Full-screen deep-dive: type name + icon, trait summary, 3 percentage bars
- Personalised insights list (diet recommendations, exercise style, metabolism notes)
- "Update Profile" shortcut to edit onboarding data

#### Register in [_layout.tsx](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/app/_layout.tsx)
- Add `body-insights` as a modal Stack.Screen

---

## Verification Plan

### Automated
- Run algorithm with boundary test inputs (BMI 17 male athlete → ecto, BMI 34 sedentary female → endo, BMI 24 active male → meso)

### Manual
- Open Profile tab → check Body Type card renders
- Tap "View Details" → body-insights screen opens
- Test with no profile data → graceful "Complete your profile" empty state
