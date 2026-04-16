-- Add new columns to user_health_profiles for dream body simulation details
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS body_type_insights JSONB DEFAULT '[]'::jsonb;
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS body_type_updated_at TIMESTAMPTZ;
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS dream_body_style TEXT;
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS dream_body_description TEXT;
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS target_bf_percent REAL;

-- Create table for body_photos
CREATE TABLE IF NOT EXISTS body_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    local_uri TEXT NOT NULL,
    date_taken TEXT NOT NULL,
    phase INTEGER DEFAULT -1,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_body_photos_user_id ON body_photos(user_id);

-- Enable RLS for body_photos
ALTER TABLE body_photos ENABLE ROW LEVEL SECURITY;

-- Create policies for body_photos
CREATE POLICY "Users can view their own body photos."
    ON body_photos FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own body photos."
    ON body_photos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own body photos."
    ON body_photos FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own body photos."
    ON body_photos FOR DELETE
    USING (auth.uid() = user_id);

-- Create table for body_simulations cache
CREATE TABLE IF NOT EXISTS body_simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    phases_json JSONB NOT NULL,
    dream_body_style TEXT,
    dream_body_description TEXT,
    target_bf_percent REAL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS for body_simulations
ALTER TABLE body_simulations ENABLE ROW LEVEL SECURITY;

-- Create policies for body_simulations
CREATE POLICY "Users can view their own body simulations."
    ON body_simulations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own body simulations."
    ON body_simulations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own body simulations."
    ON body_simulations FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own body simulations."
    ON body_simulations FOR DELETE
    USING (auth.uid() = user_id);
