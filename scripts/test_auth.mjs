import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ucluzodlwotljgatmhdg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbHV6b2Rsd290bGpnYXRtaGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODIwOTgsImV4cCI6MjEwODI1ODA5OH0.8sG-CGWBc-EcO7Sa0vyBFr6S3DFjemHNfObDuzDrOas';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAuth() {
  console.log('Testing login for admin@rewa.gov.in...');
  const { data: adminData, error: adminErr } = await supabase.auth.signInWithPassword({
    email: 'admin@rewa.gov.in',
    password: 'Admin@Rewa2026!',
  });
  console.log('Admin login:', adminData.user?.email, adminErr?.message || 'Success!');

  console.log('Testing login for worker@rewa.gov.in...');
  const { data: workerData, error: workerErr } = await supabase.auth.signInWithPassword({
    email: 'worker@rewa.gov.in',
    password: 'Worker@Rewa2026!',
  });
  console.log('Worker login:', workerData.user?.email, workerErr?.message || 'Success!');

  console.log('Testing login for water@rewa.gov.in...');
  const { data: waterData, error: waterErr } = await supabase.auth.signInWithPassword({
    email: 'water@rewa.gov.in',
    password: 'Water@Rewa2026!',
  });
  console.log('Water login:', waterData.user?.email, waterErr?.message || 'Success!');
}

testAuth().catch(console.error);
