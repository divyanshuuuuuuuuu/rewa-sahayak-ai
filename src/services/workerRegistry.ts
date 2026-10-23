// Worker Registry for Rewa Municipal Corporation
// Maps official Worker IDs, departments, credentials, and department-specific complaint routing

export type DepartmentKey = 'water' | 'pwd' | 'waste' | 'electric' | 'sanitation' | 'admin';

export interface RegisteredWorker {
  id: string; // Database UUID in department_workers
  workerCode: string; // Official municipal worker ID (e.g., WRK-PWD-01, WRK-WTR-01)
  name: string;
  designation: string;
  departmentName: string;
  departmentKey: DepartmentKey;
  phone: string;
  email: string;
  password: string; // Default testing password
  aliases?: string[];
}

export interface DepartmentWorkerPreset {
  key: DepartmentKey;
  label: string;
  labelHi: string;
  icon: string;
  badgeColor: string;
  workerCode: string;
  name: string;
  designation: string;
  departmentName: string;
  email: string;
  password: string;
  description: string;
  categoriesHandled: string[];
}

export const REGISTERED_WORKERS: RegisteredWorker[] = [
  // ─── WATER SUPPLY & DRAINAGE ──────────────────────────────────────────────
  {
    id: "f18bcd27-0af7-4520-87e9-de50e9969514",
    workerCode: "WRK-WTR-01",
    name: "Er. R. K. Patel",
    designation: "Sub-Divisional Officer (Water)",
    departmentName: "Water Supply & Drainage Dept",
    departmentKey: "water",
    phone: "+919826456789",
    email: "water.worker@rewa.gov.in",
    password: "Water@Rewa2026!",
    aliases: ["water@rewa.gov.in", "rkpatel@rewa.gov.in", "water.worker", "water"],
  },
  {
    id: "8a4a5840-75ef-4f11-877a-d6b27fca2cb9",
    workerCode: "WRK-SAN-01",
    name: "Ramesh Kumar (Plumber)",
    designation: "Emergency Pipe Repair Tech",
    departmentName: "Water Supply & Drainage Dept",
    departmentKey: "water",
    phone: "+919826567890",
    email: "ramesh.kumar@rewa.gov.in",
    password: "Water@Rewa2026!",
    aliases: ["plumber@rewa.gov.in"],
  },
  {
    id: "2c619295-62e4-42e3-8208-8ae853fbce09",
    workerCode: "WRK-WTR-02",
    name: "Vinod Kushwaha",
    designation: "Drainage Gang Supervisor",
    departmentName: "Water Supply & Drainage Dept",
    departmentKey: "water",
    phone: "+919826678901",
    email: "vinod.kushwaha@rewa.gov.in",
    password: "Water@Rewa2026!",
  },

  // ─── PUBLIC WORKS DEPARTMENT (PWD) / ROADS ───────────────────────────────
  {
    id: "90f13a00-ae46-4977-b0df-76dcfa862573",
    workerCode: "WRK-PWD-01",
    name: "Er. S. K. Verma",
    designation: "Assistant Engineer (Roads)",
    departmentName: "Public Works Department (PWD)",
    departmentKey: "pwd",
    phone: "+919826123456",
    email: "pwd.worker@rewa.gov.in",
    password: "Worker@Rewa2026!",
    aliases: ["worker@rewa.gov.in", "skverma@rewa.gov.in", "pwd@rewa.gov.in", "pwd.worker", "worker"],
  },
  {
    id: "31dc949b-597e-4a4e-96dc-1bd9b824b7ed",
    workerCode: "WRK-PWD-03",
    name: "Ashok Tiwari",
    designation: "Road Gang Supervisor",
    departmentName: "Public Works Department (PWD)",
    departmentKey: "pwd",
    phone: "+919826345678",
    email: "ashok.tiwari@rewa.gov.in",
    password: "Worker@Rewa2026!",
  },

  // ─── WASTE MANAGEMENT & SANITATION ────────────────────────────────────────
  {
    id: "69cfe652-61eb-475d-8191-be319ba0a92f",
    workerCode: "WRK-WST-01",
    name: "Sanitation Supervisor Lalit",
    designation: "Ward Compactor & Depot Incharge",
    departmentName: "Waste Management Dept",
    departmentKey: "waste",
    phone: "+919826789012",
    email: "waste.worker@rewa.gov.in",
    password: "Waste@Rewa2026!",
    aliases: ["waste@rewa.gov.in", "sanitation.worker@rewa.gov.in", "sanitation@rewa.gov.in", "lalit@rewa.gov.in", "waste.worker"],
  },
  {
    id: "d26a8dc6-540b-479c-841c-5a29e88b86df",
    workerCode: "WRK-WST-02",
    name: "Manoj Singh",
    designation: "Zone 1 Solid Waste Officer",
    departmentName: "Waste Management Dept",
    departmentKey: "waste",
    phone: "+919826890123",
    email: "manoj.singh@rewa.gov.in",
    password: "Waste@Rewa2026!",
  },
  {
    id: "ac0253b6-a3d6-42b5-a6b1-66ede57660da",
    workerCode: "WRK-SAN-02",
    name: "Dr. Alok Shrivastava",
    designation: "Chief Municipal Health Inspector",
    departmentName: "Municipal Sanitation Dept",
    departmentKey: "sanitation",
    phone: "+919826901234",
    email: "alok.shrivastava@rewa.gov.in",
    password: "Waste@Rewa2026!",
  },

  // ─── ELECTRICAL & STREETLIGHTS ───────────────────────────────────────────
  {
    id: "269a098b-06c3-428a-9307-3f886669073d",
    workerCode: "WRK-PWD-02",
    name: "Lineman Suresh Pandey",
    designation: "Electrical Maintenance Incharge",
    departmentName: "Public Works Department (PWD)",
    departmentKey: "electric",
    phone: "+919826234567",
    email: "electric.worker@rewa.gov.in",
    password: "Electric@Rewa2026!",
    aliases: ["electric@rewa.gov.in", "suresh.pandey@rewa.gov.in", "light@rewa.gov.in", "electric.worker"],
  },

  // ─── GENERAL ADMINISTRATION ──────────────────────────────────────────────
  {
    id: "0164e794-8c01-4e18-a97d-91e3c3944c59",
    workerCode: "WRK-ADM-01",
    name: "Neeraj Sharma",
    designation: "Ward 12 Grievance Officer",
    departmentName: "General Administration Dept",
    departmentKey: "admin",
    phone: "+919826112233",
    email: "neeraj.sharma@rewa.gov.in",
    password: "Admin@Rewa2026!",
  },
];

