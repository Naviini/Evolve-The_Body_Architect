-- ============================================================
-- Evolve - Onboarding Health Profile (Supabase)
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_health_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  biological_gender     TEXT,
  gender_identity       TEXT,
  age                   INT,
  height_cm             FLOAT,
  weight_kg             FLOAT,
  nationality_or_race   TEXT,
  activity_level        TEXT,

  work_type             TEXT,
  wake_time             TEXT,
  sleep_time            TEXT,
  commute_type          TEXT,
  exercise_frequency    TEXT,

  diet_type             TEXT,
  meals_per_day         INT,
  snacking_habit        TEXT,
  water_intake_glasses  INT,
  food_allergies        JSONB NOT NULL DEFAULT '[]'::jsonb,
  cuisine_preferences   JSONB NOT NULL DEFAULT '[]'::jsonb,

  blood_sugar_level     TEXT,
  cholesterol_level     TEXT,
  health_conditions     JSONB NOT NULL DEFAULT '[]'::jsonb,
  medications           TEXT,
  family_history        JSONB NOT NULL DEFAULT '[]'::jsonb,

  smoking_status        TEXT,
  alcohol_frequency     TEXT,
  sleep_hours           FLOAT,
  stress_level          INT,
  marital_status        TEXT,
  pregnancy_status      TEXT,
  num_children          INT,
  children_notes        TEXT,

  personal_notes        TEXT,

  dream_weight_kg       FLOAT,
  dream_fitness_level   TEXT,
  dream_food_habits     JSONB NOT NULL DEFAULT '[]'::jsonb,
  dream_daily_routine   TEXT,
  dream_special_habits  JSONB NOT NULL DEFAULT '[]'::jsonb,

  waist_cm              FLOAT,
  hip_cm                FLOAT,
  neck_cm               FLOAT,
  wrist_cm              FLOAT,

  body_type_dominant    TEXT,
  body_type_blend       TEXT,
  body_type_ecto        INT,
  body_type_meso        INT,
  body_type_endo        INT,
  body_type_bf          FLOAT,
  body_type_frame       TEXT,
  body_type_confidence  TEXT,
  body_type_insights    JSONB NOT NULL DEFAULT '[]'::jsonb,
  body_type_updated_at  TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_health_profiles_user
  ON public.user_health_profiles(user_id);

ALTER TABLE public.user_health_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_health_profiles_own_select"
  ON public.user_health_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_health_profiles_own_insert"
  ON public.user_health_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_health_profiles_own_update"
  ON public.user_health_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "user_health_profiles_own_delete"
  ON public.user_health_profiles FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_user_health_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_health_profiles_updated_at ON public.user_health_profiles;
CREATE TRIGGER trg_user_health_profiles_updated_at
  BEFORE UPDATE ON public.user_health_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_user_health_profiles_updated_at();
