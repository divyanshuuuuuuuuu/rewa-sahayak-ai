import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function WorkerRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100dvh", background: "#f0f4f8" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 1rem" }} />
          <p style={{ color: "#0b3a6d", fontWeight: 600 }}>Verifying access...</p>
        </div>
      </div>
    );
  }

  // Allow direct viewing of specific task details (/worker/tasks/:id or /worker/task/:id)
  // so field links from WhatsApp/SMS open instantly without dead-ends
  const isTaskDetailPage =
    location.pathname.startsWith("/worker/tasks/") ||
    location.pathname.startsWith("/worker/task/");

  // Allow Admins and Superadmins to view worker tasks and operations
  if (profile?.role === "admin" || profile?.role === "superadmin") {
    return <>{children}</>;
  }

  // If viewing a specific task detail, allow direct access
  if (isTaskDetailPage) {
    return <>{children}</>;
  }

  // For general worker pages, require authenticated worker
  if (!user) {
    return <Navigate to={`/worker-login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Only 'worker' role can access general worker dashboard
  if (profile?.role !== "worker") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
