import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ucluzodlwotljgatmhdg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbHV6b2Rsd290bGpnYXRtaGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODIwOTgsImV4cCI6MjEwODI1ODA5OH0.8sG-CGWBc-EcO7Sa0vyBFr6S3DFjemHNfObDuzDrOas';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testEmails() {
  const candidates = [
    'water.rewa@gmail.com',
    'water@rewa.org',
    'water@rewa.in',
    'rewa.water@gmail.com',
    'pwd.rewa@gmail.com',
  ];

  for (const email of candidates) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: 'Water@Rewa2026!',
    });
    console.log(email, '->', error ? error.message : `Success! user id: ${data.user?.id}`);
  }
}

testEmails().catch(console.error);
