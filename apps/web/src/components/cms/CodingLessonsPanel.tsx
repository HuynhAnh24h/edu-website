"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Code2,
  Edit3,
  ExternalLink,
  Layers,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";
import { CODING_TRACKS, CodingLanguage, CodingLesson, TestCaseSpec } from "@/lib/codingCurriculum";
import { CODING_CLUSTERS } from "@/lib/codingRoadmaps";

interface AdminLessonItem extends CodingLesson {
  is_published?: boolean;
  updated_at?: string;
}

interface EditableTestRow {
  id: string;
  label: string;
  domSelector: string;
  domTextIncludes: string;
  domMinCount: string;
  cssMustContain: string;
  jsCheck: string;
  pyCheck: string;
  goCheck: string;
  expectedCount: string;
}

function createEmptyTest(idx: number): EditableTestRow {
  return {
    id: `t${idx}`,
    label: `Kiểm tra điều kiện ${idx}`,
    domSelector: "",
    domTextIncludes: "",
    domMinCount: "",
    cssMustContain: "",
    jsCheck: "",
    pyCheck: "",
    goCheck: "",
    expectedCount: "",
  };
}

function getTrackKind(trackId: CodingLanguage): "html" | "css" | "js" | "python" | "go" | "db" {
  if (trackId === "html") return "html";
  if (trackId === "css") return "css";
  if (trackId === "python") return "python";
  if (trackId === "golang") return "go";
  if (trackId === "mongodb" || trackId === "postgresql") return "db";
  return "js";
}

function specToEditable(t: TestCaseSpec, idx: number): EditableTestRow {
  return {
    id: t.id || `t${idx + 1}`,
    label: t.label || "",
    domSelector: t.domSelector || "",
    domTextIncludes: t.domTextIncludes || "",
    domMinCount: t.domMinCount !== undefined ? String(t.domMinCount) : "",
    cssMustContain: Array.isArray(t.cssMustContain) ? t.cssMustContain.join(", ") : "",
    jsCheck: t.jsCheck || "",
    pyCheck: t.pyCheck || "",
    goCheck: t.goCheck || "",
    expectedCount: t.expectedCount !== undefined ? String(t.expectedCount) : "",
  };
}

