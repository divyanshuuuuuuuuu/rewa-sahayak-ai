import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, HardHat, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { AshokaEmblem } from "../components/Emblem";

export default function WorkerLogin() {
  const navigate = useNavigate();
  const { user, profile, signIn, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If already logged in as worker, redirect
  useEffect(() => {
    if (!authLoading && user && profile) {
      if (profile.role === "worker") {
        navigate("/worker", { replace: true });
      } else if (profile.role === "admin" || profile.role === "superadmin") {
        navigate("/admin", { replace: true });
      }
    }
  }, [user, profile, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");

    let { error: signInErr } = await signIn(email, password);

    // If account doesn't exist yet and it's the official worker demo account, initialize it automatically
    if (signInErr && email.toLowerCase() === "worker@rewa.gov.in") {
      const { data: upData, error: upErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: "Er. S. K. Verma" } },
      });
      if (!upErr && upData.user) {
        await supabase
          .from("profiles")
          .update({ role: "worker", full_name: "Er. S. K. Verma" })
          .eq("id", upData.user.id);
        await supabase
          .from("department_workers")
          .update({ user_id: upData.user.id, email: "worker@rewa.gov.in" })
          .ilike("name", "%Verma%");
        const retry = await signIn(email, password);
        signInErr = retry.error;
      }
    }

    if (signInErr) {
      setLoading(false);
      setError(signInErr);
      return;
    }

    // Check role from DB
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        let { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", currentUser.id)
          .single();

        // If email belongs to worker domain or worker demo, ensure role is worker
        if (currentUser.email === "worker@rewa.gov.in" && prof?.role !== "worker") {
          await supabase.from("profiles").update({ role: "worker" }).eq("id", currentUser.id);
          prof = { role: "worker" };
        }

        if (prof?.role === "worker") {
          navigate("/worker", { replace: true });
          return;
        } else if (prof?.role === "admin" || prof?.role === "superadmin") {
          navigate("/admin", { replace: true });
          return;
        } else {
          // Citizen or unrecognized — sign them out and show error
          await supabase.auth.signOut();
          setError("Access denied. This portal is for department workers only. Citizens should use the main portal.");
        }
      }
    } catch {
      setError("Unable to verify your access. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(135deg, #061a30 0%, #0b3a6d 50%, #1d4ed8 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem 1rem",
    }}>
      {/* Back to citizen portal */}
      <div style={{ width: "100%", maxWidth: 420, marginBottom: "1rem" }}>
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "rgba(255,255,255,0.7)",
            fontSize: "0.82rem",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={14} />
          Back to Citizen Portal
        </Link>
      </div>

      <div style={{
        background: "rgba(255,255,255,0.98)",
        borderRadius: 20,
        padding: "2rem 1.75rem",
        width: "100%",
        maxWidth: 420,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <AshokaEmblem size={44} />
            <div style={{
              width: 44,
              height: 44,
              background: "linear-gradient(135deg, #0b3a6d, #1d4ed8)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <HardHat size={22} color="#fff" />
            </div>
          </div>

          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 20,
            padding: "0.25rem 0.75rem",
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "#1e40af",
            marginBottom: "0.6rem",
          }}>
            <span>🏛️</span>
            <span>Rewa Municipal Corporation</span>
          </div>

          <h1 style={{ fontSize: "1.35rem", fontWeight: 900, color: "#0b3a6d", marginBottom: "0.25rem" }}>
            Field Worker Portal
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.82rem" }}>
            Department workers — sign in to view your assignments
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 10,
            padding: "0.75rem 1rem",
            marginBottom: "1.25rem",
            color: "#dc2626",
            fontSize: "0.84rem",
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "0.4rem" }}>
              <Mail size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
              Email Address
            </label>
            <input
              id="worker-email"
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="worker@rewa.gov.in"
              autoComplete="username"
              required
              style={{ fontSize: "1rem" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "0.4rem" }}>
              <Lock size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="worker-password"
                type={showPwd ? "text" : "password"}
                className="form-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                style={{ paddingRight: "2.75rem", fontSize: "1rem" }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                }}
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            id="worker-login-btn"
            type="submit"
            disabled={loading}
            style={{
              background: loading ? "#93c5fd" : "linear-gradient(135deg, #0b3a6d, #1d4ed8)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "0.9rem 1.5rem",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              width: "100%",
              marginTop: "0.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s",
            }}
          >
            {loading ? (
              <>
                <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Signing in...
              </>
            ) : (
              <>
                <HardHat size={18} />
                Sign In to Worker Portal
              </>
            )}
          </button>
        </form>

        {/* Quick Fill Demo Worker Credentials */}
        <div style={{
          marginTop: "1.25rem",
          padding: "0.85rem",
          background: "#fef3c7",
          borderRadius: 10,
          border: "1px solid #f59e0b",
          textAlign: "left",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
            <span style={{ fontWeight: 800, color: "#92400e", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <HardHat size={14} /> Demo Field Worker Access
            </span>
            <button
              type="button"
              onClick={() => {
                setEmail("worker@rewa.gov.in");
                setPassword("Worker@Rewa2026!");
                setError("");
              }}
              style={{
                background: "#b45309",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: "0.72rem",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Quick Fill
            </button>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#b45309" }}>
            <div>Worker: <strong>Er. S. K. Verma (PWD)</strong></div>
            <div>Email: <code style={{ color: "#78350f" }}>worker@rewa.gov.in</code></div>
            <div>Password: <code style={{ color: "#78350f" }}>Worker@Rewa2026!</code></div>
          </div>
        </div>

        {/* Info box */}
        <div style={{
          marginTop: "0.85rem",
          padding: "0.85rem",
          background: "#f8fafc",
          borderRadius: 10,
          border: "1px solid #e2e8f0",
          fontSize: "0.78rem",
          color: "#64748b",
        }}>
          <div style={{ fontWeight: 700, color: "#0b3a6d", marginBottom: "0.35rem" }}>
            ℹ️ Worker Access
          </div>
          <div>Worker accounts are created by the municipal administrator. Once assigned, complaints appear instantly in your dashboard.</div>
        </div>

        {/* Footer links */}
        <div style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.78rem", color: "#94a3b8" }}>
          Not a worker?{" "}
          <Link to="/login" style={{ color: "#0b3a6d", fontWeight: 600 }}>
            Citizen / Admin Login
          </Link>
        </div>
      </div>

      {/* CSS for spinner */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
