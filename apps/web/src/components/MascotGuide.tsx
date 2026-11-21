"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  HelpCircle,
  Sparkles,
  X,
} from "lucide-react";

interface TourStep {
  badge: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

const CLASSROOM_TOUR_STEPS: TourStep[] = [
  {
    badge: "Bước 1 / 4 • Lớp học & Phòng Live trực tuyến",
    title: "Chào mừng bạn gia nhập Lớp học!",
    description:
      "Mình là Cú Bông Edu — trợ lý đồng hành cùng bạn từ Lớp 1 đến Lớp 12. Khi giáo viên bật phát trực tiếp, bạn sẽ thấy nút đỏ 'Vào Phòng Live' để học video trực tiếp, chat hỏi đáp và điểm danh tự động!",
    actionLabel: "Mở danh sách Lớp học",
    actionHref: "/lop-hoc",
  },
  {
    badge: "Bước 2 / 4 • Học lý thuyết & Tài liệu",
    title: "Học bài giảng chuẩn GDPT 2018",
    description:
      "Bấm vào từng bài trong Giáo án của lớp (hoặc vào mục Tài liệu 1–12 để xem đủ các môn Toán, Lý, Hóa, Sử, Địa...). Mọi công thức đều hiển thị rõ nét bằng KaTeX kèm tài liệu PDF.",
    actionLabel: "Khám phá Tài liệu 1–12",
    actionHref: "/tai-lieu",
  },
  {
    badge: "Bước 3 / 4 • Kiểm tra trực tuyến",
    title: "Làm bài kiểm tra an toàn không lo rớt mạng",
    description:
      "Khi giáo viên giao bài kiểm tra, bấm 'Làm bài ngay'. Hệ thống tự động lưu nháp trên máy bạn (IndexedDB), chấm điểm ngay sau khi nộp và cập nhật thẳng vào bảng điểm của lớp!",
    actionLabel: "Vào phòng Thi trắc nghiệm",
    actionHref: "/thi",
  },
  {
    badge: "Bước 4 / 4 • AI Gia sư 24/7",
    title: "Gặp bài khó? Hỏi ngay AI Gia sư!",
    description:
      "Trong mọi bài giảng đều có nút 'Hỏi AI về bài này'. AI Gia sư sẽ khóa đúng kiến thức lớp bạn đang học và gợi mở từng bước để bạn tự hiểu sâu bản chất bài toán.",
    actionLabel: "Trò chuyện với AI Gia sư",
    actionHref: "/ai-gia-su",
  },
];

function getContextualTip(pathname: string): { title: string; text: string } {
  if (pathname.startsWith("/lop-hoc")) {
    return {
      title: "Mẹo đăng ký Lớp học nhanh",
      text: "Bạn có thể bấm 'Đăng ký học' trên thẻ lớp bên dưới, hoặc nhập Mã lớp (VD: TOAN12-A1) vào ô góc trên bên phải để vào học đúng giáo án ngay!",
    };
  }
  if (pathname.startsWith("/tai-lieu")) {
    return {
      title: "Học theo từng Môn & Chương",
      text: "Chọn Khối lớp 1–12 → chọn thẻ Môn học (Toán, Lý, Hóa, Sử, Địa...) → bấm mở từng Chương ở cột trái để đọc bài giảng nhé!",
    };
  }
  if (pathname.startsWith("/bai-tap")) {
    return {
      title: "Luyện tập chấm ngay lập tức",
      text: "Chọn đáp án rồi bấm 'Kiểm tra đáp án' để xem điểm và lời giải chi tiết từng bước cho cả 4 dạng câu hỏi mới 2025+!",
    };
  }
  if (pathname.startsWith("/thi")) {
    return {
      title: "Phòng thi siêu tốc AES-256-GCM",
      text: "Đề thi được bảo mật và lưu nháp tự động trên máy bạn — lỡ rớt mạng hay F5 vẫn không mất bài làm!",
    };
  }
  if (pathname.startsWith("/ai-gia-su")) {
    return {
      title: "Bí quyết hỏi AI Gia sư hiệu quả",
      text: "Nhớ chọn đúng Lớp (1–12) và chế độ 'Gợi mở Socratic' ở thanh trên để thầy AI dẫn dắt từng bước dễ hiểu nhất nhé!",
    };
  }
  return {
    title: "Xin chào! Mình là Cú Bông Edu",
    text: "Chọn Khối lớp & Môn học ngay ở trang chủ, hoặc vào mục 'Lớp học' để đăng ký theo giáo án của giáo viên nhé!",
  };
}

function EduOwlSvg({ happy = false }: { happy?: boolean }) {
  return (
    <svg viewBox="0 0 80 80" className="h-14 w-14 drop-shadow-md" aria-hidden="true">
      {/* Nón tốt nghiệp */}
      <polygon points="40,6 68,18 40,28 12,18" fill="#1e1b4b" />
      <rect x="28" y="20" width="24" height="7" rx="3" fill="#312e81" />
      <line x1="62" y1="18" x2="65" y2="31" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="65" cy="32" r="2.8" fill="#fbbf24" />

      {/* Thân cú tròn đáng yêu */}
      <ellipse cx="40" cy="50" rx="24" ry="23" fill="#4f46e5" />
      <ellipse cx="40" cy="56" rx="16" ry="15" fill="#e0e7ff" />

      {/* Cánh trái & phải */}
      <ellipse cx="16" cy="52" rx="6" ry="11" fill="#4338ca" transform="rotate(14 16 52)" />
      <ellipse cx="64" cy="52" rx="6" ry="11" fill="#4338ca" transform="rotate(-14 64 52)" />

      {/* Mắt đeo kính tri thức */}
      <circle cx="31" cy="43" r="8.5" fill="#ffffff" stroke="#1e1b4b" strokeWidth="2.2" />
      <circle cx="49" cy="43" r="8.5" fill="#ffffff" stroke="#1e1b4b" strokeWidth="2.2" />
      <line x1="39.5" y1="43" x2="40.5" y2="43" stroke="#1e1b4b" strokeWidth="2.2" />

      {happy ? (
        <>
          <path d="M27.5 43.5 Q31 39 34.5 43.5" fill="none" stroke="#1e1b4b" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M45.5 43.5 Q49 39 52.5 43.5" fill="none" stroke="#1e1b4b" strokeWidth="2.4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="32" cy="43" r="3.6" fill="#0f172a" />
          <circle cx="50" cy="43" r="3.6" fill="#0f172a" />
          <circle cx="33.2" cy="41.6" r="1.2" fill="#ffffff" />
          <circle cx="51.2" cy="41.6" r="1.2" fill="#ffffff" />
        </>
      )}

      {/* Má hồng & Mỏ */}
      <circle cx="23" cy="50" r="2.6" fill="#fda4af" opacity="0.7" />
      <circle cx="57" cy="50" r="2.6" fill="#fda4af" opacity="0.7" />
      <polygon points="40,47 36,52 44,52" fill="#f59e0b" />

      {/* Chân nhỏ */}
      <ellipse cx="33" cy="72" rx="4.5" ry="2.5" fill="#f59e0b" />
      <ellipse cx="47" cy="72" rx="4.5" ry="2.5" fill="#f59e0b" />
    </svg>
  );
}

export function MascotGuide() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"tip" | "tour">("tip");
  const [stepIdx, setStepIdx] = useState(0);
  const [enrolledClassName, setEnrolledClassName] = useState<string>("");
  const [pulseBadge, setPulseBadge] = useState(false);

