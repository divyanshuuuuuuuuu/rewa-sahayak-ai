import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Calendar, PlayCircle, ChevronRight } from "lucide-react";
import {
  getMyAssignments, getImageUrl,
  workerStatusColors, workerStatusLabels,
  type WorkerAssignment
} from "../../services/workerService";

export default function WorkerInProgress() {
  const [assignments, setAssignments] = useState<WorkerAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyAssignments().then(({ assignments: a }) => {
      setAssignments(a.filter(x => x.current_status === "IN_PROGRESS"));
      setLoading(false);
    });
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50dvh" }}>
        <div className="spinner" style={{ margin: "0 auto" }} />
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.2rem", fontWeight: 900, color: "#0b3a6d", marginBottom: "0.2rem" }}>
          Work In Progress
        </h1>
        <p style={{ fontSize: "0.8rem", color: "#64748b" }}>
          {assignments.length} active task{assignments.length !== 1 ? "s" : ""}
        </p>
      </div>

      {assignments.length === 0 ? (
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: "3rem 1rem",
          textAlign: "center",
          border: "1px dashed #cbd5e1",
        }}>
          <PlayCircle size={44} color="#cbd5e1" style={{ marginBottom: "0.75rem" }} />
          <div style={{ fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
            No tasks in progress
          </div>
          <div style={{ color: "#94a3b8", fontSize: "0.82rem", marginBottom: "1rem" }}>
            Start working on an assigned complaint to see it here.
          </div>
          <Link
            to="/worker/tasks"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "#0b3a6d",
              color: "#fff",
              padding: "0.65rem 1.25rem",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: "0.84rem",
              textDecoration: "none",
            }}
          >
            View Assigned Tasks
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {assignments.map(a => {
            const imageUrl = a.before_image_path ? getImageUrl(a.before_image_path, "report-images") : null;
            const color = workerStatusColors[a.current_status];
            return (
              <div key={a.id} style={{
                background: "#fff",
                borderRadius: 14,
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(124,58,237,0.1)",
                border: `1px solid ${color}30`,
              }}>
                {/* Progress indicator */}
                <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />

                <div style={{ display: "flex", gap: 0 }}>
                  {imageUrl && (
                    <div style={{ width: 90, flexShrink: 0 }}>
                      <img
                        src={imageUrl}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", minHeight: 85 }}
                        onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
                      />
                    </div>
                  )}
                  <div style={{ flex: 1, padding: "0.85rem 1rem", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#0b3a6d" }}>
                        #{a.reference_number}
                      </span>
                      <span style={{
                        background: `${color}18`,
                        color,
                        border: `1px solid ${color}35`,
                        borderRadius: 20,
                        padding: "0.15rem 0.6rem",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                      }}>
                        ● {workerStatusLabels[a.current_status]}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a", lineHeight: 1.3, marginBottom: "0.35rem", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {a.title}
                    </div>
                    {a.location_description && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.7rem", color: "#94a3b8" }}>
                        <MapPin size={11} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.location_description}
                        </span>
                      </div>
                    )}
                    {a.work_started_at && (
                      <div style={{ fontSize: "0.68rem", color: "#7c3aed", fontWeight: 600, marginTop: "0.3rem" }}>
                        Started: {formatDate(a.work_started_at)}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{
                  borderTop: "1px solid #f3f0ff",
                  padding: "0.65rem 1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span style={{ fontSize: "0.72rem", color: "#7c3aed", fontWeight: 600 }}>
                    📸 Upload completion photo to resolve
                  </span>
                  <Link
                    to={`/worker/task/${a.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      background: "#7c3aed",
                      color: "#fff",
                      borderRadius: 8,
                      padding: "0.4rem 0.85rem",
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      textDecoration: "none",
                    }}
                  >
                    Complete <ChevronRight size={13} />
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