// Presets for UI Quick Fill and Department testing
export const DEPARTMENT_WORKER_PRESETS: DepartmentWorkerPreset[] = [
  {
    key: "water",
    label: "Water Supply & Drainage",
    labelHi: "जल प्रदाय एवं जल निकासी विभाग",
    icon: "💧",
    badgeColor: "#0284c7",
    workerCode: "WRK-WTR-01",
    name: "Er. R. K. Patel",
    designation: "Sub-Divisional Officer (Water)",
    departmentName: "Water Supply & Drainage Dept",
    email: "water.worker@rewa.gov.in",
    password: "Water@Rewa2026!",
    description: "Handles water pipe bursts, dirty water supply, low pressure, open drain overflow, and waterlogging.",
    categoriesHandled: ["Water & Leakage", "Waterlogging & Drainage", "JalRakshak"],
  },
  {
    key: "pwd",
    label: "PWD & Roads Infrastructure",
    labelHi: "लोक निर्माण विभाग (सड़क एवं निर्माण)",
    icon: "🛣️",
    badgeColor: "#d97706",
    workerCode: "WRK-PWD-01",
    name: "Er. S. K. Verma",
    designation: "Assistant Engineer (Roads)",
    departmentName: "Public Works Department (PWD)",
    email: "pwd.worker@rewa.gov.in",
    password: "Worker@Rewa2026!",
    description: "Handles road potholes, damaged dividers, cave-ins, asphalt resurfacing, and pavement repairs.",
    categoriesHandled: ["Roads & Potholes", "Roads & Footpaths", "Civil Works"],
  },
  {
    key: "waste",
    label: "Waste & Sanitation Dept",
    labelHi: "कचरा प्रबंधन एवं स्वच्छता विभाग",
    icon: "🗑️",
    badgeColor: "#16a34a",
    workerCode: "WRK-WST-01",
    name: "Sanitation Supervisor Lalit",
    designation: "Ward Compactor & Depot Incharge",
    departmentName: "Waste Management Dept",
    email: "waste.worker@rewa.gov.in",
    password: "Waste@Rewa2026!",
    description: "Handles garbage not collected, overflowing bins, illegal dumping, public filth, and sanitization.",
    categoriesHandled: ["Waste Management", "Public Cleanliness", "Smart Waste"],
  },
  {
    key: "electric",
    label: "Streetlights & Electricity",
    labelHi: "विद्युत एवं प्रकाश व्यवस्था",
    icon: "💡",
    badgeColor: "#eab308",
    workerCode: "WRK-PWD-02",
    name: "Lineman Suresh Pandey",
    designation: "Electrical Maintenance Incharge",
    departmentName: "Public Works Department (PWD)",
    email: "electric.worker@rewa.gov.in",
    password: "Electric@Rewa2026!",
    description: "Handles non-functional streetlights, sparking wires, hazardous overhead cables, and dark road stretches.",
    categoriesHandled: ["Streetlights", "Electricity"],
  },
];

