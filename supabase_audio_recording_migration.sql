-- ============================================================================
-- Rewa Sahayak AI — Citizen Voice Recording Migration Script
-- Safe, Idempotent, Reversible Database Schema & Storage Configuration
-- ============================================================================

-- 1. Extend citizen_reports table with audio attachment columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'citizen_reports' 
          AND column_name = 'voice_audio_path'
    ) THEN
        ALTER TABLE public.citizen_reports 
        ADD COLUMN voice_audio_path TEXT DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'citizen_reports' 
          AND column_name = 'voice_audio_duration'
    ) THEN
        ALTER TABLE public.citizen_reports 
        ADD COLUMN voice_audio_duration NUMERIC DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'citizen_reports' 
          AND column_name = 'voice_audio_mime_type'
    ) THEN
        ALTER TABLE public.citizen_reports 
        ADD COLUMN voice_audio_mime_type TEXT DEFAULT 'audio/webm';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'citizen_reports' 
          AND column_name = 'public_audio_consent'
    ) THEN
        ALTER TABLE public.citizen_reports 
        ADD COLUMN public_audio_consent BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- 2. Create index on voice_audio_path for fast association lookup
CREATE INDEX IF NOT EXISTS idx_citizen_reports_voice_audio 
ON public.citizen_reports(voice_audio_path) 
WHERE voice_audio_path IS NOT NULL;

-- 3. Create 'report-recordings' Supabase Storage Bucket if missing
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'report-recordings',
    'report-recordings',
    true,
    15728640, -- 15MB limit
    ARRAY['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/aac', 'audio/m4a']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/aac', 'audio/m4a'];

-- 4. Storage Row Level Security (RLS) Policies
-- Allow public uploads to 'report-recordings' bucket for citizen voice grievances
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow public uploads for citizen report recordings" ON storage.objects;
    CREATE POLICY "Allow public uploads for citizen report recordings"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'report-recordings');

    DROP POLICY IF EXISTS "Allow public read access to citizen report recordings" ON storage.objects;
    CREATE POLICY "Allow public read access to citizen report recordings"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'report-recordings');
END $$;

COMMENT ON COLUMN public.citizen_reports.voice_audio_path IS 'Supabase Storage reference path or durable URL for citizen voice grievance';
COMMENT ON COLUMN public.citizen_reports.voice_audio_duration IS 'Duration of audio recording in seconds';
COMMENT ON COLUMN public.citizen_reports.voice_audio_mime_type IS 'MIME type of recorded audio (e.g. audio/webm, audio/mp4)';
COMMENT ON COLUMN public.citizen_reports.public_audio_consent IS 'Flag indicating if citizen consented to public playback on tracking portal';
