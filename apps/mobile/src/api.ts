import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_BASE = "https://eduk12-scale.eduk12-scale.workers.dev";
const TOKEN_KEY = "eduk12_mobile_token";
const USER_KEY = "eduk12_mobile_user";

export interface MobileUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  current_grade?: number;
  school_name?: string;
}

export interface MobileLesson {
  id: string;
  grade_id: number;
  subject_code: string;
  subject_name: string;
  chapter: string;
  title: string;
  summary: string;
  content_mdx?: string;
}

export interface MobileClassroom {
  id: string;
  code: string;
  name: string;
  grade_id: number;
  subject_name: string;
  teacher_name: string;
  student_count: number;
  lesson_count: number;
  exam_count: number;
  is_enrolled: boolean;
  is_live?: boolean;
}

export interface MobileExamSummary {
  id: string;
  grade_id: number;
  subject_name: string;
  title: string;
  duration_minutes: number;
  total_points: number;
  question_count: number;
}

export interface MobileQuestion {
  id: string;
  q_type: "single_choice" | "multi_choice" | "true_false_group" | "short_answer";
  content_mdx: string;
  options: { key: string; text: string }[];
  points: number;
}

export async function saveSession(token: string, user: MobileUser) {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)],
  ]);
}

export async function loadSession(): Promise<{ token: string; user: MobileUser } | null> {
  const [[, token], [, userRaw]] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
  if (!token || !userRaw) return null;
  try {
    return { token, user: JSON.parse(userRaw) as MobileUser };
  } catch {
    return null;
  }
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<{ ok: boolean; data: T; error?: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, data: json as T, error: (json as { error?: string }).error || "Lỗi kết nối" };
  }
  return { ok: true, data: json as T };
}

export function stripMarkdownAndHtml(raw: string): string {
  return (raw || "")
    .replace("<!--word-doc-->", "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|h3|li|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/#{1,6}\s?/g, "")
    .replace(/\*\*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
