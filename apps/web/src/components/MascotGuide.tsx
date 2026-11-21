"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

interface FlightWaypoint {
  selector: string;
  text: string;
}

const ROUTE_FLIGHTS: Record<string, FlightWaypoint[]> = {
  "/lap-trinh": [
    {
      selector: '[data-tour="coding-tracks"]',
      text: "Chọn 1 trong 8 ngôn ngữ (HTML, CSS, JS, TS, Go, Python, MongoDB, PostgreSQL) tại đây!",
    },
    {
      selector: '[data-tour="coding-editor"]',
      text: "Gõ code trực tiếp trên trình duyệt — hỗ trợ Tab & Ctrl+Enter chạy siêu nhanh!",
    },
    {
      selector: '[data-tour="coding-run-btn"]',
      text: "Bấm Chạy & Kiểm tra — đạt 100% test mới mở khóa bài tiếp theo!",
    },
  ],
  "/tai-lieu": [
    {
      selector: '[data-tour="docs-grades"]',
      text: "Chọn Khối Lớp 1 đến 12 theo đúng chương trình GDPT 2018 ở thanh này nhé!",
    },
    {
      selector: '[data-tour="docs-subjects"]',
      text: "Bấm chọn Môn học (Toán, Lý, Hóa, Sinh, Sử, Địa...) để mở cây Chương & Bài giảng!",
    },
  ],
  "/lop-hoc": [
    {
      selector: '[data-tour="join-code-input"]',
      text: "Nhập Mã lớp (VD: CODE-JS01 hoặc TOAN12-A1) để vào lớp ngay!",
    },
    {
      selector: '[data-tour="classroom-filter"]',
      text: "Lọc nhanh Lớp Lập trình Cộng đồng hoặc các khối Lớp 1–12!",
    },
    {
      selector: '[data-tour="classroom-grid"]',
      text: "Thấy badge LIVE đỏ là bấm Vào Phòng Live học trực tuyến & điểm danh ngay!",
    },
  ],
  "/bai-tap": [
    {
      selector: '[data-tour="ex-sets"]',
      text: "Chọn bộ bài tập theo Lớp & Môn để luyện cả 4 định dạng câu hỏi mới 2025+!",
    },
    {
      selector: '[data-tour="ex-questions"]',
      text: "Chọn đáp án rồi bấm Kiểm tra để xem điểm & lời giải chi tiết ngay lập tức!",
    },
  ],
  "/thi": [
    {
      selector: '[data-tour="exam-list"]',
      text: "Chọn đề thi mã hóa AES-256-GCM rồi bấm Vào phòng thi — tự lưu nháp chống rớt mạng!",
    },
    {
      selector: '[data-tour="exam-leaderboard"]',
      text: "Nộp bài xong điểm của bạn sẽ cập nhật tức thì trên Bảng xếp hạng trực tiếp này!",
    },
  ],
  "/ai-gia-su": [
    {
      selector: '[data-tour="ai-controls"]',
      text: "Chọn đúng Khối lớp & chế độ Gợi mở Socratic để AI dẫn dắt đúng trình độ của bạn!",
    },
    {
      selector: '[data-tour="ai-input"]',
      text: "Gõ bài khó hoặc câu hỏi bất kỳ vào đây — AI Gia sư hỗ trợ bạn 24/7!",
    },
  ],
  "/dang-nhap": [
    {
      selector: '[data-tour="auth-2fa"], [data-tour="auth-social"]',
      text: "Đăng nhập nhanh bằng Google, Facebook hoặc Email — và nhớ bật bảo mật 2FA bằng mã QR nhé!",
    },
  ],
  "/quan-tri": [
    {
      selector: '[data-tour="sidebar-classrooms"]',
      text: "Mở Lớp Lập trình Cộng đồng hoặc Lớp Phổ thông 1–12 tại đây!",
    },
    {
      selector: '[data-tour="header-live-btn"]',
      text: "Bấm Phát Live để dạy Video 2 chiều 0đ hoặc OBS kèm điểm danh tự động!",
    },
    {
      selector: '[data-tour="sidebar-lessons"]',
      text: "Soạn bài giảng đẹp như Word, chèn công thức KaTeX & nạp AI Gia sư!",
    },
  ],
};

