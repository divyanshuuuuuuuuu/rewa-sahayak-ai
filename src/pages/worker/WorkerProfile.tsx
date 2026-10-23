import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HardHat, Mail, Building2, Phone, LogOut, Shield } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getMyWorkerProfile, type WorkerProfile } from "../../services/workerService";
import { AshokaEmblem } from "../../components/Emblem";

export default function WorkerProfile() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyWorkerProfile().then(({ profile: wp }) => {
      setWorkerProfile(wp);
      setLoading(false);
    });
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/worker-login", { replace: true });
  };

  const initials = (profile?.full_name ?? user?.email ?? "W")
    .split(" ")
    .map(p => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div style={{ padding: "1rem", maxWidth: 500, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.2rem", fontWeight: 900, color: "#0b3a6d", marginBottom: "1.25rem" }}>
        My Profile
      </h1>

      {/* Avatar Card */}
      <div style={{
        background: "linear-gradient(135deg, #061a30, #0b3a6d)",
        borderRadius: 18,
        padding: "1.75rem 1.25rem",
        marginBottom: "1rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.75rem",
        textAlign: "center",
      }}>
        <div style={{
          width: 72,
          height: 72,
          background: "rgba(255,255,255,0.15)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.5rem",
          fontWeight: 900,
          color: "#fcd34d",
          border: "2px solid rgba(255,255,255,0.2)",
          letterSpacing: "0.05em",
        }}>
          {loading ? <HardHat size={32} color="#fcd34d" /> : initials}
        </div>
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem" }}>
            {profile?.full_name ?? "Field Worker"}
          </div>
          {workerProfile && (
            <div style={{ color: "#93c5fd", fontSize: "0.8rem", marginTop: "0.2rem" }}>
              {workerProfile.designation}
            </div>
          )}
          <span style={{
            display: "inline-block",
            marginTop: "0.5rem",
            background: "rgba(252,211,77,0.2)",
            color: "#fcd34d",
            border: "1px solid rgba(252,211,77,0.35)",
            borderRadius: 20,
            padding: "0.2rem 0.75rem",
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
          }}>
            ● FIELD WORKER
          </span>
        </div>
      </div>

      {/* Info Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "1.25rem" }}>
        {[
          { icon: Mail, label: "Email Address", value: user?.email ?? "—" },
          ...(workerProfile ? [
            { icon: Building2, label: "Department", value: workerProfile.department_name },
            { icon: HardHat, label: "Designation", value: workerProfile.designation },
            { icon: Phone, label: "WhatsApp / Phone", value: workerProfile.whatsapp_phone },
          ] : []),
        ].map((item, i) => (
          <div key={i} style={{
            background: "#fff",
            borderRadius: 12,
            padding: "0.85rem 1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            border: "1px solid #e2e8f0",
          }}>
            <div style={{
              width: 36,
              height: 36,
              background: "#eff6ff",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <item.icon size={18} color="#0b3a6d" />
            </div>
            <div>
              <div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {item.label}
              </div>
              <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9rem" }}>
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Account section */}
      <div style={{
        background: "#fff",
        borderRadius: 14,
        padding: "1rem",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        border: "1px solid #e2e8f0",
        marginBottom: "1rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
          <Shield size={15} color="#0b3a6d" />
          <span style={{ fontWeight: 700, fontSize: "0.84rem", color: "#0b3a6d" }}>Account Security</span>
        </div>
        <div style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: 1.5 }}>
          Your account is managed by the municipal administrator. To change your password or update your profile information, contact your department supervisor.
        </div>
      </div>

      {/* Branding */}
      <div style={{
        background: "#fff",
        borderRadius: 14,
        padding: "1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        marginBottom: "1.25rem",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}>
        <AshokaEmblem size={36} />
        <div>
          <div style={{ fontWeight: 700, color: "#0b3a6d", fontSize: "0.82rem" }}>Rewa Municipal Corporation</div>
          <div style={{ color: "#64748b", fontSize: "0.72rem" }}>Rewa Sahayak AI — Field Worker Portal</div>
        </div>
      </div>

      {/* Logout */}
      <button
        id="worker-logout-btn"
        onClick={handleSignOut}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.6rem",
          background: "#fef2f2",
          border: "1.5px solid #fecaca",
          borderRadius: 12,
          padding: "0.95rem",
          color: "#dc2626",
          fontSize: "0.95rem",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        <LogOut size={18} />
        Sign Out
      </button>
    </div>
  );
}
