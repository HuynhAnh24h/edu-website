"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  Code2,
  GraduationCap,
  HelpCircle,
  Radio,
  Sparkles,
  X,
} from "lucide-react";

type TourKind = "teacher" | "student-classroom" | "coding";

interface FlyingTourStep {
  badge: string;
  title: string;
  description: string;
  targetSelector?: string;
  actionLabel?: string;
  actionHref?: string;
}

const TOURS: Record<TourKind, FlyingTourStep[]> = {
  teacher: [
    {
      badge: "Bước 1 / 4 • Chào mừng Thầy/Cô mới!",
      title: "Mở Lớp Phổ thông 1–12 & Lớp Lập trình ở đây!",
      description:
        "Hú hú! Mình là Cú Bông Edu! Bấm vào mục Quản lý Lớp học bên cạnh để mở ngay Lớp Phổ thông hoặc Lớp Lập trình Cộng đồng (HTML, JS, Go, Python, SQL...) và nhận Mã lớp cho học viên nhé!",
      targetSelector: '[data-tour="sidebar-classrooms"]',
    },
    {
      badge: "Bước 2 / 4 • Dạy trực tuyến 0đ",
      title: "Bấm nút này để Phát Livestream ngay trong lớp!",
      description:
        "Thầy/Cô có thể mở Video 2 chiều WebRTC (Camera, Mic, Chia sẻ Slide) hoặc phát Livestream YouTube/OBS kèm Live Chat & Điểm danh học viên tự động 100% miễn phí!",
      targetSelector: '[data-tour="header-live-btn"]',
    },
    {
      badge: "Bước 3 / 4 • Soạn thảo kiểu Word",
      title: "Soạn Bài giảng đẹp như Microsoft Word",
      description:
        "Mục Soạn Bài giảng hỗ trợ gõ công thức Toán/Lý/Hóa KaTeX, đính kèm PDF/Video và tự động nạp tri thức cho AI Gia sư 24/7!",
      targetSelector: '[data-tour="sidebar-lessons"]',
    },
    {
      badge: "Bước 4 / 4 • Giao bài & Chấm tự động",
      title: "Tạo Đề kiểm tra & Nâng cấp lớp học",
      description:
        "Tạo đề thi trắc nghiệm mã hóa AES-256-GCM hoặc giao thẳng các khóa Code thực hành cho lớp học. Chúc Thầy/Cô có những giờ giảng thật bùng nổ!",
      targetSelector: '[data-tour="sidebar-exams"]',
    },
  ],
  "student-classroom": [
    {
      badge: "Bước 1 / 4 • Vào lớp siêu nhanh",
      title: "Nhập Mã lớp hoặc chọn Lớp ở ngay đây!",
      description:
        "Mình là Cú Bông Edu! Nếu thầy cô đã gửi Mã lớp (VD: CODE-JS01 hoặc TOAN12-A1), bạn gõ thẳng vào ô này rồi bấm Tham gia là vào học ngay nhé!",
      targetSelector: '[data-tour="join-code-input"]',
    },
    {
      badge: "Bước 2 / 4 • Lọc Lớp Lập trình & Lớp 1–12",
      title: "Khám phá cả Lớp Lập trình Cộng đồng!",
      description:
        "Bạn có thể lọc xem các Lớp Lập trình (HTML, CSS, JS, TS, Python, Go, MongoDB, PostgreSQL) hoặc Lớp Phổ thông 1–12 rồi bấm Đăng ký học!",
      targetSelector: '[data-tour="classroom-filter"]',
    },
    {
      badge: "Bước 3 / 4 • Học Video Live & Giáo án",
      title: "Thấy chữ LIVE đỏ là bấm vào học trực tiếp!",
      description:
        "Khi giáo viên phát trực tuyến, thẻ lớp sẽ nhấp nháy chữ LIVE. Bấm Vào Phòng Live để xem video, điểm danh tự động và chat hỏi bài ngay!",
      targetSelector: '[data-tour="classroom-grid"]',
    },
    {
      badge: "Bước 4 / 4 • Thực hành Code & AI Gia sư",
      title: "Code trực tiếp & Hỏi AI 24/7",
      description:
        "Bấm sang mục Lập trình để chạy code thật trên trình duyệt (chạy đúng mới qua bài!), hoặc hỏi AI Gia sư bất cứ khi nào gặp bài khó nhé!",
      actionLabel: "Vào Học viện Lập trình ngay",
      actionHref: "/lap-trinh",
    },
  ],
  coding: [
    {
      badge: "Bước 1 / 4 • 8 Công nghệ Thực chiến",
      title: "Chọn ngôn ngữ bạn muốn chinh phục!",
      description:
        "Hú hú! Chào mừng bạn mới tới Học viện Lập trình Cộng đồng! Chọn ngay HTML, CSS, JavaScript, TypeScript, Python, Golang, MongoDB hoặc PostgreSQL ở dãy thẻ này nhé!",
      targetSelector: '[data-tour="coding-tracks"]',
    },
    {
      badge: "Bước 2 / 4 • Viết code ngay trên trình duyệt",
      title: "Gõ code trực tiếp tại khung Editor này!",
      description:
        "Không cần cài đặt gì cả! Gõ code của bạn trực tiếp vào khung tối này (hỗ trợ phím Tab & Ctrl+Enter để chạy siêu nhanh).",
      targetSelector: '[data-tour="coding-editor"]',
    },
    {
      badge: "Bước 3 / 4 • Chạy ĐÚNG mới qua bài!",
      title: "Bấm Chạy & Kiểm tra để mở khóa bài kế tiếp!",
      description:
        "Hệ thống sẽ chấm tự động từng test case. Chạy sai sẽ chưa mở bài sau — đạt 100% PASS là nút Chuyển bài tiếp theo sáng xanh ngay!",
      targetSelector: '[data-tour="coding-run-btn"]',
    },
    {
      badge: "Bước 4 / 4 • Rèn Tư duy 3 Tầng",
      title: "Gợi mở tư duy — Không cho chép sẵn!",
      description:
        "Mỗi lần tự chạy thử chưa ra, hệ thống sẽ mở dần 3 tầng gợi mở tư duy từ phân tích đề đến dàn ý thuật toán giúp bạn hiểu sâu tận gốc!",
      targetSelector: '[data-tour="coding-hints"]',
    },
  ],
};

