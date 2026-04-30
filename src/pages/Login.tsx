import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/api";
import { jwtDecode } from "jwt-decode";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: -200, y: -200 });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const data = await loginUser({ email: form.email, password: form.password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (err: any) {
      setErrors({ password: err.message || "Invalid email or password. Try again!" });
    } finally {
      setLoading(false);
    }
  };

  const change = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: "" }));
  };

  return (
    <div
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      style={{ minHeight: "100vh", width: "100vw", background: "#04050a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" }}
    >
      <div style={{ position: "fixed", zIndex: 9999, pointerEvents: "none", left: mousePos.x, top: mousePos.y, width: 10, height: 10, borderRadius: "50%", background: "rgba(255,255,255,0.9)", transform: "translate(-50%,-50%)", mixBlendMode: "difference" }} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
      <div style={{ position: "fixed", top: "20%", right: "12%", width: 380, height: 380, borderRadius: "50%", background: "#818cf8", opacity: 0.06, filter: "blur(80px)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "15%", left: "8%", width: 320, height: 320, borderRadius: "50%", background: "#22d3ee", opacity: 0.05, filter: "blur(80px)", pointerEvents: "none" }} />

      {/* Decorative stats - desktop only */}
      <div className="login-side-panel" style={{ position: "fixed", left: "6%", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 14, zIndex: 1 }}>
        {[
          { icon: "🏆", label: "Top Solver", val: "#142", color: "#fbbf24" },
          { icon: "⚡", label: "Total XP", val: "4,820", color: "#22d3ee" },
          { icon: "🔥", label: "Day Streak", val: "7", color: "#fb7185" },
          { icon: "⚔️", label: "Battles Won", val: "12", color: "#818cf8" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#0e1220", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, minWidth: 160 }}>
            <span style={{ fontSize: "1.3rem" }}>{s.icon}</span>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "1rem", color: s.color }}>{s.val}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 420, margin: "24px 16px", background: "#0e1220", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "40px 36px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        <div onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32, cursor: "none" }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.2rem", background: "linear-gradient(90deg,#22d3ee,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>WW</span>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.8rem" }}>/ Welcome Back</span>
        </div>

        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.7rem", letterSpacing: "-0.02em", color: "#f1f5f9", marginBottom: 6 }}>Back in the Game</h1>
        <p style={{ color: "rgba(241,245,249,0.4)", fontSize: "0.85rem", marginBottom: 28 }}>Your streak is waiting. Don't break it.</p>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 28, background: "rgba(251,113,133,0.07)", border: "1px solid rgba(251,113,133,0.2)", borderRadius: 10 }}>
          <span style={{ fontSize: "1.1rem" }}>🔥</span>
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#fb7185" }}>7-day streak active</div>
            <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>Login to keep it alive</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Email */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "rgba(241,245,249,0.6)", marginBottom: 6, letterSpacing: "0.04em" }}>EMAIL</label>
            <input
              type="email" value={form.email} onChange={change("email")} placeholder="you@example.com"
              style={{ width: "100%", padding: "11px 14px", background: "#141828", border: `1px solid ${errors.email ? "rgba(251,113,133,0.6)" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, outline: "none", color: "#f1f5f9", fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s" }}
              onFocus={(e) => { e.target.style.borderColor = errors.email ? "rgba(251,113,133,0.6)" : "rgba(34,211,238,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(34,211,238,0.1)"; }}
              onBlur={(e) => { e.target.style.borderColor = errors.email ? "rgba(251,113,133,0.6)" : "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
            />
            {errors.email && <p style={{ color: "#fb7185", fontSize: "0.72rem", marginTop: 5, fontFamily: "'DM Mono', monospace" }}>⚠ {errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(241,245,249,0.6)", letterSpacing: "0.04em" }}>PASSWORD</label>
              <span style={{ fontSize: "0.72rem", color: "#22d3ee", cursor: "none", fontFamily: "'DM Mono',monospace" }}>Forgot?</span>
            </div>
            <input
              type="password" value={form.password} onChange={change("password")} placeholder="••••••••"
              style={{ width: "100%", padding: "11px 14px", background: "#141828", border: `1px solid ${errors.password ? "rgba(251,113,133,0.6)" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, outline: "none", color: "#f1f5f9", fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s" }}
              onFocus={(e) => { e.target.style.borderColor = errors.password ? "rgba(251,113,133,0.6)" : "rgba(34,211,238,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(34,211,238,0.1)"; }}
              onBlur={(e) => { e.target.style.borderColor = errors.password ? "rgba(251,113,133,0.6)" : "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
            />
            {errors.password && <p style={{ color: "#fb7185", fontSize: "0.72rem", marginTop: 5, fontFamily: "'DM Mono', monospace" }}>⚠ {errors.password}</p>}
          </div>

          <button
            type="submit" disabled={loading}
            onMouseEnter={() => setHovered("submit")} onMouseLeave={() => setHovered(null)}
            style={{ marginTop: 6, padding: "13px 0", width: "100%", background: loading ? "rgba(34,211,238,0.3)" : "linear-gradient(135deg,#22d3ee,#818cf8)", border: "none", borderRadius: 10, color: "#04050a", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.82rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: loading ? "not-allowed" : "none", transform: hovered === "submit" && !loading ? "translateY(-2px)" : "none", boxShadow: hovered === "submit" && !loading ? "0 0 28px rgba(34,211,238,0.25)" : "none", transition: "transform 0.2s, box-shadow 0.2s" }}
          >
            {loading ? "Logging in..." : "⚡ Enter the Arena"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.72rem", fontFamily: "'DM Mono', monospace" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
        </div>

        <p style={{ textAlign: "center", fontSize: "0.82rem", color: "rgba(241,245,249,0.4)" }}>
          New to Wisdom Wave?{" "}
          <span onClick={() => navigate("/register")} style={{ color: "#22d3ee", fontWeight: 600, cursor: "none" }} onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")} onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}>Create Account →</span>
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400&display=swap');
        * { cursor: none !important; }
        input::placeholder { color: rgba(241,245,249,0.2); }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 30px #141828 inset !important; -webkit-text-fill-color: #f1f5f9 !important; }
        .login-side-panel { display: flex; }
        @media (max-width: 900px) { .login-side-panel { display: none !important; } }
      `}</style>
    </div>
  );
}