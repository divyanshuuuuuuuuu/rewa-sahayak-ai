import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, Map, BarChart3, Shield, LogOut,
  ExternalLink, Clock, Radio, Search, Menu, X, ChevronRight,
  HardHat, Globe, RefreshCw
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useGov } from "../context/GovContext";
import { CivicInsignia } from "./Emblem";
import { syncFromSupabase } from "../services/store";

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { lang, toggleLang, bilingual } = useGov();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [syncing, setSyncing] = useState(false);

  // Live IST Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await syncFromSupabase();
    setTimeout(() => setSyncing(false), 500);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const isActive = (path: string) => {
    if (path === "/admin" && location.pathname === "/admin") return true;
    if (path !== "/admin" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navLinks = [
    { path: "/admin", label: bilingual("कमांड सेंटर (ओवरव्यू)", "Command Overview"), icon: LayoutDashboard },
    { path: "/admin/complaints", label: bilingual("शिकायत नियंत्रण (Triage)", "Complaints Manager"), icon: FileText },
    { path: "/admin/map", label: bilingual("GIS वार्ड रडार (Heatmap)", "GIS Ward Radar"), icon: Map },
    { path: "/admin/analytics", label: bilingual("विश्लेषण एवं SLA", "SLA & Analytics"), icon: BarChart3 },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100dvh", background: "#f8fafc", color: "#0f172a" }}>
      {/* ─── Executive Desktop Sidebar ─────────────────────────────────────── */}
      <aside
        style={{
          width: 280,
          background: "linear-gradient(180deg, #051329 0%, #081d3d 50%, #06152d 100%)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.2)",
          zIndex: 50,
          position: "sticky",
          top: 0,
          height: "100dvh",
        }}
        className="admin-desktop-sidebar"
      >
        {/* Brand Header */}
        <div style={{ padding: "1.25rem 1.25rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <CivicInsignia size={36} />
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: 900, letterSpacing: "-0.01em", color: "#f8fafc" }}>
                REWA COMMAND
              </div>
              <div style={{ fontSize: "0.68rem", color: "#93c5fd", fontWeight: 600 }}>
                Municipal Control Center
              </div>
            </div>
          </div>

          {/* Pulse Status */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "rgba(16, 185, 129, 0.12)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            padding: "0.2rem 0.6rem",
            borderRadius: 20,
            fontSize: "0.68rem",
            color: "#34d399",
            fontWeight: 700,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
            CONTROL ROOM • LIVE
          </div>
        </div>

        {/* Officer Profile Badge */}
        <div style={{ padding: "1rem 1.25rem", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              color: "#0f172a",
              fontSize: "0.9rem",
              boxShadow: "0 2px 8px rgba(245,158,11,0.3)",
            }}>
              {profile?.full_name?.charAt(0) || "A"}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontWeight: 800, fontSize: "0.84rem", color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {profile?.full_name || "Admin Officer"}
              </div>
              <div style={{ fontSize: "0.68rem", color: "#fcd34d", fontWeight: 700 }}>
                {profile?.role === "superadmin" ? "SUPERADMINISTRATOR" : "MUNICIPAL CONTROLLER"}
              </div>
            </div>
          </div>
        </div>

        {/* Main Command Navigation */}
        <nav style={{ flex: 1, padding: "1rem 0.75rem", overflowY: "auto" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 0.5rem 0.5rem" }}>
            Core Modules
          </div>
          {navLinks.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 0.85rem",
                  borderRadius: 8,
                  marginBottom: "0.35rem",
                  textDecoration: "none",
                  fontWeight: active ? 700 : 500,
                  fontSize: "0.85rem",
                  color: active ? "#ffffff" : "#94a3b8",
                  background: active ? "linear-gradient(90deg, rgba(37,99,235,0.4), rgba(11,58,109,0.3))" : "transparent",
                  borderLeft: active ? "3px solid #38bdf8" : "3px solid transparent",
                  transition: "all 0.15s ease",
                }}
              >
                <item.icon size={17} color={active ? "#38bdf8" : "#94a3b8"} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {active && <ChevronRight size={14} color="#38bdf8" />}
              </Link>
            );
          })}

          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "1rem 0.5rem" }} />

          {/* Quick Cross-Portal Switchers */}
          <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 0.5rem 0.5rem" }}>
            External Portals
          </div>
          <Link
            to="/worker-login"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              padding: "0.65rem 0.85rem",
              borderRadius: 8,
              textDecoration: "none",
              color: "#fbbf24",
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.25)",
              fontSize: "0.8rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
            }}
          >
            <HardHat size={16} />
            <span style={{ flex: 1 }}>Field Worker Portal</span>
            <ExternalLink size={12} />
          </Link>

          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              padding: "0.65rem 0.85rem",
              borderRadius: 8,
              textDecoration: "none",
              color: "#93c5fd",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            <Globe size={16} />
            <span style={{ flex: 1 }}>Public Citizen Portal</span>
            <ExternalLink size={12} />
          </Link>
        </nav>

        {/* Footer info & clock */}
        <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.72rem", color: "#94a3b8" }}>
              <Clock size={13} color="#38bdf8" />
              <span>
                {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} IST
              </span>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              title="Sync Supabase Database"
              style={{
                background: "none",
                border: "none",
                color: syncing ? "#38bdf8" : "#64748b",
                cursor: "pointer",
                padding: 0,
                display: "flex",
              }}
            >
              <RefreshCw size={14} className={syncing ? "spin-sync" : ""} />
            </button>
          </div>

          <button
            onClick={handleSignOut}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.55rem",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#f87171",
              borderRadius: 6,
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <LogOut size={14} />
            <span>Sign Out Controller</span>
          </button>
        </div>
      </aside>

      {/* ─── Main Content Frame ────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowX: "hidden" }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: 60,
            background: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 1.5rem",
            position: "sticky",
            top: 0,
            zIndex: 40,
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          {/* Mobile menu trigger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="admin-mobile-toggle"
            style={{ background: "none", border: "none", cursor: "pointer", display: "none", padding: 0 }}
          >
            <Menu size={22} color="#0f172a" />
          </button>

          {/* Breadcrumb info */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
            <span style={{ color: "#64748b", fontWeight: 600 }}>Rewa Nagar Nigam</span>
            <span style={{ color: "#cbd5e1" }}>/</span>
            <span style={{ color: "#0b3a6d", fontWeight: 800 }}>Administrative Control Cell</span>
          </div>

          {/* Quick Tools */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Language Switcher */}
            <button
              onClick={toggleLang}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                padding: "0.3rem 0.6rem",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#0b3a6d",
                cursor: "pointer",
              }}
            >
              {lang === "hi" ? "English" : "हिन्दी"}
            </button>

            {/* Supabase connection indicator */}
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              padding: "0.25rem 0.6rem",
              borderRadius: 20,
              fontSize: "0.72rem",
              color: "#1d4ed8",
              fontWeight: 700,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563eb" }} />
              Live DB
            </span>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main style={{ flex: 1, padding: "1.5rem" }}>
          <Outlet />
        </main>
      </div>

      {/* ─── Mobile Slide-out Drawer ────────────────────────────────────────── */}
      {sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }}>
          <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" }} />
          <div style={{
            position: "relative",
            width: 280,
            background: "#051329",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            zIndex: 101,
          }}>
            <div style={{ padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <span style={{ color: "#fff", fontWeight: 800 }}>Admin Command</span>
              <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: "#fff" }}>
                <X size={20} />
              </button>
            </div>
            <nav style={{ padding: "1rem" }}>
              {navLinks.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem",
                    color: isActive(item.path) ? "#38bdf8" : "#fff",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Inlined CSS for responsive rules */}
      <style>{`
        @keyframes spinSync {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-sync {
          animation: spinSync 0.8s linear infinite;
        }
        @media (max-width: 900px) {
          .admin-desktop-sidebar {
            display: none !important;
          }
          .admin-mobile-toggle {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
