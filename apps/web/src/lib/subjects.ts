import {
  Atom,
  BookMarked,
  BookOpenText,
  Calculator,
  Dna,
  FlaskConical,
  Globe2,
  Landmark,
  Languages,
  Laptop,
  LucideIcon,
  Microscope,
} from "lucide-react";

export interface SubjectMeta {
  code: string;
  name: string;
  shortName: string;
  icon: LucideIcon;
  tagline: string;
  cardBg: string;
  iconBoxBg: string;
  badgeBg: string;
  activeRing: string;
}

export const SUBJECT_META: Record<string, SubjectMeta> = {
  toan: {
    code: "toan",
    name: "Toán học",
    shortName: "Toán",
    icon: Calculator,
    tagline: "Số học, Đại số, Giải tích & Hình học",
    cardBg: "bg-blue-50/70 border-blue-200 hover:border-blue-400",
    iconBoxBg: "bg-blue-100 text-blue-700",
    badgeBg: "bg-blue-100 text-blue-700",
    activeRing: "bg-blue-600 text-white border-blue-600 shadow-sm",
  },
  "ngu-van": {
    code: "ngu-van",
    name: "Ngữ văn",
    shortName: "Ngữ văn",
    icon: BookOpenText,
    tagline: "Đọc hiểu, Tiếng Việt & Làm văn",
    cardBg: "bg-rose-50/70 border-rose-200 hover:border-rose-400",
    iconBoxBg: "bg-rose-100 text-rose-700",
    badgeBg: "bg-rose-100 text-rose-700",
    activeRing: "bg-rose-600 text-white border-rose-600 shadow-sm",
  },
  "tieng-anh": {
    code: "tieng-anh",
    name: "Tiếng Anh",
    shortName: "Tiếng Anh",
    icon: Languages,
    tagline: "Ngữ pháp, Từ vựng & Đọc hiểu",
    cardBg: "bg-cyan-50/70 border-cyan-200 hover:border-cyan-400",
    iconBoxBg: "bg-cyan-100 text-cyan-800",
    badgeBg: "bg-cyan-100 text-cyan-800",
    activeRing: "bg-cyan-600 text-white border-cyan-600 shadow-sm",
  },
  khtn: {
    code: "khtn",
    name: "Khoa học tự nhiên",
    shortName: "KHTN",
    icon: Microscope,
    tagline: "Tích hợp Lý – Hóa – Sinh (GDPT 2018)",
    cardBg: "bg-teal-50/70 border-teal-200 hover:border-teal-400",
    iconBoxBg: "bg-teal-100 text-teal-800",
    badgeBg: "bg-teal-100 text-teal-800",
    activeRing: "bg-teal-600 text-white border-teal-600 shadow-sm",
  },
  "vat-ly": {
    code: "vat-ly",
    name: "Vật lý",
    shortName: "Vật lý",
    icon: Atom,
    tagline: "Cơ học, Nhiệt, Điện từ & Hạt nhân",
    cardBg: "bg-violet-50/70 border-violet-200 hover:border-violet-400",
    iconBoxBg: "bg-violet-100 text-violet-700",
    badgeBg: "bg-violet-100 text-violet-700",
    activeRing: "bg-violet-600 text-white border-violet-600 shadow-sm",
  },
  "hoa-hoc": {
    code: "hoa-hoc",
    name: "Hóa học",
    shortName: "Hóa học",
    icon: FlaskConical,
    tagline: "Vô cơ, Hữu cơ & Danh pháp IUPAC",
    cardBg: "bg-emerald-50/70 border-emerald-200 hover:border-emerald-400",
    iconBoxBg: "bg-emerald-100 text-emerald-800",
    badgeBg: "bg-emerald-100 text-emerald-800",
    activeRing: "bg-emerald-600 text-white border-emerald-600 shadow-sm",
  },
  "sinh-hoc": {
    code: "sinh-hoc",
    name: "Sinh học",
    shortName: "Sinh học",
    icon: Dna,
    tagline: "Tế bào, Di truyền, Tiến hóa & Sinh thái",
    cardBg: "bg-lime-50/70 border-lime-200 hover:border-lime-400",
    iconBoxBg: "bg-lime-100 text-lime-800",
    badgeBg: "bg-lime-100 text-lime-800",
    activeRing: "bg-lime-600 text-white border-lime-600 shadow-sm",
  },
  "lich-su": {
    code: "lich-su",
    name: "Lịch sử",
    shortName: "Lịch sử",
    icon: Landmark,
    tagline: "Lịch sử Việt Nam & Thế giới",
    cardBg: "bg-amber-50/70 border-amber-200 hover:border-amber-400",
    iconBoxBg: "bg-amber-100 text-amber-800",
    badgeBg: "bg-amber-100 text-amber-800",
    activeRing: "bg-amber-600 text-white border-amber-600 shadow-sm",
  },
  "dia-ly": {
    code: "dia-ly",
    name: "Địa lý",
    shortName: "Địa lý",
    icon: Globe2,
    tagline: "Tự nhiên, Dân cư & Kinh tế vùng",
    cardBg: "bg-orange-50/70 border-orange-200 hover:border-orange-400",
    iconBoxBg: "bg-orange-100 text-orange-800",
    badgeBg: "bg-orange-100 text-orange-800",
    activeRing: "bg-orange-600 text-white border-orange-600 shadow-sm",
  },
  "tin-hoc": {
    code: "tin-hoc",
    name: "Tin học",
    shortName: "Tin học",
    icon: Laptop,
    tagline: "Lập trình Python, Web, AI & Dữ liệu",
    cardBg: "bg-indigo-50/70 border-indigo-200 hover:border-indigo-400",
    iconBoxBg: "bg-indigo-100 text-indigo-700",
    badgeBg: "bg-indigo-100 text-indigo-700",
    activeRing: "bg-indigo-600 text-white border-indigo-600 shadow-sm",
  },
};

export const SUBJECT_ORDER = [
  "toan",
  "ngu-van",
  "tieng-anh",
  "khtn",
  "vat-ly",
  "hoa-hoc",
  "sinh-hoc",
  "lich-su",
  "dia-ly",
  "tin-hoc",
];

export function getSubjectMeta(code: string, fallbackName?: string): SubjectMeta {
  return (
    SUBJECT_META[code] || {
      code,
      name: fallbackName || code,
      shortName: fallbackName || code,
      icon: BookMarked,
      tagline: "Chương trình GDPT 2018",
      cardBg: "bg-slate-50 border-slate-200 hover:border-slate-400",
      iconBoxBg: "bg-slate-200 text-slate-700",
      badgeBg: "bg-slate-200 text-slate-700",
      activeRing: "bg-slate-800 text-white border-slate-800",
    }
  );
}
