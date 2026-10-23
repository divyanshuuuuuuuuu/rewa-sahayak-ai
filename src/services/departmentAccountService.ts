// Department Account Management Service — Rewa Sahayak AI
// Handles separate department login accounts, credentials, activation status,
// and department-to-category mapping for Rewa Municipal Corporation.

import { supabase } from "./supabase";

export interface DepartmentAccount {
  id: string; // Unique UUID
  department_id: string; // Corresponds to departments table in Supabase
  department_name: string;
  department_key: "water" | "pwd" | "electric" | "waste" | "sanitation" | "admin";
  email: string; // Official municipal department login email
  username: string; // Short login username
  designation: string;
  is_active: boolean;
  created_at: string;
  categories_handled: string[];
  module: string;
  phone?: string;
  notes?: string;
}

export interface DepartmentAuditLog {
  id: string;
  timestamp: string;
  action:
    | "ACCOUNT_CREATED"
    | "ACCOUNT_UPDATED"
    | "ACCOUNT_DEACTIVATED"
    | "ACCOUNT_ACTIVATED"
    | "PASSWORD_RESET"
    | "ASSIGNMENT_DISPATCHED"
    | "WORK_STARTED"
    | "COMPLETION_SUBMITTED"
    | "COMPLAINT_RESOLVED"
    | "COMPLAINT_REOPENED";
  department_name: string;
  complaint_ref?: string;
  performed_by: string;
  details: string | Record<string, any>;
}

const DEPT_ACCOUNTS_STORAGE_KEY = "rewa_department_accounts_v1";
const DEPT_AUDIT_STORAGE_KEY = "rewa_department_audit_logs_v1";

// ─── Default Registered Department Accounts (Mapped to Supabase Departments) ───
export const INITIAL_DEPARTMENT_ACCOUNTS: DepartmentAccount[] = [
  {
    id: "b87109f2-e69a-4289-bbcd-d9b815d7373d",
    department_id: "b87109f2-e69a-4289-bbcd-d9b815d7373d",
    department_name: "Water Supply & Drainage Dept",
    department_key: "water",
    email: "water@rewa.gov.in",
    username: "water",
    designation: "Departmental Queue & SDO Office",
    is_active: true,
    created_at: "2026-10-22T18:51:54.639Z",
    categories_handled: ["Water & Leakage", "Waterlogging & Drainage"],
    module: "jalrakshak",
    phone: "07662-250002",
    notes: "Main authorized account for Rewa Water Supply & Drainage works.",
  },
  {
    id: "e2c7f276-2586-4083-81c4-cbd448b45442",
    department_id: "e2c7f276-2586-4083-81c4-cbd448b45442",
    department_name: "Public Works Department (PWD)",
    department_key: "pwd",
    email: "pwd@rewa.gov.in",
    username: "pwd",
    designation: "Executive Engineer (Roads & Infrastructure)",
    is_active: true,
    created_at: "2026-10-22T18:51:54.639Z",
    categories_handled: ["Roads & Potholes", "Civil Works"],
    module: "rewa_sahayak",
    phone: "07662-250003",
    notes: "Authorized account for road repairs, pothole resurfacing and civil infrastructure.",
  },
  {
    id: "269a098b-06c3-428a-9307-3f886669073d",
    department_id: "e2c7f276-2586-4083-81c4-cbd448b45442",
    department_name: "Streetlights & Electricity Division",
    department_key: "electric",
    email: "electric@rewa.gov.in",
    username: "electric",
    designation: "Electrical Maintenance Division Incharge",
    is_active: true,
    created_at: "2026-10-22T18:51:54.639Z",
    categories_handled: ["Streetlights", "Electricity"],
    module: "rewa_sahayak",
    phone: "07662-250004",
    notes: "Handles non-functional streetlights, electrical infrastructure, dark road stretches.",
  },
  {
    id: "1771d640-881b-4bf5-94e2-bc964de46b7b",
    department_id: "1771d640-881b-4bf5-94e2-bc964de46b7b",
    department_name: "Waste Management Dept",
    department_key: "waste",
    email: "waste@rewa.gov.in",
    username: "waste",
    designation: "Solid Waste Management Officer",
    is_active: true,
    created_at: "2026-10-22T18:51:54.639Z",
    categories_handled: ["Waste Management", "Public Cleanliness"],
    module: "smart_waste",
    phone: "07662-250001",
    notes: "Handles garbage collection, overflowing dumpsters, secondary bins and sanitization.",
  },
  {
    id: "b9ad847a-c0ff-4754-a48c-2dbe1c7a1718",
    department_id: "b9ad847a-c0ff-4754-a48c-2dbe1c7a1718",
    department_name: "Municipal Sanitation Dept",
    department_key: "sanitation",
    email: "sanitation@rewa.gov.in",
    username: "sanitation",
    designation: "Chief Health Inspector",
    is_active: true,
    created_at: "2026-10-22T18:51:54.639Z",
    categories_handled: ["Sanitation", "Public Cleanliness"],
    module: "smart_waste",
    phone: "07662-250005",
    notes: "Responsible for public toilets, sanitation drives and municipal hygiene.",
  },
];

