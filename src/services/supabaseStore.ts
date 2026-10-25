// Supabase-backed data store — replaces localStorage store.ts for production
import { supabase } from "./supabase";
import type { ComplaintStatus } from "../types";

// ─── Types matching Supabase schema ──────────────────────────────────────────
export interface DbReport {
  id: string;
  reference_number: string;
  submitted_by: string | null;
  citizen_name: string | null;
  category: string;
  subcategory: string | null;
  module: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  area_or_ward: string | null;
  location_description: string;
  latitude: number | null;
  longitude: number | null;
  before_image_path: string | null;
  completion_image_path: string | null;
  current_status: string;
  public_visibility: boolean;
  ai_summary: string | null;
  ai_confidence: number | null;
  voice_transcript: string | null;
  voice_audio_path?: string | null;
  voice_audio_duration?: number | null;
  voice_audio_mime_type?: string | null;
  public_audio_consent?: boolean;
  assigned_department_id: string | null;
  assigned_department_name: string | null;
  assigned_to: string | null;
  delay_reason: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  removed_from_website?: boolean | null;
  removal_reason?: string | null;
  submitted_at: string;
  updated_at: string;
}

export interface DbStatusHistory {
  id: string;
  report_id: string;
  previous_status: string | null;
  new_status: string;
  public_message: string | null;
  internal_note: string | null;
  changed_by: string | null;
  changed_by_name: string;
  created_at: string;
}

export interface CreateReportPayload {
  category: string;
  subcategory?: string;
  module: string;
  title: string;
  description: string;
  severity?: "LOW" | "MEDIUM" | "HIGH";
  area_or_ward?: string;
  location_description: string;
  latitude?: number | null;
  longitude?: number | null;
  citizen_name?: string;
  ai_summary?: string;
  ai_confidence?: number;
  voice_transcript?: string;
  voice_audio_path?: string | null;
  voice_audio_duration?: number | null;
  voice_audio_mime_type?: string | null;
  public_audio_consent?: boolean;
}

// ─── Upload image to Supabase Storage ────────────────────────────────────────
export async function uploadReportImage(
  file: File,
  bucket: "report-images" | "completion-images" = "report-images"
): Promise<{ path: string | null; error: string | null }> {
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, { cacheControl: "3600", upsert: false });
  if (error) return { path: null, error: error.message };
  return { path: data.path, error: null };
}

