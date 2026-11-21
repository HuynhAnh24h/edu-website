export type CodingLanguage =
  | "html"
  | "css"
  | "javascript"
  | "typescript"
  | "golang"
  | "python"
  | "mongodb"
  | "postgresql";

export interface TestCaseSpec {
  id: string;
  label: string;
  // JS / TS: expression returning boolean given user exports/functions
  jsCheck?: string;
  // Python: python assertion snippet
  pyCheck?: string;
  // Go: Go code appended inside main() printing PASS:<id> or FAIL:<id>:<msg>
  goCheck?: string;
  // HTML/CSS: DOM check description + rule
  domSelector?: string;
  domTextIncludes?: string;
  domMinCount?: number;
  cssMustContain?: string[];
  // SQL / MongoDB: expected row count / field checks
  expectedRows?: Record<string, unknown>[];
  expectedCount?: number;
  checkFirstRow?: Record<string, unknown>;
}

export interface CodingLesson {
  id: string;
  trackId: CodingLanguage;
  order: number;
  title: string;
  difficulty: "Cơ bản" | "Trung bình" | "Thực chiến";
  summary: string;
  theory: string[];
  taskPrompt: string;
  hint: string;
  starterCode: string;
  // For CSS track: base HTML preview rendered alongside user's CSS
  previewHtml?: string;
  // For TypeScript: required TS syntax patterns
  requiredTsPatterns?: { regex: string; message: string }[];
  // For PostgreSQL: seeded tables
  sqlTables?: Record<string, Record<string, unknown>[]>;
  // For MongoDB: seeded collections
  mongoCollections?: Record<string, Record<string, unknown>[]>;
  // For Go: extra imports needed by test harness
  goTestImports?: string[];
  tests: TestCaseSpec[];
}

export interface CodingTrack {
  id: CodingLanguage;
  name: string;
  shortName: string;
  tagline: string;
  category: "Frontend" | "Backend" | "Database";
  accentBg: string;
  accentText: string;
  accentBorder: string;
  runtimeLabel: string;
  lessons: CodingLesson[];
}

