import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import {
  API_BASE,
  apiFetch,
  clearSession,
  loadSession,
  MobileClassroom,
  MobileExamSummary,
  MobileLesson,
  MobileQuestion,
  MobileUser,
  saveSession,
  stripMarkdownAndHtml,
} from "./src/api";

type TabId = "lessons" | "classrooms" | "exams" | "profile";

interface GradeDetail {
  question_id: string;
  is_correct: boolean;
  earned_points: number;
  max_points: number;
  explanation_mdx: string;
}

interface ExamResultData {
  score: number;
  max_score: number;
  correct_count: number;
  total_questions: number;
  details: GradeDetail[];
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<MobileUser | null>(null);
  const [tab, setTab] = useState<TabId>("lessons");

  // Auth + 2FA state
  const [email, setEmail] = useState("hocsinh@eduk12.vn");
  const [password, setPassword] = useState("Student@123");
  const [twoFaTemp, setTwoFaTemp] = useState("");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  // Lessons state
  const [grade, setGrade] = useState(12);
  const [lessons, setLessons] = useState<MobileLesson[]>([]);
  const [readingLesson, setReadingLesson] = useState<MobileLesson | null>(null);

  // Classrooms state
  const [classrooms, setClassrooms] = useState<MobileClassroom[]>([]);
  const [joinCode, setJoinCode] = useState("");

  // Exams state
  const [exams, setExams] = useState<MobileExamSummary[]>([]);
  const [activeExam, setActiveExam] = useState<MobileExamSummary | null>(null);
  const [attemptId, setAttemptId] = useState("");
  const [questions, setQuestions] = useState<MobileQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [examResult, setExamResult] = useState<ExamResultData | null>(null);
  const [submittingExam, setSubmittingExam] = useState(false);

  useEffect(() => {
    loadSession()
      .then((s) => {
        if (s) {
          setToken(s.token);
          setUser(s.user);
          if (s.user.current_grade) setGrade(s.user.current_grade);
        }
      })
      .finally(() => setBooting(false));
  }, []);

  const loadLessons = useCallback(async (g: number) => {
    const res = await apiFetch<{ lessons: MobileLesson[] }>(`/api/v1/lessons?grade=${g}&mode=index`);
    if (res.ok) setLessons(res.data.lessons || []);
  }, []);

  const loadClassrooms = useCallback(async () => {
    const res = await apiFetch<{ classrooms: MobileClassroom[] }>("/api/v1/classrooms", {}, token);
    if (res.ok) setClassrooms(res.data.classrooms || []);
  }, [token]);

  const loadExams = useCallback(async () => {
    const res = await apiFetch<{ exams: MobileExamSummary[] }>("/api/v1/exams");
    if (res.ok) setExams(res.data.exams || []);
  }, []);

  useEffect(() => {
    if (!user) return;
    void loadLessons(grade);
    void loadClassrooms();
    void loadExams();
  }, [user, grade, loadLessons, loadClassrooms, loadExams]);