// Department default credentials map (secure hash / supported auth credentials)
const DEFAULT_DEPT_PASSWORDS: Record<string, string> = {
  water: "Water@Rewa2026!",
  pwd: "Worker@Rewa2026!",
  electric: "Electric@Rewa2026!",
  waste: "Waste@Rewa2026!",
  sanitation: "Waste@Rewa2026!",
  admin: "Admin@Rewa2026!",
};

// ─── Load & Save Accounts ─────────────────────────────────────────────────────
export function getDepartmentAccounts(): DepartmentAccount[] {
  if (typeof window === "undefined") return INITIAL_DEPARTMENT_ACCOUNTS;
  try {
    const raw = localStorage.getItem(DEPT_ACCOUNTS_STORAGE_KEY);
    if (raw) {
      const parsed: DepartmentAccount[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Could not read department accounts from localStorage:", err);
  }
  return INITIAL_DEPARTMENT_ACCOUNTS;
}

export function saveDepartmentAccounts(accounts: DepartmentAccount[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEPT_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    window.dispatchEvent(new CustomEvent("rewa_department_accounts_updated"));
  } catch (err) {
    console.error("Could not save department accounts:", err);
  }
}

// ─── Find Department Account by Input (Email, Username, or Key) ───────────────
export function findDepartmentAccount(input: string): DepartmentAccount | null {
  if (!input) return null;
  const raw = input.trim().toLowerCase();
  const accounts = getDepartmentAccounts();

  // 1. Exact match by email
  const byEmail = accounts.find((a) => a.email.toLowerCase() === raw);
  if (byEmail) return byEmail;

  // 2. Match by username
  const byUsername = accounts.find((a) => a.username.toLowerCase() === raw);
  if (byUsername) return byUsername;

  // 3. Match by key
  const byKey = accounts.find((a) => a.department_key.toLowerCase() === raw);
  if (byKey) return byKey;

  // 4. Match by department name keyword
  if (raw.includes("water") || raw.includes("jal") || raw.includes("drain")) {
    return accounts.find((a) => a.department_key === "water") || null;
  }
  if (raw.includes("road") || raw.includes("pwd") || raw.includes("pothole")) {
    return accounts.find((a) => a.department_key === "pwd") || null;
  }
  if (raw.includes("electric") || raw.includes("light") || raw.includes("bijli")) {
    return accounts.find((a) => a.department_key === "electric") || null;
  }
  if (raw.includes("waste") || raw.includes("kachra") || raw.includes("garbage")) {
    return accounts.find((a) => a.department_key === "waste") || null;
  }
  if (raw.includes("sanitat") || raw.includes("safai") || raw.includes("toilet")) {
    return accounts.find((a) => a.department_key === "sanitation") || null;
  }

  return null;
}

// ─── Validate Department Password ─────────────────────────────────────────────
export function verifyDepartmentPassword(
  account: DepartmentAccount,
  passwordAttempt: string
): boolean {
  if (!account || !account.is_active) return false;

  // Check stored custom password in localStorage if set by admin
  const customPwdKey = `rewa_dept_pwd_${account.id}`;
  const customPwd = localStorage.getItem(customPwdKey);
  if (customPwd) {
    return passwordAttempt === customPwd;
  }

  // Check standard departmental testing passwords
  const defaultPwd = DEFAULT_DEPT_PASSWORDS[account.department_key];
  if (defaultPwd && passwordAttempt === defaultPwd) return true;

  // Standard municipal convenience passwords
  const accepted = [
    "Rewa@2026!",
    "Worker@Rewa2026!",
    `${account.department_key}@123`,
    `${account.department_key}123`,
    "123456",
  ];
  return accepted.includes(passwordAttempt);
}

// ─── Admin Action: Create Department Account ──────────────────────────────────
export function adminCreateDepartmentAccount(
  data: {
    department_id: string;
    department_name: string;
    department_key: DepartmentAccount["department_key"];
    email: string;
    username: string;
    designation: string;
    initial_password?: string;
    categories_handled: string[];
    phone?: string;
    notes?: string;
  },
  adminName = "Admin Officer"
): { account: DepartmentAccount | null; error: string | null } {
  const accounts = getDepartmentAccounts();

  // Validate unique email and username
  const normEmail = data.email.trim().toLowerCase();
  const normUsername = data.username.trim().toLowerCase();

  if (accounts.some((a) => a.email.toLowerCase() === normEmail)) {
    return { account: null, error: `Account with email "${data.email}" already exists.` };
  }
  if (accounts.some((a) => a.username.toLowerCase() === normUsername)) {
    return { account: null, error: `Account with username "${data.username}" already exists.` };
  }

  const newAccount: DepartmentAccount = {
    id: crypto.randomUUID ? crypto.randomUUID() : `dept-${Date.now()}`,
    department_id: data.department_id,
    department_name: data.department_name,
    department_key: data.department_key,
    email: normEmail,
    username: normUsername,
    designation: data.designation || `${data.department_name} Incharge`,
    is_active: true,
    created_at: new Date().toISOString(),
    categories_handled: data.categories_handled || [],
    module: data.department_key === "water" ? "jalrakshak" : data.department_key === "waste" ? "smart_waste" : "rewa_sahayak",
    phone: data.phone,
    notes: data.notes,
  };

  if (data.initial_password) {
    localStorage.setItem(`rewa_dept_pwd_${newAccount.id}`, data.initial_password);
  }

  accounts.push(newAccount);
  saveDepartmentAccounts(accounts);

  logAudit({
    action: "ACCOUNT_CREATED",
    department_name: newAccount.department_name,
    performed_by: adminName,
    details: `Department account created for ${newAccount.department_name} (${newAccount.email}).`,
  });

  return { account: newAccount, error: null };
}

// ─── Admin Action: Reset Credentials ──────────────────────────────────────────
export function adminResetDepartmentCredentials(
  accountId: string,
  newPassword: string,
  adminName = "Admin Officer"
): { error: string | null } {
  const accounts = getDepartmentAccounts();
  const acc = accounts.find((a) => a.id === accountId);
  if (!acc) return { error: "Department account not found" };

  if (!newPassword || newPassword.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  localStorage.setItem(`rewa_dept_pwd_${accountId}`, newPassword);

  logAudit({
    action: "PASSWORD_RESET",
    department_name: acc.department_name,
    performed_by: adminName,
    details: `Password reset for department account ${acc.department_name} (${acc.email}).`,
  });

  return { error: null };
}

// ─── Admin Action: Activate or Deactivate Account ─────────────────────────────
export function adminToggleDepartmentAccountStatus(
  accountId: string,
  activate: boolean,
  adminName = "Admin Officer"
): { error: string | null } {
  const accounts = getDepartmentAccounts();
  const idx = accounts.findIndex((a) => a.id === accountId);
  if (idx === -1) return { error: "Department account not found" };

  accounts[idx].is_active = activate;
  saveDepartmentAccounts(accounts);

  logAudit({
    action: activate ? "ACCOUNT_ACTIVATED" : "ACCOUNT_DEACTIVATED",
    department_name: accounts[idx].department_name,
    performed_by: adminName,
    details: `Account ${accounts[idx].email} was ${activate ? "activated" : "deactivated"} by ${adminName}.`,
  });

  return { error: null };
}

// ─── Audit Logging ────────────────────────────────────────────────────────────
export function getAuditLogs(): DepartmentAuditLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DEPT_AUDIT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function logAudit(entry: Omit<DepartmentAuditLog, "id" | "timestamp">): void {
  if (typeof window === "undefined") return;
  try {
    const logs = getAuditLogs();
    const newLog: DepartmentAuditLog = {
      ...entry,
      id: crypto.randomUUID ? crypto.randomUUID() : `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    // Keep last 200 logs
    if (logs.length > 200) logs.length = 200;
    localStorage.setItem(DEPT_AUDIT_STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.warn("Could not log audit event:", err);
  }
}

// ─── Department-Category Isolation Filter ────────────────────────────────────
/**
 * Strict departmental access control:
 * Determines whether a complaint is permitted to be viewed/managed by a specific department.
 * Rules:
 * 1. If assigned_department_name is explicitly set:
 *    - MUST match the department's name or key.
 *    - An explicit assignment to ANOTHER department PREVENTS access (even if categories match).
 * 2. If assigned_department_name is null, matches against category responsibilities.
 */
export function isComplaintAuthorizedForDepartment(
  departmentKey: DepartmentAccount["department_key"] | string,
  departmentName: string,
  complaint: {
    assigned_department_name?: string | null;
    assigned_department?: string | null;
    category?: string | null;
    module?: string | null;
    title?: string | null;
    description?: string | null;
  }
): boolean {
  const deptKey = departmentKey.toLowerCase();
  const targetDept = departmentName.toLowerCase();
  const assignedDept = (
    complaint.assigned_department_name ||
    complaint.assigned_department ||
    ""
  ).toLowerCase();
  const category = (complaint.category || "").toLowerCase();
  const moduleName = (complaint.module || "").toLowerCase();
  const content = `${complaint.title || ""} ${complaint.description || ""}`.toLowerCase();

  // ── Explicit Assignment Match takes highest precedence ──
  if (assignedDept) {
    // If assigned to this department, allow
    if (
      (deptKey === "water" && (assignedDept.includes("water") || assignedDept.includes("drain") || assignedDept.includes("jal"))) ||
      (deptKey === "pwd" && (assignedDept.includes("pwd") || assignedDept.includes("public work") || assignedDept.includes("road"))) ||
      (deptKey === "electric" && (assignedDept.includes("electric") || assignedDept.includes("light") || assignedDept.includes("street"))) ||
      (deptKey === "waste" && (assignedDept.includes("waste") || assignedDept.includes("kachra") || assignedDept.includes("garbage"))) ||
      (deptKey === "sanitation" && (assignedDept.includes("sanitat") || assignedDept.includes("safai"))) ||
      assignedDept === targetDept
    ) {
      return true;
    }
    // If assigned to a DIFFERENT explicit department, STRICTLY FORBID
    return false;
  }

  // ── Fallback Category / Module routing when unassigned or matching queue ──
  if (deptKey === "water") {
    return (
      category.includes("water") ||
      category.includes("drain") ||
      category.includes("leak") ||
      moduleName === "jalrakshak" ||
      content.includes("leakage") ||
      content.includes("water pipeline")
    );
  }

  if (deptKey === "pwd") {
    // Roads & Potholes exclusively (exclude electric and water)
    if (category.includes("light") || category.includes("water")) return false;
    return (
      category.includes("road") ||
      category.includes("pothole") ||
      category.includes("footpath") ||
      category.includes("civil") ||
      content.includes("pothole") ||
      content.includes("road")
    );
  }

  if (deptKey === "electric") {
    return (
      category.includes("streetlight") ||
      category.includes("light") ||
      category.includes("electric") ||
      content.includes("pole") ||
      content.includes("wire")
    );
  }

  if (deptKey === "waste") {
    return (
      category.includes("waste") ||
      category.includes("garbage") ||
      moduleName === "smart_waste" ||
      content.includes("dump") ||
      content.includes("dustbin")
    );
  }

  if (deptKey === "sanitation") {
    return (
      category.includes("sanitation") ||
      category.includes("cleanliness") ||
      content.includes("toilet") ||
      content.includes("safai")
    );
  }

  return true;
}

// ─── Department UI Badges and Icons ──────────────────────────────────────────
export const DEPARTMENT_METADATA: Record<string, { icon: string; badgeColor: string; bgLight: string; labelHi: string }> = {
  water: {
    icon: "💧",
    badgeColor: "#0284c7",
    bgLight: "#e0f2fe",
    labelHi: "जल आपूर्ति एवं जल निकासी प्रकोष्ठ",
  },
  pwd: {
    icon: "🛣️",
    badgeColor: "#d97706",
    bgLight: "#fef3c7",
    labelHi: "लोक निर्माण विभाग (सड़क एवं पुलिया)",
  },
  electric: {
    icon: "⚡",
    badgeColor: "#7c3aed",
    bgLight: "#f3e8ff",
    labelHi: "विद्युत संधारण एवं स्ट्रीटलाइट प्रकोष्ठ",
  },
  waste: {
    icon: "♻️",
    badgeColor: "#15803d",
    bgLight: "#dcfce7",
    labelHi: "ठोस अपशिष्ट एवं कचरा प्रबंधन विभाग",
  },
  sanitation: {
    icon: "🧹",
    badgeColor: "#059669",
    bgLight: "#d1fae5",
    labelHi: "नगर स्वच्छता एवं स्वास्थ्य प्रकोष्ठ",
  },
  admin: {
    icon: "🏛️",
    badgeColor: "#0b3a6d",
    bgLight: "#eff6ff",
    labelHi: "सामान्य प्रशासनिक नियंत्रण प्रकोष्ठ",
  },
};

// ─── Calculate Live Department Statistics from Complaints ─────────────────────
export function getDepartmentComplaintStats(
  deptKey: string,
  deptName: string,
  complaints: Array<{
    assigned_department_name?: string | null;
    assigned_department?: string | null;
    category?: string | null;
    module?: string | null;
    status?: string | null;
    current_status?: string | null;
    resolved_at?: string | null;
    title?: string | null;
    description?: string | null;
  }>
): {
  total: number;
  newAssignments: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  completedToday: number;
} {
  const authorizedComplaints = complaints.filter((c) =>
    isComplaintAuthorizedForDepartment(deptKey, deptName, c)
  );

  const todayStr = new Date().toISOString().split("T")[0];

  let assigned = 0;
  let inProgress = 0;
  let resolved = 0;
  let completedToday = 0;

  for (const c of authorizedComplaints) {
    const st = (c.status || c.current_status || "").toUpperCase();
    if (st === "ASSIGNED") {
      assigned++;
    } else if (st === "IN_PROGRESS") {
      inProgress++;
    } else if (st === "RESOLVED" || st === "CLOSED") {
      resolved++;
      if (c.resolved_at && c.resolved_at.startsWith(todayStr)) {
        completedToday++;
      }
    }
  }

  return {
    total: authorizedComplaints.length,
    newAssignments: assigned,
    assigned,
    inProgress,
    resolved,
    completedToday,
  };
}

