// Supabase-integrated civic store for Rewa Sahayak AI
// Provides seamless real-time Supabase database connection with offline/localStorage fallback.
import type { Complaint, ComplaintStatus, ComplaintUpdate, StatsData, User, Category, Module, Severity } from '../types';
import { demoUsers } from '../data/demoData';
import { v4 as uuidv4 } from 'uuid';
import { getEvidenceForCategory } from './evidenceSvg';
import { supabase } from './supabase';
import { getImageUrl } from './supabaseStore';

const COMPLAINTS_KEY = 'rewa_complaints';
const USER_KEY = 'rewa_current_user';

export function dbReportToComplaint(r: any, history: any[] = []): Complaint {
  const image_url = r.before_image_path
    ? (r.before_image_path.startsWith('http') || r.before_image_path.startsWith('data:')
        ? r.before_image_path
        : getImageUrl(r.before_image_path))
    : getEvidenceForCategory(r.category, r.module);

  const video_url = r.completion_image_path
    ? (r.completion_image_path.startsWith('http') || r.completion_image_path.startsWith('data:')
        ? r.completion_image_path
        : getImageUrl(r.completion_image_path, 'completion-images'))
    : null;

  const updates: ComplaintUpdate[] = (history && history.length > 0)
    ? history.map((h: any) => ({
        id: h.id || uuidv4(),
        complaint_id: h.report_id || r.id,
        status: (h.new_status || 'SUBMITTED') as ComplaintStatus,
        note: h.public_message || h.internal_note || 'Status update logged',
        updated_by: h.changed_by_name || 'System',
        created_at: h.created_at || r.submitted_at || new Date().toISOString(),
      }))
    : [
        {
          id: 'init-' + r.id,
          complaint_id: r.id,
          status: (r.current_status || 'SUBMITTED') as ComplaintStatus,
          note: 'Complaint registered in Rewa portal',
          updated_by: 'System',
          created_at: r.submitted_at || new Date().toISOString(),
        },
      ];

  return {
    id: r.id,
    ticket_number: r.reference_number || `REW-2026-${String(r.id).slice(0, 5)}`,
    title: r.title,
    description: r.description,
    category: r.category as Category,
    subcategory: r.subcategory || '',
    module: (r.module || 'other') as Module,
    severity: (r.severity || 'MEDIUM') as Severity,
    status: (r.current_status || 'SUBMITTED') as ComplaintStatus,
    citizen_id: r.submitted_by || 'citizen-rewa',
    citizen_name: r.citizen_name || 'नागरिक (रीवा)',
    created_at: r.submitted_at || new Date().toISOString(),
    updated_at: r.updated_at || r.submitted_at || new Date().toISOString(),
    latitude: r.latitude ?? null,
    longitude: r.longitude ?? null,
    address: r.location_description || r.area_or_ward || 'रीवा',
    image_url,
    video_url,
    media: image_url ? [{ id: 'm1', type: 'image', url: image_url, name: 'Evidence Photo' }] : [],
    voice_transcript: r.voice_transcript || null,
    ai_summary: r.ai_summary || r.description,
    ai_confidence: r.ai_confidence || 0.92,
    assigned_department: r.assigned_department_name || '',
    assigned_to: r.assigned_to || '',
    assigned_worker_id: r.assigned_worker_id || null,
    worker_instructions: r.worker_instructions || null,
    work_started_at: r.work_started_at || null,
    completion_note: r.completion_note || null,
    completed_by: r.completed_by || null,
    completed_by_name: r.completed_by_name || null,
    resolved_at: r.resolved_at || null,
    resolution_note: r.resolution_note || '',
    updates,
  };
}

