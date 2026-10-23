import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ucluzodlwotljgatmhdg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbHV6b2Rsd290bGpnYXRtaGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODIwOTgsImV4cCI6MjEwODI1ODA5OH0.8sG-CGWBc-EcO7Sa0vyBFr6S3DFjemHNfObDuzDrOas';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testUpdate() {
  const { data: report } = await supabase
    .from('citizen_reports')
    .select('id, reference_number, current_status, resolution_note, completion_image_path')
    .eq('reference_number', 'REW-2026-01004')
    .single();

  console.log('Before test:', report);

  const { data, error } = await supabase
    .from('citizen_reports')
    .update({
      resolution_note: 'Tested update probe',
    })
    .eq('id', report.id)
    .select();

  console.log('Update result:', data, error?.message || 'Success!');
}

testUpdate().catch(console.error);
