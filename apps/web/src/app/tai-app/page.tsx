"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BellRing,
  BookOpen,
  CheckCircle2,
  Code2,
  Download,
  QrCode,
  Radio,
  Share,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CuBongLogoMark } from "@/components/BrandLogo";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function DownloadAppPage() {
  const { accessToken } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installMsg, setInstallMsg] = useState("");
  const [origin, setOrigin] = useState("https://owlie.eduk12-scale.workers.dev");
  const [pushState, setPushState] = useState<"default" | "granted" | "denied" | "unsupported">("default");
  const [pushMsg, setPushMsg] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
      if (window.matchMedia("(display-mode: standalone)").matches) {
        setInstalled(true);
      }
      if (!("Notification" in window)) {
        setPushState("unsupported");
      } else {
        setPushState(Notification.permission as "default" | "granted" | "denied");
      }
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setInstallMsg("Đã cài đặt App EduK12 thành công lên màn hình chính của bạn!");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleAndroidInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
        setInstallMsg("Đang thêm biểu tượng Owlie Edu lên màn hình chính...");
      }
      setDeferredPrompt(null);
    } else {
      setInstallMsg(
        "Trên Chrome Android: bấm dấu 3 chấm (⋮) góc trên phải → chọn 'Cài đặt ứng dụng' hoặc 'Thêm vào màn hình chính' là xong trong 3 giây!"
      );
    }
  };

  const handleEnablePush = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPushMsg("Trình duyệt hiện tại chưa hỗ trợ Thông báo Đẩy.");
      return;
    }
    const perm = await Notification.requestPermission();
    setPushState(perm as "default" | "granted" | "denied");
    if (perm !== "granted") {
      setPushMsg("Bạn đã từ chối quyền thông báo. Có thể bật lại trong phần Cài đặt trang web trên trình duyệt.");
      return;
    }

    if (accessToken) {
      await fetch(`${CORE_API_URL}/api/v1/push/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          device_label: navigator.userAgent.slice(0, 80),
          platform: /android/i.test(navigator.userAgent)
            ? "android-pwa"
            : /iphone|ipad/i.test(navigator.userAgent)
              ? "ios-pwa"
              : "desktop-web",
        }),
      }).catch(() => {});
    }

    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      reg?.active?.postMessage({
        type: "SHOW_NOTIFICATION",
        title: "🦉 Owlie Edu — Đã bật Thông báo Đẩy!",
        body: "Bạn sẽ nhận ngay thông báo lịch mở phòng thi, điểm số mới, tin nhắn thầy cô và lớp Live.",
        link: "/tai-app",
      });
    }
    setPushMsg("Đã bật Thông báo Đẩy thành công! Hãy kiểm tra thông báo chào mừng vừa hiện trên thiết bị.");
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    `${origin}/tai-app/`
  )}`;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-8">
      {/* Hero Banner Tải App */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-xl sm:p-10">
        <div className="grid items-center gap-8 md:grid-cols-12">
          <div className="space-y-4 md:col-span-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30">
              <Smartphone className="h-3.5 w-3.5" /> Ứng dụng Di động Android &amp; iOS • Miễn phí 100%
            </span>

            <div className="flex items-center gap-3.5">
              <CuBongLogoMark className="h-14 w-14 shrink-0 shadow-lg" />
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Tải App Owlie Edu cho Điện thoại
                </h1>
                <p className="text-xs sm:text-sm text-indigo-200">
                  Học Lớp 1–12, vào Lớp Live, luyện Code &amp; Thi trắc nghiệm mọi lúc mọi nơi
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
              Cài trực tiếp biểu tượng chú cú <strong>Owlie</strong> lên màn hình chính iPhone &amp; Android — chạy toàn màn hình mượt mà như ứng dụng gốc, tự động đồng bộ điểm thi &amp; bảo mật 2FA, không tốn dung lượng bộ nhớ máy.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <a
                href="https://github.com/HuynhAnh24h/edu-website/releases/download/mobile-apk-latest/EduK12-Open-Android.apk"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-extrabold text-slate-950 shadow-lg hover:bg-emerald-400 transition"
              >
                <Download className="h-4 w-4" />
                Tải file Android (.APK) cài trực tiếp
              </a>
              <button
                type="button"
                onClick={() => void handleAndroidInstall()}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-5 py-3 text-sm font-bold text-white shadow hover:bg-indigo-400 transition"
              >
                <Smartphone className="h-4 w-4" />
                {installed ? "Đã cài bản Web-App" : "Cài nhanh không cần file APK"}
              </button>
              <a
                href="#ios-guide"
                className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/20 hover:bg-white/20 transition"
              >
                <Share className="h-4 w-4" /> Cài trên iPhone (iOS)
              </a>
            </div>

            {installMsg && (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-2.5 text-xs font-semibold text-emerald-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{installMsg}</span>
              </div>
            )}
          </div>

          {/* Mã QR Quét nhanh bằng camera điện thoại */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/15 bg-white p-5 text-center text-slate-900 shadow-2xl md:col-span-4">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-700">
              <QrCode className="h-4 w-4" /> Quét QR mở bằng Điện thoại
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="Mã QR tải App EduK12 Open"
              className="mt-3 h-40 w-40 rounded-xl border border-slate-100"
            />
            <p className="mt-2.5 text-[11px] leading-snug text-slate-500">
              Mở Camera trên <strong>iPhone</strong> hoặc <strong>Android</strong> quét mã này để cài App chỉ trong 5 giây!
            </p>
          </div>
        </div>
      </section>

      {/* Hướng dẫn cài chi tiết 2 nền tảng: Android & iOS */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Card Android */}
        <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">
              Cài trên Điện thoại Android
            </h2>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
              Android • Chrome / Samsung
            </span>
          </div>
          <ol className="space-y-3 text-xs text-slate-600">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 font-bold text-white">
                1
              </span>
              <span>
                <strong>Cách 1 (Khuyên dùng — File cài đặt .APK):</strong> Bấm nút xanh <strong>&quot;Tải file Android (.APK) cài trực tiếp&quot;</strong> ở trên → mở file vừa tải về → chọn <strong>Cài đặt</strong> (nếu máy hỏi, chọn <em>Cho phép cài đặt từ nguồn này</em>).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 font-bold text-white">
                2
              </span>
              <span>
                <strong>Cách 2 (Không cần tải file):</strong> Bấm nút <strong>&quot;Cài nhanh không cần file APK&quot;</strong> ở trên (hoặc mở Chrome → bấm dấu <strong>⋮</strong> góc trên phải → <strong>Cài đặt ứng dụng</strong>).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 font-bold text-white">
                3
              </span>
              <span>
                Biểu tượng <strong>Owlie Edu</strong> sẽ nằm ngay trên màn hình chính điện thoại — mở lên đăng nhập, học bài và làm bài thi mượt mà!
              </span>
            </li>
          </ol>
          <p className="pt-1 text-[11px] text-slate-500">
            Xem tất cả phiên bản phát hành mới nhất tại{" "}
            <a
              href="https://github.com/HuynhAnh24h/edu-website/releases"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-emerald-700 hover:underline"
            >
              Trang phát hành bản cài đặt EduK12 →
            </a>
          </p>
        </div>

        {/* Card iOS */}
        <div id="ios-guide" className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">
              Cài trên iPhone &amp; iPad (iOS)
            </h2>
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-bold text-indigo-800">
              iOS • Safari
            </span>
          </div>
          <ol className="space-y-3 text-xs text-slate-600">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
                1
              </span>
              <span>
                Mở link website trên trình duyệt <strong>Safari</strong> của iPhone/iPad.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
                2
              </span>
              <span>
                Bấm vào biểu tượng <strong>Chia sẻ (Share)</strong> ở thanh dưới cùng màn hình → kéo xuống chọn <strong>&quot;Thêm vào Màn hình chính&quot; (Add to Home Screen)</strong>.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
                3
              </span>
              <span>
                Bấm <strong>Thêm (Add)</strong> ở góc trên phải — ứng dụng <strong>EduK12</strong> sẽ hiển thị sẵn với icon chú cú Owlie để mở học ngay!
              </span>
            </li>
          </ol>
        </div>
      </div>

      {/* Các tính năng sẵn có trên App Mobile */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
          <Sparkles className="h-5 w-5 text-indigo-600" /> Trải nghiệm Học tập Trọn vẹn trên Di động
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: BookOpen,
              title: "Học 157+ Bài giảng 1–12",
              desc: "Đọc bài giảng theo Khối → Môn → Chương gọn gàng trên màn hình điện thoại.",
            },
            {
              icon: ShieldCheck,
              title: "Thi Trắc nghiệm Online",
              desc: "Làm bài đủ 4 dạng đề mới, tự động lưu bài làm ngay cả khi mạng chập chờn.",
            },
            {
              icon: Radio,
              title: "Học Lớp Live & Điểm danh",
              desc: "Xem video trực tiếp, chat hỏi đáp cùng thầy cô và điểm danh tự động.",
            },
            {
              icon: Code2,
              title: "Luyện Code & Bảo mật 2FA",
              desc: "Đồng bộ tiến độ 8 khóa lập trình và bảo vệ tài khoản bằng Google Authenticator.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-xl bg-slate-50 p-4 space-y-1.5">
                <Icon className="h-5 w-5 text-indigo-600" />
                <p className="text-xs font-bold text-slate-900">{item.title}</p>
                <p className="text-[11px] leading-relaxed text-slate-600">{item.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <span>
            Bản tải trực tiếp dùng thử miễn phí 100% — đầy đủ tiêu chuẩn phát hành lên <strong>CH Play &amp; Apple App Store</strong>!
          </span>
          <Link href="/dang-nhap" className="font-bold text-indigo-600 hover:underline">
            Đăng nhập tài khoản học sinh →
          </Link>
        </div>
      </section>

      {/* Khối Thông báo Đẩy (Push Notification) & Tiêu chuẩn Lên Store (#13) */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <BellRing className="h-5 w-5 text-amber-600" /> Thông báo Đẩy (Push Notification)
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                pushState === "granted"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {pushState === "granted" ? "ĐANG BẬT" : "CHƯA BẬT"}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            Nhận thông báo tức thì trên màn hình khóa điện thoại hoặc máy tính khi thầy cô mở Lớp Live, Admin mở kỳ thi thử, có tin nhắn mới hoặc điểm chấm bài.
          </p>
          <button
            type="button"
            onClick={() => void handleEnablePush()}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-extrabold text-slate-950 shadow hover:bg-amber-400 transition"
          >
            <BellRing className="h-4 w-4" />
            {pushState === "granted" ? "Gửi thử Thông báo Đẩy ngay" : "Bật Thông báo Đẩy trên thiết bị này"}
          </button>
          {pushMsg && (
            <p className="rounded-xl bg-white px-3.5 py-2 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200">
              {pushMsg}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
            <Store className="h-5 w-5 text-indigo-600" /> Tiêu chuẩn Sẵn sàng lên CH Play &amp; App Store
          </h2>
          <ul className="space-y-2 text-xs text-slate-700">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Đóng gói tự động file Android (.APK) qua GitHub Actions Capacitor</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Trang Chính sách Bảo mật (/chinh-sach-bao-mat) &amp; Điều khoản (/dieu-khoan)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Tính năng Tự xóa tài khoản chuẩn Apple 5.1.1(v) &amp; Google Play Data Safety</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Service Worker Push Notification + Adaptive App Icons chú cú Owlie</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