function getContextualTip(pathname: string): { title: string; text: string; tour: TourKind } {
  if (pathname.startsWith("/quan-tri")) {
    return {
      title: "Cú Bông sẵn sàng dẫn đường Thầy/Cô!",
      text: "Bấm nút bên dưới để mình bay chỉ tận tay cách mở Lớp Lập trình, bật Phòng học Live 0đ và soạn bài giảng kiểu Word nhé!",
      tour: "teacher",
    };
  }
  if (pathname.startsWith("/lap-trinh")) {
    return {
      title: "Mẹo học Lập trình siêu hiệu quả!",
      text: "Tự đọc đề → gõ code vào khung tối → bấm Ctrl+Enter chấm test! Đạt 100% test mà không cần gợi ý sẽ nhận huy hiệu Tự lực xuất sắc!",
      tour: "coding",
    };
  }
  if (pathname.startsWith("/lop-hoc")) {
    return {
      title: "Mẹo tham gia Lớp Lập trình & Lớp 1–12",
      text: "Nhập mã lớp (VD: CODE-JS01 hoặc TOAN12-A1) vào ô góc trên phải, hoặc lọc 'Lớp Lập trình Cộng đồng' để đăng ký ngay!",
      tour: "student-classroom",
    };
  }
  if (pathname.startsWith("/tai-lieu")) {
    return {
      title: "Học theo từng Môn & Chương",
      text: "Chọn Khối lớp 1–12 → chọn thẻ Môn học (Toán, Lý, Hóa, Sử, Địa...) → bấm mở từng Chương ở cột trái để đọc bài giảng nhé!",
      tour: "student-classroom",
    };
  }
  return {
    title: "Hú hú! Mình là Cú Bông Edu!",
    text: "Mình có thể bay đi chỉ từng nút cho người mới học Lập trình, vào Lớp Live hoặc tạo lớp cho Giáo viên! Bấm xem hướng dẫn bay bên dưới nhé!",
    tour: "coding",
  };
}