function editableToSpec(row: EditableTestRow, kind: ReturnType<typeof getTrackKind>, idx: number): TestCaseSpec {
  const base: TestCaseSpec = {
    id: row.id.trim() || `t${idx + 1}`,
    label: row.label.trim() || `Test Case ${idx + 1}`,
  };
  if (kind === "html") {
    if (row.domSelector.trim()) base.domSelector = row.domSelector.trim();
    if (row.domTextIncludes.trim()) base.domTextIncludes = row.domTextIncludes.trim();
    if (row.domMinCount.trim() && !Number.isNaN(Number(row.domMinCount))) {
      base.domMinCount = Number(row.domMinCount);
    }
  } else if (kind === "css") {
    base.cssMustContain = row.cssMustContain
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (kind === "js") {
    base.jsCheck = row.jsCheck.trim() || "true";
  } else if (kind === "python") {
    base.pyCheck = row.pyCheck.trim() || "True";
  } else if (kind === "go") {
    base.goCheck = row.goCheck.trim() || "true";
  } else if (kind === "db") {
    base.expectedCount = Number(row.expectedCount || 1);
  }
  return base;
}

export function CodingLessonsPanel({
  accessToken,
  onToast,
}: {
  accessToken: string | null;
  onToast: (type: "ok" | "err", text: string) => void;
}) {
  const [selectedTrack, setSelectedTrack] = useState<CodingLanguage>("html");
  const [lessons, setLessons] = useState<AdminLessonItem[]>([]);
  const [trackModes, setTrackModes] = useState<Record<string, "append" | "admin_only">>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editor state
  const [editingId, setEditingId] = useState<string>("");
  const [orderNum, setOrderNum] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<"Cơ bản" | "Trung bình" | "Thực chiến">("Cơ bản");
  const [summary, setSummary] = useState("");
  const [theoryText, setTheoryText] = useState("");
  const [taskPrompt, setTaskPrompt] = useState("");
  const [hint1, setHint1] = useState("");
  const [hint2, setHint2] = useState("");
  const [hint3, setHint3] = useState("");
  const [starterCode, setStarterCode] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [testRows, setTestRows] = useState<EditableTestRow[]>([createEmptyTest(1)]);

  const trackMeta = useMemo(
    () => CODING_TRACKS.find((t) => t.id === selectedTrack) || CODING_TRACKS[0],
    [selectedTrack]
  );
  const trackKind = getTrackKind(selectedTrack);

  const loadLessons = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/coding/admin/lessons`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const d = await res.json();
        setLessons(d.lessons || []);
        setTrackModes(d.track_modes || {});
      }
    } catch {
      onToast("err", "Không tải được danh sách bài lập trình");
    } finally {
      setLoading(false);
    }
  }, [accessToken, onToast]);

  useEffect(() => {
    void loadLessons();
  }, [loadLessons]);

  const lessonsInSelectedTrack = useMemo(
    () => lessons.filter((l) => l.trackId === selectedTrack).sort((a, b) => a.order - b.order),
    [lessons, selectedTrack]
  );

  const currentTrackMode = trackModes[selectedTrack] || "append";

  const resetForm = useCallback(
    (nextTrack: CodingLanguage, existingCount: number) => {
      setEditingId("");
      setOrderNum(existingCount + 1);
      setTitle("");
      setDifficulty("Cơ bản");
      setSummary("");
      setTheoryText("");
      setTaskPrompt("");
      setHint1("");
      setHint2("");
      setHint3("");
      setStarterCode("");
      setPreviewHtml("");
      setIsPublished(true);
      setTestRows([createEmptyTest(1)]);
      setSelectedTrack(nextTrack);
    },
    []
  );

  const fillTemplateFromDefault = () => {
    const sample = trackMeta.lessons[0];
    if (!sample) return;
    setEditingId("");
    setOrderNum(lessonsInSelectedTrack.length + 1);
    setTitle(`Bài ${lessonsInSelectedTrack.length + 1}: ${sample.title.replace(/^Bài\s*\d+:\s*/i, "")} (Bản Admin)`);
    setDifficulty(sample.difficulty);
    setSummary(sample.summary);
    setTheoryText(sample.theory.join("\n"));
    setTaskPrompt(sample.taskPrompt);
    setHint1(sample.thinkingHints[0]);
    setHint2(sample.thinkingHints[1]);
    setHint3(sample.thinkingHints[2]);
    setStarterCode(sample.starterCode);
    setPreviewHtml(sample.previewHtml || "");
    setIsPublished(true);
    setTestRows(sample.tests.map((t, i) => specToEditable(t, i)));
    onToast("ok", `Đã nạp mẫu bài chuẩn cho môn ${trackMeta.shortName} — bạn chỉ cần chỉnh sửa đề bài & lưu!`);
  };

  const startEditLesson = (l: AdminLessonItem) => {
    setSelectedTrack(l.trackId);
    setEditingId(l.id);
    setOrderNum(l.order);
    setTitle(l.title);
    setDifficulty(l.difficulty);
    setSummary(l.summary);
    setTheoryText((l.theory || []).join("\n"));
    setTaskPrompt(l.taskPrompt);
    setHint1(l.thinkingHints?.[0] || "");
    setHint2(l.thinkingHints?.[1] || "");
    setHint3(l.thinkingHints?.[2] || "");
    setStarterCode(l.starterCode);
    setPreviewHtml(l.previewHtml || "");
    setIsPublished(l.is_published !== false);
    setTestRows((l.tests || []).length ? l.tests.map((t, i) => specToEditable(t, i)) : [createEmptyTest(1)]);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (!title.trim() || !taskPrompt.trim()) {
      onToast("err", "Vui lòng nhập Tiêu đề bài học và Yêu cầu bài kiểm tra");
      return;
    }

    const builtTests = testRows
      .filter((r) => r.label.trim() !== "")
      .map((r, i) => editableToSpec(r, trackKind, i));
    if (builtTests.length === 0) {
      onToast("err", "Vui lòng nhập ít nhất 1 Test Case kiểm tra tự động");
      return;
    }

    setSaving(true);
    try {
      const sample = trackMeta.lessons[0];
      const res = await fetch(`${CORE_API_URL}/api/v1/coding/admin/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          id: editingId || undefined,
          trackId: selectedTrack,
          order: orderNum,
          title: title.trim(),
          difficulty,
          summary: summary.trim(),
          theory: theoryText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          taskPrompt: taskPrompt.trim(),
          thinkingHints: [
            hint1.trim() || "Hãy đọc kỹ yêu cầu đề bài và xác định đầu vào/đầu ra.",
            hint2.trim() || "Chia yêu cầu thành từng bước nhỏ rồi thử nghiệm trực tiếp.",
            hint3.trim() || "Kiểm tra lại tên thẻ/hàm đúng theo mô tả Test Case.",
          ],
          starterCode,
          previewHtml: previewHtml.trim() || undefined,
          sqlTables: selectedTrack === "postgresql" ? sample?.sqlTables : undefined,
          mongoCollections: selectedTrack === "mongodb" ? sample?.mongoCollections : undefined,
          tests: builtTests,
          is_published: isPublished,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Lưu bài thất bại");
      onToast("ok", `Đã lưu bài "${title.trim()}" vào môn ${trackMeta.shortName} trên /lap-trinh!`);
      await loadLessons();
      resetForm(selectedTrack, lessonsInSelectedTrack.length + (editingId ? 0 : 1));
    } catch (err) {
      onToast("err", err instanceof Error ? err.message : "Lỗi lưu bài lập trình");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLesson = async (id: string, lessonTitle: string) => {
    if (!accessToken) return;
    if (!window.confirm(`Xóa bài lập trình "${lessonTitle}" khỏi hệ thống?`)) return;
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/coding/admin/lessons/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Xóa thất bại");
      onToast("ok", `Đã xóa bài "${lessonTitle}".`);
      if (editingId === id) resetForm(selectedTrack, Math.max(0, lessonsInSelectedTrack.length - 1));
      await loadLessons();
    } catch (err) {
      onToast("err", err instanceof Error ? err.message : "Lỗi xóa bài");
    }
  };

  const handleChangeTrackMode = async (mode: "append" | "admin_only") => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${CORE_API_URL}/api/v1/coding/admin/track-mode`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ trackId: selectedTrack, source_mode: mode }),
      });
      if (!res.ok) throw new Error("Cập nhật chế độ thất bại");
      setTrackModes((prev) => ({ ...prev, [selectedTrack]: mode }));
      onToast(
        "ok",
        mode === "admin_only"
          ? `Môn ${trackMeta.shortName} hiện CHỈ hiển thị bài do Admin cấp!`
          : `Môn ${trackMeta.shortName} đang gộp bài chuẩn + bài Admin cấp.`
      );
    } catch (err) {
      onToast("err", err instanceof Error ? err.message : "Lỗi cập nhật chế độ");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header + Link xem trực tiếp */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <Code2 className="h-5 w-5 text-indigo-600" />
            Quản lý Bài tập Lập trình theo Lộ trình 6 Cụm (12 Môn)
          </h2>
          <p className="text-xs text-slate-500">
            Chọn đúng môn trong 6 cụm công nghệ để cấp bài thực hành mới, cấu hình Test Case tự động chấm điểm và hiển thị ngay trên <code>/lap-trinh</code>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/lap-trinh?track=${selectedTrack}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-extrabold text-indigo-700 hover:bg-indigo-100"
          >
            Xem môn {trackMeta.shortName} trên web <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => void loadLessons()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Tải lại
          </button>
        </div>
      </div>

      {/* Bộ chọn 6 Cụm -> 12 Môn */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
          <Layers className="h-4 w-4 text-indigo-600" />
          Chọn Môn lập trình cần cấp bài:
        </div>
        <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
          {CODING_CLUSTERS.map((c) => (
            <div key={c.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
              <p className="text-[11px] font-extrabold text-slate-600">{c.shortLabel}</p>
              <div className="flex flex-wrap gap-1.5">
                {c.tracks.map((tid) => {
                  const tr = CODING_TRACKS.find((x) => x.id === tid)!;
                  const adminCnt = lessons.filter((l) => l.trackId === tid).length;
                  const active = selectedTrack === tid;
                  return (
                    <button
                      key={tid}
                      type="button"
                      onClick={() => resetForm(tid, adminCnt)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
                        active
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                      }`}
                    >
                      <span>{tr.shortName}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                          active ? "bg-white/20 text-white" : adminCnt > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        +{adminCnt}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chế độ nguồn bài của môn đang chọn */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 px-5 py-3.5">
        <div>
          <p className="text-xs font-extrabold text-indigo-950">
            Chế độ cấp bài cho môn <span className="text-indigo-700">{trackMeta.name}</span> ({lessonsInSelectedTrack.length} bài Admin đang có):
          </p>
          <p className="text-[11px] text-indigo-800/80">
            Bạn có thể gộp bài mới vào sau 3 bài chuẩn sẵn có, hoặc bật chế độ chỉ hiển thị duy nhất các bài do Admin cấp cho môn này.
          </p>
        </div>
        <div className="flex rounded-xl bg-white p-1 text-xs font-extrabold ring-1 ring-indigo-200">
          <button
            type="button"
            onClick={() => void handleChangeTrackMode("append")}
            className={`rounded-lg px-3 py-1.5 transition ${
              currentTrackMode === "append" ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Gộp bài chuẩn + Admin
          </button>
          <button
            type="button"
            onClick={() => void handleChangeTrackMode("admin_only")}
            className={`rounded-lg px-3 py-1.5 transition ${
              currentTrackMode === "admin_only" ? "bg-emerald-600 text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Chỉ dùng bài Admin cấp
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Cột trái: Form tạo / sửa bài học */}
        <form
          onSubmit={handleSaveLesson}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 lg:col-span-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900">
              {editingId ? `Đang sửa bài (${editingId})` : `Thêm bài mới cho môn ${trackMeta.shortName}`}
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fillTemplateFromDefault}
                className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-3 py-1.5 text-[11px] font-extrabold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-600" /> Nạp mẫu chuẩn {trackMeta.shortName}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => resetForm(selectedTrack, lessonsInSelectedTrack.length)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                >
                  Hủy sửa
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600">Thứ tự</label>
              <input
                type="number"
                min={1}
                value={orderNum}
                onChange={(e) => setOrderNum(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-extrabold"
              />
            </div>
            <div className="sm:col-span-7">
              <label className="block text-[11px] font-bold text-slate-600">Tiêu đề bài thực hành *</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`VD: Bài ${orderNum}: Thực hành ${trackMeta.shortName}...`}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-slate-600">Độ khó</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
              >
                <option value="Cơ bản">Cơ bản</option>
                <option value="Trung bình">Trung bình</option>
                <option value="Thực chiến">Thực chiến</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600">Mô tả ngắn</label>
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Mục tiêu bài học giúp học viên làm chủ kỹ năng gì..."
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600">Kiến thức trọng tâm (Mỗi dòng 1 ý)</label>
            <textarea
              rows={3}
              value={theoryText}
              onChange={(e) => setTheoryText(e.target.value)}
              placeholder={"Ý 1: Giải thích khái niệm chính...\nÝ 2: Quy tắc cần nhớ..."}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600">Yêu cầu bài kiểm tra *</label>
            <textarea
              required
              rows={3}
              value={taskPrompt}
              onChange={(e) => setTaskPrompt(e.target.value)}
              placeholder="Mô tả chi tiết yêu cầu học viên phải code để vượt qua 100% Test Case..."
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600">Code mẫu khởi đầu (Starter Code)</label>
            <textarea
              rows={5}
              value={starterCode}
              onChange={(e) => setStarterCode(e.target.value)}
              placeholder="// Nhập khung code ban đầu cho học viên điền..."
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-950 px-3 py-2.5 font-mono text-xs text-emerald-300"
            />
          </div>

          {selectedTrack === "css" && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600">HTML Xem trước (Dành riêng cho CSS)</label>
              <textarea
                rows={3}
                value={previewHtml}
                onChange={(e) => setPreviewHtml(e.target.value)}
                placeholder='<div class="card"><h2>Tiêu đề</h2><button>Bấm ngay</button></div>'
                className="mt-1 w-full rounded-xl border border-slate-300 font-mono text-xs px-3 py-2"
              />
            </div>
          )}

          {/* Gợi mở tư duy 3 tầng */}
          <div className="rounded-2xl bg-amber-50/70 p-3.5 space-y-2 border border-amber-200/70">
            <p className="text-[11px] font-extrabold text-amber-900">Gợi mở tư duy 3 tầng (Chống chép đáp án):</p>
            <input
              value={hint1}
              onChange={(e) => setHint1(e.target.value)}
              placeholder="Tầng 1 (Định hướng): ..."
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs"
            />
            <input
              value={hint2}
              onChange={(e) => setHint2(e.target.value)}
              placeholder="Tầng 2 (Dàn ý từng bước): ..."
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs"
            />
            <input
              value={hint3}
              onChange={(e) => setHint3(e.target.value)}
              placeholder="Tầng 3 (Khung cú pháp khuyết ___): ..."
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs"
            />
          </div>

          {/* Trình tạo Test Case tự động chấm điểm */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold text-indigo-950">
                Test Case Chấm điểm Tự động ({trackMeta.runtimeLabel})
              </p>
              <button
                type="button"
                onClick={() => setTestRows((prev) => [...prev, createEmptyTest(prev.length + 1)])}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-extrabold text-white hover:bg-indigo-500"
              >
                <Plus className="h-3 w-3" /> Thêm Test
              </button>
            </div>

            {testRows.map((row, idx) => (
              <div key={idx} className="rounded-xl border border-white bg-white p-3 space-y-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <input
                    value={row.label}
                    onChange={(e) =>
                      setTestRows((prev) => prev.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)))
                    }
                    placeholder={`Mô tả Test Case #${idx + 1} (hiển thị cho học viên)`}
                    className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold"
                  />
                  {testRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setTestRows((prev) => prev.filter((_, i) => i !== idx))}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {trackKind === "html" && (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      value={row.domSelector}
                      onChange={(e) =>
                        setTestRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, domSelector: e.target.value } : r))
                        )
                      }
                      placeholder="CSS Selector (VD: h1, button, ul li)"
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-[11px]"
                    />
                    <input
                      value={row.domTextIncludes}
                      onChange={(e) =>
                        setTestRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, domTextIncludes: e.target.value } : r))
                        )
                      }
                      placeholder="Chữ phải chứa (tùy chọn)"
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px]"
                    />
                    <input
                      type="number"
                      min={0}
                      value={row.domMinCount}
                      onChange={(e) =>
                        setTestRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, domMinCount: e.target.value } : r))
                        )
                      }
                      placeholder="Số lượng tối thiểu (VD: 1)"
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px]"
                    />
                  </div>
                )}

                {trackKind === "css" && (
                  <input
                    value={row.cssMustContain}
                    onChange={(e) =>
                      setTestRows((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, cssMustContain: e.target.value } : r))
                      )
                    }
                    placeholder="Các thuộc tính CSS bắt buộc, ngăn cách dấu phẩy (VD: display: flex, border-radius)"
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-[11px]"
                  />
                )}

                {trackKind === "js" && (
                  <input
                    value={row.jsCheck}
                    onChange={(e) =>
                      setTestRows((prev) => prev.map((r, i) => (i === idx ? { ...r, jsCheck: e.target.value } : r)))
                    }
                    placeholder='Biểu thức kiểm tra JS trả về true/false (VD: typeof sum === "function" && sum(2, 3) === 5)'
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-[11px]"
                  />
                )}

                {trackKind === "python" && (
                  <input
                    value={row.pyCheck}
                    onChange={(e) =>
                      setTestRows((prev) => prev.map((r, i) => (i === idx ? { ...r, pyCheck: e.target.value } : r)))
                    }
                    placeholder="Biểu thức kiểm tra Python (VD: solve(2, 3) == 5)"
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-[11px]"
                  />
                )}

                {trackKind === "go" && (
                  <input
                    value={row.goCheck}
                    onChange={(e) =>
                      setTestRows((prev) => prev.map((r, i) => (i === idx ? { ...r, goCheck: e.target.value } : r)))
                    }
                    placeholder="Biểu thức kiểm tra Go (VD: Add(2, 3) == 5)"
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-[11px]"
                  />
                )}

                {trackKind === "db" && (
                  <input
                    type="number"
                    min={0}
                    value={row.expectedCount}
                    onChange={(e) =>
                      setTestRows((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, expectedCount: e.target.value } : r))
                      )
                    }
                    placeholder="Số bản ghi kết quả mong đợi (VD: 2)"
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-[11px]"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              Xuất bản ngay lên phòng học /lap-trinh
            </label>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-extrabold text-white shadow hover:bg-indigo-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Đang lưu..." : editingId ? "Cập nhật Bài học" : `Cấp bài cho môn ${trackMeta.shortName}`}
            </button>
          </div>
        </form>

        {/* Cột phải: Danh sách bài Admin đã cấp cho môn đang chọn */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">
              Bài do Admin cấp — {trackMeta.shortName} ({lessonsInSelectedTrack.length})
            </h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
              {currentTrackMode === "admin_only" ? "Đang thay thế hoàn toàn" : "Đang gộp cùng 3 bài chuẩn"}
            </span>
          </div>

          {lessonsInSelectedTrack.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500 space-y-2">
              <p>
                Chưa có bài Admin nào cho môn <strong>{trackMeta.name}</strong>.
              </p>
              <p>
                Bấm nút <strong>Nạp mẫu chuẩn {trackMeta.shortName}</strong> bên trái để tạo nhanh bài đầu tiên trong 10 giây!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {lessonsInSelectedTrack.map((l) => (
                <div
                  key={l.id}
                  className={`rounded-2xl border p-3.5 transition ${
                    editingId === l.id
                      ? "border-indigo-500 bg-indigo-50/50"
                      : "border-slate-200 bg-slate-50/50 hover:border-indigo-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-extrabold">
                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-700">Thứ tự #{l.order}</span>
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-slate-700">{l.difficulty}</span>
                        <span
                          className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 ${
                            l.is_published !== false
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          {l.is_published !== false ? "Đang hiển thị" : "Bản nháp"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-extrabold text-slate-900">{l.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{l.taskPrompt}</p>
                      <p className="mt-1 text-[10px] font-semibold text-slate-400">
                        {l.tests?.length || 0} Test Case • Tạo bởi {l.createdBy || "Admin"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEditLesson(l)}
                        title="Sửa bài"
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-indigo-400 hover:text-indigo-700"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteLesson(l.id, l.title)}
                        title="Xóa bài"
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:border-rose-300 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
