import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, PlayCircle, CheckCircle2, Bell, User, LogOut,
  HardHat, Menu, X, ChevronRight
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getMyNotifications } from "../services/workerService";
import { AshokaEmblem } from "./Emblem";

import { DEPARTMENT_METADATA } from "../services/departmentAccountService";

export default function WorkerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const deptKey = (user?.user_metadata?.department_key as string) || "water";
  const deptMeta = DEPARTMENT_METADATA[deptKey] || { icon: "🏛️", badgeColor: "#0b3a6d", bgLight: "#eff6ff", labelHi: "" };
  const departmentName = user?.user_metadata?.department || user?.user_metadata?.department_name || profile?.full_name || "Department Portal";
  const isDept = user?.user_metadata?.is_department_account ?? true;

  useEffect(() => {
    getMyNotifications().then(({ notifications }) => {
      setUnreadCount(notifications.filter(n => !n.is_read).length);
    });
    // Poll for new notifications every 30s
    const interval = setInterval(() => {
      getMyNotifications().then(({ notifications }) => {
        setUnreadCount(notifications.filter(n => !n.is_read).length);
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/worker-login", { replace: true });
  };

  const isActive = (path: string) => {
    if (path === "/worker" && location.pathname === "/worker") return true;
    if (path !== "/worker" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { path: "/worker", label: "Dashboard", icon: LayoutDashboard },
    { path: "/worker/tasks", label: "Assignments", icon: ClipboardList },
    { path: "/worker/in-progress", label: "In Progress", icon: PlayCircle },
    { path: "/worker/completed", label: "Resolved", icon: CheckCircle2 },
    { path: "/worker/notifications", label: "Alerts", icon: Bell, badge: unreadCount },
  ];

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#f0f4f8" }}>
      {/* ─── Mobile Top Header ─────────────────────────────────────── */}
      <header style={{
        background: "linear-gradient(90deg, #061a30, #0b3a6d)",
        padding: "0.75rem 1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
          <AshokaEmblem size={32} />
          <div style={{ minWidth: 0 }}>
            <div style={{
              color: "#fff",
              fontWeight: 800,
              fontSize: "0.92rem",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}>
              <span>{deptMeta.icon}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{departmentName}</span>
            </div>
            <div style={{ color: "#93c5fd", fontSize: "0.65rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span>Rewa Municipal Corporation</span>
              <span style={{ background: "rgba(34,197,94,0.2)", color: "#86efac", padding: "1px 6px", borderRadius: 10, fontSize: "0.6rem" }}>● Active</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          {/* Notification bell */}
          <Link to="/worker/notifications" style={{ position: "relative", color: "#fff", display: "flex" }}>
            <Bell size={22} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute",
                top: -4,
                right: -4,
                background: "#ef4444",
                color: "#fff",
                fontSize: "0.6rem",
                fontWeight: 800,
                borderRadius: "50%",
                minWidth: 16,
                height: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1.5px solid #0b3a6d",
              }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          {/* Hamburger for profile drawer */}
          <button
            onClick={() => setDrawerOpen(true)}
            style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", padding: 0 }}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* ─── Side Drawer (for profile / logout) ──────────────────── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              zIndex: 199,
            }}
          />
          {/* Drawer */}
          <div style={{
            position: "fixed",
            top: 0,
            right: 0,
            height: "100dvh",
            width: "min(280px, 80vw)",
            background: "#fff",
            zIndex: 200,
            boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
          }}>
            {/* Drawer Header */}
            <div style={{
              background: "linear-gradient(135deg, #061a30, #0b3a6d)",
              padding: "1.25rem 1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{
                  width: 42,
                  height: 42,
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <HardHat size={22} color="#fcd34d" />
                </div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem" }}>
                    {profile?.full_name ?? "Field Worker"}
                  </div>
                  <div style={{ color: "#93c5fd", fontSize: "0.72rem" }}>
                    {user?.email ?? ""}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Nav */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 0" }}>
              <Link
                to="/worker"
                onClick={() => setDrawerOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1.25rem",
                  textDecoration: "none",
                  color: location.pathname === "/worker" ? "#0b3a6d" : "#334155",
                  background: location.pathname === "/worker" ? "#eff6ff" : "transparent",
                  borderLeft: location.pathname === "/worker" ? "3px solid #0b3a6d" : "3px solid transparent",
                  fontWeight: location.pathname === "/worker" ? 700 : 500,
                  fontSize: "0.88rem",
                }}
              >
                <LayoutDashboard size={18} />
                <span style={{ flex: 1 }}>Dashboard Overview</span>
                <ChevronRight size={14} color="#cbd5e1" />
              </Link>

              <Link
                to="/worker/tasks"
                onClick={() => setDrawerOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1.25rem",
                  textDecoration: "none",
                  color: location.pathname === "/worker/tasks" ? "#0b3a6d" : "#334155",
                  background: location.pathname === "/worker/tasks" ? "#eff6ff" : "transparent",
                  borderLeft: location.pathname === "/worker/tasks" ? "3px solid #0b3a6d" : "3px solid transparent",
                  fontWeight: location.pathname === "/worker/tasks" ? 700 : 500,
                  fontSize: "0.88rem",
                }}
              >
                <ClipboardList size={18} />
                <span style={{ flex: 1 }}>All Department Complaints</span>
                <ChevronRight size={14} color="#cbd5e1" />
              </Link>

              <Link
                to="/worker/tasks?filter=ASSIGNED"
                onClick={() => setDrawerOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1.25rem",
                  textDecoration: "none",
                  color: "#d97706",
                  fontWeight: 600,
                  fontSize: "0.88rem",
                }}
              >
                <span style={{ fontSize: "1rem" }}>📋</span>
                <span style={{ flex: 1 }}>New Assignments / Tasks</span>
                <ChevronRight size={14} color="#cbd5e1" />
              </Link>

              <Link
                to="/worker/in-progress"
                onClick={() => setDrawerOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1.25rem",
                  textDecoration: "none",
                  color: location.pathname === "/worker/in-progress" ? "#7c3aed" : "#334155",
                  background: location.pathname === "/worker/in-progress" ? "#f5f3ff" : "transparent",
                  borderLeft: location.pathname === "/worker/in-progress" ? "3px solid #7c3aed" : "3px solid transparent",
                  fontWeight: location.pathname === "/worker/in-progress" ? 700 : 500,
                  fontSize: "0.88rem",
                }}
              >
                <PlayCircle size={18} color="#7c3aed" />
                <span style={{ flex: 1 }}>Work In Progress</span>
                <ChevronRight size={14} color="#cbd5e1" />
              </Link>

              <Link
                to="/worker/completed"
                onClick={() => setDrawerOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1.25rem",
                  textDecoration: "none",
                  color: location.pathname === "/worker/completed" ? "#15803d" : "#334155",
                  background: location.pathname === "/worker/completed" ? "#f0fdf4" : "transparent",
                  borderLeft: location.pathname === "/worker/completed" ? "3px solid #15803d" : "3px solid transparent",
                  fontWeight: location.pathname === "/worker/completed" ? 700 : 500,
                  fontSize: "0.88rem",
                }}
              >
                <CheckCircle2 size={18} color="#15803d" />
                <span style={{ flex: 1 }}>Resolved Complaints</span>
                <ChevronRight size={14} color="#cbd5e1" />
              </Link>

              <Link
                to="/worker/completed"
                onClick={() => setDrawerOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1.25rem",
                  textDecoration: "none",
                  color: "#0b3a6d",
                  fontWeight: 600,
                  fontSize: "0.88rem",
                }}
              >
                <span style={{ fontSize: "1rem" }}>📸</span>
                <span style={{ flex: 1 }}>Completion Evidence</span>
                <ChevronRight size={14} color="#cbd5e1" />
              </Link>

              <Link
                to="/worker/notifications"
                onClick={() => setDrawerOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1.25rem",
                  textDecoration: "none",
                  color: location.pathname === "/worker/notifications" ? "#0b3a6d" : "#334155",
                  background: location.pathname === "/worker/notifications" ? "#eff6ff" : "transparent",
                  fontWeight: location.pathname === "/worker/notifications" ? 700 : 500,
                  fontSize: "0.88rem",
                }}
              >
                <Bell size={18} />
                <span style={{ flex: 1 }}>Notifications</span>
                {unreadCount > 0 ? (
                  <span style={{ background: "#ef4444", color: "#fff", fontSize: "0.65rem", fontWeight: 800, borderRadius: 20, padding: "1px 6px" }}>
                    {unreadCount}
                  </span>
                ) : <ChevronRight size={14} color="#cbd5e1" />}
              </Link>

              <div style={{ height: 1, background: "#e2e8f0", margin: "0.5rem 1.25rem" }} />

              <Link
                to="/worker/profile"
                onClick={() => setDrawerOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1.25rem",
                  textDecoration: "none",
                  color: location.pathname === "/worker/profile" ? "#0b3a6d" : "#334155",
                  background: location.pathname === "/worker/profile" ? "#eff6ff" : "transparent",
                  fontWeight: location.pathname === "/worker/profile" ? 700 : 500,
                  fontSize: "0.88rem",
                }}
              >
                <User size={18} />
                <span>Department Profile</span>
                <ChevronRight size={14} color="#cbd5e1" style={{ marginLeft: "auto" }} />
              </Link>
            </div>

            {/* Logout */}
            <div style={{ padding: "1rem", borderTop: "1px solid #e2e8f0" }}>
              <button
                onClick={handleSignOut}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  width: "100%",
                  padding: "0.85rem",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 10,
                  color: "#dc2626",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: "auto", paddingBottom: "5.5rem" }}>
        <Outlet />
      </main>

      {/* ─── Mobile Bottom Navigation ─────────────────────────────── */}
      <nav style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#fff",
        borderTop: "1px solid #e2e8f0",
        display: "flex",
        zIndex: 100,
        boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.55rem 0.25rem 0.45rem",
              textDecoration: "none",
              color: isActive(item.path) ? "#0b3a6d" : "#94a3b8",
              position: "relative",
              gap: "0.2rem",
              transition: "color 0.15s",
            }}
            aria-label={item.label}
          >
            <div style={{ position: "relative" }}>
              <item.icon size={22} />
              {item.badge && item.badge > 0 ? (
                <span style={{
                  position: "absolute",
                  top: -5,
                  right: -6,
                  background: "#ef4444",
                  color: "#fff",
                  fontSize: "0.55rem",
                  fontWeight: 800,
                  borderRadius: "50%",
                  minWidth: 14,
                  height: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1.5px solid #fff",
                }}>
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              ) : null}
            </div>
            <span style={{ fontSize: "0.6rem", fontWeight: isActive(item.path) ? 700 : 500, lineHeight: 1 }}>
              {item.label}
            </span>
            {isActive(item.path) && (
              <div style={{
                position: "absolute",
                top: 0,
                left: "15%",
                right: "15%",
                height: 3,
                background: "#0b3a6d",
                borderRadius: "0 0 4px 4px",
              }} />
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