// ─── Upload audio recording to Supabase Storage ──────────────────────────────
export async function uploadReportAudio(
  audioBlob: Blob,
  fileName?: string
): Promise<{ path: string | null; url: string | null; error: string | null }> {
  try {
    const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const name = fileName || `voice-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Attempt upload to 'report-recordings' first, fall back to 'report-images'
    let targetBucket = 'report-recordings';
    let { data, error } = await supabase.storage
      .from(targetBucket)
      .upload(name, audioBlob, {
        contentType: audioBlob.type || 'audio/webm',
        cacheControl: '3600',
        upsert: false,
      });

    if (error && (error.message.toLowerCase().includes('bucket not found') || (error as any).statusCode === 404)) {
      targetBucket = 'report-images';
      const fallback = await supabase.storage
        .from(targetBucket)
        .upload(name, audioBlob, {
          contentType: audioBlob.type || 'audio/webm',
          cacheControl: '3600',
          upsert: false,
        });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return { path: null, url: null, error: error.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from(targetBucket)
      .getPublicUrl(data!.path);

    return { path: data!.path, url: publicUrlData.publicUrl, error: null };
  } catch (err: any) {
    return { path: null, url: null, error: err?.message || 'Failed to upload audio recording' };
  }
}

// Get public or signed URL for an image
export function getImageUrl(
  path: string,
  bucket: "report-images" | "completion-images" = "report-images"
): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Get public URL for audio
export function getAudioUrl(
  path: string,
  bucket: "report-recordings" | "report-images" = "report-recordings"
): string {
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ─── Create a new report ─────────────────────────────────────────────────────
export async function createReport(
  payload: CreateReportPayload,
  imageFile?: File | null
): Promise<{ report: DbReport | null; error: string | null }> {
  let before_image_path: string | null = null;

  if (imageFile) {
    const { path, error: uploadError } = await uploadReportImage(imageFile);
    if (uploadError) return { report: null, error: `Image upload failed: ${uploadError}` };
    before_image_path = path;
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("citizen_reports")
    .insert({
      ...payload,
      submitted_by: user?.id ?? null,
      before_image_path,
      current_status: "SUBMITTED",
      public_visibility: false,
    })
    .select()
    .single();

  if (error) return { report: null, error: error.message };

  // Insert initial status history entry
  await supabase.from("report_status_history").insert({
    report_id: data.id,
    previous_status: null,
    new_status: "SUBMITTED",
    public_message: "Complaint submitted successfully.",
    changed_by_name: "System",
  });

  return { report: data as DbReport, error: null };
}

// Sort reports so that any complaint marked as SUBMITTED is placed at the bottom (last) of all complaints.
export function sortDbReports(reports: DbReport[]): DbReport[] {
  return [...reports].sort((a, b) => {
    const aIsSubmitted = a.current_status === "SUBMITTED";
    const bIsSubmitted = b.current_status === "SUBMITTED";
    if (aIsSubmitted && !bIsSubmitted) return 1; // SUBMITTED moves towards the bottom
    if (!aIsSubmitted && bIsSubmitted) return -1; // non-SUBMITTED stays at the top
    return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
  });
}

// ─── Fetch reports (public feed — approved only) ─────────────────────────────
export async function getPublicReports(options?: {
  category?: string;
  module?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ reports: DbReport[]; total: number; error: string | null }> {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("citizen_reports")
    .select("*", { count: "exact" })
    .eq("public_visibility", true)
    .order("submitted_at", { ascending: false })
    .range(from, to);

  if (options?.category) query = query.eq("category", options.category);
  if (options?.module) query = query.eq("module", options.module);
  if (options?.status) query = query.eq("current_status", options.status);
  if (options?.search) {
    query = query.or(
      `title.ilike.%${options.search}%,reference_number.ilike.%${options.search}%,location_description.ilike.%${options.search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) return { reports: [], total: 0, error: error.message };
  const rawReports = ((data as DbReport[]) ?? []).filter(r => !r.removed_from_website);
  return { reports: sortDbReports(rawReports), total: rawReports.length, error: null };
}

// ─── Fetch citizen's own reports ─────────────────────────────────────────────
export async function getMyCitizenReports(): Promise<{ reports: DbReport[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { reports: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("citizen_reports")
    .select("*")
    .eq("submitted_by", user.id)
    .order("submitted_at", { ascending: false });

  if (error) return { reports: [], error: error.message };
  const rawReports = ((data as DbReport[]) ?? []).filter(r => !r.removed_from_website);
  return { reports: sortDbReports(rawReports), error: null };
}

// ─── Fetch single report (citizen can see own, public can see approved) ───────
export async function getReportById(id: string): Promise<{ report: DbReport | null; error: string | null }> {
  const { data, error } = await supabase
    .from("citizen_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { report: null, error: error.message };
  return { report: data as DbReport, error: null };
}

// ─── Get report by reference number ──────────────────────────────────────────
export async function getReportByReference(refNum: string): Promise<{ report: DbReport | null; error: string | null }> {
  const { data, error } = await supabase
    .from("citizen_reports")
    .select("*")
    .eq("reference_number", refNum.toUpperCase())
    .single();

  if (error) return { report: null, error: error.message };
  return { report: data as DbReport, error: null };
}

// ─── Get status history for a report ─────────────────────────────────────────
export async function getStatusHistory(reportId: string): Promise<{ history: DbStatusHistory[]; error: string | null }> {
  const { data, error } = await supabase
    .from("report_status_history")
    .select("*")
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });

  if (error) return { history: [], error: error.message };
  return { history: (data as DbStatusHistory[]) ?? [], error: null };
}

// ─── ADMIN: Get all reports ───────────────────────────────────────────────────
export async function adminGetAllReports(options?: {
  category?: string;
  module?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ reports: DbReport[]; total: number; error: string | null }> {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 30;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("citizen_reports")
    .select("*", { count: "exact" })
    .order("submitted_at", { ascending: false })
    .range(from, to);

  if (options?.category) query = query.eq("category", options.category);
  if (options?.module) query = query.eq("module", options.module);
  if (options?.status) query = query.eq("current_status", options.status);
  if (options?.search) {
    query = query.or(
      `title.ilike.%${options.search}%,reference_number.ilike.%${options.search}%,citizen_name.ilike.%${options.search}%,location_description.ilike.%${options.search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) return { reports: [], total: 0, error: error.message };
  return { reports: (data as DbReport[]) ?? [], total: count ?? 0, error: null };
}

// ─── ADMIN: Update report status ──────────────────────────────────────────────
export async function adminUpdateStatus(
  reportId: string,
  newStatus: string,
  publicMessage: string,
  internalNote?: string,
  adminName = "Admin Officer"
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();

  // Get current status for history
  const { data: current } = await supabase
    .from("citizen_reports")
    .select("current_status")
    .eq("id", reportId)
    .single();

  const { error: updateError } = await supabase
    .from("citizen_reports")
    .update({
      current_status: newStatus,
      ...(newStatus === "RESOLVED" ? { resolved_at: new Date().toISOString() } : {}),
    })
    .eq("id", reportId);

  if (updateError) return { error: updateError.message };

  // Insert history
  const { error: historyError } = await supabase
    .from("report_status_history")
    .insert({
      report_id: reportId,
      previous_status: current?.current_status ?? null,
      new_status: newStatus,
      public_message: publicMessage,
      internal_note: internalNote ?? null,
      changed_by: user?.id ?? null,
      changed_by_name: adminName,
    });

  if (historyError) return { error: historyError.message };
  return { error: null };
}

// ─── ADMIN: Approve report for public display ─────────────────────────────────
export async function adminApprovePublic(reportId: string, approve: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("citizen_reports")
    .update({ public_visibility: approve })
    .eq("id", reportId);
  return { error: error?.message ?? null };
}

// ─── ADMIN: Assign report ─────────────────────────────────────────────────────
export async function adminAssignReport(
  reportId: string,
  departmentName: string,
  assignedTo: string,
  adminName = "Admin Officer",
  workerInstructions?: string,
  assignedWorkerId?: string
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();

  const updateData: Record<string, any> = {
    assigned_department_name: departmentName,
    assigned_to: assignedTo,
    current_status: "ASSIGNED",
  };
  if (workerInstructions) updateData.worker_instructions = workerInstructions;
  if (assignedWorkerId) updateData.assigned_worker_id = assignedWorkerId;

  const { error: updateError } = await supabase
    .from("citizen_reports")
    .update(updateData)
    .eq("id", reportId);

  if (updateError) return { error: updateError.message };

  const { data: current } = await supabase
    .from("citizen_reports")
    .select("current_status, title, location_description")
    .eq("id", reportId)
    .single();

  await supabase.from("report_status_history").insert({
    report_id: reportId,
    previous_status: current?.current_status ?? "SUBMITTED",
    new_status: "ASSIGNED",
    public_message: `Report assigned to ${departmentName}${assignedTo ? " — " + assignedTo : ""}.${workerInstructions ? ' Instructions: ' + workerInstructions : ''}`,
    changed_by: user?.id ?? null,
    changed_by_name: adminName,
  });

  if (assignedWorkerId) {
    await supabase.from("worker_notifications").insert({
      worker_id: assignedWorkerId,
      report_id: reportId,
      title: `New Assignment: ${current?.title ?? 'Complaint'}`,
      message: `Assigned in ${current?.location_description ?? 'Rewa'}.${workerInstructions ? ' Instructions: ' + workerInstructions : ''}`,
      type: "assignment",
    });
  }

  return { error: null };
}

// ─── ADMIN: Reopen report ─────────────────────────────────────────────────────
export async function adminReopenReport(
  reportId: string,
  reason: string,
  adminName = "Admin Officer"
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: current } = await supabase
    .from("citizen_reports")
    .select("current_status, assigned_worker_id, title")
    .eq("id", reportId)
    .single();

  const { error: updateError } = await supabase
    .from("citizen_reports")
    .update({
      current_status: "ASSIGNED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (updateError) return { error: updateError.message };

  await supabase.from("report_status_history").insert({
    report_id: reportId,
    previous_status: current?.current_status ?? "RESOLVED",
    new_status: "ASSIGNED",
    public_message: `Report reopened by ${adminName}: ${reason}`,
    changed_by: user?.id ?? null,
    changed_by_name: adminName,
  });

  if (current?.assigned_worker_id) {
    await supabase.from("worker_notifications").insert({
      worker_id: current.assigned_worker_id,
      report_id: reportId,
      title: `Task Reopened: ${current.title}`,
      message: `Reopened by Admin: ${reason}`,
      type: "reopened",
    });
  }

  return { error: null };
}

// ─── ADMIN: Upload completion image ──────────────────────────────────────────
export async function adminUploadCompletionImage(
  reportId: string,
  file: File
): Promise<{ error: string | null }> {
  const { path, error: uploadError } = await uploadReportImage(file, "completion-images");
  if (uploadError) return { error: uploadError };

  const { error } = await supabase
    .from("citizen_reports")
    .update({ completion_image_path: path })
    .eq("id", reportId);

  return { error: error?.message ?? null };
}

// ─── ADMIN: Update resolution note ───────────────────────────────────────────
export async function adminSetResolutionNote(reportId: string, note: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("citizen_reports")
    .update({ resolution_note: note })
    .eq("id", reportId);
  return { error: error?.message ?? null };
}

// ─── ADMIN: Get statistics ────────────────────────────────────────────────────
export async function adminGetStats(): Promise<{
  total: number;
  submitted: number;
  under_review: number;
  approved: number;
  assigned: number;
  in_progress: number;
  delayed: number;
  resolved: number;
  closed: number;
  rejected: number;
  by_category: Record<string, number>;
  by_module: Record<string, number>;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("citizen_reports")
    .select("current_status, category, module");

  if (error) {
    return {
      total: 0, submitted: 0, under_review: 0, approved: 0, assigned: 0,
      in_progress: 0, delayed: 0, resolved: 0, closed: 0, rejected: 0,
      by_category: {}, by_module: {}, error: error.message,
    };
  }

  const counts: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byModule: Record<string, number> = {};

  for (const row of data ?? []) {
    counts[row.current_status] = (counts[row.current_status] ?? 0) + 1;
    byCategory[row.category] = (byCategory[row.category] ?? 0) + 1;
    byModule[row.module] = (byModule[row.module] ?? 0) + 1;
  }

  return {
    total: data?.length ?? 0,
    submitted: counts["SUBMITTED"] ?? 0,
    under_review: counts["UNDER_REVIEW"] ?? 0,
    approved: counts["APPROVED"] ?? 0,
    assigned: counts["ASSIGNED"] ?? 0,
    in_progress: counts["IN_PROGRESS"] ?? 0,
    delayed: counts["DELAYED"] ?? 0,
    resolved: counts["RESOLVED"] ?? 0,
    closed: counts["CLOSED"] ?? 0,
    rejected: (counts["REJECTED"] ?? 0) + (counts["DUPLICATE"] ?? 0),
    by_category: byCategory,
    by_module: byModule,
    error: null,
  };
}

// ─── Get departments list ─────────────────────────────────────────────────────
export async function getDepartments(): Promise<Array<{ id: string; name: string; module: string }>> {
  const { data } = await supabase.from("departments").select("*").eq("is_active", true);
  return (data as any[]) ?? [];
}
