# Onboarding Flow — Walkthrough

## What Was Built

A comprehensive **8-step health & lifestyle onboarding** that collects user data conversationally across these screens:

| Step | Title | What It Collects |
|------|-------|-----------------|
| 1 | About You | Gender, age, height/weight (with live BMI), nationality, activity level |
| 2 | Your Routine | Work type, wake/sleep times, commute, exercise frequency |
| 3 | Your Diet | Diet type, meals/day, snacking, water intake, allergies, cuisine prefs |
| 4 | Your Health | Blood sugar, cholesterol, conditions, medications, family history |
| 5 | Your Lifestyle | Smoking, alcohol, sleep, stress (emoji scale), marital status, pregnancy/kids |
| 6 | Your Thoughts | Free-text area for personal health notes |
| 7 | Dream Self | Dream weight (with BMI guide), fitness level, food habits, daily routine goals |
| 8 | Review | Summary cards with Edit buttons to jump back to any step |

## Files Changed

| File | Change |
|------|--------|
| [profile-setup.tsx](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/app/(auth)/profile-setup.tsx) | **NEW** — 1330-line onboarding flow with all 8 steps |
| [index.ts](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/src/types/index.ts) | Added [OnboardingProfile](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/src/types/index.ts#153-211) interface + 12 union types |
| [database.ts](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/src/lib/database.ts) | Added `user_health_profiles` table, [saveOnboardingProfile()](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/src/lib/database.ts#459-546), [getOnboardingProfile()](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/src/lib/database.ts#547-572) |
| [_layout.tsx](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/app/(auth)/_layout.tsx) | Added `profile-setup` screen to auth stack |
| [onboarding.tsx](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/app/(auth)/onboarding.tsx) | Changed "Get Started" to navigate to profile-setup instead of register |

## User Flow

```
3-page welcome intro → Profile Setup (8 steps) → Register → Verify Email → Main App
```

## UI Features

- **Animated progress bar** with "Step X of 8" label
- **Pill pickers** with emoji icons for quick selection
- **Multi-chip selectors** with checkmark toggles for multi-select fields
- **Live BMI calculator** on both current weight and dream weight
- **Healthy weight range guide** based on user's height
- **Emoji stress scale** (😊 → 😰)
- **Conditional fields** (kids details only show if "Have Kids" is selected)
- **Review screen** with edit buttons to jump back to any section
- **Gradient CTA buttons** matching each step's colour theme

## Data Storage

All profile data is saved to local SQLite (`user_health_profiles` table) using [saveOnboardingProfile()](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/src/lib/database.ts#459-546). Array fields (allergies, conditions, etc.) are JSON-serialized. The profile uses a temporary user ID (`onboarding-temp`) during onboarding and can be re-associated after registration.

## Testing Notes

To re-test the onboarding flow, clear the app's AsyncStorage (the `@calorie_tracker_onboarding_done` key) or reinstall the app to trigger the intro → profile → register flow again.