/**
 * Resolves any input (Worker ID, email, phone number, UUID, or name) to a RegisteredWorker.
 */
export function findRegisteredWorker(input: string): RegisteredWorker | null {
  if (!input) return null;
  const raw = input.trim().toLowerCase();
  const cleanPhone = raw.replace(/[^0-9]/g, "");

  // 1. Exact match on aliases
  const byAlias = REGISTERED_WORKERS.find(
    (w) => w.aliases && w.aliases.some((a) => a.toLowerCase() === raw)
  );
  if (byAlias) return byAlias;

  // 2. Exact match on email
  const byEmail = REGISTERED_WORKERS.find(
    (w) => w.email.toLowerCase() === raw
  );
  if (byEmail) return byEmail;

  // 3. Exact match on workerCode (e.g. WRK-PWD-01, WRK-WTR-01, wrk-wtr-01, WTR-01)
  const byCode = REGISTERED_WORKERS.find(
    (w) =>
      w.workerCode.toLowerCase() === raw ||
      w.workerCode.toLowerCase().replace(/[^a-z0-9]/g, "") === raw.replace(/[^a-z0-9]/g, "")
  );
  if (byCode) return byCode;

  // 4. Match by UUID prefix
  const byId = REGISTERED_WORKERS.find(
    (w) => w.id.toLowerCase() === raw || (raw.length >= 6 && w.id.toLowerCase().startsWith(raw))
  );
  if (byId) return byId;

  // 5. Match by phone digits
  if (cleanPhone.length >= 8) {
    const byPhone = REGISTERED_WORKERS.find((w) =>
      w.phone.replace(/[^0-9]/g, "").includes(cleanPhone)
    );
    if (byPhone) return byPhone;
  }

  // 6. Match by name
  const byName = REGISTERED_WORKERS.find((w) =>
    w.name.toLowerCase().includes(raw) || raw.includes(w.name.toLowerCase())
  );
  if (byName) return byName;

  // 7. General keyword / department match
  if (raw.includes("water") || raw.includes("patel") || raw.includes("jal") || raw.includes("pipe") || raw.includes("drain")) {
    return REGISTERED_WORKERS.find(w => w.workerCode === "WRK-WTR-01") || REGISTERED_WORKERS[0];
  }
  if (raw.includes("waste") || raw.includes("lalit") || raw.includes("garbage") || raw.includes("kachra") || raw.includes("clean") || raw.includes("safai")) {
    return REGISTERED_WORKERS.find(w => w.workerCode === "WRK-WST-01") || REGISTERED_WORKERS[5];
  }
  if (raw.includes("suresh") || raw.includes("light") || raw.includes("electric") || raw.includes("bijli")) {
    return REGISTERED_WORKERS.find(w => w.workerCode === "WRK-PWD-02") || REGISTERED_WORKERS[7];
  }
  if (raw.includes("pwd") || raw.includes("verma") || raw.includes("road") || raw.includes("pothole") || raw.includes("worker")) {
    return REGISTERED_WORKERS.find(w => w.workerCode === "WRK-PWD-01") || REGISTERED_WORKERS[3];
  }

  return null;
}

