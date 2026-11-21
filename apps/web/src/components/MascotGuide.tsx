"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  Pause,
  Play,
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
      title: "Cú Bông luôn bay theo dẫn đường Thầy/Cô!",
      text: "Thầy/Cô cứ bấm chọn bất kỳ mục nào — Cú Bông sẽ tự bay vù tới ngay chỗ đó để chỉ dẫn!",
      tour: "teacher",
    };
  }
  if (pathname.startsWith("/lap-trinh")) {
    return {
      title: "Học Lập trình cùng Cú Bông!",
      text: "Chọn ngôn ngữ → gõ code → bấm Ctrl+Enter! Cú Bông sẽ bay theo cổ vũ từng bước của bạn!",
      tour: "coding",
    };
  }
  if (pathname.startsWith("/lop-hoc")) {
    return {
      title: "Tham gia Lớp Lập trình & Lớp 1–12",
      text: "Nhập mã lớp (VD: CODE-JS01 hoặc TOAN12-A1) hoặc chọn lớp bên dưới để vào học ngay!",
      tour: "student-classroom",
    };
  }
  return {
    title: "Hú hú! Mình là Cú Bông Edu!",
    text: "Bạn cứ bấm chọn bất kỳ nút hay mục nào trên web — mình sẽ tự động vỗ cánh bay ngay tới chỗ đó để hướng dẫn bạn liền!",
    tour: "coding",
  };
}

/**
 * Sinh lời dẫn hào hứng theo đúng nút/mục người dùng vừa bấm chọn
 */
function buildInstantReaction(el: HTMLElement): string {
  const tourAttr = el.getAttribute("data-tour") || "";
  const href = el.getAttribute("href") || "";
  const rawText = (el.textContent || "").replace(/\s+/g, " ").trim();
  const shortLabel = rawText.slice(0, 38);
  const lower = rawText.toLowerCase();

  if (tourAttr === "sidebar-classrooms" || lower.includes("quản lý lớp")) {
    return "Mở Lớp Lập trình hoặc Lớp 1–12, lấy Mã lớp & quản lý học viên ngay tại đây!";
  }
  if (tourAttr === "header-live-btn" || lower.includes("phát live") || lower.includes("phòng học live")) {
    return "Bật Video 2 chiều 0đ hoặc dán link YouTube/OBS để dạy trực tuyến kèm điểm danh!";
  }
  if (tourAttr === "sidebar-lessons" || lower.includes("soạn bài giảng")) {
    return "Soạn bài giảng đẹp như Microsoft Word + chèn công thức Toán/Lý/Hóa KaTeX!";
  }
  if (tourAttr === "sidebar-exams" || lower.includes("đề kiểm tra")) {
    return "Xuất bản đề thi mã hóa AES-256-GCM và giao thẳng cho lớp học chấm tự động!";
  }
  if (tourAttr === "coding-run-btn" || lower.includes("chạy & kiểm tra")) {
    return "Đang chạy chấm test! Đạt 100% PASS là Cú Bông mở khóa bài tiếp theo liền!";
  }
  if (lower.includes("tạo lớp học") || lower.includes("mở lớp")) {
    return "Chọn 'Lớp Lập trình Cộng đồng' hoặc 'Lớp 1–12' rồi đặt tên lớp thật hay nhé!";
  }
  if (lower.includes("lớp lập trình")) {
    return "Tuyệt vời! Bạn có thể dạy HTML, CSS, JS, TS, Python, Golang, MongoDB & PostgreSQL!";
  }
  if (lower.includes("gợi mở tầng")) {
    return "Đọc kỹ gợi mở rồi tự tay gõ code nhé — tự tư duy mới nhớ lâu cực đỉnh!";
  }
  if (lower.includes("chuyển bài tiếp theo")) {
    return "Quá xuất sắc! Bay sang chinh phục thử thách tiếp theo nào!";
  }
  if (lower.includes("đăng ký học") || lower.includes("tham gia")) {
    return "Hoan hô! Vào lớp học đúng giáo án & nhớ điểm danh khi thầy cô bật LIVE nhé!";
  }
  if (lower.includes("vào phòng live")) {
    return "Đang mở Phòng học Trực tuyến — hệ thống tự điểm danh bạn rồi đó!";
  }
  if (href.includes("/lap-trinh") || /\b(html|css|javascript|typescript|python|golang|mongodb|postgresql)\b/i.test(lower)) {
    return `Chinh phục ${shortLabel || "Lập trình"} ngay trên trình duyệt — chạy ĐÚNG mới qua bài!`;
  }
  if (href.includes("/lop-hoc") || lower.includes("lớp live")) {
    return "Khám phá Lớp Lập trình Cộng đồng & Lớp Phổ thông 1–12 có Livestream 0đ!";
  }
  if (href.includes("/tai-lieu") || /^lớp\s+\d+$/i.test(lower)) {
    return `Mở ngay ${shortLabel} để xem đầy đủ các môn theo Chương & Bài giảng chuẩn GDPT 2018!`;
  }
  if (href.includes("/ai-gia-su") || lower.includes("ai gia sư")) {
    return "Hỏi AI Gia sư Socratic bất cứ bài khó nào — thầy AI sẽ gợi mở từng bước dễ hiểu!";
  }
  if (href.includes("/dang-nhap") || lower.includes("đăng nhập") || lower.includes("2fa")) {
    return "Hỗ trợ đăng nhập Email, Google, Facebook & bật bảo mật 2FA Google Authenticator!";
  }
  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
    return "Cú Bông đang đứng cạnh cổ vũ bạn nhập liệu đây! Cứ tự tin nhé!";
  }
  if (shortLabel) {
    return `Bạn vừa chọn "${shortLabel}" — Cú Bông đã bay tới ngay để đồng hành cùng bạn!`;
  }
  return "Hú hú! Cú Bông đang bay theo hỗ trợ từng thao tác của bạn đây!";
}

