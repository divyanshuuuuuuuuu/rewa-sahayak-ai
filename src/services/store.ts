// Supabase-integrated civic store for Rewa Sahayak AI
// Provides seamless real-time Supabase database connection with offline/localStorage fallback.
import type { Complaint, ComplaintStatus, ComplaintUpdate, StatsData, User, Category, Module, Severity } from '../types';
import { demoUsers } from '../data/demoData';
import { v4 as uuidv4 } from 'uuid';
import { getEvidenceForCategory, getCivicResolutionEvidenceSvg } from './evidenceSvg';
import { supabase } from './supabase';
import { getImageUrl, getAudioUrl } from './supabaseStore';

const COMPLAINTS_KEY = 'rewa_complaints';
const USER_KEY = 'rewa_current_user';

export function dbReportToComplaint(r: any, history: any[] = []): Complaint {
  const isResolved = r.current_status === 'RESOLVED' || r.status === 'RESOLVED';

  const image_url = r.before_image_path
    ? (r.before_image_path.startsWith('http') || r.before_image_path.startsWith('data:')
        ? r.before_image_path
        : getImageUrl(r.before_image_path))
    : getEvidenceForCategory(r.category, r.module);

  const video_url = r.completion_image_path
    ? (r.completion_image_path.startsWith('http') || r.completion_image_path.startsWith('data:')
        ? r.completion_image_path
        : getImageUrl(r.completion_image_path, 'completion-images'))
    : (r.video_url || (isResolved ? getCivicResolutionEvidenceSvg(r.category, r.module) : null));

  const audio_url = r.voice_audio_path
    ? (r.voice_audio_path.startsWith('http') || r.voice_audio_path.startsWith('blob:') || r.voice_audio_path.startsWith('data:')
        ? r.voice_audio_path
        : getAudioUrl(r.voice_audio_path))
    : (r.audio_url || null);

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
    completion_image_path: r.completion_image_path || null,
    audio_url,
    audio_duration: r.voice_audio_duration ?? r.audio_duration ?? null,
    audio_mime_type: r.voice_audio_mime_type ?? r.audio_mime_type ?? null,
    is_voice_transcribed: !!(r.voice_audio_path || r.voice_transcript || (r as any).is_voice_transcribed),
    media: [
      ...(image_url ? [{ id: 'm1', type: 'image' as const, url: image_url, name: 'समस्या साक्ष्य (Before Photo)' }] : []),
      ...(video_url && video_url !== image_url ? [{
        id: 'm2-after',
        type: (video_url.endsWith('.mp4') || video_url.endsWith('.webm')) ? ('video' as const) : ('image' as const),
        url: video_url,
        name: isResolved ? 'विभागीय कार्य समाप्ति साक्ष्य (After Resolution Photo)' : 'विभागीय साक्ष्य (Department Evidence)',
      }] : []),
    ],
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
    delay_reason: r.delay_reason || null,
    work_duration_seconds: r.work_duration_seconds || null,
    worker_resolution_location: r.worker_resolution_location || null,
    removed_from_website: !!r.removed_from_website,
    removal_reason: r.removal_reason || null,
    removed_by_admin_at: r.removed_by_admin_at || null,
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

const DELETED_IDS_KEY = 'rewa_deleted_complaints';

export function getDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    if (!raw) return new Set();
    const list: string[] = JSON.parse(raw);
    // Sanitize: ONLY valid UUIDs are tombstones. Ticket numbers must never block new complaints.
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validUuids = list.filter(item => uuidRegex.test(item));
    if (validUuids.length !== list.length) {
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(validUuids));
    }
    return new Set(validUuids.map(s => s.toLowerCase()));
  } catch {
    return new Set();
  }
}

export function recordDeletedId(id: string) {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (id && uuidRegex.test(id)) {
      const set = getDeletedIds();
      set.add(id.toLowerCase());
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
    }
  } catch {}
}

export function isComplaintDeleted(id: string): boolean {
  if (!id) return false;
  const set = getDeletedIds();
  return set.has(id.toLowerCase());
}

