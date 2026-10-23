import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, MapPin, Calendar, User, Building2, AlertCircle,
  Camera, Upload, CheckCircle2, PlayCircle, X, Eye, FileImage, Info
} from "lucide-react";
import {
  getMyAssignmentById, startWork, submitCompletedWork, getImageUrl,
  workerStatusColors, workerStatusLabels, type WorkerAssignment
} from "../../services/workerService";

function StatusBadge({ status }: { status: string }) {
  const color = workerStatusColors[status] ?? "#64748b";
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "0.35rem",
      background: `${color}18`,
      color,
      border: `1px solid ${color}35`,
      borderRadius: 20,
      padding: "0.3rem 0.85rem",
      fontSize: "0.75rem",
      fontWeight: 700,
    }}>
      ● {workerStatusLabels[status] ?? status}
    </span>
  );
}

function SectionCard({ title, icon: Icon, children, accent }: { title: string; icon?: any; children: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      padding: "1rem",
      marginBottom: "0.85rem",
      boxShadow: "0 2px 8px rgba(11,58,109,0.06)",
      border: accent ? `1.5px solid ${accent}` : "1px solid #e2e8f0",
    }}>
      {(title || Icon) && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          {Icon && <Icon size={16} color={accent ?? "#0b3a6d"} />}
          <h3 style={{ fontWeight: 800, color: "#0b3a6d", fontSize: "0.88rem", margin: 0 }}>{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

export default function WorkerTaskDetail() {
  const { id } = useParams<{ id: string }>();
  const [assignment, setAssignment] = useState<WorkerAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Start Work state
  const [startingWork, setStartingWork] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Completion state
  const [completionPhoto, setCompletionPhoto] = useState<File | null>(null);
  const [completionPhotoPreview, setCompletionPhotoPreview] = useState<string | null>(null);
  const [completionNote, setCompletionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getMyAssignmentById(id).then(({ assignment: a, error: e }) => {
      if (e) setError(e);
      else setAssignment(a);
      setLoading(false);
    });
  }, [id]);

  const handleStartWork = async () => {
    if (!assignment) return;
    setStartingWork(true);
    setStartError(null);
    const { error: e } = await startWork(assignment.id);
    if (e) {
      setStartError(e);
    } else {
      // Reload assignment
      const { assignment: updated } = await getMyAssignmentById(assignment.id);
      if (updated) setAssignment(updated);
    }
    setStartingWork(false);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setSubmitError("Please select a JPEG, PNG, or WebP image.");
      return;
    }
    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setSubmitError("Image must be smaller than 10MB.");
      return;
    }

    setCompletionPhoto(file);
    setSubmitError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setCompletionPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setCompletionPhoto(null);
    setCompletionPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmitCompletion = async () => {
    if (!assignment || !completionPhoto || !completionNote.trim()) return;

    setSubmitting(true);
    setSubmitError(null);

    const { error: e } = await submitCompletedWork(assignment.id, completionPhoto, completionNote.trim());

    if (e) {
      setSubmitError(e);
      setSubmitting(false);
      return;
    }

    // Reload assignment
    const { assignment: updated } = await getMyAssignmentById(assignment.id);
    if (updated) setAssignment(updated);
    setSubmitSuccess(true);
    setCompletionPhoto(null);
    setCompletionPhotoPreview(null);
    setCompletionNote("");
    setSubmitting(false);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  // ─── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60dvh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 1rem" }} />
          <p style={{ color: "#0b3a6d", fontWeight: 600 }}>Loading task...</p>
        </div>
      </div>
    );
  }

  // ─── Error / Not Found ──────────────────────────────────────────
  if (error || !assignment) {
    return (
      <div style={{ padding: "1.5rem 1rem", maxWidth: 500, margin: "0 auto", textAlign: "center" }}>
        <AlertCircle size={44} color="#dc2626" style={{ marginBottom: "0.75rem" }} />
        <h2 style={{ color: "#0f172a", marginBottom: "0.5rem" }}>Task Not Found</h2>
        <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
          {error ?? "This task does not exist or you are not authorized to view it."}
        </p>
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
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={16} />
          Back to My Tasks
        </Link>
      </div>
    );
  }

  const beforeImageUrl = assignment.before_image_path
    ? getImageUrl(assignment.before_image_path, "report-images")
    : null;
  const afterImageUrl = assignment.completion_image_path
    ? getImageUrl(assignment.completion_image_path, "completion-images")
    : null;

  const mapsUrl = assignment.latitude && assignment.longitude
    ? `https://maps.google.com/?q=${assignment.latitude},${assignment.longitude}`
    : null;

  const canStartWork = assignment.current_status === "ASSIGNED";
  const canComplete = assignment.current_status === "IN_PROGRESS";
  const isResolved = assignment.current_status === "RESOLVED";

  return (
    <div style={{ padding: "1rem 1rem 2rem", maxWidth: 600, margin: "0 auto" }}>
      {/* Back */}
      <Link
        to="/worker/tasks"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          color: "#0b3a6d",
          fontWeight: 600,
          fontSize: "0.84rem",
          textDecoration: "none",
          marginBottom: "1rem",
          padding: "0.35rem 0",
        }}
      >
        <ArrowLeft size={16} />
        Back to My Tasks
      </Link>

      {/* ─── Status Banner ────────────────────────────── */}
      <div style={{
        background: isResolved
          ? "linear-gradient(135deg, #15803d, #22c55e)"
          : canComplete
            ? "linear-gradient(135deg, #7c3aed, #a855f7)"
            : "linear-gradient(135deg, #0b3a6d, #1d4ed8)",
        borderRadius: 14,
        padding: "1rem",
        marginBottom: "0.85rem",
        color: "#fff",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
          <div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.75)", marginBottom: "0.2rem" }}>
              #{assignment.reference_number}
            </div>
            <h1 style={{ fontSize: "1.05rem", fontWeight: 800, lineHeight: 1.3, margin: 0 }}>
              {assignment.title}
            </h1>
          </div>
          <span style={{
            background: "rgba(255,255,255,0.2)",
            borderRadius: 20,
            padding: "0.25rem 0.75rem",
            fontSize: "0.7rem",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}>
            {workerStatusLabels[assignment.current_status] ?? assignment.current_status}
          </span>
        </div>
        {assignment.assigned_department_name && (
          <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.8)", marginTop: "0.4rem" }}>
            🏢 {assignment.assigned_department_name}
          </div>
        )}
      </div>

      {/* ─── SUCCESS BANNER ──────────────────────────── */}
      {submitSuccess && (
        <div style={{
          background: "#dcfce7",
          border: "1px solid #86efac",
          borderRadius: 12,
          padding: "1rem",
          marginBottom: "0.85rem",
          display: "flex",
          gap: "0.75rem",
          alignItems: "flex-start",
        }}>
          <CheckCircle2 size={24} color="#15803d" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, color: "#14532d", marginBottom: "0.25rem" }}>
              Work Submitted Successfully!
            </div>
            <div style={{ fontSize: "0.82rem", color: "#166534" }}>
              Complaint has been marked as RESOLVED. The completion photo and note have been saved and are now visible on the citizen tracking page.
            </div>
          </div>
        </div>
      )}

      {/* ─── Original Citizen Photograph ─────────────── */}
      {beforeImageUrl && (
        <SectionCard title="Original Complaint Photograph" icon={Camera} accent="#fecaca">
          <div style={{ fontSize: "0.72rem", color: "#dc2626", fontWeight: 700, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            📷 BEFORE — Submitted by Citizen
          </div>
          <img
            src={beforeImageUrl}
            alt="Original complaint"
            style={{ width: "100%", borderRadius: 10, border: "2px solid #fecaca", cursor: "pointer" }}
            onClick={() => window.open(beforeImageUrl, "_blank")}
          />
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "0.4rem", textAlign: "center" }}>
            Tap to view full size • This is the original citizen evidence — do not replace
          </div>
        </SectionCard>
      )}

      {/* ─── Complaint Details ────────────────────────── */}
      <SectionCard title="Complaint Details" icon={Info}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 600, marginBottom: "0.15rem" }}>CATEGORY</div>
            <div style={{ fontWeight: 600, fontSize: "0.84rem", color: "#0f172a" }}>{assignment.category}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 600, marginBottom: "0.15rem" }}>SEVERITY</div>
            <div style={{
              fontWeight: 700,
              fontSize: "0.8rem",
              color: assignment.severity === "HIGH" ? "#dc2626" : assignment.severity === "MEDIUM" ? "#d97706" : "#15803d",
            }}>
              {assignment.severity}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 600, marginBottom: "0.15rem" }}>ASSIGNED TO</div>
            <div style={{ fontWeight: 600, fontSize: "0.84rem", color: "#0f172a" }}>{assignment.assigned_to ?? "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 600, marginBottom: "0.15rem" }}>DATE</div>
            <div style={{ fontWeight: 600, fontSize: "0.84rem", color: "#0f172a" }}>
              {formatDate(assignment.updated_at)}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ─── Description ──────────────────────────────── */}
      <SectionCard title="Citizen Description" icon={AlertCircle}>
        <p style={{ fontSize: "0.87rem", color: "#334155", lineHeight: 1.65, margin: 0 }}>
          {assignment.description}
        </p>
      </SectionCard>

      {/* ─── Location ─────────────────────────────────── */}
      <SectionCard title="Location" icon={MapPin}>
        <p style={{ fontSize: "0.85rem", color: "#334155", marginBottom: "0.65rem", lineHeight: 1.5 }}>
          {assignment.location_description}
          {assignment.area_or_ward && (
            <span style={{ color: "#0b3a6d", fontWeight: 600 }}> — {assignment.area_or_ward}</span>
          )}
        </p>
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              background: "#eff6ff",
              border: "1.5px solid #bfdbfe",
              borderRadius: 10,
              padding: "0.65rem",
              color: "#1e40af",
              fontWeight: 700,
              fontSize: "0.84rem",
              textDecoration: "none",
            }}
          >
            <MapPin size={16} />
            Open in Google Maps
          </a>
        ) : (
          <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
            No GPS coordinates available — use the address above for navigation.
          </div>
        )}
      </SectionCard>

      {/* ─── Admin Instructions ───────────────────────── */}
      {assignment.worker_instructions && (
        <SectionCard title="Instructions from Administrator" icon={Building2} accent="#fcd34d">
          <div style={{
            background: "#fffbeb",
            borderRadius: 8,
            padding: "0.75rem",
            fontSize: "0.87rem",
            color: "#78350f",
            lineHeight: 1.6,
            fontStyle: "italic",
          }}>
            "{assignment.worker_instructions}"
          </div>
        </SectionCard>
      )}

      {/* ─── START WORK BUTTON ────────────────────────── */}
      {canStartWork && !isResolved && (
        <div style={{
          background: "#fff",
          borderRadius: 14,
          padding: "1.25rem",
          marginBottom: "0.85rem",
          boxShadow: "0 2px 8px rgba(11,58,109,0.08)",
          border: "1.5px solid #bfdbfe",
        }}>
          <h3 style={{ fontWeight: 800, color: "#0b3a6d", fontSize: "0.9rem", marginBottom: "0.6rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <PlayCircle size={18} color="#0b3a6d" />
            Ready to Start?
          </h3>
          <p style={{ fontSize: "0.82rem", color: "#475569", marginBottom: "1rem", lineHeight: 1.5 }}>
            Tap the button below when you arrive at the site and begin working. This will update the status to <strong>In Progress</strong>.
          </p>
          {startError && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "0.65rem", marginBottom: "0.75rem", color: "#dc2626", fontSize: "0.82rem" }}>
              ⚠️ {startError}
            </div>
          )}
          <button
            id="start-work-btn"
            onClick={handleStartWork}
            disabled={startingWork}
            style={{
              width: "100%",
              background: startingWork ? "#93c5fd" : "linear-gradient(135deg, #0b3a6d, #1d4ed8)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "1rem",
              fontSize: "1rem",
              fontWeight: 800,
              cursor: startingWork ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              minHeight: 52,
            }}
          >
            {startingWork ? (
              <>
                <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Starting...
              </>
            ) : (
              <>
                <PlayCircle size={20} />
                Start Work
              </>
            )}
          </button>
        </div>
      )}

      {/* ─── COMPLETE WORK FORM ───────────────────────── */}
      {canComplete && !isResolved && (
        <div style={{
          background: "#fff",
          borderRadius: 14,
          padding: "1.25rem",
          marginBottom: "0.85rem",
          boxShadow: "0 4px 16px rgba(124,58,237,0.1)",
          border: "1.5px solid #c4b5fd",
        }}>
          <h3 style={{ fontWeight: 800, color: "#7c3aed", fontSize: "0.95rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <CheckCircle2 size={18} />
            Submit Completed Work
          </h3>

          {/* A: Completion Photo */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: 700, fontSize: "0.84rem", color: "#0f172a", marginBottom: "0.4rem" }}>
              A. Completion Photograph <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <p style={{ fontSize: "0.76rem", color: "#64748b", marginBottom: "0.65rem", lineHeight: 1.4 }}>
              Take a photo showing the completed repair/resolution at the site. This photo is mandatory.
            </p>

            {completionPhotoPreview ? (
              <div style={{ position: "relative", marginBottom: "0.65rem" }}>
                {/* AFTER label */}
                <div style={{
                  position: "absolute",
                  top: 8, left: 8,
                  background: "rgba(21,128,61,0.9)",
                  color: "#fff",
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 20,
                  letterSpacing: "0.04em",
                  zIndex: 1,
                }}>
                  📸 AFTER — YOUR COMPLETION
                </div>
                <img
                  src={completionPhotoPreview}
                  alt="Completion preview"
                  style={{ width: "100%", borderRadius: 10, border: "2px solid #86efac", display: "block" }}
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  style={{
                    position: "absolute",
                    top: 8, right: 8,
                    background: "rgba(220,38,38,0.9)",
                    border: "none",
                    borderRadius: "50%",
                    width: 30, height: 30,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#fff",
                    zIndex: 1,
                  }}
                  aria-label="Remove photo"
                >
                  <X size={16} />
                </button>
                <div style={{ fontSize: "0.72rem", color: "#15803d", fontWeight: 600, textAlign: "center", marginTop: "0.35rem" }}>
                  ✓ Photo selected • Tap ✕ to replace
                </div>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  style={{ display: "none" }}
                  id="completion-photo-input"
                />
                <label
                  htmlFor="completion-photo-input"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.6rem",
                    border: "2px dashed #c4b5fd",
                    borderRadius: 12,
                    padding: "1.5rem 1rem",
                    cursor: "pointer",
                    background: "#faf5ff",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ width: 50, height: 50, background: "#ede9fe", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Camera size={24} color="#7c3aed" />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 700, color: "#7c3aed", fontSize: "0.9rem" }}>
                      📸 Upload Completion Photo
                    </div>
                    <div style={{ fontSize: "0.73rem", color: "#94a3b8", marginTop: "0.25rem" }}>
                      Tap to open camera or choose from gallery
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#c4b5fd", marginTop: "0.2rem" }}>
                      JPEG • PNG • WebP • Max 10MB
                    </div>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* B: Completion Note */}
          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="completion-note"
              style={{ display: "block", fontWeight: 700, fontSize: "0.84rem", color: "#0f172a", marginBottom: "0.4rem" }}
            >
              B. Completion Note <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <textarea
              id="completion-note"
              value={completionNote}
              onChange={e => setCompletionNote(e.target.value)}
              placeholder="Describe what work was done. Example: 'Pothole filled with asphalt and leveled. Road surface repaired and ready for traffic.'"
              rows={4}
              style={{
                width: "100%",
                border: "1.5px solid #c4b5fd",
                borderRadius: 10,
                padding: "0.75rem",
                fontSize: "0.9rem",
                fontFamily: "inherit",
                resize: "vertical",
                outline: "none",
                lineHeight: 1.55,
                color: "#0f172a",
                background: "#faf5ff",
              }}
            />
            <div style={{ fontSize: "0.7rem", color: completionNote.length > 0 ? "#15803d" : "#94a3b8", textAlign: "right", marginTop: "0.2rem" }}>
              {completionNote.length} characters
            </div>
          </div>

          {/* Error */}
          {submitError && (
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: "0.75rem",
              marginBottom: "0.85rem",
              color: "#dc2626",
              fontSize: "0.84rem",
              display: "flex",
              gap: "0.5rem",
              alignItems: "flex-start",
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              {submitError}
            </div>
          )}

          {/* Validation info */}
          {(!completionPhoto || !completionNote.trim()) && (
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.85rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
              <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              Both a completion photograph and a note are required before submitting.
            </div>
          )}

          {/* Submit */}
          <button
            id="submit-completion-btn"
            type="button"
            onClick={handleSubmitCompletion}
            disabled={submitting || !completionPhoto || !completionNote.trim()}
            style={{
              width: "100%",
              background: submitting || !completionPhoto || !completionNote.trim()
                ? "#d8b4fe"
                : "linear-gradient(135deg, #7c3aed, #a855f7)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "1rem",
              fontSize: "1rem",
              fontWeight: 800,
              cursor: submitting || !completionPhoto || !completionNote.trim() ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              minHeight: 54,
              transition: "all 0.2s",
            }}
          >
            {submitting ? (
              <>
                <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Uploading & Saving...
              </>
            ) : (
              <>
                <Upload size={20} />
                Submit Completed Work
              </>
            )}
          </button>
          <p style={{ fontSize: "0.72rem", color: "#94a3b8", textAlign: "center", marginTop: "0.5rem" }}>
            Once submitted, the complaint will be automatically marked as RESOLVED.
          </p>
        </div>
      )}

      {/* ─── Completion Evidence (after resolved) ─────── */}
      {isResolved && (
        <div style={{
          background: "#f0fdf4",
          border: "1.5px solid #86efac",
          borderRadius: 14,
          padding: "1.1rem",
          marginBottom: "0.85rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <CheckCircle2 size={18} color="#15803d" />
            <h3 style={{ fontWeight: 800, color: "#15803d", fontSize: "0.9rem", margin: 0 }}>
              Work Completed ✓
            </h3>
          </div>

          {afterImageUrl && (
            <div style={{ marginBottom: "0.75rem" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#15803d", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                📸 AFTER — Completion Photograph
              </div>
              <img
                src={afterImageUrl}
                alt="Completion"
                style={{ width: "100%", borderRadius: 10, border: "2px solid #86efac", cursor: "pointer" }}
                onClick={() => window.open(afterImageUrl, "_blank")}
              />
            </div>
          )}

          {assignment.completion_note && (
            <div style={{ background: "#fff", borderRadius: 8, padding: "0.7rem", fontSize: "0.84rem", color: "#14532d", lineHeight: 1.55, marginBottom: "0.65rem" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#15803d", marginBottom: "0.25rem" }}>COMPLETION NOTE:</div>
              {assignment.completion_note}
            </div>
          )}

          {assignment.completed_by_name && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "#15803d", fontWeight: 600 }}>
              <User size={13} />
              Completed by: {assignment.completed_by_name}
            </div>
          )}
          {assignment.resolved_at && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.3rem" }}>
              <Calendar size={12} />
              {formatDateTime(assignment.resolved_at)}
            </div>
          )}
        </div>
      )}

      {/* In-Progress status info */}
      {assignment.current_status === "IN_PROGRESS" && !canComplete && (
        <div style={{ background: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 12, padding: "0.85rem", marginBottom: "0.85rem", fontSize: "0.82rem", color: "#5b21b6" }}>
          <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>🔄 Work Started</div>
          {assignment.work_started_at && (
            <div style={{ color: "#7c3aed" }}>Started at: {formatDateTime(assignment.work_started_at)}</div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