function loadComplaintsFromStorage(): Complaint[] {
  try {
    const data = localStorage.getItem(COMPLAINTS_KEY);
    if (data) {
      const parsed: Complaint[] = JSON.parse(data);
      return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

function saveComplaintsToStorage(complaints: Complaint[]) {
  try {
    localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(complaints));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rewa_store_updated'));
    }
  } catch { /* ignore */ }
}

// In-memory cache
let memoryComplaints: Complaint[] = loadComplaintsFromStorage();

// Trigger initial sync with Supabase
export async function syncFromSupabase(): Promise<Complaint[]> {
  try {
    const { data, error } = await supabase
      .from('citizen_reports')
      .select('*, report_status_history(*)')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.warn('Could not sync from Supabase, using local cache:', error.message);
      return memoryComplaints;
    }

    if (data && data.length > 0) {
      const mapped = data.map((r: any) => dbReportToComplaint(r, r.report_status_history || []));
      memoryComplaints = mapped;
      saveComplaintsToStorage(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('Error during Supabase sync:', err);
  }
  return memoryComplaints;
}

// Set up Supabase Realtime subscription
if (typeof window !== 'undefined') {
  syncFromSupabase();

  try {
    const channel = supabase
      .channel('store-realtime-reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'citizen_reports' }, () => {
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'report_status_history' }, () => {
        syncFromSupabase();
      })
      .subscribe();

    window.addEventListener('beforeunload', () => {
      supabase.removeChannel(channel);
    });
  } catch (err) {
    console.warn('Realtime subscription not supported:', err);
  }
}

export function getAllComplaints(): Complaint[] {
  if (memoryComplaints.length === 0) {
    memoryComplaints = loadComplaintsFromStorage();
  }
  return [...memoryComplaints].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function getComplaintById(id: string): Complaint | undefined {
  const list = getAllComplaints();
  const searchId = id.trim().toLowerCase();
  return list.find(
    c => c.id.toLowerCase() === searchId || c.ticket_number.toLowerCase() === searchId
  );
}

export function getComplaintsByModule(module: string): Complaint[] {
  return getAllComplaints().filter(c => c.module === module);
}

export function getComplaintsByStatus(status: ComplaintStatus): Complaint[] {
  return getAllComplaints().filter(c => c.status === status);
}

export function getComplaintsByCitizen(citizenId: string): Complaint[] {
  return getAllComplaints().filter(c => c.citizen_id === citizenId);
}

export function generateTicketNumber(): string {
  const count = memoryComplaints.length + 1001;
  return `REW-2026-${String(count).padStart(5, '0')}`;
}

export function createComplaint(
  complaint: Omit<Complaint, 'id' | 'ticket_number' | 'created_at' | 'updated_at' | 'updates'>
): Complaint {
  const tempId = uuidv4();
  const ticket_number = generateTicketNumber();
  const now = new Date().toISOString();

  const newComplaint: Complaint = {
    ...complaint,
    id: tempId,
    ticket_number,
    created_at: now,
    updated_at: now,
    updates: [
      {
        id: uuidv4(),
        complaint_id: tempId,
        status: 'SUBMITTED',
        note: 'Complaint submitted by citizen via Rewa Sahayak AI',
        updated_by: 'System',
        created_at: now,
      },
    ],
  };

  // Update memory and storage immediately for optimistic UI
  memoryComplaints = [newComplaint, ...memoryComplaints];
  saveComplaintsToStorage(memoryComplaints);

  // Asynchronously insert into Supabase
  (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('citizen_reports')
        .insert({
          title: newComplaint.title,
          description: newComplaint.description,
          category: newComplaint.category,
          subcategory: newComplaint.subcategory || null,
          module: newComplaint.module,
          severity: newComplaint.severity || 'MEDIUM',
          current_status: 'SUBMITTED',
          citizen_name: newComplaint.citizen_name || 'नागरिक (रीवा)',
          submitted_by: user?.id ?? null,
          location_description: newComplaint.address,
          latitude: newComplaint.latitude,
          longitude: newComplaint.longitude,
          before_image_path: newComplaint.image_url,
          ai_summary: newComplaint.ai_summary,
          ai_confidence: newComplaint.ai_confidence,
          voice_transcript: newComplaint.voice_transcript,
          public_visibility: true, // Auto-visible on public tracker
        })
        .select()
        .single();

      if (!error && data) {
        // Record status history
        await supabase.from('report_status_history').insert({
          report_id: data.id,
          previous_status: null,
          new_status: 'SUBMITTED',
          public_message: 'Complaint registered in municipal database.',
          changed_by_name: 'System',
        });

        // Replace tempId with real Supabase record
        newComplaint.id = data.id;
        newComplaint.ticket_number = data.reference_number || ticket_number;
        newComplaint.updates[0].complaint_id = data.id;
        saveComplaintsToStorage(memoryComplaints);
      } else if (error) {
        console.error('Failed to sync new complaint to Supabase:', error.message);
      }
    } catch (e) {
      console.error('Error inserting report to Supabase:', e);
    }
  })();

  return newComplaint;
}

