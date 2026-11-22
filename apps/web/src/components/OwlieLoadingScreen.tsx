"use client";

import { useEffect, useState } from "react";
import {
  Atom,
  Award,
  BookOpen,
  Calculator,
  CheckCircle2,
  Code2,
  Globe,
  GraduationCap,
  Rocket,
  Sparkles,
  Star,
  X,
} from "lucide-react";

/**
 * Màn hình Loading Chú Cú Owlie biểu diễn 5 trò vui nhộn từ 0% đến 100%
 * - 0–24%: Vươn vai, nháy mắt chỉnh kính mắt tròn
 * - 25–49%: Lắc lư đọc sách, các biểu tượng môn học bay quanh
 * - 50–74%: Nhảy xoay vòng 360° & tung mũ tốt nghiệp
 * - 75–99%: Vỗ cánh bay vù tăng tốc lên 100%
 * - 100%: Mỉm cười híp mắt chào đón & mở mượt vào Owlie Edu
 */
export function OwlieLoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let rafId = 0;
    let t1: ReturnType<typeof setTimeout> | null = null;
    let t2: ReturnType<typeof setTimeout> | null = null;
    const durationMs = 2450;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const ratio = Math.min(1, elapsed / durationMs);
      // Đường cong mượt có chút nhịp điệu vui tươi khi lên 100%
      const eased = ratio < 0.85 ? ratio * 1.05 : 0.8925 + ((ratio - 0.85) / 0.15) * 0.1075;
      const pct = Math.min(100, Math.round(eased * 100));
      setProgress(pct);

      if (ratio < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setProgress(100);
        t1 = setTimeout(() => setFading(true), 320);
        t2 = setTimeout(() => setVisible(false), 740);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, []);

  if (!visible) return null;

  const stage =
    progress >= 100
      ? "done"
      : progress >= 75
        ? "fly"
        : progress >= 50
          ? "spin"
          : progress >= 25
            ? "read"
            : "stretch";

  const stageMeta = {
    stretch: {
      icon: Sparkles,
      text: "Owlie đang vươn vai và chỉnh kính mắt tròn...",
      badge: "Khởi động",
      animClass: "owlie-stage-stretch",
    },
    read: {
      icon: BookOpen,
      text: "Owlie đang lật mở 157+ bài giảng & 6 Cụm Lập trình...",
      badge: "Nạp tri thức",
      animClass: "owlie-stage-read",
    },
    spin: {
      icon: GraduationCap,
      text: "Owlie nhào lộn tung mũ tốt nghiệp — Sẵn sàng bứt phá!",
      badge: "Biểu diễn",
      animClass: "owlie-stage-spin",
    },
    fly: {
      icon: Rocket,
      text: "Owlie vỗ cánh tăng tốc mở lớp học trực tuyến...",
      badge: "Tăng tốc",
      animClass: "owlie-stage-fly",
    },
    done: {
      icon: CheckCircle2,
      text: "100% Hoàn tất — Chào mừng đến với Owlie Edu!",
      badge: "Sẵn sàng",
      animClass: "",
    },
  }[stage];

  const StageIcon = stageMeta.icon;
  const wingFlap = stage === "read" || stage === "fly" || stage === "done";
  const capToss = stage === "spin";
  const happyEyes = stage === "done" || stage === "spin";

  return (
    <div
      className={`print:hidden fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-6 transition-all duration-400 ${
        fading ? "pointer-events-none scale-105 opacity-0" : "opacity-100"
      }`}
    >
      {/* Nút bỏ qua gọn nhẹ ở góc phải trên */}
      <button
        type="button"
        onClick={() => {
          setFading(true);
          setTimeout(() => setVisible(false), 200);
        }}
        className="absolute top-5 right-5 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-500 shadow-2xs hover:bg-slate-100 hover:text-slate-800 transition"
      >
        <span>Bỏ qua</span>
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Vầng sáng nền dịu mắt */}
      <div className="pointer-events-none absolute h-80 w-80 rounded-full bg-indigo-200/35 blur-3xl" />

      {/* Sân khấu biểu diễn của chú cú Owlie + các Icon thư viện xoay quanh */}
      <div className="relative flex h-56 w-64 items-center justify-center">
        {/* Các Icon học đường Lucide nổi nhẹ xung quanh */}
        <div
          className="owlie-orbit-item absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-md ring-1 ring-indigo-100"
          style={{ animationDelay: "0s" }}
        >
          <BookOpen className="h-4 w-4" />
        </div>
        <div
          className="owlie-orbit-item absolute top-2 right-4 flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-amber-500 shadow-md ring-1 ring-amber-100"
          style={{ animationDelay: "0.3s" }}
        >
          <Star className="h-4 w-4 fill-amber-400" />
        </div>
        <div
          className="owlie-orbit-item absolute bottom-8 left-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-md ring-1 ring-emerald-100"
          style={{ animationDelay: "0.6s" }}
        >
          <Code2 className="h-4 w-4" />
        </div>
        <div
          className="owlie-orbit-item absolute bottom-7 right-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-md ring-1 ring-sky-100"
          style={{ animationDelay: "0.9s" }}
        >
          {stage === "read" ? (
            <Calculator className="h-4 w-4" />
          ) : stage === "spin" ? (
            <Award className="h-4 w-4 text-amber-600" />
          ) : stage === "fly" ? (
            <Atom className="h-4 w-4 text-violet-600" />
          ) : (
            <Globe className="h-4 w-4" />
          )}
        </div>

        {/* Chú Cú Mèo Owlie SVG động đa biểu cảm */}
        <div className={`relative z-10 ${stageMeta.animClass}`}>
          <svg
            viewBox="0 0 200 200"
            className="h-44 w-44 drop-shadow-[0_14px_24px_rgba(79,70,229,0.22)]"
            aria-label="Chú cú Owlie đang biểu diễn tải trang"
          >
            <defs>
              <linearGradient id="owlieLoadBody" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#4338ca" />
              </linearGradient>
              <linearGradient id="owlieLoadBelly" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fef9c3" />
                <stop offset="100%" stopColor="#fde68a" />
              </linearGradient>
            </defs>

            {/* Mũ tốt nghiệp (tung lên ở stage spin) */}
            <g className={capToss ? "owlie-cap-toss" : ""}>
              <polygon points="100,16 150,36 100,54 50,36" fill="#0f172a" />
              <path d="M74 44 L74 58 Q100 68 126 58 L126 44" fill="#1e293b" />
              <line x1="142" y1="38" x2="146" y2="62" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="146" cy="64" r="4.5" fill="#fbbf24" />
            </g>

            {/* Cánh trái & Cánh phải (vỗ liên tục khi đọc sách / bay) */}
            <ellipse
              cx="45"
              cy="122"
              rx="18"
              ry="34"
              transform="rotate(18 45 122)"
              fill="#4f46e5"
              className={wingFlap ? "owlie-wing-l" : ""}
            />
            <ellipse
              cx="155"
              cy="122"
              rx="18"
              ry="34"
              transform="rotate(-18 155 122)"
              fill="#4f46e5"
              className={wingFlap ? "owlie-wing-r" : ""}
            />

            {/* Đôi tai cú dễ thương */}
            <polygon points="62,62 48,40 76,54" fill="#4f46e5" />
            <polygon points="138,62 152,40 124,54" fill="#4f46e5" />

            {/* Thân cú tròn mũm mĩm */}
            <ellipse cx="100" cy="116" rx="54" ry="56" fill="url(#owlieLoadBody)" />
            {/* Bụng kem mềm mại */}
            <ellipse cx="100" cy="132" rx="36" ry="35" fill="url(#owlieLoadBelly)" />
            {/* Lông bụng hình chữ V nhỏ */}
            <path d="M84 128 Q89 134 94 128 M106 128 Q111 134 116 128 M95 142 Q100 148 105 142" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.55" />

            {/* Vòng mắt trắng lớn */}
            <circle cx="80" cy="92" r="20" fill="#ffffff" />
            <circle cx="120" cy="92" r="20" fill="#ffffff" />

            {/* Biểu cảm mắt thay đổi theo từng trò */}
            {happyEyes ? (
              <g stroke="#0f172a" strokeWidth="4" strokeLinecap="round" fill="none">
                <path d="M71 94 Q80 83 89 94" />
                <path d="M111 94 Q120 83 129 94" />
              </g>
            ) : stage === "stretch" ? (
              /* Nháy 1 mắt tinh nghịch */
              <g>
                <circle cx="80" cy="92" r="8.5" fill="#0f172a" />
                <circle cx="83" cy="89" r="3" fill="#ffffff" />
                <path d="M111 93 Q120 85 129 93" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" fill="none" />
              </g>
            ) : (
              <g className="owlie-eyes-blink">
                <circle cx={stage === "read" ? 82 : 80} cy={stage === "read" ? 95 : 92} r="8.5" fill="#0f172a" />
                <circle cx={stage === "read" ? 84 : 83} cy={stage === "read" ? 92 : 89} r="3" fill="#ffffff" />
                <circle cx={stage === "read" ? 118 : 120} cy={stage === "read" ? 95 : 92} r="8.5" fill="#0f172a" />
                <circle cx={stage === "read" ? 120 : 123} cy={stage === "read" ? 92 : 89} r="3" fill="#ffffff" />
              </g>
            )}

            {/* Cặp kính tròn tri thức ánh vàng */}
            <circle cx="80" cy="92" r="21" fill="none" stroke="#f59e0b" strokeWidth="3.5" />
            <circle cx="120" cy="92" r="21" fill="none" stroke="#f59e0b" strokeWidth="3.5" />
            <line x1="101" y1="92" x2="99" y2="92" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />

            {/* Má hồng dễ thương */}
            <ellipse cx="58" cy="107" rx="7" ry="4" fill="#fb7185" opacity="0.45" />
            <ellipse cx="142" cy="107" rx="7" ry="4" fill="#fb7185" opacity="0.45" />

            {/* Mỏ cú vàng tươi */}
            <polygon points="100,98 92,109 100,115 108,109" fill="#f59e0b" />

            {/* Quyển sách mở xuất hiện khi Owlie đang đọc bài (stage read) */}
            {stage === "read" && (
              <g transform="translate(66, 134)">
                <path d="M4 18 Q20 10 34 16 L34 38 Q20 32 4 38 Z" fill="#ffffff" stroke="#4f46e5" strokeWidth="2.5" />
                <path d="M64 18 Q48 10 34 16 L34 38 Q48 32 64 38 Z" fill="#eef2ff" stroke="#4f46e5" strokeWidth="2.5" />
                <line x1="10" y1="22" x2="26" y2="21" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                <line x1="10" y1="28" x2="26" y2="27" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                <line x1="42" y1="21" x2="58" y2="22" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                <line x1="42" y1="27" x2="58" y2="28" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
              </g>
            )}

            {/* Đôi chân nhỏ */}
            <path d="M84 169 L80 178 M84 169 L86 179 M84 169 L91 177" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
            <path d="M116 169 L109 177 M116 169 L114 179 M116 169 L120 178" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>

        {/* Bóng đổ co giãn theo độ cao bay của Owlie */}
        <div
          className={`absolute bottom-1 h-3 rounded-full bg-indigo-900/10 blur-xs transition-all duration-300 ${
            stage === "fly" || stage === "spin" ? "w-20 opacity-40" : "w-32 opacity-75"
          }`}
        />
      </div>

      {/* Thương hiệu & Thanh tiến độ 0% -> 100% */}
      <div className="relative z-10 mt-2 w-full max-w-sm space-y-3 text-center">
        <div>
          <p className="text-2xl font-black tracking-tight text-slate-900">
            Owlie <span className="text-indigo-600">Edu</span>
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            Học Phổ thông 1–12 &amp; Lập trình Cộng đồng
          </p>
        </div>

        {/* Thanh phần trăm mượt mà */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-extrabold">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] text-indigo-700 ring-1 ring-indigo-100">
              <StageIcon className="h-3.5 w-3.5" />
              {stageMeta.badge}
            </span>
            <span className="font-mono text-sm font-black text-indigo-700">{progress}%</span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-slate-200/90 p-0.5 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="min-h-[18px] text-xs font-semibold text-slate-600">{stageMeta.text}</p>
        </div>
      </div>
    </div>
  );
}
