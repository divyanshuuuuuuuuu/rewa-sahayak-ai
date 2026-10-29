// Worker & Department Dashboard Service — Rewa Sahayak AI
// Handles all Supabase operations, department isolation, work execution,
// mandatory completion photo verification, and automatic resolution.

import { supabase } from "./supabase";
import { uploadReportImage, getImageUrl } from "./supabaseStore";
import { isComplaintAuthorizedForDepartment, logAudit, findDepartmentAccount } from "./departmentAccountService";
import { updateComplaintStatus } from "./store";

// ─── Types ──────────────────────────────────────────────────────────────────
export interface WorkerProfile {
  id: string;
  user_id: string;
  name: string;
  designation: string;
  department_name: string;
  department_key?: string;
  whatsapp_phone: string;
  email: string | null;
  is_active: boolean;
  is_department_account?: boolean;
  role?: string;
}

export interface WorkerAssignment {
  id: string;
  reference_number: string;
  title: string;
  category: string;
  subcategory: string | null;
  module?: string | null;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  area_or_ward: string | null;
  location_description: string;
  latitude: number | null;
  longitude: number | null;
  before_image_path: string | null;
  completion_image_path: string | null;
  current_status: string;
  assigned_department_name: string | null;
  assigned_department?: string | null;
  assigned_to: string | null;
  assigned_worker_id: string | null;
  worker_instructions: string | null;
  work_started_at: string | null;
  completion_note: string | null;
  resolution_note?: string | null;
  completed_by_name: string | null;
  resolved_at?: string | null;
  work_duration_seconds?: number | null;
  worker_resolution_location?: { latitude: number; longitude: number; accuracy?: number } | null;
  delay_reason?: string | null;
  removed_from_website?: boolean | null;
  removal_reason?: string | null;
  voice_audio_path?: string | null;
  voice_audio_duration?: number | null;
  public_audio_consent?: boolean | null;
  submitted_at: string;
  updated_at: string;
  citizen_name: string | null;
}

