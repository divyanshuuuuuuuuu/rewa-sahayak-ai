import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  MapPin,
  Calendar,
  ChevronRight,
  ClipboardList,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  X,
  ExternalLink,
} from "lucide-react";
import {
  getMyAssignments,
  getImageUrl,
  workerStatusColors,
  workerStatusLabels,
  type WorkerAssignment,
} from "../../services/workerService";
import { useAuth } from "../../context/AuthContext";
import { DEPARTMENT_METADATA } from "../../services/departmentAccountService";

function StatusBadge({ status }: { status: string }) {
  const color = workerStatusColors[status] ?? "#64748b";
  return (
    <span
      style={{
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
      }}
    >
      ● {workerStatusLabels[status] ?? status}
    </span>
  );
}

const STATUS_TABS = [
  { value: "all", label: "All Tasks" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
];

export default function WorkerTasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [assignments, setAssignments] = useState<WorkerAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const initialFilter = searchParams.get("filter") || searchParams.get("status") || "all";
  const [activeTab, setActiveTab] = useState(initialFilter.toUpperCase() === "ALL" ? "all" : initialFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "urgent">("newest");

  const loadData = async () => {
    try {
      const { assignments: a } = await getMyAssignments();
      setAssignments(a);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    const onUpdate = () => loadData();
    window.addEventListener("rewa_worker_tasks_updated", onUpdate);
    window.addEventListener("rewa_store_updated", onUpdate);
    return () => {
      window.removeEventListener("rewa_worker_tasks_updated", onUpdate);
      window.removeEventListener("rewa_store_updated", onUpdate);
    };
  }, []);

  // Sync tab with URL param changes
  useEffect(() => {
    const urlFilter = searchParams.get("filter") || searchParams.get("status");
    if (urlFilter) {
      setActiveTab(urlFilter);
    }
  }, [searchParams]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    if (val === "all") {
      searchParams.delete("filter");
      searchParams.delete("status");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ filter: val });
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  // Extract unique categories
  const availableCategories = Array.from(new Set(assignments.map((a) => a.category).filter(Boolean)));

  // Filter & Search
  const filtered = assignments.filter((a) => {
    // Tab / Status filter
    if (activeTab !== "all" && a.current_status !== activeTab) return false;
    // Category filter
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
  const sorted = [...filtered].sort((a, b) => {
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

  const deptKey = (user?.user_metadata as any)?.department_key || "water";
  const deptMeta = DEPARTMENT_METADATA[deptKey] || { icon: "🏛️", badgeColor: "#0b3a6d", bgLight: "#eff6ff" };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "55dvh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 1rem" }} />
          <p style={{ color: "#0b3a6d", fontWeight: 600 }}>Loading department assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", maxWidth: 640, margin: "0 auto" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontSize: "1.2rem" }}>{deptMeta.icon}</span>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 900, color: "#0b3a6d", margin: 0 }}>
              Department Complaints Queue
            </h1>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0.2rem 0 0" }}>
            {assignments.length} total task{assignments.length !== 1 ? "s" : ""} authorized for your department
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            background: "#fff",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            padding: "0.4rem 0.75rem",
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "#0b3a6d",
            cursor: refreshing ? "not-allowed" : "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
          <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {/* Status Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          overflowX: "auto",
          paddingBottom: "0.35rem",
          marginBottom: "0.85rem",
          scrollbarWidth: "none",
        }}
      >
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === "all" ? assignments.length : assignments.filter((a) => a.current_status === tab.value).length;
          const isSelected = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              style={{
                flexShrink: 0,
                padding: "0.45rem 0.9rem",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.78rem",
                background: isSelected ? "#0b3a6d" : "#fff",
                color: isSelected ? "#fff" : "#64748b",
                boxShadow: isSelected ? "0 2px 8px rgba(11,58,109,0.25)" : "0 1px 3px rgba(0,0,0,0.06)",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  background: isSelected ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                  color: isSelected ? "#fff" : "#64748b",
                  borderRadius: 10,
                  padding: "1px 6px",
                  fontSize: "0.68rem",
                  fontWeight: 800,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Sort Controls */}
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "0.75rem",
          marginBottom: "1rem",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        {/* Search Input */}
        <div style={{ position: "relative", marginBottom: "0.6rem" }}>
          <Search
            size={15}
            color="#94a3b8"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            placeholder="Search ticket #, title, ward, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 2rem 0.5rem 2rem",
              fontSize: "0.82rem",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#94a3b8",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          <div>
            <label style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: 2 }}>
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "0.4rem 0.5rem",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#334155",
                background: "#f8fafc",
              }}
            >
              <option value="all">All Categories</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: 2 }}>
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                width: "100%",
                padding: "0.4rem 0.5rem",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#334155",
                background: "#f8fafc",
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest Pending First</option>
              <option value="urgent">High Priority First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List */}
      {sorted.length === 0 ? (
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "2.5rem 1rem",
            textAlign: "center",
            border: "1px dashed #cbd5e1",
          }}
        >
          <ClipboardList size={40} color="#cbd5e1" style={{ marginBottom: "0.75rem" }} />
          <div style={{ fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>No assignments found</div>
          <p style={{ color: "#94a3b8", fontSize: "0.82rem", margin: "0 0 1rem" }}>
            {searchQuery || categoryFilter !== "all" || activeTab !== "all"
              ? "No complaints match your active filter criteria."
              : "No assignments in this department queue."}
          </p>
          {(searchQuery || categoryFilter !== "all" || activeTab !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setCategoryFilter("all");
                handleTabChange("all");
              }}
              style={{
                background: "#0b3a6d",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "0.4rem 0.9rem",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {sorted.map((a) => {
            const imageUrl = a.before_image_path
              ? a.before_image_path.startsWith("http")
                ? a.before_image_path
                : getImageUrl(a.before_image_path, "report-images")
              : null;

            return (
              <div
                key={a.id}
                style={{
                  background: "#fff",
                  borderRadius: 14,
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(11,58,109,0.07)",
                  border: "1px solid #e2e8f0",
                }}
              >
                {/* Photo + Details row */}
                <div style={{ display: "flex", gap: 0 }}>
                  {imageUrl && (
                    <div style={{ width: 95, flexShrink: 0, position: "relative", background: "#f8fafc" }}>
                      <img
                        src={imageUrl}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", minHeight: 90 }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).parentElement!.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  <div style={{ flex: 1, padding: "0.85rem 1rem", minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                        marginBottom: "0.35rem",
                      }}
                    >
                      <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#0b3a6d" }}>
                        #{a.reference_number}
                      </span>
                      <StatusBadge status={a.current_status} />
                    </div>

                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        color: "#0f172a",
                        lineHeight: 1.3,
                        marginBottom: "0.35rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {a.title}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.3rem" }}>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "#1e40af",
                          background: "#eff6ff",
                          padding: "1px 6px",
                          borderRadius: 4,
                          fontWeight: 700,
                        }}
                      >
                        {a.category}
                      </span>
                      {a.severity === "HIGH" && (
                        <span
                          style={{
                            fontSize: "0.65rem",
                            color: "#dc2626",
                            background: "#fee2e2",
                            padding: "1px 5px",
                            borderRadius: 4,
                            fontWeight: 800,
                          }}
                        >
                          HIGH PRIORITY
                        </span>
                      )}
                    </div>

                    {a.location_description && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          fontSize: "0.72rem",
                          color: "#64748b",
                        }}
                      >
                        <MapPin size={12} color="#dc2626" />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.location_description}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Bar */}
                <div
                  style={{
                    borderTop: "1px solid #f1f5f9",
                    padding: "0.6rem 1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#fbfcfd",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      fontSize: "0.7rem",
                      color: "#94a3b8",
                    }}
                  >
                    <Calendar size={11} />
                    <span>Updated {formatDate(a.updated_at || a.submitted_at)}</span>
                  </div>

                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <Link
                      to={`/worker/tasks/${a.id}`}
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
                        boxShadow: "0 2px 4px rgba(11,58,109,0.2)",
                      }}
                    >
                      <span>Action / Details</span>
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
