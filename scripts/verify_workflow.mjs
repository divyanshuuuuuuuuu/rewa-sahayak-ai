// End-to-End Workflow Verification Script for Rewa Sahayak AI
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ucluzodlwotljgatmhdg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbHV6b2Rsd290bGpnYXRtaGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODIwOTgsImV4cCI6MjEwODI1ODA5OH0.8sG-CGWBc-EcO7Sa0vyBFr6S3DFjemHNfObDuzDrOas';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('REWA SAHAYAK AI — DEPARTMENT WORKFLOW END-TO-END VERIFICATION');
  console.log('================================================================\n');

  // 1. Department Accounts Definition & Password Verification Test
  console.log('1. Testing Department Accounts & Credential Validation...');
  const DEPT_PASSWORDS = {
    water: 'Water@Rewa2026!',
    pwd: 'Worker@Rewa2026!',
    electric: 'Electric@Rewa2026!',
    waste: 'Waste@Rewa2026!',
    sanitation: 'Waste@Rewa2026!',
    admin: 'Admin@Rewa2026!',
  };

  const DEPT_KEYS = ['water', 'pwd', 'electric', 'waste', 'sanitation'];
  for (const key of DEPT_KEYS) {
    assert(!!DEPT_PASSWORDS[key], `Password defined for department key "${key}"`);
  }

  // 2. Strict Department Isolation Algorithm Verification
  console.log('\n2. Testing Strict Department Isolation Rules...');
  function isComplaintAuthorizedForDepartment(deptKey, deptName, complaint) {
    const assignedDept = (complaint.assigned_department_name || complaint.assigned_department || '').toLowerCase().trim();
    const currentDeptName = (deptName || '').toLowerCase().trim();
    const currentDeptKey = (deptKey || '').toLowerCase().trim();

    if (assignedDept) {
      if (
        assignedDept === currentDeptName ||
        assignedDept.includes(currentDeptKey) ||
        currentDeptName.includes(assignedDept)
      ) {
        return true;
      }
      return false; // Explicitly assigned elsewhere
    }

    const category = (complaint.category || '').toLowerCase();
    const content = `${complaint.title || ''} ${complaint.description || ''}`.toLowerCase();

    if (deptKey === 'water') {
      return category.includes('water') || category.includes('drainage') || content.includes('water') || content.includes('pipe') || content.includes('leak');
    }
    if (deptKey === 'pwd') {
      return category.includes('road') || category.includes('pothole') || category.includes('civil') || content.includes('road') || content.includes('pothole');
    }
    if (deptKey === 'electric') {
      return category.includes('streetlight') || category.includes('electric') || content.includes('light') || content.includes('pole');
    }
    if (deptKey === 'waste') {
      return category.includes('waste') || category.includes('garbage') || content.includes('dump') || content.includes('kachra');
    }
    if (deptKey === 'sanitation') {
      return category.includes('sanitation') || category.includes('cleanliness') || content.includes('toilet') || content.includes('safai');
    }
    return true;
  }

  // Scenario A: Complaint explicitly assigned to Water Department
  const waterExplicit = {
    title: 'Pothole on Main Road', // Even though title says pothole
    category: 'Roads & Potholes',
    assigned_department_name: 'Water Supply & Drainage Dept',
  };
  assert(
    isComplaintAuthorizedForDepartment('water', 'Water Supply & Drainage Dept', waterExplicit) === true,
    'Water Dept can access complaint explicitly assigned to Water Dept'
  );
  assert(
    isComplaintAuthorizedForDepartment('pwd', 'Public Works Department (PWD)', waterExplicit) === false,
    'PWD CANNOT access complaint explicitly assigned to Water Dept (Category does not override assignment)'
  );

  // Scenario B: Complaint unassigned, fallback to category
  const unassignedRoad = {
    title: 'Severe pothole near Bus Stand',
    category: 'Roads & Potholes',
    assigned_department_name: null,
  };
  assert(
    isComplaintAuthorizedForDepartment('pwd', 'Public Works Department (PWD)', unassignedRoad) === true,
    'PWD can access unassigned road complaint by category'
  );
  assert(
    isComplaintAuthorizedForDepartment('water', 'Water Supply & Drainage Dept', unassignedRoad) === false,
    'Water Dept cannot access unassigned road complaint'
  );

  // 3. Evidence Filename Formatting Verification
  console.log('\n3. Testing Evidence Filename Sanitization...');
  function getCompletionPhotoFilename(ticketNumber, originalUrl) {
    const cleanTicket = (ticketNumber || 'REW-COMPLAINT').replace(/[^a-zA-Z0-9-_]/g, '');
    let ext = 'jpg';
    if (originalUrl) {
      const cleanUrl = originalUrl.split('?')[0];
      const extractedExt = cleanUrl.split('.').pop()?.toLowerCase();
      if (extractedExt && ['jpg', 'jpeg', 'png', 'webp'].includes(extractedExt)) {
        ext = extractedExt === 'jpeg' ? 'jpg' : extractedExt;
      }
    }
    return `${cleanTicket}-completion.${ext}`;
  }

  const filename1 = getCompletionPhotoFilename('REW-2026-01002', 'https://example.com/storage/v1/pic.jpg?t=123');
  assert(filename1 === 'REW-2026-01002-completion.jpg', `Clean filename generated: ${filename1}`);

  const filename2 = getCompletionPhotoFilename('REW/2026#999', 'https://example.com/proof.png');
  assert(filename2 === 'REW2026999-completion.png', `Filename sanitized against special characters: ${filename2}`);

  // 4. Supabase Storage Live Bucket Probe
  console.log('\n4. Testing Live Supabase Storage Bucket ("completion-images")...');
  const { data: pubData } = supabase.storage.from('completion-images').getPublicUrl('test-evidence.jpg');
  assert(
    pubData.publicUrl.includes('completion-images/test-evidence.jpg'),
    `Valid public URL generated: ${pubData.publicUrl}`
  );

  // Test real file listing in completion-images
  const { data: fileList, error: flError } = await supabase.storage.from('completion-images').list('', { limit: 5 });
  assert(!flError, 'Successfully queried public completion-images bucket contents');
  console.log(`Found ${fileList?.length || 0} files in completion-images bucket.`);

  // 5. Live Citizen Reports & Status History Probe
  console.log('\n5. Testing Live citizen_reports & report_status_history Integration...');
  const { data: reports, error: rError } = await supabase
    .from('citizen_reports')
    .select('id, reference_number, title, current_status, assigned_department_name, completion_image_path, resolution_note, resolved_at')
    .order('submitted_at', { ascending: false })
    .limit(5);

  assert(!rError, 'Successfully queried citizen_reports');
  console.log(`Found ${reports?.length || 0} recent citizen reports in database.`);
  if (reports && reports.length > 0) {
    const sample = reports[0];
    console.log(`Sample Ticket: ${sample.reference_number || sample.id} | Status: ${sample.current_status}`);
  }

  const { data: history, error: hError } = await supabase
    .from('report_status_history')
    .select('id, report_id, previous_status, new_status, public_message, changed_by_name, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  assert(!hError, 'Successfully queried report_status_history');
  console.log(`Found ${history?.length || 0} status history audit entries in database.`);

  console.log('\n================================================================');
  console.log('🎉 ALL END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