export function updateComplaintStatus(
  id: string,
  status: ComplaintStatus,
  note: string,
  updatedBy: string
): Complaint | undefined {
  const complaints = getAllComplaints();
  const idx = complaints.findIndex(c => c.id === id || c.ticket_number === id);
  if (idx === -1) return undefined;

  const now = new Date().toISOString();
  const targetId = complaints[idx].id;
  const update: ComplaintUpdate = {
    id: uuidv4(),
    complaint_id: targetId,
    status,
    note,
    updated_by: updatedBy,
    created_at: now,
  };

  complaints[idx].status = status;
  complaints[idx].updated_at = now;
  complaints[idx].updates.push(update);

  if (status === 'RESOLVED') {
    complaints[idx].resolution_note = note;
  }

  memoryComplaints = complaints;
  saveComplaintsToStorage(complaints);

  // Sync to Supabase
  (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase
        .from('citizen_reports')
        .update({
          current_status: status,
          updated_at: now,
          ...(status === 'RESOLVED' ? { resolved_at: now, resolution_note: note } : {}),
        })
        .eq('id', targetId);

      await supabase.from('report_status_history').insert({
        report_id: targetId,
        previous_status: null,
        new_status: status,
        public_message: note,
        changed_by: user?.id ?? null,
        changed_by_name: updatedBy,
      });
    } catch (e) {
      console.error('Failed to update status in Supabase:', e);
    }
  })();

  return complaints[idx];
}

export function assignComplaint(
  id: string,
  department: string,
  assignedTo: string,
  workerInstructions?: string,
  assignedWorkerId?: string
): Complaint | undefined {
  const complaints = getAllComplaints();
  const idx = complaints.findIndex(c => c.id === id || c.ticket_number === id);
  if (idx === -1) return undefined;

  const now = new Date().toISOString();
  const targetId = complaints[idx].id;

  complaints[idx].assigned_department = department;
  complaints[idx].assigned_to = assignedTo;
  if (assignedWorkerId) complaints[idx].assigned_worker_id = assignedWorkerId;
  if (workerInstructions) complaints[idx].worker_instructions = workerInstructions;
  complaints[idx].updated_at = now;

  if (complaints[idx].status === 'SUBMITTED' || complaints[idx].status === 'UNDER_REVIEW') {
    complaints[idx].status = 'ASSIGNED';
    complaints[idx].updates.push({
      id: uuidv4(),
      complaint_id: targetId,
      status: 'ASSIGNED',
      note: `Assigned to ${department}${assignedTo ? ' — ' + assignedTo : ''}${workerInstructions ? ' (Instructions: ' + workerInstructions + ')' : ''}`,
      updated_by: 'Admin Officer',
      created_at: now,
    });
  }

  memoryComplaints = complaints;
  saveComplaintsToStorage(complaints);

  // Sync to Supabase
  (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const updateData: Record<string, any> = {
        assigned_department_name: department,
        assigned_to: assignedTo,
        current_status: 'ASSIGNED',
        updated_at: now,
      };
      if (assignedWorkerId) updateData.assigned_worker_id = assignedWorkerId;
      if (workerInstructions) updateData.worker_instructions = workerInstructions;

      await supabase
        .from('citizen_reports')
        .update(updateData)
        .eq('id', targetId);

      await supabase.from('report_assignments').insert({
        report_id: targetId,
        department_name: department,
        assigned_to: assignedTo,
        assigned_by: user?.id ?? null,
      });

      await supabase.from('report_status_history').insert({
        report_id: targetId,
        previous_status: null,
        new_status: 'ASSIGNED',
        public_message: `Assigned to ${department}${assignedTo ? ' — ' + assignedTo : ''}`,
        changed_by: user?.id ?? null,
        changed_by_name: 'Admin Officer',
      });

      // Insert in-app notification for the worker
      if (assignedWorkerId) {
        await supabase.from('worker_notifications').insert({
          worker_id: assignedWorkerId,
          report_id: targetId,
          title: `New Assignment: ${complaints[idx].title}`,
          message: `You have been assigned to resolve "${complaints[idx].title}" in ${complaints[idx].address}.${workerInstructions ? ' Note: ' + workerInstructions : ''}`,
          type: 'assignment',
        });
      }
    } catch (e) {
      console.error('Failed to assign report in Supabase:', e);
    }
  })();

  return complaints[idx];
}

