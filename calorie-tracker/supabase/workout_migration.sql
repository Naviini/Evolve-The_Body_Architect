-- ============================================================
-- Evolve 6 — Personalized Workout Feature Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── workout_plans: stores AI-generated weekly plans ─────────
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  plan_json       JSONB NOT NULL,       -- serialised WorkoutPlan object
  reasoning       TEXT,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start_date)
);

-- ── workout_sessions: stores completed workout sessions ──────
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id               UUID REFERENCES public.workout_plans(id),
  day_date              DATE NOT NULL,
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  session_json          JSONB NOT NULL,  -- serialised WorkoutSession object
  total_calories_burned INTEGER DEFAULT 0,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workout_plans_user_week
  ON public.workout_plans (user_id, week_start_date DESC);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date
  ON public.workout_sessions (user_id, day_date DESC);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE public.workout_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see/write their own data
CREATE POLICY "workout_plans_own"
  ON public.workout_plans FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "workout_sessions_own"
  ON public.workout_sessions FOR ALL
  USING (auth.uid() = user_id);
