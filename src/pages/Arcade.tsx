import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchUserData } from "../services/userServices";
import { LANGUAGES } from "../data/arcadeQuestions";
import {
  JAVA_OUTPUT_TOPICS,
  JAVA_BUG_TOPICS,
  JAVA_FILL_TOPICS,
} from "../data/javaExtraModes";
import {
  PYTHON_OUTPUT_TOPICS,
  PYTHON_BUG_TOPICS,
  PYTHON_FILL_TOPICS,
} from "../data/Pythonextramodes";
import type { Language, Topic, Question } from "../data/arcadeQuestions";
import {
  JS_OUTPUT_TOPICS,
  JS_BUG_TOPICS,
  JS_FILL_TOPICS,
} from "../data/javascriptExtraModes";
import { C_OUTPUT_TOPICS, C_BUG_TOPICS, C_FILL_TOPICS } from "../data/cExtraModes";
import { CPP_OUTPUT_TOPICS, CPP_BUG_TOPICS, CPP_FILL_TOPICS } from "../data/cppExtraModes";
import { TS_OUTPUT_TOPICS, TS_BUG_TOPICS, TS_FILL_TOPICS } from "../data/tsExtraModes";
import { REACT_OUTPUT_TOPICS, REACT_BUG_TOPICS, REACT_FILL_TOPICS } from "../data/reactExtraModes";
import { saveTopicCompletion, buildModuleProgress } from "../services/userServices";
import { HTMLCSS_OUTPUT_TOPICS, HTMLCSS_BUG_TOPICS, HTMLCSS_FILL_TOPICS } from "../data/htmlcssExtraModes";
import { MONGO_OUTPUT_TOPICS, MONGO_BUG_TOPICS, MONGO_FILL_TOPICS } from "../data/mongoExtraModes";
import { SQL_OUTPUT_TOPICS, SQL_BUG_TOPICS, SQL_FILL_TOPICS } from "../data/sqlExtraModes";

// ─── XP REWARD MAP ───
const XP_MAP: Record<string, number> = { Easy: 20, Medium: 35, Hard: 50 };

// ─── DIFFICULTY BADGE ───
const DIFF_COLOR: Record<string, { text: string; bg: string; border: string }> =
  {
    Easy: {
      text: "#34d399",
      bg: "rgba(52,211,153,0.1)",
      border: "rgba(52,211,153,0.2)",
    },
    Medium: {
      text: "#fbbf24",
      bg: "rgba(251,191,36,0.1)",
      border: "rgba(251,191,36,0.2)",
    },
    Hard: {
      text: "#fb7185",
      bg: "rgba(251,113,133,0.1)",
      border: "rgba(251,113,133,0.2)",
    },
  };

// ─── CATEGORY HEADER COLORS ───
const CAT_COLOR: Record<string, string> = {
  DSA: "#818cf8",
  OOPs: "#c084fc",
  Core: "#22d3ee",
  Hooks: "#34d399",
  CSS: "#f97316",
  HTML: "#fb7185",
};

// ─── GAME MODES ───
const MODES = [
  {
    id: "mcq",
    icon: "📝",
    title: "MCQ Challenge",
    desc: "Multiple choice questions to test your knowledge",
    color: "#818cf8",
    xpBonus: "1x XP",
  },
  {
    id: "output",
    icon: "💻",
    title: "Output Guess",
    desc: "Predict what the code will print when executed",
    color: "#22d3ee",
    xpBonus: "1.5x XP",
    badge: "NEW",
  },
  {
    id: "bug",
    icon: "🐛",
    title: "Bug Finder",
    desc: "Spot the error hidden in the code snippet",
    color: "#fb7185",
    xpBonus: "2x XP",
    badge: "NEW",
  },
  {
    id: "fill",
    icon: "⬜",
    title: "Fill in the Blank",
    desc: "Complete the missing code to make it work",
    color: "#34d399",
    xpBonus: "1.5x XP",
    badge: "NEW",
  },
];

type GameMode = "mcq" | "output" | "bug" | "fill";
type View = "lang" | "mode" | "topics" | "quiz" | "results";

// ─── FONTS STYLE ───
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');`;