export function reopenComplaint(
  id: string,
  reason: string,
  reopenedBy = 'Admin Officer'
): Complaint | undefined {
  const complaints = getAllComplaints();
  const idx = complaints.findIndex(c => c.id === id || c.ticket_number === id);
  if (idx === -1) return undefined;

  const now = new Date().toISOString();
  const targetId = complaints[idx].id;
  const prevStatus = complaints[idx].status;

  complaints[idx].status = 'ASSIGNED';
  complaints[idx].updated_at = now;
  complaints[idx].updates.push({
    id: uuidv4(),
    complaint_id: targetId,
    status: 'ASSIGNED',
    note: `Complaint Reopened: ${reason}`,
    updated_by: reopenedBy,
    created_at: now,
  });

  memoryComplaints = complaints;
  saveComplaintsToStorage(complaints);

  (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase
        .from('citizen_reports')
        .update({
          current_status: 'ASSIGNED',
          updated_at: now,
        })
        .eq('id', targetId);

      await supabase.from('report_status_history').insert({
        report_id: targetId,
        previous_status: prevStatus,
        new_status: 'ASSIGNED',
        public_message: `Complaint reopened by Admin: ${reason}`,
        changed_by: user?.id ?? null,
        changed_by_name: reopenedBy,
      });

      // Notify assigned worker if present
      if (complaints[idx].assigned_worker_id) {
        await supabase.from('worker_notifications').insert({
          worker_id: complaints[idx].assigned_worker_id,
          report_id: targetId,
          title: `Complaint Reopened: ${complaints[idx].title}`,
          message: `Admin reopened this task. Reason: ${reason}`,
          type: 'reopened',
        });
      }
    } catch (e) {
      console.error('Failed to reopen complaint in Supabase:', e);
    }
  })();

  return complaints[idx];
}

export function updateComplaintPriority(
  id: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
): Complaint | undefined {
  const complaints = getAllComplaints();
  const idx = complaints.findIndex(c => c.id === id || c.ticket_number === id);
  if (idx === -1) return undefined;

  const targetId = complaints[idx].id;
  complaints[idx].severity = severity;
  complaints[idx].updated_at = new Date().toISOString();

  memoryComplaints = complaints;
  saveComplaintsToStorage(complaints);

  (async () => {
    try {
      await supabase
        .from('citizen_reports')
        .update({ severity, updated_at: new Date().toISOString() })
        .eq('id', targetId);
    } catch (e) {
      console.error('Failed to update priority in Supabase:', e);
    }
  })();

  return complaints[idx];
}

export function getStats(): StatsData {
  const complaints = getAllComplaints();
  const stats: StatsData = {
    total: complaints.length,
    submitted: 0,
    under_review: 0,
    assigned: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
    high_priority: 0,
    by_category: {},
    by_module: {},
    by_status: {},
  };

  for (const c of complaints) {
    switch (c.status) {
      case 'SUBMITTED': stats.submitted++; break;
      case 'UNDER_REVIEW': stats.under_review++; break;
      case 'ASSIGNED': stats.assigned++; break;
      case 'IN_PROGRESS': stats.in_progress++; break;
      case 'RESOLVED': stats.resolved++; break;
      case 'CLOSED': stats.closed++; break;
    }
    if (c.severity === 'HIGH') stats.high_priority++;
    stats.by_category[c.category] = (stats.by_category[c.category] || 0) + 1;
    stats.by_module[c.module] = (stats.by_module[c.module] || 0) + 1;
    stats.by_status[c.status] = (stats.by_status[c.status] || 0) + 1;
  }

  return stats;
}

// Legacy Auth helper
export function getCurrentUser(): User | null {
  try {
    const data = localStorage.getItem(USER_KEY);
    if (data) return JSON.parse(data);
  } catch { /* ignore */ }
  return null;
}

export function loginAsDemo(role: 'citizen' | 'admin'): User {
  const user = role === 'admin' ? demoUsers.find(u => u.role === 'admin')! : demoUsers[0];
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export function logout() {
  localStorage.removeItem(USER_KEY);
}

export function resetDemoData() {
  syncFromSupabase();
}