function buildInstantReaction(el: HTMLElement): string {
  const tourAttr = el.getAttribute("data-tour") || "";
  const href = el.getAttribute("href") || "";
  const rawText = (el.textContent || "").replace(/\s+/g, " ").trim();
  const shortLabel = rawText.slice(0, 36);
  const lower = rawText.toLowerCase();

  if (tourAttr === "sidebar-classrooms" || lower.includes("quản lý lớp")) {
    return "Mở Lớp Lập trình hoặc Lớp 1–12 & cấp Mã lớp cho học viên ngay!";
  }
  if (tourAttr === "header-live-btn" || lower.includes("phát live") || lower.includes("phòng học live")) {
    return "Phát Video 2 chiều 0đ hoặc YouTube/OBS kèm Live Chat & Điểm danh!";
  }
  if (tourAttr === "sidebar-lessons" || lower.includes("soạn bài giảng")) {
    return "Soạn bài giảng kiểu Word + công thức KaTeX siêu sắc nét!";
  }
  if (tourAttr === "coding-run-btn" || lower.includes("chạy & kiểm tra")) {
    return "Đang chấm test tự động — đạt 100% là mở khóa bài kế tiếp liền!";
  }
  if (lower.includes("tạo lớp học") || lower.includes("mở lớp")) {
    return "Chọn 'Lớp Lập trình Cộng đồng' hoặc 'Lớp 1–12' để mở lớp mới nhé!";
  }
  if (lower.includes("gợi mở tầng")) {
    return "Tự suy nghĩ theo gợi mở rồi gõ tay để nắm chắc bản chất nhé!";
  }
  if (lower.includes("chuyển bài tiếp theo")) {
    return "Xuất sắc! Bay sang chinh phục thử thách kế tiếp nào!";
  }
  if (lower.includes("đăng ký học") || lower.includes("tham gia")) {
    return "Chào mừng bạn gia nhập lớp học — nhớ điểm danh khi có Live nhé!";
  }
  if (lower.includes("vào phòng live")) {
    return "Đang vào Phòng học Live — hệ thống đã tự điểm danh bạn rồi!";
  }
  if (href.includes("/lap-trinh") || /\b(html|css|javascript|typescript|python|golang|mongodb|postgresql)\b/i.test(lower)) {
    return `Chinh phục ${shortLabel || "Lập trình"} ngay trên trình duyệt — chạy đúng mới qua bài!`;
  }
  if (href.includes("/tai-lieu") || /^lớp\s+\d+$/i.test(lower)) {
    return `Khám phá ${shortLabel} theo từng Môn & Chương chuẩn GDPT 2018!`;
  }
  if (href.includes("/ai-gia-su") || lower.includes("ai gia sư")) {
    return "Hỏi AI Gia sư Socratic để được gợi mở từng bước cực dễ hiểu!";
  }
  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
    return "Cú Bông đang đứng cạnh cổ vũ bạn nhập liệu đây!";
  }
  if (shortLabel) {
    return `Đang mở "${shortLabel}" — Cú Bông luôn bay theo hỗ trợ bạn!`;
  }
  return "Cú Bông luôn đồng hành cùng bạn!";
}

