import { useState, useEffect } from "react";
import { CheckCircle2, Calendar, ImageOff } from "lucide-react";
import {
  getMyCompletedWork, getImageUrl, type WorkerAssignment
} from "../../services/workerService";

function CompletionCard({ assignment }: { assignment: WorkerAssignment }) {
  const beforeUrl = assignment.before_image_path
    ? getImageUrl(assignment.before_image_path, "report-images")
    : null;
  const afterUrl = assignment.completion_image_path
    ? getImageUrl(assignment.completion_image_path, "completion-images")
    : null;

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: "0 2px 10px rgba(21,128,61,0.08)",
      border: "1px solid #bbf7d0",
    }}>
      {/* Green resolved bar */}
      <div style={{ height: 4, background: "linear-gradient(90deg, #15803d, #22c55e)" }} />

      <div style={{ padding: "0.85rem 1rem" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
          <div>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#0b3a6d" }}>
              #{assignment.reference_number}
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", lineHeight: 1.3 }}>
              {assignment.title}
            </div>
          </div>
          <span style={{
            background: "#dcfce7",
            color: "#15803d",
            border: "1px solid #86efac",
            borderRadius: 20,
            padding: "0.2rem 0.65rem",
            fontSize: "0.7rem",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}>
            ✓ RESOLVED
          </span>
        </div>

        <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.75rem" }}>
          {assignment.category}
          {assignment.assigned_department_name && (
            <span style={{ marginLeft: "0.4rem", color: "#0b3a6d", fontWeight: 600 }}>
              • {assignment.assigned_department_name}
            </span>
          )}
        </div>

        {/* Before / After Photos */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
          {/* Before */}
          <div>
            <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#dc2626", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              📷 Before (Citizen)
            </div>
            {beforeUrl ? (
              <img
                src={beforeUrl}
                alt="Before"
                style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8, border: "1.5px solid #fecaca" }}
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div style={{ height: 100, background: "#f8fafc", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e2e8f0" }}>
                <ImageOff size={20} color="#cbd5e1" />
              </div>
            )}
          </div>

          {/* After */}
          <div>
            <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#15803d", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              📸 After (Your Work)
            </div>
            {afterUrl ? (
              <img
                src={afterUrl}
                alt="After"
                style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8, border: "2px solid #86efac" }}
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div style={{ height: 100, background: "#f0fdf4", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #bbf7d0" }}>
                <ImageOff size={20} color="#86efac" />
              </div>
            )}
          </div>
        </div>

        {/* Completion note */}
        {assignment.completion_note && (
          <div style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 8,
            padding: "0.65rem 0.75rem",
            fontSize: "0.8rem",
            color: "#14532d",
            marginBottom: "0.65rem",
            lineHeight: 1.5,
          }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#15803d", marginBottom: "0.2rem" }}>
              YOUR COMPLETION NOTE:
            </div>
            {assignment.completion_note}
          </div>
        )}

        {/* Completion timestamp */}
        {assignment.resolved_at && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.72rem", color: "#94a3b8" }}>
            <Calendar size={12} />
            Completed: {formatDate(assignment.resolved_at)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkerCompleted() {
  const [assignments, setAssignments] = useState<WorkerAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyCompletedWork().then(({ assignments: a }) => {
      setAssignments(a);
      setLoading(false);
    });
  }, []);

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
          Completed Work
        </h1>
        <p style={{ fontSize: "0.8rem", color: "#64748b" }}>
          {assignments.length} complaint{assignments.length !== 1 ? "s" : ""} resolved by you
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
          <CheckCircle2 size={44} color="#cbd5e1" style={{ marginBottom: "0.75rem" }} />
          <div style={{ fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
            No completed work yet
          </div>
          <div style={{ color: "#94a3b8", fontSize: "0.82rem" }}>
            After you submit a completion photograph and note, your resolved tasks will appear here.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {assignments.map(a => (
            <CompletionCard key={a.id} assignment={a} />
          ))}
        </div>
      )}
    </div>
  );
}