function EduOwlSvg({
  happy = false,
  flying = false,
  pointing = false,
}: {
  happy?: boolean;
  flying?: boolean;
  pointing?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 92 84"
      className={`h-16 w-16 drop-shadow-lg ${flying ? "animate-owl-float" : ""}`}
      aria-hidden="true"
    >
      {/* Ngôi sao hào hứng khi bay hướng dẫn */}
      {flying && (
        <>
          <circle cx="12" cy="14" r="2.6" fill="#fbbf24" className="animate-ping" />
          <circle cx="80" cy="16" r="2.2" fill="#34d399" className="animate-pulse" />
        </>
      )}

      {/* Nón tốt nghiệp */}
      <polygon points="44,6 72,18 44,28 16,18" fill="#1e1b4b" />
      <rect x="32" y="20" width="24" height="7" rx="3" fill="#312e81" />
      <line x1="66" y1="18" x2="69" y2="31" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="69" cy="32" r="2.8" fill="#fbbf24" />

      {/* Cánh trái vỗ hào hứng */}
      <g className={flying ? "animate-owl-wing-l" : ""}>
        <ellipse cx="19" cy="51" rx="7" ry="12" fill="#4338ca" transform="rotate(16 19 51)" />
      </g>

      {/* Cánh phải vỗ hoặc giơ gậy chỉ đường */}
      <g className={flying ? "animate-owl-wing-r" : ""}>
        <ellipse cx="69" cy="50" rx="7" ry="12" fill="#4338ca" transform="rotate(-22 69 50)" />
        {pointing && (
          <g className="animate-owl-point">
            <line x1="72" y1="45" x2="87" y2="36" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
            <polygon points="89,35 83,33 85,40" fill="#fbbf24" />
          </g>
        )}
      </g>

      {/* Thân cú tròn đáng yêu */}
      <ellipse cx="44" cy="50" rx="24" ry="23" fill="#4f46e5" />
      <ellipse cx="44" cy="56" rx="16" ry="15" fill="#e0e7ff" />

      {/* Mắt đeo kính tri thức */}
      <circle cx="35" cy="43" r="8.5" fill="#ffffff" stroke="#1e1b4b" strokeWidth="2.2" />
      <circle cx="53" cy="43" r="8.5" fill="#ffffff" stroke="#1e1b4b" strokeWidth="2.2" />
      <line x1="43.5" y1="43" x2="44.5" y2="43" stroke="#1e1b4b" strokeWidth="2.2" />

      {happy || flying ? (
        <>
          <path d="M31.5 43.5 Q35 38.5 38.5 43.5" fill="none" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M49.5 43.5 Q53 38.5 56.5 43.5" fill="none" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="36" cy="43" r="3.6" fill="#0f172a" />
          <circle cx="54" cy="43" r="3.6" fill="#0f172a" />
          <circle cx="37.2" cy="41.6" r="1.2" fill="#ffffff" />
          <circle cx="55.2" cy="41.6" r="1.2" fill="#ffffff" />
        </>
      )}

      {/* Má hồng & Mỏ */}
      <circle cx="27" cy="50" r="2.8" fill="#fda4af" opacity="0.8" />
      <circle cx="61" cy="50" r="2.8" fill="#fda4af" opacity="0.8" />
      <polygon points="44,47 40,52 48,52" fill="#f59e0b" />

      {/* Chân nhỏ */}
      <ellipse cx="37" cy="72" rx="4.5" ry="2.5" fill="#f59e0b" />
      <ellipse cx="51" cy="72" rx="4.5" ry="2.5" fill="#f59e0b" />
    </svg>
  );
}