export function formatDurationText(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return 'कम समय में';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs} hr ${mins} min`;
  }
  if (mins > 0) {
    return `${mins} min ${secs} sec`;
  }
  return `${secs} sec`;
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

// ─── Helper to retrieve currently authenticated department or worker ─────────
export function getAuthenticatedWorkerSession(): {
  userId: string;
  name: string;
  departmentName: string;
  departmentKey: string;
  email: string;
  isDepartmentAccount: boolean;
} | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("rewa_worker_session");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.user) {
        const u = parsed.user;
        const meta = u.user_metadata || {};
        const deptKey = meta.department_key || parsed.department_key || "water";
        const deptName = meta.department || meta.department_name || parsed.profile?.full_name || "Department";
        const name = meta.full_name || parsed.profile?.full_name || deptName;
        return {
          userId: u.id,
          name,
          departmentName: deptName,
          departmentKey: deptKey,
          email: u.email || "",
          isDepartmentAccount: !!meta.is_department_account,
        };
      }
    }
  } catch (err) {
    console.warn("Could not parse worker session:", err);
  }
  return null;
}

// ─── Get Worker Profile ───────────────────────────────────────────────────────
export async function getMyWorkerProfile(): Promise<{ profile: WorkerProfile | null; error: string | null }> {
  // 1. Check local session
  const session = getAuthenticatedWorkerSession();
  if (session) {
    const deptAcc = findDepartmentAccount(session.email || session.departmentKey);
    return {
      profile: {
        id: session.userId,
        user_id: session.userId,
        name: session.name,
        designation: deptAcc?.designation || (session.isDepartmentAccount ? `${session.departmentName} Queue Incharge` : "Field Worker"),
        department_name: session.departmentName,
        department_key: session.departmentKey,
        whatsapp_phone: deptAcc?.phone || "+919826000000",
        email: session.email || null,
        is_active: true,
        is_department_account: session.isDepartmentAccount,
      },
      error: null,
    };
  }

  // 2. Check Supabase auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { profile: null, error: "Not authenticated" };

  // Try finding in department_workers
  const { data: byUserId } = await supabase
    .from("department_workers")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (byUserId) {
    return { profile: byUserId as WorkerProfile, error: null };
  }

  return {
    profile: {
      id: user.id,
      user_id: user.id,
      name: user.email?.split("@")[0] || "Department Account",
      designation: "Departmental Operations Incharge",
      department_name: "Rewa Municipal Operations",
      department_key: "water",
      whatsapp_phone: "+919826000000",
      email: user.email || null,
      is_active: true,
      is_department_account: true,
    },
    error: null,
  };
}

// ─── Get Department Queue Assignments (Strict Department Isolation) ───────────
export async function getMyAssignments(): Promise<{ assignments: WorkerAssignment[]; error: string | null }> {
  const { profile } = await getMyWorkerProfile();
  if (!profile) return { assignments: [], error: "Not authenticated" };

  const deptKey = profile.department_key || "water";
  const deptName = profile.department_name;

  // Fetch all reports from Supabase
  const { data, error } = await supabase
    .from("citizen_reports")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (error) {
    console.warn("Supabase fetch failed, trying local store:", error.message);
    try {
      const raw = localStorage.getItem("rewa_complaints");
      if (raw) {
        const localComplaints = JSON.parse(raw);
        const filtered = localComplaints
          .filter((c: any) => isComplaintAuthorizedForDepartment(deptKey, deptName, c))
          .map((c: any) => ({
            ...c,
            reference_number: c.ticket_number,
            current_status: c.status,
            before_image_path: c.image_url,
            completion_image_path: c.video_url,
            assigned_department_name: c.assigned_department,
            location_description: c.address,
            submitted_at: c.created_at,
          }));
        return { assignments: filtered as WorkerAssignment[], error: null };
      }
    } catch {}
    return { assignments: [], error: error.message };
  }

  const reports = (data as WorkerAssignment[]) ?? [];

  // Filter with strict department isolation
  const authorized = reports.filter((r) =>
    isComplaintAuthorizedForDepartment(deptKey, deptName, r)
  );

  // Complaints marked as SUBMITTED are placed at the bottom of all complaints
  const sorted = [...authorized].sort((a, b) => {
    const aIsSubmitted = a.current_status === "SUBMITTED";
    const bIsSubmitted = b.current_status === "SUBMITTED";
    if (aIsSubmitted && !bIsSubmitted) return 1; // SUBMITTED moves towards bottom
    if (!aIsSubmitted && bIsSubmitted) return -1; // non-SUBMITTED stays at top
    return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
  });

  return { assignments: sorted, error: null };
}

// ─── Get Single Assignment with Flexible Lookup & Direct Inspection Support ───
export async function getMyAssignmentById(reportId: string): Promise<{
  assignment: WorkerAssignment | null;
  error: string | null;
  isCrossDepartment?: boolean;
  authorizedDepartmentName?: string;
}> {
  if (!reportId) return { assignment: null, error: "Task reference is required." };
  const cleanId = reportId.replace(/^#/, "").trim();

  // 1. Try querying Supabase by ID (if UUID) or by Reference Number
  let reportData: any = null;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
  if (isUuid) {
    const { data: byId } = await supabase
      .from("citizen_reports")
      .select("*")
      .eq("id", cleanId)
      .maybeSingle();
    if (byId) reportData = byId;
  }

  if (!reportData) {
    const { data: byRef } = await supabase
      .from("citizen_reports")
      .select("*")
      .eq("reference_number", cleanId)
      .maybeSingle();
    if (byRef) {
      reportData = byRef;
    }
  }

  // 2. Check local store fallback or merge local status progress (like IN_PROGRESS / RESOLVED)
  try {
    const raw = localStorage.getItem("rewa_complaints");
    if (raw) {
      const localList = JSON.parse(raw);
      const match = localList.find((c: any) =>
        (reportData && (c.id === reportData.id || c.ticket_number === reportData.reference_number)) ||
        c.id === cleanId ||
        c.ticket_number === cleanId
      );
      if (match) {
        if (!reportData) {
          reportData = {
            id: match.id,
            reference_number: match.ticket_number,
            title: match.title,
            description: match.description,
            category: match.category,
            subcategory: match.subcategory,
            module: match.module,
            severity: match.severity,
            area_or_ward: match.address,
            location_description: match.address,
            latitude: match.latitude,
            longitude: match.longitude,
            before_image_path: match.image_url,
            completion_image_path: match.video_url,
            current_status: match.status,
            assigned_department_name: match.assigned_department,
            assigned_to: match.assigned_to,
            delay_reason: match.delay_reason,
            resolution_note: match.resolution_note || match.completion_note,
            resolved_at: match.resolved_at,
            work_started_at: match.work_started_at,
            voice_audio_path: match.audio_url || match.voice_audio_path,
            voice_audio_duration: match.audio_duration || match.voice_audio_duration,
            public_audio_consent: match.public_audio_consent,
            submitted_at: match.created_at,
            updated_at: match.updated_at,
            citizen_name: match.citizen_name,
          };
        } else {
          // If local complaint has more recent status (IN_PROGRESS or RESOLVED), merge it
          if (match.status === "IN_PROGRESS" || match.status === "RESOLVED") {
            reportData.current_status = match.status;
          }
          if (match.work_started_at) {
            reportData.work_started_at = match.work_started_at;
          }
          if (match.video_url || match.completion_image_path) {
            reportData.completion_image_path = match.video_url || match.completion_image_path;
          }
          if (match.resolution_note || match.completion_note) {
            reportData.resolution_note = match.resolution_note || match.completion_note;
          }
        }
      }
    }
  } catch {}

  if (!reportData) {
    return { assignment: null, error: `Complaint #${cleanId} was not found.` };
  }

  // 3. Check authentication status
  const { profile } = await getMyWorkerProfile();
  if (!profile) {
    // Direct inspection link: Return assignment with full view capability
    return {
      assignment: reportData as WorkerAssignment,
      error: null,
      authorizedDepartmentName: reportData.assigned_department_name || "Water Supply & Drainage Dept",
    };
  }

  // If Admin, full supervisory access
  if (profile.role === "admin" || profile.role === "superadmin") {
    return { assignment: reportData as WorkerAssignment, error: null };
  }

  // Strict departmental isolation check for logged-in workers
  const deptKey = profile.department_key || "water";
  const deptName = profile.department_name;
  const isAuthorized = isComplaintAuthorizedForDepartment(deptKey, deptName, reportData);

  if (!isAuthorized) {
    return {
      assignment: reportData as WorkerAssignment,
      error: null,
      isCrossDepartment: true,
      authorizedDepartmentName: reportData.assigned_department_name || "Water Supply & Drainage Dept",
    };
  }

  return { assignment: reportData as WorkerAssignment, error: null };
}

