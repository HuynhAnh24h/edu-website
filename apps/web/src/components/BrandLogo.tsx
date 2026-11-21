import React from "react";

export function CuBongLogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 88 88"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cubongBg" x1="6" y1="6" x2="82" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="cubongBody" x1="44" y1="28" x2="44" y2="76" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0e7ff" />
        </linearGradient>
      </defs>

      {/* Nền bo tròn hiện đại */}
      <rect x="2" y="2" width="84" height="84" rx="22" fill="url(#cubongBg)" />
      <rect x="2.75" y="2.75" width="82.5" height="82.5" rx="21.25" stroke="white" strokeOpacity="0.2" strokeWidth="1.5" />

      {/* Nón tốt nghiệp của Cú Bông */}
      <polygon points="44,12 71,22 44,31 17,22" fill="#0f172a" />
      <rect x="31" y="24" width="26" height="7" rx="3.5" fill="#1e1b4b" />
      <line x1="66" y1="22" x2="69" y2="35" stroke="#fbbf24" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="69" cy="36.5" r="2.8" fill="#f59e0b" />

      {/* Cánh nhỏ hai bên */}
      <ellipse cx="20" cy="54" rx="6.5" ry="11" fill="#c7d2fe" transform="rotate(14 20 54)" />
      <ellipse cx="68" cy="54" rx="6.5" ry="11" fill="#c7d2fe" transform="rotate(-14 68 54)" />

      {/* Thân Cú Bông tròn thân thiện */}
      <ellipse cx="44" cy="53" rx="22.5" ry="21.5" fill="url(#cubongBody)" />
      <ellipse cx="44" cy="59" rx="14.5" ry="13.5" fill="#eef2ff" />

      {/* Kính tri thức & Đôi mắt sáng */}
      <circle cx="35.5" cy="46.5" r="8" fill="#ffffff" stroke="#1e1b4b" strokeWidth="2.3" />
      <circle cx="52.5" cy="46.5" r="8" fill="#ffffff" stroke="#1e1b4b" strokeWidth="2.3" />
      <line x1="43.5" y1="46.5" x2="44.5" y2="46.5" stroke="#1e1b4b" strokeWidth="2.3" />

      <circle cx="36.2" cy="46.5" r="3.4" fill="#0f172a" />
      <circle cx="53.2" cy="46.5" r="3.4" fill="#0f172a" />
      <circle cx="37.4" cy="45.2" r="1.2" fill="#ffffff" />
      <circle cx="54.4" cy="45.2" r="1.2" fill="#ffffff" />

      {/* Má hồng & Mỏ cam */}
      <circle cx="27.5" cy="53" r="2.5" fill="#fda4af" opacity="0.85" />
      <circle cx="60.5" cy="53" r="2.5" fill="#fda4af" opacity="0.85" />
      <polygon points="44,50 40.5,55 47.5,55" fill="#f59e0b" />

      {/* Đôi chân nhỏ */}
      <ellipse cx="37.5" cy="74" rx="4.2" ry="2.3" fill="#fbbf24" />
      <ellipse cx="50.5" cy="74" rx="4.2" ry="2.3" fill="#fbbf24" />
    </svg>
  );
}
