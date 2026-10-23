import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ucluzodlwotljgatmhdg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbHV6b2Rsd290bGpnYXRtaGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODIwOTgsImV4cCI6MjEwODI1ODA5OH0.8sG-CGWBc-EcO7Sa0vyBFr6S3DFjemHNfObDuzDrOas';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSignUp() {
  console.log('Testing signUp for water@rewa.gov.in...');
  const { data, error } = await supabase.auth.signUp({
    email: 'water@rewa.gov.in',
    password: 'Water@Rewa2026!',
    options: {
      data: {
        full_name: 'Water Supply & Drainage Dept',
        role: 'worker',
      },
    },
  });
  console.log('SignUp result:', data?.user?.id, data?.user?.email, error?.message || 'Success!');
}

testSignUp().catch(console.error);
