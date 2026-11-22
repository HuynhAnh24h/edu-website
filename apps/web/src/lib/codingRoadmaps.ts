import { CodingLanguage } from "@/lib/codingCurriculum";

export type ClusterId =
  | "html-css"
  | "js-ts"
  | "react-next"
  | "node-nest"
  | "go-python"
  | "db-stack";

export type RoadmapId = "frontend" | "backend-node" | "fullstack" | "go-python-ai" | "custom";

export interface CodingCluster {
  id: ClusterId;
  stageLevel: string;
  title: string;
  shortLabel: string;
  tagline: string;
  category: "Frontend" | "Backend" | "Database";
  gradient: string;
  badgeBg: string;
  tracks: CodingLanguage[];
}

export const CODING_CLUSTERS: CodingCluster[] = [
  {
    id: "html-css",
    stageLevel: "Cấp độ 1 • Nền tảng Giao diện",
    title: "Cụm HTML5 & CSS3",
    shortLabel: "HTML & CSS",
    tagline: "Dựng khung trang web chuẩn ngữ nghĩa, căn chỉnh Flexbox/Grid và thiết kế giao diện Responsive đẹp mắt.",
    category: "Frontend",
    gradient: "from-orange-500 via-rose-500 to-pink-600",
    badgeBg: "bg-orange-50 text-orange-700 border-orange-200",
    tracks: ["html", "css"],
  },
  {
    id: "js-ts",
    stageLevel: "Cấp độ 2 • Ngôn ngữ Web Cốt lõi",
    title: "Cụm JavaScript & TypeScript",
    shortLabel: "JS & TS",
    tagline: "Làm chủ tư duy lập trình hiện đại ES6+, xử lý mảng/bất đồng bộ và viết code an toàn kiểu dữ liệu với TypeScript.",
    category: "Frontend",
    gradient: "from-amber-500 via-blue-600 to-indigo-700",
    badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
    tracks: ["javascript", "typescript"],
  },
  {
    id: "react-next",
    stageLevel: "Cấp độ 3 • Framework Front-end Hiện đại",
    title: "Cụm React & Next.js",
    shortLabel: "React & Next.js",
    tagline: "Xây dựng ứng dụng Web chuẩn doanh nghiệp với Component, State bất biến, Custom Hook, SEO Metadata & App Router.",
    category: "Frontend",
    gradient: "from-cyan-500 via-sky-600 to-slate-900",
    badgeBg: "bg-cyan-50 text-cyan-800 border-cyan-200",
    tracks: ["react", "nextjs"],
  },
  {
    id: "node-nest",
    stageLevel: "Cấp độ 3 • Back-end JS/TS Doanh nghiệp",
    title: "Cụm Node.js & NestJS",
    shortLabel: "Node.js & NestJS",
    tagline: "Thiết kế REST API, Auth Middleware, Rate Limiting và kiến trúc Service / DTO / Role Guard chuẩn NestJS.",
    category: "Backend",
    gradient: "from-lime-600 via-emerald-600 to-rose-600",
    badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
    tracks: ["nodejs", "nestjs"],
  },
  {
    id: "go-python",
    stageLevel: "Cấp độ 3 • Hệ thống Hiệu năng cao & AI",
    title: "Cụm Golang & Python",
    shortLabel: "Golang & Python",
    tagline: "Biên dịch Golang cho hệ thống chịu tải cao và làm chủ Python cho thuật toán, tự động hóa & Trí tuệ nhân tạo.",
    category: "Backend",
    gradient: "from-teal-600 via-cyan-600 to-blue-700",
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    tracks: ["golang", "python"],
  },
  {
    id: "db-stack",
    stageLevel: "Cấp độ 4 • Cơ sở dữ liệu Thực chiến",
    title: "Cụm MongoDB & PostgreSQL",
    shortLabel: "MongoDB & Postgres",
    tagline: "Làm chủ cả 2 thế giới dữ liệu: NoSQL linh hoạt (MongoDB Aggregation) và SQL quan hệ chặt chẽ (PostgreSQL JOIN).",
    category: "Database",
    gradient: "from-green-600 via-indigo-600 to-slate-800",
    badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
    tracks: ["mongodb", "postgresql"],
  },
];

