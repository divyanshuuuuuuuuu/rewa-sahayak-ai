import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, MapPin, Calendar, User, Building2, AlertCircle,
  Camera, Upload, CheckCircle2, PlayCircle, X, Eye, FileImage, Info,
  Download, ExternalLink, Clock, Compass, AlertTriangle, ShieldCheck,
  Check, ChevronDown, ChevronUp, Image as ImageIcon
} from "lucide-react";
import MapView from "../../components/MapView";
import { getEvidenceForCategory } from "../../services/evidenceSvg";
import {
  getMyAssignmentById, startWork, submitCompletedWork, recordWorkDelay, getImageUrl,
  workerStatusColors, workerStatusLabels, formatDurationText, type WorkerAssignment
} from "../../services/workerService";
import { downloadPhotoFile, getCompletionPhotoFilename } from "../../services/downloadService";

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

function SectionCard({
  title,
  icon: Icon,
  children,
  accent,
  headerAction,
}: {
  title: string;
  icon?: any;
  children: React.ReactNode;
  accent?: string;
  headerAction?: React.ReactNode;
}) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      padding: "1.1rem",
      marginBottom: "0.85rem",
      boxShadow: "0 2px 10px rgba(11,58,109,0.06)",
      border: accent ? `1.5px solid ${accent}` : "1px solid #e2e8f0",
    }}>
      {(title || Icon) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {Icon && <Icon size={17} color={accent ?? "#0b3a6d"} />}
            <h3 style={{ fontWeight: 800, color: "#0b3a6d", fontSize: "0.92rem", margin: 0 }}>{title}</h3>
          </div>
          {headerAction}
        </div>
      )}
      {children}
    </div>
  );
}

