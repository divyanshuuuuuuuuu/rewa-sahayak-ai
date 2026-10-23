import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ucluzodlwotljgatmhdg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbHV6b2Rsd290bGpnYXRtaGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODIwOTgsImV4cCI6MjEwODI1ODA5OH0.8sG-CGWBc-EcO7Sa0vyBFr6S3DFjemHNfObDuzDrOas';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testColumns() {
  const { data, error } = await supabase
    .from('citizen_reports')
    .select('id, worker_instructions, assigned_worker_id, work_started_at, completion_note, completed_by, completed_by_name')
    .limit(1);

  console.log('Worker columns in citizen_reports:', data, error?.message || 'Columns exist!');

  const { data: workerCols, error: workerErr } = await supabase
    .from('department_workers')
    .select('id, user_id, email, is_active')
    .limit(1);
  console.log('Worker columns in department_workers:', workerCols, workerErr?.message || 'Columns exist!');

  const { data: notifs, error: notifsErr } = await supabase
    .from('worker_notifications')
    .select('*')
    .limit(1);
  console.log('worker_notifications table:', notifs, notifsErr?.message || 'Table exists!');
}

testColumns().catch(console.error);
