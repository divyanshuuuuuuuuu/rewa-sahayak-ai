import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList, PlayCircle, CheckCircle2, Bell, MapPin, Calendar,
  ChevronRight, AlertCircle, HardHat, RefreshCw
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getMyAssignments, getMyWorkerProfile, getMyNotifications,
  getImageUrl, workerStatusColors, workerStatusLabels,
  type WorkerAssignment, type WorkerProfile
} from "../../services/workerService";

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

function StatCard({ value, label, color, icon: Icon }: { value: number; label: string; color: string; icon: any }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      padding: "1rem 0.85rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: "0.4rem",
      boxShadow: "0 2px 8px rgba(11,58,109,0.07)",
      border: `1px solid ${color}22`,
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{
        width: 34,
        height: 34,
        background: `${color}15`,
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Icon size={18} color={color} />
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600, lineHeight: 1.2 }}>{label}</div>
    </div>
  );
}

function AssignmentCard({ assignment }: { assignment: WorkerAssignment }) {
  const imageUrl = assignment.before_image_path
    ? getImageUrl(assignment.before_image_path, "report-images")
    : null;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: "0 2px 10px rgba(11,58,109,0.07)",
      border: "1px solid #e2e8f0",
    }}>
      {/* Thumbnail */}
      {imageUrl && (
        <div style={{ position: "relative", height: 130 }}>
          <img
            src={imageUrl}
            alt="Complaint"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div style={{
            position: "absolute",
            top: 8,
            left: 8,
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            fontSize: "0.65rem",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 20,
          }}>
            📷 BEFORE
          </div>
          <div style={{ position: "absolute", top: 8, right: 8 }}>
            <StatusBadge status={assignment.current_status} />
          </div>
        </div>
      )}
      {!imageUrl && (
        <div style={{ padding: "0.75rem 1rem 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <StatusBadge status={assignment.current_status} />
        </div>
      )}

      <div style={{ padding: "0.85rem 1rem 1rem" }}>
        {/* Reference */}
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#0b3a6d", marginBottom: "0.3rem" }}>
          #{assignment.reference_number}
        </div>

        {/* Title */}
        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9rem", lineHeight: 1.3, marginBottom: "0.5rem" }}>
          {assignment.title}
        </div>

        {/* Category */}
        <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.5rem" }}>
          {assignment.category}
          {assignment.assigned_department_name && (
            <span style={{ marginLeft: "0.4rem", color: "#0b3a6d", fontWeight: 600 }}>
              • {assignment.assigned_department_name}
            </span>
          )}
        </div>

        {/* Location */}
        {assignment.location_description && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.35rem", fontSize: "0.75rem", color: "#475569", marginBottom: "0.5rem" }}>
            <MapPin size={12} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
              {assignment.location_description}
            </span>
          </div>
        )}

        {/* Date */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.72rem", color: "#94a3b8", marginBottom: "0.85rem" }}>
          <Calendar size={12} />
          Assigned: {formatDate(assignment.updated_at)}
        </div>

        {/* View Details button */}
        <Link
          to={`/worker/task/${assignment.id}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            background: "linear-gradient(135deg, #0b3a6d, #1d4ed8)",
            color: "#fff",
            borderRadius: 10,
            padding: "0.65rem 1rem",
            fontWeight: 700,
            fontSize: "0.85rem",
            textDecoration: "none",
            width: "100%",
          }}
        >
          View Task
          <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}

export default function WorkerHome() {
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState<WorkerAssignment[]>([]);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  // Stats
  const newAssignments = assignments.filter(a => a.current_status === "ASSIGNED").length;
  const inProgress = assignments.filter(a => a.current_status === "IN_PROGRESS").length;
  const resolved = assignments.filter(a => a.current_status === "RESOLVED").length;
  const total = assignments.length;

  // Priority tasks: ASSIGNED + IN_PROGRESS, most recent first
  const priorityTasks = assignments
    .filter(a => a.current_status === "ASSIGNED" || a.current_status === "IN_PROGRESS")
    .slice(0, 5);

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
          <p style={{ color: "#0b3a6d", fontWeight: 600 }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", maxWidth: 600, margin: "0 auto" }}>
      {/* ─── Greeting Header ─── */}
      <div style={{
        background: "linear-gradient(135deg, #0b3a6d, #1d4ed8)",
        borderRadius: 16,
        padding: "1.25rem",
        marginBottom: "1.25rem",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
      }}>
        <div style={{
          width: 50,
          height: 50,
          background: "rgba(255,255,255,0.15)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <HardHat size={26} color="#fcd34d" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", marginBottom: "0.2rem" }}>
            {getGreeting()},
          </div>
          <div style={{ fontWeight: 800, fontSize: "1.05rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profile?.full_name ?? "Field Worker"}
          </div>
          {workerProfile && (
            <div style={{ fontSize: "0.72rem", color: "#93c5fd", marginTop: "0.15rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {workerProfile.designation} • {workerProfile.department_name}
            </div>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "0.4rem", cursor: "pointer", color: "#fff", display: "flex" }}
          aria-label="Refresh"
        >
          <RefreshCw size={16} style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }} />
        </button>
      </div>

      {/* Notification bar */}
      {unreadNotifs > 0 && (
        <Link
          to="/worker/notifications"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            background: "#fffbeb",
            border: "1px solid #fcd34d",
            borderRadius: 10,
            padding: "0.7rem 1rem",
            marginBottom: "1.25rem",
            textDecoration: "none",
          }}
        >
          <Bell size={16} color="#d97706" />
          <span style={{ flex: 1, fontSize: "0.82rem", fontWeight: 600, color: "#92400e" }}>
            You have {unreadNotifs} unread notification{unreadNotifs > 1 ? "s" : ""}
          </span>
          <ChevronRight size={16} color="#d97706" />
        </Link>
      )}

      {/* ─── Stats Cards ─── */}
      <div style={{ display: "flex", gap: "0.65rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <StatCard value={newAssignments} label="New Assignments" color="#d97706" icon={Bell} />
        <StatCard value={inProgress} label="In Progress" color="#7c3aed" icon={PlayCircle} />
        <StatCard value={resolved} label="Completed" color="#15803d" icon={CheckCircle2} />
        <StatCard value={total} label="Total Tasks" color="#0b3a6d" icon={ClipboardList} />
      </div>

      {/* ─── Priority Tasks ─── */}
      <div style={{ marginBottom: "0.85rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
          My Priority Tasks
        </h2>
        <Link
          to="/worker/tasks"
          style={{ fontSize: "0.78rem", color: "#0b3a6d", fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: "0.2rem" }}
        >
          View All <ChevronRight size={14} />
        </Link>
      </div>

      {priorityTasks.length === 0 ? (
        <div style={{
          background: "#fff",
          borderRadius: 14,
          padding: "2.5rem 1rem",
          textAlign: "center",
          border: "1px dashed #cbd5e1",
        }}>
          <CheckCircle2 size={40} color="#22c55e" style={{ marginBottom: "0.75rem" }} />
          <div style={{ fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>All caught up!</div>
          <div style={{ color: "#94a3b8", fontSize: "0.84rem" }}>
            No pending assignments right now. Check back later.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {priorityTasks.map(a => (
            <AssignmentCard key={a.id} assignment={a} />
          ))}
        </div>
      )}

      {/* ─── Quick Links ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem", marginTop: "1.25rem" }}>
        {[
          { to: "/worker/tasks", label: "All Assignments", icon: ClipboardList, color: "#d97706" },
          { to: "/worker/in-progress", label: "In Progress", icon: PlayCircle, color: "#7c3aed" },
          { to: "/worker/completed", label: "Completed", icon: CheckCircle2, color: "#15803d" },
          { to: "/worker/notifications", label: "Notifications", icon: Bell, color: "#0284c7", badge: unreadNotifs },
        ].map(link => (
          <Link
            key={link.to}
            to={link.to}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              textDecoration: "none",
              color: "#0f172a",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              border: "1px solid #e2e8f0",
              position: "relative",
            }}
          >
            <div style={{ width: 32, height: 32, background: `${link.color}15`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <link.icon size={16} color={link.color} />
            </div>
            <span style={{ fontWeight: 600, fontSize: "0.8rem", flex: 1 }}>{link.label}</span>
            {link.badge && link.badge > 0 ? (
              <span style={{ background: "#ef4444", color: "#fff", fontSize: "0.6rem", fontWeight: 800, borderRadius: 20, padding: "1px 5px" }}>
                {link.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
