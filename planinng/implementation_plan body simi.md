# Body Simulation & Dream Body Visualization Feature

Add a "Body Transformation Simulator" that lets users visualize their dream body and see their body evolving through milestone phases. Users can optionally upload a photo of their current body to enhance personalization. The simulation data also feeds into personalized diet & workout recommendations.

## User Review Required

> [!IMPORTANT]
> **AI Image Generation API Choice** — Generating body simulation images requires an AI image generation API. The most practical options are:
> 1. **OpenAI DALL-E 3 / gpt-image-1** — Best quality, $0.04–0.08 per image. Requires an OpenAI API key.
> 2. **Stability AI (Stable Diffusion)** — Good quality, cheaper. Requires a Stability API key.
> 3. **Gemini Imagen** — Google's offering, integrated with Gemini API.
> 4. **Mock/Placeholder approach** — Use algorithmically-generated SVG body silhouettes based on body metrics (no API cost, works offline, but less "wow" factor).
>
> **Which approach do you prefer?** I recommend starting with **Option 4 (SVG body silhouettes)** as the default that works offline + free, with an optional AI generation toggle when the user has configured an API key. This way the feature works immediately without external dependencies.

> [!IMPORTANT]
> **Current photo upload** — Should the uploaded body photo be stored locally only (SQLite + filesystem), or also synced to Supabase Storage? Local-only is simpler and more private; Supabase Storage enables cross-device access.

> [!WARNING]
> **Sensitivity** — Body simulation images must be handled carefully. The generated visualizations should be abstract/stylized body silhouettes, not photorealistic alterations of user photos, to avoid body dysmorphia concerns and ethical issues.

## Proposed Changes

### Overview

The feature consists of 4 main parts:

1. **Body Simulation Engine** (`bodySimulationEngine.ts`) — Calculates body shape parameters at each milestone phase based on user metrics, goals, and body type
2. **SVG Body Renderer** (`BodySilhouette` component) — Renders a stylized body silhouette using SVG based on calculated parameters
3. **Body Simulation Screen** (`body-simulation.tsx`) — Full-screen experience showing current → milestone phases → dream body with swipeable timeline
4. **Photo Upload Integration** — Optional current body photo capture/upload during onboarding and from the simulation screen

---

### Component 1: Body Simulation Engine

#### [NEW] [bodySimulationEngine.ts](file:///c:/Users/user/Desktop/Full%20stack%20Dev/project%20management%20system%20group%2086/Evolve-The_Body_Architect/calorie-tracker/src/lib/bodySimulationEngine.ts)

Core simulation logic that generates body shape parameters for each milestone phase:

- **Input**: `OnboardingProfile` (current metrics) + `BodyTypeResult` + dream goals
- **Output**: Array of `MilestonePhase` objects, each containing:
  - `phase`: number (0 = current, 1–4 = milestones, 5 = dream)
  - `label`: e.g. "Month 1", "Month 3", "Month 6", "Month 12", "Dream"
  - `estimatedWeightKg`, `estimatedBFPercent`
  - `bodyParams`: `{ shoulderWidth, chestWidth, waistWidth, hipWidth, armSize, legSize }` (normalized 0–1 values for SVG rendering)
  - `dietFocus`: string summary (e.g. "High protein, caloric surplus")
  - `workoutFocus`: string summary (e.g. "Hypertrophy: 4x/week upper/lower split")
  - `motivationalMessage`: string

Algorithm:
- Interpolates between current body measurements and dream body using realistic rate-of-change curves (not linear)
- Accounts for body type (ectomorphs gain muscle slower, endomorphs lose fat slower)
- Uses body fat % estimation to derive visual proportions
- Generates phase-appropriate diet & workout focus text

---

### Component 2: SVG Body Silhouette Renderer

#### [NEW] [BodySilhouette.tsx](file:///c:/Users/user/Desktop/Full%20stack%20Dev/project%20management%20system%20group%2086/Evolve-The_Body_Architect/calorie-tracker/components/BodySilhouette.tsx)

React Native SVG component that renders a stylized human body silhouette:

- Takes `bodyParams` + `gender` as props
- Renders a modern, abstract body outline using bezier curves
- Animated transitions between phases (morph effect using `react-native-reanimated`)
- Color-coded glow effects showing muscle growth areas vs fat loss areas
- Responsive sizing

---

### Component 3: Body Simulation Screen

#### [NEW] [body-simulation.tsx](file:///c:/Users/user/Desktop/Full%20stack%20Dev/project%20management%20system%20group%2086/Evolve-The_Body_Architect/calorie-tracker/app/body-simulation.tsx)

Full-screen immersive experience:

