import { LANGUAGES } from "../data/arcadeQuestions";
import { fetchUserData as apiFetchUser, checkAndUpdateStreak as apiCheckStreak, saveTopicCompletion as apiSaveTopic } from "./api";

// ─── TYPES ───────────────────────────────────────────────────
export interface ModuleProgress {
  completed: number;
  total: number;
  percent: number;
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
export function calcLevel(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 50)));
}

export function levelBounds(level: number): { current: number; next: number } {
  const current = level > 1 ? Math.pow(level - 1, 2) * 50 : 0;
  const next = Math.pow(level, 2) * 50;
  return { current, next };
}

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
  // uid parameter is kept for compatibility but ignored since backend uses JWT
  return await apiFetchUser();
}

// ─── CHECK & UPDATE STREAK ON LOGIN ──────────────────────────
export async function checkAndUpdateStreak(uid: string) {
  // uid is kept for compatibility
  const sessionShown = typeof window !== "undefined" && sessionStorage.getItem("streakShown_" + uid);
  
  const data = await apiCheckStreak();
  
  if (!data.isNewDay && sessionShown) {
     return { ...data, isNewDay: false };
  }
  
  if (data.isNewDay && typeof window !== "undefined") {
    sessionStorage.setItem("streakShown_" + uid, "1");
  }
  
  return data;
}

// ─── SAVE TOPIC COMPLETION ───────────────────────────────────
export async function saveTopicCompletion(params: any) {
  // Calculate module progress here to send to backend
  // In a real scenario, the backend should probably do this, but to keep changes minimal:
  
  const currentUser = await apiFetchUser();
  if (!currentUser) throw new Error("User not found");
  
  const currentTopicsDone: string[] = currentUser.topicsDone ?? [];
  const updatedTopicsDone = Array.from(new Set([...currentTopicsDone, params.topicId]));
  const moduleProgress = buildModuleProgress(updatedTopicsDone);
  
  return await apiSaveTopic({ ...params, moduleProgress });
}