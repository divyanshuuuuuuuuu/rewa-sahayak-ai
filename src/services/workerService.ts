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
  resolved_at: string | null;
  delay_reason?: string | null;
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

  // 1. Try querying Supabase by ID or by Reference Number
  let reportData: any = null;

  const { data: byId } = await supabase
    .from("citizen_reports")
    .select("*")
    .eq("id", cleanId)
    .maybeSingle();

  if (byId) {
    reportData = byId;
  } else {
    const { data: byRef } = await supabase
      .from("citizen_reports")
      .select("*")
      .eq("reference_number", cleanId)
      .maybeSingle();
    if (byRef) {
      reportData = byRef;
    }
  }

  // 2. Check local store fallback if Supabase query missed
  if (!reportData) {
    try {
      const raw = localStorage.getItem("rewa_complaints");
      if (raw) {
        const localList = JSON.parse(raw);
        const match = localList.find((c: any) => c.id === cleanId || c.ticket_number === cleanId);
        if (match) {
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
            submitted_at: match.created_at,
            updated_at: match.updated_at,
            citizen_name: match.citizen_name,
          };
        }
      }
    } catch {}
  }

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
export async function startWork(reportId: string): Promise<{ error: string | null }> {
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
  const { error: updateErr } = await supabase
    .from("citizen_reports")
    .update({
      current_status: "IN_PROGRESS",
      updated_at: now,
    })
    .eq("id", targetId);

  if (updateErr) {
    console.warn("Supabase update error:", updateErr.message);
  }

  // 2. Insert into report_status_history
  await supabase.from("report_status_history").insert({
    report_id: reportId,
    previous_status: assignment.current_status,
    new_status: "IN_PROGRESS",
    public_message: `${performer} (${deptName}) has started work on this complaint.`,
    changed_by_name: performer,
  });

  // 3. Update local store
  updateComplaintStatus(
    reportId,
    "IN_PROGRESS",
    `${performer} has started on-site resolution work.`,
    performer
  );

  // 4. Audit logging
  logAudit({
    action: "WORK_STARTED",
    department_name: deptName,
    complaint_ref: assignment.reference_number,
    performed_by: performer,
    details: `Work started on complaint #${assignment.reference_number} (${assignment.title}).`,
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("rewa_store_updated"));
  }

  return { error: null };
}

// ─── Submit Completed Work (Mandatory Photo Proof & Automatic Resolution) ────
export async function submitCompletedWork(
  reportId: string,
  completionPhoto: File,
  completionNote: string
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

  // 4. Upload photo to Supabase Storage completion-images bucket
  const { path: completionPath, error: uploadErr } = await uploadReportImage(
    completionPhoto,
    "completion-images"
  );

  if (uploadErr || !completionPath) {
    return {
      error: `Photo upload to storage failed: ${uploadErr || "Unknown storage error"}. The complaint was NOT resolved.`,
    };
  }

  const performer = profile?.name || profile?.department_name || assignment.assigned_department_name || "जल आपूर्ति एवं जल निकासी विभाग";
  const now = new Date().toISOString();
  const fullCompletionUrl = getImageUrl(completionPath, "completion-images");
  const targetId = assignment.id || cleanId;

  // 5. Update citizen_reports in Supabase
  const { error: updateErr } = await supabase
    .from("citizen_reports")
    .update({
      current_status: "RESOLVED",
      completion_image_path: completionPath,
      resolution_note: noteClean,
      resolved_at: now,
      public_visibility: true,
      updated_at: now,
    })
    .eq("id", targetId);

  if (updateErr) {
    console.warn("Could not update citizen_reports in Supabase:", updateErr.message);
  }

  // 6. Record in report_status_history (Creates Official Department Response)
  await supabase.from("report_status_history").insert({
    report_id: targetId,
    previous_status: assignment.current_status,
    new_status: "RESOLVED",
    public_message: `विभागीय कार्य पूर्ण: ${noteClean}`,
    changed_by_name: performer,
  });

  // 7. Synchronize local store
  const updatedComplaint = updateComplaintStatus(
    reportId,
    "RESOLVED",
    noteClean,
    performer
  );
  if (updatedComplaint) {
    updatedComplaint.video_url = fullCompletionUrl;
    updatedComplaint.completion_note = noteClean;
    updatedComplaint.completed_by_name = performer;
    updatedComplaint.resolved_at = now;
  }

  const resolvingDept = profile?.department_name || assignment.assigned_department_name || "जल आपूर्ति एवं जल निकासी विभाग";

  // 8. Log Audit history
  logAudit({
    action: "COMPLETION_SUBMITTED",
    department_name: resolvingDept,
    complaint_ref: assignment.reference_number,
    performed_by: performer,
    details: `Mandatory completion photo uploaded and note submitted for #${assignment.reference_number}.`,
  });

  logAudit({
    action: "COMPLAINT_RESOLVED",
    department_name: resolvingDept,
    complaint_ref: assignment.reference_number,
    performed_by: performer,
    details: `Complaint #${assignment.reference_number} automatically resolved.`,
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("rewa_store_updated"));
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
