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
  jsCheck?: string;
  pyCheck?: string;
  goCheck?: string;
  domSelector?: string;
  domTextIncludes?: string;
  domMinCount?: number;
  cssMustContain?: string[];
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
  /**
   * Hệ thống Gợi mở Tư duy 3 Tầng (Socratic Thinking Ladder — KHÔNG đưa code giải để copy):
   * - [0] Tầng 1 (mở sau 1 lần chạy thử): Câu hỏi định hướng & phân tích đầu vào/đầu ra
   * - [1] Tầng 2 (mở sau 2 lần chạy thử): Dàn ý các bước giải bằng lời Việt (Pseudocode)
   * - [2] Tầng 3 (mở sau 3 lần chạy thử): Gợi ý tên thẻ/hàm/toán tử kèm chỗ khuyết ___ để tự gõ
   */
  thinkingHints: [string, string, string];
  starterCode: string;
  previewHtml?: string;
  requiredTsPatterns?: { regex: string; message: string }[];
  sqlTables?: Record<string, Record<string, unknown>[]>;
  mongoCollections?: Record<string, Record<string, unknown>[]>;
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
          "Thẻ <button> tạo nút bấm tương tác cho người dùng.",
        ],
        taskPrompt:
          'Hãy viết đoạn HTML chứa: (1) Một thẻ <h1> có nội dung chứa chữ "EduK12", (2) Một thẻ <p> mô tả ngắn gọn, và (3) Một thẻ <button> có chữ "Bắt đầu học".',
        thinkingHints: [
          "Nhìn vào code mẫu hiện tại: tiêu đề đang dùng thẻ gì? Đề bài yêu cầu cấp tiêu đề nào và còn thiếu phần tử tương tác nào ở cuối?",
          "Bước 1: Đổi cặp thẻ mở/đóng của tiêu đề thành thẻ tiêu đề cấp 1 và viết nội dung có nhắc đến tên nền tảng.\nBước 2: Giữ lại hoặc sửa đoạn mô tả trong thẻ đoạn văn.\nBước 3: Thêm một thẻ nút bấm ở dưới cùng với nhãn chữ đúng yêu cầu.",
          "Cấu trúc cần tự điền vào chỗ trống:\n<___>Chào mừng đến ___</___>\n<p>...</p>\n<___>___</___>",
        ],
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
        thinkingHints: [
          "Hiện trong thẻ danh sách mới chỉ có 1 mục duy nhất. Bạn cần bổ sung tối thiểu bao nhiêu mục con nữa để đủ 3 mục?",
          "Bước 1: Tìm vị trí bên trong cặp thẻ <ul> ... </ul>.\nBước 2: Thêm các dòng mục danh sách mới — mỗi môn học nằm trong một cặp thẻ mục con riêng.\nBước 3: Đảm bảo viết đúng chính tả 2 ngôn ngữ bắt buộc.",
          "Khung cấu trúc tự điền:\n<ul>\n  <li>HTML</li>\n  <___>___</___>\n  <___>___</___>\n</ul>",
        ],
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
        thinkingHints: [
          "Vì sao ô nhập liệu hiện tại dùng type=\"text\" chưa tối ưu cho email? Và khi người dùng bấm Enter, thẻ nào giúp nhóm ô nhập và nút gửi thành một biểu mẫu hoàn chỉnh?",
          "Bước 1: Bọc toàn bộ các trường nhập liệu bằng thẻ biểu mẫu.\nBước 2: Đổi thuộc tính `type` của thẻ `<input>` sang kiểu chuyên biệt cho email và thêm thuộc tính bắt buộc nhập.\nBước 3: Thêm nút gửi biểu mẫu có thuộc tính `type` là submit.",
          "Khung gợi ý (tự điền chỗ trống):\n<___>\n  <label>Email</label>\n  <input type=\"___\" required />\n  <button type=\"___\">___</button>\n</___>",
        ],
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
        thinkingHints: [
          "Nhìn vào khung Xem trước: chữ đang dính sát mép và chưa có màu nền phân tách. Thuộc tính nào điều khiển khoảng cách từ viền vào chữ bên trong?",
          "Bước 1: Chọn một mã màu nền nổi bật cho `.card` (và đổi màu chữ tương phản nếu dùng nền tối).\nBước 2: Thêm khoảng đệm bên trong (từ 16px đến 24px).\nBước 3: Bo tròn 4 góc thẻ bằng giá trị px.",
          "Các cặp thuộc tính: giá trị cần tự điền vào bên trong `.card { ... }`:\n  background: ___;\n  padding: ___px;\n  border-radius: ___px;",
        ],
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
        thinkingHints: [
          "Hiện tại logo và nhóm menu đang xếp chồng lên nhau theo chiều dọc vì khối `div` mặc định là block. Làm thế nào chuyển `.navbar` sang chế độ sắp xếp linh hoạt theo trục ngang?",
          "Bước 1: Kích hoạt chế độ Flexbox cho `.navbar`.\nBước 2: Dùng thuộc tính căn trục chính để đẩy logo sang trái và menu sang phải.\nBước 3: Căn giữa các mục theo trục dọc và thêm khoảng hở an toàn bằng `gap`.",
          "Điền các giá trị phù hợp vào bên trong `.navbar { ... }`:\n  display: ___;\n  justify-content: ___;\n  align-items: ___;\n  gap: ___px;",
        ],
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
        thinkingHints: [
          "Để 3 thẻ HTML, CSS, JS nằm thành 3 cột bằng nhau trên cùng một hàng bằng CSS Grid, bạn cần khai báo chế độ hiển thị gì và định nghĩa cột bằng thuộc tính nào?",
          "Bước 1: Đặt `.grid` sang chế độ lưới 2 chiều.\nBước 2: Chia 3 cột có độ rộng bằng nhau (gợi ý đơn vị tỷ lệ `fr` hoặc hàm `repeat`).\nBước 3: Thêm khoảng cách giữa các ô bằng `gap`.",
          "Điền phần còn thiếu trong `.grid { ... }`:\n  display: ___;\n  grid-template-columns: repeat(___, ___);\n  gap: ___px;",
        ],
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
        thinkingHints: [
          "Làm sao kiểm tra một số `n` (kể cả số âm như `-2`) có phải là số chẵn hay không? Và cần biến cộng dồn bắt đầu từ giá trị mấy?",
          "Bước 1: Khởi tạo biến lưu tổng bằng `0`.\nBước 2: Duyệt từng phần tử `n` trong mảng `arr`.\nBước 3: Kiểm tra nếu `n` chia hết cho `2` thì cộng `n` vào biến tổng.\nBước 4: Sau vòng lặp, trả về biến tổng.",
          "Khung tư duy (tự hoàn thiện điều kiện & phép cộng):\nlet sum = 0;\nfor (const n of arr) {\n  if (n % ___ === ___) sum += ___;\n}\nreturn ___;",
        ],
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
        thinkingHints: [
          "Đề bài gồm 2 công đoạn tách biệt: (1) loại bỏ học sinh điểm dưới 8, và (2) chỉ giữ lại thuộc tính tên thay vì cả object. Hai phương thức mảng nào của ES6 sinh ra cho 2 việc này?",
          "Bước 1: Dùng `.filter(...)` giữ lại các phần tử `s` có `s.score >= 8`.\nBước 2: Nối tiếp `.map(...)` để chuyển mỗi object `s` thành chuỗi `s.name`.\nBước 3: Trả về mảng kết quả.",
          "Khung tư duy:\nreturn students\n  .filter((s) => s.___ >= ___)\n  .map((s) => s.___);",
        ],
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
        thinkingHints: [
          "Khi đang đứng ở phần tử `nums[i]`, bạn đang cần tìm số nào khác xuất hiện trước đó để cộng lại vừa đúng `target`? (Chú ý trường hợp 2 số bằng nhau như `[3, 3]` với `target = 6` — không được dùng lại cùng 1 chỉ số!)",
          "Bước 1: Tạo bảng băm `seen = new Map()` lưu cặp `(giá trị -> vị trí)` của các phần tử đã đi qua.\nBước 2: Duyệt `i` từ `0` đến hết mảng, tính phần bù `need = target - nums[i]`.\nBước 3: Nếu `seen` đã chứa `need`, trả về ngay `[seen.get(need), i]`. Nếu chưa, lưu `nums[i] -> i` vào `seen`.",
          "Khung tư duy:\nconst seen = new Map();\nfor (let i = 0; i < nums.length; i++) {\n  const need = ___ - nums[i];\n  if (seen.has(___)) return [seen.get(___), i];\n  seen.set(nums[i], ___);\n}",
        ],
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
        thinkingHints: [
          "Nếu món hàng giá `price` được giảm `percent` phần trăm, số tiền được trừ đi bằng bao nhiêu phần của `price`?",
          "Bước 1: Giữ nguyên chữ ký kiểu TypeScript `: number` của hàm.\nBước 2: Tính số tiền được giảm = `price * percent / 100`.\nBước 3: Trả về giá gốc trừ đi số tiền được giảm.",
          "Công thức tự điền:\nreturn price - (price * ___) / ___;",
        ],
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
        thinkingHints: [
          "Mỗi phần tử trong `items` có 3 trường `name`, `price`, `qty`. Thành tiền của 1 sản phẩm phụ thuộc vào 2 trường nào?",
          "Bước 1: Duyệt qua từng sản phẩm `item` trong mảng `items` (bằng vòng lặp hoặc `.reduce`).\nBước 2: Tính thành tiền từng món = `item.price * item.qty` và cộng dồn vào biến tổng.\nBước 3: Trả về tổng cuối cùng (giỏ rỗng tự động trả về 0).",
          "Khung tư duy:\nreturn items.reduce((sum, item) => sum + item.___ * item.___, 0);",
        ],
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
        thinkingHints: [
          "Điều kiện nào giúp nhận biết một mảng đang không rỗng? Phần tử đầu tiên nằm ở chỉ số mấy?",
          "Bước 1: Kiểm tra độ dài `arr.length`.\nBước 2: Nếu độ dài lớn hơn `0`, trả về phần tử ở vị trí đầu tiên.\nBước 3: Ngược lại, trả về `null`.",
          "Khung tư duy:\nreturn arr.length > ___ ? arr[___] : ___;",
        ],
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
        title: "Bài 1: Hàm Tính Giai thừa n!",
        difficulty: "Cơ bản",
        summary: "Viết hàm Python `factorial(n)` tính $n!$ bằng vòng lặp hoặc đệ quy.",
        theory: [
          "Hàm trong Python khai báo bằng từ khóa `def ten_ham(tham_so):`.",
          "Quy ước toán học: $0! = 1$, $n! = 1 \\times 2 \\times ... \\times n$.",
        ],
        taskPrompt:
          "Viết hàm `factorial(n)` trả về giai thừa của số nguyên không âm `n`. Ví dụ: `factorial(5) == 120`, `factorial(0) == 1`.",
        thinkingHints: [
          "Với phép nhân tích lũy, biến kết quả ban đầu phải khởi tạo bằng `0` hay bằng `1`? Tại sao khởi tạo bằng `1` lại xử lý đẹp luôn trường hợp `n = 0`?",
          "Bước 1: Đặt biến `res = 1`.\nBước 2: Chạy vòng lặp `i` từ `2` đến `n` (lưu ý trong Python `range(2, n + 1)` mới bao gồm cả `n`).\nBước 3: Nhân dồn `res` với `i` rồi trả về `res`.",
          "Khung tư duy Python:\nres = ___\nfor i in range(2, ___):\n    res *= ___\nreturn res",
        ],
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
          "List Comprehension: `[biểu_thức for x in danh_sách if điều_kiện]`.",
          "Giúp xử lý dữ liệu nhanh, gọn và rất dễ đọc trong Khoa học dữ liệu & AI.",
        ],
        taskPrompt:
          "Viết hàm `square_positives(nums)` nhận vào danh sách số và trả về danh sách **bình phương các số dương (> 0)**.",
        thinkingHints: [
          "Số `0` có phải là số dương không? Khi một số `x` thỏa mãn lớn hơn `0`, biểu thức bình phương của `x` viết thế nào trong Python?",
          "Bước 1: Duyệt từng số `x` trong `nums`.\nBước 2: Lọc điều kiện `x > 0`.\nBước 3: Tính `x * x` (hoặc `x ** 2`) và đưa vào danh sách kết quả.",
          "Khung List Comprehension:\nreturn [___ for x in nums if ___]",
        ],
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
        thinkingHints: [
          'Tại sao `"Go"` và `"go"` phải được đếm chung vào một khóa `"go"`? Cần gọi hàm chuỗi nào trước khi tách từ?',
          "Bước 1: Tạo dict rỗng `counts = {}`.\nBước 2: Chuyển `text` sang chữ thường rồi tách theo khoảng trắng thành từng từ `w`.\nBước 3: Với mỗi từ `w`, tăng giá trị đếm của khóa `w` trong `counts` lên 1 (mặc định 0 nếu chưa có).",
          "Khung tư duy Python:\ncounts = {}\nfor w in text.___().___():\n    counts[w] = counts.get(w, ___) + 1\nreturn counts",
        ],
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
        thinkingHints: [
          "Trong Go, nếu viết `for i, v := range nums` mà không dùng biến `i`, trình biên dịch sẽ báo lỗi. Ký tự đặc biệt nào dùng để bỏ qua chỉ số `i`?",
          "Bước 1: Khai báo biến tổng `total := 0`.\nBước 2: Dùng `for _, v := range nums` để lấy từng phần tử `v`.\nBước 3: Cộng dồn `v` vào `total` rồi `return total`.",
          "Khung tư duy Golang:\ntotal := 0\nfor ___, v := range ___ {\n\ttotal += ___\n}\nreturn ___",
        ],
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
        thinkingHints: [
          "Nếu gán `maxVal := 0` rồi gặp slice toàn số âm `[-10, -3, -20]`, kết quả sẽ bị sai thành `0`! Vậy nên khởi tạo `maxVal` bằng giá trị nào sau khi đã kiểm tra slice không rỗng?",
          "Bước 1: Kiểm tra `if len(nums) == 0` thì trả về ngay `0, false`.\nBước 2: Đặt `maxVal := nums[0]`.\nBước 3: Duyệt các phần tử còn lại; nếu thấy phần tử lớn hơn `maxVal` thì cập nhật `maxVal`.\nBước 4: Cuối hàm trả về `maxVal, true`.",
          "Khung tư duy Golang:\nif len(nums) == 0 {\n\treturn 0, false\n}\nmaxVal := nums[___]\nfor _, v := range nums[1:] {\n\tif v > ___ { maxVal = ___ }\n}\nreturn maxVal, ___",
        ],
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
        thinkingHints: [
          "Bên trong method `func (r Rectangle) Area() int`, ta dùng biến receiver `r` như thế nào để đọc 2 trường `Width` và `Height` của struct?",
          "Bước 1: Truy cập chiều rộng qua `r.Width` và chiều cao qua `r.Height`.\nBước 2: Nhân hai giá trị lại và `return` kết quả.",
          "Khung tư duy:\nreturn r.___ * r.___",
        ],
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
        thinkingHints: [
          "Trong MongoDB, toán tử nào biểu diễn 'lớn hơn hoặc bằng' (`>=`), và trong `.sort()`, số `1` hay `-1` dùng để xếp giảm dần?",
          "Bước 1: Bên trong `db.students.find({ ... })`, đặt điều kiện cho trường `score` dùng toán tử `$gte`.\nBước 2: Nối thêm `.sort({ ... })` ở cuối để đưa người điểm cao nhất lên đầu.",
          "Khung tư duy MongoDB:\ndb.students.find({ ___: { $___: 8 } }).sort({ ___: -1 })",
        ],
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
        thinkingHints: [
          "Cần kiểm tra đồng thời 2 trường là `category` và `hours`. Toán tử `$in` nhận kiểu dữ liệu gì (chuỗi hay mảng)?",
          "Bước 1: Đặt điều kiện `category` nằm trong mảng gồm 2 chuỗi yêu cầu bằng `$in`.\nBước 2: Thêm dấu phẩy rồi đặt điều kiện `hours` nhỏ hơn 20 bằng `$lt` ngay trong cùng object filter.",
          "Khung tư duy MongoDB:\ndb.courses.find({ category: { $___: [\"___\", \"___\"] }, hours: { $___: ___ } })",
        ],
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
        thinkingHints: [
          "Tại sao giai đoạn `$match` nên đặt TRƯỚC `$group`? Nếu không lọc `status: \"paid\"` trước, đơn hàng đã hủy (`cancelled`) sẽ làm sai kết quả tổng!",
          "Bước 1: Chặng 1 dùng `{ $match: { status: \"paid\" } }` loại đơn hủy.\nBước 2: Chặng 2 dùng `$group` với `_id` trỏ tới trường danh mục (`\"$category\"`) và cộng dồn trường `\"$amount\"`.\nBước 3: Chặng 3 dùng `$sort` giảm dần theo `total`.",
          "Khung Pipeline 3 chặng:\ndb.orders.aggregate([\n  { $match: { ___: \"___\" } },\n  { $group: { _id: \"$___\", total: { $sum: \"$___\" } } },\n  { $sort: { ___: -1 } }\n])",
        ],
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
          "Dùng `AND` để kết hợp nhiều điều kiện trong mệnh đề `WHERE`.",
        ],
        taskPrompt:
          "Viết câu truy vấn PostgreSQL lấy `name, score` từ bảng `students` với điều kiện `grade = 12 AND score >= 8`, sắp xếp theo `score DESC`.",
        thinkingHints: [
          "Nhìn vào bảng mẫu `students`: có 4 học sinh, trong đó Quốc Bảo được 9.0 nhưng học lớp 11. Bạn cần kết hợp 2 điều kiện trong `WHERE` bằng từ khóa nào?",
          "Bước 1: Chỉ chọn đúng 2 cột `name, score` sau từ khóa `SELECT`.\nBước 2: Thêm mệnh đề `WHERE` lọc khối 12 VÀ điểm từ 8 trở lên.\nBước 3: Thêm `ORDER BY` theo cột điểm giảm dần (`DESC`).",
          "Khung SQL tự hoàn thiện:\nSELECT ___, ___\nFROM students\nWHERE ___ = 12 AND ___ >= 8\nORDER BY ___ DESC;",
        ],
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
          "Viết câu SQL đếm số bài học mỗi môn từ bảng `lessons` lấy cột `subject` và `COUNT(*) AS total`, gom nhóm theo `subject` và sắp xếp theo `total DESC`.",
        thinkingHints: [
          "Khi dùng hàm tổng hợp `COUNT(*)` cùng với cột `subject`, mệnh đề bắt buộc phải có để SQL biết gom nhóm theo cột nào là gì?",
          "Bước 1: `SELECT` cột `subject` và hàm đếm đặt bí danh là `total`.\nBước 2: Thêm `GROUP BY` theo cột tên môn.\nBước 3: Dùng `ORDER BY` xếp giảm dần theo `total`.",
          "Khung SQL tự điền:\nSELECT subject, COUNT(*) AS ___\nFROM lessons\nGROUP BY ___\nORDER BY ___ DESC;",
        ],
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
        thinkingHints: [
          "Nhìn 2 bảng mẫu: cột nào trong `enrollments` đóng vai trò khóa ngoại liên kết với cột `id` của bảng `users`?",
          "Bước 1: `SELECT` hai cột cần lấy từ 2 bảng.\nBước 2: Từ bảng `enrollments`, nối `INNER JOIN users` với điều kiện `ON` khớp khóa ngoại.\nBước 3: Sắp xếp tăng dần (`ASC`) theo `enrollments.id`.",
          "Khung SQL tự điền:\nSELECT users.___, enrollments.___\nFROM enrollments\nINNER JOIN users ON enrollments.___ = users.___\nORDER BY enrollments.id ASC;",
        ],
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