  // Ẩn linh vật khi đang ở Dashboard Quản trị hoặc đang trong phòng thi thật (tránh làm phân tâm)
  const hidden =
    pathname.startsWith("/quan-tri") || pathname.startsWith("/thi/phong-thi");

  // Lắng nghe sự kiện học sinh vừa đăng ký lớp học -> tự bật hướng dẫn từng bước!
  useEffect(() => {
    const onTourEvent = (e: Event) => {
      const custom = e as CustomEvent<{ className?: string }>;
      setEnrolledClassName(custom.detail?.className || "");
      setMode("tour");
      setStepIdx(0);
      setOpen(true);
      setPulseBadge(false);
    };
    window.addEventListener("eduk12:mascot-tour", onTourEvent);
    return () => window.removeEventListener("eduk12:mascot-tour", onTourEvent);
  }, []);

  // Tự mở nhẹ lần đầu khi học sinh ghé trang /lop-hoc
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname.startsWith("/lop-hoc")) {
      const seen = localStorage.getItem("eduk12_seen_classroom_mascot");
      if (!seen) {
        localStorage.setItem("eduk12_seen_classroom_mascot", "1");
        setMode("tour");
        setStepIdx(0);
        setOpen(true);
      }
    } else if (!localStorage.getItem("eduk12_mascot_greeted")) {
      setPulseBadge(true);
    }
  }, [pathname]);

  if (hidden) return null;

  const tip = getContextualTip(pathname);
  const currentStep = CLASSROOM_TOUR_STEPS[stepIdx];

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2.5 sm:right-6 sm:bottom-6">
      {/* Hộp thoại hướng dẫn của Linh vật */}
      {open && (
        <div className="w-[330px] sm:w-[360px] overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-2xl">
          {/* Header linh vật */}
          <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <div>
                <p className="text-xs font-bold leading-none">Cú Bông Edu • Hướng dẫn viên</p>
                <p className="mt-0.5 text-[10px] text-indigo-100">
                  {mode === "tour" ? currentStep.badge : "Mẹo học tập tại trang này"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-white/80 hover:bg-white/15 hover:text-white"
              aria-label="Đóng hướng dẫn"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {mode === "tour" ? (
              <>
                {stepIdx === 0 && enrolledClassName && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                    Chúc mừng bạn đã đăng ký vào lớp &quot;{enrolledClassName}&quot;!
                  </div>
                )}
                <h3 className="text-sm font-bold text-slate-900">{currentStep.title}</h3>
                <p className="text-xs leading-relaxed text-slate-600">
                  {currentStep.description}
                </p>

                {currentStep.actionHref && (
                  <Link
                    href={currentStep.actionHref}
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                  >
                    {currentStep.actionLabel} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}

                {/* Thanh chấm tiến độ & Nút Trước / Tiếp */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex gap-1">
                    {CLASSROOM_TOUR_STEPS.map((_, idx) => (
                      <span
                        key={idx}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === stepIdx ? "w-5 bg-indigo-600" : "w-1.5 bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {stepIdx > 0 && (
                      <button
                        type="button"
                        onClick={() => setStepIdx((s) => s - 1)}
                        className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" /> Trước
                      </button>
                    )}
                    {stepIdx < CLASSROOM_TOUR_STEPS.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setStepIdx((s) => s + 1)}
                        className="inline-flex items-center gap-0.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500"
                      >
                        Tiếp <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                      >
                        Bắt đầu học!
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-sm font-bold text-slate-900">{tip.title}</h3>
                <p className="text-xs leading-relaxed text-slate-600">{tip.text}</p>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <Link
                    href="/lop-hoc"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-2.5 py-2 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
                  >
                    <GraduationCap className="h-3.5 w-3.5" /> Đăng ký Lớp
                  </Link>
                  <Link
                    href="/tai-lieu"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-2.5 py-2 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                  >
                    <BookOpen className="h-3.5 w-3.5" /> Tài liệu 1–12
                  </Link>
                  <Link
                    href="/thi"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-2.5 py-2 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" /> Thi thử
                  </Link>
                  <Link
                    href="/ai-gia-su"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-1.5 rounded-xl bg-purple-50 px-2.5 py-2 text-[11px] font-bold text-purple-700 hover:bg-purple-100"
                  >
                    <Bot className="h-3.5 w-3.5" /> AI Gia sư
                  </Link>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEnrolledClassName("");
                    setMode("tour");
                    setStepIdx(0);
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-white py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  Xem hướng dẫn 4 bước sử dụng website
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Nút Linh vật nổi góc dưới phải */}
      <button
        type="button"
        onClick={() => {
          localStorage.setItem("eduk12_mascot_greeted", "1");
          setPulseBadge(false);
          if (!open) setMode("tip");
          setOpen((v) => !v);
        }}
        className="group relative flex items-center gap-2 rounded-full border-2 border-indigo-200 bg-white p-1.5 pr-4 shadow-lg transition hover:-translate-y-1 hover:border-indigo-400 hover:shadow-xl"
        title="Hỏi Cú Bông Edu hướng dẫn sử dụng website"
      >
        {pulseBadge && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-amber-500" />
          </span>
        )}
        <div className="transition-transform group-hover:scale-105">
          <EduOwlSvg happy={open} />
        </div>
        <div className="text-left">
          <p className="text-xs font-bold text-slate-900 leading-tight">Cú Bông Edu</p>
          <p className="text-[10px] font-semibold text-indigo-600 leading-tight">
            {open ? "Thu gọn" : "Hướng dẫn bạn!"}
          </p>
        </div>
      </button>
    </div>
  );
}