export function getClusterById(id: ClusterId): CodingCluster {
  return CODING_CLUSTERS.find((c) => c.id === id) || CODING_CLUSTERS[0];
}

export interface CodingRoadmap {
  id: Exclude<RoadmapId, "custom">;
  title: string;
  shortTitle: string;
  badge: string;
  audience: string;
  description: string;
  outcome: string;
  durationLabel: string;
  gradient: string;
  clusters: ClusterId[];
}

export const CODING_ROADMAPS: CodingRoadmap[] = [
  {
    id: "frontend",
    title: "Lộ trình Front-end Pro",
    shortTitle: "Front-end (React/Next)",
    badge: "Phổ biến nhất cho người mới",
    audience: "Từ con số 0 đến làm chủ giao diện Web hiện đại với React & Next.js",
    description:
      "Đi theo 3 cụm phân cấp chuẩn doanh nghiệp: Nắm chắc HTML & CSS → Thành thạo JavaScript & TypeScript → Chinh phục React & Next.js App Router.",
    outcome: "Tự xây dựng Web App chuẩn SEO, responsive đẹp mắt và sẵn sàng thực tập Front-end.",
    durationLabel: "3 Cụm • 6 Khóa • 18 bài chấm test",
    gradient: "from-orange-500 via-rose-500 to-pink-600",
    clusters: ["html-css", "js-ts", "react-next"],
  },
  {
    id: "backend-node",
    title: "Lộ trình Back-end (Node / NestJS)",
    shortTitle: "Back-end (Node/Nest)",
    badge: "Chuẩn tuyển dụng JS/TS",
    audience: "Xây dựng API, xác thực, phân quyền & thiết kế cơ sở dữ liệu quy mô lớn",
    description:
      "Nền tảng JavaScript & TypeScript vững chắc → Xây dựng máy chủ REST API & Kiến trúc Modular với Node.js & NestJS → Làm chủ MongoDB & PostgreSQL.",
    outcome: "Thiết kế được Backend API sạch, bảo mật JWT/RBAC và truy vấn tối ưu cả SQL lẫn NoSQL.",
    durationLabel: "3 Cụm • 6 Khóa • 18 bài chấm test",
    gradient: "from-emerald-600 via-teal-600 to-rose-600",
    clusters: ["js-ts", "node-nest", "db-stack"],
  },
  {
    id: "fullstack",
    title: "Lộ trình Fullstack Web (JS/TS)",
    shortTitle: "Fullstack Toàn diện",
    badge: "Trọn bộ Từ A → Z",
    audience: "Tự xây dựng & vận hành hoàn chỉnh sản phẩm Web từ Giao diện tới Database",
    description:
      "Kết hợp trọn vẹn 5 cụm công nghệ phổ biến nhất Việt Nam: HTML & CSS → JS & TS → React & Next.js → Node.js & NestJS → MongoDB & PostgreSQL.",
    outcome: "Đủ năng lực tự làm trọn gói đồ án, sản phẩm khởi nghiệp hoặc ứng tuyển Fullstack Developer.",
    durationLabel: "5 Cụm • 10 Khóa • 30 bài chấm test",
    gradient: "from-indigo-600 via-violet-600 to-purple-700",
    clusters: ["html-css", "js-ts", "react-next", "node-nest", "db-stack"],
  },
  {
    id: "go-python-ai",
    title: "Lộ trình Golang, Python & Data",
    shortTitle: "Golang / Python & DB",
    badge: "Hệ thống lớn & AI",
    audience: "Hướng tới Microservices hiệu năng cao (Golang), AI/Automation (Python) & Dữ liệu",
    description:
      "Tập trung thẳng vào Cụm Golang & Python kết hợp Cụm Cơ sở dữ liệu MongoDB & PostgreSQL cho các bài toán xử lý dữ liệu và hệ thống tải cao.",
    outcome: "Viết dịch vụ Golang biên dịch thật, thuật toán Python và truy vấn dữ liệu SQL/NoSQL thành thạo.",
    durationLabel: "2 Cụm • 4 Khóa • 12 bài chấm test",
    gradient: "from-cyan-600 via-blue-600 to-indigo-700",
    clusters: ["go-python", "db-stack"],
  },
];

export const TRACK_VISUAL_META: Record<
  CodingLanguage,
  {
    coverGradient: string;
    subtitle: string;
    levelLabel: string;
    whatYouBuild: string;
  }
