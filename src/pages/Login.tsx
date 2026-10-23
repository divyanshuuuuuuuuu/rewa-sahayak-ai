import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, User, Eye, EyeOff, Mail, Lock, UserPlus, KeyRound, LogOut } from "lucide-react";
import { AshokaEmblem, RewaMunicipalLogo } from "../components/Emblem";
import { useGov } from "../context/GovContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";

type LoginTab = "signin" | "signup";

export default function Login() {
  const navigate = useNavigate();
  const { bilingual } = useGov();
  const { user, profile, isAdmin, signIn, signUp, signOut } = useAuth();

  const [tab, setTab] = useState<LoginTab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }
    setLoading(true);
    setError("");

    const { error: err } = await signIn(email, password);
    setLoading(false);

    if (err) {
      setError(err);
      return;
    }

    // Check role and redirect accordingly
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", currentUser.id)
          .single();

        if (prof?.role === "admin" || prof?.role === "superadmin") {
          navigate("/admin");
          return;
        } else if (prof?.role === "worker") {
          navigate("/worker");
          return;
        }
      }
    } catch { /* proceed to home */ }

    navigate("/");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");

    const { error: err } = await signUp(email, password, fullName);
    setLoading(false);

    if (err) {
      setError(err);
      return;
    }

    setSuccessMsg(
      bilingual(
        "खाता सफलतापूर्वक बनाया गया! आप सीधे साइन इन कर सकते हैं।",
        "Account created successfully! You can now sign in."
      )
    );
    setTab("signin");
  };

  const fillAdminCredentials = () => {
    setEmail("admin@rewa.gov.in");
    setPassword("Admin@Rewa2026!");
    setError("");
  };

  return (
    <div className="login-page fade-in" style={{ padding: "2.5rem 1rem" }}>
      <div className="card login-card" style={{ textAlign: "center", maxWidth: 440, margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", alignItems: "center", marginBottom: "0.75rem" }}>
            <AshokaEmblem size={44} />
            <RewaMunicipalLogo size={44} />
          </div>
          <span className="gov-seal-badge" style={{ marginBottom: "0.5rem" }}>
            {bilingual("नगर पालिक निगम, रीवा", "Rewa Municipal Corporation")}
          </span>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 900, color: "#0b3a6d", marginBottom: "0.2rem" }}>
            {bilingual("ई-पोर्टल लॉगिन", "Civic Portal Login")}
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.82rem" }}>
            Rewa Sahayak AI — Citizen &amp; Officer Access
          </p>
        </div>

        {/* If user is already logged in, show current session banner */}
        {user && (
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "0.85rem", marginBottom: "1.25rem", textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e3a8a" }}>
                ✓ {bilingual("वर्तमान में लॉगिन हैं:", "Currently Logged In:")}
              </span>
              <span className="badge" style={{ background: isAdmin ? "#dbeafe" : "#f1f5f9", color: isAdmin ? "#1e40af" : "#475569" }}>
                {profile?.role?.toUpperCase() || "CITIZEN"}
              </span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "#1e293b", fontWeight: 600 }}>
              {profile?.full_name || user.email}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "0.75rem" }}>
              {user.email}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {profile?.role === "worker" ? (
                <button
                  type="button"
                  onClick={() => navigate("/worker")}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, justifyContent: "center", background: "#f59e0b", color: "#000", fontWeight: 700 }}
                >
                  👷 {bilingual("वर्कर डैशबोर्ड खोलें", "Open Worker Dashboard")}
                </button>
              ) : isAdmin ? (
                <button
                  type="button"
                  onClick={() => navigate("/admin")}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, justifyContent: "center", background: "#0b3a6d" }}
                >
                  <Shield size={14} /> {bilingual("एडमिन डैशबोर्ड खोलें", "Open Admin Dashboard")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  {bilingual("पोर्टल होम", "Go to Portal")}
                </button>
              )}
              <button
                type="button"
                onClick={() => signOut()}
                className="btn btn-secondary btn-sm"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: "1.5rem" }}>
          <button
            type="button"
            className={`tab ${tab === "signin" ? "active" : ""}`}
            onClick={() => {
              setTab("signin");
              setError("");
              setSuccessMsg("");
            }}
          >
            <User size={14} /> {bilingual("साइन इन", "Sign In")}
          </button>
          <button
            type="button"
            className={`tab ${tab === "signup" ? "active" : ""}`}
            onClick={() => {
              setTab("signup");
              setError("");
              setSuccessMsg("");
            }}
          >
            <UserPlus size={14} /> {bilingual("नागरिक पंजीकरण", "Register")}
          </button>
        </div>

        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              color: "#dc2626",
              fontSize: "0.85rem",
              textAlign: "left",
            }}
          >
            ⚠️ {error}
          </div>
        )}
        {successMsg && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 8,
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              color: "#15803d",
              fontSize: "0.85rem",
              textAlign: "left",
            }}
          >
            ✅ {successMsg}
          </div>
        )}

        {tab === "signin" ? (
          <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: "0.85rem", textAlign: "left" }}>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "0.35rem" }}>
                <Mail size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
                {bilingual("ईमेल पता", "Email Address")}
              </label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "0.35rem" }}>
                <Lock size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
                {bilingual("पासवर्ड", "Password")}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="form-input"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ paddingRight: "2.5rem" }}
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
                  }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", background: "#0b3a6d", marginTop: "0.25rem" }}
            >
              {loading ? bilingual("साइन इन हो रहा है...", "Signing in...") : bilingual("साइन इन करें", "Sign In")}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: "0.85rem", textAlign: "left" }}>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "0.35rem" }}>
                {bilingual("पूरा नाम", "Full Name")}
              </label>
              <input
                className="form-input"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder={bilingual("आपका पूरा नाम", "Your full name")}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "0.35rem" }}>
                <Mail size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
                {bilingual("ईमेल पता", "Email Address")}
              </label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "0.35rem" }}>
                <Lock size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
                {bilingual("पासवर्ड (न्यूनतम 6 अक्षर)", "Password (min 6 chars)")}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="form-input"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ paddingRight: "2.5rem" }}
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
                  }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", background: "#0b3a6d", marginTop: "0.25rem" }}
            >
              {loading ? bilingual("खाता बन रहा है...", "Creating account...") : bilingual("खाता बनाएं", "Create Account")}
            </button>
          </form>
        )}

        {/* Demo Officer One-Click Quick Fill Helper */}
        <div
          style={{
            marginTop: "1.25rem",
            padding: "0.85rem",
            background: "#f8fafc",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "#0b3a6d", fontWeight: 700, fontSize: "0.8rem" }}>
              <KeyRound size={13} /> {bilingual("अधिकारी लॉगिन क्रेडेंशियल्स", "Municipal Officer Access")}
            </span>
            <button
              type="button"
              onClick={fillAdminCredentials}
              style={{
                background: "#0b3a6d",
                color: "#ffffff",
                border: "none",
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: "0.72rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {bilingual("ऑटो भरें", "Quick Fill")}
            </button>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
            <div>Email: <code style={{ color: "#0f172a" }}>admin@rewa.gov.in</code></div>
            <div>Password: <code style={{ color: "#0f172a" }}>Admin@Rewa2026!</code></div>
          </div>
        </div>

        {/* Dedicated Department Worker Access */}
        <div
          style={{
            marginTop: "0.85rem",
            padding: "0.85rem",
            background: "linear-gradient(135deg, #fef3c7, #fed7aa)",
            borderRadius: 8,
            border: "1px solid #f59e0b",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.82rem", color: "#92400e", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                👷 {bilingual("विभागीय फील्ड कर्मी पोर्टल", "Field Worker Portal")}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#b45309", marginTop: "0.15rem" }}>
                {bilingual("कार्य आदेश, स्टेटस व समाधान फोटो अपलोड", "Task orders, status & completion upload")}
              </div>
            </div>
            <Link
              to="/worker-login"
              className="btn btn-secondary btn-sm"
              style={{ background: "#b45309", color: "#fff", border: "none", fontWeight: 700, padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
            >
              {bilingual("वर्कर लॉगिन →", "Worker Login →")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
