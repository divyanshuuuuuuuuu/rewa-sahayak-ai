// Worker Dashboard Service — Rewa Sahayak AI
// Handles all Supabase operations for department workers
import { supabase } from './supabase';
import { uploadReportImage, getImageUrl } from './supabaseStore';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WorkerProfile {
  id: string;
  user_id: string;
  name: string;
  designation: string;
  department_name: string;
  whatsapp_phone: string;
  email: string | null;
  is_active: boolean;
}

export interface WorkerAssignment {
  id: string;
  reference_number: string;
  title: string;
  category: string;
  subcategory: string | null;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  area_or_ward: string | null;
  location_description: string;
  latitude: number | null;
  longitude: number | null;
  before_image_path: string | null;
  completion_image_path: string | null;
  current_status: string;
  assigned_department_name: string | null;
  assigned_to: string | null;
  assigned_worker_id: string | null;
  worker_instructions: string | null;
  work_started_at: string | null;
  completion_note: string | null;
  completed_by_name: string | null;
  resolved_at: string | null;
  submitted_at: string;
  updated_at: string;
  citizen_name: string | null;
}

export interface WorkerNotification {
  id: string;
  worker_id: string;
  report_id: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

// ─── Get current worker profile from department_workers ──────────────────────
export async function getMyWorkerProfile(): Promise<{ profile: WorkerProfile | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { profile: null, error: 'Not authenticated' };

  // 1. Try finding by user_id
  const { data: byUserId } = await supabase
    .from('department_workers')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (byUserId) return { profile: byUserId as WorkerProfile, error: null };

  // 2. Try finding by email
  if (user.email) {
    const { data: byEmail } = await supabase
      .from('department_workers')
      .select('*')
      .eq('email', user.email)
      .maybeSingle();

    if (byEmail) {
      // Link user_id
      await supabase
        .from('department_workers')
        .update({ user_id: user.id })
        .eq('id', byEmail.id);
      return { profile: { ...byEmail, user_id: user.id } as WorkerProfile, error: null };
    }
  }

  // 3. Try finding by profile full_name
  const { data: prof } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  if (prof?.full_name) {
    const { data: byName } = await supabase
      .from('department_workers')
      .select('*')
      .ilike('name', `%${prof.full_name}%`)
      .maybeSingle();

    if (byName) {
      await supabase
        .from('department_workers')
        .update({ user_id: user.id, email: user.email ?? byName.email })
        .eq('id', byName.id);
      return { profile: { ...byName, user_id: user.id } as WorkerProfile, error: null };
    }
  }

  // 4. Fallback profile from user profile
  return {
    profile: {
      id: user.id,
      user_id: user.id,
      name: prof?.full_name || user.email?.split('@')[0] || 'Field Worker',
      designation: 'Municipal Field Technician',
      department_name: 'Municipal Field Operations',
      whatsapp_phone: '+919826000000',
      email: user.email || null,
      is_active: true,
    },
    error: null,
  };
}

// ─── Get all assignments for the authenticated worker ─────────────────────────
export async function getMyAssignments(): Promise<{ assignments: WorkerAssignment[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { assignments: [], error: 'Not authenticated' };

  const { profile } = await getMyWorkerProfile();

  // Query either assigned_worker_id == user.id OR assigned_to == worker name
  let query = supabase
    .from('citizen_reports')
    .select('*');

  if (profile?.name) {
    query = query.or(`assigned_worker_id.eq.${user.id},assigned_to.eq.${profile.name}`);
  } else {
    query = query.eq('assigned_worker_id', user.id);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) return { assignments: [], error: error.message };

  // Backfill assigned_worker_id if missing
  const reports = (data as WorkerAssignment[]) ?? [];
  const needsLink = reports.filter(r => !r.assigned_worker_id);
  if (needsLink.length > 0) {
    for (const r of needsLink) {
      await supabase
        .from('citizen_reports')
        .update({ assigned_worker_id: user.id })
        .eq('id', r.id);
    }
  }

  return { assignments: reports, error: null };
}

// ─── Get a single assignment by report ID (with authorization check) ──────────
export async function getMyAssignmentById(reportId: string): Promise<{ assignment: WorkerAssignment | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { assignment: null, error: 'Not authenticated' };

  const { profile } = await getMyWorkerProfile();

  let query = supabase
    .from('citizen_reports')
    .select('*')
    .eq('id', reportId);

  if (profile?.name) {
    query = query.or(`assigned_worker_id.eq.${user.id},assigned_to.eq.${profile.name}`);
  } else {
    query = query.eq('assigned_worker_id', user.id);
  }

  const { data, error } = await query.single();

  if (error || !data) return { assignment: null, error: 'Assignment not found or not authorized' };

  // Backfill if needed
  if (!data.assigned_worker_id) {
    await supabase.from('citizen_reports').update({ assigned_worker_id: user.id }).eq('id', reportId);
    data.assigned_worker_id = user.id;
  }

  return { assignment: data as WorkerAssignment, error: null };
}

// ─── Start work on an assignment ─────────────────────────────────────────────
export async function startWork(reportId: string): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { profile } = await getMyWorkerProfile();

  // Verify assignment belongs to this worker
  const { data: report, error: fetchErr } = await supabase
    .from('citizen_reports')
    .select('id, current_status, assigned_worker_id, assigned_to')
    .eq('id', reportId)
    .single();

  if (fetchErr || !report) return { error: 'Assignment not found' };
  const isAuthorized = report.assigned_worker_id === user.id || (profile?.name && report.assigned_to === profile.name);
  if (!isAuthorized) return { error: 'Not authorized to start work on this assignment' };
  if (report.current_status !== 'ASSIGNED') return { error: `Cannot start work — current status is ${report.current_status}` };

  const now = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from('citizen_reports')
    .update({
      current_status: 'IN_PROGRESS',
      assigned_worker_id: user.id,
      work_started_at: now,
      updated_at: now,
    })
    .eq('id', reportId);

  if (updateErr) return { error: updateErr.message };

  // Record status history
  const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
  await supabase.from('report_status_history').insert({
    report_id: reportId,
    previous_status: 'ASSIGNED',
    new_status: 'IN_PROGRESS',
    public_message: `Field worker ${prof?.full_name || 'Assigned Worker'} has started work on this complaint.`,
    changed_by: user.id,
    changed_by_name: (prof as any)?.full_name ?? 'Field Worker',
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rewa_store_updated'));
  }

  return { error: null };
}

// ─── Submit completed work (photo + note) ─────────────────────────────────────
export async function submitCompletedWork(
  reportId: string,
  completionPhoto: File,
  completionNote: string
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { profile } = await getMyWorkerProfile();

  // Verify assignment
  const { data: report, error: fetchErr } = await supabase
    .from('citizen_reports')
    .select('id, current_status, assigned_worker_id, assigned_to')
    .eq('id', reportId)
    .single();

  if (fetchErr || !report) return { error: 'Assignment not found' };
  const isAuthorized = report.assigned_worker_id === user.id || (profile?.name && report.assigned_to === profile.name);
  if (!isAuthorized) return { error: 'Not authorized to complete this assignment' };
  if (report.current_status !== 'IN_PROGRESS' && report.current_status !== 'ASSIGNED') {
    return { error: `Cannot complete — status is ${report.current_status}` };
  }

  // Upload completion photo
  const { path: completionPath, error: uploadErr } = await uploadReportImage(completionPhoto, 'completion-images');
  if (uploadErr || !completionPath) {
    return { error: `Photo upload failed: ${uploadErr ?? 'Unknown error'}` };
  }

  // Get worker's profile name
  const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
  const workerName = (prof as any)?.full_name ?? profile?.name ?? 'Field Worker';

  const now = new Date().toISOString();

  // Update the report
  const { error: updateErr } = await supabase
    .from('citizen_reports')
    .update({
      current_status: 'RESOLVED',
      assigned_worker_id: user.id,
      completion_image_path: completionPath,
      completion_note: completionNote,
      completed_by: user.id,
      completed_by_name: workerName,
      resolved_at: now,
      public_visibility: true, // Make visible so citizen can see resolution
      updated_at: now,
    })
    .eq('id', reportId);

  if (updateErr) return { error: updateErr.message };

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rewa_store_updated'));
  }

  // Record status history — this creates the "department response" for the citizen
  await supabase.from('report_status_history').insert({
    report_id: reportId,
    previous_status: report.current_status,
    new_status: 'RESOLVED',
    public_message: `Work completed by ${workerName}. ${completionNote}`,
    changed_by: user.id,
    changed_by_name: workerName,
  });

  // Create admin notification
  try {
    // Find admins to notify
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'superadmin']);