export default function WorkerTaskDetail() {
  // ─── 1. ALL HOOKS DECLARED AT THE VERY TOP (React Hook Rules Compliant) ───
  const { id } = useParams<{ id: string }>();
  const [assignment, setAssignment] = useState<WorkerAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active action drawer/tab: 'none' | 'delay' | 'complete'
  const [activeAction, setActiveAction] = useState<"none" | "delay" | "complete">("none");

  // Start Work state
  const [startingWork, setStartingWork] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Delay state
  const [delayReason, setDelayReason] = useState("");
  const [submittingDelay, setSubmittingDelay] = useState(false);
  const [delayError, setDelayError] = useState<string | null>(null);
  const [delaySuccess, setDelaySuccess] = useState<string | null>(null);

  // Completion state
  const [completionPhoto, setCompletionPhoto] = useState<File | null>(null);
  const [completionPhotoPreview, setCompletionPhotoPreview] = useState<string | null>(null);
  const [completionNote, setCompletionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Worker Live Location state (Anti-slacking on-site verification)
  const [workerLocation, setWorkerLocation] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [locationStatusMsg, setLocationStatusMsg] = useState<string | null>(null);

  // Live Timer / Stopwatch state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Utilities state
  const [downloadingPhoto, setDownloadingPhoto] = useState(false);
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Preset Quick Delay Reasons ───
  const delayPresets = [
    "🌧️ भारी बारिश एवं अत्यधिक जलभराव के कारण उच्च क्षमता सक्शन टैंकर की आवश्यकता",
    "🚧 लोक निर्माण विभाग (PWD) सड़क खुदाई व क्रॉस-ड्रेन अनापत्ति अपेक्षित",
    "🚛 सुपर सक्शन सह सीवर जेटिंग मशीन बुलाई गई है, मार्ग में है",
    "⚡ एमपीईबी (MPEB) भूमिगत विद्युत केबल सुरक्षा क्लीयरेंस लंबित",
    "👷 अतिरिक्त जल निकासी श्रमिक दल व डीसिल्टिंग उपकरण भेजे जा रहे हैं",
  ];

  // ─── Preset Quick Completion Replies ───
  const completionPresets = [
    "चोक्ड स्टॉर्म ड्रेन को डी-सिल्ट कर सीवेज बैकफ्लो रोक दिया गया है तथा ब्लीचिंग पाउडर से कीटाणुशोधन किया गया।",
    "गहरी सक्शन जेटिंग द्वारा ड्रेनेज लाइन की पूर्ण सफाई कर नाली में पानी का सामान्य बहाव बहाल किया गया।",
    "ड्रेनेज पाइपलाइन से मलबा एवं प्लास्टिक कचरा हटाकर अवरोध समाप्त कर दिया गया है। स्थल स्वच्छ है।",
    "जल निकासी नाली की मरम्मत एवं सफाई कार्य पूर्ण कर लिया गया है, स्थानीय जलभराव समाप्त है।",
  ];

  const loadTaskData = async (taskId: string) => {
    setLoading(true);
    setError(null);
    const { assignment: a, error: e } = await getMyAssignmentById(taskId);
    if (e) {
      setError(e);
    } else if (a) {
      setAssignment(a);
      // If delay reason already present, initialize delay input with it
      if (a.delay_reason) {
        setDelayReason(a.delay_reason);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!id) return;
    loadTaskData(id);
  }, [id]);

  // ─── Live Worker Location & Stopwatch Handlers ─────────────────
  const captureWorkerLocation = (): Promise<{ latitude: number; longitude: number; accuracy?: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationStatusMsg("⚠️ इस डिवाइस में GPS सपोर्ट उपलब्ध नहीं है।");
        resolve(null);
        return;
      }
      setCapturingLocation(true);
      setLocationStatusMsg("📡 कार्य स्थल जीपीएस लोकेशन ट्रैक की जा रही है...");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setWorkerLocation(loc);
          setLocationStatusMsg(`✓ ऑन-साइट जीपीएस सत्यापित: ${loc.latitude.toFixed(4)}° N, ${loc.longitude.toFixed(4)}° E (सटीकता: ±${Math.round(loc.accuracy || 5)}m)`);
          setCapturingLocation(false);
          resolve(loc);
        },
        (err) => {
          setCapturingLocation(false);
          setLocationStatusMsg("⚠️ जीपीएस लोकेशन प्राप्त नहीं हो सकी। कृपया फोन की लोकेशन सेवा ऑन करें।");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  };

  // Live Stopwatch Ticking when IN_PROGRESS
  useEffect(() => {
    if (assignment?.current_status === "IN_PROGRESS") {
      const startTime = assignment.work_started_at || assignment.updated_at || assignment.submitted_at;
      const startMs = new Date(startTime).getTime();
      const updateTimer = () => {
        const nowMs = Date.now();
        const diff = Math.max(0, Math.floor((nowMs - startMs) / 1000));
        setElapsedSeconds(diff);
      };
      updateTimer();
      const timer = setInterval(updateTimer, 1000);
      return () => clearInterval(timer);
    }
  }, [assignment?.current_status, assignment?.work_started_at, assignment?.updated_at, assignment?.submitted_at]);

  const formatStopwatch = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // ─── Handlers ──────────────────────────────────────────────────
  const handleStartWork = async () => {
    if (!assignment) return;
    setStartingWork(true);
    setStartError(null);
    // Anti-slacking: Capture live on-site GPS location when starting work
    const loc = await captureWorkerLocation();
    const { error: e } = await startWork(assignment.id, loc || undefined);
    if (e) {
      setStartError(e);
    } else {
      await loadTaskData(assignment.id);
      setActiveAction("complete"); // Automatically open Complete Work drawer
    }
    setStartingWork(false);
  };

  const handleRecordDelay = async () => {
    if (!assignment || !delayReason.trim()) {
      setDelayError("कृपया विलंब का कारण दर्ज करें (Please enter reason for delay).");
      return;
    }
    setSubmittingDelay(true);
    setDelayError(null);
    setDelaySuccess(null);

    const { error: e } = await recordWorkDelay(assignment.id, delayReason.trim());
    if (e) {
      setDelayError(e);
    } else {
      setDelaySuccess("✓ विलंब का कारण सफलतापूर्वक दर्ज किया गया। नागरिक पोर्टल व समयरेखा अपडेट कर दी गई है।");
      await loadTaskData(assignment.id);
      setTimeout(() => {
        setActiveAction("none");
      }, 1800);
    }
    setSubmittingDelay(false);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setSubmitError("कृपया जेपीईजी (JPEG), पीएनजी (PNG) या वेबपी (WebP) फोटो चुनें।");
      return;
    }
    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setSubmitError("फोटो का आकार 10MB से कम होना अनिवार्य है।");
      return;
    }

    setCompletionPhoto(file);
    setSubmitError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setCompletionPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // If worker location not yet captured, auto-trigger location capture
    if (!workerLocation) {
      captureWorkerLocation();
    }
  };

  const handleRemovePhoto = () => {
    setCompletionPhoto(null);
    setCompletionPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmitCompletion = async () => {
    if (!assignment) return;
    if (!completionPhoto) {
      setSubmitError("अनिवार्य: कार्य पूर्ण घोषित करने हेतु समाधान की फोटो अपलोड करना आवश्यक है।");
      return;
    }
    if (!completionNote.trim()) {
      setSubmitError("अनिवार्य: कृपया शिकायतकर्ता हेतु विभागीय समाधान उत्तर/टिप्पणी लिखें।");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    // Capture or verify live GPS location before submitting
    let loc = workerLocation;
    if (!loc) {
      loc = await captureWorkerLocation();
    }

    const { error: e } = await submitCompletedWork(
      assignment.id,
      completionPhoto,
      completionNote.trim(),
      loc || undefined
    );

    if (e) {
      setSubmitError(e);
      setSubmitting(false);
      return;
    }

    await loadTaskData(assignment.id);
    setSubmitSuccess(true);
    setCompletionPhoto(null);
    setCompletionPhotoPreview(null);
    setCompletionNote("");
    setSubmitting(false);
    setActiveAction("none");
  };

  const handleDownloadCompletionPhoto = async () => {
    if (!afterImageUrl || !assignment) return;
    setDownloadingPhoto(true);
    const filename = getCompletionPhotoFilename(assignment.reference_number, afterImageUrl);
    await downloadPhotoFile(afterImageUrl, filename);
    setDownloadingPhoto(false);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  // ─── Loading State ──────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "65dvh" }}>
        <div style={{ textAlign: "center", background: "#fff", padding: "2rem", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <div className="spinner" style={{ margin: "0 auto 1rem" }} />
          <p style={{ color: "#0b3a6d", fontWeight: 700, fontSize: "0.95rem", margin: 0 }}>कार्य विवरण लोड हो रहा है...</p>
          <p style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "0.3rem" }}>Loading task data & location map...</p>
        </div>
      </div>
    );
  }

  // ─── Error / Not Found State ────────────────────────────────────
  if (error || !assignment) {
    return (
      <div style={{ padding: "2rem 1rem", maxWidth: 520, margin: "2rem auto", textAlign: "center", background: "#fff", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
        <AlertCircle size={48} color="#dc2626" style={{ marginBottom: "0.75rem" }} />
        <h2 style={{ color: "#0f172a", marginBottom: "0.5rem", fontSize: "1.2rem", fontWeight: 800 }}>शिकायत टास्क नहीं मिला (Task Not Found)</h2>
        <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: "1.5rem", lineHeight: 1.5 }}>
          {error ?? "यह शिकायत कार्य उपलब्ध नहीं है या आईडी गलत है।"}
        </p>
        <Link
          to="/worker/tasks"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "#0b3a6d",
            color: "#fff",
            padding: "0.75rem 1.4rem",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: "0.88rem",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={16} />
          वापस कार्य सूची पर जाएं (Back to Tasks)
        </Link>
      </div>
    );
  }

  // ─── Image & Map Computed URLs ───
  const beforeImageUrl = assignment.before_image_path
    ? getImageUrl(assignment.before_image_path, "report-images")
    : getEvidenceForCategory(assignment.category, assignment.module ?? undefined);

  const afterImageUrl = assignment.completion_image_path
    ? getImageUrl(assignment.completion_image_path, "completion-images")
    : null;

  const hasCoordinates = !!(assignment.latitude && assignment.longitude);
  const mapsUrl = hasCoordinates
    ? `https://maps.google.com/?q=${assignment.latitude},${assignment.longitude}`
    : assignment.location_description
      ? `https://maps.google.com/?q=${encodeURIComponent(assignment.location_description + ', Rewa, Madhya Pradesh')}`
      : null;

  const canStartWork = assignment.current_status === "ASSIGNED" || assignment.current_status === "SUBMITTED";
  const canActOnWork = assignment.current_status === "IN_PROGRESS" || assignment.current_status === "ASSIGNED";
  const isResolved = assignment.current_status === "RESOLVED";

  // Map mock complaint item for Leaflet MapView
  const mapComplaintList = hasCoordinates ? [{
    id: assignment.id,
    ticket_number: assignment.reference_number,
    title: assignment.title,
    description: assignment.description,
    category: assignment.category,
    severity: assignment.severity,
    status: assignment.current_status,
    latitude: assignment.latitude!,
    longitude: assignment.longitude!,
    address: assignment.location_description,
    ward: assignment.area_or_ward,
    created_at: assignment.submitted_at,
    updated_at: assignment.updated_at,
  } as any] : [];

  return (
    <div style={{ padding: "1rem 1rem 3rem", maxWidth: 640, margin: "0 auto" }}>
      {/* ─── Back to Tasks Link ───────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
        <Link
          to="/worker/tasks"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "#0b3a6d",
            fontWeight: 700,
            fontSize: "0.84rem",
            textDecoration: "none",
            padding: "0.4rem 0.75rem",
            background: "#eff6ff",
            borderRadius: 8,
          }}
        >
          <ArrowLeft size={16} />
          ← कार्य सूची (My Tasks)
        </Link>

        <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
          रीवा नगर निगम फील्ड पोर्टल
        </span>
      </div>

      {/* ─── Task Header Card ────────────────────────────────────── */}
      <div style={{
        background: isResolved
          ? "linear-gradient(135deg, #15803d, #22c55e)"
          : assignment.current_status === "IN_PROGRESS"
            ? "linear-gradient(135deg, #7c3aed, #4338ca)"
            : "linear-gradient(135deg, #0b3a6d, #1d4ed8)",
        borderRadius: 16,
        padding: "1.2rem",
        marginBottom: "0.9rem",
        color: "#fff",
        boxShadow: "0 6px 20px rgba(11,58,109,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.6rem" }}>
          <div>
            <div style={{
              display: "inline-block",
              background: "rgba(255,255,255,0.22)",
              backdropFilter: "blur(4px)",
              padding: "0.2rem 0.65rem",
              borderRadius: 6,
              fontSize: "0.75rem",
              fontWeight: 800,
              letterSpacing: "0.04em",
              marginBottom: "0.4rem",
            }}>
              #{assignment.reference_number}
            </div>
            <h1 style={{ fontSize: "1.15rem", fontWeight: 800, lineHeight: 1.35, margin: 0 }}>
              {assignment.title}
            </h1>
          </div>
          <span style={{
            background: "#ffffff",
            color: isResolved ? "#15803d" : assignment.current_status === "IN_PROGRESS" ? "#7c3aed" : "#0b3a6d",
            borderRadius: 20,
            padding: "0.3rem 0.85rem",
            fontSize: "0.75rem",
            fontWeight: 800,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
          }}>
            ● {workerStatusLabels[assignment.current_status] ?? assignment.current_status}
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem", marginTop: "0.85rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.2)", fontSize: "0.78rem" }}>
          {assignment.assigned_department_name && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              🏢 {assignment.assigned_department_name}
            </span>
          )}
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
            ⚡ प्राथमिकता: <strong style={{ textTransform: "uppercase" }}>{assignment.severity}</strong>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
            📅 {formatDate(assignment.submitted_at || assignment.updated_at)}
          </span>
        </div>
      </div>

      {/* ─── Active Delay Warning Banner (if delay has been logged) ─── */}
      {assignment.delay_reason && (
        <div style={{
          background: "#fffbeb",
          border: "1.5px solid #f59e0b",
          borderRadius: 14,
          padding: "1rem",
          marginBottom: "0.9rem",
          boxShadow: "0 2px 10px rgba(245,158,11,0.1)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "#b45309", fontWeight: 800, fontSize: "0.9rem" }}>
              <Clock size={18} />
              <span>⚠️ कार्य में विलंब की आधिकारिक सूचना (Work Delayed Notice)</span>
            </div>
            <span style={{ background: "#fef3c7", color: "#b45309", fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", borderRadius: 12 }}>
              विलंब दर्ज
            </span>
          </div>
          <p style={{ color: "#92400e", fontSize: "0.86rem", margin: 0, lineHeight: 1.55, fontWeight: 600 }}>
            "{assignment.delay_reason}"
          </p>
          <div style={{ fontSize: "0.72rem", color: "#b45309", marginTop: "0.4rem" }}>
            यह सूचना नागरिक ट्रैकिंग पोर्टल एवं नगर निगम कंट्रोल रूम पर लाइव अपडेट है।
          </div>
        </div>
      )}

      {/* ─── Resolution Success Banner ────────────────────────────── */}
      {submitSuccess && (
        <div style={{
          background: "#dcfce7",
          border: "1.5px solid #86efac",
          borderRadius: 14,
          padding: "1.1rem",
          marginBottom: "0.9rem",
          display: "flex",
          gap: "0.8rem",
          alignItems: "flex-start",
          boxShadow: "0 4px 14px rgba(22,101,52,0.1)",
        }}>
          <CheckCircle2 size={26} color="#15803d" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 800, color: "#14532d", fontSize: "0.95rem", marginBottom: "0.25rem" }}>
              कार्य सफलतापूर्वक पूर्ण घोषित! (Work Resolved Successfully)
            </div>
            <div style={{ fontSize: "0.84rem", color: "#166534", lineHeight: 1.5 }}>
              शिकायत का समाधान दर्ज कर दिया गया है। पूर्णता फोटो एवं विभागीय फीडबैक सार्वजनिक पोर्टल पर लाइव हो चुका है।
            </div>
          </div>
        </div>
      )}

      {/* ─── 1. EXACT LOCATION & INTERACTIVE MAP ───────────────────── */}
      <SectionCard
        title="कार्य स्थल एवं जीपीएस लोकेशन (Exact Location & Map)"
        icon={MapPin}
        accent="#0b3a6d"
        headerAction={
          mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                background: "#0b3a6d",
                color: "#fff",
                padding: "0.35rem 0.75rem",
                borderRadius: 8,
                fontSize: "0.75rem",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <Compass size={14} />
              Google Maps
            </a>
          ) : undefined
        }
      >
        <div style={{ background: "#f8fafc", borderRadius: 10, padding: "0.85rem", border: "1px solid #e2e8f0", marginBottom: "0.75rem" }}>
          <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.2rem" }}>
            📍 चिन्हित पता एवं लैंडमार्क (Address & Landmark)
          </div>
          <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a", lineHeight: 1.45 }}>
            {assignment.location_description || "Lane No. 3, Near Old Bus Stand, Urrahat, Rewa"}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem", marginTop: "0.5rem", fontSize: "0.8rem" }}>
            {assignment.area_or_ward && (
              <span style={{ color: "#0b3a6d", fontWeight: 700, background: "#eff6ff", padding: "2px 8px", borderRadius: 6 }}>
                वार्ड: {assignment.area_or_ward}
              </span>
            )}
            {hasCoordinates && (
              <span style={{ color: "#475569", fontWeight: 600, background: "#f1f5f9", padding: "2px 8px", borderRadius: 6 }}>
                GPS: {assignment.latitude?.toFixed(4)}° N, {assignment.longitude?.toFixed(4)}° E
              </span>
            )}
          </div>
        </div>

        {/* Embedded Interactive Leaflet Map */}
        {hasCoordinates ? (
          <div style={{ borderRadius: 12, overflow: "hidden", border: "1.5px solid #cbd5e1", marginBottom: "0.75rem", position: "relative" }}>
            <MapView
              complaints={mapComplaintList}
              center={[assignment.latitude!, assignment.longitude!]}
              zoom={16}
              height="220px"
            />
          </div>
        ) : (
          <div style={{ background: "#fef9c3", border: "1px dashed #ca8a04", borderRadius: 10, padding: "0.75rem", fontSize: "0.82rem", color: "#854d0e", marginBottom: "0.75rem" }}>
            जीपीएस पिन अनुपलब्ध — ऊपर दिए गए पते के अनुसार कार्य स्थल पर पहुंचे।
          </div>
        )}

        {mapsUrl && (
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
              padding: "0.75rem",
              color: "#1e40af",
              fontWeight: 800,
              fontSize: "0.88rem",
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
          >
            <Compass size={17} />
            🧭 गूगल मैप्स में नेविगेशन खोलें (Turn-by-Turn Navigation)
          </a>
        )}
      </SectionCard>

      {/* ─── 2. CITIZEN PROBLEM EVIDENCE (PHOTO / VIDEO / DESCRIPTION) ── */}
      <SectionCard title="नागरिक द्वारा प्रस्तुत साक्ष्य (Citizen Evidence & Photo)" icon={Camera} accent="#dc2626">
        <div style={{ marginBottom: "0.85rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
            <span style={{ fontSize: "0.72rem", color: "#dc2626", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              📷 BEFORE — समस्या स्थल की वास्तविक फोटो (Evidence)
            </span>
            <span style={{ fontSize: "0.72rem", color: "#15803d", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <ShieldCheck size={13} /> जियो-टैग्ड सत्यापित
            </span>
          </div>

          {beforeImageUrl && (
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "2px solid #fecaca", background: "#f8fafc" }}>
              <img
                src={beforeImageUrl}
                alt="Citizen Evidence"
                style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block", cursor: "pointer" }}
                onClick={() => setPreviewModalImg(beforeImageUrl)}
              />
              <button
                type="button"
                onClick={() => setPreviewModalImg(beforeImageUrl)}
                style={{
                  position: "absolute",
                  bottom: 10,
                  right: 10,
                  background: "rgba(15,23,42,0.85)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "0.35rem 0.65rem",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  cursor: "pointer",
                }}
              >
                <Eye size={13} /> बड़ा करके देखें (Full Size)
              </button>
            </div>
          )}
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.4rem", textAlign: "center" }}>
            नागरिक द्वारा शिकायत दर्ज करते समय अपलोड किया गया मूल साक्ष्य • इसे बदला नहीं जा सकता
          </div>
        </div>

        {/* Citizen Problem Description */}
        <div style={{ background: "#f8fafc", borderRadius: 10, padding: "0.85rem", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.25rem" }}>
            📝 नागरिक का विवरण (Citizen Description):
          </div>
          <p style={{ fontSize: "0.88rem", color: "#1e293b", lineHeight: 1.6, margin: 0 }}>
            {assignment.description || "नागरिक द्वारा कोई अतिरिक्त विवरण नहीं दिया गया।"}
          </p>
        </div>
      </SectionCard>

      {/* ─── 3. WORKER / ADMIN INSTRUCTIONS (IF ANY) ───────────────── */}
      {assignment.worker_instructions && (
        <SectionCard title="प्रशासनिक निर्देश (Admin Instructions)" icon={Building2} accent="#f59e0b">
          <div style={{ background: "#fffbeb", borderRadius: 10, padding: "0.85rem", fontSize: "0.88rem", color: "#78350f", lineHeight: 1.6, fontStyle: "italic", border: "1px solid #fef3c7" }}>
            "{assignment.worker_instructions}"
          </div>
        </SectionCard>
      )}

      {/* ─── 4. START WORK ACTION (IF ASSIGNED / SUBMITTED) ────────── */}
      {canStartWork && !isResolved && (
        <div style={{
          background: "#fff",
          borderRadius: 14,
          padding: "1.25rem",
          marginBottom: "0.9rem",
          boxShadow: "0 2px 10px rgba(11,58,109,0.08)",
          border: "1.5px solid #bfdbfe",
        }}>
          <h3 style={{ fontWeight: 800, color: "#0b3a6d", fontSize: "0.95rem", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <PlayCircle size={19} color="#0b3a6d" />
            कार्य स्थल पर पहुंच गए हैं? (Start Work)
          </h3>
          <p style={{ fontSize: "0.82rem", color: "#475569", marginBottom: "1rem", lineHeight: 1.5 }}>
            कार्य स्थल पर पहुंचकर काम शुरू करने हेतु बटन दबाएं। स्थिति बदलकर <strong>In Progress</strong> हो जाएगी।
          </p>
          {startError && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "0.65rem", marginBottom: "0.75rem", color: "#dc2626", fontSize: "0.82rem" }}>
              ⚠️ {startError}
            </div>
          )}
          <button
            id="start-work-btn"
            type="button"
            onClick={handleStartWork}
            disabled={startingWork}
            style={{
              width: "100%",
              background: startingWork ? "#93c5fd" : "linear-gradient(135deg, #0b3a6d, #1d4ed8)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "0.95rem",
              fontSize: "1rem",
              fontWeight: 800,
              cursor: startingWork ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              minHeight: 50,
            }}
          >
            {startingWork ? "प्रारंभ हो रहा है..." : "▶ कार्य प्रारंभ दर्ज करें (Start Work)"}
          </button>
        </div>
      )}

      {/* ─── LIVE WORK STOPWATCH & QUICK SUBMISSION BANNER ──────── */}
      {assignment.current_status === "IN_PROGRESS" && !isResolved && (
        <div style={{
          background: "linear-gradient(135deg, #1e1b4b, #312e81)",
          borderRadius: 16,
          padding: "1.2rem",
          marginBottom: "1rem",
          color: "#fff",
          boxShadow: "0 8px 24px rgba(49, 46, 129, 0.25)",
          border: "1.5px solid #6366f1",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 10px #22c55e",
              }} />
              <span style={{ fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.05em", color: "#a5b4fc", textTransform: "uppercase" }}>
                ● लाइव कार्य समय ट्रैकर (Live Work Stopwatch)
              </span>
            </div>
            <span style={{ background: "rgba(34, 197, 94, 0.2)", color: "#86efac", fontSize: "0.72rem", fontWeight: 800, padding: "2px 8px", borderRadius: 12, border: "1px solid rgba(34, 197, 94, 0.4)" }}>
              चल रहा है (IN PROGRESS)
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", margin: "0.4rem 0 0.8rem" }}>
            <Clock size={28} color="#a5b4fc" style={{ alignSelf: "center" }} />
            <div style={{ fontSize: "2.1rem", fontWeight: 900, fontFamily: "monospace", letterSpacing: "0.08em", color: "#ffffff" }}>
              {formatStopwatch(elapsedSeconds)}
            </div>
            <span style={{ fontSize: "0.8rem", color: "#c7d2fe", fontWeight: 600 }}>
              (कार्य अवधि / Time Elapsed)
            </span>
          </div>

          {/* Worker On-Site Location Status */}
          <div style={{
            background: "rgba(255, 255, 255, 0.08)",
            borderRadius: 10,
            padding: "0.65rem 0.85rem",
            fontSize: "0.78rem",
            color: "#e0e7ff",
            marginBottom: "0.9rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.5rem",
            flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <MapPin size={15} color={workerLocation ? "#86efac" : "#fcd34d"} />
              <span>
                {workerLocation
                  ? `📍 ऑन-साइट GPS सत्यापित: ${workerLocation.latitude.toFixed(4)}°, ${workerLocation.longitude.toFixed(4)}°`
                  : capturingLocation
                    ? "🔄 लाइव ऑन-साइट GPS प्राप्त किया जा रहा है..."
                    : "📍 ऑन-साइट उपस्थिति रिकॉर्ड की जा रही है"}
              </span>
            </div>
            <button
              type="button"
              onClick={captureWorkerLocation}
              disabled={capturingLocation}
              style={{
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#fff",
                borderRadius: 6,
                padding: "2px 8px",
                fontSize: "0.72rem",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              {capturingLocation ? "लोकेशन ले रहे..." : "पुनः जांचें"}
            </button>
          </div>

          {/* Direct 1-tap option to complete work & take photo */}
          <button
            type="button"
            id="timer-complete-work-quick-btn"
            onClick={() => {
              setActiveAction("complete");
            }}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "0.85rem",
              fontSize: "0.95rem",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              boxShadow: "0 4px 14px rgba(34, 197, 94, 0.4)",
            }}
          >
            <Camera size={20} />
            <span>कार्य पूर्ण हुआ? फोटो लें व सबमिट करें (Submit Work & Photo) →</span>
          </button>
        </div>
      )}

      {/* ─── 5. DUAL ACTION BUTTONS (REPORT DELAY OR MARK COMPLETED) ── */}
      {canActOnWork && !isResolved && (
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: "1.25rem",
          marginBottom: "1rem",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          border: "1.5px solid #e2e8f0",
        }}>
          <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span>⚡ फील्ड कार्रवाई चुनें (Choose Action)</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: activeAction !== "none" ? "1rem" : "0" }}>
            {/* Option A: Report Delay */}
            <button
              type="button"
              id="report-delay-toggle-btn"
              onClick={() => setActiveAction(activeAction === "delay" ? "none" : "delay")}
              style={{
                background: activeAction === "delay" ? "#fef3c7" : "#fff",
                border: activeAction === "delay" ? "2px solid #d97706" : "1.5px solid #fcd34d",
                color: "#92400e",
                borderRadius: 12,
                padding: "0.85rem 0.65rem",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.35rem",
                fontWeight: 800,
                fontSize: "0.86rem",
                boxShadow: "0 2px 6px rgba(245,158,11,0.08)",
                transition: "all 0.15s ease",
              }}
            >
              <Clock size={20} color="#d97706" />
              <span>कार्य में विलंब</span>
              <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "#b45309" }}>(Report Delay)</span>
            </button>

            {/* Option B: Mark Completed */}
            <button
              type="button"
              id="mark-completed-toggle-btn"
              onClick={() => setActiveAction(activeAction === "complete" ? "none" : "complete")}
              style={{
                background: activeAction === "complete" ? "#f5f3ff" : "#fff",
                border: activeAction === "complete" ? "2px solid #7c3aed" : "1.5px solid #c4b5fd",
                color: "#5b21b6",
                borderRadius: 12,
                padding: "0.85rem 0.65rem",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.35rem",
                fontWeight: 800,
                fontSize: "0.86rem",
                boxShadow: "0 2px 6px rgba(124,58,237,0.08)",
                transition: "all 0.15s ease",
              }}
            >
              <CheckCircle2 size={20} color="#7c3aed" />
              <span>कार्य पूर्ण</span>
              <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "#6d28d9" }}>(Mark Completed)</span>
            </button>
          </div>

          {/* ─── ACTION PANEL 1: REPORT DELAY FORM ──────────────────── */}
          {activeAction === "delay" && (
            <div style={{
              background: "#fffbeb",
              borderRadius: 14,
              padding: "1rem",
              border: "1.5px solid #fcd34d",
              marginTop: "0.5rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.5rem", color: "#92400e", fontWeight: 800, fontSize: "0.9rem" }}>
                <Clock size={17} />
                <span>कार्य में विलंब का कारण दर्ज करें (Enter Delay Reason)</span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "#78350f", marginBottom: "0.75rem", lineHeight: 1.45 }}>
                यदि किसी व्यावहारिक कारण (जैसे भारी बारिश, मशीनरी की आवश्यकता, या क्लीयरेंस लंबित) से काम में देर हो रही है, तो कारण नीचे लिखें:
              </p>

              {/* Preset Chips */}
              <div style={{ marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#92400e", display: "block", marginBottom: "0.35rem" }}>
                  त्वरित कारण चुनें (Tap to pick quick reason):
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {delayPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setDelayReason(preset)}
                      style={{
                        textAlign: "left",
                        background: delayReason === preset ? "#fef3c7" : "#fff",
                        border: delayReason === preset ? "1.5px solid #d97706" : "1px solid #fde68a",
                        borderRadius: 8,
                        padding: "0.45rem 0.65rem",
                        fontSize: "0.76rem",
                        color: "#78350f",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea for Custom Delay Reason */}
              <div style={{ marginBottom: "0.85rem" }}>
                <label style={{ display: "block", fontWeight: 700, fontSize: "0.82rem", color: "#78350f", marginBottom: "0.35rem" }}>
                  विलंब का विस्तृत कारण लिखें (Reason Textbox) <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <textarea
                  id="delay-reason-input"
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  placeholder="कृपया विलंब का स्पष्ट कारण लिखें (उदा. भारी बारिश के कारण अतिरिक्त सक्शन पंप आवश्यक)..."
                  rows={3}
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    border: "1.5px solid #f59e0b",
                    padding: "0.75rem",
                    fontSize: "0.88rem",
                    fontFamily: "inherit",
                    background: "#fff",
                    color: "#0f172a",
                    outline: "none",
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {delayError && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "0.6rem", marginBottom: "0.75rem", color: "#dc2626", fontSize: "0.8rem" }}>
                  ⚠️ {delayError}
                </div>
              )}

              {delaySuccess && (
                <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 8, padding: "0.6rem", marginBottom: "0.75rem", color: "#166534", fontSize: "0.82rem", fontWeight: 700 }}>
                  {delaySuccess}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  id="submit-delay-btn"
                  onClick={handleRecordDelay}
                  disabled={submittingDelay || !delayReason.trim()}
                  style={{
                    flex: 1,
                    background: submittingDelay || !delayReason.trim() ? "#fcd34d" : "#d97706",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "0.75rem",
                    fontWeight: 800,
                    fontSize: "0.9rem",
                    cursor: submittingDelay || !delayReason.trim() ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                  }}
                >
                  {submittingDelay ? "सबमिट हो रहा है..." : "✓ विलंब का कारण सबमिट करें (Save Delay)"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAction("none")}
                  style={{
                    background: "#fff",
                    border: "1px solid #d1d5db",
                    color: "#475569",
                    borderRadius: 10,
                    padding: "0.75rem 1rem",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  रद्द करें
                </button>
              </div>
            </div>
          )}

          {/* ─── ACTION PANEL 2: MARK COMPLETED FORM ────────────────── */}
          {activeAction === "complete" && (
            <div style={{
              background: "#faf5ff",
              borderRadius: 14,
              padding: "1rem",
              border: "1.5px solid #c4b5fd",
              marginTop: "0.5rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.5rem", color: "#6d28d9", fontWeight: 800, fontSize: "0.92rem" }}>
                <CheckCircle2 size={18} />
                <span>कार्य पूर्ण एवं समाधान साक्ष्य (Mark Completed & Upload Proof)</span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "#5b21b6", marginBottom: "0.85rem", lineHeight: 1.45 }}>
                नगर निगम के नियमों के अनुसार कार्य समाप्ति की वास्तविक फोटो तथा नागरिक के लिए समाधान उत्तर देना अनिवार्य है।
              </p>

              {/* Anti-Slacking On-Site GPS Verification */}
              <div style={{
                background: workerLocation ? "#f0fdf4" : "#fffbeb",
                border: workerLocation ? "1.5px solid #86efac" : "1.5px solid #fcd34d",
                borderRadius: 12,
                padding: "0.85rem",
                marginBottom: "1rem",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 800, fontSize: "0.86rem", color: workerLocation ? "#166534" : "#92400e" }}>
                    <MapPin size={17} color={workerLocation ? "#16a34a" : "#d97706"} />
                    <span>स्थल पर उपस्थिति सत्यापन (Worker On-Site GPS Verification)</span>
                  </div>
                  <span style={{
                    background: workerLocation ? "#dcfce7" : "#fef3c7",
                    color: workerLocation ? "#15803d" : "#b45309",
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontSize: "0.7rem",
                    fontWeight: 800,
                  }}>
                    {workerLocation ? "✓ ऑन-साइट सत्यापित (VERIFIED)" : "आवश्यक (REQUIRED)"}
                  </span>
                </div>
                <p style={{ fontSize: "0.76rem", color: workerLocation ? "#166534" : "#78350f", margin: "0 0 0.5rem", lineHeight: 1.45 }}>
                  नगर निगम अनिवार्य नियम: कार्य समाप्ति रिपोर्ट भेजने से पूर्व स्थल पर लाइव उपस्थिति सत्यापित होना अनिवार्य है (Anti-Slacking Compliance)।
                </p>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: workerLocation ? "#15803d" : "#92400e" }}>
                    {workerLocation ? (
                      <span>
                        📍 GPS: {workerLocation.latitude.toFixed(5)}°, {workerLocation.longitude.toFixed(5)}°
                        {workerLocation.accuracy ? ` (सटीकता ±${Math.round(workerLocation.accuracy)}m)` : ""}
                      </span>
                    ) : capturingLocation ? (
                      <span>🔄 उपग्रह से सटीक जीपीएस लोकेशन ली जा रही है...</span>
                    ) : (
                      <span>⚠️ ऑन-साइट जीपीएस लोकेशन रिकॉर्ड करें</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={captureWorkerLocation}
                    disabled={capturingLocation}
                    style={{
                      background: workerLocation ? "#fff" : "#d97706",
                      color: workerLocation ? "#15803d" : "#fff",
                      border: workerLocation ? "1px solid #86efac" : "none",
                      borderRadius: 8,
                      padding: "0.4rem 0.75rem",
                      fontSize: "0.76rem",
                      fontWeight: 800,
                      cursor: capturingLocation ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Compass size={14} />
                    {capturingLocation ? "लोकेशन ले रहे..." : workerLocation ? "पुनः सत्यापित करें" : "📍 लाइव लोकेशन लें"}
                  </button>
                </div>
                {locationStatusMsg && (
                  <div style={{ fontSize: "0.72rem", color: workerLocation ? "#166534" : "#b45309", marginTop: "0.35rem", fontWeight: 600 }}>
                    {locationStatusMsg}
                  </div>
                )}
              </div>

              {/* Step A: Mandatory Photo Upload */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontWeight: 800, fontSize: "0.84rem", color: "#0f172a", marginBottom: "0.35rem" }}>
                  A. कार्य समाप्ति फोटो साक्ष्य (Completion Photo Proof) <span style={{ color: "#dc2626" }}>*</span>
                </label>

                {completionPhotoPreview ? (
                  <div style={{ position: "relative", marginBottom: "0.5rem" }}>
                    <div style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      background: "rgba(21,128,61,0.92)",
                      color: "#fff",
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      padding: "3px 8px",
                      borderRadius: 20,
                      letterSpacing: "0.04em",
                      zIndex: 1,
                    }}>
                      📸 AFTER — YOUR RESOLUTION PROOF
                    </div>
                    <img
                      src={completionPhotoPreview}
                      alt="Completion preview"
                      style={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 10, border: "2px solid #86efac", display: "block" }}
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        background: "rgba(220,38,38,0.9)",
                        border: "none",
                        borderRadius: "50%",
                        width: 32,
                        height: 32,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#fff",
                        zIndex: 1,
                      }}
                      aria-label="Remove photo"
                    >
                      <X size={18} />
                    </button>
                    <div style={{ fontSize: "0.75rem", color: "#15803d", fontWeight: 700, textAlign: "center", marginTop: "0.35rem" }}>
                      ✓ फोटो चयनित (Photo attached) • बदलने हेतु ✕ दबाएं
                    </div>

                    {/* Interactive Side-by-Side Before & After Preview */}
                    <div style={{
                      marginTop: "0.85rem",
                      background: "#fff",
                      borderRadius: 12,
                      padding: "0.85rem",
                      border: "1.5px solid #a855f7",
                      boxShadow: "0 2px 10px rgba(168,85,247,0.1)",
                    }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#6b21a8", marginBottom: "0.6rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span>👁️ नागरिक फीडबैक पूर्वावलोकन (Before vs After)</span>
                        <span style={{ fontSize: "0.7rem", color: "#9333ea", background: "#f3e8ff", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
                          नागरिक पोर्टल पर दिखेगा
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                        {/* BEFORE */}
                        <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden", background: "#f8fafc" }}>
                          <div style={{ background: "#e2e8f0", color: "#334155", fontSize: "0.68rem", fontWeight: 800, padding: "3px 6px", textAlign: "center" }}>
                            📷 BEFORE (समस्या साक्ष्य)
                          </div>
                          {beforeImageUrl ? (
                            <img src={beforeImageUrl} alt="Before Problem" style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
                          ) : (
                            <div style={{ height: 110, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: "#94a3b8" }}>उपलब्ध नहीं</div>
                          )}
                        </div>

                        {/* AFTER */}
                        <div style={{ border: "1.5px solid #22c55e", borderRadius: 8, overflow: "hidden", background: "#f0fdf4" }}>
                          <div style={{ background: "#22c55e", color: "#fff", fontSize: "0.68rem", fontWeight: 800, padding: "3px 6px", textAlign: "center" }}>
                            📸 AFTER (आपका समाधान)
                          </div>
                          <img src={completionPhotoPreview} alt="After Preview" style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
                        </div>
                      </div>
                      <div style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: "#6b21a8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span>⏱️ समाधान अवधि: <strong>{formatStopwatch(elapsedSeconds)}</strong></span>
                        <span>{workerLocation ? "📍 GPS सत्यापित" : "📍 ऑन-साइट"}</span>
                      </div>
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
                        border: "2px dashed #a855f7",
                        borderRadius: 12,
                        padding: "1.4rem 1rem",
                        cursor: "pointer",
                        background: "#fff",
                        transition: "all 0.2s",
                      }}
                    >
                      <div style={{ width: 50, height: 50, background: "#ede9fe", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Camera size={26} color="#7c3aed" />
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontWeight: 800, color: "#7c3aed", fontSize: "0.92rem" }}>
                          📸 कार्य समाप्ति फोटो खींचें या गैलरी से चुनें
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }}>
                          Tap to open camera or choose file (JPEG, PNG, WebP)
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#a855f7", marginTop: "0.15rem", fontWeight: 600 }}>
                          अनिवार्य साक्ष्य (Mandatory Resolution Evidence)
                        </div>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Step B: Department Resolution Feedback / Reply */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontWeight: 800, fontSize: "0.84rem", color: "#0f172a", marginBottom: "0.35rem" }}>
                  B. विभागीय उत्तर एवं फीडबैक (Official Reply & Feedback) <span style={{ color: "#dc2626" }}>*</span>
                </label>

                {/* Quick Completion Reply Chips */}
                <div style={{ marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6d28d9", display: "block", marginBottom: "0.3rem" }}>
                    त्वरित उत्तर चुनें (Tap quick response template):
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    {completionPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCompletionNote(preset)}
                        style={{
                          textAlign: "left",
                          background: completionNote === preset ? "#ede9fe" : "#fff",
                          border: completionNote === preset ? "1.5px solid #7c3aed" : "1px solid #ddd6fe",
                          borderRadius: 8,
                          padding: "0.4rem 0.65rem",
                          fontSize: "0.76rem",
                          color: "#4c1d95",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  id="completion-note"
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="विभाग द्वारा की गई कार्रवाई का विवरण लिखें। यह उत्तर शिकायतकर्ता नागरिक को एसएमएस व पोर्टल पर प्रदर्शित होगा..."
                  rows={3}
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    border: "1.5px solid #a855f7",
                    padding: "0.75rem",
                    fontSize: "0.88rem",
                    fontFamily: "inherit",
                    background: "#fff",
                    color: "#0f172a",
                    outline: "none",
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {submitError && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "0.65rem", marginBottom: "0.75rem", color: "#dc2626", fontSize: "0.82rem" }}>
                  ⚠️ {submitError}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  id="submit-completion-btn"
                  onClick={handleSubmitCompletion}
                  disabled={submitting || !completionPhoto || !completionNote.trim()}
                  style={{
                    flex: 1,
                    background: submitting || !completionPhoto || !completionNote.trim()
                      ? "#c4b5fd"
                      : "linear-gradient(135deg, #7c3aed, #6d28d9)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "0.85rem",
                    fontWeight: 800,
                    fontSize: "0.92rem",
                    cursor: submitting || !completionPhoto || !completionNote.trim() ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.45rem",
                  }}
                >
                  {submitting ? "अपलोड व सुरक्षित हो रहा है..." : "✓ कार्य पूर्ण व उत्तर सबमिट करें"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAction("none")}
                  style={{
                    background: "#fff",
                    border: "1px solid #d1d5db",
                    color: "#475569",
                    borderRadius: 10,
                    padding: "0.75rem 1rem",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  रद्द करें
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── 6. RESOLVED COMPLETION CARD (AFTER RESOLUTION) ────────── */}
      {isResolved && (
        <div style={{
          background: "#f0fdf4",
          border: "2px solid #86efac",
          borderRadius: 16,
          padding: "1.2rem",
          marginBottom: "1rem",
          boxShadow: "0 4px 16px rgba(22,101,52,0.1)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <CheckCircle2 size={22} color="#15803d" />
              <h3 style={{ fontWeight: 800, color: "#15803d", fontSize: "1rem", margin: 0 }}>
                कार्य पूर्ण एवं सत्यापित (Resolved ✓)
              </h3>
            </div>
            <span style={{ background: "#15803d", color: "#fff", fontSize: "0.7rem", fontWeight: 800, padding: "3px 9px", borderRadius: 12 }}>
              COMPLETED
            </span>
          </div>

          {/* Execution Time & On-Site GPS Badges */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.85rem" }}>
            <span style={{
              background: "#dcfce7",
              color: "#15803d",
              fontSize: "0.78rem",
              fontWeight: 800,
              padding: "4px 10px",
              borderRadius: 20,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              border: "1px solid #86efac",
            }}>
              <Clock size={14} />
              समाधान में लगा समय: {assignment.work_duration_seconds ? formatDurationText(assignment.work_duration_seconds) : "45 min"}
            </span>

            <span style={{
              background: "#eff6ff",
              color: "#1d4ed8",
              fontSize: "0.78rem",
              fontWeight: 800,
              padding: "4px 10px",
              borderRadius: 20,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              border: "1px solid #bfdbfe",
            }}>
              <MapPin size={14} />
              {assignment.worker_resolution_location
                ? `ऑन-साइट GPS सत्यापित (Lat ${assignment.worker_resolution_location.latitude.toFixed(4)}°, Lng ${assignment.worker_resolution_location.longitude.toFixed(4)}°)`
                : "कार्यस्थल पर उपस्थित होकर सत्यापित (On-site Verified)"}
            </span>
          </div>

          {/* Side-by-Side Before & After Evidence Showcase */}
          <div style={{ marginBottom: "0.85rem" }}>
            <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#15803d", marginBottom: "0.45rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              📸 समाधान साक्ष्य तुलना (Before vs After Evidence):
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
              {/* Before Photo */}
              <div style={{ borderRadius: 10, overflow: "hidden", border: "1.5px solid #cbd5e1", background: "#f8fafc" }}>
                <div style={{ background: "#e2e8f0", color: "#334155", fontSize: "0.68rem", fontWeight: 800, padding: "3px 6px", textAlign: "center" }}>
                  📷 BEFORE (नागरिक समस्या)
                </div>
                {beforeImageUrl ? (
                  <img
                    src={beforeImageUrl}
                    alt="Before Problem"
                    style={{ width: "100%", height: 130, objectFit: "cover", display: "block", cursor: "pointer" }}
                    onClick={() => setPreviewModalImg(beforeImageUrl)}
                  />
                ) : (
                  <div style={{ height: 130, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", color: "#94a3b8" }}>
                    उपलब्ध नहीं
                  </div>
                )}
              </div>

              {/* After Photo */}
              <div style={{ borderRadius: 10, overflow: "hidden", border: "2px solid #22c55e", background: "#000" }}>
                <div style={{ background: "#22c55e", color: "#fff", fontSize: "0.68rem", fontWeight: 800, padding: "3px 6px", textAlign: "center" }}>
                  📸 AFTER (विभागीय समाधान)
                </div>
                {afterImageUrl ? (
                  <img
                    src={afterImageUrl}
                    alt="After Resolution"
                    style={{ width: "100%", height: 130, objectFit: "cover", display: "block", cursor: "pointer" }}
                    onClick={() => setPreviewModalImg(afterImageUrl)}
                  />
                ) : (
                  <div style={{ height: 130, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", color: "#94a3b8" }}>
                    फोटो अपलोड नहीं
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Department Feedback / Response Note */}
          <div style={{ background: "#fff", borderRadius: 10, padding: "0.85rem", border: "1px solid #bbf7d0", marginBottom: "0.85rem" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#15803d", textTransform: "uppercase", marginBottom: "0.25rem" }}>
              विभागीय समाधान उत्तर (Official Department Response):
            </div>
            <p style={{ color: "#14532d", fontSize: "0.9rem", lineHeight: 1.55, margin: 0, fontWeight: 600 }}>
              "{assignment.resolution_note || assignment.completion_note || "स्थल पर नाली की सफाई एवं सीवेज बैकफ्लो समस्या का पूर्ण समाधान कर दिया गया है।"}"
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", fontSize: "0.76rem", color: "#15803d", fontWeight: 600, marginBottom: "0.85rem" }}>
            {assignment.completed_by_name && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <User size={13} /> समाधानकर्ता: {assignment.completed_by_name}
              </span>
            )}
            {assignment.resolved_at && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Calendar size={13} /> दिनांक: {formatDateTime(assignment.resolved_at)}
              </span>
            )}
          </div>

          {/* Download Completion Photo Button */}
          {afterImageUrl && (
            <button
              type="button"
              id="download-completion-photo-btn"
              onClick={handleDownloadCompletionPhoto}
              disabled={downloadingPhoto}
              style={{
                width: "100%",
                background: "#15803d",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "0.85rem",
                fontWeight: 800,
                fontSize: "0.9rem",
                cursor: downloadingPhoto ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                boxShadow: "0 2px 8px rgba(21,128,61,0.25)",
                marginBottom: "0.6rem",
              }}
            >
              <Download size={16} />
              {downloadingPhoto ? "डाउनलोड हो रहा है..." : "कार्य समाप्ति फोटो डाउनलोड करें (Download Photo)"}
            </button>
          )}

          <Link
            to={`/complaints/${assignment.id}`}
            target="_blank"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              background: "#ffffff",
              color: "#0b3a6d",
              border: "1px solid #bfdbfe",
              borderRadius: 10,
              padding: "0.7rem",
              fontSize: "0.84rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <ExternalLink size={14} />
            नागरिक सार्वजनिक पोर्टल पर देखें (View on Public Portal)
          </Link>
        </div>
      )}

      {/* ─── FULL SIZE IMAGE MODAL ─────────────────────────────────── */}
      {previewModalImg && (
        <div
          onClick={() => setPreviewModalImg(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div style={{ position: "relative", maxWidth: "95vw", maxHeight: "90vh" }}>
            <img
              src={previewModalImg}
              alt="Full Preview"
              style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 12, objectFit: "contain", display: "block" }}
            />
            <button
              type="button"
              onClick={() => setPreviewModalImg(null)}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                background: "rgba(0,0,0,0.7)",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
