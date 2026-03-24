import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc, increment, arrayUnion, serverTimestamp } from "firebase/firestore";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');`;

// ─── UNSCRAMBLE PUZZLES ───────────────────────────────────────
const UNSCRAMBLE_PUZZLES = [
  { id: "u1", scrambled: ["return", "function", "}", "{", "value"], answer: ["function", "{", "return", "value", "}"], hint: "Basic function structure", xp: 30, lang: "JavaScript" },
  { id: "u2", scrambled: ["n", "factorial", "return", "*", "factorial(n-1)"], answer: ["return", "n", "*", "factorial(n-1)"], hint: "Recursive factorial return statement", xp: 40, lang: "Any" },
  { id: "u3", scrambled: ["i", "for", "arr.length", "<", "i++", "i=0"], answer: ["for", "i=0", "i", "<", "arr.length", "i++"], hint: "Standard for loop", xp: 30, lang: "C/Java/JS" },
  { id: "u4", scrambled: ["self", "def", "__init__", "name", "self.name", "="], answer: ["def", "__init__", "self", "name", "self.name", "="], hint: "Python class constructor", xp: 35, lang: "Python" },
  { id: "u5", scrambled: ["null", "ptr", "int*", "=", "ptr"], answer: ["int*", "ptr", "=", "null", "ptr"], hint: "Null pointer in C", xp: 40, lang: "C" },
  { id: "u6", scrambled: ["else", "if", "}", "{", "return", "true", "false", "return"], answer: ["if", "{", "return", "true", "}", "else", "{", "return", "false"], hint: "If-else return pattern", xp: 35, lang: "Any" },
  { id: "u7", scrambled: ["push", "stack", "pop", "peek", "isEmpty"], answer: ["push", "pop", "peek", "isEmpty", "stack"], hint: "Stack operations in order", xp: 30, lang: "DSA" },
  { id: "u8", scrambled: ["O(n)", "O(1)", "O(log n)", "O(n²)", "O(n log n)"], answer: ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)"], hint: "Time complexities best to worst", xp: 50, lang: "DSA" },
  { id: "u9", scrambled: ["class", "extends", "super()", "Dog", "Animal"], answer: ["class", "Dog", "extends", "Animal", "super()"], hint: "Java inheritance syntax", xp: 35, lang: "Java" },
  { id: "u10", scrambled: ["SELECT", "WHERE", "FROM", "ORDER BY", "*"], answer: ["SELECT", "*", "FROM", "WHERE", "ORDER BY"], hint: "SQL query clause order", xp: 40, lang: "SQL" },
];

// ─── ARRAY SORT PUZZLES ───────────────────────────────────────
const SORT_PUZZLES = [
  { id: "s1", title: "Sort Ascending", values: [64, 34, 25, 12, 22, 11, 90], xp: 40, hint: "Arrange numbers smallest to largest" },
  { id: "s2", title: "Sort Descending", values: [3, 44, 15, 67, 8, 23], xp: 40, hint: "Arrange numbers largest to smallest", desc: true },
  { id: "s3", title: "Sort Even First", values: [1, 2, 3, 4, 5, 6, 7, 8], xp: 50, hint: "All even numbers, then all odd numbers", custom: (a: number[]) => [...a.filter(x=>x%2===0), ...a.filter(x=>x%2!==0)] },
  { id: "s4", title: "Binary Values", values: [1, 0, 1, 0, 0, 1, 1, 0], xp: 35, hint: "All 0s first, then all 1s", custom: (a: number[]) => [...a.filter(x=>x===0), ...a.filter(x=>x===1)] },
  { id: "s5", title: "Sort Ascending", values: [38, 27, 43, 3, 9, 82, 10], xp: 40, hint: "Classic merge sort array" },
];

type PuzzleType = "menu" | "unscramble" | "sort";

