import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function WorkerRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

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

  if (!user) return <Navigate to="/worker-login" replace />;

  // Only 'worker' role can access worker dashboard
  if (profile?.role !== "worker") {
    // Admins go to admin dashboard, everyone else to home
    if (profile?.role === "admin" || profile?.role === "superadmin") {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
