-- =============================================================
-- Calorie Tracker — Supabase Database Migration
-- =============================================================
-- How to run:
--   1. Open your Supabase project dashboard
--   2. Go to SQL Editor (left sidebar)
--   3. Click "New Query"
--   4. Paste this entire file and click "Run"
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. PROFILES — extends Supabase Auth users
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  daily_calorie_goal INT DEFAULT 2000,
  height_cm FLOAT,
  weight_kg FLOAT,
  age INT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fires after every auth.users INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 2. FOOD ITEMS — nutrition database
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  serving_size FLOAT NOT NULL DEFAULT 100,
  serving_unit TEXT NOT NULL DEFAULT 'g',
  calories FLOAT NOT NULL,
  protein_g FLOAT DEFAULT 0,
  carbs_g FLOAT DEFAULT 0,
  fat_g FLOAT DEFAULT 0,
  fiber_g FLOAT DEFAULT 0,
  image_url TEXT,
  barcode TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast food name search
CREATE INDEX IF NOT EXISTS idx_food_items_name ON food_items USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_food_items_barcode ON food_items(barcode) WHERE barcode IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 3. MEAL ENTRIES — individual logged meals
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  food_item_id UUID REFERENCES food_items(id),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name TEXT NOT NULL,
  servings FLOAT NOT NULL DEFAULT 1,
  calories FLOAT NOT NULL,
  protein_g FLOAT DEFAULT 0,
  carbs_g FLOAT DEFAULT 0,
  fat_g FLOAT DEFAULT 0,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_meal_entries_user_date ON meal_entries(user_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_meal_entries_user_type ON meal_entries(user_id, meal_type);

-- ─────────────────────────────────────────────────────────────
-- 4. DAILY LOGS — aggregated daily totals
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  total_calories FLOAT DEFAULT 0,
  total_protein_g FLOAT DEFAULT 0,
  total_carbs_g FLOAT DEFAULT 0,
  total_fat_g FLOAT DEFAULT 0,
  water_ml INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, log_date);

-- ─────────────────────────────────────────────────────────────
-- 5. SCAN HISTORY — image recognition logs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  recognized_food TEXT,
  confidence FLOAT,
  estimated_calories FLOAT,
  was_accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_history_user ON scan_history(user_id, created_at DESC);

-- =============================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================
-- Enable RLS on all tables so users can only access their own data

-- Profiles: users can read/update only their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Food Items: anyone can read, authenticated users can insert
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view food items"
  ON food_items FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert food items"
  ON food_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own food items"
  ON food_items FOR UPDATE
  USING (auth.uid() = created_by);

-- Meal Entries: users can CRUD only their own
ALTER TABLE meal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meals"
  ON meal_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meals"
  ON meal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meals"
  ON meal_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meals"
  ON meal_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Daily Logs: users can CRUD only their own
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily logs"
  ON daily_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily logs"
  ON daily_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily logs"
  ON daily_logs FOR UPDATE
  USING (auth.uid() = user_id);

-- Scan History: users can CRUD only their own
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scans"
  ON scan_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scans"
  ON scan_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================================
-- HELPER: auto-update updated_at timestamp
-- =============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_entries_updated_at
  BEFORE UPDATE ON meal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_logs_updated_at
  BEFORE UPDATE ON daily_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