    if (admins && admins.length > 0) {
      const notifs = admins.map((a: any) => ({
        worker_id: a.id, // reusing worker_notifications for admin too
        report_id: reportId,
        title: 'Work Completed',
        message: `${workerName} has completed work and uploaded completion evidence.`,
        type: 'completion',
        is_read: false,
      }));
      await supabase.from('worker_notifications').insert(notifs);
    }
  } catch { /* non-critical */ }

  return { error: null };
}

// ─── Get worker's completed work ──────────────────────────────────────────────
export async function getMyCompletedWork(): Promise<{ assignments: WorkerAssignment[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { assignments: [], error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('citizen_reports')
    .select('*')
    .eq('completed_by', user.id)
    .eq('current_status', 'RESOLVED')
    .order('resolved_at', { ascending: false });

  if (error) return { assignments: [], error: error.message };
  return { assignments: (data as WorkerAssignment[]) ?? [], error: null };
}

// ─── Get worker's notifications ───────────────────────────────────────────────
export async function getMyNotifications(): Promise<{ notifications: WorkerNotification[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { notifications: [], error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('worker_notifications')
    .select('*')
    .eq('worker_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return { notifications: [], error: error.message };
  return { notifications: (data as WorkerNotification[]) ?? [], error: null };
}

// ─── Mark notification as read ────────────────────────────────────────────────
export async function markNotificationRead(notifId: string): Promise<void> {
  await supabase
    .from('worker_notifications')
    .update({ is_read: true })
    .eq('id', notifId);
}

// ─── Mark all notifications as read ──────────────────────────────────────────
export async function markAllNotificationsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('worker_notifications')
    .update({ is_read: true })
    .eq('worker_id', user.id)
    .eq('is_read', false);
}

// ─── Get image public URL ─────────────────────────────────────────────────────
export { getImageUrl };

// ─── Helper: status display ───────────────────────────────────────────────────
export const workerStatusLabels: Record<string, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const workerStatusColors: Record<string, string> = {
  SUBMITTED: '#64748b',
  UNDER_REVIEW: '#0284c7',
  ASSIGNED: '#d97706',
  IN_PROGRESS: '#7c3aed',
  RESOLVED: '#15803d',
  CLOSED: '#374151',
};
