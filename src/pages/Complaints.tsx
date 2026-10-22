import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Clock, MapPin, Plus, ShieldCheck, Camera, RefreshCw } from "lucide-react";
import { getPublicReports, getMyCitizenReports, type DbReport } from "../services/supabaseStore";
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
  const [searchParams] = useSearchParams();
  const { lang, bilingual, statusLabel, categoryLabel } = useGov();
  const { user } = useAuth();
  const moduleParam = searchParams.get("module") || "";

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
  const [search, setSearch] = useState("");

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
        if (e) { setError(e); } else { setReports(r); setTotal(t); }
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { loadReports(); }, [viewMode, categoryFilter, moduleFilter, statusFilter, search, page]);

  // Realtime subscription for new approved reports
  useEffect(() => {
    const channel = supabase.channel("public-reports-feed")
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "citizen_reports",
        filter: "public_visibility=eq.true"
      }, () => { loadReports(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const formatDate = (d: string) => new Date(d).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" });

  const displayed = useMemo(() => {
    if (viewMode === "mine") {
      let list = reports;
      if (search) {
        const q = search.toLowerCase();
        list = list.filter(r => r.title.toLowerCase().includes(q) || r.reference_number.toLowerCase().includes(q) || r.location_description?.toLowerCase().includes(q));
      }
      return list;
    }
    return reports;
  }, [reports, search, viewMode]);

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
            <input className="form-input" style={{ paddingLeft: "2.5rem" }}
              placeholder={bilingual("शिकायत क्रमांक, शीर्षक या वार्ड खोजें...", "Search ticket, title or area...")}
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
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
            <h3 style={{ color: "#0b3a6d", fontWeight: 800 }}>{bilingual("कोई शिकायत नहीं मिली", "No Complaints Found")}</h3>
            <p style={{ color: "#64748b" }}>
              {viewMode === "mine"
                ? bilingual("आपने अभी तक कोई शिकायत दर्ज नहीं की है।", "You haven't submitted any complaints yet.")
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
                <Link to={`/complaints/${r.id}`} key={r.id} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="complaint-card">
                    <div className="complaint-card-header">
                      <div style={{ flex: 1 }}>
                        <div className="complaint-card-title">
                          {(categoryIcons as any)[r.category] || "📋"} {r.title}
                        </div>
                        <div className="complaint-card-meta" style={{ marginTop: "0.35rem" }}>
                          <span style={{ fontWeight: 800, color: "#0b3a6d", background: "#eef4fb", padding: "0.1rem 0.4rem", borderRadius: 4 }}>
                            {r.reference_number}
                          </span>
                          <span>•</span>
                          <span style={{ fontWeight: 600, color: "#334155" }}>{categoryLabel(r.category)}</span>
                          {r.location_description && (
                            <>
                              <span>•</span>
                              <span style={{ color: "#475569" }}>
                                <MapPin size={13} style={{ verticalAlign: "middle", marginRight: 2 }} />
                                {r.location_description}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <span className="badge" style={{ background: `${statusColors[r.current_status] || "#64748b"}20`, color: statusColors[r.current_status] || "#64748b", border: `1px solid ${statusColors[r.current_status] || "#64748b"}44` }}>
                          ● {statusLabel(r.current_status)}
                        </span>
                        <span className="badge" style={{ background: r.severity === "HIGH" ? "#fee2e220" : r.severity === "MEDIUM" ? "#fef3c720" : "#f0fdf420", color: r.severity === "HIGH" ? "#dc2626" : r.severity === "MEDIUM" ? "#d97706" : "#15803d" }}>
                          {r.severity}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem", paddingTop: "0.6rem", borderTop: "1px solid #f1f5f9", flexWrap: "wrap", gap: "0.4rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span className="badge" style={{ background: `${MODULE_COLORS[r.module]}15`, color: MODULE_COLORS[r.module], border: `1px solid ${MODULE_COLORS[r.module]}33` }}>
                          {r.module.replace("_", " ")}
                        </span>
                        {r.before_image_path && (
                          <span style={{ fontSize: "0.72rem", color: "#15803d", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.25rem", background: "#dcfce7", padding: "0.12rem 0.45rem", borderRadius: 4 }}>
                            <Camera size={11} /> {bilingual("फोटो साक्ष्य", "Photo Attached")}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "0.78rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.3rem" }}>
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
