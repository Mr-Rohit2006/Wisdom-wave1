import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, rtdb } from "../firebase";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { ref, set, get, onValue, off, remove, push } from "firebase/database";
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
import {
  JS_OUTPUT_TOPICS,
  JS_BUG_TOPICS,
  JS_FILL_TOPICS,
} from "../data/javascriptExtraModes";

// pull random question from all topics
function getRandomQuestions(count: number) {
  const allTopics = [
    ...JAVA_OUTPUT_TOPICS,
    ...JAVA_BUG_TOPICS,
    ...JAVA_FILL_TOPICS,
    ...PYTHON_OUTPUT_TOPICS,
    ...PYTHON_BUG_TOPICS,
    ...PYTHON_FILL_TOPICS,
    ...JS_OUTPUT_TOPICS,
    ...JS_BUG_TOPICS,
    ...JS_FILL_TOPICS,
  ];
  const allQs: {
    question: string;
    options: string[];
    answer: string;
    topic: string;
  }[] = [];
  allTopics.forEach((t) => {
    t.questions.forEach((q) => {
      allQs.push({
        question: q.question,
        options: q.options,
        answer: q.answer,
        topic: t.name,
      });
    });
  });
  const shuffled = allQs.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

const TOTAL_QUESTIONS = 10;
const TIME_PER_Q = 15;
type Phase = "lobby" | "waiting" | "battle" | "result";

interface BattleRoom {
  host: string;
  hostName: string;
  guest?: string;
  guestName?: string;
  questions: {
    question: string;
    options: string[];
    answer: string;
    topic: string;
  }[];
  hostScore: number;
  guestScore: number;
  hostDone: boolean;
  guestDone: boolean;
  winner?: string;
  status?: string;
  createdAt: number;
}

export default function Battle() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [phase, setPhase] = useState<Phase>("lobby");
  const [roomId, setRoomId] = useState<string>("");
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState<BattleRoom | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [username, setUsername] = useState("Player");

  // Battle state
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [answered, setAnswered] = useState(false);
  const [animIn, setAnimIn] = useState(false);
  const [mvAnswers, setMvAnswers] = useState<boolean[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roomRef = useRef<string>("");

  // FIXED: Added missing enemyScore variable
  const enemyScore = room
    ? isHost
      ? room.guestScore || 0
      : room.hostScore || 0
    : 0;

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUsername(data.username || "Player");
      }
    });
    setTimeout(() => {
      setAnimIn(true);
    }, 100);
    return () => {
      stopTimer();
    };
  }, [user, navigate]);

  useEffect(() => {
    if (!roomId) return;
    const rRef = ref(rtdb, "battles/" + roomId);
    onValue(rRef, (snap) => {
      const data = snap.val() as BattleRoom;
      if (!data) return;
      setRoom(data);
      if (data.status === "active" && phase === "waiting") {
        setPhase("battle");
        setCurrentQ(0);
        setTimeLeft(TIME_PER_Q);
        startTimer(roomId, data, 0, 0);
      }
      if (data.status === "done" && phase === "battle") {
        stopTimer();
        setPhase("result");
        if (user && data.winner === user.uid) {
          updateDoc(doc(db, "users", user.uid), {
            battleWon: increment(1),
            xp: increment(50),
          });
        }
      }
    });
    return () => {
      off(rRef);
    };
  }, [roomId, phase, user]);

  const createRoom = async () => {
    console.log(user)
    if (!user) return;
    const questions = getRandomQuestions(TOTAL_QUESTIONS);
    const newRef = push(ref(rtdb, "battles"));
    const id = newRef.key!;
    const roomData: BattleRoom = {
      host: user.uid,
      hostName: username,
      status: "waiting",
      questions,
      hostScore: 0,
      guestScore: 0,
      hostDone: false,
      guestDone: false,
      createdAt: Date.now(),
    };
    await set(newRef, roomData);
    setRoomId(id);
    roomRef.current = id;
    setIsHost(true);
    setPhase("waiting");
  };

  const joinRoom = async () => {
    if (!user || !joinCode.trim()) return;
    const code = joinCode.trim();
    const snap = await get(ref(rtdb, "battles/" + code));
    if (!snap.exists()) {
      alert("Room not found!");
      return;
    }
    const data = snap.val() as BattleRoom;
    if (data.status !== "waiting") {
      alert("Battle already in progress!");
      return;
    }
    if (data.guest) {
      alert("Room is full!");
      return;
    }
    await set(ref(rtdb, "battles/" + code + "/guest"), user.uid);
    await set(ref(rtdb, "battles/" + code + "/guestName"), username);
    await set(ref(rtdb, "battles/" + code + "/status"), "active");
    setRoomId(code);
    roomRef.current = code;
    setIsHost(false);
    setPhase("waiting");
  };

  const startTimer = (
    rid: string,
    roomData: BattleRoom,
    qIndex: number,
    currentScore: number,
  ) => {
    stopTimer();
    setTimeLeft(TIME_PER_Q);
    let t = TIME_PER_Q;
    timerRef.current = setInterval(() => {
      t--;
      setTimeLeft(t);
      if (t <= 0) {
        stopTimer();
        handleNext(rid, roomData, qIndex, currentScore, null);
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleAnswer = (option: string) => {
    if (answered || !room) return;
    stopTimer();
    setAnswered(true);
    setSelected(option);
    const correct = option === room.questions[currentQ].answer;
    const newScore = correct ? score + 1 : score;
    if (correct) setScore(newScore);
    setMvAnswers((prev) => [...prev, correct]);

    setTimeout(() => {
      handleNext(roomId, room, currentQ, newScore, option);
    }, 900);
  };

  const handleNext = async (
    rid: string,
    roomData: BattleRoom,
    qIndex: number,
    finalScore: number,
    chosen: string | null,
  ) => {
    const nextQ = qIndex + 1;
    setAnswered(false);
    setSelected(null);

    if (nextQ >= TOTAL_QUESTIONS) {
      const scoreField = isHost ? "hostScore" : "guestScore";
      const doneField = isHost ? "hostDone" : "guestDone";

      await set(ref(rtdb, `battles/${rid}/${scoreField}`), finalScore);
      await set(ref(rtdb, `battles/${rid}/${doneField}`), true);

      const snap = await get(ref(rtdb, "battles/" + rid));
      const latest = snap.val() as BattleRoom;

      // FIXED: Proper bothDone check
      if (latest.hostDone && latest.guestDone) {
        let winner = "";
        if (latest.hostScore > latest.guestScore) winner = latest.host;
        else if (latest.guestScore > latest.hostScore) winner = latest.guest!;
        else winner = "draw";

        await set(ref(rtdb, `battles/${rid}/winner`), winner);
        await set(ref(rtdb, `battles/${rid}/status`), "done");
      }
      return;
    }
    setCurrentQ(nextQ);
    setTimeLeft(TIME_PER_Q);
    startTimer(rid, roomData, nextQ, finalScore);
  };

  const leaveRoom = async () => {
    stopTimer();
    if (roomId && isHost) {
      try {
        await remove(ref(rtdb, "battles/" + roomId));
      } catch (e) {}
    }
    setPhase("lobby");
    setRoomId("");
    setRoom(null);
    setCurrentQ(0);
    setScore(0);
    setMvAnswers([]);
  };

  const myFinalScore = score;
  const theirFinalScore = enemyScore;
  const iWon = room?.winner === user?.uid;
  const isDraw = room?.winner === "draw";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#04050a",
        color: "white",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
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
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.4)",
            cursor: "pointer",
          }}
        >
          ← Dashboard
        </button>
        <div style={{ fontWeight: 800, fontSize: 20 }}>
          <span style={{ color: "#22d3ee" }}>Wisdom</span>Wave
        </div>
        <div style={{ color: "#fb7185" }}>⚔ Battle</div>
      </nav>

      <div
        style={{ maxWidth: 700, margin: "0 auto", padding: "48px 24px 100px" }}
      >
        {phase === "lobby" && (
          <div
            style={{
              opacity: animIn ? 1 : 0,
              pointerEvents: animIn ? "auto" : "none",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "#fb7185",
                  letterSpacing: "0.25em",
                  marginBottom: 14,
                }}
              >
                1V1 REAL-TIME
              </div>
              <h1
                style={{ fontSize: "clamp(2.4rem,6vw,4rem)", marginBottom: 12 }}
              >
                Battle <span style={{ color: "#fb7185" }}>Mode</span>
              </h1>
              <p style={{ color: "rgba(255,255,255,0.3)" }}>
                {TOTAL_QUESTIONS} questions · {TIME_PER_Q}s per question · Most
                correct wins
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
              }}
            >
              <div
                style={{
                  background: "rgba(251,113,133,0.05)",
                  border: "1px solid rgba(251,113,133,0.2)",
                  borderRadius: 20,
                  padding: 32,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 40 }}>🏠</div>
                <div
                  style={{ fontSize: 20, fontWeight: 800, margin: "10px 0" }}
                >
                  Create Room
                </div>
                <button
                  onClick={createRoom}
                  style={{
                    marginTop: 8,
                    padding: "12px 28px",
                    borderRadius: 12,
                    background: "#fb7185",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Create Battle
                </button>
              </div>
              <div
                style={{
                  background: "rgba(34,211,238,0.05)",
                  border: "1px solid rgba(34,211,238,0.2)",
                  borderRadius: 20,
                  padding: 32,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 40 }}>🎯</div>
                <div
                  style={{ fontSize: 20, fontWeight: 800, margin: "10px 0" }}
                >
                  Join Room
                </div>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter room code"
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)",
                    color: "white",
                    marginBottom: 10,
                  }}
                />
                <button
                  onClick={joinRoom}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 12,
                    background: "#22d3ee",
                    color: "#04050a",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Join Battle
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === "waiting" && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 24 }}>⏳</div>
            <h2 style={{ fontSize: 28, marginBottom: 12 }}>
              {isHost ? "Waiting for opponent..." : "Joining battle..."}
            </h2>
            {isHost && roomId && (
              <div style={{ marginTop: 24 }}>
                <div>SHARE THIS CODE</div>
                <div
                  style={{
                    marginTop: 12,
                    padding: "16px 36px",
                    borderRadius: 14,
                    border: "2px dashed #fb7185",
                    display: "inline-block",
                    fontSize: 28,
                    color: "#fb7185",
                  }}
                >
                  {roomId}
                </div>
              </div>
            )}
            <button
              onClick={leaveRoom}
              style={{
                marginTop: 32,
                padding: "10px 24px",
                background: "transparent",
                color: "rgba(255,255,255,0.4)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {phase === "battle" && room && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 28,
                background: "rgba(14,18,32,0.7)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16,
                padding: "16px 24px",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 13,
                    color: "#22d3ee",
                    marginBottom: 4,
                  }}
                >
                  {username} (YOU)
                </div>
                <div
                  style={{ fontSize: 32, fontWeight: 900, color: "#22d3ee" }}
                >
                  {score}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, opacity: 0.3, marginBottom: 6 }}>
                  Q {currentQ + 1}/{TOTAL_QUESTIONS}
                </div>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      timeLeft <= 5
                        ? "rgba(251,113,133,0.15)"
                        : "rgba(255,255,255,0.05)",
                    border:
                      timeLeft <= 5
                        ? "2px solid #fb7185"
                        : "2px solid rgba(255,255,255,0.1)",
                    fontWeight: 700,
                  }}
                >
                  {timeLeft}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 13,
                    color: "#fb7185",
                    marginBottom: 4,
                  }}
                >
                  OPPONENT
                </div>
                <div
                  style={{ fontSize: 32, fontWeight: 900, color: "#fb7185" }}
                >
                  {enemyScore}
                </div>
              </div>
            </div>

            <div
              style={{
                height: 4,
                background: "rgba(255,255,255,0.05)",
                borderRadius: 4,
                overflow: "hidden",
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${((currentQ + 1) / TOTAL_QUESTIONS) * 100}%`,
                  background: "linear-gradient(90deg,#22d3ee,#818cf8)",
                }}
              />
            </div>

            <div
              style={{
                fontSize: 11,
                opacity: 0.3,
                marginBottom: 16,
                letterSpacing: "0.1em",
              }}
            >
              {room.questions[currentQ]?.topic}
            </div>
            <div
              style={{
                background: "rgba(14,18,32,0.7)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 18,
                padding: "28px",
                marginBottom: 20,
                whiteSpace: "pre-wrap",
                lineHeight: 1.7,
              }}
            >
              {room.questions[currentQ]?.question}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              {room.questions[currentQ]?.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(opt)}
                  disabled={answered}
                  style={{
                    padding: "16px 20px",
                    borderRadius: 14,
                    background:
                      selected === opt ? "#22d3ee" : "rgba(14,18,32,0.7)",
                    color: selected === opt ? "#04050a" : "white",
                    border: "1px solid rgba(255,255,255,0.08)",
                    cursor: answered ? "default" : "pointer",
                    textAlign: "left",
                  }}
                >
                  {["A", "B", "C", "D"][i]} {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "result" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>
              {isDraw ? "🤝" : iWon ? "🏆" : "😵"}
            </div>
            <h2 style={{ fontSize: "clamp(2rem,5vw,3.2rem)", marginBottom: 8 }}>
              {isDraw ? "It's a Draw!" : iWon ? "You Won!" : "You Lost!"}
            </h2>
            <p style={{ opacity: 0.3, marginBottom: 36 }}>
              {iWon ? "+50 XP earned!" : "Better luck next time!"}
            </p>

            <div
              style={{
                display: "flex",
                gap: 16,
                justifyContent: "center",
                marginBottom: 36,
              }}
            >
              <div
                style={{
                  flex: 1,
                  background: "rgba(34,211,238,0.08)",
                  border: "1px solid rgba(34,211,238,0.2)",
                  borderRadius: 18,
                  padding: "28px 20px",
                }}
              >
                <div
                  style={{ fontSize: 48, fontWeight: 900, color: "#22d3ee" }}
                >
                  {myFinalScore}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#22d3ee",
                    marginTop: 10,
                    fontWeight: 700,
                  }}
                >
                  YOU
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  background: "rgba(251,113,133,0.08)",
                  border: "1px solid rgba(251,113,133,0.2)",
                  borderRadius: 18,
                  padding: "28px 20px",
                }}
              >
                <div
                  style={{ fontSize: 48, fontWeight: 900, color: "#fb7185" }}
                >
                  {theirFinalScore}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#fb7185",
                    marginTop: 10,
                    fontWeight: 700,
                  }}
                >
                  OPPONENT
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => {
                  leaveRoom();
                  setPhase("lobby");
                }}
                style={{
                  padding: "13px 28px",
                  borderRadius: 12,
                  background: "linear-gradient(135deg,#fb7185,#f97316)",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                Battle Again
              </button>
              <button
                onClick={() => {
                  leaveRoom();
                  navigate("/dashboard");
                }}
                style={{
                  padding: "13px 28px",
                  borderRadius: 12,
                  background: "transparent",
                  color: "rgba(255,255,255,0.4)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  cursor: "pointer",
                }}
              >
                Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
