function resolveApiBase(envVal: string | undefined, devDefault: string): string {
  if (envVal === "SAME_ORIGIN") return "";
  if (envVal) return envVal;
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h !== "localhost" && h !== "127.0.0.1") {
      return "";
    }
  }
  return devDefault;
}

export const CORE_API_URL = resolveApiBase(
  process.env.NEXT_PUBLIC_CORE_API_URL,
  "http://localhost:8080"
);
export const AI_API_URL = resolveApiBase(
  process.env.NEXT_PUBLIC_AI_API_URL,
  "http://localhost:8001"
);

export interface Grade {
  id: number;
  name: string;
  slug: string;
  level: "primary" | "middle" | "high";
}

export interface StudyMaterial {
  id: string;
  title: string;
  type: "article" | "pdf" | "video_hls" | "mindmap" | "flashcard";
  url: string;
  size_label: string;
  duration_min?: number;
  is_free: boolean;
}

export interface Lesson {
  id: string;
  grade_id: number;
  subject_code: string;
  subject_name: string;
  textbook: string;
  chapter: string;
  title: string;
  slug: string;
  summary: string;
  content_mdx: string;
  duration_min: number;
  materials: StudyMaterial[];
}

export interface QuestionOption {
  key: string;
  text: string;
}

export interface PublicQuestion {
  id: string;
  grade_id: number;
  subject_code: string;
  topic: string;
  q_type: "single_choice" | "multi_choice" | "true_false_group" | "short_answer";
  difficulty: string;
  content_mdx: string;
  options?: QuestionOption[];
  unit_hint?: string;
  points: number;
}

export interface ExerciseSet {
  id: string;
  grade_id: number;
  subject_code: string;
  subject_name: string;
  title: string;
  description: string;
  questions: PublicQuestion[];
}

export interface ExamSummary {
  id: string;
  grade_id: number;
  level?: "primary" | "middle" | "high";
  level_label?: string;
  is_level_unlocked?: boolean;
  level_announcement?: string;
  subject_code: string;
  subject_name: string;
  title: string;
  mode: string;
  duration_minutes: number;
  total_points: number;
  question_count: number;
  participant_count: number;
  bundle_version: number;
  starts_at: string;
}

export interface EncryptedExamBundle {
  exam_id: string;
  bundle_version: number;
  algorithm: string;
  iv_b64: string;
  ciphertext_b64: string;
  generated_at: string;
}

export interface ExamPayloadPlain {
  exam: ExamSummary;
  questions: PublicQuestion[];
}

export interface QuestionGradeDetail {
  question_id: string;
  user_answer: unknown;
  correct_answer: unknown;
  is_correct: boolean;
  earned_points: number;
  max_points: number;
  explanation_mdx: string;
}

export interface ExamAttemptResult {
  attempt_id: string;
  exam_id: string;
  user_name: string;
  status: "in_progress" | "submitted_queued" | "graded";
  score: number;
  max_score: number;
  correct_count: number;
  total_questions: number;
  duration_sec: number;
  grading_latency_us?: number;
  details?: QuestionGradeDetail[];
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  user_name: string;
  score: number;
  duration_sec: number;
  submitted_at: string;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

/**
 * Giải mã gói đề AES-256-GCM trực tiếp trên trình duyệt bằng Web Crypto API.
 * Giúp 1 triệu học sinh mở đề đồng loạt từ CDN mà KHÔNG chạm Database.
 */
export async function decryptExamBundle(
  bundle: EncryptedExamBundle,
  keyBase64: string
): Promise<{ payload: ExamPayloadPlain; decryptMs: number }> {
  const t0 = performance.now();
  const keyBytes = b64ToBytes(keyBase64);
  const ivBytes = b64ToBytes(bundle.iv_b64);
  const cipherBytes = b64ToBytes(bundle.ciphertext_b64);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes.buffer as ArrayBuffer },
    cryptoKey,
    cipherBytes.buffer as ArrayBuffer
  );

  const text = new TextDecoder().decode(plainBuffer);
  const payload = JSON.parse(text) as ExamPayloadPlain;
  return { payload, decryptMs: Math.max(1, Math.round(performance.now() - t0)) };
}
