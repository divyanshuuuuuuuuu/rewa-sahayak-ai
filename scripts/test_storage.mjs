import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ucluzodlwotljgatmhdg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbHV6b2Rsd290bGpnYXRtaGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODIwOTgsImV4cCI6MjEwODI1ODA5OH0.8sG-CGWBc-EcO7Sa0vyBFr6S3DFjemHNfObDuzDrOas';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testStorageAndColumns() {
  console.log('Testing upload to completion-images...');
  const testBlob = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // minimal PNG header
  const fileName = `test-probe-${Date.now()}.png`;
  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('completion-images')
    .upload(fileName, testBlob, { contentType: 'image/png' });
  console.log('completion-images upload test:', uploadData, uploadErr?.message || 'Success');

  if (uploadData) {
    const { data: pubUrl } = supabase.storage.from('completion-images').getPublicUrl(fileName);
    console.log('Public URL:', pubUrl.publicUrl);
    // clean up
    await supabase.storage.from('completion-images').remove([fileName]);
  }

  console.log('\nChecking all citizen_reports records and their statuses:');
  const { data: allReports, error: repErr } = await supabase
    .from('citizen_reports')
    .select('id, reference_number, category, assigned_department_name, assigned_to, current_status, before_image_path, completion_image_path')
    .limit(20);
  console.log(`Total reports fetched: ${allReports?.length}`);
  console.table(allReports);
}

testStorageAndColumns().catch(console.error);
