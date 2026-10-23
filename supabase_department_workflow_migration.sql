-- ============================================================================
-- REWA SAHAYAK AI — Department Workflow & Automatic Resolution Migration
-- ============================================================================
-- This migration script is safe and IDEMPOTENT.
-- Run it directly in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ucluzodlwotljgatmhdg/sql
-- ============================================================================

-- 1. Extend citizen_reports with worker execution & completion tracking columns
ALTER TABLE public.citizen_reports
  ADD COLUMN IF NOT EXISTS worker_instructions TEXT,
  ADD COLUMN IF NOT EXISTS assigned_worker_id UUID,
  ADD COLUMN IF NOT EXISTS work_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_note TEXT,
  ADD COLUMN IF NOT EXISTS completed_by UUID,
  ADD COLUMN IF NOT EXISTS completed_by_name TEXT,
  ADD COLUMN IF NOT EXISTS completion_image_path TEXT,
  ADD COLUMN IF NOT EXISTS resolution_note TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- 2. Extend department_workers with auth linkage and activation status
ALTER TABLE public.department_workers
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS department_key TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT;

-- 3. Create worker_notifications table for real-time alerts
CREATE TABLE IF NOT EXISTS public.worker_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID,
  report_id UUID REFERENCES public.citizen_reports(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'assignment',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast notification lookups
CREATE INDEX IF NOT EXISTS idx_worker_notifications_worker
  ON public.worker_notifications(worker_id, is_read, created_at DESC);

-- 4. Create department_audit_logs table for administrative trail
CREATE TABLE IF NOT EXISTS public.department_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  department_name TEXT,
  performed_by TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dept_audit_logs_created
  ON public.department_audit_logs(created_at DESC);

-- 5. Enable Row Level Security (RLS) on newly created tables
ALTER TABLE public.worker_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated users to read notifications and audit logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'worker_notifications' AND policyname = 'Allow read worker_notifications'
  ) THEN
    CREATE POLICY "Allow read worker_notifications"
      ON public.worker_notifications FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'worker_notifications' AND policyname = 'Allow insert worker_notifications'
  ) THEN
    CREATE POLICY "Allow insert worker_notifications"
      ON public.worker_notifications FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'worker_notifications' AND policyname = 'Allow update worker_notifications'
  ) THEN
    CREATE POLICY "Allow update worker_notifications"
      ON public.worker_notifications FOR UPDATE
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'department_audit_logs' AND policyname = 'Allow read department_audit_logs'
  ) THEN
    CREATE POLICY "Allow read department_audit_logs"
      ON public.department_audit_logs FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'department_audit_logs' AND policyname = 'Allow insert department_audit_logs'
  ) THEN
    CREATE POLICY "Allow insert department_audit_logs"
      ON public.department_audit_logs FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- 6. Ensure Storage Buckets 'completion-images' & 'report-images' are configured
INSERT INTO storage.buckets (id, name, public)
VALUES ('completion-images', 'completion-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('report-images', 'report-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies for public access and uploads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access for completion-images'
  ) THEN
    CREATE POLICY "Public Access for completion-images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'completion-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow uploads to completion-images'
  ) THEN
    CREATE POLICY "Allow uploads to completion-images"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'completion-images');
  END IF;
END $$;

-- Verification query:
SELECT 'Migration applied successfully! Rewa Sahayak AI department workflow is ready.' AS status;