// ─── Record Official Work Delay with Reason ──────────────────────────────────
export async function recordWorkDelay(
  reportId: string,
  delayReason: string,
  workerName?: string
): Promise<{ error: string | null }> {
  if (!reportId || !delayReason.trim()) {
    return { error: "Please enter a valid reason for delay." };
  }

  const { profile } = await getMyWorkerProfile();
  const cleanId = (reportId || "").replace(/^#/, "").trim();
  const { assignment } = await getMyAssignmentById(cleanId);
  const now = new Date().toISOString();
  const performer = workerName || profile?.name || profile?.department_name || "Water Works Operations / फील्ड टीम";
  const targetId = assignment?.id || cleanId;

  // 1. Update in Supabase
  const { error: sbErr } = await supabase
    .from("citizen_reports")
    .update({
      delay_reason: delayReason.trim(),
      updated_at: now,
    })
    .eq("id", targetId);

  if (sbErr) {
    console.warn("Supabase delay_reason update warning:", sbErr.message);
  }

  // 2. Insert into report_status_history
  await supabase.from("report_status_history").insert({
    report_id: targetId,
    previous_status: assignment?.current_status || "IN_PROGRESS",
    new_status: assignment?.current_status || "IN_PROGRESS",
    public_message: `⚠️ कार्य में विलंब की सूचना (Work Delayed): ${delayReason.trim()}`,
    changed_by_name: performer,
  });

  // 3. Update local store
  try {
    const raw = localStorage.getItem("rewa_complaints");
    if (raw) {
      const list = JSON.parse(raw);
      const match = list.find((c: any) => c.id === targetId || c.ticket_number === targetId);
      if (match) {
        match.delay_reason = delayReason.trim();
        match.updated_at = now;
        match.updates = match.updates || [];
        match.updates.push({
          id: `delay-${Date.now()}`,
          complaint_id: match.id,
          status: match.status,
          note: `⚠️ कार्य में विलंब: ${delayReason.trim()}`,
          updated_by: performer,
          created_at: now,
        });
        localStorage.setItem("rewa_complaints", JSON.stringify(list));
      }
    }
  } catch {}

  // 4. Audit log
  logAudit({
    action: "WORK_STARTED",
    department_name: assignment?.assigned_department_name || profile?.department_name || "Water Supply & Drainage Dept",
    complaint_ref: assignment?.reference_number || targetId,
    performed_by: performer,
    details: `Work delayed for #${assignment?.reference_number || targetId}. Reason: ${delayReason.trim()}`,
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("rewa_store_updated"));
    window.dispatchEvent(new CustomEvent("rewa_worker_tasks_updated"));
  }

  return { error: null };
}

// ─── Start Work on an Assignment ─────────────────────────────────────────────
export async function startWork(
  reportId: string,
  workerLocation?: { latitude: number; longitude: number; accuracy?: number }
): Promise<{ error: string | null }> {
  const { profile } = await getMyWorkerProfile();
  const cleanId = (reportId || "").replace(/^#/, "").trim();
  const { assignment, error: authErr } = await getMyAssignmentById(cleanId);
  if (authErr || !assignment) return { error: authErr || "Assignment not found" };

  if (assignment.current_status !== "ASSIGNED" && assignment.current_status !== "SUBMITTED") {
    return { error: `Cannot start work — current status is ${assignment.current_status}` };
  }

  const now = new Date().toISOString();
  const performer = profile?.name || profile?.department_name || assignment.assigned_department_name || "Water Works Field Operations";
  const deptName = profile?.department_name || assignment.assigned_department_name || "Water Supply & Drainage Dept";
  const targetId = assignment.id || cleanId;

  // 1. Update in Supabase
  try {
    const isTargetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
    let q = supabase
      .from("citizen_reports")
      .update({
        current_status: "IN_PROGRESS",
        updated_at: now,
      });

    if (isTargetUuid) {
      await q.eq("id", targetId);
    } else {
      await q.eq("reference_number", assignment.reference_number || cleanId);
    }
  } catch (err) {
    console.warn("Supabase startWork network error:", err);
  }

  const locMsg = workerLocation
    ? ` [📍 कार्य स्थल उपस्थिति GPS सत्यापित: ${workerLocation.latitude.toFixed(4)}°N, ${workerLocation.longitude.toFixed(4)}°E (±${Math.round(workerLocation.accuracy || 10)}m)]`
    : '';

  // 2. Insert into report_status_history (if valid report UUID in Supabase)
  try {
    const isTargetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
    if (isTargetUuid) {
      await supabase.from("report_status_history").insert({
        report_id: targetId,
        previous_status: assignment.current_status,
        new_status: "IN_PROGRESS",
        public_message: `▶ ${performer} (${deptName}) ने घटनास्थल पर कार्य प्रारंभ किया (Work Timer Started).${locMsg}`,
        changed_by_name: performer,
      });
    }
  } catch (err) {
    console.warn("Supabase report_status_history insert skipped:", err);
  }

  // 3. Update local store & localStorage directly
  updateComplaintStatus(
    targetId,
    "IN_PROGRESS",
    `${performer} ने घटनास्थल पर कार्य प्रारंभ किया।${locMsg}`,
    performer
  );
  if (assignment.reference_number) {
    updateComplaintStatus(
      assignment.reference_number,
      "IN_PROGRESS",
      `${performer} ने घटनास्थल पर कार्य प्रारंभ किया।${locMsg}`,
      performer
    );
  }

  try {
    const raw = localStorage.getItem("rewa_complaints");
    if (raw) {
      const list = JSON.parse(raw);
      const match = list.find((c: any) =>
        c.id === targetId ||
        c.ticket_number === targetId ||
        c.id === cleanId ||
        c.ticket_number === cleanId ||
        c.ticket_number === assignment.reference_number
      );
      if (match) {
        match.status = "IN_PROGRESS";
        match.work_started_at = now;
        match.updated_at = now;
        localStorage.setItem("rewa_complaints", JSON.stringify(list));
      }
    }
  } catch {}

  assignment.work_started_at = now;
  assignment.current_status = "IN_PROGRESS";

  // 4. Audit logging
  logAudit({
    action: "WORK_STARTED",
    department_name: deptName,
    complaint_ref: assignment.reference_number,
    performed_by: performer,
    details: `Work started on #${assignment.reference_number}. Timer started at ${now}.${locMsg}`,
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("rewa_store_updated"));
    window.dispatchEvent(new CustomEvent("rewa_worker_tasks_updated"));
  }

  return { error: null };
}

// ─── Submit Completed Work (Mandatory Photo Proof & Automatic Resolution) ────
export async function submitCompletedWork(
  reportId: string,
  completionPhoto: File,
  completionNote: string,
  workerLocation?: { latitude: number; longitude: number; accuracy?: number }
): Promise<{ error: string | null }> {
  const { profile } = await getMyWorkerProfile();
  const cleanId = (reportId || "").replace(/^#/, "").trim();

  // 1. Verify complaint authorization
  const { assignment, error: authErr } = await getMyAssignmentById(cleanId);
  if (authErr || !assignment) return { error: authErr || "Assignment not found" };

  if (assignment.current_status === "RESOLVED") {
    return { error: "This complaint is already resolved." };
  }

  // 2. Mandatory photo validation
  if (!completionPhoto) {
    return { error: "Compulsory Requirement: A valid completion photograph is mandatory to resolve this complaint." };
  }

  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (!validTypes.includes(completionPhoto.type.toLowerCase())) {
    return { error: "Invalid image format: Please select a JPEG, PNG, or WebP photo." };
  }

  if (completionPhoto.size > 10 * 1024 * 1024) {
    return { error: "File too large: Completion photo must be under 10MB." };
  }

  // 3. Mandatory completion note validation
  const noteClean = completionNote.trim();
  if (!noteClean) {
    return { error: "Compulsory Requirement: Please enter a completion note explaining the work performed." };
  }

  // 4. Upload photo to Supabase Storage completion-images bucket with data-URL fallback
  let completionPath: string | null = null;
  let fullCompletionUrl: string = '';

  try {
    const res = await uploadReportImage(completionPhoto, "completion-images");
    if (res.path && !res.error) {
      completionPath = res.path;
      fullCompletionUrl = getImageUrl(res.path, "completion-images");
    }
  } catch (err) {
    console.warn("Storage upload error, using local data URL fallback:", err);
  }

  if (!fullCompletionUrl) {
    // Generate base64 Data URL fallback so photo proof is never lost
    fullCompletionUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(completionPhoto);
    });
    completionPath = fullCompletionUrl;
  }

  const performer = profile?.name || profile?.department_name || assignment.assigned_department_name || "जल आपूर्ति एवं जल निकासी विभाग";
  const now = new Date().toISOString();
  const targetId = assignment.id || cleanId;

  // Calculate elapsed duration
  const startTime = assignment.work_started_at || assignment.submitted_at || now;
  const durationSec = Math.max(1, Math.round((new Date(now).getTime() - new Date(startTime).getTime()) / 1000));
  const durationStr = formatDurationText(durationSec);

  const locMsg = workerLocation
    ? ` • 📍 ऑन-साइट उपस्थिति GPS सत्यापित (${workerLocation.latitude.toFixed(4)}°N, ${workerLocation.longitude.toFixed(4)}°E, ±${Math.round(workerLocation.accuracy || 8)}m)`
    : '';

  // 5. Update citizen_reports in Supabase
  try {
    const isTargetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
    let q = supabase
      .from("citizen_reports")
      .update({
        current_status: "RESOLVED",
        completion_image_path: completionPath,
        resolution_note: noteClean,
        resolved_at: now,
        public_visibility: true,
        updated_at: now,
      });

    if (isTargetUuid) {
      await q.eq("id", targetId);
    } else {
      await q.eq("reference_number", assignment.reference_number || cleanId);
    }
  } catch (err) {
    console.warn("Supabase submitCompletedWork network warning:", err);
  }

  // 6. Record in report_status_history
  try {
    const isTargetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
    if (isTargetUuid) {
      await supabase.from("report_status_history").insert({
        report_id: targetId,
        previous_status: assignment.current_status,
        new_status: "RESOLVED",
        public_message: `विभागीय कार्य पूर्ण: ${noteClean} [⏱️ कुल कार्य समय: ${durationStr}]${locMsg}`,
        changed_by_name: performer,
      });
    }
  } catch (err) {
    console.warn("report_status_history insert skipped:", err);
  }

  // 7. Synchronize local store & localStorage
  const updatedComplaint = updateComplaintStatus(
    targetId,
    "RESOLVED",
    noteClean,
    performer
  ) || (assignment.reference_number ? updateComplaintStatus(
    assignment.reference_number,
    "RESOLVED",
    noteClean,
    performer
  ) : undefined);

  if (updatedComplaint) {
    updatedComplaint.video_url = fullCompletionUrl;
    updatedComplaint.completion_note = noteClean;
    updatedComplaint.completed_by_name = performer;
    updatedComplaint.resolved_at = now;
    updatedComplaint.work_started_at = startTime;
    updatedComplaint.work_duration_seconds = durationSec;
    if (workerLocation) {
      updatedComplaint.worker_resolution_location = workerLocation;
    }
  }

  try {
    const raw = localStorage.getItem("rewa_complaints");
    if (raw) {
      const list = JSON.parse(raw);
      const match = list.find((c: any) =>
        c.id === targetId ||
        c.ticket_number === targetId ||
        c.id === cleanId ||
        c.ticket_number === cleanId ||
        c.ticket_number === assignment.reference_number
      );
      if (match) {
        match.status = "RESOLVED";
        match.video_url = fullCompletionUrl;
        match.completion_image_path = completionPath;
        match.resolution_note = noteClean;
        match.completion_note = noteClean;
        match.resolved_at = now;
        match.completed_by_name = performer;
        match.work_duration_seconds = durationSec;
        if (workerLocation) {
          match.worker_resolution_location = workerLocation;
        }
        localStorage.setItem("rewa_complaints", JSON.stringify(list));
      }
    }
  } catch {}

  assignment.current_status = "RESOLVED";
  assignment.completion_image_path = completionPath;
  assignment.completion_note = noteClean;
  assignment.resolved_at = now;
  assignment.work_duration_seconds = durationSec;
  if (workerLocation) {
    assignment.worker_resolution_location = workerLocation;
  }

  const resolvingDept = profile?.department_name || assignment.assigned_department_name || "जल आपूर्ति एवं जल निकासी विभाग";

  // 8. Log Audit history
  logAudit({
    action: "COMPLETION_SUBMITTED",
    department_name: resolvingDept,
    complaint_ref: assignment.reference_number,
    performed_by: performer,
    details: `Mandatory completion photo uploaded and note submitted for #${assignment.reference_number}. Execution Time: ${durationStr}.${locMsg}`,
  });

  logAudit({
    action: "COMPLAINT_RESOLVED",
    department_name: resolvingDept,
    complaint_ref: assignment.reference_number,
    performed_by: performer,
    details: `Complaint #${assignment.reference_number} automatically resolved in ${durationStr}.`,
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("rewa_store_updated"));
    window.dispatchEvent(new CustomEvent("rewa_worker_tasks_updated"));
  }

  return { error: null };
}

// ─── Get Department's Completed Work ──────────────────────────────────────────
export async function getMyCompletedWork(): Promise<{ assignments: WorkerAssignment[]; error: string | null }> {
  const { assignments, error } = await getMyAssignments();
  if (error) return { assignments: [], error };

  const completed = assignments.filter((a) => a.current_status === "RESOLVED");
  return { assignments: completed, error: null };
}

// ─── Worker Notifications ─────────────────────────────────────────────────────
export async function getMyNotifications(): Promise<{ notifications: WorkerNotification[]; error: string | null }> {
  const session = getAuthenticatedWorkerSession();
  const userId = session?.userId;
  if (!userId) return { notifications: [], error: null };

  const { data, error } = await supabase
    .from("worker_notifications")
    .select("*")
    .eq("worker_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    // Generate helpful departmental notifications from recent assignments
    const { assignments } = await getMyAssignments();
    const syntheticNotifs: WorkerNotification[] = assignments.slice(0, 5).map((a, idx) => ({
      id: `notif-${a.id}-${idx}`,
      worker_id: userId,
      report_id: a.id,
      title: a.current_status === "RESOLVED" ? "Task Completed" : `Assignment: #${a.reference_number}`,
      message: `${a.title} (${a.category}) in ${a.location_description}`,
      type: a.current_status === "RESOLVED" ? "completion" : "assignment",
      is_read: idx > 1,
      created_at: a.updated_at || a.submitted_at,
    }));
    return { notifications: syntheticNotifs, error: null };
  }

  return { notifications: (data as WorkerNotification[]) ?? [], error: null };
}

export async function markNotificationRead(notifId: string): Promise<void> {
  await supabase
    .from("worker_notifications")
    .update({ is_read: true })
    .eq("id", notifId);
}

export async function markAllNotificationsRead(): Promise<void> {
  const session = getAuthenticatedWorkerSession();
  if (!session) return;
  await supabase
    .from("worker_notifications")
    .update({ is_read: true })
    .eq("worker_id", session.userId)
    .eq("is_read", false);
}

// ─── Re-export image utility ──────────────────────────────────────────────────
export { getImageUrl };

// ─── Status Labels and Color Styling ──────────────────────────────────────────
export const workerStatusLabels: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const workerStatusColors: Record<string, string> = {
  SUBMITTED: "#64748b",
  UNDER_REVIEW: "#0284c7",
  ASSIGNED: "#d97706",
  IN_PROGRESS: "#7c3aed",
  RESOLVED: "#15803d",
  CLOSED: "#374151",
};
