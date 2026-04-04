# Personalized Workout Recommendation System

Build a dynamic, fully personalized workout planner into the existing Evolve 6 Expo app.
The engine runs **locally** (no external API needed) by combining the rich [OnboardingProfile](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/src/types/index.ts#167-231)
the app already collects with today's calorie/macro data to generate daily and weekly workout plans.

---

## Proposed Changes

### 1 — Types

#### [MODIFY] [index.ts](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/src/types/index.ts)

Add new exported types:

```ts
WorkoutCategory      // 'strength' | 'cardio' | 'flexibility' | 'hiit' | 'recovery' | 'mobility'
DifficultyLevel      // 'easy' | 'moderate' | 'hard' | 'intense'
MuscleGroup          // 'chest' | 'back' | 'shoulders' | 'arms' | 'core' | 'legs' | 'full_body' | 'cardio'

WorkoutExercise {
  id, name, category, muscleGroups, sets?, reps?, durationSec?,
  restSec, caloriesBurned, description, modifications (for injuries),
  equipment           // 'none' | 'dumbbells' | 'gym' | 'resistance_band'
}

WorkoutPlan {
  id, userId, generatedAt,
  weekStartDate,      // Monday of the week
  days: WorkoutDay[]  // 7 entries (including rest days)
  reasoning           // human-readable explanation of why this plan was chosen
}

WorkoutDay {
  dayOfWeek,          // 0=Sun … 6=Sat
  isRestDay,
  theme,              // e.g. 'Upper Body Strength', 'Active Recovery', 'HIIT'
  exercises: WorkoutExercise[],
  estimatedDurationMin,
  estimatedCaloriesBurned
}

WorkoutSession {
  id, userId, planId, dayDate,
  startedAt, completedAt,
  exerciseLogs: ExerciseLog[],
  totalCaloriesBurned, notes
}

ExerciseLog {
  exerciseId, exerciseName,
  setsCompleted, repsPerSet, durationSec,
  wasSkipped, effort   // 1-5 scale
}
```

---

### 2 — Workout Engine (pure, no API)

#### [NEW] [workoutEngine.ts](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/src/lib/workoutEngine.ts)

A deterministic, rule-based engine. Key logic:

| Input Signal | Effect on Plan |
|---|---|
| `fitness_level = beginner` | Low intensity, more rest days (4–5 rest/week) |
| `fitness_level = athlete` | 5–6 training days, high volume |
| `activity_level = sedentary` | Add daily 10-min mobility/walk sessions |
| Calorie deficit > 300 kcal | Reduce high-intensity sessions → LISS cardio |
| Calorie surplus today | Encourage strength/hypertrophy sessions |
| `body_type = ectomorph` | Strength focus, minimal cardio, higher rest |
| `body_type = endomorph` | Cardio + strength hybrid, HIIT 2x/week |
| `body_type = mesomorph` | Balanced PPL (Push/Pull/Legs) split |
| `dream_fitness_level = athlete` | Progressive overload plan |
| `dream_weight_kg < weight_kg` (cut) | Calorie-burning cardio priority |
| `dream_weight_kg > weight_kg` (bulk) | Strength priority, shorter cardio |
| Health condition `knee`/`joint` | Filter out squats, lunges, jumps → substitute seated/low-impact |
| Health condition `back` | No deadlifts, add core stabilization |
| Health condition `heart` | No HIIT → steady-state cardio only ≤ moderate intensity |
| `pregnancy_status = pregnant` | Pre-approved prenatal exercises only |
| `stress_level ≥ 4` | Add yoga/breathing days, reduce HIIT |
| `sleep_hours < 6` | Reduce intensity, add recovery day |

**Exercise library** (~80 exercises) baked into the file as a constant array — no network call.

**Variety engine:** Rotate plan seed by day-of-week + week number to prevent repetition.

**`generateWeeklyPlan(profile, calorieDataThisWeek): WorkoutPlan`** — main export.  
**`generateDailyPlan(profile, todayCalories): WorkoutDay`** — quick daily refresh.

---

### 3 — Database

#### [NEW] Supabase migration: `workout_plans` + `workout_sessions`

```sql
-- workout_plans: stores generated weekly plans per user
create table workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  week_start_date date not null,
  plan_json jsonb not null,      -- serialised WorkoutPlan
  reasoning text,
  generated_at timestamptz default now(),
  unique(user_id, week_start_date)
);

-- workout_sessions: stores logged workout sessions
create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  plan_id uuid references workout_plans,
  day_date date not null,
  started_at timestamptz,
  completed_at timestamptz,
  session_json jsonb not null,   -- serialised WorkoutSession
  total_calories_burned int,
  notes text,
  created_at timestamptz default now()
);

alter table workout_plans enable row level security;
alter table workout_sessions enable row level security;
create policy "Users see own plans" on workout_plans for all using (auth.uid() = user_id);
create policy "Users see own sessions" on workout_sessions for all using (auth.uid() = user_id);
```

#### [MODIFY] [database.ts](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/src/lib/database.ts)

Add helper functions:
- `saveWorkoutPlan(userId, plan)` — upsert by user + week
- `getWorkoutPlan(userId, weekStart)` — fetch cached plan
- `saveWorkoutSession(session)` — insert completed session
- `getWorkoutHistory(userId, limit)` — recent sessions
- `getWorkoutStreak(userId)` — count consecutive days with logged sessions

---

### 4 — New Tab: Workout

#### [NEW] [workout.tsx](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/app/%28tabs%29/workout.tsx)

Sections:
1. **Header** — greeting + "Your Plan for This Week"
2. **Reasoning pill** — small card explaining *why* this plan was generated (e.g. "Calorie deficit detected — lighter cardio today 🎯")
3. **Today's Workout Card** — expandable hero card with theme, duration, calorie burn estimate, and exercise list
4. **Weekly Schedule strip** — horizontal Mon–Sun scroll; each day shows type icon + rest/active badge; tap to preview another day
5. **Exercise Cards** — per exercise: name, sets×reps or duration, muscle groups, difficulty badge, equipment tag, expand for description + modifications
6. **"Start Workout" CTA** — navigates to `workout-session.tsx`
7. **History / Streak** — "🔥 3-day streak" + last 5 session summaries

#### [MODIFY] [_layout.tsx](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/app/%28tabs%29/_layout.tsx)

Add a 6th tab between Diary and Scan (or after Analytics):

```tsx
<Tabs.Screen
  name="workout"
  options={{
    title: 'Workout',
    tabBarIcon: ({ color, focused }) => (
      <Ionicons name={focused ? 'barbell' : 'barbell-outline'} size={24} color={color} />
    ),
  }}
/>
```

---

### 5 — Workout Session Screen

#### [NEW] [workout-session.tsx](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/app/workout-session.tsx)

- Receives `WorkoutDay` via router params
- Step-through view: one exercise at a time with animated progress
- Rest timer countdown (circle animation)
- "Mark Complete / Skip / Modify" actions per exercise
- Running total: calories burned, time elapsed
- Final "Finish Session" → logs to DB, shows summary card

---

### 6 — Home Screen Integration

#### [MODIFY] [index.tsx](file:///c:/Users/user/Desktop/computing%20project%20PUSL3190/Computing%20Projects/Evolve%206/calorie-tracker/app/%28tabs%29/index.tsx)

Add a **"Today's Workout" preview card** below macros:
- Shows today's workout theme/emoji, duration, exercise count
- "Start" button shortcut (navigates to Workout tab)
- Shows "Rest Day 😴" if today is a rest day

---

## Verification Plan

> [!NOTE]
> There are no existing automated tests in this project. All verification is manual via the running Expo dev server at `localhost:8081`.

### Manual Verification Steps

1. **Plan Generation**
   - Open the app, navigate to **Workout** tab
   - Confirm a weekly plan is displayed with 7 days (some rest, some active)
   - Tap different days on the weekly strip to confirm unique themes rotate

2. **Profile-Driven Customization**
   - Go to **Profile → Edit Health Profile**
   - Set health condition to "knee injury" → return to Workout tab → confirm squats/lunges/jump exercises are absent
   - Set fitness level to "beginner" → confirm ≥3 rest days in the week, exercises marked "easy"

3. **Calorie Integration**
   - Log a very low-calorie day (< 500 kcal) via Diary → refresh Workout tab → confirm the reasoning pill mentions "lower intensity" or "recovery"

4. **Workout Session Flow**
   - Tap "Start Workout" on any active day
   - Step through 2–3 exercises, mark complete
   - Tap "Finish Session" → confirm session summary is shown, history section on Workout tab updates

5. **Home Screen Card**
   - Navigate to Home → confirm the "Today's Workout" card appears with the correct theme
   - Tap "Start" → confirm you land on the Workout tab or session screen