interface TargetBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function MascotGuide() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"tip" | "tour">("tip");
  const [tourKind, setTourKind] = useState<TourKind>("student-classroom");
  const [stepIdx, setStepIdx] = useState(0);
  const [celebrationMsg, setCelebrationMsg] = useState("");
  const [pulseBadge, setPulseBadge] = useState(false);

  // Tọa độ bay & khung spotlight bám theo phần tử đang chỉ dẫn
  const [targetBox, setTargetBox] = useState<TargetBox | null>(null);
  const [flyPos, setFlyPos] = useState<{ left: number; top: number; arrowDir: "left" | "right" | "up" | "down" } | null>(null);

  // Ẩn linh vật khi đang làm bài thi thật để tránh phân tâm
  const hidden = pathname.startsWith("/thi/phong-thi");

  const startTour = useCallback((kind: TourKind, customBanner = "") => {
    setTourKind(kind);
    setCelebrationMsg(customBanner);
    setMode("tour");
    setStepIdx(0);
    setOpen(true);
    setPulseBadge(false);
  }, []);

  // Lắng nghe sự kiện gọi linh vật bay chỉ dẫn từ mọi trang
  useEffect(() => {
    const onTourEvent = (e: Event) => {
      const custom = e as CustomEvent<{
        tour?: TourKind;
        className?: string;
        banner?: string;
      }>;
      const kind: TourKind =
        custom.detail?.tour ||
        (pathname.startsWith("/quan-tri")
          ? "teacher"
          : pathname.startsWith("/lap-trinh")
            ? "coding"
            : "student-classroom");
      const msg =
        custom.detail?.banner ||
        (custom.detail?.className
          ? `Chúc mừng bạn đã gia nhập lớp "${custom.detail.className}"!`
          : "");
      startTour(kind, msg);
    };
    window.addEventListener("eduk12:mascot-tour", onTourEvent);
    return () => window.removeEventListener("eduk12:mascot-tour", onTourEvent);
  }, [pathname, startTour]);

  // Tự động kích hoạt bay hướng dẫn cho Giáo viên vừa đăng ký / Học sinh mới / Người mới vào /lap-trinh
  useEffect(() => {
    if (typeof window === "undefined" || hidden) return;

    const pending = localStorage.getItem("eduk12_pending_tour") as TourKind | null;
    if (pending) {
      if (pending === "teacher" && pathname.startsWith("/quan-tri")) {
        localStorage.removeItem("eduk12_pending_tour");
        const timer = setTimeout(() => {
          startTour("teacher", "Chào mừng Thầy/Cô vừa đăng ký tài khoản! Để Cú Bông bay dẫn đường nhé!");
        }, 450);
        return () => clearTimeout(timer);
      }
      if (pending === "student-classroom" && !pathname.startsWith("/dang-nhap")) {
        localStorage.removeItem("eduk12_pending_tour");
        const timer = setTimeout(() => {
          startTour(
            pathname.startsWith("/lap-trinh") ? "coding" : "student-classroom",
            "Chào mừng thành viên mới gia nhập cộng đồng EduK12!"
          );
        }, 450);
        return () => clearTimeout(timer);
      }
    }

    if (pathname.startsWith("/lop-hoc") && !localStorage.getItem("eduk12_seen_classroom_mascot")) {
      localStorage.setItem("eduk12_seen_classroom_mascot", "1");
      const timer = setTimeout(() => startTour("student-classroom"), 500);
      return () => clearTimeout(timer);
    }

    if (pathname.startsWith("/lap-trinh") && !localStorage.getItem("eduk12_seen_coding_mascot")) {
      localStorage.setItem("eduk12_seen_coding_mascot", "1");
      const timer = setTimeout(() => startTour("coding"), 500);
      return () => clearTimeout(timer);
    }

    if (!localStorage.getItem("eduk12_mascot_greeted")) {
      setPulseBadge(true);
    }
  }, [pathname, hidden, startTour]);

  // Tính toán vị trí bay & khung spotlight bám theo phần tử mục tiêu của bước tour hiện tại
  useEffect(() => {
    if (!open || mode !== "tour" || hidden) {
      setTargetBox(null);
      setFlyPos(null);
      return;
    }

    const steps = TOURS[tourKind];
    const currentStep = steps[stepIdx];
    const selector = currentStep?.targetSelector;

    const updatePosition = (shouldScroll: boolean) => {
      if (!selector) {
        setTargetBox(null);
        setFlyPos(null);
        return;
      }
      const el = document.querySelector(selector);
      if (!el) {
        setTargetBox(null);
        setFlyPos(null);
        return;
      }
      if (shouldScroll) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setTargetBox(null);
        setFlyPos(null);
        return;
      }

      setTargetBox({
        top: rect.top - 6,
        left: rect.left - 6,
        width: rect.width + 12,
        height: rect.height + 12,
      });

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cardW = vw < 640 ? Math.min(320, vw - 24) : 356;
      const cardH = 260;

      // Ưu tiên bay sang phải phần tử -> sang trái -> xuống dưới -> lên trên
      let left = rect.right + 18;
      let top = rect.top - 12;
      let arrowDir: "left" | "right" | "up" | "down" = "left";

      if (left + cardW > vw - 16) {
        if (rect.left - cardW - 18 >= 16) {
          left = rect.left - cardW - 18;
          arrowDir = "right";
        } else if (rect.bottom + cardH + 24 <= vh) {
          left = Math.max(16, Math.min(rect.left, vw - cardW - 16));
          top = rect.bottom + 18;
          arrowDir = "up";
        } else {
          left = Math.max(16, Math.min(rect.left, vw - cardW - 16));
          top = Math.max(16, rect.top - cardH - 18);
          arrowDir = "down";
        }
      }

      top = Math.max(16, Math.min(top, vh - cardH - 16));
      left = Math.max(16, Math.min(left, vw - cardW - 16));
      setFlyPos({ left, top, arrowDir });
    };

    const initialTimer = setTimeout(() => updatePosition(true), 120);
    const settleTimer = setTimeout(() => updatePosition(false), 500);
    const onResizeOrScroll = () => updatePosition(false);

    window.addEventListener("resize", onResizeOrScroll);
    window.addEventListener("scroll", onResizeOrScroll, true);
    return () => {
      clearTimeout(initialTimer);
      clearTimeout(settleTimer);
      window.removeEventListener("resize", onResizeOrScroll);
      window.removeEventListener("scroll", onResizeOrScroll, true);
    };
  }, [open, mode, tourKind, stepIdx, hidden]);

  if (hidden) return null;

  const tip = getContextualTip(pathname);
  const steps = TOURS[tourKind];
  const currentStep = steps[stepIdx] || steps[0];
  const isFlyingTour = open && mode === "tour";

  const ArrowIcon =
    flyPos?.arrowDir === "left"
      ? ArrowLeft
      : flyPos?.arrowDir === "right"
        ? ArrowRight
        : flyPos?.arrowDir === "up"
          ? ArrowUp
          : ArrowDown;

  return (
    <>
      {/* Khung Spotlight phát sáng bao quanh nút / khu vực Cú Bông đang chỉ tới */}
      {isFlyingTour && targetBox && (
        <div
          className="pointer-events-none fixed z-40 rounded-2xl border-2 border-amber-400 bg-indigo-500/10 transition-all duration-500 ease-out animate-spotlight-ring"
          style={{
            top: targetBox.top,
            left: targetBox.left,
            width: targetBox.width,
            height: targetBox.height,
          }}
        />
      )}

      {/* CHẾ ĐỘ BAY THEO & CHỈ ĐƯỜNG KHI ĐANG HƯỚNG DẪN NGƯỜI MỚI */}
      {isFlyingTour && flyPos ? (
        <div
          className="fixed z-50 w-[320px] sm:w-[356px] transition-all duration-700 ease-out"
          style={{ left: flyPos.left, top: flyPos.top }}
        >
          {/* Chú Cú Bông bay lơ lửng ngay trên đầu hộp thoại, vỗ cánh & cầm que chỉ! */}
          <div className="mb-1 flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <EduOwlSvg happy={true} flying={true} pointing={true} />
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-extrabold text-slate-950 shadow-md animate-bounce">
                <ArrowIcon className="h-3.5 w-3.5" /> Xem ngay chỗ này!
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border-2 border-indigo-400 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 px-4 py-2.5 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-300" />
                <div>
                  <p className="text-xs font-extrabold leading-none">Cú Bông Edu • Đang bay chỉ đường</p>
                  <p className="mt-0.5 text-[10px] text-indigo-100">{currentStep.badge}</p>
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
              {stepIdx === 0 && celebrationMsg && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                  {celebrationMsg}
                </div>
              )}

              <h3 className="text-sm font-extrabold text-slate-900">{currentStep.title}</h3>
              <p className="text-xs leading-relaxed text-slate-600">{currentStep.description}</p>

              {currentStep.actionHref && (
                <Link
                  href={currentStep.actionHref}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                >
                  {currentStep.actionLabel} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="flex gap-1">
                  {steps.map((_, idx) => (
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
                  {stepIdx < steps.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setStepIdx((s) => s + 1)}
                      className="inline-flex items-center gap-0.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500"
                    >
                      Bay tiếp <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                    >
                      Bắt đầu ngay!
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* VỊ TRÍ GÓC DƯỚI PHẢI KHI ĐANG MỞ MẸO NHANH HOẶC ĐANG NGHỈ */
        <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2.5 sm:right-6 sm:bottom-6">
          {open && (
            <div className="w-[330px] sm:w-[360px] overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <div>
                    <p className="text-xs font-bold leading-none">Cú Bông Edu • Hướng dẫn viên</p>
                    <p className="mt-0.5 text-[10px] text-indigo-100">
                      {mode === "tour" ? currentStep.badge : "Mẹo nhanh tại trang này"}
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
                    {stepIdx === 0 && celebrationMsg && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                        {celebrationMsg}
                      </div>
                    )}
                    <h3 className="text-sm font-bold text-slate-900">{currentStep.title}</h3>
                    <p className="text-xs leading-relaxed text-slate-600">{currentStep.description}</p>
                    {currentStep.actionHref && (
                      <Link
                        href={currentStep.actionHref}
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                      >
                        {currentStep.actionLabel} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <div className="flex gap-1">
                        {steps.map((_, idx) => (
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
                        {stepIdx < steps.length - 1 ? (
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
                            Bắt đầu ngay!
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
                        href="/lap-trinh"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-2.5 py-2 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
                      >
                        <Code2 className="h-3.5 w-3.5" /> Học Lập trình
                      </Link>
                      <Link
                        href="/lop-hoc"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-2.5 py-2 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                      >
                        <Radio className="h-3.5 w-3.5" /> Lớp Live
                      </Link>
                      <Link
                        href="/tai-lieu"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-2.5 py-2 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                      >
                        <BookOpen className="h-3.5 w-3.5" /> Tài liệu 1–12
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
                      onClick={() => startTour(tip.tour)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-extrabold text-white shadow hover:bg-indigo-500 transition"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                      Cho Cú Bông bay chỉ dẫn từng nút!
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Nút Cú Bông nổi ở góc dưới phải (lơ lửng bay nhẹ) */}
          <button
            type="button"
            onClick={() => {
              localStorage.setItem("eduk12_mascot_greeted", "1");
              setPulseBadge(false);
              if (!open) setMode("tip");
              setOpen((v) => !v);
            }}
            className="group relative flex items-center gap-2 rounded-full border-2 border-indigo-200 bg-white p-1.5 pr-4 shadow-lg transition hover:-translate-y-1 hover:border-indigo-400 hover:shadow-xl"
            title="Gọi Cú Bông Edu bay chỉ dẫn!"
          >
            {pulseBadge && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-amber-500" />
              </span>
            )}
            <div className="transition-transform group-hover:scale-105">
              <EduOwlSvg happy={open} flying={true} pointing={false} />
            </div>
            <div className="text-left">
              <p className="flex items-center gap-1 text-xs font-extrabold text-slate-900 leading-tight">
                <GraduationCap className="h-3.5 w-3.5 text-indigo-600" /> Cú Bông Edu
              </p>
              <p className="text-[10px] font-semibold text-indigo-600 leading-tight">
                {open ? "Thu gọn" : "Bay chỉ đường!"}
              </p>
            </div>
          </button>
        </div>
      )}
    </>
  );
}