function EduOwlSvg({
  flying = true,
  pointing = false,
  faceLeft = true,
  sleeping = false,
}: {
  flying?: boolean;
  pointing?: boolean;
  faceLeft?: boolean;
  sleeping?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 92 84"
      className={`h-14 w-14 sm:h-16 sm:w-16 drop-shadow-[0_8px_16px_rgba(79,70,229,0.35)] ${
        flying && !sleeping ? "animate-owl-float" : ""
      } ${faceLeft ? "-scale-x-100" : ""}`}
      aria-hidden="true"
    >
      {pointing && !sleeping && (
        <>
          <circle cx="12" cy="14" r="2.5" fill="#fbbf24" className="animate-ping" />
          <circle cx="80" cy="16" r="2.2" fill="#34d399" className="animate-pulse" />
        </>
      )}

      {/* Nón tốt nghiệp */}
      <polygon points="44,6 72,18 44,28 16,18" fill="#1e1b4b" />
      <rect x="32" y="20" width="24" height="7" rx="3" fill="#312e81" />
      <line x1="66" y1="18" x2="69" y2="31" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="69" cy="32" r="2.8" fill="#fbbf24" />

      {/* Cánh trái */}
      <g className={flying && !sleeping ? "animate-owl-wing-l" : ""}>
        <ellipse cx="19" cy="51" rx="7" ry="12" fill="#4338ca" transform="rotate(16 19 51)" />
      </g>

      {/* Cánh phải + que chỉ phát sáng */}
      <g className={flying && !sleeping ? "animate-owl-wing-r" : ""}>
        <ellipse cx="69" cy="50" rx="7" ry="12" fill="#4338ca" transform="rotate(-22 69 50)" />
        {pointing && !sleeping && (
          <g className="animate-owl-point">
            <line x1="72" y1="45" x2="87" y2="36" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
            <polygon points="89,35 83,33 85,40" fill="#fbbf24" />
          </g>
        )}
      </g>

      {/* Thân cú */}
      <ellipse cx="44" cy="50" rx="24" ry="23" fill="#4f46e5" />
      <ellipse cx="44" cy="56" rx="16" ry="15" fill="#e0e7ff" />

      {/* Mắt kính */}
      <circle cx="35" cy="43" r="8.5" fill="#ffffff" stroke="#1e1b4b" strokeWidth="2.2" />
      <circle cx="53" cy="43" r="8.5" fill="#ffffff" stroke="#1e1b4b" strokeWidth="2.2" />
      <line x1="43.5" y1="43" x2="44.5" y2="43" stroke="#1e1b4b" strokeWidth="2.2" />

      {sleeping ? (
        <>
          <line x1="31" y1="43.5" x2="39" y2="43.5" stroke="#1e1b4b" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="49" y1="43.5" x2="57" y2="43.5" stroke="#1e1b4b" strokeWidth="2.2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M31.5 43.5 Q35 38.5 38.5 43.5" fill="none" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M49.5 43.5 Q53 38.5 56.5 43.5" fill="none" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {/* Má hồng & Mỏ */}
      <circle cx="27" cy="50" r="2.8" fill="#fda4af" opacity="0.8" />
      <circle cx="61" cy="50" r="2.8" fill="#fda4af" opacity="0.8" />
      <polygon points="44,47 40,52 48,52" fill="#f59e0b" />

      {/* Chân */}
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
  const [sleeping, setSleeping] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; faceLeft: boolean } | null>(null);
  const [speech, setSpeech] = useState("");
  const [pointing, setPointing] = useState(false);
  const [spotlight, setSpotlight] = useState<TargetBox | null>(null);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Chỉ ẩn trong phòng thi thật để tránh phân tâm
  const hidden = pathname.startsWith("/thi/phong-thi");

  const clearFlightTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const flyToRect = useCallback(
    (rect: DOMRect, message: string, showRing: boolean, durationMs = 4200) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const owlW = 64;
      const owlH = 64;

      let left = rect.right + 12;
      let faceLeft = true;
      if (left + owlW + 24 > vw) {
        left = Math.max(12, rect.left - owlW - 12);
        faceLeft = false;
      }
      let top = rect.top + rect.height / 2 - owlH / 2 - 6;
      top = Math.max(72, Math.min(top, vh - owlH - 20));
      left = Math.max(12, Math.min(left, vw - owlW - 12));

      setPos({ left, top, faceLeft });
      setSpeech(message);
      setPointing(true);
      setSpotlight(
        showRing
          ? {
              top: rect.top - 5,
              left: rect.left - 5,
              width: rect.width + 10,
              height: rect.height + 10,
            }
          : null
      );

      const t1 = setTimeout(() => setPointing(false), 1800);
      const t2 = setTimeout(() => {
        setSpeech("");
        setSpotlight(null);
      }, durationMs);
      timersRef.current.push(t1, t2);
    },
    []
  );

  // Khởi tạo vị trí góc dưới phải gọn gàng (không hộp trắng cồng kềnh)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("eduk12_mascot_sleep") === "1") {
      setSleeping(true);
    }
    setPos({
      left: Math.max(16, window.innerWidth - 84),
      top: Math.max(80, window.innerHeight - 84),
      faceLeft: true,
    });
  }, []);

  // === TỰ ĐỘNG BAY CHỈ DẪN NGAY KHI CHUYỂN SANG TRANG MỚI (/lap-trinh, /lop-hoc, /quan-tri) ===
  useEffect(() => {
    if (typeof window === "undefined" || hidden || sleeping) return;

    clearFlightTimers();
    setSpotlight(null);

    const matchedPrefix = Object.keys(ROUTE_FLIGHTS).find((p) => pathname.startsWith(p));
    if (!matchedPrefix) {
      // Ở trang chủ: đậu gọn ở góc dưới phải, sẵn sàng bay vù ngay khi người dùng bấm chọn
      setPos({
        left: Math.max(16, window.innerWidth - 84),
        top: Math.max(80, window.innerHeight - 84),
        faceLeft: true,
      });
      setSpeech("");
      return;
    }

    const waypoints = ROUTE_FLIGHTS[matchedPrefix];
    const stepDuration = 3600;

    const flyToWaypoint = (wp: FlightWaypoint, retries = 5) => {
      const el = document.querySelector(wp.selector);
      if (!el) {
        if (retries > 0) {
          const retryT = setTimeout(() => flyToWaypoint(wp, retries - 1), 250);
          timersRef.current.push(retryT);
        }
        return;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      if (rect.top < 64 || rect.bottom > window.innerHeight - 20) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        const settleT = setTimeout(() => {
          const r2 = el.getBoundingClientRect();
          flyToRect(r2, wp.text, true, stepDuration - 350);
        }, 320);
        timersRef.current.push(settleT);
      } else {
        flyToRect(rect, wp.text, true, stepDuration - 300);
      }
    };

    waypoints.forEach((wp, idx) => {
      const t = setTimeout(() => flyToWaypoint(wp), 420 + idx * stepDuration);
      timersRef.current.push(t);
    });

    // Dọn ring sau khi bay dẫn đường xong
    const endTimer = setTimeout(() => {
      setSpotlight(null);
      setSpeech("");
    }, 420 + waypoints.length * stepDuration + 400);
    timersRef.current.push(endTimer);

    return () => clearFlightTimers();
  }, [pathname, hidden, sleeping, clearFlightTimers, flyToRect]);

  // === TỰ ĐỘNG BAY VÙ TỚI BẤT KỲ NÚT / MỤC NÀO NGƯỜI DÙNG BẤM CHỌN ===
  useEffect(() => {
    if (hidden || sleeping) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const rawTarget = e.target as HTMLElement | null;
      if (!rawTarget || rawTarget.closest("[data-mascot-ui]")) return;

      const interactive = rawTarget.closest(
        'button, a, select, input, textarea, [role="tab"], [data-tour]'
      ) as HTMLElement | null;
      if (!interactive) return;

      // Nếu đang bấm link chuyển sang trang chức năng khác -> để đường bay tự động của trang đích chạy mượt ngay lập tức!
      if (interactive.tagName === "A") {
        const href = interactive.getAttribute("href") || "";
        if (href.startsWith("/") && !href.startsWith(pathname === "/" ? "/#" : pathname)) {
          return;
        }
      }

      const rect = interactive.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      clearFlightTimers();
      flyToRect(rect, buildInstantReaction(interactive), false, 3800);
    };

    document.addEventListener("click", handleGlobalClick, true);
    return () => document.removeEventListener("click", handleGlobalClick, true);
  }, [hidden, sleeping, pathname, clearFlightTimers, flyToRect]);

  // Lắng nghe sự kiện chúc mừng khi học sinh vừa đăng ký vào lớp thành công
  useEffect(() => {
    const onTourEvent = (e: Event) => {
      if (sleeping) return;
      const custom = e as CustomEvent<{ className?: string; banner?: string }>;
      const msg =
        custom.detail?.banner ||
        (custom.detail?.className
          ? `Chúc mừng bạn đã gia nhập lớp "${custom.detail.className}"!`
          : "Cú Bông đang bay đồng hành cùng bạn!");
      setSpeech(msg);
      setPointing(true);
      const t = setTimeout(() => {
        setPointing(false);
        setSpeech("");
      }, 4500);
      timersRef.current.push(t);
    };
    window.addEventListener("eduk12:mascot-tour", onTourEvent);
    return () => window.removeEventListener("eduk12:mascot-tour", onTourEvent);
  }, [sleeping]);

  if (hidden || !pos) return null;

  const isNearRight =
    typeof window !== "undefined" && pos.left > window.innerWidth * 0.56;

  return (
    <>
      {/* Vòng sáng Spotlight thanh mảnh, xuyên chuột (không cản bấm) */}
      {spotlight && !sleeping && (
        <div
          className="pointer-events-none fixed z-40 rounded-2xl border-2 border-indigo-400/80 bg-indigo-500/5 transition-all duration-500 ease-out animate-spotlight-ring"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      )}

      {/* Bé Cú Bông tinh gọn, bay lơ lửng tự do không khung cồng kềnh */}
      <div
        data-mascot-ui
        className="pointer-events-none fixed z-50 transition-all duration-700 ease-out"
        style={{
          left: sleeping ? undefined : pos.left,
          top: sleeping ? undefined : pos.top,
          right: sleeping ? 18 : undefined,
          bottom: sleeping ? 18 : undefined,
        }}
      >
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => {
              clearFlightTimers();
              setSpotlight(null);
              setSleeping((prev) => {
                const next = !prev;
                localStorage.setItem("eduk12_mascot_sleep", next ? "1" : "0");
                setSpeech(next ? "" : "Hú hú! Cú Bông thức dậy bay cùng bạn rồi!");
                if (!next) {
                  const t = setTimeout(() => setSpeech(""), 2800);
                  timersRef.current.push(t);
                }
                return next;
              });
            }}
            title={
              sleeping
                ? "Bấm để đánh thức Cú Bông Edu bay dẫn đường"
                : "Cú Bông Edu — Bấm vào cú nếu muốn tạm nghỉ"
            }
            className={`pointer-events-auto rounded-full transition-transform hover:scale-110 focus:outline-none ${
              sleeping ? "opacity-55 hover:opacity-100" : ""
            }`}
          >
            <EduOwlSvg
              flying={!sleeping}
              pointing={pointing}
              faceLeft={pos.faceLeft}
              sleeping={sleeping}
            />
          </button>

          {/* Bong bóng thoại Glassmorphism hiện đại, xuyên chuột, tự tan */}
          {speech && !sleeping && (
            <div
              className={`pointer-events-none absolute ${
                isNearRight ? "right-16" : "left-16"
              } top-1/2 w-60 -translate-y-1/2 rounded-2xl border border-white/15 bg-slate-950/90 px-3.5 py-2.5 text-xs font-medium text-white shadow-2xl backdrop-blur-md`}
            >
              <div className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-amber-300">
                <Sparkles className="h-3 w-3" /> Cú Bông Edu
              </div>
              <p className="mt-0.5 leading-snug text-slate-100">{speech}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