function EduOwlSvg({
  happy = false,
  flying = false,
  pointing = false,
  faceLeft = false,
}: {
  happy?: boolean;
  flying?: boolean;
  pointing?: boolean;
  faceLeft?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 92 84"
      className={`h-16 w-16 drop-shadow-lg ${flying ? "animate-owl-float" : ""} ${
        faceLeft ? "-scale-x-100" : ""
      }`}
      aria-hidden="true"
    >
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

      {/* Cánh phải vỗ & cầm que chỉ đường */}
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

  // CHẾ ĐỘ TỰ ĐỘNG BAY THEO BẤT KỲ MỤC NÀO NGƯỜI DÙNG CHỌN (MẶC ĐỊNH BẬT SẴN!)
  const [autoFollow, setAutoFollow] = useState(true);
  const [companionPos, setCompanionPos] = useState<{ left: number; top: number; faceLeft: boolean } | null>(null);
  const [instantSpeech, setInstantSpeech] = useState("");
  const [bursting, setBursting] = useState(false);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tọa độ bay & khung spotlight khi chạy tour từng bước
  const [targetBox, setTargetBox] = useState<TargetBox | null>(null);
  const [flyPos, setFlyPos] = useState<{ left: number; top: number; arrowDir: "left" | "right" | "up" | "down" } | null>(null);

  // Ẩn linh vật khi đang làm bài thi thật
  const hidden = pathname.startsWith("/thi/phong-thi");

  // Khôi phục tùy chọn autoFollow và đặt vị trí xuất phát ở góc dưới phải để cú bay mượt ngay từ cú click ĐẦU TIÊN
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("eduk12_mascot_autofollow");
    if (saved === "0") {
      setAutoFollow(false);
    } else {
      setCompanionPos({
        left: Math.max(16, window.innerWidth - 96),
        top: Math.max(80, window.innerHeight - 96),
        faceLeft: true,
      });
    }
  }, []);

  const toggleAutoFollow = () => {
    setAutoFollow((prev) => {
      const next = !prev;
      localStorage.setItem("eduk12_mascot_autofollow", next ? "1" : "0");
      if (!next) {
        setCompanionPos(null);
        setInstantSpeech("");
      } else {
        setCompanionPos({
          left: Math.max(16, window.innerWidth - 96),
          top: Math.max(80, window.innerHeight - 96),
          faceLeft: true,
        });
      }
      return next;
    });
  };

  const startTour = useCallback((kind: TourKind, customBanner = "") => {
    setTourKind(kind);
    setCelebrationMsg(customBanner);
    setMode("tour");
    setStepIdx(0);
    setOpen(true);
    setInstantSpeech("");
  }, []);

  // === TỰ ĐỘNG BAY VÙ TỚI NGAY BẤT KỲ NÚT / MỤC NÀO NGƯỜI DÙNG CHỌN (KHÔNG CẦN ẤN CHO PHÉP!) ===
  useEffect(() => {
    if (hidden || !autoFollow) return;

    const handleGlobalClick = (e: MouseEvent) => {
      // Nếu đang mở tour hướng dẫn chính thì nhường quyền cho tour
      if (open && mode === "tour") return;

      const rawTarget = e.target as HTMLElement | null;
      if (!rawTarget || rawTarget.closest("[data-mascot-ui]")) return;

      const interactive = rawTarget.closest(
        'button, a, select, input, textarea, [role="tab"], [data-tour]'
      ) as HTMLElement | null;
      if (!interactive) return;

      const rect = interactive.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const owlW = 72;
      const owlH = 72;

      // Bay tới đậu ngay cạnh phần tử vừa chọn (tránh che mất phần tử đang bấm)
      let left = rect.right + 10;
      let faceLeft = true; // Cú quay mặt nhìn vào nút bên trái nó
      if (left + owlW + 16 > vw) {
        left = Math.max(12, rect.left - owlW - 10);
        faceLeft = false; // Đậu bên trái thì quay mặt nhìn sang phải
      }
      let top = rect.top + rect.height / 2 - owlH / 2 - 8;
      top = Math.max(72, Math.min(top, vh - owlH - 16));
      left = Math.max(12, Math.min(left, vw - owlW - 12));

      setCompanionPos({ left, top, faceLeft });
      setInstantSpeech(buildInstantReaction(interactive));
      setBursting(true);

      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
      burstTimerRef.current = setTimeout(() => setBursting(false), 1400);

      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      speechTimerRef.current = setTimeout(() => setInstantSpeech(""), 4800);
    };

    document.addEventListener("click", handleGlobalClick, true);
    return () => {
      document.removeEventListener("click", handleGlobalClick, true);
    };
  }, [hidden, autoFollow, open, mode]);

  // Lắng nghe sự kiện gọi tour từ mọi trang
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

  // Tự động kích hoạt tour bay khi Giáo viên / Học viên vừa đăng ký mới
  useEffect(() => {
    if (typeof window === "undefined" || hidden) return;

    const pending = localStorage.getItem("eduk12_pending_tour") as TourKind | null;
    if (pending) {
      if (pending === "teacher" && pathname.startsWith("/quan-tri")) {
        localStorage.removeItem("eduk12_pending_tour");
        const timer = setTimeout(() => {
          startTour("teacher", "Chào mừng Thầy/Cô mới! Cú Bông bay dẫn đường liền đây!");
        }, 400);
        return () => clearTimeout(timer);
      }
      if (pending === "student-classroom" && !pathname.startsWith("/dang-nhap")) {
        localStorage.removeItem("eduk12_pending_tour");
        const timer = setTimeout(() => {
          startTour(
            pathname.startsWith("/lap-trinh") ? "coding" : "student-classroom",
            "Chào mừng thành viên mới gia nhập cộng đồng EduK12!"
          );
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname, hidden, startTour]);

  // Tính vị trí Spotlight & bay theo bước tour
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

  // Khi đang ở chế độ tự bay theo người dùng (chưa mở hộp thoại menu)
  const isRoaming = !open && autoFollow && companionPos !== null;

  return (
    <>
      {/* Khung Spotlight phát sáng khi đang chạy tour từng bước */}
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

      {/* CHẾ ĐỘ 1: TOUR BAY CHỈ TỪNG NÚT */}
      {isFlyingTour && flyPos ? (
        <div
          data-mascot-ui
          className="fixed z-50 w-[320px] sm:w-[356px] transition-all duration-700 ease-out"
          style={{ left: flyPos.left, top: flyPos.top }}
        >
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
      ) : isRoaming && companionPos ? (
        /* CHẾ ĐỘ 2: CÚ BÔNG TỰ ĐỘNG BAY VÙ TỚI ĐÚNG MỤC NGƯỜI DÙNG VỪA BẤM CHỌN! */
        <div
          data-mascot-ui
          className="pointer-events-none fixed z-50 transition-all duration-700 ease-out"
          style={{ left: companionPos.left, top: companionPos.top }}
        >
          <div className="relative flex items-start gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("tip");
                setOpen(true);
              }}
              title="Bấm vào Cú Bông để xem menu nhanh hoặc tạm dừng bay theo"
              className="pointer-events-auto relative rounded-full p-0.5 transition hover:scale-110 focus:outline-none"
            >
              <EduOwlSvg
                happy={true}
                flying={true}
                pointing={bursting}
                faceLeft={companionPos.faceLeft}
              />
            </button>

            {instantSpeech && (
              <div
                className={`pointer-events-none absolute ${
                  companionPos.left > (typeof window !== "undefined" ? window.innerWidth * 0.58 : 700)
                    ? "right-16"
                    : "left-16"
                } top-0 w-60 rounded-2xl border-2 border-indigo-300 bg-white/95 px-3.5 py-2.5 text-xs font-semibold text-slate-800 shadow-xl backdrop-blur`}
              >
                <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-indigo-600">
                  <Sparkles className="h-3 w-3 text-amber-500" /> Cú Bông Edu
                </div>
                <p className="mt-0.5 leading-snug">{instantSpeech}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* CHẾ ĐỘ 3: MENU NHANH / GÓC NGHỈ DƯỚI PHẢI */
        <div
          data-mascot-ui
          className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2.5 sm:right-6 sm:bottom-6"
        >
          {open && (
            <div className="w-[330px] sm:w-[360px] overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <div>
                    <p className="text-xs font-bold leading-none">Cú Bông Edu • Trợ lý Bay theo</p>
                    <p className="mt-0.5 text-[10px] text-indigo-100">
                      {autoFollow ? "Đang BẬT tự động bay theo mục bạn chọn" : "Đang tạm nghỉ tại góc màn hình"}
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
                <h3 className="text-sm font-bold text-slate-900">{tip.title}</h3>
                <p className="text-xs leading-relaxed text-slate-600">{tip.text}</p>

                {/* Công tắc bật/tắt tự bay theo ngay */}
                <button
                  type="button"
                  onClick={toggleAutoFollow}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold transition ${
                    autoFollow
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {autoFollow ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                    Tự bay theo mọi nút bạn chọn
                  </span>
                  <span className="rounded-md bg-white px-2 py-0.5 text-[10px] uppercase shadow-xs">
                    {autoFollow ? "Đang bật" : "Đã tắt"}
                  </span>
                </button>

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
                  Xem Tour 4 bước Spotlight
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (!open) setMode("tip");
              setOpen((v) => !v);
            }}
            className="group relative flex items-center gap-2 rounded-full border-2 border-indigo-200 bg-white p-1.5 pr-4 shadow-lg transition hover:-translate-y-1 hover:border-indigo-400 hover:shadow-xl"
            title="Cú Bông Edu — Tự động bay theo mọi mục bạn chọn!"
          >
            <div className="transition-transform group-hover:scale-105">
              <EduOwlSvg happy={open} flying={true} pointing={false} />
            </div>
            <div className="text-left">
              <p className="flex items-center gap-1 text-xs font-extrabold text-slate-900 leading-tight">
                <GraduationCap className="h-3.5 w-3.5 text-indigo-600" /> Cú Bông Edu
              </p>
              <p className="text-[10px] font-semibold text-indigo-600 leading-tight">
                {open ? "Thu gọn" : autoFollow ? "Chọn gì mình bay liền!" : "Đang tạm nghỉ"}
              </p>
            </div>
          </button>
        </div>
      )}
    </>
  );
}
