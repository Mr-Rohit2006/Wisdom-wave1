import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { calcLevel } from "../services/userServices";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');`;

interface LeaderboardUser {
  uid: string;
  username: string;
  xp: number;
  level: number;
  streak: number;
  puzzlesSolved: number;
  battlesWon: number;
  avatar?: string;
}

const LANG_COLORS = ["#22d3ee","#818cf8","#c084fc","#fb7185","#34d399","#fbbf24","#f97316","#06b6d4","#a78bfa","#4ade80"];
const RANK_COLORS: Record<number, { text: string; bg: string; glow: string; label: string }> = {
  1: { text: "#fbbf24", bg: "rgba(251,191,36,0.12)", glow: "rgba(251,191,36,0.3)", label: "🥇" },
  2: { text: "#94a3b8", bg: "rgba(148,163,184,0.1)", glow: "rgba(148,163,184,0.2)", label: "🥈" },
  3: { text: "#f97316", bg: "rgba(249,115,22,0.1)", glow: "rgba(249,115,22,0.2)", label: "🥉" },
};

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  return LANG_COLORS[Math.abs(hash) % LANG_COLORS.length];
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"xp" | "streak" | "puzzles">("xp");
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myData, setMyData] = useState<LeaderboardUser | null>(null);
  const [animIn, setAnimIn] = useState(false);

  const fetchLeaderboard = async () => {
    setLoading(true);
    const orderField = filter === "xp" ? "xp" : filter === "streak" ? "streak" : "puzzlesSolved";
    const q = query(collection(db, "users"), orderBy(orderField, "desc"), limit(50));
    const snap = await getDocs(q);
    const list: LeaderboardUser[] = [];
    snap.forEach(d => list.push({ uid: d.id, ...d.data() } as LeaderboardUser));
    setUsers(list);
    const rank = list.findIndex(u => u.uid === user?.uid);
    setMyRank(rank >= 0 ? rank + 1 : null);
    setMyData(list.find(u => u.uid === user?.uid) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    setTimeout(() => setAnimIn(true), 100);
  }, []);

  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  return (
    <div style={{ minHeight: "100vh", background: "#04050a", fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{FONTS}</style>
      <div style={{ position: "fixed", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, background: "radial-gradient(circle, rgba(251,191,36,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: 0, left: "10%", width: 400, height: 400, background: "radial-gradient(circle, rgba(129,140,248,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100, background: "rgba(4,5,10,0.8)" }}>
        <button onClick={() => navigate("/dashboard")}
          style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "'DM Mono', monospace", transition: "color 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "white")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}>
          ← Dashboard
        </button>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20 }}>
          <span style={{ color: "#22d3ee" }}>Wisdom</span><span style={{ color: "white" }}>Wave</span>
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#fbbf24" }}>🏆 Leaderboard</div>
      </nav>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 48, opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(20px)", transition: "all 0.6s ease" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#fbbf24", letterSpacing: "0.25em", marginBottom: 14 }}>GLOBAL RANKINGS</div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: "clamp(2.2rem,6vw,3.8rem)", color: "white", lineHeight: 1.05, marginBottom: 12 }}>
            Who's on <span style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", backgroundImage: "linear-gradient(90deg, #fbbf24, #fb7185)" }}>Top?</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 15 }}>Compete, earn XP, climb the ranks</p>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 40, opacity: animIn ? 1 : 0, transition: "all 0.6s ease 0.1s" }}>
          {([
            { key: "xp", label: "⚡ XP", color: "#fbbf24" },
            { key: "streak", label: "🔥 Streak", color: "#fb7185" },
            { key: "puzzles", label: "🧩 Puzzles", color: "#22d3ee" },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              style={{ padding: "9px 22px", borderRadius: 999, fontFamily: "'DM Mono', monospace", fontSize: 12, cursor: "pointer", transition: "all 0.2s", background: filter === tab.key ? tab.color : "transparent", color: filter === tab.key ? "#04050a" : "rgba(255,255,255,0.4)", border: `1px solid ${filter === tab.key ? tab.color : "rgba(255,255,255,0.1)"}`, fontWeight: filter === tab.key ? 700 : 400 }}>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>LOADING RANKINGS...</div>
          </div>
        ) : (
          <>
            {top3.length >= 3 && (
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 16, marginBottom: 40, opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(30px)", transition: "all 0.7s ease 0.2s" }}>
                <PodiumCard user={top3[1]} rank={2} filter={filter} height={160} />
                <PodiumCard user={top3[0]} rank={1} filter={filter} height={200} isFirst />
                <PodiumCard user={top3[2]} rank={3} filter={filter} height={130} />
              </div>
            )}

            <div style={{ background: "rgba(14,18,32,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, overflow: "hidden", opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(20px)", transition: "all 0.7s ease 0.3s" }}>
              <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 120px 100px 100px", gap: 12, padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {["#", "Player", filter === "xp" ? "⚡ XP" : filter === "streak" ? "🔥 Streak" : "🧩 Puzzles", "Level", "Streak"].map((h, i) => (
                  <div key={i} style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em", textAlign: i > 1 ? "center" : "left" }}>{h}</div>
                ))}
              </div>

              {rest.map((u, i) => {
                const rank = i + 4;
                const isMe = u.uid === user?.uid;
                const avatarColor = getAvatarColor(u.uid);
                const val = filter === "xp" ? u.xp : filter === "streak" ? u.streak : u.puzzlesSolved;
                return (
                  <div key={u.uid}
                    style={{ display: "grid", gridTemplateColumns: "48px 1fr 120px 100px 100px", gap: 12, padding: "14px 24px", background: isMe ? "rgba(34,211,238,0.04)" : "transparent", borderBottom: "1px solid rgba(255,255,255,0.03)", borderLeft: isMe ? "2px solid #22d3ee" : "2px solid transparent", transition: "background 0.2s" }}
                    onMouseEnter={e => { if (!isMe) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={e => { if (!isMe) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                  >
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center" }}>{rank}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: `${avatarColor}20`, border: `1px solid ${avatarColor}40`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 11, color: avatarColor, flexShrink: 0 }}>
                        {getInitials(u.username || "??")}
                      </div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: isMe ? "#22d3ee" : "white" }}>
                        {u.username || "Anonymous"}
                        {isMe && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#22d3ee", background: "rgba(34,211,238,0.15)", border: "1px solid rgba(34,211,238,0.3)", padding: "1px 6px", borderRadius: 4, marginLeft: 6 }}>YOU</span>}
                      </div>
                    </div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: filter === "xp" ? "#fbbf24" : filter === "streak" ? "#fb7185" : "#22d3ee", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {filter === "xp" ? val.toLocaleString() : val}
                    </div>
                    <div style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#818cf8", background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.2)", padding: "2px 10px", borderRadius: 6 }}>
                        Lv {calcLevel(u.xp)}
                      </span>
                    </div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: u.streak > 0 ? "#fb7185" : "rgba(255,255,255,0.2)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      {u.streak > 0 ? `🔥 ${u.streak}` : "—"}
                    </div>
                  </div>
                );
              })}

              {rest.length === 0 && top3.length === 0 && (
                <div style={{ textAlign: "center", padding: "48px", color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
                  No players yet — be the first! 🚀
                </div>
              )}
            </div>

            {myRank && myRank > 50 && myData && (
              <div style={{ marginTop: 16, background: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.2)", borderRadius: 14, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#22d3ee" }}>#{myRank}</div>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(34,211,238,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 12, color: "#22d3ee" }}>
                    {getInitials(myData.username || "??")}
                  </div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: "#22d3ee" }}>{myData.username} <span style={{ fontSize: 10, opacity: 0.6 }}>(You)</span></div>
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#fbbf24" }}>⚡ {myData.xp.toLocaleString()} XP</div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 28, opacity: animIn ? 1 : 0, transition: "all 0.7s ease 0.4s" }}>
              {[
                { label: "Total Players", val: users.length, icon: "👥", color: "#818cf8" },
                { label: "Top XP", val: users[0]?.xp.toLocaleString() ?? "—", icon: "⚡", color: "#fbbf24" },
                { label: "Top Streak", val: `${users.length > 0 ? Math.max(...users.map(u => u.streak ?? 0)) : 0} days`, icon: "🔥", color: "#fb7185" },
              ].map((s, i) => (
                <div key={i} style={{ background: "rgba(14,18,32,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "18px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: s.color, marginBottom: 4 }}>{s.val}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>{s.label.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PodiumCard({ user, rank, filter, height, isFirst }: {
  user: LeaderboardUser;
  rank: 1 | 2 | 3;
  filter: "xp" | "streak" | "puzzles";
  height: number;
  isFirst?: boolean;
}) {
  const rc = RANK_COLORS[rank];
  const avatarColor = getAvatarColor(user.uid);
  const val = filter === "xp" ? user.xp : filter === "streak" ? user.streak : user.puzzlesSolved;
  const currentUser = auth.currentUser;
  const isMe = user.uid === currentUser?.uid;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: isFirst ? 1.1 : 1 }}>
      {rank === 1 && <div style={{ fontSize: 28, marginBottom: 4, animation: "bounce 2s ease-in-out infinite" }}>👑</div>}
      <div style={{ width: isFirst ? 72 : 58, height: isFirst ? 72 : 58, borderRadius: isFirst ? 20 : 16, background: `${avatarColor}20`, border: `2px solid ${rc.text}`, boxShadow: `0 0 20px ${rc.glow}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: isFirst ? 22 : 16, color: avatarColor, marginBottom: 10, position: "relative" }}>
        {getInitials(user.username || "??")}
        {isMe && <div style={{ position: "absolute", top: -6, right: -6, background: "#22d3ee", borderRadius: 4, padding: "1px 4px", fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#04050a", fontWeight: 700 }}>YOU</div>}
      </div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: isFirst ? 15 : 13, color: isMe ? "#22d3ee" : "white", marginBottom: 4, textAlign: "center", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {user.username || "Anonymous"}
      </div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: rc.text, marginBottom: 12 }}>
        {filter === "xp" ? `⚡ ${val.toLocaleString()}` : filter === "streak" ? `🔥 ${val}` : `🧩 ${val}`}
      </div>
      <div style={{ width: "100%", height, background: rc.bg, border: `1px solid ${rc.text}30`, borderRadius: "12px 12px 0 0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 16, gap: 4, boxShadow: `0 -4px 24px ${rc.glow}`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: "-100%", width: "60%", height: "100%", background: `linear-gradient(90deg, transparent, ${rc.text}08, transparent)`, animation: rank === 1 ? "shimmer 3s ease-in-out infinite" : "none" }} />
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: isFirst ? 32 : 24, color: rc.text }}>{rc.label}</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: rc.text, opacity: 0.7 }}>Lv {calcLevel(user.xp)}</div>
      </div>
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes shimmer { 0%{left:-100%} 100%{left:200%} }
      `}</style>
    </div>
  );
}