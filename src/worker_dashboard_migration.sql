-- ═══════════════════════════════════════════════════════════════════
-- REWA SAHAYAK AI — Worker Dashboard Migration
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════════════

-- 1. Add user_id to department_workers so workers can log in via Supabase Auth
ALTER TABLE department_workers
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS dept_workers_user_id_idx ON department_workers (user_id)
  WHERE user_id IS NOT NULL;

-- 2. Add worker_instructions column to citizen_reports (admin instructions to worker)
ALTER TABLE citizen_reports
  ADD COLUMN IF NOT EXISTS worker_instructions TEXT,
  ADD COLUMN IF NOT EXISTS assigned_worker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS work_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completion_note TEXT,
  ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_by_name TEXT;

-- 3. Create worker_notifications table
CREATE TABLE IF NOT EXISTS worker_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id UUID REFERENCES citizen_reports(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'assignment',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Enable RLS on worker_notifications
ALTER TABLE worker_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "worker_notifications_select"
  ON worker_notifications FOR SELECT
  USING (worker_id = auth.uid());

CREATE POLICY IF NOT EXISTS "worker_notifications_insert"
  ON worker_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "worker_notifications_update"
  ON worker_notifications FOR UPDATE
  USING (worker_id = auth.uid());

-- 5. RLS for citizen_reports — workers can read their assigned reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'citizen_reports' AND policyname = 'worker_can_read_assigned'
  ) THEN
    CREATE POLICY "worker_can_read_assigned"
      ON citizen_reports FOR SELECT
      USING (
        assigned_worker_id = auth.uid()
        OR public_visibility = true
        OR submitted_by = auth.uid()
      );
  END IF;
END $$;

-- 6. Workers can update their assigned reports (start work + complete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'citizen_reports' AND policyname = 'worker_can_update_assigned'
  ) THEN
    CREATE POLICY "worker_can_update_assigned"
      ON citizen_reports FOR UPDATE
      USING (assigned_worker_id = auth.uid())
      WITH CHECK (assigned_worker_id = auth.uid());
  END IF;
END $$;

-- HOW TO CREATE A WORKER ACCOUNT:
-- 1. Create user in Supabase Auth (Authentication → Users → Add User)
-- 2. In profiles table, set role = 'worker'
-- 3. In department_workers table, set user_id = the new user's auth ID
-- Example:
-- UPDATE department_workers
--   SET user_id = 'auth-uuid-here', email = 'worker@rewa.gov.in'
--   WHERE name = 'Er. S. K. Verma';
