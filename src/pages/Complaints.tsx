import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Clock, MapPin, Plus, ShieldCheck, Camera, RefreshCw, Trash2 } from "lucide-react";
import { getPublicReports, getMyCitizenReports, type DbReport } from "../services/supabaseStore";
import { getAllComplaints, adminDeleteComplaint, isComplaintDeleted } from "../services/store";
import { statusColors, categoryIcons } from "../services/ai";
import { useGov } from "../context/GovContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";

const MODULE_COLORS: Record<string, string> = {
  smart_waste: "#16a34a", jalrakshak: "#0284c7", rewa_sahayak: "#7c3aed", other: "#64748b"
};
const statusKeys = ["SUBMITTED","UNDER_REVIEW","APPROVED","ASSIGNED","IN_PROGRESS","DELAYED","RESOLVED","CLOSED","REJECTED"];
const CATEGORIES = ["Waste Management","Water & Leakage","Waterlogging & Drainage","Roads & Potholes","Streetlights","Public Cleanliness","Sanitation","Government Service Assistance","Other Civic Issue"];

export default function Complaints() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang, bilingual, statusLabel, categoryLabel } = useGov();
  const { user, isAdmin } = useAuth();
  const moduleParam = searchParams.get("module") || "";
  const initialSearch = searchParams.get("search") || "";

  const [viewMode, setViewMode] = useState<"public" | "mine">("public");
  const [reports, setReports] = useState<DbReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState(moduleParam);
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    const s = searchParams.get("search");
    if (s !== null && s !== search) {
      setSearch(s);
    }
  }, [searchParams]);

  const loadReports = async () => {
    setLoading(true); setError("");
    try {
      if (viewMode === "mine" && user) {
        const { reports: r, error: e } = await getMyCitizenReports();
        if (e) { setError(e); } else { setReports(r); setTotal(r.length); }
      } else {
        const { reports: r, total: t, error: e } = await getPublicReports({
          category: categoryFilter || undefined,
          module: moduleFilter || undefined,
          status: statusFilter || undefined,
          search: search || undefined,
          page,
          pageSize: PAGE_SIZE,
        });

        // Merge with local store complaints to guarantee any locally filed complaint is immediately visible
        const localComplaints = getAllComplaints();
        const serverTicketSet = new Set((r || []).map((rep) => rep.reference_number || rep.id));
        const extraLocal: DbReport[] = localComplaints
          .filter((c) => !serverTicketSet.has(c.ticket_number) && !serverTicketSet.has(c.id))
          .map((c) => ({
            id: c.id,
            reference_number: c.ticket_number,
            submitted_by: c.citizen_id,
            citizen_name: c.citizen_name,
            category: c.category,
            subcategory: c.subcategory || null,
            module: c.module,
            title: c.title,
            description: c.description,
            severity: c.severity,
            area_or_ward: null,
            location_description: c.address,
            latitude: c.latitude ?? null,
            longitude: c.longitude ?? null,
            before_image_path: c.image_url || null,
            completion_image_path: c.video_url || null,
            current_status: c.status,
            public_visibility: true,
            ai_summary: c.ai_summary || null,
            ai_confidence: c.ai_confidence || null,
            voice_transcript: c.voice_transcript || null,
            voice_audio_path: c.audio_url || null,
            voice_audio_duration: c.audio_duration || null,
            voice_audio_mime_type: c.audio_mime_type || null,
            public_audio_consent: c.public_audio_consent !== false,
            assigned_department_id: null,
            assigned_department_name: c.assigned_department || null,
            assigned_to: c.assigned_to || null,
            delay_reason: c.delay_reason || null,
            resolution_note: c.resolution_note || null,
            resolved_at: null,
            submitted_at: c.created_at,
            updated_at: c.updated_at,
          }));

        const validRemote = (r || []).filter(rep => !isComplaintDeleted(rep.id));
        const combined = [...validRemote, ...extraLocal];
        setReports(combined);
        setTotal(combined.length);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const onUpdate = () => loadReports();
    window.addEventListener('rewa_store_updated', onUpdate);
    return () => window.removeEventListener('rewa_store_updated', onUpdate);
  }, []);

  useEffect(() => { loadReports(); }, [viewMode, categoryFilter, moduleFilter, statusFilter, search, page]);

  // Realtime subscription for new approved reports
  useEffect(() => {
    const channel = supabase.channel("public-reports-feed")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "citizen_reports",
        filter: "public_visibility=eq.true"
      }, () => { loadReports(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const formatDate = (d: string) => new Date(d).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" });

  const displayed = useMemo(() => {
    let list = reports.filter(r => !r.removed_from_website);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const qClean = q.replace(/[^a-z0-9]/g, "");
      const qDigits = q.replace(/[^0-9]/g, "");
      list = list.filter(r => {
        const title = (r.title || "").toLowerCase();
        const ref = (r.reference_number || "").toLowerCase();
        const refClean = ref.replace(/[^a-z0-9]/g, "");
        const refDigits = ref.replace(/[^0-9]/g, "");
        const id = (r.id || "").toLowerCase();
        const loc = (r.location_description || "").toLowerCase();
        const desc = (r.description || "").toLowerCase();
        return (
          title.includes(q) ||
          ref.includes(q) ||
          id.includes(q) ||
          loc.includes(q) ||
          desc.includes(q) ||
          (qClean.length > 0 && refClean.includes(qClean)) ||
          (qDigits.length >= 4 && refDigits.includes(qDigits))
        );
      });
    }
    // Complaints marked as SUBMITTED are placed at the bottom of all complaints
    return [...list].sort((a, b) => {
      const aIsSubmitted = a.current_status === "SUBMITTED";
      const bIsSubmitted = b.current_status === "SUBMITTED";
      if (aIsSubmitted && !bIsSubmitted) return 1; // SUBMITTED moves towards bottom
      if (!aIsSubmitted && bIsSubmitted) return -1; // non-SUBMITTED stays at top
      return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
    });
  }, [reports, search]);

  return (
    <div className="page fade-in">
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <span className="gov-seal-badge" style={{ marginBottom: "0.35rem" }}>
              <ShieldCheck size={14} color="#0b3a6d" />
              {bilingual("रीवा नगर निगम — सार्वजनिक शिकायत पंजी", "Rewa Municipal Corporation — Public Grievance Register")}
            </span>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#0b3a6d", margin: 0 }}>
              {bilingual("जन-शिकायतें एवं निराकरण स्थिति", "Civic Grievances & Resolution Status")}
            </h1>
            <p style={{ color: "#475569", fontSize: "0.88rem", marginTop: "0.2rem" }}>
              {loading ? bilingual("लोड हो रहा है...", "Loading...") : `${total} ${bilingual("शिकायतें", "complaints found")}`}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="button" onClick={loadReports} className="btn btn-secondary btn-sm" title="Refresh">
              <RefreshCw size={14} />
            </button>
            <Link to="/report" className="btn btn-primary" style={{ background: "#e65100", borderColor: "#c2410c" }}>
              <Plus size={16} />
              <span>{bilingual("नई शिकायत दर्ज करें", "+ Lodge New Issue")}</span>
            </Link>
          </div>
        </div>

        {/* View mode tabs */}
        <div className="tabs" style={{ marginBottom: "1rem" }}>
          <button type="button" className={`tab ${viewMode === "public" ? "active" : ""}`} onClick={() => { setViewMode("public"); setPage(1); }}>
            🌐 {bilingual("सार्वजनिक शिकायतें", "Public Reports")}
          </button>
          {user && (
            <button type="button" className={`tab ${viewMode === "mine" ? "active" : ""}`} onClick={() => { setViewMode("mine"); setPage(1); }}>
              👤 {bilingual("मेरी शिकायतें", "My Complaints")}
            </button>
          )}
          <button type="button" className={`tab ${moduleFilter === "smart_waste" ? "active" : ""}`} onClick={() => { setModuleFilter(m => m === "smart_waste" ? "" : "smart_waste"); setPage(1); setViewMode("public"); }}>
            🗑️ {bilingual("स्मार्ट वेस्ट", "Smart Waste")}
          </button>
          <button type="button" className={`tab ${moduleFilter === "jalrakshak" ? "active" : ""}`} onClick={() => { setModuleFilter(m => m === "jalrakshak" ? "" : "jalrakshak"); setPage(1); setViewMode("public"); }}>
            💧 {bilingual("जल रक्षक", "JalRakshak")}
          </button>
          <button type="button" className={`tab ${moduleFilter === "rewa_sahayak" ? "active" : ""}`} onClick={() => { setModuleFilter(m => m === "rewa_sahayak" ? "" : "rewa_sahayak"); setPage(1); setViewMode("public"); }}>
            🏛️ {bilingual("रीवा सहायक", "Rewa Sahayak")}
          </button>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div style={{ flex: 1, position: "relative", minWidth: "220px" }}>
            <Search size={16} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
            <input className="form-input" style={{ paddingLeft: "2.5rem", paddingRight: search ? "2.5rem" : "1rem" }}
              placeholder={bilingual("शिकायत क्रमांक, शीर्षक या वार्ड खोजें...", "Search ticket, title or area...")}
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); setPage(1); }}
                style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.1rem", padding: "0.2rem" }}
                title={bilingual("खोज साफ करें", "Clear search")}
              >
                ✕
              </button>
            )}
          </div>
          {viewMode === "public" && (
            <>
              <select className="filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="">{bilingual("सभी स्थिति", "All Status")}</option>
                {statusKeys.map(k => <option key={k} value={k}>{statusLabel(k)}</option>)}
              </select>
              <select className="filter-select" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}>
                <option value="">{bilingual("सभी श्रेणियां", "All Categories")}</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
              </select>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "1rem", marginBottom: "1rem", color: "#dc2626" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading ? (
          <div style={{ display: "grid", gap: "0.85rem" }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="complaint-card" style={{ opacity: 0.5 }}>
                <div style={{ height: 20, background: "#e2e8f0", borderRadius: 4, marginBottom: "0.5rem", width: "60%" }} />
                <div style={{ height: 14, background: "#f1f5f9", borderRadius: 4, width: "40%" }} />
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3 style={{ color: "#0b3a6d", fontWeight: 800 }}>
              {total === 0 && !search && !categoryFilter && !moduleFilter && !statusFilter
                ? bilingual("अभी कोई शिकायत दर्ज नहीं है", "No complaints yet.")
                : bilingual("कोई शिकायत नहीं मिली", "No Complaints Found")}
            </h3>
            <p style={{ color: "#64748b" }}>
              {viewMode === "mine"
                ? bilingual("आपने अभी तक कोई शिकायत दर्ज नहीं की है।", "You haven't submitted any complaints yet.")
                : total === 0 && !search && !categoryFilter && !moduleFilter && !statusFilter
                  ? bilingual("नागरिकों द्वारा दर्ज की गई नई शिकायतें यहाँ दिखाई देंगी।", "New complaints submitted by citizens will appear here.")
                  : bilingual("कृपया फिल्टर बदलकर पुनः प्रयास करें।", "Try adjusting your filters.")}
            </p>
            <Link to="/report" className="btn btn-primary" style={{ marginTop: "1rem" }}>
              {bilingual("अभी शिकायत दर्ज करें", "Lodge a Complaint Now")}
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gap: "0.85rem" }}>
              {displayed.map(r => (
                <Link to={`/complaints/${r.id}`} key={r.id} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                  <div className="complaint-card">
                    {/* Top Row: Ticket Number on Left, Status + Priority on Right */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.55rem", flexWrap: "wrap", gap: "0.4rem" }}>
                      <span className="ticket-badge" style={{ color: "var(--gov-navy)", background: "#eef4fb", padding: "0.2rem 0.55rem", borderRadius: 4, fontWeight: 800, fontSize: "0.82rem" }}>
                        {r.reference_number}
                      </span>
                      <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", flexWrap: "wrap" }}>
                        <span className="badge" style={{ background: `${statusColors[r.current_status] || "#64748b"}20`, color: statusColors[r.current_status] || "#64748b", border: `1px solid ${statusColors[r.current_status] || "#64748b"}44`, fontSize: "0.72rem", padding: "0.2rem 0.55rem" }}>
                          ● {statusLabel(r.current_status)}
                        </span>
                        <span className="badge" style={{ background: r.severity === "HIGH" ? "#fee2e2" : r.severity === "MEDIUM" ? "#fef3c7" : "#f0fdf4", color: r.severity === "HIGH" ? "#dc2626" : r.severity === "MEDIUM" ? "#d97706" : "#15803d", border: `1px solid ${r.severity === "HIGH" ? "#fca5a5" : r.severity === "MEDIUM" ? "#fde68a" : "#bbf7d0"}`, fontSize: "0.72rem", padding: "0.2rem 0.55rem" }}>
                          {r.severity}
                        </span>
                        {isAdmin && (
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{
                              padding: "0.15rem 0.45rem",
                              fontSize: "0.7rem",
                              background: "#dc2626",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: 4,
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.2rem",
                            }}
                            title="Admin Delete"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (confirm(bilingual(
                                `[व्यवस्थापक] क्या आप शिकायत #${r.reference_number} को स्थायी रूप से हटाना (Delete) चाहते हैं?`,
                                `[Admin] Permanently delete complaint #${r.reference_number}?`
                              ))) {
                                setReports(prev => prev.filter(rep => rep.id !== r.id && rep.reference_number !== r.reference_number));
                                await adminDeleteComplaint(r.id);
                              }
                            }}
                          >
                            <Trash2 size={11} />
                            <span>{bilingual("डिलीट", "Delete")}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Middle: Full-Width Title (never squashed or broken into narrow columns) */}
                    <h3 className="complaint-card-title" style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--gov-navy)", lineHeight: 1.45, margin: "0 0 0.55rem 0", wordBreak: "break-word" }}>
                      {(categoryIcons as any)[r.category] || "📋"} {r.title}
                    </h3>

                    {/* Category & Location details */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "0.65rem", fontSize: "0.84rem", color: "var(--text-secondary)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, color: "#334155" }}>
                          {categoryLabel(r.category)}
                        </span>
                      </div>
                      {r.location_description && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.35rem", color: "#475569", lineHeight: 1.4 }}>
                          <MapPin size={14} style={{ flexShrink: 0, marginTop: 2, color: "#d95d08" }} />
                          <span style={{ wordBreak: "break-word" }}>{r.location_description}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Module Tag, Photo Evidence Indicator, and Date */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem", paddingTop: "0.6rem", borderTop: "1px solid #e2e8f0", flexWrap: "wrap", gap: "0.4rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                        <span className="badge" style={{ background: `${MODULE_COLORS[r.module] || "#64748b"}15`, color: MODULE_COLORS[r.module] || "#64748b", border: `1px solid ${MODULE_COLORS[r.module] || "#64748b"}33`, fontSize: "0.7rem", padding: "0.15rem 0.5rem" }}>
                          {r.module.replace("_", " ")}
                        </span>
                        {r.before_image_path && (
                          <span style={{ fontSize: "0.72rem", color: "#15803d", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.25rem", background: "#dcfce7", padding: "0.15rem 0.5rem", borderRadius: 4, border: "1px solid #86efac" }}>
                            <Camera size={12} /> {bilingual("फोटो साक्ष्य", "Photo Attached")}
                          </span>
                        )}
                        {(r.voice_audio_path || (r as any).is_voice_transcribed) && (
                          <span style={{ fontSize: "0.72rem", color: "#0b3a6d", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.25rem", background: "#eff6ff", padding: "0.15rem 0.5rem", borderRadius: 4, border: "1px solid #bfdbfe" }}>
                            🎙️ {bilingual("बोलकर दर्ज (Voice Transcribed)", "Voice Transcribed")}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "0.76rem", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                        <Clock size={12} /> {formatDate(r.submitted_at)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination (public mode) */}
            {viewMode === "public" && total > PAGE_SIZE && (
              <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
                <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem", color: "#475569" }}>
                  Page {page} of {Math.ceil(total / PAGE_SIZE)}
                </span>
                <button className="btn btn-secondary btn-sm" disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