  // Đồng hồ đếm ngược phòng thi
  useEffect(() => {
    if (!activeExam || examResult || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeExam, examResult, secondsLeft]);

  const handleLogin = async () => {
    setAuthBusy(true);
    try {
      const res = await apiFetch<{
        access_token?: string;
        user?: MobileUser;
        requires_2fa?: boolean;
        temp_token?: string;
      }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        Alert.alert("Đăng nhập chưa thành công", res.error || "Vui lòng kiểm tra lại email/mật khẩu.");
        return;
      }
      if (res.data.requires_2fa && res.data.temp_token) {
        setTwoFaTemp(res.data.temp_token);
        return;
      }
      if (res.data.access_token && res.data.user) {
        await saveSession(res.data.access_token, res.data.user);
        setToken(res.data.access_token);
        setUser(res.data.user);
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleVerify2fa = async () => {
    setAuthBusy(true);
    try {
      const res = await apiFetch<{ access_token: string; user: MobileUser }>(
        "/api/v1/auth/2fa/verify-login",
        {
          method: "POST",
          body: JSON.stringify({ temp_token: twoFaTemp, code: twoFaCode.trim() }),
        }
      );
      if (!res.ok) {
        Alert.alert("Sai mã 2FA", res.error || "Vui lòng nhập lại mã 6 số trên Google Authenticator.");
        return;
      }
      await saveSession(res.data.access_token, res.data.user);
      setToken(res.data.access_token);
      setUser(res.data.user);
      setTwoFaTemp("");
      setTwoFaCode("");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    await clearSession();
    setToken(null);
    setUser(null);
    setActiveExam(null);
    setReadingLesson(null);
  };

  const openLesson = async (id: string) => {
    const res = await apiFetch<{ lesson: MobileLesson }>(`/api/v1/lessons/${encodeURIComponent(id)}`);
    if (res.ok && res.data.lesson) {
      setReadingLesson(res.data.lesson);
    }
  };

  const handleJoinClassroom = async (opts: { classroom_id?: string; code?: string }) => {
    const res = await apiFetch<{ classroom: { name: string } }>(
      "/api/v1/classrooms/join",
      { method: "POST", body: JSON.stringify(opts) },
      token
    );
    if (!res.ok) {
      Alert.alert("Không thể tham gia lớp", res.error || "Vui lòng kiểm tra mã lớp.");
      return;
    }
    setJoinCode("");
    Alert.alert("Thành công", `Bạn đã vào lớp "${res.data.classroom.name}"!`);
    void loadClassrooms();
  };

  const startMobileExam = async (ex: MobileExamSummary) => {
    // Khởi tạo phiên thi & lấy câu hỏi
    const [startRes, qRes] = await Promise.all([
      apiFetch<{ attempt_id: string }>(
        `/api/v1/exams/${encodeURIComponent(ex.id)}/start`,
        {
          method: "POST",
          body: JSON.stringify({ user_name: user?.full_name || "Học sinh Mobile" }),
        },
        token
      ),
      apiFetch<{ questions: MobileQuestion[] }>(
        `/api/v1/questions?grade=${ex.grade_id}`
      ),
    ]);

    if (!startRes.ok) {
      Alert.alert("Lỗi mở phòng thi", startRes.error || "Không thể bắt đầu đề thi.");
      return;
    }

    const savedDraft = await AsyncStorage.getItem(`eduk12_draft_${ex.id}`);
    setActiveExam(ex);
    setAttemptId(startRes.data.attempt_id);
    setQuestions((qRes.data.questions || []).slice(0, Math.max(ex.question_count, 5)));
    setAnswers(savedDraft ? JSON.parse(savedDraft) : {});
    setSecondsLeft(ex.duration_minutes * 60);
    setExamResult(null);
  };

  const updateAnswer = (qId: string, val: unknown) => {
    setAnswers((prev) => {
      const next = { ...prev, [qId]: val };
      if (activeExam) {
        void AsyncStorage.setItem(`eduk12_draft_${activeExam.id}`, JSON.stringify(next));
      }
      return next;
    });
  };

  const submitMobileExam = async () => {
    if (!activeExam || !attemptId) return;
    setSubmittingExam(true);
    try {
      const res = await apiFetch<{ status: string }>(
        `/api/v1/attempts/${encodeURIComponent(attemptId)}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ answers }),
        },
        token
      );
      if (!res.ok) {
        Alert.alert("Lỗi nộp bài", res.error || "Vui lòng thử lại.");
        return;
      }
      const resDetail = await apiFetch<ExamResultData>(
        `/api/v1/attempts/${encodeURIComponent(attemptId)}/result`,
        {},
        token
      );
      if (resDetail.ok) {
        setExamResult(resDetail.data);
        await AsyncStorage.removeItem(`eduk12_draft_${activeExam.id}`);
      }
    } finally {
      setSubmittingExam(false);
    }
  };

  if (booting) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </SafeAreaView>
    );
  }

  // === MÀN HÌNH ĐĂNG NHẬP & 2FA ===
  if (!user) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar style="light" />
        <View style={styles.authCard}>
          <Text style={styles.brand}>EduK12 Open Mobile</Text>
          <Text style={styles.subtitle}>
            {twoFaTemp
              ? "Nhập mã bảo mật 2 lớp (Google Authenticator)"
              : "Đăng nhập để học Lớp 1–12 & Thi trắc nghiệm"}
          </Text>

          {twoFaTemp ? (
            <>
              <TextInput
                value={twoFaCode}
                onChangeText={setTwoFaCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="Nhập 6 chữ số 2FA"
                style={[styles.input, { textAlign: "center", fontSize: 22, letterSpacing: 8 }]}
              />
              <Pressable style={styles.primaryBtn} onPress={handleVerify2fa} disabled={authBusy}>
                <Text style={styles.primaryBtnText}>
                  {authBusy ? "Đang xác minh..." : "Xác nhận 2FA & Vào học"}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email tài khoản"
                style={styles.input}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Mật khẩu"
                style={styles.input}
              />
              <Pressable style={styles.primaryBtn} onPress={handleLogin} disabled={authBusy}>
                <Text style={styles.primaryBtnText}>
                  {authBusy ? "Đang đăng nhập..." : "Đăng nhập ngay"}
                </Text>
              </Pressable>
              <Text style={styles.demoNote}>
                Tài khoản thử nghiệm: hocsinh@eduk12.vn / Student@123
              </Text>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // === MÀN HÌNH ĐANG LÀM BÀI THI TRỰC TUYẾN ===
  if (activeExam) {
    const mins = Math.floor(secondsLeft / 60);
    const secs = String(secondsLeft % 60).padStart(2, "0");

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.headerBar}>
          <Pressable onPress={() => setActiveExam(null)}>
            <Text style={styles.backLink}>← Thoát</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activeExam.title}
          </Text>
          {!examResult && (
            <Text style={styles.timerBadge}>
              {mins}:{secs}
            </Text>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollBody}>
          {examResult ? (
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>KẾT QUẢ CHÍNH THỨC</Text>
              <Text style={styles.scoreBig}>
                {Number(examResult.score).toFixed(2)} / {Number(examResult.max_score).toFixed(2)} đ
              </Text>
              <Text style={styles.scoreSub}>
                Đúng {examResult.correct_count}/{examResult.total_questions} câu hỏi
              </Text>
              <Pressable style={[styles.primaryBtn, { marginTop: 16 }]} onPress={() => setActiveExam(null)}>
                <Text style={styles.primaryBtnText}>Về danh sách đề thi</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {questions.map((q, idx) => (
                <View key={q.id} style={styles.card}>
                  <Text style={styles.qBadge}>
                    Câu {idx + 1} • {q.points} điểm
                  </Text>
                  <Text style={styles.qText}>{stripMarkdownAndHtml(q.content_mdx)}</Text>

                  {q.q_type === "short_answer" ? (
                    <TextInput
                      value={String(answers[q.id] || "")}
                      onChangeText={(t) => updateAnswer(q.id, t)}
                      placeholder="Nhập đáp án của bạn..."
                      style={styles.input}
                    />
                  ) : (
                    q.options.map((opt) => {
                      const picked = answers[q.id] === opt.key;
                      return (
                        <Pressable
                          key={opt.key}
                          onPress={() => updateAnswer(q.id, opt.key)}
                          style={[styles.optionBtn, picked && styles.optionBtnActive]}
                        >
                          <Text style={[styles.optionText, picked && styles.optionTextActive]}>
                            {opt.key}. {stripMarkdownAndHtml(opt.text)}
                          </Text>
                        </Pressable>
                      );
                    })
                  )}
                </View>
              ))}

              <Pressable
                style={[styles.primaryBtn, { backgroundColor: "#059669", marginBottom: 32 }]}
                onPress={submitMobileExam}
                disabled={submittingExam}
              >
                <Text style={styles.primaryBtnText}>
                  {submittingExam ? "Đang chấm bài..." : "Nộp bài & Xem điểm ngay"}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // === MÀN HÌNH ĐỌC BÀI GIẢNG ===
  if (readingLesson) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => setReadingLesson(null)}>
            <Text style={styles.backLink}>← Quay lại</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Lớp {readingLesson.grade_id} • {readingLesson.subject_name}
          </Text>
        </View>
        <ScrollView contentContainerStyle={styles.scrollBody}>
          <Text style={styles.lessonChapter}>{readingLesson.chapter}</Text>
          <Text style={styles.lessonTitle}>{readingLesson.title}</Text>
          <Text style={styles.lessonBody}>
            {stripMarkdownAndHtml(readingLesson.content_mdx || readingLesson.summary)}
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // === GIAO DIỆN CHÍNH 4 TAB ===
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>EduK12 Open</Text>
        <Text style={styles.userPill}>{user.full_name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody}>
        {tab === "lessons" && (
          <>
            <Text style={styles.sectionTitle}>Kho Bài giảng Lớp 1–12</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setGrade(g)}
                  style={[styles.gradeChip, grade === g && styles.gradeChipActive]}
                >
                  <Text style={[styles.gradeChipText, grade === g && { color: "#fff" }]}>Lớp {g}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {lessons.map((l) => (
              <Pressable key={l.id} style={styles.card} onPress={() => void openLesson(l.id)}>
                <Text style={styles.qBadge}>
                  {l.subject_name} • {l.chapter}
                </Text>
                <Text style={styles.cardTitle}>{l.title}</Text>
                <Text style={styles.cardSub} numberOfLines={2}>
                  {l.summary}
                </Text>
              </Pressable>
            ))}
          </>
        )}

        {tab === "classrooms" && (
          <>
            <Text style={styles.sectionTitle}>Lớp học &amp; Lớp Lập trình</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              <TextInput
                value={joinCode}
                onChangeText={(t) => setJoinCode(t.toUpperCase())}
                placeholder="Nhập mã lớp (CODE-JS01)"
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
              />
              <Pressable
                style={[styles.primaryBtn, { paddingHorizontal: 16 }]}
                onPress={() => joinCode.trim() && void handleJoinClassroom({ code: joinCode.trim() })}
              >
                <Text style={styles.primaryBtnText}>Tham gia</Text>
              </Pressable>
            </View>
            {classrooms.map((c) => (
              <View key={c.id} style={styles.card}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={styles.qBadge}>
                    {c.grade_id === 0 ? "Lập trình" : `Lớp ${c.grade_id}`} • {c.code}
                  </Text>
                  {c.is_live && <Text style={styles.liveTag}>● LIVE</Text>}
                </View>
                <Text style={styles.cardTitle}>{c.name}</Text>
                <Text style={styles.cardSub}>
                  GV: {c.teacher_name} • {c.student_count} học viên
                </Text>
                {!c.is_enrolled && (
                  <Pressable
                    style={[styles.primaryBtn, { marginTop: 10, paddingVertical: 10 }]}
                    onPress={() => void handleJoinClassroom({ classroom_id: c.id })}
                  >
                    <Text style={styles.primaryBtnText}>Đăng ký học ngay</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </>
        )}

        {tab === "exams" && (
          <>
            <Text style={styles.sectionTitle}>Phòng Thi Trắc nghiệm Trực tuyến</Text>
            {exams.map((ex) => (
              <View key={ex.id} style={styles.card}>
                <Text style={styles.qBadge}>
                  Lớp {ex.grade_id} • {ex.subject_name} • {ex.duration_minutes} phút
                </Text>
                <Text style={styles.cardTitle}>{ex.title}</Text>
                <Pressable
                  style={[styles.primaryBtn, { marginTop: 10, paddingVertical: 10 }]}
                  onPress={() => void startMobileExam(ex)}
                >
                  <Text style={styles.primaryBtnText}>Vào phòng thi ngay</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}

        {tab === "profile" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{user.full_name}</Text>
            <Text style={styles.cardSub}>{user.email}</Text>
            <Pressable
              style={[styles.primaryBtn, { marginTop: 16 }]}
              onPress={() => void Linking.openURL(`${API_BASE}/lap-trinh/`)}
            >
              <Text style={styles.primaryBtnText}>Mở Phòng Code Lập trình</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, { marginTop: 10, backgroundColor: "#e11d48" }]}
              onPress={() => void handleLogout()}
            >
              <Text style={styles.primaryBtnText}>Đăng xuất</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Bottom Tab Bar Native */}
      <View style={styles.bottomBar}>
        {(
          [
            { id: "lessons", label: "Bài học" },
            { id: "classrooms", label: "Lớp học" },
            { id: "exams", label: "Thi thử" },
            { id: "profile", label: "Tài khoản" },
          ] as { id: TabId; label: string }[]
        ).map((t) => (
          <Pressable
            key={t.id}
            style={[styles.tabItem, tab === t.id && styles.tabItemActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  container: { flex: 1, backgroundColor: "#f8fafc" },
  authContainer: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#0f172a" },
  authCard: { backgroundColor: "#ffffff", borderRadius: 24, padding: 24, gap: 12 },
  brand: { fontSize: 24, fontWeight: "800", color: "#4f46e5", textAlign: "center" },
  subtitle: { fontSize: 13, color: "#475569", textAlign: "center", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: "#ffffff",
    marginBottom: 8,
  },
  primaryBtn: {
    backgroundColor: "#4f46e5",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
  demoNote: { fontSize: 11, color: "#64748b", textAlign: "center", marginTop: 6 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a", flex: 1 },
  backLink: { fontSize: 14, fontWeight: "700", color: "#4f46e5", marginRight: 12 },
  userPill: { fontSize: 12, fontWeight: "700", color: "#4f46e5" },
  timerBadge: {
    backgroundColor: "#fee2e2",
    color: "#be123c",
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  scrollBody: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 12 },
  gradeChip: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  gradeChipActive: { backgroundColor: "#4f46e5" },
  gradeChipText: { fontSize: 12, fontWeight: "700", color: "#334155" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  qBadge: { fontSize: 11, fontWeight: "700", color: "#4f46e5", marginBottom: 4 },
  liveTag: { fontSize: 11, fontWeight: "800", color: "#e11d48" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  cardSub: { fontSize: 12, color: "#64748b", marginTop: 4 },
  lessonChapter: { fontSize: 12, fontWeight: "700", color: "#4f46e5", marginBottom: 4 },
  lessonTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a", marginBottom: 12 },
  lessonBody: { fontSize: 15, lineHeight: 24, color: "#1e293b" },
  qText: { fontSize: 15, fontWeight: "600", color: "#0f172a", marginBottom: 10 },
  optionBtn: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  optionBtnActive: { borderColor: "#4f46e5", backgroundColor: "#eef2ff" },
  optionText: { fontSize: 14, color: "#1e293b" },
  optionTextActive: { color: "#3730a3", fontWeight: "700" },
  scoreCard: {
    backgroundColor: "#4f46e5",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  scoreLabel: { fontSize: 12, fontWeight: "700", color: "#c7d2fe" },
  scoreBig: { fontSize: 32, fontWeight: "800", color: "#ffffff", marginVertical: 8 },
  scoreSub: { fontSize: 14, color: "#e0e7ff" },
  bottomBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10 },
  tabItemActive: { backgroundColor: "#eef2ff" },
  tabText: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  tabTextActive: { color: "#4f46e5" },
});
