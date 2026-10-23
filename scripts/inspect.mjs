import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ucluzodlwotljgatmhdg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbHV6b2Rsd290bGpnYXRtaGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODIwOTgsImV4cCI6MjEwODI1ODA5OH0.8sG-CGWBc-EcO7Sa0vyBFr6S3DFjemHNfObDuzDrOas';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspect() {
  console.log('--- Checking departments table ---');
  const { data: depts, error: deptsErr } = await supabase.from('departments').select('*');
  console.log('Departments:', depts?.length, deptsErr?.message || '');
  if (depts) console.log(JSON.stringify(depts, null, 2));

  console.log('\n--- Checking department_workers table ---');
  const { data: workers, error: workersErr } = await supabase.from('department_workers').select('*');
  console.log('Department workers:', workers?.length, workersErr?.message || '');
  if (workers) console.log(JSON.stringify(workers, null, 2));

  console.log('\n--- Checking citizen_reports table ---');
  const { data: reports, error: reportsErr } = await supabase.from('citizen_reports').select('*').limit(3);
  console.log('Citizen reports count (first 3):', reports?.length, reportsErr?.message || '');
  if (reports && reports.length > 0) {
    console.log('Sample report keys:', Object.keys(reports[0]));
    console.log('Sample report 0:', JSON.stringify(reports[0], null, 2));
  }

  console.log('\n--- Checking report_status_history table ---');
  const { data: history, error: historyErr } = await supabase.from('report_status_history').select('*').limit(3);
  console.log('Report status history (first 3):', history?.length, historyErr?.message || '');
  if (history && history.length > 0) {
    console.log('Sample history 0:', JSON.stringify(history[0], null, 2));
  }

  console.log('\n--- Checking profiles table ---');
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('*').limit(10);
  console.log('Profiles count:', profiles?.length, profErr?.message || '');
  if (profiles) console.log(JSON.stringify(profiles, null, 2));

  console.log('\n--- Checking storage buckets ---');
  const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
  console.log('Buckets:', buckets?.map(b => ({ name: b.name, public: b.public })), bucketsErr?.message || '');
}

inspect().catch(console.error);