> = {
  html: {
    coverGradient: "from-orange-500 via-amber-500 to-rose-500",
    subtitle: "HTML5 — Khung Web chuẩn ngữ nghĩa",
    levelLabel: "Cơ bản",
    whatYouBuild: "Dựng cấu trúc trang web, tiêu đề, danh sách & biểu mẫu chuẩn SEO.",
  },
  css: {
    coverGradient: "from-sky-500 via-blue-500 to-indigo-600",
    subtitle: "CSS3 — Flexbox, Layout & Responsive",
    levelLabel: "Cơ bản",
    whatYouBuild: "Thiết kế giao diện đẹp mắt, căn chỉnh bố cục linh hoạt trên mọi màn hình.",
  },
  javascript: {
    coverGradient: "from-amber-400 via-orange-500 to-yellow-600",
    subtitle: "JavaScript ES6+ — Logic Web cốt lõi",
    levelLabel: "Nền tảng",
    whatYouBuild: "Làm chủ hàm, mảng, filter/map/reduce và xử lý logic tương tác.",
  },
  typescript: {
    coverGradient: "from-blue-600 via-indigo-600 to-violet-700",
    subtitle: "TypeScript — An toàn kiểu dữ liệu",
    levelLabel: "Trung cấp",
    whatYouBuild: "Định nghĩa Interface, Generic giúp code sạch, ít lỗi khi làm dự án lớn.",
  },
  react: {
    coverGradient: "from-cyan-500 via-sky-500 to-blue-600",
    subtitle: "ReactJS — Component, State & Custom Hook",
    levelLabel: "Framework FE",
    whatYouBuild: "Chia nhỏ giao diện thành Component, cập nhật State bất biến & tái sử dụng Hook.",
  },
  nextjs: {
    coverGradient: "from-slate-800 via-slate-900 to-indigo-950",
    subtitle: "Next.js 15 — App Router, SEO & API",
    levelLabel: "Fullstack FE",
    whatYouBuild: "Tạo Metadata SEO động, Route Handler phân trang và cơ chế Cache tối ưu.",
  },
  nodejs: {
    coverGradient: "from-lime-600 via-green-600 to-emerald-700",
    subtitle: "Node.js & Express — REST API & Middleware",
    levelLabel: "Backend API",
    whatYouBuild: "Viết Auth Middleware Bearer Token, Router CRUD và Rate Limiter chống spam.",
  },
  nestjs: {
    coverGradient: "from-rose-600 via-pink-600 to-red-700",
    subtitle: "NestJS — Service, DTO Validation & Guard",
    levelLabel: "Enterprise BE",
    whatYouBuild: "Tổ chức code chuẩn kiến trúc doanh nghiệp với Injectable Service, Pipe & Role Guard.",
  },
  python: {
    coverGradient: "from-emerald-500 via-teal-600 to-cyan-700",
    subtitle: "Python 3 — Thuật toán, Automation & AI",
    levelLabel: "AI & Data",
    whatYouBuild: "Xử lý chuỗi, danh sách, thuật toán và nền tảng vững chắc cho Trí tuệ nhân tạo.",
  },
  golang: {
    coverGradient: "from-cyan-500 via-sky-600 to-blue-700",
    subtitle: "Golang — Backend Biên dịch Hiệu năng cao",
    levelLabel: "Backend Pro",
    whatYouBuild: "Biên dịch Go thật, làm chủ Slice, Struct cho các hệ thống chịu tải hàng triệu user.",
  },
  mongodb: {
    coverGradient: "from-green-600 via-emerald-600 to-teal-700",
    subtitle: "MongoDB — NoSQL Document & Aggregation",
    levelLabel: "NoSQL DB",
    whatYouBuild: "Truy vấn tài liệu JSON linh hoạt với find, bộ lọc điều kiện & Pipeline tổng hợp.",
  },
  postgresql: {
    coverGradient: "from-indigo-600 via-blue-700 to-slate-800",
    subtitle: "PostgreSQL — SQL Quan hệ & INNER JOIN",
    levelLabel: "SQL DB",
    whatYouBuild: "Thành thạo SELECT, WHERE, GROUP BY và JOIN nhiều bảng chuẩn hệ thống lớn.",
  },
};
