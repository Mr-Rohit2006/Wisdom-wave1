import { db } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { LANGUAGES } from "../data/arcadeQuestions";

// ─── TYPES ───────────────────────────────────────────────────
export interface ModuleProgress {
  completed: number;   // topics done in this language
  total: number;       // total MCQ topics in this language
  percent: number;     // 0-100
  topicsDone: string[];
}

export interface ActivityItem {
  icon: string;
  text: string;
  xp: string;
  time: string;
  color: string;
}

// ─── HELPERS ─────────────────────────────────────────────────
function getTodayStr(): string {
  // Use local date (not UTC) — avoids timezone mismatch e.g. India IST
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// XP → Level formula: level = floor(sqrt(xp / 50)), min 1
export function calcLevel(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 50)));
}

// XP thresholds for current and next level
export function levelBounds(level: number): { current: number; next: number } {
  const current = level > 1 ? Math.pow(level - 1, 2) * 50 : 0;
  const next = Math.pow(level, 2) * 50;
  return { current, next };
}

// ─── BUILD MODULE PROGRESS ───────────────────────────────────
// Builds progress for ALL languages based on which topicIds are done
export function buildModuleProgress(
  topicsDone: string[]
): Record<string, ModuleProgress> {
  const progress: Record<string, ModuleProgress> = {};
  for (const lang of LANGUAGES) {
    const total = lang.topics.length;
    const done = topicsDone.filter((id) =>
      lang.topics.some((t) => t.id === id)
    );
    progress[lang.id] = {
      completed: done.length,
      total,
      percent: total > 0 ? Math.round((done.length / total) * 100) : 0,
      topicsDone: done,
    };
  }
  return progress;
}

// ─── FETCH USER DATA ─────────────────────────────────────────
export async function fetchUserData(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data();
}

// ─── CHECK & UPDATE STREAK ON LOGIN ──────────────────────────
// Call once per app load (in Dashboard useEffect)
export async function checkAndUpdateStreak(uid: string): Promise<{
  streak: number;
  streakUpdated: boolean;
  isNewDay: boolean;
  bonusXP: number;
}> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return { streak: 0, streakUpdated: false, isNewDay: false, bonusXP: 0 };

  const data = snap.data();
  const today = getTodayStr();
  const yesterday = getYesterdayStr();
  const lastLogin: string = data.lastLoginDate ?? "";

  // Already logged in today — still show toast if it's first session visit
  // We use sessionStorage to track if toast was shown this browser session
  const sessionShown = typeof window !== "undefined" && sessionStorage.getItem("streakShown_" + uid);
  if (lastLogin === today) {
    // Already updated today — but show toast once per browser session
    if (!sessionShown) {
      sessionStorage.setItem("streakShown_" + uid, "1");
      return {
        streak: data.streak ?? 0,
        streakUpdated: false,
        isNewDay: true,   // show toast this session
        bonusXP: 0,       // no bonus (already given today)
      };
    }
    return {
      streak: data.streak ?? 0,
      streakUpdated: false,
      isNewDay: false,
      bonusXP: 0,
    };
  }
  // Mark session as shown
  if (typeof window !== "undefined") {
    sessionStorage.setItem("streakShown_" + uid, "1");
  }

  let newStreak = data.streak ?? 0;
  let streakUpdated = false;
  let bonusXP = 0;

  if (lastLogin === yesterday) {
    // Consecutive day → increment streak
    newStreak += 1;
    streakUpdated = true;
    bonusXP = Math.min(newStreak * 10, 150); // +10 per streak day, max 150
  } else {
    // Missed a day or first login → reset to 1
    newStreak = 1;
    streakUpdated = lastLogin !== ""; // only show toast if not first ever login
    bonusXP = 10; // small comeback bonus
  }

  const currentXP = data.xp ?? 0;
  const newXP = currentXP + bonusXP;
  const newLevel = calcLevel(newXP);

  const updates: Record<string, unknown> = {
    streak: newStreak,
    lastLoginDate: today,
    lastActive: serverTimestamp(),
    xp: newXP,
    level: newLevel,
  };

  if (bonusXP > 0) {
    updates.activity = arrayUnion({
      icon: "🔥",
      text: streakUpdated && newStreak > 1
        ? `Day ${newStreak} streak! Login bonus`
        : "Welcome back! Login bonus",
      xp: `+${bonusXP} XP`,
      time: "just now",
      color: "#fbbf24",
    });
  }

  await updateDoc(doc(db, "users", uid), updates);

  return { streak: newStreak, streakUpdated, isNewDay: true, bonusXP };
}

// ─── SAVE TOPIC COMPLETION ───────────────────────────────────
// Call from Arcade.tsx when quiz finishes with score > 0
export async function saveTopicCompletion(params: {
  uid: string;
  langId: string;
  topicId: string;
  xpEarned: number;
  modeIcon: string;
  modeTitle: string;
  topicName: string;
  langName: string;
  langColor: string;
}): Promise<{
  topicsDone: string[];
  moduleProgress: Record<string, ModuleProgress>;
  newXP: number;
  newLevel: number;
  alreadyDone: boolean;
  actualXP: number;
}> {
  const { uid, topicId, xpEarned, modeIcon, modeTitle, topicName, langName, langColor } = params;

  // Fetch current data
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) throw new Error("User not found");
  const data = snap.data();

  const currentXP: number = data.xp ?? 0;
  const currentTopicsDone: string[] = data.topicsDone ?? [];
  const currentPuzzlesSolved: number = data.puzzlesSolved ?? 0;

  // ── Check if topic already completed — no XP if so ──
  const alreadyDone = currentTopicsDone.includes(topicId);
  const actualXP = alreadyDone ? 0 : xpEarned;

  // Add topic to done list (deduplicated)
  const updatedTopicsDone = Array.from(new Set([...currentTopicsDone, topicId]));

  // Build fresh module progress for all languages
  const moduleProgress = buildModuleProgress(updatedTopicsDone);

  const newXP = currentXP + actualXP;
  const newLevel = calcLevel(newXP);

  const updateData: Record<string, unknown> = {
    topicsDone: updatedTopicsDone,
    moduleProgress,
    puzzlesSolved: currentPuzzlesSolved + 1,
    lastActive: serverTimestamp(),
  };

  // Only update XP/level if topic was new
  if (!alreadyDone) {
    updateData.xp = newXP;
    updateData.level = newLevel;
    updateData.activity = arrayUnion({
      icon: modeIcon,
      text: `${modeTitle}: ${topicName} (${langName})`,
      xp: `+${actualXP} XP`,
      time: "just now",
      color: langColor,
    });
  }

  await updateDoc(doc(db, "users", uid), updateData);

  return {
    topicsDone: updatedTopicsDone,
    moduleProgress,
    newXP,
    newLevel,
    alreadyDone,   // Arcade.tsx mein use hoga UI ke liye
    actualXP,
  };
}