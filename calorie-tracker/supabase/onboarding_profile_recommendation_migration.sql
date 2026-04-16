-- ============================================================
-- Evolve - Onboarding Recommendation Metadata Columns
-- Run this after onboarding_profile_migration.sql
-- ============================================================

ALTER TABLE public.user_health_profiles
  ADD COLUMN IF NOT EXISTS recommended_daily_calories INT,
  ADD COLUMN IF NOT EXISTS recommendation_bmr INT,
  ADD COLUMN IF NOT EXISTS recommendation_tdee INT,
  ADD COLUMN IF NOT EXISTS recommendation_activity_multiplier FLOAT,
  ADD COLUMN IF NOT EXISTS recommendation_goal_adjustment_pct FLOAT,
  ADD COLUMN IF NOT EXISTS recommendation_reasons JSONB NOT NULL DEFAULT '[]'::jsonb;