export const CODING_TRACKS: CodingTrack[] = [
  // ================= 1. HTML =================
  {
    id: "html",
    name: "HTML5 Cấu trúc Web",
    shortName: "HTML",
    tagline: "Xây dựng khung trang web chuẩn ngữ nghĩa, danh sách & biểu mẫu.",
    category: "Frontend",
    accentBg: "bg-orange-50",
    accentText: "text-orange-700",
    accentBorder: "border-orange-200",
    runtimeLabel: "Trình duyệt Live DOM",
    lessons: [
      {
        id: "html-1",
        trackId: "html",
        order: 1,
        title: "Bài 1: Tạo Thẻ Giới thiệu Cộng đồng",
        difficulty: "Cơ bản",
        summary: "Sử dụng các thẻ ngữ nghĩa <main>, <h1> và <p> để xây dựng phần mở đầu trang web.",
        theory: [
          "Thẻ <h1> dùng cho tiêu đề chính quan trọng nhất của trang.",
          "Thẻ <p> dùng để trình bày đoạn văn bản mô tả.",
          "Thẻ <a> kết hợp thuộc tính href để tạo đường dẫn liên kết.",
        ],
        taskPrompt:
          'Hãy viết đoạn HTML chứa: (1) Một thẻ <h1> có nội dung chứa chữ "EduK12", (2) Một thẻ <p> mô tả ngắn gọn, và (3) Một thẻ <button> có chữ "Bắt đầu học".',
        hint: '<main>\n  <h1>Chào mừng đến EduK12</h1>\n  <p>Nền tảng học lập trình cho cộng đồng.</p>\n  <button>Bắt đầu học</button>\n</main>',
        starterCode: `<main style="font-family: sans-serif; padding: 16px;">\n  <!-- Hãy sửa tiêu đề bên dưới thành h1 chứa chữ EduK12 và thêm nút Bắt đầu học -->\n  <h2>Xin chào</h2>\n  <p>Nền tảng học lập trình mở.</p>\n</main>`,
        tests: [
          { id: "t1", label: 'Có thẻ <h1> chứa nội dung "EduK12"', domSelector: "h1", domTextIncludes: "EduK12" },
          { id: "t2", label: "Có ít nhất 1 thẻ đoạn văn <p>", domSelector: "p", domMinCount: 1 },
          { id: "t3", label: 'Có thẻ <button> chứa chữ "Bắt đầu học"', domSelector: "button", domTextIncludes: "Bắt đầu học" },
        ],
      },
      {
        id: "html-2",
        trackId: "html",
        order: 2,
        title: "Bài 2: Danh sách Khóa học (<ul> & <li>)",
        difficulty: "Cơ bản",
        summary: "Trình bày danh sách công nghệ bằng thẻ <ul> và ít nhất 3 mục <li>.",
        theory: [
          "<ul> tạo danh sách không đánh số, <ol> tạo danh sách đánh số thứ tự.",
          "Mỗi phần tử trong danh sách được bọc bằng thẻ <li>.",
        ],
        taskPrompt:
          'Tạo một thẻ <ul> chứa ít nhất 3 thẻ <li> liệt kê các môn học, trong đó bắt buộc có mục chứa chữ "JavaScript" và mục chứa chữ "Python".',
        hint: '<ul>\n  <li>HTML & CSS</li>\n  <li>JavaScript</li>\n  <li>Python</li>\n</ul>',
        starterCode: `<section style="font-family: sans-serif; padding: 16px;">\n  <h2>Lộ trình học</h2>\n  <ul>\n    <li>HTML</li>\n  </ul>\n</section>`,
        tests: [
          { id: "t1", label: "Có thẻ danh sách <ul>", domSelector: "ul", domMinCount: 1 },
          { id: "t2", label: "Có ít nhất 3 mục <li> trong <ul>", domSelector: "ul li", domMinCount: 3 },
          { id: "t3", label: 'Danh sách có chứa mục "JavaScript"', domSelector: "ul", domTextIncludes: "JavaScript" },
          { id: "t4", label: 'Danh sách có chứa mục "Python"', domSelector: "ul", domTextIncludes: "Python" },
        ],
      },
      {
        id: "html-3",
        trackId: "html",
        order: 3,
        title: "Bài 3: Biểu mẫu Đăng ký (<form> & <input>)",
        difficulty: "Trung bình",
        summary: "Xây dựng form nhập Email đúng chuẩn truy cập web.",
        theory: [
          "Biểu mẫu HTML bắt đầu bằng thẻ <form>.",
          'Thẻ <input type="email"> giúp trình duyệt tự động kiểm tra định dạng Email.',
          'Nút gửi dữ liệu dùng <button type="submit">.',
        ],
        taskPrompt:
          'Tạo một <form> chứa: (1) <label> cho email, (2) <input type="email" required>, và (3) <button type="submit"> có chữ "Đăng ký".',
        hint: '<form>\n  <label>Email của bạn</label>\n  <input type="email" required placeholder="you@example.com" />\n  <button type="submit">Đăng ký</button>\n</form>',
        starterCode: `<div style="font-family: sans-serif; padding: 16px;">\n  <!-- Hãy bọc bằng thẻ form và thêm input type="email" -->\n  <input type="text" placeholder="Nhập email" />\n</div>`,
        tests: [
          { id: "t1", label: "Có thẻ <form>", domSelector: "form", domMinCount: 1 },
          { id: "t2", label: 'Có <input type="email"> bên trong form', domSelector: 'form input[type="email"]', domMinCount: 1 },
          { id: "t3", label: 'Có nút <button type="submit"> chứa "Đăng ký"', domSelector: 'form button[type="submit"]', domTextIncludes: "Đăng ký" },
        ],
      },
    ],
  },

  // ================= 2. CSS =================
  {
    id: "css",
    name: "CSS3 Giao diện Hiện đại",
    shortName: "CSS",
    tagline: "Làm chủ Box Model, Flexbox, CSS Grid và hiệu ứng nút bấm đẹp mắt.",
    category: "Frontend",
    accentBg: "bg-sky-50",
    accentText: "text-sky-700",
    accentBorder: "border-sky-200",
    runtimeLabel: "Trình duyệt Live CSS",
    lessons: [
      {
        id: "css-1",
        trackId: "css",
        order: 1,
        title: "Bài 1: Tạo kiểu Thẻ Card chuyên nghiệp",
        difficulty: "Cơ bản",
        summary: "Dùng padding, border-radius và background để biến khối chữ thô thành thẻ giao diện đẹp.",
        theory: [
          "padding tạo khoảng đệm bên trong phần tử.",
          "border-radius bo tròn các góc thẻ (VD: 12px hoặc 16px).",
          "background-color hoặc background thiết lập màu nền.",
        ],
        taskPrompt:
          "Viết CSS cho class `.card` có đầy đủ: `background` (hoặc `background-color`), `padding`, và `border-radius`.",
        hint: ".card {\n  background: #4f46e5;\n  color: white;\n  padding: 20px;\n  border-radius: 16px;\n}",
        previewHtml: `<div class="card"><h3>Thẻ khóa học EduK12</h3><p>Học lập trình miễn phí cho cộng đồng!</p></div>`,
        starterCode: `.card {\n  color: #1e293b;\n  /* Hãy thêm background, padding và border-radius tại đây */\n}`,
        tests: [
          { id: "t1", label: "Selector .card có thuộc tính background / background-color", cssMustContain: [".card", "background"] },
          { id: "t2", label: "Có thuộc tính padding tạo khoảng đệm", cssMustContain: ["padding"] },
          { id: "t3", label: "Có thuộc tính border-radius bo tròn góc", cssMustContain: ["border-radius"] },
        ],
      },
      {
        id: "css-2",
        trackId: "css",
        order: 2,
        title: "Bài 2: Căn hàng ngang với Flexbox",
        difficulty: "Cơ bản",
        summary: "Sắp xếp thanh điều hướng ngang hàng, cách đều nhau bằng display: flex.",
        theory: [
          "display: flex biến phần tử cha thành Flexbox Container.",
          "justify-content: space-between đẩy các phần tử con ra hai phía đều nhau.",
          "align-items: center căn giữa theo trục dọc.",
        ],
        taskPrompt:
          "Viết CSS cho `.navbar` sử dụng `display: flex`, `justify-content: space-between`, `align-items: center` và `gap`.",
        hint: ".navbar {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  gap: 12px;\n  padding: 12px 16px;\n  background: #0f172a;\n  color: white;\n  border-radius: 12px;\n}",
        previewHtml: `<nav class="navbar"><strong>EduK12</strong><div style="display:flex;gap:12px;"><span>HTML</span><span>JS</span><span>Go</span></div></nav>`,
        starterCode: `.navbar {\n  background: #0f172a;\n  color: white;\n  padding: 12px 16px;\n  border-radius: 12px;\n  /* Thêm display: flex, justify-content, align-items và gap */\n}`,
        tests: [
          { id: "t1", label: "Sử dụng display: flex", cssMustContain: ["display", "flex"] },
          { id: "t2", label: "Căn đều hai bên với justify-content: space-between", cssMustContain: ["justify-content", "space-between"] },
          { id: "t3", label: "Căn giữa dọc với align-items: center", cssMustContain: ["align-items", "center"] },
          { id: "t4", label: "Có khoảng cách gap giữa các mục", cssMustContain: ["gap"] },
        ],
      },
      {
        id: "css-3",
        trackId: "css",
        order: 3,
        title: "Bài 3: Lưới khóa học 3 cột với CSS Grid",
        difficulty: "Trung bình",
        summary: "Chia bố cục lưới đa cột gọn gàng bằng display: grid và grid-template-columns.",
        theory: [
          "display: grid kích hoạt hệ thống lưới 2 chiều.",
          "grid-template-columns: repeat(3, 1fr) chia đều thành 3 cột bằng nhau.",
        ],
        taskPrompt:
          "Viết CSS cho `.grid` sử dụng `display: grid`, `grid-template-columns` (VD: `repeat(3, 1fr)`) và `gap: 12px`.",
        hint: ".grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 12px;\n}\n.item {\n  background: #eef2ff;\n  padding: 14px;\n  border-radius: 10px;\n  text-align: center;\n  font-weight: bold;\n}",
        previewHtml: `<div class="grid"><div class="item">HTML</div><div class="item">CSS</div><div class="item">JS</div></div>`,
        starterCode: `.grid {\n  /* Biến .grid thành lưới 3 cột bằng nhau */\n}\n.item {\n  background: #eef2ff;\n  color: #3730a3;\n  padding: 14px;\n  border-radius: 10px;\n  text-align: center;\n  font-weight: bold;\n}`,
        tests: [
          { id: "t1", label: "Sử dụng display: grid", cssMustContain: ["display", "grid"] },
          { id: "t2", label: "Thiết lập grid-template-columns chia cột", cssMustContain: ["grid-template-columns"] },
          { id: "t3", label: "Có thuộc tính gap giữa các ô lưới", cssMustContain: ["gap"] },
        ],
      },
    ],
  },

  // ================= 3. JAVASCRIPT =================
  {
    id: "javascript",
    name: "JavaScript (ES6+)",
    shortName: "JavaScript",
    tagline: "Ngôn ngữ cốt lõi của web hiện đại: Hàm, Mảng, Xử lý dữ liệu & Thuật toán.",
    category: "Frontend",
    accentBg: "bg-amber-50",
    accentText: "text-amber-700",
    accentBorder: "border-amber-200",
    runtimeLabel: "JS Sandbox Engine",
    lessons: [
      {
        id: "js-1",
        trackId: "javascript",
        order: 1,
        title: "Bài 1: Hàm tính Tổng các số chẵn",
        difficulty: "Cơ bản",
        summary: "Viết hàm sumEven(arr) nhận vào mảng số nguyên và trả về tổng các số chẵn.",
        theory: [
          "Toán tử chia lấy dư `n % 2 === 0` dùng để kiểm tra số chẵn.",
          "Bạn có thể dùng vòng lặp `for...of` hoặc `arr.filter(...).reduce(...)`.",
        ],
        taskPrompt:
          "Hoàn thiện hàm `sumEven(arr)` sao cho trả về tổng tất cả các phần tử chẵn trong mảng `arr`. Nếu không có số chẵn nào, trả về `0`.",
        hint: "function sumEven(arr) {\n  return arr.filter((n) => n % 2 === 0).reduce((acc, cur) => acc + cur, 0);\n}",
        starterCode: `function sumEven(arr) {\n  // Viết code của bạn tại đây\n  return 0;\n}\n\nconsole.log("Thử nghiệm:", sumEven([1, 2, 3, 4, 6]));`,
        tests: [
          { id: "t1", label: "sumEven([1, 2, 3, 4, 6]) === 12", jsCheck: "sumEven([1, 2, 3, 4, 6]) === 12" },
          { id: "t2", label: "sumEven([1, 3, 5]) === 0", jsCheck: "sumEven([1, 3, 5]) === 0" },
          { id: "t3", label: "sumEven([10, -2, 7, 8]) === 16", jsCheck: "sumEven([10, -2, 7, 8]) === 16" },
        ],
      },
      {
        id: "js-2",
        trackId: "javascript",
        order: 2,
        title: "Bài 2: Lọc & Chuẩn hóa Học sinh Giỏi",
        difficulty: "Trung bình",
        summary: "Thực hành `.filter()` và `.map()` trên mảng Object thực tế.",
        theory: [
          "`array.filter(item => điều_kiện)` lọc ra các phần tử thỏa mãn.",
          "`array.map(item => giá_trị_mới)` biến đổi từng phần tử sang dạng mới.",
        ],
        taskPrompt:
          "Viết hàm `getTopStudents(students)` nhận vào mảng `{ name, score }`, lọc các học sinh có `score >= 8` và trả về mảng **tên** của họ (theo đúng thứ tự ban đầu).",
        hint: "function getTopStudents(students) {\n  return students.filter((s) => s.score >= 8).map((s) => s.name);\n}",
        starterCode: `function getTopStudents(students) {\n  // Lọc học sinh score >= 8 và trả về mảng tên\n  return [];\n}\n\nconst sample = [{ name: "An", score: 9 }, { name: "Bình", score: 6.5 }, { name: "Chi", score: 8 }];\nconsole.log(getTopStudents(sample));`,
        tests: [
          {
            id: "t1",
            label: 'Lọc đúng ["An", "Chi"] với mẫu điểm 9, 6.5, 8',
            jsCheck:
              'JSON.stringify(getTopStudents([{name:"An",score:9},{name:"Bình",score:6.5},{name:"Chi",score:8}])) === JSON.stringify(["An","Chi"])',
          },
          {
            id: "t2",
            label: "Trả về [] khi không có ai >= 8",
            jsCheck: 'JSON.stringify(getTopStudents([{name:"Nam",score:7.9}])) === "[]"',
          },
        ],
      },
      {
        id: "js-3",
        trackId: "javascript",
        order: 3,
        title: "Bài 3: Thuật toán Two Sum kinh điển",
        difficulty: "Thực chiến",
        summary: "Tìm cặp chỉ số `(i, j)` sao cho `nums[i] + nums[j] === target` bằng Map $O(n)$.",
        theory: [
          "Dùng `new Map()` lưu `giá_trị -> chỉ_số` giúp tìm phần tử bù `target - nums[i]` trong $O(1)$.",
          "Độ phức tạp toàn bài giảm từ $O(n^2)$ xuống $O(n)$.",
        ],
        taskPrompt:
          "Viết hàm `twoSum(nums, target)` trả về mảng 2 chỉ số `[i, j]` (`i < j`) sao cho `nums[i] + nums[j] === target`.",
        hint: "function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need), i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}",
        starterCode: `function twoSum(nums, target) {\n  // Trả về [i, j] sao cho nums[i] + nums[j] === target\n  return [];\n}\n\nconsole.log(twoSum([2, 7, 11, 15], 9));`,
        tests: [
          { id: "t1", label: "twoSum([2, 7, 11, 15], 9) => [0, 1]", jsCheck: "JSON.stringify(twoSum([2, 7, 11, 15], 9)) === '[0,1]'" },
          { id: "t2", label: "twoSum([3, 2, 4], 6) => [1, 2]", jsCheck: "JSON.stringify(twoSum([3, 2, 4], 6)) === '[1,2]'" },
          { id: "t3", label: "twoSum([3, 3], 6) => [0, 1]", jsCheck: "JSON.stringify(twoSum([3, 3], 6)) === '[0,1]'" },
        ],
      },
    ],
  },

  // ================= 4. TYPESCRIPT =================
  {
    id: "typescript",
    name: "TypeScript An toàn Kiểu",
    shortName: "TypeScript",
    tagline: "Viết code sạch, chống lỗi runtime với Interface, Type Annotation & Generics.",
    category: "Frontend",
    accentBg: "bg-blue-50",
    accentText: "text-blue-700",
    accentBorder: "border-blue-200",
    runtimeLabel: "TS Type Check + Runner",
    lessons: [
      {
        id: "ts-1",
        trackId: "typescript",
        order: 1,
        title: "Bài 1: Khai báo Kiểu Tham số & Giá trị Trả về",
        difficulty: "Cơ bản",
        summary: "Định nghĩa hàm TypeScript tính tổng tiền sau giảm giá với kiểu `number` rõ ràng.",
        theory: [
          "Cú pháp khai báo kiểu hàm: `function tenHam(a: number, b: number): number`.",
          "TypeScript phát hiện lỗi truyền sai kiểu dữ liệu ngay lúc viết code.",
        ],
        taskPrompt:
          "Viết hàm `calcDiscount(price: number, percent: number): number` trả về giá sau khi giảm `percent%`. Ví dụ `calcDiscount(100000, 20)` trả về `80000`.",
        hint: "function calcDiscount(price: number, percent: number): number {\n  return price - (price * percent) / 100;\n}",
        starterCode: `function calcDiscount(price: number, percent: number): number {\n  // Tính giá sau giảm giá percent%\n  return price;\n}\n\nconsole.log(calcDiscount(100000, 20));`,
        requiredTsPatterns: [
          { regex: ":\\s*number", message: "Cần khai báo kiểu TypeScript `: number` cho tham số/hàm" },
        ],
        tests: [
          { id: "t1", label: "calcDiscount(100000, 20) === 80000", jsCheck: "calcDiscount(100000, 20) === 80000" },
          { id: "t2", label: "calcDiscount(500, 10) === 450", jsCheck: "calcDiscount(500, 10) === 450" },
          { id: "t3", label: "calcDiscount(200, 0) === 200", jsCheck: "calcDiscount(200, 0) === 200" },
        ],
      },
      {
        id: "ts-2",
        trackId: "typescript",
        order: 2,
        title: "Bài 2: Interface & Tính Tổng Giỏ hàng",
        difficulty: "Trung bình",
        summary: "Định nghĩa `interface CartItem` và tính tổng tiền của mảng sản phẩm.",
        theory: [
          "`interface` mô tả cấu trúc của một Object trong TypeScript.",
          "Mảng các phần tử kiểu `CartItem` viết là `CartItem[]`.",
        ],
        taskPrompt:
          "Định nghĩa `interface CartItem { name: string; price: number; qty: number }` và viết hàm `totalCart(items: CartItem[]): number` trả về tổng `price * qty`.",
        hint: "interface CartItem {\n  name: string;\n  price: number;\n  qty: number;\n}\n\nfunction totalCart(items: CartItem[]): number {\n  return items.reduce((sum, item) => sum + item.price * item.qty, 0);\n}",
        starterCode: `interface CartItem {\n  name: string;\n  price: number;\n  qty: number;\n}\n\nfunction totalCart(items: CartItem[]): number {\n  // Tính tổng price * qty của tất cả sản phẩm\n  return 0;\n}`,
        requiredTsPatterns: [
          { regex: "interface\\s+CartItem", message: "Cần khai báo `interface CartItem`" },
          { regex: "CartItem\\[\\]", message: "Cần khai báo tham số kiểu `CartItem[]`" },
        ],
        tests: [
          {
            id: "t1",
            label: "Tính đúng tổng giỏ hàng 2 sản phẩm = 130",
            jsCheck: 'totalCart([{name:"Sách",price:50,qty:2},{name:"Bút",price:10,qty:3}]) === 130',
          },
          { id: "t2", label: "Giỏ hàng rỗng trả về 0", jsCheck: "totalCart([]) === 0" },
        ],
      },
      {
        id: "ts-3",
        trackId: "typescript",
        order: 3,
        title: "Bài 3: Hàm Generic <T> lấy Phần tử đầu tiên",
        difficulty: "Thực chiến",
        summary: "Sử dụng Generics `<T>` để viết hàm tái sử dụng cho mọi kiểu dữ liệu.",
        theory: [
          "Generics `<T>` giữ nguyên kiểu dữ liệu đầu vào cho giá trị trả về thay vì dùng `any`.",
          "Union Type `T | null` biểu thị kết quả có thể là kiểu `T` hoặc `null`.",
        ],
        taskPrompt:
          "Viết hàm Generic `firstOrNull<T>(arr: T[]): T | null` trả về phần tử đầu tiên của mảng, hoặc `null` nếu mảng rỗng.",
        hint: "function firstOrNull<T>(arr: T[]): T | null {\n  return arr.length > 0 ? arr[0] : null;\n}",
        starterCode: `function firstOrNull<T>(arr: T[]): T | null {\n  // Trả về phần tử đầu tiên hoặc null nếu mảng rỗng\n  return null;\n}`,
        requiredTsPatterns: [
          { regex: "<T>", message: "Cần sử dụng Generic `<T>` trong định nghĩa hàm" },
        ],
        tests: [
          { id: "t1", label: "firstOrNull([10, 20, 30]) === 10", jsCheck: "firstOrNull([10, 20, 30]) === 10" },
          { id: "t2", label: 'firstOrNull(["Go", "TS"]) === "Go"', jsCheck: 'firstOrNull(["Go", "TS"]) === "Go"' },
          { id: "t3", label: "firstOrNull([]) === null", jsCheck: "firstOrNull([]) === null" },
        ],
      },
    ],
  },

  // ================= 5. PYTHON =================
  {
    id: "python",
    name: "Python Thực chiến & AI",
    shortName: "Python",
    tagline: "Chạy trình thông dịch Python 3 (WebAssembly) thật ngay trên trình duyệt!",
    category: "Backend",
    accentBg: "bg-emerald-50",
    accentText: "text-emerald-700",
    accentBorder: "border-emerald-200",
    runtimeLabel: "CPython WebAssembly",
    lessons: [
      {
        id: "py-1",
        trackId: "python",
        order: 1,
        title: "Bài 1: Hàm kiểm tra Số chẵn & Tính Giai thừa",
        difficulty: "Cơ bản",
        summary: "Viết hàm Python `factorial(n)` tính $n!$ bằng vòng lặp hoặc đệ quy.",
        theory: [
          "Hàm trong Python khai báo bằng từ khóa `def ten_ham(tham_so):`.",
          "Quy ước toán học: $0! = 1$, $n! = 1 \\times 2 \\times ... \\times n$.",
        ],
        taskPrompt:
          "Viết hàm `factorial(n)` trả về giai thừa của số nguyên không âm `n`. Ví dụ: `factorial(5) == 120`, `factorial(0) == 1`.",
        hint: "def factorial(n):\n    res = 1\n    for i in range(2, n + 1):\n        res *= i\n    return res",
        starterCode: `def factorial(n):\n    # Viết code tính n! tại đây\n    return 0\n\nprint("5! =", factorial(5))`,
        tests: [
          { id: "t1", label: "factorial(0) == 1", pyCheck: "assert factorial(0) == 1" },
          { id: "t2", label: "factorial(5) == 120", pyCheck: "assert factorial(5) == 120" },
          { id: "t3", label: "factorial(6) == 720", pyCheck: "assert factorial(6) == 720" },
        ],
      },
      {
        id: "py-2",
        trackId: "python",
        order: 2,
        title: "Bài 2: List Comprehension & Lọc Số Dương",
        difficulty: "Cơ bản",
        summary: "Dùng cú pháp List Comprehension ngắn gọn đặc trưng của Python.",
        theory: [
          "List Comprehension: `[x * x for x in nums if x > 0]`.",
          "Giúp xử lý dữ liệu nhanh, gọn và rất dễ đọc trong Khoa học dữ liệu & AI.",
        ],
        taskPrompt:
          "Viết hàm `square_positives(nums)` nhận vào danh sách số và trả về danh sách **bình phương các số dương (> 0)**.",
        hint: "def square_positives(nums):\n    return [x * x for x in nums if x > 0]",
        starterCode: `def square_positives(nums):\n    # Trả về list bình phương các số > 0\n    return []\n\nprint(square_positives([-3, 0, 2, 4]))`,
        tests: [
          { id: "t1", label: "square_positives([-3, 0, 2, 4]) == [4, 16]", pyCheck: "assert square_positives([-3, 0, 2, 4]) == [4, 16]" },
          { id: "t2", label: "square_positives([-1, -5]) == []", pyCheck: "assert square_positives([-1, -5]) == []" },
          { id: "t3", label: "square_positives([1, 3, 5]) == [1, 9, 25]", pyCheck: "assert square_positives([1, 3, 5]) == [1, 9, 25]" },
        ],
      },
      {
        id: "py-3",
        trackId: "python",
        order: 3,
        title: "Bài 3: Dictionary — Đếm Tần suất Từ",
        difficulty: "Trung bình",
        summary: "Dùng `dict` để thống kê số lần xuất hiện của từng từ trong câu.",
        theory: [
          "`text.lower().split()` tách câu thành danh sách các từ chữ thường.",
          "`counts[w] = counts.get(w, 0) + 1` là mẫu chuẩn tăng bộ đếm trong dict.",
        ],
        taskPrompt:
          'Viết hàm `word_count(text)` trả về dictionary đếm số lần xuất hiện của từng từ (không phân biệt hoa/thường). VD: `word_count("Go python go")` -> `{"go": 2, "python": 1}`.',
        hint: "def word_count(text):\n    counts = {}\n    for w in text.lower().split():\n        counts[w] = counts.get(w, 0) + 1\n    return counts",
        starterCode: `def word_count(text):\n    # Đếm tần suất từ không phân biệt hoa/thường\n    return {}\n\nprint(word_count("Go python go"))`,
        tests: [
          { id: "t1", label: 'word_count("Go python go") == {"go": 2, "python": 1}', pyCheck: 'assert word_count("Go python go") == {"go": 2, "python": 1}' },
          { id: "t2", label: 'word_count("") == {}', pyCheck: 'assert word_count("") == {}' },
        ],
      },
    ],
  },

  // ================= 6. GOLANG =================
  {
    id: "golang",
    name: "Golang Hiệu năng cao",
    shortName: "Golang",
    tagline: "Biên dịch & chạy Go thật trên Cloud Compiler — ngôn ngữ backend triệu CCU.",
    category: "Backend",
    accentBg: "bg-cyan-50",
    accentText: "text-cyan-700",
    accentBorder: "border-cyan-200",
    runtimeLabel: "Real Go Compiler",
    lessons: [
      {
        id: "go-1",
        trackId: "golang",
        order: 1,
        title: "Bài 1: Hàm SumSlice với Slice & Vòng lặp range",
        difficulty: "Cơ bản",
        summary: "Viết hàm Go tính tổng các phần tử trong slice `[]int`.",
        theory: [
          "Trong Go, slice số nguyên viết là `[]int`.",
          "Duyệt slice bằng `for _, v := range nums { ... }` rất an toàn và gọn.",
          "Lưu ý: Không cần viết `func main()` — hệ thống sẽ tự nối bộ test vào `main()` để biên dịch Go thật!",
        ],
        taskPrompt:
          "Hoàn thiện hàm `SumSlice(nums []int) int` trả về tổng tất cả các số trong slice `nums`.",
        hint: "func SumSlice(nums []int) int {\n\ttotal := 0\n\tfor _, v := range nums {\n\t\ttotal += v\n\t}\n\treturn total\n}",
        starterCode: `func SumSlice(nums []int) int {\n\t// Tính tổng các phần tử trong slice nums\n\treturn 0\n}`,
        goTestImports: ["fmt"],
        tests: [
          {
            id: "t1",
            label: "SumSlice([]int{1, 2, 3, 4}) == 10",
            goCheck: `if got := SumSlice([]int{1, 2, 3, 4}); got == 10 { fmt.Println("PASS:t1") } else { fmt.Printf("FAIL:t1:Expected 10, got %d\\n", got) }`,
          },
          {
            id: "t2",
            label: "SumSlice([]int{-5, 10, 5}) == 10",
            goCheck: `if got := SumSlice([]int{-5, 10, 5}); got == 10 { fmt.Println("PASS:t2") } else { fmt.Printf("FAIL:t2:Expected 10, got %d\\n", got) }`,
          },
          {
            id: "t3",
            label: "SumSlice([]int{}) == 0",
            goCheck: `if got := SumSlice([]int{}); got == 0 { fmt.Println("PASS:t3") } else { fmt.Printf("FAIL:t3:Expected 0, got %d\\n", got) }`,
          },
        ],
      },
      {
        id: "go-2",
        trackId: "golang",
        order: 2,
        title: "Bài 2: Tìm Giá trị Lớn nhất & Multiple Return",
        difficulty: "Trung bình",
        summary: "Thực hành tính năng trả về 2 giá trị `(int, bool)` đặc sản của Golang.",
        theory: [
          "Hàm Go có thể trả về nhiều giá trị cùng lúc, ví dụ `(int, bool)` hoặc `(string, error)`.",
          "Kiểm tra `len(nums) == 0` trước khi truy cập `nums[0]` để tránh panic.",
        ],
        taskPrompt:
          "Viết hàm `MaxInt(nums []int) (int, bool)` trả về `(giá_trị_lớn_nhất, true)` nếu slice không rỗng, và `(0, false)` nếu slice rỗng.",
        hint: "func MaxInt(nums []int) (int, bool) {\n\tif len(nums) == 0 {\n\t\treturn 0, false\n\t}\n\tmaxVal := nums[0]\n\tfor _, v := range nums[1:] {\n\t\tif v > maxVal {\n\t\t\tmaxVal = v\n\t\t}\n\t}\n\treturn maxVal, true\n}",
        starterCode: `func MaxInt(nums []int) (int, bool) {\n\t// Trả về (max, true) hoặc (0, false) nếu rỗng\n\treturn 0, false\n}`,
        goTestImports: ["fmt"],
        tests: [
          {
            id: "t1",
            label: "MaxInt([]int{3, 9, 2, 7}) => (9, true)",
            goCheck: `if v, ok := MaxInt([]int{3, 9, 2, 7}); ok && v == 9 { fmt.Println("PASS:t1") } else { fmt.Printf("FAIL:t1:Expected (9,true), got (%d,%v)\\n", v, ok) }`,
          },
          {
            id: "t2",
            label: "MaxInt([]int{-10, -3, -20}) => (-3, true)",
            goCheck: `if v, ok := MaxInt([]int{-10, -3, -20}); ok && v == -3 { fmt.Println("PASS:t2") } else { fmt.Printf("FAIL:t2:Expected (-3,true), got (%d,%v)\\n", v, ok) }`,
          },
          {
            id: "t3",
            label: "MaxInt([]int{}) => (0, false)",
            goCheck: `if v, ok := MaxInt([]int{}); !ok && v == 0 { fmt.Println("PASS:t3") } else { fmt.Printf("FAIL:t3:Expected (0,false), got (%d,%v)\\n", v, ok) }`,
          },
        ],
      },
      {
        id: "go-3",
        trackId: "golang",
        order: 3,
        title: "Bài 3: Struct & Method trong Go",
        difficulty: "Thực chiến",
        summary: "Định nghĩa `type Rectangle struct` và gắn method `Area() int` tính diện tích.",
        theory: [
          "Go không có `class`, thay vào đó dùng `struct` kết hợp Receiver Method: `func (r Rectangle) Area() int`.",
        ],
        taskPrompt:
          "Định nghĩa `type Rectangle struct { Width int; Height int }` và method `func (r Rectangle) Area() int` trả về `Width * Height`.",
        hint: "type Rectangle struct {\n\tWidth  int\n\tHeight int\n}\n\nfunc (r Rectangle) Area() int {\n\treturn r.Width * r.Height\n}",
        starterCode: `type Rectangle struct {\n\tWidth  int\n\tHeight int\n}\n\nfunc (r Rectangle) Area() int {\n\t// Trả về diện tích hình chữ nhật\n\treturn 0\n}`,
        goTestImports: ["fmt"],
        tests: [
          {
            id: "t1",
            label: "Rectangle{Width: 5, Height: 4}.Area() == 20",
            goCheck: `if got := (Rectangle{Width: 5, Height: 4}).Area(); got == 20 { fmt.Println("PASS:t1") } else { fmt.Printf("FAIL:t1:Expected 20, got %d\\n", got) }`,
          },
          {
            id: "t2",
            label: "Rectangle{Width: 10, Height: 3}.Area() == 30",
            goCheck: `if got := (Rectangle{Width: 10, Height: 3}).Area(); got == 30 { fmt.Println("PASS:t2") } else { fmt.Printf("FAIL:t2:Expected 30, got %d\\n", got) }`,
          },
        ],
      },
    ],
  },

  // ================= 7. MONGODB =================
  {
    id: "mongodb",
    name: "MongoDB NoSQL",
    shortName: "MongoDB",
    tagline: "Truy vấn Document JSON, toán tử $gt/$in và Aggregation Pipeline ngay trên web.",
    category: "Database",
    accentBg: "bg-green-50",
    accentText: "text-green-700",
    accentBorder: "border-green-200",
    runtimeLabel: "MongoDB Query Engine",
    lessons: [
      {
        id: "mongo-1",
        trackId: "mongodb",
        order: 1,
        title: "Bài 1: Truy vấn find() với toán tử $gte",
        difficulty: "Cơ bản",
        summary: "Lọc các document học viên có điểm >= 8 trong collection `students`.",
        theory: [
          "`db.students.find({ score: { $gte: 8 } })` tìm tất cả bản ghi có `score >= 8`.",
          "Bạn có thể nối thêm `.sort({ score: -1 })` để sắp xếp giảm dần.",
        ],
        taskPrompt:
          "Viết câu lệnh MongoDB tìm tất cả học viên trong `db.students` có `score >= 8` và sắp xếp theo `score` giảm dần (`.sort({ score: -1 })`).",
        hint: "db.students.find({ score: { $gte: 8 } }).sort({ score: -1 })",
        starterCode: `// Tìm học viên có score >= 8, sắp xếp score giảm dần\ndb.students.find({})`,
        mongoCollections: {
          students: [
            { name: "An", grade: 12, score: 9.2 },
            { name: "Bình", grade: 11, score: 6.8 },
            { name: "Chi", grade: 12, score: 8.5 },
            { name: "Dũng", grade: 10, score: 7.4 },
          ],
        },
        tests: [
          { id: "t1", label: "Trả về đúng 2 học viên đạt score >= 8", expectedCount: 2 },
          { id: "t2", label: 'Người đứng đầu sau khi sort giảm dần là "An" (9.2)', checkFirstRow: { name: "An", score: 9.2 } },
        ],
      },
      {
        id: "mongo-2",
        trackId: "mongodb",
        order: 2,
        title: "Bài 2: Lọc Nhiều điều kiện với $in & $lt",
        difficulty: "Trung bình",
        summary: "Kết hợp toán tử `$in` và `$lt` để tìm khóa học phù hợp trong collection `courses`.",
        theory: [
          "`{ category: { $in: [\"Backend\", \"Database\"] } }` khớp giá trị nằm trong danh sách.",
          "Nhiều trường trong cùng object `{ a: ..., b: ... }` mặc định là phép AND.",
        ],
        taskPrompt:
          'Truy vấn `db.courses` tìm các khóa học thuộc nhóm `"Backend"` hoặc `"Database"` (dùng `$in`) VÀ có `hours < 20` (dùng `$lt`).',
        hint: 'db.courses.find({ category: { $in: ["Backend", "Database"] }, hours: { $lt: 20 } })',
        starterCode: `// Tìm khóa học thuộc Backend hoặc Database có hours < 20\ndb.courses.find({})`,
        mongoCollections: {
          courses: [
            { title: "HTML5", category: "Frontend", hours: 10 },
            { title: "Golang", category: "Backend", hours: 15 },
            { title: "Python AI", category: "Backend", hours: 30 },
            { title: "MongoDB", category: "Database", hours: 12 },
          ],
        },
        tests: [
          { id: "t1", label: "Trả về đúng 2 khóa học (Golang & MongoDB)", expectedCount: 2 },
          { id: "t2", label: "Kết quả đầu tiên là Golang", checkFirstRow: { title: "Golang" } },
        ],
      },
      {
        id: "mongo-3",
        trackId: "mongodb",
        order: 3,
        title: "Bài 3: Aggregation Pipeline ($match + $group)",
        difficulty: "Thực chiến",
        summary: "Thống kê tổng doanh thu theo từng danh mục bằng `aggregate()`.",
        theory: [
          "`$match` lọc document trước khi gom nhóm.",
          "`$group: { _id: \"$category\", total: { $sum: \"$amount\" } }` tính tổng theo nhóm.",
          "`$sort: { total: -1 }` sắp xếp nhóm lớn nhất lên đầu.",
        ],
        taskPrompt:
          'Viết `db.orders.aggregate([...])` gồm: (1) `$match` các đơn có `status: "paid"`, (2) `$group` theo `"$category"` tính `total: { $sum: "$amount" }`, (3) `$sort` theo `total: -1`.',
        hint: 'db.orders.aggregate([\n  { $match: { status: "paid" } },\n  { $group: { _id: "$category", total: { $sum: "$amount" } } },\n  { $sort: { total: -1 } }\n])',
        starterCode: `db.orders.aggregate([\n  // Thêm $match, $group và $sort tại đây\n])`,
        mongoCollections: {
          orders: [
            { category: "Backend", amount: 500, status: "paid" },
            { category: "Backend", amount: 300, status: "paid" },
            { category: "Frontend", amount: 400, status: "paid" },
            { category: "Frontend", amount: 900, status: "cancelled" },
          ],
        },
        tests: [
          { id: "t1", label: "Trả về 2 nhóm danh mục đã thanh toán", expectedCount: 2 },
          { id: "t2", label: 'Nhóm dẫn đầu là "Backend" với total = 800', checkFirstRow: { _id: "Backend", total: 800 } },
        ],
      },
    ],
  },

  // ================= 8. POSTGRESQL =================
  {
    id: "postgresql",
    name: "PostgreSQL Quan hệ",
    shortName: "PostgreSQL",
    tagline: "Thực hành truy vấn SQL chuẩn PostgreSQL: SELECT, WHERE, GROUP BY & INNER JOIN.",
    category: "Database",
    accentBg: "bg-indigo-50",
    accentText: "text-indigo-700",
    accentBorder: "border-indigo-200",
    runtimeLabel: "PostgreSQL Sandbox",
    lessons: [
      {
        id: "pg-1",
        trackId: "postgresql",
        order: 1,
        title: "Bài 1: SELECT, WHERE & ORDER BY",
        difficulty: "Cơ bản",
        summary: "Lọc danh sách học sinh lớp 12 có điểm >= 8 và sắp xếp điểm giảm dần.",
        theory: [
          "Thứ tự câu lệnh chuẩn SQL: `SELECT ... FROM ... WHERE ... ORDER BY ... DESC`.",
          "PostgreSQL hỗ trợ `ILIKE` tìm chuỗi không phân biệt hoa thường.",
        ],
        taskPrompt:
          "Viết câu truy vấn PostgreSQL lấy `name, score` từ bảng `students` với điều kiện `grade = 12 AND score >= 8`, sắp xếp theo `score DESC`.",
        hint: "SELECT name, score\nFROM students\nWHERE grade = 12 AND score >= 8\nORDER BY score DESC;",
        starterCode: `-- Lấy name, score của học sinh lớp 12 đạt điểm >= 8 (sắp xếp score giảm dần)\nSELECT * FROM students;`,
        sqlTables: {
          students: [
            { id: 1, name: "Minh Anh", grade: 12, score: 9.5 },
            { id: 2, name: "Hoàng Nam", grade: 12, score: 7.2 },
            { id: 3, name: "Thảo Vy", grade: 12, score: 8.8 },
            { id: 4, name: "Quốc Bảo", grade: 11, score: 9.0 },
          ],
        },
        tests: [
          { id: "t1", label: "Trả về đúng 2 học sinh lớp 12 đạt >= 8", expectedCount: 2 },
          { id: "t2", label: 'Hàng đầu tiên là "Minh Anh" (9.5 điểm)', checkFirstRow: { name: "Minh Anh", score: 9.5 } },
        ],
      },
      {
        id: "pg-2",
        trackId: "postgresql",
        order: 2,
        title: "Bài 2: Thống kê với GROUP BY & COUNT",
        difficulty: "Trung bình",
        summary: "Đếm số lượng bài học theo từng môn học và sắp xếp môn nhiều bài nhất lên đầu.",
        theory: [
          "`GROUP BY subject` gom các hàng cùng giá trị `subject` thành 1 nhóm.",
          "`COUNT(*) AS total` đếm số bản ghi trong mỗi nhóm và đặt bí danh `total`.",
        ],
        taskPrompt:
          "Viết câu SQL đếm số bài học mỗi môn từ bảng `lessons`: `SELECT subject, COUNT(*) AS total FROM lessons GROUP BY subject ORDER BY total DESC;`",
        hint: "SELECT subject, COUNT(*) AS total\nFROM lessons\nGROUP BY subject\nORDER BY total DESC;",
        starterCode: `-- Thống kê số lượng bài học theo từng môn (subject, total)\nSELECT subject FROM lessons;`,
        sqlTables: {
          lessons: [
            { id: 1, subject: "Toán", title: "Đạo hàm" },
            { id: 2, subject: "Toán", title: "Tích phân" },
            { id: 3, subject: "Toán", title: "Số phức" },
            { id: 4, subject: "Lý", title: "Dao động" },
            { id: 5, subject: "Hóa", title: "Este" },
            { id: 6, subject: "Hóa", title: "Amin" },
          ],
        },
        tests: [
          { id: "t1", label: "Trả về đúng 3 nhóm môn học", expectedCount: 3 },
          { id: "t2", label: 'Môn đứng đầu là "Toán" với total = 3', checkFirstRow: { subject: "Toán", total: 3 } },
        ],
      },
      {
        id: "pg-3",
        trackId: "postgresql",
        order: 3,
        title: "Bài 3: Kết nối hai bảng với INNER JOIN",
        difficulty: "Thực chiến",
        summary: "Ghép bảng `enrollments` với `users` để lấy tên học viên & khóa học đã đăng ký.",
        theory: [
          "`INNER JOIN users ON enrollments.user_id = users.id` ghép các bản ghi có khóa ngoại khớp nhau.",
          "Kết hợp `ORDER BY` để sắp xếp đầu ra nhất quán.",
        ],
        taskPrompt:
          "Viết truy vấn `INNER JOIN` bảng `enrollments` và `users` theo `enrollments.user_id = users.id`, lấy cột `users.full_name, enrollments.course_name` sắp xếp theo `enrollments.id ASC`.",
        hint: "SELECT users.full_name, enrollments.course_name\nFROM enrollments\nINNER JOIN users ON enrollments.user_id = users.id\nORDER BY enrollments.id ASC;",
        starterCode: `-- Ghép bảng enrollments với users lấy full_name và course_name\nSELECT * FROM enrollments;`,
        sqlTables: {
          users: [
            { id: 1, full_name: "Nguyễn An" },
            { id: 2, full_name: "Trần Bình" },
          ],
          enrollments: [
            { id: 101, user_id: 1, course_name: "PostgreSQL" },
            { id: 102, user_id: 2, course_name: "Golang" },
            { id: 103, user_id: 1, course_name: "Python" },
          ],
        },
        tests: [
          { id: "t1", label: "Trả về đủ 3 lượt đăng ký đã ghép tên học viên", expectedCount: 3 },
          {
            id: "t2",
            label: 'Hàng đầu tiên: full_name = "Nguyễn An", course_name = "PostgreSQL"',
            checkFirstRow: { full_name: "Nguyễn An", course_name: "PostgreSQL" },
          },
        ],
      },
    ],
  },
];

export function getTrackById(id: string): CodingTrack {
  return CODING_TRACKS.find((t) => t.id === id) || CODING_TRACKS[0];
}
