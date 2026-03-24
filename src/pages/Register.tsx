import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: -200, y: -200 });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.username.trim()) e.username = "Username is required";
    else if (form.username.length < 3) e.username = "Min 3 characters";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Min 8 characters";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: form.username });

      // Save user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username: form.username,
        email: form.email,
        xp: 100,
        level: 1,
        streak: 0,
        battlesWon: 0,
        puzzlesSolved: 0,
        rank: 999,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        activity: [],
      });

      navigate("/login");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setErrors({ email: "Email already registered. Try logging in!" });
      } else if (err.code === "auth/weak-password") {
        setErrors({ password: "Password too weak. Use min 8 characters." });
      } else {
        setErrors({ email: "Something went wrong. Try again!" });
      }
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
      <div style={{ position: "fixed", top: "10%", left: "15%", width: 400, height: 400, borderRadius: "50%", background: "#22d3ee", opacity: 0.05, filter: "blur(80px)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "10%", right: "10%", width: 350, height: 350, borderRadius: "50%", background: "#818cf8", opacity: 0.06, filter: "blur(80px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440, margin: "24px 16px", background: "#0e1220", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "40px 36px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        <div onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32, cursor: "none" }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.2rem", background: "linear-gradient(90deg,#22d3ee,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>WW</span>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.8rem" }}>/ Create Account</span>
        </div>

        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.7rem", letterSpacing: "-0.02em", color: "#f1f5f9", marginBottom: 6 }}>Join the Arena</h1>
        <p style={{ color: "rgba(241,245,249,0.4)", fontSize: "0.85rem", marginBottom: 28 }}>Start your coding journey — free forever.</p>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", marginBottom: 28, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 999, fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", letterSpacing: "0.12em", color: "#fbbf24" }}>
          ⚡ +100 XP bonus on signup
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {[
            { field: "username", label: "USERNAME", type: "text", placeholder: "your_handle" },
            { field: "email", label: "EMAIL", type: "email", placeholder: "you@example.com" },
            { field: "password", label: "PASSWORD", type: "password", placeholder: "Min 8 characters" },
          ].map(({ field, label, type, placeholder }) => (
            <div key={field}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "rgba(241,245,249,0.6)", marginBottom: 6, letterSpacing: "0.04em" }}>{label}</label>
              <input
                type={type}
                value={form[field as keyof typeof form]}
                onChange={change(field)}
                placeholder={placeholder}
                style={{ width: "100%", padding: "11px 14px", background: "#141828", border: `1px solid ${errors[field] ? "rgba(251,113,133,0.6)" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, outline: "none", color: "#f1f5f9", fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s" }}
                onFocus={(e) => { e.target.style.borderColor = errors[field] ? "rgba(251,113,133,0.6)" : "rgba(34,211,238,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(34,211,238,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = errors[field] ? "rgba(251,113,133,0.6)" : "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
              />
              {errors[field] && <p style={{ color: "#fb7185", fontSize: "0.72rem", marginTop: 5, fontFamily: "'DM Mono', monospace" }}>⚠ {errors[field]}</p>}
            </div>
          ))}

          <button
            type="submit" disabled={loading}
            onMouseEnter={() => setHovered("submit")} onMouseLeave={() => setHovered(null)}
            style={{ marginTop: 6, padding: "13px 0", width: "100%", background: loading ? "rgba(34,211,238,0.3)" : "linear-gradient(135deg,#22d3ee,#818cf8)", border: "none", borderRadius: 10, color: "#04050a", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.82rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: loading ? "not-allowed" : "none", transform: hovered === "submit" && !loading ? "translateY(-2px)" : "none", boxShadow: hovered === "submit" && !loading ? "0 0 28px rgba(34,211,238,0.25)" : "none", transition: "transform 0.2s, box-shadow 0.2s" }}
          >
            {loading ? "Creating Account..." : "⚡ Create Account"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.72rem", fontFamily: "'DM Mono', monospace" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
        </div>

        <p style={{ textAlign: "center", fontSize: "0.82rem", color: "rgba(241,245,249,0.4)" }}>
          Already have an account?{" "}
          <span onClick={() => navigate("/login")} style={{ color: "#22d3ee", fontWeight: 600, cursor: "none" }} onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")} onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}>Login →</span>
        </p>
        <p style={{ textAlign: "center", fontSize: "0.68rem", color: "rgba(255,255,255,0.18)", marginTop: 16, fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>By continuing you agree to our Terms of Service &amp; Privacy Policy</p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400&display=swap');
        * { cursor: none !important; }
        input::placeholder { color: rgba(241,245,249,0.2); }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 30px #141828 inset !important; -webkit-text-fill-color: #f1f5f9 !important; }
      `}</style>
    </div>
  );
}