// In-memory cache (excluding permanently deleted items by UUID)
let memoryComplaints: Complaint[] = loadComplaintsFromStorage().filter(
  c => !isComplaintDeleted(c.id)
);

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
      const deleted = getDeletedIds();
      const mapped = data
        .filter((r: any) => !deleted.has((r.id || '').toLowerCase()))
        .map((r: any) => dbReportToComplaint(r, r.report_status_history || []));
      // Preserve any un-synced local complaints so they don't get erased
      const serverIds = new Set(mapped.map(m => m.id));
      const serverTicketNumbers = new Set(mapped.map(m => m.ticket_number));
      const unSynced = memoryComplaints.filter(c =>
        !deleted.has(c.id.toLowerCase()) &&
        !serverIds.has(c.id) &&
        !serverTicketNumbers.has(c.ticket_number)
      );
      const merged = sortComplaints([...mapped, ...unSynced]);
      memoryComplaints = merged;
      saveComplaintsToStorage(merged);
      return merged;
    } else if (data && data.length === 0) {
      // If server has no records yet, keep locally cached complaints active
      return memoryComplaints;
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

// Sort complaints so that any complaint marked as SUBMITTED is placed at the bottom (last) of all complaints.
// All active/in-progress/assigned/delayed/resolved complaints appear first.
export function sortComplaints(complaints: Complaint[]): Complaint[] {
  return [...complaints].sort((a, b) => {
    const aIsSubmitted = a.status === 'SUBMITTED';
    const bIsSubmitted = b.status === 'SUBMITTED';
    if (aIsSubmitted && !bIsSubmitted) return 1; // SUBMITTED moves towards the bottom
    if (!aIsSubmitted && bIsSubmitted) return -1; // non-SUBMITTED stays at the top
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function getAllComplaints(): Complaint[] {
  if (memoryComplaints.length === 0) {
    memoryComplaints = loadComplaintsFromStorage();
  }
  return sortComplaints(memoryComplaints);
}

export function getPublicComplaints(): Complaint[] {
  return getAllComplaints().filter(c => !c.removed_from_website);
}

export function getComplaintById(id: string): Complaint | undefined {
  if (!id) return undefined;
  const list = getAllComplaints();
  const raw = id.trim().toLowerCase();
  const clean = raw.replace(/[^a-z0-9]/g, '');

  return list.find(c => {
    const cId = (c.id || '').toLowerCase();
    const cTicket = (c.ticket_number || '').toLowerCase();
    const cClean = cTicket.replace(/[^a-z0-9]/g, '');

    if (cId === raw || cTicket === raw) return true;
    if (clean && (cClean === clean || cId === clean)) return true;
    if (clean.length >= 4 && (cClean.endsWith(clean) || cClean.includes(clean))) return true;
    return false;
  });
}

export async function fetchComplaintByIdAsync(id: string, forceSync = false): Promise<Complaint | undefined> {
  if (!id) return undefined;
  if (!forceSync) {
    const found = getComplaintById(id);
    if (found) return found;
  }

  try {
    const raw = id.trim();
    const isTargetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);
    const { data } = await supabase
      .from('citizen_reports')
      .select('*, report_status_history(*)')
      .or(isTargetUuid ? `id.eq.${raw}` : `id.eq.${raw},reference_number.ilike.%${raw}%`)
      .limit(1)
      .maybeSingle();

    if (data) {
      const c = dbReportToComplaint(data, data.report_status_history || []);
      memoryComplaints = sortComplaints([c, ...memoryComplaints.filter(m => m.id !== c.id && m.ticket_number !== c.ticket_number)]);
      saveComplaintsToStorage(memoryComplaints);
      return c;
    }
  } catch (err) {
    console.warn('fetchComplaintByIdAsync warning:', err);
  }

  await syncFromSupabase();
  return getComplaintById(id);
}

export async function adminRemoveComplaintFromWebsite(
  complaintId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();
    const reasonClean = reason?.trim() || 'प्रशासनिक आदेश द्वारा सार्वजनिक पोर्टल से हटाई गई (Preserved for worker record)';

    // 1. Update in-memory and local storage
    const list = getAllComplaints();
    const target = list.find(c => c.id === complaintId || c.ticket_number === complaintId);
    if (target) {
      target.removed_from_website = true;
      target.removal_reason = reasonClean;
      target.removed_by_admin_at = now;
      target.updates.push({
        id: uuidv4(),
        complaint_id: target.id,
        status: target.status,
        note: `[प्रशासनिक कार्रवाई] शिकायत को सार्वजनिक वेबसाइट से हटाया गया। यह फील्ड वर्कर के कार्य रिकॉर्ड में सुरक्षित रहेगी। (कारण: ${reasonClean})`,
        updated_by: 'Super Admin',
        created_at: now,
      });
      saveComplaintsToStorage(list);
    }

    // 2. Update Supabase
    await supabase
      .from('citizen_reports')
      .update({
        removed_from_website: true,
        removal_reason: reasonClean,
        removed_by_admin_at: now,
        public_visibility: false,
      })
      .eq('id', target?.id || complaintId);

    // 3. Status history entry
    if (target) {
      await supabase.from('report_status_history').insert({
        report_id: target.id,
        previous_status: target.status,
        new_status: target.status,
        internal_note: `Complaint hidden from public website by admin. Reason: ${reasonClean}. Preserved in worker dashboard.`,
        public_message: 'शिकायत प्रशासनिक समीक्षा उपरांत सार्वजनिक पोर्टल से संग्रहीत कर ली गई है।',
        changed_by_name: 'Super Admin',
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to remove complaint' };
  }
}

export async function adminRestoreComplaintToWebsite(
  complaintId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();

    const list = getAllComplaints();
    const target = list.find(c => c.id === complaintId || c.ticket_number === complaintId);
    if (target) {
      target.removed_from_website = false;
      target.removal_reason = null;
      target.removed_by_admin_at = null;
      target.updates.push({
        id: uuidv4(),
        complaint_id: target.id,
        status: target.status,
        note: '[प्रशासनिक कार्रवाई] शिकायत को पुनः सार्वजनिक वेबसाइट पर बहाल किया गया।',
        updated_by: 'Super Admin',
        created_at: now,
      });
      saveComplaintsToStorage(list);
    }

    await supabase
      .from('citizen_reports')
      .update({
        removed_from_website: false,
        removal_reason: null,
        removed_by_admin_at: null,
        public_visibility: true,
      })
      .eq('id', target?.id || complaintId);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to restore complaint' };
  }
}

export async function adminDeleteComplaint(
  complaintIdOrTicket: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const raw = complaintIdOrTicket.trim();
    const list = getAllComplaints();
    const target = list.find(c => c.id === raw || c.ticket_number === raw);
    const targetId = target?.id || raw;
    const targetTicket = target?.ticket_number;

    // 1. Permanently record deletion key so it never syncs back
    recordDeletedId(targetId);

    // 2. Remove immediately from memory and local storage (Optimistic: 0ms lag)
    memoryComplaints = memoryComplaints.filter(
      c => c.id !== targetId && c.id !== raw && c.ticket_number !== raw && (!targetTicket || c.ticket_number !== targetTicket)
    );
    saveComplaintsToStorage(memoryComplaints);

    // 3. Delete from Supabase in background
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!target && !uuidRegex.test(raw)) {
        const { data } = await supabase.from('citizen_reports').select('id').eq('reference_number', raw).maybeSingle();
        if (data?.id) recordDeletedId(data.id);
      }
      await supabase.from('report_status_history').delete().eq('report_id', targetId);
      await supabase.from('citizen_reports').delete().or(`id.eq.${targetId},reference_number.eq.${raw}`);
    } catch (e) {
      console.warn('Supabase delete warning (local removal successful):', e);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete complaint' };
  }
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
  const rand = Math.floor(20000 + Math.random() * 79999);
  return `REW-2026-${rand}`;
}

export async function createComplaintAsync(
  complaint: Omit<Complaint, 'id' | 'ticket_number' | 'created_at' | 'updated_at' | 'updates'>
): Promise<Complaint> {
  const tempId = uuidv4();
  const ticket_number = generateTicketNumber();
  const now = new Date().toISOString();

  let finalId = tempId;
  let finalTicket = ticket_number;

  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Note: Do not pass reference_number explicitly; Supabase trigger assigns the canonical unique sequence
    const insertPayload: any = {
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      subcategory: complaint.subcategory || null,
      module: complaint.module,
      severity: complaint.severity || 'MEDIUM',
      current_status: 'SUBMITTED',
      citizen_name: complaint.citizen_name || 'नागरिक (रीवा)',
      submitted_by: user?.id ?? null,
      location_description: complaint.address || 'रीवा नगर निगम क्षेत्र',
      latitude: complaint.latitude ?? 24.5373,
      longitude: complaint.longitude ?? 81.3005,
      before_image_path: complaint.image_url,
      ai_summary: complaint.ai_summary,
      ai_confidence: complaint.ai_confidence,
      voice_transcript: complaint.voice_transcript,
      voice_audio_path: complaint.audio_url || null,
      voice_audio_duration: complaint.audio_duration || null,
      voice_audio_mime_type: complaint.audio_mime_type || null,
      is_voice_transcribed: !!(complaint.is_voice_transcribed || complaint.audio_url || complaint.voice_transcript),
      public_visibility: true,
    };

    let { data, error } = await supabase
      .from('citizen_reports')
      .insert(insertPayload)
      .select()
      .single();

    if (
      error &&
      ((error as any).code === 'PGRST204' ||
        error.message?.toLowerCase().includes('column') ||
        error.message?.toLowerCase().includes('schema cache') ||
        error.message?.toLowerCase().includes('not find') ||
        error.message?.toLowerCase().includes('does not exist'))
    ) {
      delete insertPayload.voice_audio_path;
      delete insertPayload.voice_audio_duration;
      delete insertPayload.voice_audio_mime_type;
      delete (insertPayload as any).public_audio_consent;
      delete insertPayload.is_voice_transcribed;
      const retry = await supabase
        .from('citizen_reports')
        .insert(insertPayload)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    // If Postgres sequence collided with an existing manual ticket number, advance or use fallback ticket
    if (error && (error as any).code === '23505') {
      const retry = await supabase
        .from('citizen_reports')
        .insert(insertPayload)
        .select()
        .single();
      if (!retry.error) {
        data = retry.data;
        error = null;
      } else {
        insertPayload.reference_number = generateTicketNumber();
        const fallback = await supabase
          .from('citizen_reports')
          .insert(insertPayload)
          .select()
          .single();
        data = fallback.data;
        error = fallback.error;
      }
    }

    if (!error && data) {
      finalId = data.id;
      finalTicket = data.reference_number || ticket_number;

      try {
        await supabase.from('report_status_history').insert({
          report_id: data.id,
          previous_status: null,
          new_status: 'SUBMITTED',
          public_message: 'Complaint registered in municipal database.',
          changed_by_name: 'System',
        });
      } catch (histErr) {
        console.warn('Status history insert error:', histErr);
      }
    } else if (error) {
      console.warn('Failed to insert report to Supabase, saving locally:', error.message);
    }
  } catch (e) {
    console.warn('Network issue during report insert, saving locally:', e);
  }

  const newComplaint: Complaint = {
    ...complaint,
    id: finalId,
    ticket_number: finalTicket,
    created_at: now,
    updated_at: now,
    updates: [
      {
        id: uuidv4(),
        complaint_id: finalId,
        status: 'SUBMITTED',
        note: 'Complaint submitted by citizen via Rewa Sahayak AI',
        updated_by: 'System',
        created_at: now,
      },
    ],
  };

  memoryComplaints = sortComplaints([newComplaint, ...memoryComplaints.filter(c => c.id !== finalId && c.ticket_number !== finalTicket)]);
  saveComplaintsToStorage(memoryComplaints);
  return newComplaint;
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

  memoryComplaints = sortComplaints([newComplaint, ...memoryComplaints]);
  saveComplaintsToStorage(memoryComplaints);

  createComplaintAsync(complaint).then(realComplaint => {
    memoryComplaints = sortComplaints([realComplaint, ...memoryComplaints.filter(c => c.id !== tempId && c.id !== realComplaint.id)]);
    saveComplaintsToStorage(memoryComplaints);
  });

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

  memoryComplaints = sortComplaints(complaints);
  saveComplaintsToStorage(memoryComplaints);

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
