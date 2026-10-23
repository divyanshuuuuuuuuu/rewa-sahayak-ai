import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Calendar, ChevronRight, ClipboardList } from "lucide-react";
import {
  getMyAssignments, getImageUrl,
  workerStatusColors, workerStatusLabels,
  type WorkerAssignment
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
    }}>
      ● {workerStatusLabels[status] ?? status}
    </span>
  );
}

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
];

export default function WorkerTasks() {
  const [assignments, setAssignments] = useState<WorkerAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    getMyAssignments().then(({ assignments: a }) => {
      setAssignments(a);
      setLoading(false);
    });
  }, []);

  const filtered = activeTab === "all"
    ? assignments
    : assignments.filter(a => a.current_status === activeTab);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50dvh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 1rem" }} />
          <p style={{ color: "#0b3a6d", fontWeight: 600 }}>Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", maxWidth: 600, margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.2rem", fontWeight: 900, color: "#0b3a6d", marginBottom: "0.2rem" }}>
          My Assignments
        </h1>
        <p style={{ fontSize: "0.8rem", color: "#64748b" }}>
          {assignments.length} total task{assignments.length !== 1 ? "s" : ""} assigned to you
        </p>
      </div>

      {/* Tab Filter */}
      <div style={{
        display: "flex",
        gap: "0.4rem",
        overflowX: "auto",
        paddingBottom: "0.25rem",
        marginBottom: "1rem",
        scrollbarWidth: "none",
      }}>
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            style={{
              flexShrink: 0,
              padding: "0.45rem 1rem",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.78rem",
              background: activeTab === tab.value ? "#0b3a6d" : "#fff",
              color: activeTab === tab.value ? "#fff" : "#64748b",
              boxShadow: activeTab === tab.value ? "0 2px 8px rgba(11,58,109,0.25)" : "0 1px 4px rgba(0,0,0,0.06)",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
            {tab.value !== "all" && (
              <span style={{
                marginLeft: "0.4rem",
                background: activeTab === tab.value ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                color: activeTab === tab.value ? "#fff" : "#64748b",
                borderRadius: 10,
                padding: "0 5px",
                fontSize: "0.65rem",
              }}>
                {assignments.filter(a => a.current_status === tab.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task List */}
      {filtered.length === 0 ? (
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: "2.5rem 1rem",
          textAlign: "center",
          border: "1px dashed #cbd5e1",
        }}>
          <ClipboardList size={40} color="#cbd5e1" style={{ marginBottom: "0.75rem" }} />
          <div style={{ fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
            No tasks found
          </div>
          <div style={{ color: "#94a3b8", fontSize: "0.82rem" }}>
            {activeTab === "all"
              ? "You have no assignments yet."
              : `No tasks with "${workerStatusLabels[activeTab]}" status.`}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {filtered.map(a => {
            const imageUrl = a.before_image_path
              ? getImageUrl(a.before_image_path, "report-images")
              : null;
            return (
              <div key={a.id} style={{
                background: "#fff",
                borderRadius: 14,
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(11,58,109,0.07)",
                border: "1px solid #e2e8f0",
              }}>
                {/* Photo + Status row */}
                <div style={{ display: "flex", gap: 0 }}>
                  {imageUrl && (
                    <div style={{ width: 90, flexShrink: 0, position: "relative" }}>
                      <img
                        src={imageUrl}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", minHeight: 80 }}
                        onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
                      />
                    </div>
                  )}
                  <div style={{ flex: 1, padding: "0.85rem 1rem", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.35rem" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#0b3a6d" }}>
                        #{a.reference_number}
                      </span>
                      <StatusBadge status={a.current_status} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a", lineHeight: 1.3, marginBottom: "0.35rem", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {a.title}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: "0.25rem" }}>
                      {a.category}
                    </div>
                    {a.location_description && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.7rem", color: "#94a3b8" }}>
                        <MapPin size={11} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.location_description}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  borderTop: "1px solid #f1f5f9",
                  padding: "0.6rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.7rem", color: "#94a3b8" }}>
                    <Calendar size={11} />
                    {formatDate(a.updated_at)}
                  </div>
                  <Link
                    to={`/worker/task/${a.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      background: "linear-gradient(135deg, #0b3a6d, #1d4ed8)",
                      color: "#fff",
                      borderRadius: 8,
                      padding: "0.4rem 0.85rem",
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      textDecoration: "none",
                    }}
                  >
                    View Task <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
