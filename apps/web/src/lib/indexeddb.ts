const DB_NAME = "edu_k12_exam_drafts";
const STORE_NAME = "drafts";
const DB_VERSION = 1;

export interface ExamDraft {
  examId: string;
  attemptId: string;
  answers: Record<string, unknown>;
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB không khả dụng"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "examId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveExamDraft(draft: ExamDraft): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(draft);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback an toàn nếu chế độ ẩn danh chặn IndexedDB
    try {
      localStorage.setItem(`draft:${draft.examId}`, JSON.stringify(draft));
    } catch {
      // ignore
    }
  }
}

export async function loadExamDraft(examId: string): Promise<ExamDraft | null> {
  try {
    const db = await openDB();
    return await new Promise<ExamDraft | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(examId);
      req.onsuccess = () => resolve((req.result as ExamDraft) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const raw = localStorage.getItem(`draft:${examId}`);
      return raw ? (JSON.parse(raw) as ExamDraft) : null;
    } catch {
      return null;
    }
  }
}

export async function clearExamDraft(examId: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(examId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try {
      localStorage.removeItem(`draft:${examId}`);
    } catch {
      // ignore
    }
  }
}
