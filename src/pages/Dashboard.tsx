import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import { checkAndUpdateStreak, buildModuleProgress, calcLevel, levelBounds } from "../services/userServices";
import type { ModuleProgress } from "../services/userServices";
import { LANGUAGES } from "../data/arcadeQuestions";


const NAV_LINKS = ["Learn", "Arcade", "Battle", "Leaderboard"];

// DAILY_QUESTS is now dynamic — built from userData below

const CHALLENGES = [
  { icon: "🔤", title: "Code Unscramble", diff: "Easy", diffColor: "#34d399", tag: "Puzzle", tagColor: "#22d3ee", xp: 50, tries: "Tokens", route: "/puzzle" },
  { icon: "📦", title: "Array Sorter", diff: "Medium", diffColor: "#fbbf24", tag: "Puzzle", tagColor: "#818cf8", xp: 50, tries: "Drag & Drop", route: "/puzzle" },
  { icon: "⚔️", title: "Code Duel Arena", diff: "Live", diffColor: "#fb7185", tag: "Battle", tagColor: "#fb7185", xp: 300, tries: "Coming Soon", route: "/battle" },
];

interface UserData {
  username: string;
  xp: number;
  level: number;
  streak: number;
  battlesWon: number;
  puzzlesSolved: number;
  rank: number;
  activity: { icon: string; text: string; xp: string; time: string; color: string }[];
}