// ─── TIMER HOOK ───
function useTimer(seconds: number, onEnd: () => void, active: boolean, resetKey: number) {
  const [time, setTime] = useState(seconds);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset timer every time resetKey changes (i.e. new question)
  useEffect(() => {
    if (ref.current) clearInterval(ref.current);
    setTime(seconds);
  }, [resetKey, seconds]);

  useEffect(() => {
    if (!active) {
      if (ref.current) clearInterval(ref.current);
      return;
    }
    ref.current = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          clearInterval(ref.current!);
          onEnd();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [active, onEnd, resetKey]);
  return time;
}

// ─── GET TOPICS FOR MODE ───
function getTopicsForMode(lang: Language, mode: GameMode): Topic[] {
  if (mode === "mcq") return lang.topics;
  if (lang.id === "java") {
    if (mode === "output") return JAVA_OUTPUT_TOPICS;
    if (mode === "bug") return JAVA_BUG_TOPICS;
    if (mode === "fill") return JAVA_FILL_TOPICS;
  }
  if (lang.id === "python") {
    if (mode === "output") return PYTHON_OUTPUT_TOPICS;
    if (mode === "bug") return PYTHON_BUG_TOPICS;
    if (mode === "fill") return PYTHON_FILL_TOPICS;
  }
  if (lang.id === "javascript") {
    if (mode === "output") return JS_OUTPUT_TOPICS;
    if (mode === "bug") return JS_BUG_TOPICS;
    if (mode === "fill") return JS_FILL_TOPICS;
  }
  if (lang.id === "c") {
    if (mode === "output") return C_OUTPUT_TOPICS;
    if (mode === "bug") return C_BUG_TOPICS;
    if (mode === "fill") return C_FILL_TOPICS;
  }
  if (lang.id === "cpp") {
  if (mode === "output") return CPP_OUTPUT_TOPICS;
  if (mode === "bug")    return CPP_BUG_TOPICS;
  if (mode === "fill")   return CPP_FILL_TOPICS;
}
if (lang.id === "typescript") {
  if (mode === "output") return TS_OUTPUT_TOPICS;
  if (mode === "bug")    return TS_BUG_TOPICS;
  if (mode === "fill")   return TS_FILL_TOPICS;
}
if (lang.id === "react") {
  if (mode === "output") return REACT_OUTPUT_TOPICS;
  if (mode === "bug")    return REACT_BUG_TOPICS;
  if (mode === "fill")   return REACT_FILL_TOPICS;
}
if (lang.id === "htmlcss") {
  if (mode === "output") return HTMLCSS_OUTPUT_TOPICS;
  if (mode === "bug")    return HTMLCSS_BUG_TOPICS;
  if (mode === "fill")   return HTMLCSS_FILL_TOPICS;
}
if (lang.id === "mongodb") {
  if (mode === "output") return MONGO_OUTPUT_TOPICS;
  if (mode === "bug")    return MONGO_BUG_TOPICS;
  if (mode === "fill")   return MONGO_FILL_TOPICS;
}
if (lang.id === "sql") {
  if (mode === "output") return SQL_OUTPUT_TOPICS;
  if (mode === "bug")    return SQL_BUG_TOPICS;
  if (mode === "fill")   return SQL_FILL_TOPICS;
}
  return lang.topics;
}

// ─── XP MULTIPLIER ───
function getXPMultiplier(mode: GameMode): number {
  if (mode === "output" || mode === "fill") return 1.5;
  if (mode === "bug") return 2;
  return 1;
}

export default function Arcade() {
  const navigate = useNavigate();

  // ── STATE ──
  const [view, setView] = useState<View>("lang");
  const [selLang, setSelLang] = useState<Language | null>(null);
  const [selMode, setSelMode] = useState<GameMode>("mcq");
  const [selTopic, setSelTopic] = useState<Topic | null>(null);
  const [catFilter, setCatFilter] = useState<string>("All");

  // quiz
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const xpRef = useRef(0);    // tracks real-time xpEarned for finishQuiz closure
  const scoreRef = useRef(0); // tracks real-time score for 90% check
  const [results, setResults] = useState<
    { q: Question; ans: string; correct: boolean }[]
  >([]);
  const [timedOut, setTimedOut] = useState(false);
  const [solvedTopics, setSolvedTopics] = useState<Set<string>>(new Set());
  const [userXP, setUserXP] = useState(0);
  const [topicsDone, setTopicsDone] = useState<string[]>([]);
  const [lastQuizAlreadyDone, setLastQuizAlreadyDone] = useState(false);

  useEffect(() => {
    const initData = async () => {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/login"); return; }
      try {
        const data = await fetchUserData("me");
        if (data) {
          setUserXP(data.xp ?? 0);
          const done: string[] = data.topicsDone ?? [];
          setTopicsDone(done);
          setSolvedTopics(new Set(done));
        }
      } catch (err) {
        console.error(err);
        navigate("/login");
      }
    };
    initData();
  }, [navigate]);

  const handleTimeOut = useCallback(() => {
    if (confirmed) return;
    setTimedOut(true);
    setConfirmed(true);
    const q = selTopic!.questions[qIndex];
    setResults((r) => [...r, { q, ans: "", correct: false }]);
    setTimeout(() => advanceQuestion(), 2000);
  }, [confirmed, qIndex, selTopic]);

  const timerActive = view === "quiz" && !confirmed;
  const timeLeft = useTimer(10, handleTimeOut, timerActive, qIndex);

  const advanceQuestion = () => {
    if (!selTopic) return;
    const next = qIndex + 1;
    if (next >= selTopic.questions.length) {
      finishQuiz();
    } else {
      setQIndex(next);
      setSelected(null);
      setConfirmed(false);
      setTimedOut(false);
    }
  };

  const startQuiz = (topic: Topic) => {
    setSelTopic(topic);
    setQIndex(0);
    setSelected(null);
    setConfirmed(false);
    setScore(0);
    setXpEarned(0);
    xpRef.current = 0;
    scoreRef.current = 0;
    setResults([]);
    setTimedOut(false);
    setLastQuizAlreadyDone(false);
    setView("quiz");
  };

  const handleConfirm = () => {
    if (!selected || !selTopic) return;
    setConfirmed(true);
    const q = selTopic.questions[qIndex];
    const correct = selected === q.answer;
    if (correct) {
      const base =
        timeLeft > 5
          ? XP_MAP[selTopic.difficulty]
          : Math.floor(XP_MAP[selTopic.difficulty] * 0.6);
      const xp = Math.round(base * getXPMultiplier(selMode));
      setScore((s) => { scoreRef.current = s + 1; return s + 1; });
      setXpEarned((x) => { xpRef.current = x + xp; return x + xp; });
    }
    setResults((r) => [...r, { q, ans: selected, correct }]);
    setTimeout(() => advanceQuestion(), 1800);
  };

  const finishQuiz = async () => {
  // reset old state first
  setLastQuizAlreadyDone(false);

  if (!selTopic) {
    setView("results");
    return;
  }

  // UI mark solved
  setSolvedTopics((s) => new Set([...s, selTopic.id]));

  const earnedXP = xpRef.current;
  const totalQ = selTopic.questions.length;

  const scorePct =
    totalQ > 0
      ? (scoreRef.current / totalQ) * 100
      : 0;

  // below 90%
  if (earnedXP === 0 || scorePct < 90) {
    setView("results");
    return;
  }

  const modeInfo = MODES.find(
    (m) => m.id === selMode
  )!;

  try {
    const result = await saveTopicCompletion({
      uid: "me",
      langId: selLang?.id ?? "",
      topicId:  `${selMode}_${selTopic.id}`,
      xpEarned: earnedXP,
      modeIcon: modeInfo.icon,
      modeTitle: modeInfo.title,
      topicName: selTopic.name,
      langName: selLang?.name ?? "",
      langColor: selLang?.color ?? "#22d3ee",
    });

    setUserXP(result.newXP);
    setTopicsDone(result.topicsDone);
    setSolvedTopics(
      new Set(result.topicsDone)
    );
    setLastQuizAlreadyDone(
      result.alreadyDone
    );
  } catch (e) {
    console.error(e);
  }

  // move result page LAST
  setView("results");
  };
  // ════════════════════════════════════════════════
  // VIEW: LANGUAGE SELECT
  // ════════════════════════════════════════════════
  if (view === "lang")
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#04050a",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <style>{FONTS}</style>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 32px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "rgba(255,255,255,0.4)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            ← Dashboard
          </button>
          <div
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: 20,
            }}
          >
            <span style={{ color: "#22d3ee" }}>Wisdom</span>
            <span style={{ color: "white" }}>Wave</span>
          </div>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 13,
              color: "#fbbf24",
            }}
          >
            ⚡ {userXP.toLocaleString()} XP
          </div>
        </nav>

        <div style={{ textAlign: "center", padding: "64px 32px 48px" }}>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              color: "#818cf8",
              letterSpacing: "0.2em",
              marginBottom: 16,
            }}
          >
            ARCADE MODE
          </div>
          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(2rem,5vw,3.5rem)",
              color: "white",
              lineHeight: 1.1,
              marginBottom: 16,
            }}
          >
            Choose Your <span style={{ color: "#22d3ee" }}>Language</span>
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.35)",
              fontSize: 16,
              maxWidth: 440,
              margin: "0 auto",
            }}
          >
            Select a language → choose game mode → pick topic → earn XP
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
            maxWidth: 900,
            margin: "0 auto",
            padding: "0 32px 80px",
          }}
        >
          {LANGUAGES.map((lang) => {
            const done = lang.topics.filter((t) =>
              solvedTopics.has(t.id),
            ).length;
            return (
              <button
                key={lang.id}
                onClick={() => {
                  setSelLang(lang);
                  setView("mode");
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    lang.color;
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    "scale(1.03)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    `${lang.color}20`;
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    "scale(1)";
                }}
                style={{
                  textAlign: "left",
                  background: "#0e1220",
                  border: `1px solid ${lang.color}20`,
                  borderRadius: 20,
                  padding: 32,
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>
                  {lang.icon}
                </div>
                <h2
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 800,
                    fontSize: 26,
                    color: "white",
                    marginBottom: 8,
                  }}
                >
                  {lang.name}
                </h2>
                <div
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 12,
                    color: lang.color,
                    marginBottom: 24,
                  }}
                >
                  {lang.topics.length} topics · {lang.topics.length * 10}{" "}
                  questions
                </div>
                <div
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: 999,
                    height: 5,
                    marginBottom: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${(done / lang.topics.length) * 100}%`,
                      height: "100%",
                      background: lang.color,
                      borderRadius: 999,
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11,
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  {done}/{lang.topics.length} completed
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );

  // ════════════════════════════════════════════════
  // VIEW: MODE SELECT  ← NEW
  // ════════════════════════════════════════════════
  if (view === "mode" && selLang)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#04050a",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <style>{FONTS}</style>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 32px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <button
            onClick={() => setView("lang")}
            style={{
              color: "rgba(255,255,255,0.4)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            ← Languages
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>{selLang.icon}</span>
            <span
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: 20,
                color: selLang.color,
              }}
            >
              {selLang.name}
            </span>
          </div>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 13,
              color: "#fbbf24",
            }}
          >
            ⚡ {userXP.toLocaleString()} XP
          </div>
        </nav>

        <div
          style={{ maxWidth: 860, margin: "0 auto", padding: "56px 32px 80px" }}
        >
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                color: "#818cf8",
                letterSpacing: "0.2em",
                marginBottom: 12,
              }}
            >
              SELECT GAME MODE
            </div>
            <h1
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: "clamp(1.8rem,4vw,2.8rem)",
                color: "white",
                marginBottom: 12,
              }}
            >
              How do you want to{" "}
              <span style={{ color: selLang.color }}>learn?</span>
            </h1>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 15 }}>
              Each mode tests differently — harder modes earn more XP
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: 16,
            }}
          >
            {MODES.map((mode) => {
              const isAvailable =
                mode.id === "mcq" ||
                ["java", "python", "javascript","c","cpp","typescript","react","htmlcss","mongodb","sql"].includes(selLang.id);
              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    if (!isAvailable) return;
                    setSelMode(mode.id as GameMode);
                    setCatFilter("All");
                    setView("topics");
                  }}
                  onMouseEnter={(e) => {
                    if (!isAvailable) return;
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.borderColor = mode.color;
                    el.style.transform = "translateY(-3px)";
                    el.style.boxShadow = `0 8px 32px ${mode.color}20`;
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.borderColor = `${mode.color}25`;
                    el.style.transform = "translateY(0)";
                    el.style.boxShadow = "none";
                  }}
                  style={{
                    textAlign: "left",
                    background: "#0e1220",
                    border: `1px solid ${mode.color}25`,
                    borderRadius: 20,
                    padding: "28px 32px",
                    cursor: isAvailable ? "pointer" : "not-allowed",
                    transition: "all 0.25s ease",
                    opacity: isAvailable ? 1 : 0.45,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Glow bg */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      width: 140,
                      height: 140,
                      background: `radial-gradient(circle, ${mode.color}12 0%, transparent 70%)`,
                      transform: "translate(40px,-40px)",
                      pointerEvents: "none",
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: 16,
                    }}
                  >
                    <span style={{ fontSize: 40 }}>{mode.icon}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      {"badge" in mode && (
                        <span
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: 10,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: `${mode.color}20`,
                            color: mode.color,
                            border: `1px solid ${mode.color}40`,
                            letterSpacing: "0.1em",
                          }}
                        >
                          {mode.badge}
                        </span>
                      )}
                      {!isAvailable && (
                        <span
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: 10,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: "rgba(255,255,255,0.05)",
                            color: "rgba(255,255,255,0.3)",
                            border: "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          Java Only
                        </span>
                      )}
                    </div>
                  </div>

                  <h3
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 800,
                      fontSize: 20,
                      color: "white",
                      marginBottom: 8,
                    }}
                  >
                    {mode.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 14,
                      color: "rgba(255,255,255,0.4)",
                      marginBottom: 20,
                      lineHeight: 1.5,
                    }}
                  >
                    {mode.desc}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 12,
                        color: mode.color,
                        background: `${mode.color}15`,
                        padding: "4px 12px",
                        borderRadius: 999,
                        border: `1px solid ${mode.color}30`,
                      }}
                    >
                      {mode.xpBonus}
                    </span>
                    {isAvailable && (
                      <span style={{ color: mode.color, fontSize: 18 }}>→</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );

  // ════════════════════════════════════════════════
  // VIEW: TOPIC SELECT
  // ════════════════════════════════════════════════
  if (view === "topics" && selLang) {
    const modeInfo = MODES.find((m) => m.id === selMode)!;
    const topics = getTopicsForMode(selLang, selMode);
    const langCats = [
      "All",
      ...Array.from(new Set(topics.map((t) => t.category))),
    ];
    const activeCats =
      catFilter === "All"
        ? Array.from(new Set(topics.map((t) => t.category)))
        : [catFilter];

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#04050a",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <style>{FONTS}</style>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 32px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <button
            onClick={() => setView("mode")}
            style={{
              color: "rgba(255,255,255,0.4)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            ← Modes
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>{modeInfo.icon}</span>
            <span
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: 18,
                color: modeInfo.color,
              }}
            >
              {modeInfo.title}
            </span>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
            <span
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: 18,
                color: selLang.color,
              }}
            >
              {selLang.name}
            </span>
          </div>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 13,
              color: "#fbbf24",
            }}
          >
            ⚡ {userXP.toLocaleString()} XP
          </div>
        </nav>

        <div
          style={{ maxWidth: 960, margin: "0 auto", padding: "48px 32px 80px" }}
        >
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                color: "#818cf8",
                letterSpacing: "0.2em",
                marginBottom: 10,
              }}
            >
              SELECT TOPIC
            </div>
            <h1
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: "clamp(1.8rem,4vw,2.8rem)",
                color: "white",
              }}
            >
              What to{" "}
              <span style={{ color: selLang.color }}>master today?</span>
            </h1>
          </div>

          {/* Mode badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 28,
              background: `${modeInfo.color}10`,
              border: `1px solid ${modeInfo.color}30`,
              borderRadius: 999,
              padding: "6px 16px",
            }}
          >
            <span style={{ fontSize: 16 }}>{modeInfo.icon}</span>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 12,
                color: modeInfo.color,
              }}
            >
              {modeInfo.title} · {modeInfo.xpBonus}
            </span>
          </div>

          {/* Category filter */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 36,
              flexWrap: "wrap",
            }}
          >
            {langCats.map((cat) => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 999,
                  border: "1px solid",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 12,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: catFilter === cat ? selLang.color : "transparent",
                  color:
                    catFilter === cat ? "#04050a" : "rgba(255,255,255,0.5)",
                  borderColor:
                    catFilter === cat ? selLang.color : "rgba(255,255,255,0.1)",
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Topics grouped by category */}
          {activeCats.map((cat) => {
            const topicsInCat = topics.filter((t) => t.category === cat);
            if (topicsInCat.length === 0) return null;
            return (
              <div key={cat} style={{ marginBottom: 44 }}>
                <div
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11,
                    color: CAT_COLOR[cat] ?? "#818cf8",
                    letterSpacing: "0.15em",
                    marginBottom: 16,
                  }}
                >
                  ── {cat.toUpperCase()} TOPICS
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: 14,
                  }}
                >
                  {topicsInCat.map((topic) => (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      langColor={selLang.color}
                      solved={solvedTopics.has(topic.id)}
                      onClick={() => startQuiz(topic)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════
  // VIEW: QUIZ
  // ════════════════════════════════════════════════
  if (view === "quiz" && selTopic) {
    const q = selTopic.questions[qIndex];
    const progress = (qIndex / selTopic.questions.length) * 100;
    const timerPct = (timeLeft / 10) * 100;
    const timerColor =
      timeLeft > 6 ? "#22d3ee" : timeLeft > 3 ? "#fbbf24" : "#fb7185";
    const modeInfo = MODES.find((m) => m.id === selMode)!;
    const isCodeQuestion = q.question.includes("\n");

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "#04050a",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <style>{FONTS}</style>

        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div style={{ maxWidth: 660, margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => setView("topics")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.3)",
                    fontSize: 18,
                  }}
                >
                  ✕
                </button>
                <span style={{ fontSize: 16 }}>{modeInfo.icon}</span>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  {selTopic.icon} {selTopic.name}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  {qIndex + 1}/{selTopic.questions.length}
                </span>
                <div style={{ position: "relative", width: 42, height: 42 }}>
                  <svg width="42" height="42" viewBox="0 0 42 42">
                    <circle
                      cx="21"
                      cy="21"
                      r="17"
                      fill="none"
                      stroke="rgba(255,255,255,0.07)"
                      strokeWidth="3"
                    />
                    <circle
                      cx="21"
                      cy="21"
                      r="17"
                      fill="none"
                      stroke={timerColor}
                      strokeWidth="3"
                      strokeDasharray={`${2 * Math.PI * 17}`}
                      strokeDashoffset={`${2 * Math.PI * 17 * (1 - timerPct / 100)}`}
                      strokeLinecap="round"
                      transform="rotate(-90 21 21)"
                      style={{
                        transition: "stroke-dashoffset 1s linear, stroke 0.5s",
                      }}
                    />
                  </svg>
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 11,
                      color: timerColor,
                      fontWeight: 500,
                    }}
                  >
                    {timeLeft}
                  </span>
                </div>
              </div>
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: 999,
                height: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: modeInfo.color,
                  borderRadius: 999,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ flex: 1, padding: "32px 24px" }}>
          <div style={{ maxWidth: 660, margin: "0 auto" }}>
            {/* Score + mode pill */}
            <div
              style={{
                display: "flex",
                gap: 16,
                marginBottom: 24,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 12,
                  color: "#34d399",
                }}
              >
                ✓ {score} correct
              </span>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 12,
                  color: "#fbbf24",
                }}
              >
                ⚡ {xpEarned} XP
              </span>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  color: modeInfo.color,
                  background: `${modeInfo.color}15`,
                  padding: "2px 10px",
                  borderRadius: 999,
                  border: `1px solid ${modeInfo.color}30`,
                }}
              >
                {modeInfo.icon} {modeInfo.xpBonus}
              </span>
            </div>

            {/* Question card — code questions get special treatment */}
            <div
              style={{
                background: "#0e1220",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 20,
                padding: "24px 28px",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11,
                    color: "#818cf8",
                    letterSpacing: "0.1em",
                  }}
                >
                  Q{qIndex + 1}
                </span>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 10,
                    color: modeInfo.color,
                    background: `${modeInfo.color}15`,
                    padding: "2px 8px",
                    borderRadius: 4,
                  }}
                >
                  {modeInfo.title.toUpperCase()}
                </span>
              </div>

              {isCodeQuestion ? (
                (() => {
                  const lines = q.question.split("\n");
                  const textPart = lines[0];
                  const codePart = lines.slice(1).join("\n").trim();
                  return (
                    <>
                      <p
                        style={{
                          fontFamily: "'Syne', sans-serif",
                          fontWeight: 700,
                          fontSize: "clamp(0.95rem,2vw,1.1rem)",
                          color: "white",
                          lineHeight: 1.5,
                          margin: "0 0 16px 0",
                        }}
                      >
                        {textPart}
                      </p>
                      <pre
                        style={{
                          background: "#060910",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: 12,
                          padding: "16px 20px",
                          margin: 0,
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 13,
                          color: "#e2e8f0",
                          lineHeight: 1.7,
                          overflowX: "auto",
                          whiteSpace: "pre",
                        }}
                      >
                        {codePart}
                      </pre>
                    </>
                  );
                })()
              ) : (
                <p
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: "clamp(1rem,2.5vw,1.25rem)",
                    color: "white",
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {q.question}
                </p>
              )}
            </div>

            {timedOut && (
              <div
                style={{
                  background: "rgba(251,113,133,0.08)",
                  border: "1px solid rgba(251,113,133,0.2)",
                  borderRadius: 12,
                  padding: "12px 20px",
                  marginBottom: 14,
                  textAlign: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 13,
                    color: "#fb7185",
                  }}
                >
                  ⏰ Time's up! Correct: {q.answer}
                </span>
              </div>
            )}

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {q.options.map((opt, i) => {
                let bg = "#0e1220",
                  border = "rgba(255,255,255,0.07)",
                  color = "rgba(255,255,255,0.7)";
                if (confirmed || timedOut) {
                  if (opt === q.answer) {
                    bg = "rgba(52,211,153,0.1)";
                    border = "#34d399";
                    color = "#34d399";
                  } else if (opt === selected && opt !== q.answer) {
                    bg = "rgba(251,113,133,0.1)";
                    border = "#fb7185";
                    color = "#fb7185";
                  }
                } else if (selected === opt) {
                  bg = `${modeInfo.color}18`;
                  border = modeInfo.color;
                  color = modeInfo.color;
                }

                return (
                  <button
                    key={i}
                    onClick={() => !confirmed && !timedOut && setSelected(opt)}
                    style={{
                      textAlign: "left",
                      background: bg,
                      border: `1px solid ${border}`,
                      borderRadius: 14,
                      padding: "13px 20px",
                      cursor: confirmed || timedOut ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      transition: "all 0.2s",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 12,
                        color: border,
                        minWidth: 20,
                        fontWeight: 500,
                      }}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 13,
                        color,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {(confirmed || timedOut) && (
              <div
                style={{
                  marginTop: 14,
                  background: "rgba(129,140,248,0.06)",
                  border: "1px solid rgba(129,140,248,0.15)",
                  borderRadius: 14,
                  padding: "16px 20px",
                }}
              >
                <div
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 10,
                    color: "#818cf8",
                    marginBottom: 8,
                    letterSpacing: "0.1em",
                  }}
                >
                  EXPLANATION
                </div>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    color: "rgba(255,255,255,0.55)",
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {q.explanation}
                </p>
              </div>
            )}

            {/* Confirm */}
            {!confirmed && !timedOut && (
              <button
                onClick={handleConfirm}
                disabled={!selected}
                style={{
                  width: "100%",
                  marginTop: 16,
                  padding: "16px",
                  borderRadius: 14,
                  border: "none",
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: selected ? "pointer" : "not-allowed",
                  background: selected
                    ? modeInfo.color
                    : "rgba(255,255,255,0.05)",
                  color: selected ? "#04050a" : "rgba(255,255,255,0.2)",
                  transition: "all 0.2s",
                }}
              >
                Confirm Answer
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════
  // VIEW: RESULTS
  // ════════════════════════════════════════════════
  if (view === "results" && selTopic) {
    const pct = Math.round((score / selTopic.questions.length) * 100);
    const passed90 = pct >= 90;
    const lastQuizAlreadyDone = solvedTopics.has(selTopic.id);
    const grade =
      pct >= 80
        ? "🏆 Excellent!"
        : pct >= 60
          ? "👍 Good Job!"
          : pct >= 40
            ? "📚 Keep Going!"
            : "💪 Practice More!";
    const gradeColor =
      pct >= 80
        ? "#fbbf24"
        : pct >= 60
          ? "#34d399"
          : pct >= 40
            ? "#818cf8"
            : "#fb7185";
    const modeInfo = MODES.find((m) => m.id === selMode)!;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#04050a",
          fontFamily: "'DM Sans', sans-serif",
          padding: "40px 24px",
        }}
      >
        <style>{FONTS}</style>
        <div style={{ maxWidth: 520, width: "100%" }}>
          <div
            style={{
              background: "#0e1220",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 28,
              padding: "48px 40px",
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 52, marginBottom: 8 }}>{modeInfo.icon}</div>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                color: modeInfo.color,
                letterSpacing: "0.15em",
                marginBottom: 4,
              }}
            >
              {modeInfo.title.toUpperCase()}
            </div>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                color: "#818cf8",
                letterSpacing: "0.2em",
                marginBottom: 16,
              }}
            >
              QUIZ COMPLETE
            </div>

            {/* Already completed — no XP banner */}
            {lastQuizAlreadyDone && (
              <div style={{
                background: "rgba(251,191,36,0.08)",
                border: "1px solid rgba(251,191,36,0.2)",
                borderRadius: 10,
                padding: "8px 16px",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <span style={{ fontSize: 14 }}>⚠️</span>
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 12,
                  color: "#fbbf24",
                }}>
                  Topic already completed — no XP awarded
                </span>
              </div>
            )}

            <div
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: 56,
                color: gradeColor,
                marginBottom: 8,
              }}
            >
              {pct}%
            </div>
            <div
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 22,
                color: "white",
                marginBottom: 16,
              }}
            >
              {grade}
            </div>

            {/* 90% threshold notice */}
            {!passed90 && (
              <div style={{
                background: "rgba(251,113,133,0.08)",
                border: "1px solid rgba(251,113,133,0.2)",
                borderRadius: 10,
                padding: "10px 16px",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <span style={{ fontSize: 16 }}>🎯</span>
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 12,
                  color: "#fb7185",
                }}>
                  Score 90%+ ({Math.ceil(selTopic.questions.length * 0.9)}/{selTopic.questions.length}) to earn XP
                </span>
              </div>
            )}
            {passed90 && !lastQuizAlreadyDone && (
              <div style={{
                background: "rgba(52,211,153,0.08)",
                border: "1px solid rgba(52,211,153,0.2)",
                borderRadius: 10,
                padding: "10px 16px",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <span style={{ fontSize: 16 }}>✅</span>
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 12,
                  color: "#34d399",
                }}>
                  90%+ achieved — XP saved to your profile!
                </span>
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 12,
                marginBottom: 28,
              }}
            >
              {[
                {
                  label: "Correct",
                  val: `${score}/${selTopic.questions.length}`,
                  color: "#34d399",
                },
                {
                  label: "XP Earned",
                  val: lastQuizAlreadyDone ? "0 (done)" : !passed90 ? "0 (need 90%)" : xpEarned > 0 ? `+${xpEarned}` : "0",
                  color: lastQuizAlreadyDone || !passed90 ? "rgba(255,255,255,0.3)" : "#fbbf24",
                },
                {
                  label: "Mode Bonus",
                  val: modeInfo.xpBonus,
                  color: modeInfo.color,
                },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 14,
                    padding: "14px 10px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 10,
                      color: "rgba(255,255,255,0.3)",
                      marginBottom: 6,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {s.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 800,
                      fontSize: 18,
                      color: s.color,
                    }}
                  >
                    {s.val}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{ maxHeight: 200, overflowY: "auto", textAlign: "left" }}
            >
              {results.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "9px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontSize: 14 }}>
                    {r.correct ? "✅" : "❌"}
                  </span>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      color: "rgba(255,255,255,0.45)",
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {r.q.question.split("\n")[0]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <button
              onClick={() => startQuiz(selTopic)}
              style={{
                flex: 1,
                padding: "16px",
                borderRadius: 14,
                border: "none",
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
                background: modeInfo.color,
                color: "#04050a",
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => setView("topics")}
              style={{
                flex: 1,
                padding: "16px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.1)",
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
                background: "transparent",
                color: "white",
              }}
            >
              More Topics
            </button>
          </div>
          <button
            onClick={() => setView("mode")}
            style={{
              width: "100%",
              padding: "11px",
              borderRadius: 14,
              border: "none",
              background: "none",
              fontFamily: "'DM Mono', monospace",
              fontSize: 13,
              color: "rgba(255,255,255,0.3)",
              cursor: "pointer",
            }}
          >
            ← Change Mode
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: 14,
              border: "none",
              background: "none",
              fontFamily: "'DM Mono', monospace",
              fontSize: 13,
              color: "rgba(255,255,255,0.2)",
              cursor: "pointer",
            }}
          >
            ← Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ─── TOPIC CARD COMPONENT ───
function TopicCard({
  topic,
  langColor,
  solved,
  onClick,
}: {
  topic: Topic;
  langColor: string;
  solved: boolean;
  onClick: () => void;
}) {
  const diff = DIFF_COLOR[topic.difficulty];
  return (
    <button
      onClick={onClick}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = langColor;
        (e.currentTarget as HTMLButtonElement).style.transform =
          "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = solved
          ? "rgba(52,211,153,0.2)"
          : "rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLButtonElement).style.transform =
          "translateY(0)";
      }}
      style={{
        textAlign: "left",
        background: solved ? "rgba(52,211,153,0.04)" : "#0e1220",
        border: `1px solid ${solved ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 16,
        padding: "20px 22px",
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative",
      }}
    >
      {solved && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#34d399",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#04050a"
            strokeWidth={3}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 26 }}>{topic.icon}</span>
        <h3
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: 15,
            color: "white",
            margin: 0,
          }}
        >
          {topic.name}
        </h3>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            color: diff.text,
            background: diff.bg,
            border: `1px solid ${diff.border}`,
            padding: "3px 8px",
            borderRadius: 6,
          }}
        >
          {topic.difficulty}
        </span>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            color: "#fbbf24",
          }}
        >
          +{XP_MAP[topic.difficulty]} XP
        </span>
      </div>
    </button>
  );
}