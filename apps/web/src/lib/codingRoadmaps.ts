import { CodingLanguage } from "@/lib/codingCurriculum";

export type RoadmapId = "frontend" | "backend" | "fullstack" | "python-ai" | "custom";

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
  ringColor: string;
  tracks: CodingLanguage[];
}

export const CODING_ROADMAPS: CodingRoadmap[] = [
  {
    id: "frontend",
    title: "Lộ trình Lập trình Front-end",
    shortTitle: "Front-end Web",
    badge: "Phổ biến nhất cho người mới",
    audience: "Học sinh, sinh viên muốn tự tay thiết kế giao diện web đẹp & tương tác mượt",
    description:
      "Lập trình viên Front-end là người xây dựng toàn bộ giao diện người dùng nhìn thấy và tương tác trên website. Bắt đầu từ con số 0 với HTML, CSS, làm chủ JavaScript rồi nâng cấp lên TypeScript chuẩn doanh nghiệp.",
    outcome: "Tự xây dựng giao diện Landing Page, Web App tương tác, chuẩn bị vững chắc để học React & Next.js.",
    durationLabel: "4 khóa • 12 bài thực hành chấm test",
    gradient: "from-orange-500 via-rose-500 to-pink-600",
    ringColor: "ring-orange-200",
    tracks: ["html", "css", "javascript", "typescript"],
  },
  {
    id: "backend",
    title: "Lộ trình Lập trình Back-end",
    shortTitle: "Back-end & API",
    badge: "Lương cao • Hệ thống lớn",
    audience: "Người thích tư duy logic, thuật toán, xây dựng máy chủ & xử lý dữ liệu",
    description:
      "Lập trình viên Back-end chịu trách nhiệm xử lý nghiệp vụ, bảo mật, API và cơ sở dữ liệu phía sau hệ thống. Lộ trình kết hợp JavaScript/Python/Golang cùng 2 hệ quản trị CSDL phổ biến nhất là PostgreSQL và MongoDB.",
    outcome: "Hiểu rõ cách thiết kế API, xử lý logic máy chủ hiệu năng cao với Golang và truy vấn thành thạo SQL/NoSQL.",
    durationLabel: "4 khóa • 12 bài thực hành chấm test",
    gradient: "from-cyan-600 via-blue-600 to-indigo-700",
    ringColor: "ring-sky-200",
    tracks: ["javascript", "golang", "postgresql", "mongodb"],
  },
  {
    id: "fullstack",
    title: "Lộ trình Fullstack Web Developer",
    shortTitle: "Fullstack Toàn diện",
    badge: "Làm trọn vẹn sản phẩm",
    audience: "Người muốn tự mình xây dựng & vận hành một website/startup hoàn chỉnh từ A–Z",
    description:
      "Kết hợp tinh hoa của cả Front-end lẫn Back-end: nắm vững giao diện HTML/CSS/TypeScript, xây dựng máy chủ tốc độ cao bằng Golang và làm chủ dữ liệu quan hệ PostgreSQL.",
    outcome: "Tự thiết kế giao diện, viết API backend, lưu trữ cơ sở dữ liệu và triển khai ứng dụng web hoàn chỉnh.",
    durationLabel: "6 khóa • 18 bài thực hành chấm test",
    gradient: "from-indigo-600 via-violet-600 to-purple-700",
    ringColor: "ring-indigo-200",
    tracks: ["html", "css", "javascript", "typescript", "golang", "postgresql"],
  },
  {
    id: "python-ai",
    title: "Lộ trình Python, Dữ liệu & AI",
    shortTitle: "Python & AI / Data",
    badge: "Xu hướng Trí tuệ Nhân tạo",
    audience: "Học sinh ôn thi Tin học, sinh viên thích AI, tự động hóa & phân tích dữ liệu",
    description:
      "Python là ngôn ngữ số 1 thế giới cho Trí tuệ nhân tạo (AI), Khoa học dữ liệu và Tự động hóa. Kết hợp với PostgreSQL & MongoDB để đọc, lọc và phân tích kho dữ liệu thực tế.",
    outcome: "Thành thạo cú pháp Python, thuật toán xử lý dữ liệu và kỹ năng truy vấn kho dữ liệu SQL/NoSQL.",
    durationLabel: "3 khóa • 9 bài thực hành chấm test",
    gradient: "from-emerald-600 via-teal-600 to-cyan-700",
    ringColor: "ring-emerald-200",
    tracks: ["python", "postgresql", "mongodb"],
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
    subtitle: "HTML5 Pro — Từ Zero đến Nền tảng Web",
    levelLabel: "Người mới bắt đầu",
    whatYouBuild: "Xây dựng cấu trúc trang web chuẩn ngữ nghĩa, danh sách, biểu mẫu & SEO.",
  },
  css: {
    coverGradient: "from-sky-500 via-blue-500 to-indigo-600",
    subtitle: "CSS3 Hiện đại — Flexbox & Responsive",
    levelLabel: "Người mới bắt đầu",
    whatYouBuild: "Căn chỉnh bố cục đẹp mắt, thiết kế nút bấm, thẻ giao diện và web chuẩn mobile.",
  },
  javascript: {
    coverGradient: "from-amber-400 via-orange-500 to-yellow-600",
    subtitle: "JavaScript Cơ bản & ES6+ Thực chiến",
    levelLabel: "Cốt lõi Web",
    whatYouBuild: "Làm chủ biến, hàm, mảng, xử lý dữ liệu & logic tương tác cho mọi ứng dụng web.",
  },
  typescript: {
    coverGradient: "from-blue-600 via-indigo-600 to-violet-700",
    subtitle: "TypeScript Chuẩn Doanh nghiệp",
    levelLabel: "Trung cấp",
    whatYouBuild: "Viết code an toàn kiểu dữ liệu với Interface, Generic, tránh lỗi ngầm khi dự án lớn.",
  },
  python: {
    coverGradient: "from-emerald-500 via-teal-600 to-cyan-700",
    subtitle: "Python 3 — Thuật toán, Tự động hóa & AI",
    levelLabel: "Người mới & AI",
    whatYouBuild: "Giải bài toán thuật toán, xử lý chuỗi/danh sách & tạo nền tảng vững chắc cho AI.",
  },
  golang: {
    coverGradient: "from-cyan-500 via-sky-600 to-blue-700",
    subtitle: "Golang Backend Hiệu năng cao",
    levelLabel: "Backend Pro",
    whatYouBuild: "Biên dịch Go thật, làm chủ Slice, Struct & xây dựng nền tảng dịch vụ chịu tải lớn.",
  },
  mongodb: {
    coverGradient: "from-green-600 via-emerald-600 to-teal-700",
    subtitle: "MongoDB NoSQL Document Database",
    levelLabel: "Cơ sở dữ liệu",
    whatYouBuild: "Truy vấn tài liệu JSON linh hoạt với find, bộ lọc điều kiện & Aggregation Pipeline.",
  },
  postgresql: {
    coverGradient: "from-indigo-600 via-blue-700 to-slate-800",
    subtitle: "PostgreSQL & SQL Chuẩn Hệ thống lớn",
    levelLabel: "Cơ sở dữ liệu",
    whatYouBuild: "Thành thạo SELECT, WHERE, GROUP BY, JOIN nhiều bảng để phân tích dữ liệu chính xác.",
  },
};
