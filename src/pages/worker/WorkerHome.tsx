import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ClipboardList, PlayCircle, CheckCircle2, Bell, MapPin, Calendar,
  ChevronRight, AlertCircle, HardHat, RefreshCw, Search, Filter,
  Clock, ShieldAlert, Sparkles, User, LogOut, FileImage, ImageOff
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getMyAssignments, getMyWorkerProfile, getMyNotifications,
  getImageUrl, workerStatusColors, workerStatusLabels,
  type WorkerAssignment, type WorkerProfile
} from "../../services/workerService";
import { DEPARTMENT_METADATA } from "../../services/departmentAccountService";

function StatusBadge({ status }: { status: string }) {
  const color = workerStatusColors[status] ?? "#64748b";
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "0.3rem",
      background: `${color}18`,
      color,
      border: `1px solid ${color}35`,
      borderRadius: 20,
      padding: "0.2rem 0.65rem",
      fontSize: "0.7rem",
      fontWeight: 700,
      letterSpacing: "0.02em",
    }}>
      ● {workerStatusLabels[status] ?? status}
    </span>
  );
}

function StatCard({ value, label, color, icon: Icon, onClick }: { value: number; label: string; color: string; icon: any; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: "0.85rem 0.75rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "0.35rem",
        boxShadow: "0 2px 8px rgba(11,58,109,0.06)",
        border: `1.5px solid ${color}25`,
        flex: "1 1 calc(33.333% - 0.5rem)",
        minWidth: 100,
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
    >
      <div style={{
        width: 32,
        height: 32,
        background: `${color}15`,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Icon size={16} color={color} />
      </div>
      <div style={{ fontSize: "1.45rem", fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600, lineHeight: 1.2 }}>{label}</div>
    </div>
  );
}

function AssignmentCard({ assignment }: { assignment: WorkerAssignment }) {
  const imageUrl = assignment.before_image_path
    ? (assignment.before_image_path.startsWith("http")
        ? assignment.before_image_path
        : getImageUrl(assignment.before_image_path, "report-images"))
    : null;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const isResolved = assignment.current_status === "RESOLVED";

  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: "0 2px 10px rgba(11,58,109,0.07)",
      border: "1px solid #e2e8f0",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Top Banner with Image if present */}
      {imageUrl ? (
        <div style={{ position: "relative", height: 130, background: "#f1f5f9" }}>
          <img
            src={imageUrl}
            alt="Citizen Complaint Evidence"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div style={{
            position: "absolute",
            top: 8,
            left: 8,
            background: "rgba(0,0,0,0.65)",
            color: "#fff",
            fontSize: "0.62rem",
            fontWeight: 800,
            padding: "2px 7px",
            borderRadius: 12,
            letterSpacing: "0.03em",
          }}>
            📷 CITIZEN EVIDENCE
          </div>
          <div style={{ position: "absolute", top: 8, right: 8 }}>
            <StatusBadge status={assignment.current_status} />
          </div>
        </div>
      ) : (
        <div style={{ padding: "0.75rem 1rem 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.68rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <ImageOff size={13} /> Text Grievance
          </span>
          <StatusBadge status={assignment.current_status} />
        </div>
      )}

      <div style={{ padding: "0.85rem 1rem 1rem", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Reference & Priority */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#0b3a6d" }}>
            #{assignment.reference_number}
          </span>
          {assignment.severity === "HIGH" && (
            <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: "0.62rem", fontWeight: 800, padding: "1px 6px", borderRadius: 10 }}>
              ⚡ HIGH PRIORITY
            </span>
          )}
        </div>

        {/* Title */}
        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.92rem", lineHeight: 1.35, marginBottom: "0.4rem" }}>
          {assignment.title}
        </div>

        {/* Category & Department */}
        <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.45rem" }}>
          <span style={{ fontWeight: 600, color: "#334155" }}>{assignment.category}</span>
          {assignment.assigned_department_name && (
            <span style={{ marginLeft: "0.4rem", color: "#0b3a6d" }}>
              • {assignment.assigned_department_name}
            </span>
          )}
        </div>

        {/* Location */}
        {assignment.location_description && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.35rem", fontSize: "0.75rem", color: "#475569", marginBottom: "0.45rem" }}>
            <MapPin size={12} style={{ flexShrink: 0, marginTop: 2, color: "#e65100" }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
              {assignment.location_description}
            </span>
          </div>
        )}

        {/* Date & Completion Status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", color: "#94a3b8", marginBottom: "0.85rem", marginTop: "auto" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <Calendar size={11} /> {formatDate(assignment.updated_at || assignment.submitted_at)}
          </span>
          {isResolved ? (
            <span style={{ color: "#15803d", fontWeight: 700 }}>✓ Evidence Saved</span>
          ) : (
            <span style={{ color: "#d97706", fontWeight: 600 }}>Action Required</span>
          )}
        </div>

        {/* View Details Action Link */}
        <Link
          to={`/worker/tasks/${assignment.id}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            background: isResolved ? "#f0fdf4" : "linear-gradient(135deg, #0b3a6d, #1d4ed8)",
            color: isResolved ? "#15803d" : "#fff",
            border: isResolved ? "1.5px solid #86efac" : "none",
            borderRadius: 10,
            padding: "0.65rem 1rem",
            fontWeight: 700,
            fontSize: "0.84rem",
            textDecoration: "none",
            width: "100%",
          }}
        >
          {isResolved ? "View Resolution Proof" : "View Details & Action"}
          <ChevronRight size={15} />
        </Link>
      </div>
    </div>
  );
}

export default function WorkerHome() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [assignments, setAssignments] = useState<WorkerAssignment[]>([]);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"urgent" | "oldest" | "newest">("urgent");

  const loadData = async () => {
    const [{ assignments: a }, { profile: wp }, { notifications: n }] = await Promise.all([
      getMyAssignments(),
      getMyWorkerProfile(),
      getMyNotifications(),
    ]);
    setAssignments(a);
    setWorkerProfile(wp);
    setUnreadNotifs(n.filter(x => !x.is_read).length);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Real database-calculated stats
  const total = assignments.length;
  const newAssignments = assignments.filter(a => a.current_status === "ASSIGNED").length;
  const inProgress = assignments.filter(a => a.current_status === "IN_PROGRESS").length;
  const resolved = assignments.filter(a => a.current_status === "RESOLVED").length;

  const todayStr = new Date().toISOString().split("T")[0];
  const completedToday = assignments.filter(
    a => a.current_status === "RESOLVED" && a.resolved_at && a.resolved_at.startsWith(todayStr)
  ).length;

  // Extract unique categories for filtering
  const availableCategories = Array.from(new Set(assignments.map(a => a.category).filter(Boolean)));

  // Filter & Search
  const filteredAssignments = assignments.filter(a => {
    // Status
    if (statusFilter !== "all" && a.current_status !== statusFilter) return false;
    // Category
    if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        a.reference_number?.toLowerCase().includes(q) ||
        a.title?.toLowerCase().includes(q) ||
        a.location_description?.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Sorting
  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    if (sortBy === "urgent") {
      if (a.severity === "HIGH" && b.severity !== "HIGH") return -1;
      if (b.severity === "HIGH" && a.severity !== "HIGH") return 1;
      return new Date(b.updated_at || b.submitted_at).getTime() - new Date(a.updated_at || a.submitted_at).getTime();
    }
    if (sortBy === "oldest") {
      return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
    }
    return new Date(b.updated_at || b.submitted_at).getTime() - new Date(a.updated_at || a.submitted_at).getTime();
  });

  // Oldest unresolved assignment requiring urgent attention
  const oldestPending = assignments
    .filter(a => a.current_status === "ASSIGNED" || a.current_status === "IN_PROGRESS")
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())[0];

  const deptKey = workerProfile?.department_key || "water";
  const deptMeta = DEPARTMENT_METADATA[deptKey] || { icon: "🏛️", badgeColor: "#0b3a6d", bgLight: "#eff6ff", labelHi: "" };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60dvh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 1rem" }} />
          <p style={{ color: "#0b3a6d", fontWeight: 600 }}>Loading department queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", maxWidth: 640, margin: "0 auto" }}>
      {/* ─── Department Header Banner ─── */}
      <div style={{
        background: "linear-gradient(135deg, #061a30 0%, #0b3a6d 60%, #1d4ed8 100%)",
        borderRadius: 16,
        padding: "1.25rem",
        marginBottom: "1rem",
        color: "#fff",
        boxShadow: "0 4px 16px rgba(11,58,109,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <div style={{
            width: 48,
            height: 48,
            background: "rgba(255,255,255,0.18)",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.6rem",
            flexShrink: 0,
          }}>
            {deptMeta.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
              <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.75)" }}>{getGreeting()},</span>
              <span style={{ background: "rgba(34,197,94,0.25)", color: "#86efac", fontSize: "0.6rem", fontWeight: 800, padding: "1px 6px", borderRadius: 10 }}>
                ● LIVE QUEUE
              </span>
            </div>
            <h1 style={{ fontWeight: 900, fontSize: "1.1rem", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {workerProfile?.department_name || profile?.full_name || "Department Portal"}
            </h1>
            <p style={{ fontSize: "0.74rem", color: "#93c5fd", marginTop: "0.15rem", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {workerProfile?.designation || "Authorized Municipal Operations Account"}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: 8,
              padding: "0.45rem",
              cursor: "pointer",
              color: "#fff",
              display: "flex",
            }}
            title="Refresh Live Data"
          >
            <RefreshCw size={16} style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }} />
          </button>
        </div>

        <div style={{
          background: "rgba(0,0,0,0.2)",
          borderRadius: 10,
          padding: "0.5rem 0.75rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.72rem",
          color: "rgba(255,255,255,0.85)",
        }}>
          <span>Authorized Department ID: <strong>{deptKey.toUpperCase()}</strong></span>
          <span>Logged in as: <strong>{workerProfile?.email || "Department"}</strong></span>
        </div>
      </div>

      {/* ─── Notifications Banner (if unread) ─── */}
      {unreadNotifs > 0 && (
        <Link
          to="/worker/notifications"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            background: "#fffbeb",
            border: "1px solid #fcd34d",
            borderRadius: 12,
            padding: "0.7rem 1rem",
            marginBottom: "1rem",
            textDecoration: "none",
          }}
        >
          <Bell size={16} color="#d97706" />
          <span style={{ flex: 1, fontSize: "0.82rem", fontWeight: 700, color: "#92400e" }}>
            You have {unreadNotifs} unread assignment notification{unreadNotifs > 1 ? "s" : ""}
          </span>
          <ChevronRight size={16} color="#d97706" />
        </Link>
      )}

      {/* ─── Live Statistics Grid (6 Cards from Real DB) ─── */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0b3a6d", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span>📊 Department Complaint Statistics (Live)</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <StatCard
            value={total}
            label="Total Complaints"
            color="#0b3a6d"
            icon={ClipboardList}
            onClick={() => setStatusFilter("all")}
          />
          <StatCard
            value={newAssignments}
            label="New Assignments"
            color="#d97706"
            icon={Bell}
            onClick={() => setStatusFilter("ASSIGNED")}
          />
          <StatCard
            value={inProgress}
            label="Work In Progress"
            color="#7c3aed"
            icon={PlayCircle}
            onClick={() => setStatusFilter("IN_PROGRESS")}
          />
          <StatCard
            value={resolved}
            label="Resolved Total"
            color="#15803d"
            icon={CheckCircle2}
            onClick={() => setStatusFilter("RESOLVED")}
          />
          <StatCard
            value={completedToday}
            label="Completed Today"
            color="#059669"
            icon={Sparkles}
          />
          <StatCard
            value={assignments.filter(a => a.severity === "HIGH" && a.current_status !== "RESOLVED").length}
            label="High Severity"
            color="#dc2626"
            icon={ShieldAlert}
            onClick={() => setSortBy("urgent")}
          />
        </div>
      </div>

      {/* ─── Prominent Urgent / Oldest Pending Assignment Highlight ─── */}
      {oldestPending && (
        <div style={{
          background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
          border: "1.5px solid #f59e0b",
          borderRadius: 14,
          padding: "1rem",
          marginBottom: "1.25rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#b45309", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Clock size={13} /> OLDEST PENDING ASSIGNMENT
            </span>
            <span style={{ background: "#f59e0b", color: "#fff", fontSize: "0.62rem", fontWeight: 800, padding: "1px 6px", borderRadius: 10 }}>
              ACTION REQUIRED
            </span>
          </div>
          <div style={{ fontWeight: 800, color: "#78350f", fontSize: "0.92rem", marginBottom: "0.3rem" }}>
            #{oldestPending.reference_number}: {oldestPending.title}
          </div>
          <p style={{ fontSize: "0.76rem", color: "#92400e", margin: "0 0 0.6rem 0", lineHeight: 1.4 }}>
            📍 {oldestPending.location_description} • Assigned: {new Date(oldestPending.submitted_at).toLocaleDateString()}
          </p>
          <Link
            to={`/worker/tasks/${oldestPending.id}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "#b45309",
              color: "#fff",
              padding: "0.45rem 0.85rem",
              borderRadius: 8,
              fontSize: "0.78rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Start Work Now <ChevronRight size={14} />
          </Link>
        </div>
      )}

      {/* ─── Search & Filter Controls ─── */}
      <div style={{
        background: "#fff",
        borderRadius: 14,
        padding: "0.85rem",
        marginBottom: "1rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        border: "1px solid #e2e8f0",
      }}>
        {/* Search Input */}
        <div style={{ position: "relative", marginBottom: "0.6rem" }}>
          <Search size={15} color="#94a3b8" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            className="form-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by ticket #, problem, or area..."
            style={{ paddingLeft: "2.2rem", fontSize: "0.84rem", width: "100%" }}
          />
        </div>

        {/* Filters row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.4rem" }}>
          <div>
            <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.2rem" }}>Status</label>
            <select
              className="form-input"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ fontSize: "0.75rem", padding: "0.35rem 0.5rem" }}
            >
              <option value="all">All Statuses ({total})</option>
              <option value="ASSIGNED">Assigned ({newAssignments})</option>
              <option value="IN_PROGRESS">In Progress ({inProgress})</option>
              <option value="RESOLVED">Resolved ({resolved})</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.2rem" }}>Category</label>
            <select
              className="form-input"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              style={{ fontSize: "0.75rem", padding: "0.35rem 0.5rem" }}
            >
              <option value="all">All Categories</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.2rem" }}>Sort By</label>
            <select
              className="form-input"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              style={{ fontSize: "0.75rem", padding: "0.35rem 0.5rem" }}
            >
              <option value="urgent">Urgent / Priority</option>
              <option value="oldest">Oldest Pending</option>
              <option value="newest">Recently Updated</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Department Complaints Queue Header ─── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h2 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
          Department Queue ({sortedAssignments.length})
        </h2>
        <Link
          to="/worker/tasks"
          style={{ fontSize: "0.78rem", color: "#0b3a6d", fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: "0.2rem" }}
        >
          View All <ChevronRight size={14} />
        </Link>
      </div>

      {/* ─── Complaint Cards List ─── */}
      {sortedAssignments.length === 0 ? (
        <div style={{
          background: "#fff",
          borderRadius: 14,
          padding: "2.5rem 1rem",
          textAlign: "center",
          border: "1px dashed #cbd5e1",
        }}>
          <CheckCircle2 size={40} color="#22c55e" style={{ marginBottom: "0.75rem" }} />
          <div style={{ fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>No matching complaints found</div>
          <div style={{ color: "#94a3b8", fontSize: "0.82rem" }}>
            Try resetting your filters or check back when new assignments arrive.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {sortedAssignments.slice(0, 10).map(a => (
            <AssignmentCard key={a.id} assignment={a} />
          ))}
        </div>
      )}

      {/* ─── Department Portal Fast Navigation Sections ─── */}
      <div style={{ marginTop: "1.5rem" }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0b3a6d", marginBottom: "0.5rem" }}>
          🧭 Portal Navigation Sections
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          {[
            { to: "/worker/tasks", label: "All Department Complaints", icon: ClipboardList, color: "#0b3a6d" },
            { to: "/worker/tasks?filter=ASSIGNED", label: "New Assignments", icon: Bell, color: "#d97706" },
            { to: "/worker/in-progress", label: "Work In Progress", icon: PlayCircle, color: "#7c3aed" },
            { to: "/worker/completed", label: "Resolved Complaints", icon: CheckCircle2, color: "#15803d" },
            { to: "/worker/completed", label: "Completion Evidence", icon: FileImage, color: "#059669" },
            { to: "/worker/profile", label: "Department Profile", icon: User, color: "#475569" },
          ].map(link => (
            <Link
              key={link.to + link.label}
              to={link.to}
              style={{
                background: "#fff",
                borderRadius: 10,
                padding: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                textDecoration: "none",
                color: "#0f172a",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ width: 28, height: 28, background: `${link.color}15`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <link.icon size={15} color={link.color} />
              </div>
              <span style={{ fontWeight: 600, fontSize: "0.76rem" }}>{link.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
