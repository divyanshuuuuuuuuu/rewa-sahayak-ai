import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ucluzodlwotljgatmhdg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbHV6b2Rsd290bGpnYXRtaGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODIwOTgsImV4cCI6MjEwODI1ODA5OH0.8sG-CGWBc-EcO7Sa0vyBFr6S3DFjemHNfObDuzDrOas';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRpc() {
  const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1;' });
  console.log('exec_sql:', data, error?.message);
}

testRpc().catch(console.error);
