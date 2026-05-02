-- ============================================================
-- Storage RLS Policies — body-photos bucket
--
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Without these policies, only the service role can upload.
-- Authenticated users need explicit INSERT/SELECT/DELETE grants.
-- ============================================================

-- Allow authenticated users to upload to their own folder (userId/*)
CREATE POLICY "Users can upload their own body photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'body-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Authenticated users can only list/access their own folder via the API.
-- Direct https:// URLs still work in Image components because the bucket
-- is set to PUBLIC — the bucket public flag controls URL access independently
-- of these RLS policies (which control API-level listing).
CREATE POLICY "Users can view their own body photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'body-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to overwrite their own photos (upsert)
CREATE POLICY "Users can update their own body photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'body-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete their own body photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'body-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