/**
 * Checks whether a given complaint/report belongs to a worker's department.
 */
export function isComplaintForDepartment(
  workerDepartment: string | undefined | null,
  workerName: string | undefined | null,
  complaint: {
    assigned_department_name?: string | null;
    assigned_department?: string | null;
    assigned_to?: string | null;
    assigned_worker_id?: string | null;
    category?: string | null;
    module?: string | null;
    title?: string | null;
    description?: string | null;
  }
): boolean {
  if (!workerDepartment && !workerName) return true;

  // 1. Direct assignment check
  if (workerName && complaint.assigned_to && complaint.assigned_to.toLowerCase().includes(workerName.toLowerCase())) {
    return true;
  }

  const dept = (workerDepartment || "").toLowerCase();
  const reportDept = ((complaint.assigned_department_name || complaint.assigned_department) || "").toLowerCase();
  const category = (complaint.category || "").toLowerCase();
  const moduleName = (complaint.module || "").toLowerCase();
  const text = `${complaint.title || ""} ${complaint.description || ""}`.toLowerCase();

  // Water Department matching
  if (dept.includes("water") || dept.includes("drain") || dept.includes("jal")) {
    if (reportDept.includes("water") || reportDept.includes("drain") || reportDept.includes("jal")) return true;
    if (category.includes("water") || category.includes("drain") || category.includes("leak") || category.includes("sewer") || category.includes("नल") || category.includes("जल")) return true;
    if (moduleName === "jalrakshak") return true;
    if (text.includes("leak") || text.includes("pipeline") || text.includes("drainage") || text.includes("waterlogging") || text.includes("water supply") || text.includes("water")) {
      return true;
    }
    return false;
  }

  // Waste Management & Sanitation matching
  if (dept.includes("waste") || dept.includes("sanitat") || dept.includes("clean") || dept.includes("kachra") || dept.includes("safai")) {
    if (reportDept.includes("waste") || reportDept.includes("sanitat") || reportDept.includes("clean")) return true;
    if (category.includes("waste") || category.includes("clean") || category.includes("garbage") || category.includes("sanitation") || category.includes("कचरा") || category.includes("सफाई")) return true;
    if (moduleName === "smart_waste") return true;
    if (text.includes("garbage") || text.includes("dustbin") || text.includes("dump") || text.includes("waste") || text.includes("kachra") || text.includes("toilet") || text.includes("dead animal")) {
      return true;
    }
    return false;
  }

  // Electrical & Streetlights matching
  if (dept.includes("electric") || dept.includes("light") || dept.includes("power") || (dept.includes("pwd") && (category.includes("light") || text.includes("light")))) {
    if (category.includes("streetlight") || category.includes("light") || category.includes("electric") || category.includes("बिजली")) return true;
    if (text.includes("streetlight") || text.includes("street light") || text.includes("pole") || text.includes("wire") || text.includes("cable") || text.includes("spark")) {
      return true;
    }
  }

  // PWD / Roads matching
  if (dept.includes("pwd") || dept.includes("public work") || dept.includes("road")) {
    if (reportDept.includes("public works") || reportDept.includes("pwd") || reportDept.includes("road")) return true;
    if (category.includes("road") || category.includes("pothole") || category.includes("footpath") || category.includes("सड़क") || category.includes("गड्ढा")) return true;
    if (moduleName === "rewa_sahayak" && !category.includes("water") && !category.includes("waste")) return true;
    if (text.includes("pothole") || text.includes("divider") || text.includes("road") || text.includes("asphalt") || text.includes("sadak")) {
      return true;
    }
    return false;
  }

  return true;
}
