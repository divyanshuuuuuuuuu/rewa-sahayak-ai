import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ucluzodlwotljgatmhdg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbHV6b2Rsd290bGpnYXRtaGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODIwOTgsImV4cCI6MjEwODI1ODA5OH0.8sG-CGWBc-EcO7Sa0vyBFr6S3DFjemHNfObDuzDrOas';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRow() {
  const { data, error } = await supabase
    .from('citizen_reports')
    .select('*')
    .eq('reference_number', 'REW-2026-01002')
    .single();
  console.log('REW-2026-01002 full data:', JSON.stringify(data, null, 2));

  console.log('\nChecking report_status_history for REW-2026-01002:');
  const { data: hist } = await supabase
    .from('report_status_history')
    .select('*')
    .eq('report_id', data.id);
  console.log(JSON.stringify(hist, null, 2));
}

checkRow().catch(console.error);