interface LeaderboardUser {
  uid: string;
  username: string;
  xp: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [mousePos, setMousePos] = useState({ x: -200, y: -200 });
  const [activeNav, setActiveNav] = useState("Learn");
  const [xpAnimated, setXpAnimated] = useState(0);
  const [moduleProgress, setModuleProgress] = useState<Record<string, ModuleProgress>>({});
  const [streakToast, setStreakToast] = useState<{ show: boolean; streak: number; bonusXP: number }>({ show: false, streak: 0, bonusXP: 0 });

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { navigate("/login"); return; }
      try {
        // ── 1. Check & update streak on login ──
        const { streak, isNewDay, bonusXP } = await checkAndUpdateStreak(user.uid);

        // ── 2. Fetch full user data ──
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserData;
          // Use fresh XP from streak update
          const latestXP = data.xp;
          const latestLevel = calcLevel(data.xp ?? 0);
          setUserData({ ...data, streak });

          // ── 3. Build module progress from topicsDone ──
          const topicsDone: string[] = data.topicsDone ?? [];
          const progress = data.moduleProgress ?? buildModuleProgress(topicsDone);
          setModuleProgress(progress);

          // ── 4. Animate XP bar ──
          const xpForCurrentLevel = latestLevel > 1 ? Math.pow(latestLevel - 1, 2) * 50 : 0;
          const xpForNextLevel = Math.pow(latestLevel, 2) * 50;
          const pct = xpForNextLevel > xpForCurrentLevel
            ? ((latestXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100
            : 0;
          const target = Math.min(Math.max(pct, 0), 100);
          let current = 0;
          const step = () => {
            current += 1.5;
            if (current < target) { setXpAnimated(Math.floor(current)); requestAnimationFrame(step); }
            else setXpAnimated(Math.floor(target));
          };
          setTimeout(() => requestAnimationFrame(step), 400);

          // ── 5. Show streak toast ──
          if (isNewDay && streak > 0) {
            // Small delay so page loads first, then toast slides in
            setTimeout(() => {
              setStreakToast({ show: true, streak, bonusXP });
              setTimeout(() => setStreakToast(s => ({ ...s, show: false })), 5000);
            }, 800);
          }
        }

        // ── 6. Leaderboard ──
        const q = query(collection(db, "users"), orderBy("xp", "desc"), limit(5));
        const snapshot = await getDocs(q);
        const lb: LeaderboardUser[] = [];
        snapshot.forEach((d) => lb.push({ uid: d.id, ...d.data() } as LeaderboardUser));
        setLeaderboard(lb);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  // ── NAV HANDLER ──
  const handleNav = (link: string) => {
    setActiveNav(link);
    if (link === "Arcade") navigate("/arcade");
    if (link === "Battle") navigate("/battle");
    if (link === "Leaderboard") navigate("/leaderboard");
  };

  const handleLogout = async () => { await signOut(auth); navigate("/"); };

  const username = userData?.username || auth.currentUser?.displayName || "Player";
  const xp = userData?.xp ?? 0;
  const level = userData?.level ?? 1;

  // ── Dynamic Daily Quests — real values from userData ──
  const dailyQuests = useMemo(() => {
    const puzzlesSolved = userData?.puzzlesSolved ?? 0;
    const streak = userData?.streak ?? 0;
    const battlesWon = userData?.battlesWon ?? 0;
    return [
      {
        icon: "🧩",
        title: "Solve 3 Puzzles",
        xp: 150,
        done: Math.min(puzzlesSolved, 3),
        total: 3,
        color: "#22d3ee",
      },
      {
        icon: "🔥",
        title: "Maintain Streak",
        xp: 100,
        done: streak > 0 ? 1 : 0,
        total: 1,
        color: "#fbbf24",
      },
      {
        icon: "⚔️",
        title: "Win a Battle",
        xp: 200,
        done: Math.min(battlesWon, 1),
        total: 1,
        color: "#fb7185",
      },
    ];
  }, [userData]);
  const xpForNext = level * 1000;
  const xpNeeded = xpForNext - xp;
  const rankBadges = ["👑", "🥈", "🥉"];
  const rankColors = ["#fbbf24", "#cbd5e1", "#b4783c"];
  const currentUserRank = leaderboard.findIndex((u) => u.uid === auth.currentUser?.uid) + 1;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#04050a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "1.5rem", background: "linear-gradient(90deg,#22d3ee,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>WW</div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em" }}>LOADING YOUR ARENA...</div>
        <div style={{ width: 120, height: 3, background: "#141828", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", background: "linear-gradient(90deg,#22d3ee,#818cf8)", borderRadius: 999, animation: "load 1.2s ease-in-out infinite" }} />
        </div>
        <style>{`@keyframes load { 0%{width:0%} 50%{width:100%} 100%{width:0%;margin-left:100%} } * { cursor: none !important; }`}</style>
      </div>
    );
  }

  return (
    <div
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      style={{ minHeight: "100vh", background: "#04050a", fontFamily: "'DM Sans', sans-serif", color: "#f1f5f9" }}
    >
      <div style={{ position: "fixed", zIndex: 9999, pointerEvents: "none", left: mousePos.x, top: mousePos.y, width: 10, height: 10, borderRadius: "50%", background: "rgba(255,255,255,0.9)", transform: "translate(-50%,-50%)", mixBlendMode: "difference" }} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)", backgroundSize: "48px 48px", zIndex: 0 }} />
      <div style={{ position: "fixed", top: "5%", left: "20%", width: 500, height: 500, borderRadius: "50%", background: "#22d3ee", opacity: 0.04, filter: "blur(100px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "10%", right: "15%", width: 400, height: 400, borderRadius: "50%", background: "#818cf8", opacity: 0.05, filter: "blur(100px)", pointerEvents: "none", zIndex: 0 }} />

      {/* ── STREAK TOAST ── */}
      <div style={{
        position: "fixed", top: 20, right: 20, zIndex: 99999,
        transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        transform: streakToast.show ? "translateX(0) scale(1)" : "translateX(120%) scale(0.9)",
        opacity: streakToast.show ? 1 : 0,
        pointerEvents: streakToast.show ? "auto" : "none",
      }}>
        <div style={{
          background: "rgba(10,12,20,0.95)",
          border: "1px solid rgba(251,191,36,0.4)",
          borderRadius: 18, padding: "16px 22px",
          display: "flex", alignItems: "center", gap: 14,
          backdropFilter: "blur(24px)",
          boxShadow: "0 8px 48px rgba(251,191,36,0.18), 0 2px 8px rgba(0,0,0,0.5)",
          minWidth: 270,
        }}>
          {/* Flame icon with glow */}
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: "rgba(251,191,36,0.12)",
            border: "1px solid rgba(251,191,36,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24,
          }}>🔥</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, color: "#fbbf24", marginBottom: 3 }}>
              {streakToast.streak > 1 ? `${streakToast.streak} Day Streak!` : `Welcome Back!`}
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>
              +{streakToast.bonusXP} XP login bonus earned
            </div>
            {/* Mini XP bar */}
            <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 999, height: 3, overflow: "hidden" }}>
              <div style={{
                width: streakToast.show ? "100%" : "0%",
                height: "100%", background: "#fbbf24", borderRadius: 999,
                transition: "width 5s linear",
              }} />
            </div>
          </div>
          {/* Close button */}
          <button
            onClick={() => setStreakToast(s => ({ ...s, show: false }))}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1, alignSelf: "flex-start" }}
          >✕</button>
        </div>
      </div>

      {/* TOP NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(4,5,10,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", height: 60, display: "flex", alignItems: "center", gap: 24 }}>
          <span onClick={() => navigate("/")} style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "1.1rem", background: "linear-gradient(90deg,#22d3ee,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", cursor: "none", flexShrink: 0 }}>WW</span>
          <div style={{ display: "flex", gap: 4, flex: 1 }}>
            {NAV_LINKS.map((link) => (
              <button key={link} onClick={() => handleNav(link)} style={{ padding: "6px 14px", border: "none", borderBottom: activeNav === link ? "2px solid #22d3ee" : "2px solid transparent", borderRadius: "8px 8px 0 0", background: activeNav === link ? "rgba(34,211,238,0.1)" : "transparent", color: activeNav === link ? "#22d3ee" : "rgba(241,245,249,0.45)", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: "0.82rem", cursor: "none", transition: "all 0.2s" }}>{link}</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 999, fontFamily: "'DM Mono',monospace", fontSize: "0.68rem", color: "#fbbf24", flexShrink: 0 }}>⚡ {xp.toLocaleString()} XP</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#818cf8,#c084fc)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 800, fontFamily: "'Syne',sans-serif", color: "#04050a", border: "2px solid rgba(192,132,252,0.4)" }}>{username[0]?.toUpperCase()}</div>
            <button onClick={handleLogout} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(241,245,249,0.4)", fontSize: "0.75rem", cursor: "none", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(251,113,133,0.4)"; (e.currentTarget as HTMLButtonElement).style.color = "#fb7185"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(241,245,249,0.4)"; }}>Logout</button>
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 64px", position: "relative", zIndex: 1 }}>

        {/* Welcome */}
        <div style={{ marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.65rem", color: "#22d3ee", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 6 }}>Welcome back</p>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(1.6rem,3vw,2.2rem)", letterSpacing: "-0.02em", color: "#f1f5f9", margin: 0 }}>Hey, {username} 👋</h1>
            <p style={{ color: "rgba(241,245,249,0.4)", fontSize: "0.875rem", marginTop: 4 }}>You're {xpNeeded.toLocaleString()} XP away from Level {level + 1}. Keep going!</p>
          </div>
          <button
            onClick={() => navigate("/arcade")}
            style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#22d3ee,#818cf8)", color: "#04050a", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "none", boxShadow: "0 0 24px rgba(34,211,238,0.2)", transition: "transform 0.2s, box-shadow 0.2s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 32px rgba(34,211,238,0.35)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "none"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 24px rgba(34,211,238,0.2)"; }}
          >⚡ Start Challenge</button>
        </div>

        {/* STAT CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 24 }}>

        {/* ── HOW TO PLAY BANNER ── */}
        <div
          onClick={() => navigate("/puzzle")}
          style={{
            gridColumn: "1 / -1",
            background: "linear-gradient(135deg, rgba(129,140,248,0.08) 0%, rgba(34,211,238,0.06) 100%)",
            border: "1px solid rgba(129,140,248,0.25)",
            borderRadius: 16, padding: "18px 24px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            cursor: "none", transition: "all 0.25s",
            position: "relative", overflow: "hidden",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(129,140,248,0.5)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(129,140,248,0.25)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
        >
          <div style={{ position: "absolute", top: 0, right: 0, width: 200, height: "100%", background: "radial-gradient(circle at 80% 50%, rgba(129,140,248,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🎮</div>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "white", marginBottom: 3 }}>New here? Learn how to play!</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.65rem", color: "rgba(255,255,255,0.35)" }}>Code Unscramble & Array Sorter — step-by-step demo available on Puzzle page</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.65rem", color: "#818cf8", background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.2)", padding: "4px 12px", borderRadius: 999 }}>▶ Demo</span>
            <span style={{ color: "#818cf8", fontSize: 18 }}>→</span>
          </div>
        </div>

          {[
            { icon: "⚡", label: "Total XP", value: xp.toLocaleString(), color: "#fbbf24" },
            { icon: "📊", label: "Level", value: String(level), color: "#22d3ee" },
            { icon: "🔥", label: "Day Streak", value: String(userData?.streak ?? 0), color: "#fb7185" },
            { icon: "⚔️", label: "Battles Won", value: String(userData?.battlesWon ?? 0), color: "#818cf8" },
            { icon: "🧩", label: "Puzzles Solved", value: String(userData?.puzzlesSolved ?? 0), color: "#34d399" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#0e1220", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "20px", position: "relative", overflow: "hidden", transition: "border-color 0.2s, transform 0.2s" }} onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${s.color},transparent)` }} />
              <div style={{ fontSize: "1.4rem", marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "1.8rem", color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.62rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* XP BAR + DAILY QUESTS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          <div style={{ background: "#0e1220", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.95rem" }}>Level Progress</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.65rem", color: "#fbbf24" }}>Lv. {level} → {level + 1}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: "0.78rem", color: "rgba(241,245,249,0.4)" }}>{xp.toLocaleString()} XP</span>
              <span style={{ fontSize: "0.78rem", color: "rgba(241,245,249,0.4)" }}>{xpForNext.toLocaleString()} XP</span>
            </div>
            <div style={{ height: 10, background: "#141828", borderRadius: 999, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ height: "100%", width: `${xpAnimated}%`, background: "linear-gradient(90deg,#d97706,#fbbf24,#fde68a)", borderRadius: 999, boxShadow: "0 0 12px rgba(251,191,36,0.5)", transition: "width 0.1s" }} />
            </div>
            <div style={{ marginTop: 10, fontSize: "0.75rem", color: "rgba(241,245,249,0.35)", fontFamily: "'DM Mono',monospace" }}>{xpNeeded.toLocaleString()} XP until next level</div>
            <div style={{ marginTop: 20, padding: "14px 16px", background: "#141828", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "linear-gradient(135deg,#818cf8,#c084fc)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", fontWeight: 800, fontFamily: "'Syne',sans-serif", color: "#04050a", border: "2px solid rgba(192,132,252,0.3)", flexShrink: 0 }}>{username[0]?.toUpperCase()}</div>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.9rem" }}>{username}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.62rem", color: "#fbbf24", letterSpacing: "0.08em" }}>⚡ Level {level} · #{currentUserRank > 0 ? currentUserRank : "—"} Global</div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <span style={{ padding: "3px 8px", borderRadius: 999, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", fontFamily: "'DM Mono',monospace", fontSize: "0.58rem", color: "#fbbf24" }}>⚡ {xp.toLocaleString()} XP</span>
              </div>
            </div>
          </div>

          <div style={{ background: "#0e1220", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.95rem" }}>Daily Quests</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.62rem", color: "#22d3ee", padding: "3px 8px", background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", borderRadius: 999 }}>⌛ Resets 18h</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {dailyQuests.map((q) => {
                const completed = q.done >= q.total;
                const pct = Math.min((q.done / q.total) * 100, 100);
                return (
                  <div key={q.title} style={{
                    background: completed ? `${q.color}08` : "transparent",
                    border: `1px solid ${completed ? q.color + "30" : "transparent"}`,
                    borderRadius: 12,
                    padding: completed ? "10px 12px" : "0",
                    transition: "all 0.3s ease",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "1.1rem" }}>{q.icon}</span>
                        <span style={{
                          fontSize: "0.82rem", fontWeight: 600,
                          color: completed ? q.color : "white",
                        }}>{q.title}</span>
                        {completed && (
                          <span style={{
                            fontSize: "0.6rem", fontFamily: "'DM Mono',monospace",
                            color: q.color, background: `${q.color}15`,
                            border: `1px solid ${q.color}30`,
                            padding: "1px 6px", borderRadius: 999,
                          }}>DONE ✓</span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.62rem", color: "#fbbf24" }}>+{q.xp} XP</span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.62rem", color: "rgba(255,255,255,0.3)" }}>{q.done}/{q.total}</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: "#141828", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: completed ? "#34d399" : q.color,
                        borderRadius: 999,
                        boxShadow: completed ? `0 0 10px #34d39966` : `0 0 8px ${q.color}55`,
                        transition: "width 0.6s ease",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CHALLENGES + LEADERBOARD + ACTIVITY */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 20 }}>

          {/* Challenges */}
          <div style={{ background: "#0e1220", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.95rem" }}>Featured Challenges</span>
              <span onClick={() => navigate("/arcade")} style={{ fontSize: "0.75rem", color: "#22d3ee", cursor: "none", fontFamily: "'DM Mono',monospace" }}>View all →</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {CHALLENGES.map((c) => (
                <div key={c.title}
                  onClick={() => navigate(c.route)}
                  style={{ padding: "14px 16px", background: "#141828", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 14, cursor: "none", transition: "border-color 0.2s, transform 0.2s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLDivElement).style.transform = "translateX(4px)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "#0e1220", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>{c.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 4 }}>{c.title}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ padding: "2px 7px", borderRadius: 999, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", fontFamily: "'DM Mono',monospace", fontSize: "0.58rem", color: c.tagColor }}>{c.tag}</span>
                      <span style={{ padding: "2px 7px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "'DM Mono',monospace", fontSize: "0.58rem", color: c.diffColor }}>{c.diff}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.68rem", color: "#fbbf24" }}>+{c.xp} XP</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.58rem", color: "rgba(255,255,255,0.25)", marginTop: 2 }}>{c.tries}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div style={{ background: "#0e1220", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.95rem" }}>Leaderboard</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.62rem", color: "rgba(255,255,255,0.3)" }}>All time</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {leaderboard.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(255,255,255,0.25)", fontSize: "0.8rem", fontFamily: "'DM Mono',monospace" }}>No players yet 👾<br />Be the first!</div>
              ) : (
                leaderboard.map((p, i) => {
                  const isMe = p.uid === auth.currentUser?.uid;
                  return (
                    <div key={p.uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: isMe ? "rgba(34,211,238,0.05)" : i < 3 ? `rgba(${i === 0 ? "251,191,36" : i === 1 ? "203,213,225" : "180,120,60"},0.05)` : "transparent", border: `1px solid ${isMe ? "rgba(34,211,238,0.25)" : i < 3 ? `rgba(${i === 0 ? "251,191,36" : i === 1 ? "203,213,225" : "180,120,60"},0.2)` : "rgba(255,255,255,0.04)"}` }}>
                      <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "0.9rem", width: 22, color: i < 3 ? rankColors[i] : "rgba(255,255,255,0.3)", textAlign: "center", flexShrink: 0 }}>{i < 3 ? rankBadges[i] : i + 1}</span>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: isMe ? "linear-gradient(135deg,#818cf8,#c084fc)" : "linear-gradient(135deg,#141828,#1c2235)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, color: isMe ? "#04050a" : "rgba(255,255,255,0.6)", flexShrink: 0 }}>{p.username[0]?.toUpperCase()}</div>
                      <span style={{ flex: 1, fontSize: "0.8rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: isMe ? "#22d3ee" : "#f1f5f9" }}>{p.username} {isMe && "(you)"}</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.62rem", color: "#fbbf24", flexShrink: 0 }}>⚡{p.xp.toLocaleString()}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{ background: "#0e1220", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.95rem" }}>Recent Activity</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.62rem", color: "rgba(255,255,255,0.3)" }}>Last 7 days</span>
            </div>
            {!userData?.activity || userData.activity.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.25)" }}>
                <div style={{ fontSize: "2rem", marginBottom: 12 }}>🎮</div>
                <div style={{ fontSize: "0.8rem", fontFamily: "'DM Mono',monospace", lineHeight: 1.6 }}>No activity yet.<br />Start your first challenge!</div>
                <button onClick={() => navigate("/arcade")} style={{ marginTop: 16, padding: "8px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#22d3ee,#818cf8)", color: "#04050a", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "none" }}>Start Now →</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {userData.activity.slice(0, 5).map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, paddingBottom: 16, position: "relative" }}>
                    {i < userData.activity.slice(0, 5).length - 1 && <div style={{ position: "absolute", left: 15, top: 28, bottom: 0, width: 1, background: "rgba(255,255,255,0.06)" }} />}
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", flexShrink: 0, zIndex: 1 }}>{a.icon}</div>
                    <div style={{ flex: 1, paddingTop: 4 }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 500, marginBottom: 2 }}>{a.text}</div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.6rem", color: "#fbbf24" }}>{a.xp}</span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.25)" }}>{a.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      {/* ── MODULE PROGRESS ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 64px", position: "relative", zIndex: 1 }}>
        <div style={{ background: "rgba(14,18,32,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "28px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#818cf8", letterSpacing: "0.15em", marginBottom: 4 }}>LEARNING PROGRESS</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: "white" }}>Module Completion</div>
            </div>
            <button
              onClick={() => navigate("/arcade")}
              style={{ padding: "8px 18px", borderRadius: 10, border: "1px solid rgba(34,211,238,0.3)", background: "rgba(34,211,238,0.08)", color: "#22d3ee", fontFamily: "'DM Mono', monospace", fontSize: 12, cursor: "pointer" }}
            >
              Continue Learning →
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {LANGUAGES.map((lang) => {
              const mp = moduleProgress[lang.id];
              const pct = mp?.percent ?? 0;
              const done = mp?.completed ?? 0;
              const total = mp?.total ?? lang.topics.length;
              return (
                <button
                  key={lang.id}
                  onClick={() => navigate("/arcade")}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = lang.color; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
                  style={{
                    textAlign: "left", background: "#0a0d18",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 14, padding: "16px 18px",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 20 }}>{lang.icon}</span>
                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: "white" }}>{lang.name}</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 999, height: 5, marginBottom: 6, overflow: "hidden" }}>
                    <div style={{
                      width: `${pct}%`, height: "100%",
                      background: pct === 100 ? "#34d399" : lang.color,
                      borderRadius: 999, transition: "width 0.6s ease",
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                      {done}/{total} topics
                    </span>
                    <span style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 10,
                      color: pct === 100 ? "#34d399" : lang.color,
                      fontWeight: 600,
                    }}>
                      {pct}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400&display=swap');
        * { cursor: none !important; }
        @media (max-width: 1024px) { main > div:last-child { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 768px) { main > div:last-child, main > div:nth-last-child(2) { grid-template-columns: 1fr !important; } nav { padding: 0 16px !important; } main { padding: 20px 16px 48px !important; } }
      `}</style>
    </div>
  );
}