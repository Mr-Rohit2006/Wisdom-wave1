import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const FLOATING_WORDS = [
  "React",
  "TypeScript",
  "Node.js",
  "Python",
  "SQL",
  "Git",
  "APIs",
  "CSS",
  "Algorithms",
  "Docker",
  "GraphQL",
  "Rust",
  "Next.js",
  "Redis",
  "TDD",
];

const FloatingWord = ({
  word,
  style,
}: {
  word: string;
  style: React.CSSProperties;
}) => (
  <span
    className="absolute text-white/[0.06] font-black select-none pointer-events-none"
    style={{
      fontSize: "clamp(1.1rem, 2.5vw, 2.2rem)",
      letterSpacing: "0.08em",
      fontFamily: "'DM Mono', 'Fira Mono', monospace",
      ...style,
    }}
  >
    {word}
  </span>
);

const GlowOrb = ({
  cx,
  cy,
  color,
  size,
  opacity,
}: {
  cx: string;
  cy: string;
  color: string;
  size: string;
  opacity: number;
}) => (
  <div
    className="absolute rounded-full pointer-events-none"
    style={{
      left: cx,
      top: cy,
      width: size,
      height: size,
      background: color,
      opacity,
      filter: "blur(80px)",
      transform: "translate(-50%, -50%)",
    }}
  />
);

export default function LandingPage() {
  const navigate = useNavigate();
  const cursorRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: -200, y: -200 });
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  const wordPositions: React.CSSProperties[] = [
    { top: "8%", left: "3%" },
    { top: "14%", right: "4%" },
    { top: "28%", left: "1%" },
    { top: "22%", right: "8%" },
    { top: "72%", left: "2%" },
    { top: "65%", right: "2%" },
    { top: "82%", left: "12%" },
    { top: "78%", right: "10%" },
    { top: "45%", left: "0%" },
    { top: "50%", right: "1%" },
    { top: "88%", left: "30%" },
    { top: "6%", left: "35%" },
    { top: "90%", right: "25%" },
    { top: "35%", right: "0%" },
    { top: "55%", left: "5%" },
  ];

  return (
    <div
      className="relative h-screen w-screen overflow-hidden flex items-center justify-center"
      style={{ background: "#050608" }}
    >
      {/* ── Custom cursor ── */}
      <div
        ref={cursorRef}
        className="fixed z-50 pointer-events-none transition-transform duration-100"
        style={{
          left: mousePos.x,
          top: mousePos.y,
          transform: `translate(-50%, -50%) scale(${hovered ? 2.2 : 1})`,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: hovered
            ? "rgba(56,189,248,0.6)"
            : "rgba(255,255,255,0.9)",
          transition: "transform 0.2s ease, background 0.2s ease",
          mixBlendMode: "difference",
        }}
      />

      {/* ── YouTube bg ── */}
      <video
        className="absolute inset-0 w-full h-full pointer-events-none object-cover"
        style={{
          transform: "scale(1.6)",
          filter: "brightness(0.18) saturate(0.6)",
        }}
        src="/bg-video.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      {/* ── Ambient orbs ── */}
      <GlowOrb cx="20%" cy="25%" color="#38bdf8" size="500px" opacity={0.07} />
      <GlowOrb cx="80%" cy="70%" color="#818cf8" size="420px" opacity={0.07} />
      <GlowOrb cx="50%" cy="50%" color="#0ea5e9" size="300px" opacity={0.04} />

      {/* ── Floating tech words ── */}
      {FLOATING_WORDS.map((w, i) => (
        <FloatingWord key={w} word={w} style={wordPositions[i]} />
      ))}

      {/* ── Subtle grid ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse 70% 70% at 50% 50%, black 20%, transparent 80%)",
        }}
      />

      {/* ── Main content ── */}
      <div
        className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl"
        style={{ gap: "0" }}
      >
        {/* Eyebrow */}
        <div
          className="flex items-center gap-2 mb-8"
          style={{
            border: "1px solid rgba(56,189,248,0.2)",
            borderRadius: "999px",
            padding: "6px 18px",
            background: "rgba(56,189,248,0.06)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#38bdf8",
              display: "inline-block",
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "0.68rem",
              letterSpacing: "0.18em",
              color: "#38bdf8",
              textTransform: "uppercase",
            }}
          >
            Learn · Build · Ship
          </span>
        </div>

        {/* Heading */}
        <h1
          style={{
            fontFamily: "'Syne', 'DM Sans', sans-serif",
            fontWeight: 800,
            fontSize: "clamp(3.2rem, 8vw, 6.5rem)",
            lineHeight: 1.0,
            letterSpacing: "-0.03em",
            color: "#fff",
            marginBottom: "1.5rem",
          }}
        >
          Wisdom
          <br />
          <span
            style={{
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              backgroundImage:
                "linear-gradient(90deg, #38bdf8 0%, #818cf8 60%, #c084fc 100%)",
            }}
          >
            Wave
          </span>
        </h1>

        {/* Sub */}
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "clamp(1rem, 2vw, 1.2rem)",
            color: "rgba(255,255,255,0.45)",
            maxWidth: 480,
            lineHeight: 1.7,
            marginBottom: "3.2rem",
            fontWeight: 400,
          }}
        >
          Master coding through real-world challenges, structured paths, and
          instant feedback — at your own pace.
        </p>

        {/* CTA row */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => navigate("/register")}
            style={{
              position: "relative",
              padding: "14px 36px",
              borderRadius: 8,
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: "0.85rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              background: "linear-gradient(135deg, #38bdf8, #818cf8)",
              color: "#050608",
              border: "none",
              cursor: "none",
              overflow: "hidden",
              transition: "opacity 0.2s, transform 0.15s",
              boxShadow:
                "0 0 32px rgba(56,189,248,0.25), 0 2px 8px rgba(0,0,0,0.5)",
            }}
            onMouseDown={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.transform =
                "scale(0.97)")
            }
            onMouseUp={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.transform =
                "scale(1)")
            }
          >
            Get Started →
          </button>
        </div>

        {/* Social proof strip */}
        <div
          className="flex items-center gap-6 mt-14"
          style={{
            color: "rgba(255,255,255,0.22)",
            fontSize: "0.72rem",
            letterSpacing: "0.14em",
            fontFamily: "'DM Mono', monospace",
            textTransform: "uppercase",
          }}
        >
          <span>4.9 ★ rating</span>
          <span
            style={{
              width: 1,
              height: 14,
              background: "rgba(255,255,255,0.12)",
              display: "inline-block",
            }}
          />
          <span>12k+ learners</span>
          <span
            style={{
              width: 1,
              height: 14,
              background: "rgba(255,255,255,0.12)",
              display: "inline-block",
            }}
          />
          <span>Real projects</span>
        </div>
      </div>

      {/* ── Bottom fade ── */}
      <div
        className="absolute bottom-0 left-0 w-full pointer-events-none"
        style={{
          height: 120,
          background: "linear-gradient(to top, #050608, transparent)",
        }}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&family=DM+Mono:wght@400&display=swap');
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        * { cursor: none !important; }
      `}</style>
    </div>
  );
}