- **Header**: Gradient header with "Your Transformation Journey" title
- **Phase Timeline**: Horizontal scrollable timeline (dots/pills) showing: Current → Month 1 → Month 3 → Month 6 → Year 1 → Dream
- **Body Visualization**: Large centered `BodySilhouette` component that morphs when switching phases
- **Stats Panel**: Shows estimated weight, body fat %, key metrics for selected phase
- **Diet & Workout Focus**: Cards showing what the user should focus on at that phase
- **Motivational Quote**: Phase-specific motivational message
- **Photo Section**: "Upload your current body photo" card with camera/gallery options (optional)
- **Compare Mode**: Side-by-side current vs. selected phase view
- **Share/Save**: Option to save the simulation as an image

---

### Component 4: Integration Points

#### [MODIFY] [_layout.tsx](file:///c:/Users/user/Desktop/Full%20stack%20Dev/project%20management%20system%20group%2086/Evolve-The_Body_Architect/calorie-tracker/app/_layout.tsx)

Add `body-simulation` screen to the Stack navigator.

#### [MODIFY] [index.tsx](file:///c:/Users/user/Desktop/Full%20stack%20Dev/project%20management%20system%20group%2086/Evolve-The_Body_Architect/calorie-tracker/app/(tabs)/index.tsx)

Add a "Body Transformation" preview card on the home dashboard below the workout preview. Shows a mini silhouette comparison (current vs dream) with a "View Journey" CTA.

#### [MODIFY] [body-insights.tsx](file:///c:/Users/user/Desktop/Full%20stack%20Dev/project%20management%20system%20group%2086/Evolve-The_Body_Architect/calorie-tracker/app/body-insights.tsx)

Add a "Simulate My Transformation" button at the bottom of the body insights screen that navigates to the body simulation screen.

#### [MODIFY] [index.ts](file:///c:/Users/user/Desktop/Full%20stack%20Dev/project%20management%20system%20group%2086/Evolve-The_Body_Architect/calorie-tracker/src/types/index.ts)

Add new types: `MilestonePhase`, `BodySimulationParams`, `BodyPhotoRecord`.

#### [MODIFY] [database.ts](file:///c:/Users/user/Desktop/Full%20stack%20Dev/project%20management%20system%20group%2086/Evolve-The_Body_Architect/calorie-tracker/src/lib/database.ts)

- Add `body_photos` table for storing user body photos (local path, date taken, notes)
- Add `body_simulations` table for caching generated simulation data
- Add CRUD functions for both tables

#### [MODIFY] [profile-setup.tsx](file:///c:/Users/user/Desktop/Full%20stack%20Dev/project%20management%20system%20group%2086/Evolve-The_Body_Architect/calorie-tracker/app/(auth)/profile-setup.tsx)

In Step 7 (Dream Goals), add optional fields:
- **Dream body description** (text input) — e.g. "lean and athletic", "muscular", "toned"
- **Target body fat %** (optional numeric input)
- **Photo upload** — "Take or upload a photo of your current body" with camera/gallery buttons

---

### Component 5: Enhanced Workout & Diet Personalization

#### [MODIFY] [workoutEngine.ts](file:///c:/Users/user/Desktop/Full%20stack%20Dev/project%20management%20system%20group%2086/Evolve-The_Body_Architect/calorie-tracker/src/lib/workoutEngine.ts)

- Use simulation milestone data to adjust workout intensity progressively
- If "dream body" targets are set, bias exercise selection toward relevant muscle groups

#### [MODIFY] [calorieEngine.ts](file:///c:/Users/user/Desktop/Full%20stack%20Dev/project%20management%20system%20group%2086/Evolve-The_Body_Architect/calorie-tracker/src/lib/calorieEngine.ts)

- Incorporate dream weight goal into calorie calculations (deficit/surplus based on direction)
- Generate phase-specific macro ratios

---

## Open Questions

1. **API Key for AI generation** — Do you want to add an AI image generation option, or is the SVG silhouette approach sufficient for now?
2. **Photo storage** — Local-only or Supabase Storage sync?
3. **Dream body targets in onboarding** — Should we add dream body description and target BF% fields to onboarding Step 7, or keep the simulation setup separate?

## Verification Plan

### Automated Tests
- Run `npx expo start --web` and verify the simulation screen renders correctly
- Test the body simulation engine with various profiles (ecto/meso/endo, male/female, different goals)
- Verify navigation flows: Home → Simulation, Body Insights → Simulation, Profile Setup → Simulation

### Manual Verification
- Walk through the full flow: onboarding with photo upload → home screen preview card → simulation screen with phase navigation
- Verify the SVG silhouette morphing animation between phases
- Test edge cases: missing measurements, no dream weight set, extreme values
