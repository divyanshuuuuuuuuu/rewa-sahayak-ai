import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ucluzodlwotljgatmhdg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbHV6b2Rsd290bGpnYXRtaGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODIwOTgsImV4cCI6MjEwODI1ODA5OH0.8sG-CGWBc-EcO7Sa0vyBFr6S3DFjemHNfObDuzDrOas';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAdmin() {
  const { data: auth, error } = await supabase.auth.signInWithPassword({
    email: 'admin@rewa.gov.in',
    password: 'Admin@Rewa2026!',
  });
  console.log('Logged in admin user ID:', auth.user?.id);

  const { data: prof, error: profErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', auth.user.id);
  console.log('Admin profile in profiles table:', prof, profErr?.message || '');

  // Check all profiles as admin
  const { data: allProfs } = await supabase.from('profiles').select('*');
  console.log('All profiles as admin:', allProfs);

  // Test updating report with admin
  const { data: upd, error: updErr } = await supabase
    .from('citizen_reports')
    .update({ delay_reason: 'Admin test probe' })
    .eq('reference_number', 'REW-2026-01004')
    .select('id, reference_number, delay_reason');
  console.log('Update as admin:', upd, updErr?.message || '');

  // clean up delay_reason
  await supabase
    .from('citizen_reports')
    .update({ delay_reason: null })
    .eq('reference_number', 'REW-2026-01004');
}

testAdmin().catch(console.error);