export default function Puzzle() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [view, setView] = useState<PuzzleType>("menu");
  const [userXP, setUserXP] = useState(0);

  // ── Unscramble state ──
  const [uIdx, setUIdx] = useState(0);
  const [uArranged, setUArranged] = useState<string[]>([]);
  const [uBank, setUBank] = useState<string[]>([]);
  const [uResult, setUResult] = useState<"idle" | "correct" | "wrong">("idle");
  const [uSolved, setUSolved] = useState<Set<string>>(new Set());

  // ── Sort state ──
  const [sIdx, setSIdx] = useState(0);
  const [sArr, setSArr] = useState<number[]>([]);
  const [sDragging, setSDragging] = useState<number | null>(null);
  const [sResult, setSResult] = useState<"idle" | "correct" | "wrong">("idle");
  const [sSolved, setSSolved] = useState<Set<string>>(new Set());

  // ── Demo Modal state ──
  const [showDemo, setShowDemo] = useState(false);
  const [demoTab, setDemoTab] = useState<"unscramble" | "sort">("unscramble");
  const [demoStep, setDemoStep] = useState(0);

  // Demo steps for Unscramble
  const UNSCRAMBLE_DEMO_STEPS = [
    { highlight: "bank", text: "You'll see a set of scrambled code tokens in the token bank below 👇 — your job is to put them in the correct order.", tokens: ["return", "function", "{", "value", "}"], arranged: [] },
    { highlight: "add", text: "Click any token to move it into the answer box above 🖱️ — tokens are added in the order you click them.", tokens: ["return", "{", "value", "}"], arranged: ["function"] },
    { highlight: "arranged", text: "Keep adding tokens until they form the correct code. Click a token in the answer box to send it back to the bank ↩️", tokens: ["{", "value", "}"], arranged: ["function", "return"] },
    { highlight: "check", text: "Once all tokens are placed, hit the 'Check Answer' button to verify your solution ✅", tokens: [], arranged: ["function", "{", "return", "value", "}"] },
    { highlight: "result", text: "Get it right and you'll earn XP! 🎉 If you're wrong, just hit Try Again — no penalty.", tokens: [], arranged: ["function", "{", "return", "value", "}"], correct: true },
  ];

  const SORT_DEMO_STEPS = [
    { highlight: "chart", text: "Each puzzle shows a bar chart 📊 — the height of each bar represents the value of that number.", arr: [64, 34, 25, 12, 22] },
    { highlight: "drag", text: "Drag the numbered boxes left or right to rearrange them 🖱️ — the bar chart updates live as you move them.", arr: [12, 64, 34, 25, 22] },
    { highlight: "sort", text: "Arrange all the numbers in the order described by the puzzle (e.g. smallest to largest) ⬆️", arr: [12, 22, 64, 34, 25] },
    { highlight: "check", text: "When you're happy with the order, click 'Check Order' to submit your answer ✅", arr: [12, 22, 25, 34, 64] },
    { highlight: "result", text: "Correct order earns you XP! 🎉 Try different puzzles to earn even more — each one is only counted once.", arr: [12, 22, 25, 34, 64], correct: true },
  ];

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    getDoc(doc(db, "users", user.uid)).then(snap => {
      if (snap.exists()) setUserXP(snap.data().xp ?? 0);
    });
  }, []);

  // Init unscramble
  useEffect(() => {
    if (view === "unscramble") {
      const p = UNSCRAMBLE_PUZZLES[uIdx];
      setUBank([...p.scrambled].sort(() => Math.random() - 0.5));
      setUArranged([]);
      setUResult("idle");
    }
  }, [view, uIdx]);

  // Init sort
  useEffect(() => {
    if (view === "sort") {
      const p = SORT_PUZZLES[sIdx];
      setSArr([...p.values].sort(() => Math.random() - 0.5));
      setSResult("idle");
    }
  }, [view, sIdx]);

  // ── Award XP ──
  const awardXP = async (xp: number, title: string) => {
    if (!user) return;
    const snap = await getDoc(doc(db, "users", user.uid));
    const cur = snap.exists() ? snap.data().xp ?? 0 : 0;
    setUserXP(cur + xp);
    await updateDoc(doc(db, "users", user.uid), {
      xp: increment(xp),
      puzzlesSolved: increment(1),
      lastActive: serverTimestamp(),
      activity: arrayUnion({ icon: "🧩", text: `Puzzle: ${title}`, xp: `+${xp} XP`, time: "just now", color: "#22d3ee" }),
    });
  };

  // ── Unscramble: add word to arranged ──
  const uAddWord = (word: string, bankIdx: number) => {
    if (uResult !== "idle") return;
    setUArranged(a => [...a, word]);
    setUBank(b => b.filter((_, i) => i !== bankIdx));
  };

  // ── Unscramble: remove word back to bank ──
  const uRemoveWord = (word: string, arrIdx: number) => {
    if (uResult !== "idle") return;
    setUBank(b => [...b, word]);
    setUArranged(a => a.filter((_, i) => i !== arrIdx));
  };

  // ── Unscramble: check answer ──
  const uCheck = async () => {
    const p = UNSCRAMBLE_PUZZLES[uIdx];
    const correct = uArranged.join(" ") === p.answer.join(" ");
    setUResult(correct ? "correct" : "wrong");
    if (correct && !uSolved.has(p.id)) {
      setUSolved(s => new Set([...s, p.id]));
      await awardXP(p.xp, p.hint);
    }
  };

  // ── Sort: drag handlers ──
  const sDragStart = (idx: number) => setSDragging(idx);
  const sDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (sDragging === null || sDragging === idx) return;
    const arr = [...sArr];
    const item = arr.splice(sDragging, 1)[0];
    arr.splice(idx, 0, item);
    setSArr(arr);
    setSDragging(idx);
  };
  const sDragEnd = () => setSDragging(null);

  // ── Sort: check answer ──
  const sCheck = async () => {
    const p = SORT_PUZZLES[sIdx];
    let expected: number[];
    if (p.custom) expected = p.custom([...p.values]);
    else if (p.desc) expected = [...p.values].sort((a, b) => b - a);
    else expected = [...p.values].sort((a, b) => a - b);
    const correct = sArr.join(",") === expected.join(",");
    setSResult(correct ? "correct" : "wrong");
    if (correct && !sSolved.has(p.id)) {
      setSSolved(s => new Set([...s, p.id]));
      await awardXP(p.xp, p.title);
    }
  };

  const NAV = (
    <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 32px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <button onClick={() => view === "menu" ? navigate("/dashboard") : setView("menu")}
        style={{ color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "'DM Mono',monospace" }}>
        {view === "menu" ? "← Dashboard" : "← Puzzles"}
      </button>
      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20 }}>
        <span style={{ color: "#22d3ee" }}>Wisdom</span><span style={{ color: "white" }}>Wave</span>
      </div>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: "#fbbf24" }}>⚡ {userXP.toLocaleString()} XP</div>
    </nav>
  );

  // ════════════════════════════════
  // VIEW: MENU
  // ════════════════════════════════
  if (view === "menu") return (
    <div style={{ minHeight: "100vh", background: "#04050a", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{FONTS}</style>
      {NAV}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "56px 32px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#818cf8", letterSpacing: "0.2em", marginBottom: 12 }}>PUZZLE ZONE</div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(2rem,5vw,3rem)", color: "white", marginBottom: 12 }}>
            Choose Your <span style={{ color: "#22d3ee" }}>Challenge</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 15 }}>Solve puzzles, earn XP, sharpen your coding brain</p>
          {/* How to Play Button */}
          <button
            onClick={() => { setShowDemo(true); setDemoStep(0); setDemoTab("unscramble"); }}
            style={{
              marginTop: 20, padding: "10px 24px", borderRadius: 999,
              border: "1px solid rgba(129,140,248,0.4)",
              background: "rgba(129,140,248,0.08)",
              color: "#818cf8", fontFamily: "'DM Mono',monospace", fontSize: 13,
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(129,140,248,0.18)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(129,140,248,0.08)"; }}
          >
            ▶ How to Play (Demo)
          </button>
        </div>

        {/* ── DEMO MODAL ── */}
        {showDemo && (() => {
          const uStep = UNSCRAMBLE_DEMO_STEPS[demoStep];
          const sStep = SORT_DEMO_STEPS[demoStep];
          const maxSteps = 5;
          return (
            <div style={{
              position: "fixed", inset: 0, zIndex: 9999,
              background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
            }}>
              <div style={{
                background: "#0e1220", border: "1px solid rgba(129,140,248,0.3)",
                borderRadius: 24, padding: "32px 36px", maxWidth: 600, width: "100%",
                boxShadow: "0 24px 80px rgba(129,140,248,0.15)",
                position: "relative",
              }}>
                {/* Close */}
                <button onClick={() => setShowDemo(false)} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>

                {/* Header */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#818cf8", letterSpacing: "0.2em", marginBottom: 8 }}>HOW TO PLAY · DEMO</div>
                  <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: "white", margin: 0 }}>Puzzle Guide 🧩</h2>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
                  {(["unscramble", "sort"] as const).map(tab => (
                    <button key={tab} onClick={() => { setDemoTab(tab); setDemoStep(0); }}
                      style={{
                        padding: "8px 20px", borderRadius: 10, border: "1px solid",
                        fontFamily: "'DM Mono',monospace", fontSize: 12, cursor: "pointer",
                        background: demoTab === tab ? (tab === "unscramble" ? "rgba(34,211,238,0.12)" : "rgba(129,140,248,0.12)") : "transparent",
                        color: demoTab === tab ? (tab === "unscramble" ? "#22d3ee" : "#818cf8") : "rgba(255,255,255,0.3)",
                        borderColor: demoTab === tab ? (tab === "unscramble" ? "rgba(34,211,238,0.3)" : "rgba(129,140,248,0.3)") : "rgba(255,255,255,0.1)",
                        transition: "all 0.2s",
                      }}>
                      {tab === "unscramble" ? "🔤 Code Unscramble" : "📦 Array Sorter"}
                    </button>
                  ))}
                </div>

                {/* Step instruction */}
                <div style={{ background: "#060910", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px 20px", marginBottom: 24 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: demoTab === "unscramble" ? "#22d3ee" : "#818cf8", marginBottom: 8, letterSpacing: "0.1em" }}>STEP {demoStep + 1} OF {maxSteps}</div>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: "white", margin: 0, lineHeight: 1.6 }}>
                    {demoTab === "unscramble" ? uStep.text : sStep.text}
                  </p>
                </div>

                {/* Visual Preview */}
                {demoTab === "unscramble" ? (
                  <div style={{ marginBottom: 24 }}>
                    {/* Arranged area */}
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8, letterSpacing: "0.1em" }}>ANSWER BOX</div>
                    <div style={{
                      minHeight: 50, background: "#060910",
                      border: `1px solid ${uStep.correct ? "#34d399" : uStep.highlight === "arranged" || uStep.highlight === "check" || uStep.highlight === "result" ? "#22d3ee" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 12, padding: "10px 14px",
                      display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 16,
                      transition: "border-color 0.4s",
                    }}>
                      {uStep.arranged.length === 0
                        ? <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "rgba(255,255,255,0.15)" }}>Tokens will appear here...</span>
                        : uStep.arranged.map((word, i) => (
                          <span key={i} style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, padding: "5px 12px", background: uStep.correct ? "rgba(52,211,153,0.15)" : "rgba(34,211,238,0.1)", color: uStep.correct ? "#34d399" : "#22d3ee", border: `1px solid ${uStep.correct ? "rgba(52,211,153,0.3)" : "rgba(34,211,238,0.25)"}`, borderRadius: 8 }}>{word}</span>
                        ))
                      }
                    </div>
                    {/* Token bank */}
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8, letterSpacing: "0.1em" }}>AVAILABLE TOKENS</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {uStep.tokens.map((word, i) => (
                        <span key={i} style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, padding: "7px 14px", background: uStep.highlight === "bank" || uStep.highlight === "add" ? "rgba(34,211,238,0.08)" : "#0e1220", color: "rgba(255,255,255,0.7)", border: `1px solid ${uStep.highlight === "bank" || uStep.highlight === "add" ? "rgba(34,211,238,0.35)" : "rgba(255,255,255,0.12)"}`, borderRadius: 8, boxShadow: uStep.highlight === "bank" || uStep.highlight === "add" ? "0 0 12px rgba(34,211,238,0.2)" : "none" }}>{word}</span>
                      ))}
                      {uStep.tokens.length === 0 && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "rgba(255,255,255,0.15)" }}>All tokens placed!</span>}
                    </div>
                    {/* Result preview */}
                    {uStep.correct && (
                      <div style={{ marginTop: 16, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                        <span>🎉</span>
                        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: "#34d399" }}>Correct! +30 XP earned!</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ marginBottom: 24 }}>
                    {/* Bar chart preview */}
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8, letterSpacing: "0.1em" }}>BAR CHART</div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80, marginBottom: 12, padding: "0 4px" }}>
                      {sStep.arr.map((val, i) => {
                        const maxV = Math.max(...sStep.arr);
                        return (
                          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{val}</span>
                            <div style={{
                              width: "100%", height: `${(val / maxV) * 56}px`,
                              background: sStep.correct ? "linear-gradient(to top, #34d399, #6ee7b7)" : (sStep.highlight === "chart" ? "linear-gradient(to top, #22d3ee, #818cf8)" : "linear-gradient(to top, #818cf8, #c084fc)"),
                              borderRadius: "4px 4px 0 0", minHeight: 6, transition: "all 0.4s",
                              boxShadow: sStep.highlight === "chart" ? "0 0 12px rgba(34,211,238,0.4)" : "none",
                            }} />
                          </div>
                        );
                      })}
                    </div>
                    {/* Draggable boxes preview */}
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8, letterSpacing: "0.1em" }}>DRAG BOXES</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {sStep.arr.map((val, i) => (
                        <div key={i} style={{
                          width: 46, height: 46, display: "flex", alignItems: "center", justifyContent: "center",
                          background: sStep.highlight === "drag" && i === 0 ? "rgba(129,140,248,0.3)" : "rgba(129,140,248,0.1)",
                          border: `2px solid ${sStep.highlight === "drag" && i === 0 ? "#818cf8" : "rgba(129,140,248,0.3)"}`,
                          borderRadius: 10, fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, color: "#818cf8",
                          transform: sStep.highlight === "drag" && i === 0 ? "scale(1.12) translateY(-4px)" : "scale(1)",
                          transition: "all 0.3s",
                          boxShadow: sStep.highlight === "drag" && i === 0 ? "0 8px 24px rgba(129,140,248,0.3)" : "none",
                        }}>{val}</div>
                      ))}
                    </div>
                    {sStep.correct && (
                      <div style={{ marginTop: 14, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                        <span>🎉</span>
                        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: "#34d399" }}>Correct order! +40 XP earned!</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Step navigation */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <button onClick={() => setDemoStep(s => Math.max(0, s - 1))} disabled={demoStep === 0}
                    style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: demoStep === 0 ? "rgba(255,255,255,0.2)" : "white", fontFamily: "'DM Mono',monospace", fontSize: 13, cursor: demoStep === 0 ? "not-allowed" : "pointer" }}>
                    ← Back
                  </button>
                  {/* Step dots */}
                  <div style={{ display: "flex", gap: 6 }}>
                    {Array.from({ length: maxSteps }).map((_, i) => (
                      <div key={i} onClick={() => setDemoStep(i)} style={{ width: 8, height: 8, borderRadius: "50%", background: i === demoStep ? (demoTab === "unscramble" ? "#22d3ee" : "#818cf8") : "rgba(255,255,255,0.15)", cursor: "pointer", transition: "all 0.2s" }} />
                    ))}
                  </div>
                  {demoStep < maxSteps - 1 ? (
                    <button onClick={() => setDemoStep(s => Math.min(maxSteps - 1, s + 1))}
                      style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: demoTab === "unscramble" ? "#22d3ee" : "#818cf8", color: "#04050a", fontFamily: "'DM Mono',monospace", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>
                      Next →
                    </button>
                  ) : (
                    <button onClick={() => { setShowDemo(false); setView(demoTab); }}
                      style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#34d399", color: "#04050a", fontFamily: "'Syne',sans-serif", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>
                      Play Now! 🎮
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Unscramble Card */}
          <button onClick={() => setView("unscramble")}
            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = "#22d3ee"; el.style.transform = "translateY(-4px)"; el.style.boxShadow = "0 12px 40px rgba(34,211,238,0.15)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = "rgba(34,211,238,0.15)"; el.style.transform = "translateY(0)"; el.style.boxShadow = "none"; }}
            style={{ textAlign: "left", background: "#0e1220", border: "1px solid rgba(34,211,238,0.15)", borderRadius: 20, padding: "32px 28px", cursor: "pointer", transition: "all 0.25s ease", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: "radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)", transform: "translate(30px,-30px)" }} />
            <div style={{ fontSize: 44, marginBottom: 16 }}>🔤</div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: "white", marginBottom: 8 }}>Code Unscramble</h2>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 20, lineHeight: 1.5 }}>
              Rearrange jumbled code tokens into the correct order
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#22d3ee", background: "rgba(34,211,238,0.1)", padding: "4px 12px", borderRadius: 999, border: "1px solid rgba(34,211,238,0.2)" }}>
                {UNSCRAMBLE_PUZZLES.length} puzzles · 30-50 XP
              </span>
              <span style={{ color: "#22d3ee", fontSize: 18 }}>→</span>
            </div>
            {uSolved.size > 0 && (
              <div style={{ marginTop: 12, fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#34d399" }}>
                ✓ {uSolved.size}/{UNSCRAMBLE_PUZZLES.length} solved
              </div>
            )}
          </button>

          {/* Array Sort Card */}
          <button onClick={() => setView("sort")}
            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = "#818cf8"; el.style.transform = "translateY(-4px)"; el.style.boxShadow = "0 12px 40px rgba(129,140,248,0.15)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = "rgba(129,140,248,0.15)"; el.style.transform = "translateY(0)"; el.style.boxShadow = "none"; }}
            style={{ textAlign: "left", background: "#0e1220", border: "1px solid rgba(129,140,248,0.15)", borderRadius: 20, padding: "32px 28px", cursor: "pointer", transition: "all 0.25s ease", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: "radial-gradient(circle, rgba(129,140,248,0.1) 0%, transparent 70%)", transform: "translate(30px,-30px)" }} />
            <div style={{ fontSize: 44, marginBottom: 16 }}>📦</div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: "white", marginBottom: 8 }}>Array Sorter</h2>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 20, lineHeight: 1.5 }}>
              Drag and drop array elements into the correct sorted order
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#818cf8", background: "rgba(129,140,248,0.1)", padding: "4px 12px", borderRadius: 999, border: "1px solid rgba(129,140,248,0.2)" }}>
                {SORT_PUZZLES.length} puzzles · 35-50 XP
              </span>
              <span style={{ color: "#818cf8", fontSize: 18 }}>→</span>
            </div>
            {sSolved.size > 0 && (
              <div style={{ marginTop: 12, fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#34d399" }}>
                ✓ {sSolved.size}/{SORT_PUZZLES.length} solved
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════
  // VIEW: UNSCRAMBLE
  // ════════════════════════════════
  if (view === "unscramble") {
    const p = UNSCRAMBLE_PUZZLES[uIdx];
    const alreadySolved = uSolved.has(p.id);
    return (
      <div style={{ minHeight: "100vh", background: "#04050a", fontFamily: "'DM Sans',sans-serif" }}>
        <style>{FONTS}</style>
        {NAV}
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px 80px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
            <div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#22d3ee", letterSpacing: "0.15em", marginBottom: 6 }}>CODE UNSCRAMBLE</div>
              <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: "white" }}>
                Puzzle {uIdx + 1} of {UNSCRAMBLE_PUZZLES.length}
              </h2>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {UNSCRAMBLE_PUZZLES.map((pu, i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: uSolved.has(pu.id) ? "#34d399" : i === uIdx ? "#22d3ee" : "rgba(255,255,255,0.1)",
                  transition: "all 0.3s",
                }} />
              ))}
            </div>
          </div>

          {/* Puzzle card */}
          <div style={{ background: "#0e1220", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "28px 32px", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#818cf8", background: "rgba(129,140,248,0.1)", padding: "3px 10px", borderRadius: 6 }}>{p.lang}</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#fbbf24" }}>+{p.xp} XP</span>
              {alreadySolved && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#34d399" }}>✓ Already solved</span>}
            </div>
            <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 17, color: "white", marginBottom: 6 }}>Arrange the tokens in correct order:</p>
            <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 0 }}>💡 {p.hint}</p>
          </div>

          {/* Answer slots */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 10 }}>YOUR ANSWER</div>
            <div style={{
              minHeight: 60, background: "#060910",
              border: `1px solid ${uResult === "correct" ? "#34d399" : uResult === "wrong" ? "#fb7185" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 14, padding: "12px 16px",
              display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
              transition: "border-color 0.3s",
            }}>
              {uArranged.length === 0 && (
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "rgba(255,255,255,0.15)" }}>Click tokens below to add them here...</span>
              )}
              {uArranged.map((word, i) => (
                <button key={i} onClick={() => uRemoveWord(word, i)}
                  style={{
                    fontFamily: "'DM Mono',monospace", fontSize: 13, padding: "6px 14px",
                    background: uResult === "correct" ? "rgba(52,211,153,0.15)" : "rgba(34,211,238,0.12)",
                    color: uResult === "correct" ? "#34d399" : "#22d3ee",
                    border: `1px solid ${uResult === "correct" ? "rgba(52,211,153,0.3)" : "rgba(34,211,238,0.25)"}`,
                    borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                  }}>
                  {word}
                </button>
              ))}
            </div>
          </div>

          {/* Token bank */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 10 }}>AVAILABLE TOKENS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {uBank.map((word, i) => (
                <button key={i} onClick={() => uAddWord(word, i)}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#22d3ee"; (e.currentTarget as HTMLButtonElement).style.color = "#22d3ee"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)"; }}
                  style={{
                    fontFamily: "'DM Mono',monospace", fontSize: 13, padding: "8px 16px",
                    background: "#0e1220", color: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                  }}>
                  {word}
                </button>
              ))}
            </div>
          </div>

          {/* Result message */}
          {uResult === "correct" && (
            <div style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>🎉</span>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: "#34d399" }}>Correct! {alreadySolved ? "(Already solved — no XP)" : `+${p.xp} XP earned!`}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Answer: {p.answer.join(" ")}</div>
              </div>
            </div>
          )}
          {uResult === "wrong" && (
            <div style={{ background: "rgba(251,113,133,0.08)", border: "1px solid rgba(251,113,133,0.2)", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>❌</span>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: "#fb7185" }}>Not quite! Try rearranging the tokens.</div>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: 12 }}>
            {uResult === "idle" ? (
              <>
                <button onClick={uCheck} disabled={uArranged.length === 0}
                  style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, cursor: uArranged.length > 0 ? "pointer" : "not-allowed", background: uArranged.length > 0 ? "#22d3ee" : "rgba(255,255,255,0.05)", color: uArranged.length > 0 ? "#04050a" : "rgba(255,255,255,0.2)", transition: "all 0.2s" }}>
                  Check Answer
                </button>
                <button onClick={() => { setUBank([...p.scrambled].sort(() => Math.random() - 0.5)); setUArranged([]); }}
                  style={{ padding: "14px 20px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.5)", fontFamily: "'DM Mono',monospace", fontSize: 13, cursor: "pointer" }}>
                  Reset
                </button>
              </>
            ) : (
              <>
                {uIdx < UNSCRAMBLE_PUZZLES.length - 1 && (
                  <button onClick={() => setUIdx(i => i + 1)}
                    style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer", background: "#22d3ee", color: "#04050a" }}>
                    Next Puzzle →
                  </button>
                )}
                <button onClick={() => { setUResult("idle"); setUBank([...p.scrambled].sort(() => Math.random() - 0.5)); setUArranged([]); }}
                  style={{ flex: 1, padding: "14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "white", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                  Try Again
                </button>
              </>
            )}
          </div>

          {/* Puzzle navigation */}
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
            {UNSCRAMBLE_PUZZLES.map((pu, i) => (
              <button key={i} onClick={() => setUIdx(i)}
                style={{
                  width: 36, height: 36, borderRadius: 8, border: "1px solid",
                  fontFamily: "'DM Mono',monospace", fontSize: 12, cursor: "pointer",
                  background: uSolved.has(pu.id) ? "rgba(52,211,153,0.15)" : i === uIdx ? "rgba(34,211,238,0.15)" : "transparent",
                  color: uSolved.has(pu.id) ? "#34d399" : i === uIdx ? "#22d3ee" : "rgba(255,255,255,0.3)",
                  borderColor: uSolved.has(pu.id) ? "rgba(52,211,153,0.3)" : i === uIdx ? "rgba(34,211,238,0.3)" : "rgba(255,255,255,0.1)",
                }}>
                {uSolved.has(pu.id) ? "✓" : i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════
  // VIEW: ARRAY SORT
  // ════════════════════════════════
  if (view === "sort") {
    const p = SORT_PUZZLES[sIdx];
    const alreadySolved = sSolved.has(p.id);
    const maxVal = Math.max(...sArr);
    return (
      <div style={{ minHeight: "100vh", background: "#04050a", fontFamily: "'DM Sans',sans-serif" }}>
        <style>{FONTS}</style>
        {NAV}
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px 80px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
            <div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#818cf8", letterSpacing: "0.15em", marginBottom: 6 }}>ARRAY SORTER</div>
              <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: "white" }}>
                Puzzle {sIdx + 1} of {SORT_PUZZLES.length}
              </h2>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {SORT_PUZZLES.map((sp, i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: sSolved.has(sp.id) ? "#34d399" : i === sIdx ? "#818cf8" : "rgba(255,255,255,0.1)",
                }} />
              ))}
            </div>
          </div>

          {/* Puzzle card */}
          <div style={{ background: "#0e1220", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "24px 28px", marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: "white" }}>{p.title}</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#fbbf24" }}>+{p.xp} XP</span>
              {alreadySolved && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#34d399" }}>✓ Already solved</span>}
            </div>
            <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>💡 {p.hint}</p>
          </div>

          {/* Visual bar chart + drag */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 16 }}>DRAG TO REARRANGE</div>

            {/* Bar chart visualization */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140, marginBottom: 16, padding: "0 4px" }}>
              {sArr.map((val, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{val}</span>
                  <div style={{
                    width: "100%",
                    height: `${(val / maxVal) * 100}px`,
                    background: sResult === "correct"
                      ? "linear-gradient(to top, #34d399, #6ee7b7)"
                      : `linear-gradient(to top, #818cf8, #c084fc)`,
                    borderRadius: "6px 6px 0 0",
                    transition: "height 0.3s ease, background 0.3s",
                    minHeight: 8,
                  }} />
                </div>
              ))}
            </div>

            {/* Draggable boxes */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {sArr.map((val, i) => (
                <div
                  key={i}
                  draggable
                  onDragStart={() => sDragStart(i)}
                  onDragOver={(e) => sDragOver(e, i)}
                  onDragEnd={sDragEnd}
                  style={{
                    width: 54, height: 54,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: sDragging === i ? "rgba(129,140,248,0.3)" : "rgba(129,140,248,0.1)",
                    border: `2px solid ${sDragging === i ? "#818cf8" : "rgba(129,140,248,0.3)"}`,
                    borderRadius: 12,
                    fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: "#818cf8",
                    cursor: "grab", transition: "all 0.15s",
                    transform: sDragging === i ? "scale(1.1)" : "scale(1)",
                    userSelect: "none",
                  }}>
                  {val}
                </div>
              ))}
            </div>
          </div>

          {/* Result */}
          {sResult === "correct" && (
            <div style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>🎉</span>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: "#34d399" }}>
                Correct! {alreadySolved ? "(Already solved — no XP)" : `+${p.xp} XP earned!`}
              </div>
            </div>
          )}
          {sResult === "wrong" && (
            <div style={{ background: "rgba(251,113,133,0.08)", border: "1px solid rgba(251,113,133,0.2)", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>❌</span>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: "#fb7185" }}>Not sorted correctly — keep trying!</div>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: 12 }}>
            {sResult === "idle" ? (
              <>
                <button onClick={sCheck}
                  style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer", background: "#818cf8", color: "#04050a" }}>
                  Check Order
                </button>
                <button onClick={() => setSArr([...p.values].sort(() => Math.random() - 0.5))}
                  style={{ padding: "14px 20px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.5)", fontFamily: "'DM Mono',monospace", fontSize: 13, cursor: "pointer" }}>
                  Shuffle
                </button>
              </>
            ) : (
              <>
                {sIdx < SORT_PUZZLES.length - 1 && sResult === "correct" && (
                  <button onClick={() => setSIdx(i => i + 1)}
                    style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer", background: "#818cf8", color: "#04050a" }}>
                    Next Puzzle →
                  </button>
                )}
                <button onClick={() => { setSResult("idle"); setSArr([...p.values].sort(() => Math.random() - 0.5)); }}
                  style={{ flex: 1, padding: "14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "white", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                  Try Again
                </button>
              </>
            )}
          </div>

          {/* Puzzle nav */}
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>
            {SORT_PUZZLES.map((sp, i) => (
              <button key={i} onClick={() => setSIdx(i)}
                style={{
                  width: 36, height: 36, borderRadius: 8, border: "1px solid",
                  fontFamily: "'DM Mono',monospace", fontSize: 12, cursor: "pointer",
                  background: sSolved.has(sp.id) ? "rgba(52,211,153,0.15)" : i === sIdx ? "rgba(129,140,248,0.15)" : "transparent",
                  color: sSolved.has(sp.id) ? "#34d399" : i === sIdx ? "#818cf8" : "rgba(255,255,255,0.3)",
                  borderColor: sSolved.has(sp.id) ? "rgba(52,211,153,0.3)" : i === sIdx ? "rgba(129,140,248,0.3)" : "rgba(255,255,255,0.1)",
                }}>
                {sSolved.has(sp.id) ? "✓" : i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}