"""
Sinh bộ dữ liệu Khung Chương trình GDPT 2018 chuẩn Bộ GD&ĐT (Thông tư 32/2018/TT-BGDĐT)
đầy đủ 12 khối lớp (Lớp 1 -> Lớp 12) & tất cả các môn học chính.
Xuất ra: database/seeds/gdpt2018-full-k12.json
"""

import json
import os
import re
import unicodedata

SUBJECT_NAMES = {
    "toan": "Toán học",
    "ngu-van": "Ngữ văn",
    "tieng-anh": "Tiếng Anh",
    "khtn": "Khoa học tự nhiên",
    "vat-ly": "Vật lý",
    "hoa-hoc": "Hóa học",
    "sinh-hoc": "Sinh học",
    "lich-su": "Lịch sử",
    "dia-ly": "Địa lý",
    "tin-hoc": "Tin học",
}


def slugify(text: str) -> str:
    s = unicodedata.normalize("NFD", text.lower())
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    s = s.replace("đ", "d")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:40] or "bai"


# Cấu trúc: (grade_id, subject_code, chapter, [(title, summary, core_formula_or_concept, example), ...])
CURRICULUM_SPEC = [
    # ===================== LỚP 1 (TIỂU HỌC) =====================
    (1, "toan", "Chương 1: Các số đến 10", [
        ("Các số từ 0 đến 10 & So sánh lớn hơn, bé hơn", "Đếm, đọc, viết và so sánh các số trong phạm vi 10.",
         "Thứ tự tăng dần: $$0 < 1 < 2 < 3 < 4 < 5 < 6 < 7 < 8 < 9 < 10$$",
         "Đầu nhọn dấu `<` hoặc `>` luôn chỉ về phía số bé hơn: $3 < 8$, $9 > 4$."),
        ("Mấy và mấy — Tách gộp số trong phạm vi 10", "Phân tích cấu tạo số từ 2 đến 10 làm nền tảng phép cộng trừ.",
         "Ví dụ cấu tạo số $10$: $10 = 1+9 = 2+8 = 3+7 = 4+6 = 5+5$.",
         "$7$ gồm $3$ và $4$; gộp $5$ và $2$ được $7$."),
    ]),
    (1, "toan", "Chương 2: Phép cộng, phép trừ trong phạm vi 10", [
        ("Phép cộng trong phạm vi 10", "Hiểu ý nghĩa gộp nhóm và thuộc bảng cộng đến 10.",
         "Tính chất giao hoán: $a + b = b + a$. Ví dụ: $3 + 5 = 5 + 3 = 8$.",
         "Có $4$ bông hoa đỏ và $5$ bông hoa vàng. Tổng số hoa là $4 + 5 = 9$ bông."),
        ("Phép trừ trong phạm vi 10", "Hiểu ý nghĩa bớt đi và mối liên hệ với phép cộng.",
         "Nếu $a + b = c$ thì $c - a = b$ và $c - b = a$.",
         "Có $9$ quả bóng, cho bạn $3$ quả. Còn lại $9 - 3 = 6$ quả."),
    ]),
    (1, "toan", "Chương 3: Hình học phẳng & Hình khối cơ bản", [
        ("Hình vuông, hình tròn, hình tam giác, hình chữ nhật", "Nhận dạng 4 hình phẳng quen thuộc qua đồ vật xung quanh.",
         "- Hình vuông có $4$ cạnh bằng nhau.\n- Hình tam giác có $3$ cạnh.\n- Hình tròn không có góc nhọn.",
         "Mặt đồng hồ có dạng hình tròn; quyển sách có dạng hình chữ nhật."),
        ("Khối lập phương và khối hộp chữ nhật", "Phân biệt hai hình khối 3D cơ bản qua thực hành xếp hình.",
         "Khối lập phương có $6$ mặt đều là hình vuông bằng nhau (như viên xúc xắc).",
         "Hộp sữa, hộp bút thường có dạng khối hộp chữ nhật."),
    ]),
    (1, "toan", "Chương 4: Các số đến 100 & Đo độ dài, thời gian", [
        ("Số có hai chữ số — Hàng chục và hàng đơn vị", "Đọc, viết, phân tích số từ $11$ đến $99$.",
         "Số $47$ gồm $4$ chục và $7$ đơn vị: $$47 = 40 + 7$$",
         "Số tròn chục nhỏ nhất có hai chữ số là $10$, lớn nhất là $90$."),
        ("Phép cộng, trừ không nhớ trong phạm vi 100", "Đặt tính thẳng cột hàng đơn vị, hàng chục.",
         "Cộng (hoặc trừ) hàng đơn vị trước, sau đó đến hàng chục.",
         "$34 + 25 = 59$; $78 - 32 = 46$."),
        ("Đơn vị đo xăng-ti-mét (cm) & Xem đồng hồ giờ đúng", "Biết đo bằng thước kẻ có vạch cm và đọc giờ đúng.",
         "$1\\text{ cm}$ là khoảng cách giữa hai vạch số liên tiếp trên thước học sinh.",
         "Kim ngắn chỉ số $7$, kim dài chỉ số $12$ là đúng $7$ giờ."),
    ]),
    (1, "ngu-van", "Chủ đề 1: Bảng chữ cái, Thanh điệu & Ghép vần", [
        ("29 Chữ cái tiếng Việt và 6 Thanh điệu", "Nhận diện chuẩn nguyên âm, phụ âm và 6 thanh điệu.",
         "6 thanh điệu: **Ngang** (`ba`), **Huyền** (`bà`), **Sắc** (`bá`), **Hỏi** (`bả`), **Ngã** (`bã`), **Nặng** (`bạ`).",
         "Chú ý quy tắc chính tả: `c` đi với `a, o, ô, ơ, u, ư`; `k` đi với `e, ê, i`."),
        ("Quy tắc chính tả g/gh, ng/ngh & Luyện đọc câu", "Viết đúng chính tả các phụ âm ghép thông dụng lớp 1.",
         "- `gh, ngh` chỉ đứng trước `e, ê, i`.\n- `g, ng` đứng trước các nguyên âm còn lại.",
         "Đúng: *con ghẹ, ghi nhớ, suy nghĩ, con gà, ngôi nhà*."),
    ]),

    # ===================== LỚP 2 (TIỂU HỌC) =====================
    (2, "toan", "Chương 1: Phép cộng, phép trừ có nhớ trong phạm vi 100", [
        ("Phép cộng qua 10 trong phạm vi 20", "Tách số để gộp cho đủ chục rồi cộng tiếp.",
         "Ví dụ: $8 + 5 = 8 + 2 + 3 = 10 + 3 = 13$.",
         "Mẹo nhanh: $9 + 6 = 15$, $7 + 8 = 15$."),
        ("Phép cộng, trừ có nhớ trong phạm vi 100", "Đặt tính dọc có nhớ $1$ sang hàng chục hoặc mượn $1$ chục.",
         "$$28 + 37 = 65, \\qquad 62 - 27 = 35$$",
         "Lưu ý nhớ cộng thêm $1$ vào hàng chục khi tổng hàng đơn vị $\\ge 10$."),
    ]),
    (2, "toan", "Chương 2: Phép nhân, Phép chia & Bảng 2, 5", [
        ("Ý nghĩa phép nhân & Bảng nhân 2, Bảng nhân 5", "Chuyển tổng các số hạng bằng nhau thành phép nhân.",
         "$$a + a + \\dots + a \\text{ (n lần)} = a \\times n$$",
         "$5 + 5 + 5 + 5 = 5 \\times 4 = 20$."),
        ("Phép chia & Bảng chia 2, Bảng chia 5", "Hiểu phép chia là phép tính ngược của phép nhân.",
         "Từ $2 \\times 6 = 12$ suy ra $12 : 2 = 6$ và $12 : 6 = 2$.",
         "Chia đều $15$ cái kẹo cho $5$ bạn, mỗi bạn được $15 : 5 = 3$ cái."),
    ]),
    (2, "toan", "Chương 3: Các số trong phạm vi 1000 & Đo lường", [
        ("Các số đến 1000 — Hàng trăm, chục, đơn vị", "Đọc, viết, so sánh số có ba chữ số.",
         "$$345 = 300 + 40 + 5$$",
         "So sánh từ trái sang phải: hàng trăm trước, rồi đến hàng chục, hàng đơn vị."),
        ("Đơn vị đo ki-lô-gam (kg), lít (l), mét (m), ki-lô-mét (km)", "Đổi đơn vị đo thông dụng trong đời sống.",
         "$$1\\text{ m} = 10\\text{ dm} = 100\\text{ cm}, \\qquad 1\\text{ km} = 1000\\text{ m}$$",
         "Một sợi dây dài $2\\text{ m}$ bằng $200\\text{ cm}$."),
    ]),
    (2, "ngu-van", "Chủ đề 1: Từ loại & Tập làm văn tả ngắn", [
        ("Từ chỉ sự vật, hoạt động, đặc điểm & Câu kể", "Phân biệt 3 nhóm từ cơ bản và viết câu hoàn chỉnh.",
         "- **Sự vật:** *bàn, ghế, học sinh*\n- **Hoạt động:** *chạy, đọc, viết*\n- **Đặc điểm:** *cao, xanh, chăm chỉ*.",
         "Đặt câu kiểu *Ai làm gì?*: *Bạn Lan đang đọc sách ở thư viện.*"),
        ("Viết đoạn văn ngắn 4–5 câu kể về người thân hoặc đồ vật", "Biết sắp xếp ý mạch lạc, viết hoa đầu câu và chấm cuối câu.",
         "Bố cục 3 phần mini: Giới thiệu → Kể đặc điểm/hoạt động nổi bật → Tình cảm của em.",
         "Sử dụng các từ nối tự nhiên như *Hằng ngày, Ngoài ra, Em rất yêu quý...*"),
    ]),

    # ===================== LỚP 3 (TIỂU HỌC) =====================
    (3, "toan", "Chương 1: Bảng nhân chia 3, 4, 6, 7, 8, 9 & Biểu thức số", [
        ("Hoàn thiện Bảng nhân chia & Phép chia có dư", "Thực hiện phép chia có dư với số dư luôn nhỏ hơn số chia.",
         "Trong phép chia có dư: $$\\text{Số bị chia} = \\text{Thương} \\times \\text{Số chia} + \\text{Số dư} \\quad (0 < \\text{dư} < \\text{số chia})$$",
         "$29 : 4 = 7$ (dư $1$) vì $7 \\times 4 + 1 = 29$."),
        ("Tính giá trị biểu thức số (Thứ tự ưu tiên phép tính)", "Nắm chắc 3 quy tắc vàng tính giá trị biểu thức.",
         "1. Trong ngoặc `(...)` trước.\n2. Nhân, chia trước; cộng, trừ sau.\n3. Cùng mức ưu tiên thì từ trái sang phải.",
         "$(18 + 12) : 5 \\times 3 = 30 : 5 \\times 3 = 18$."),
    ]),
    (3, "toan", "Chương 2: Hình học — Chu vi & Diện tích Hình chữ nhật, Hình vuông", [
        ("Chu vi & Diện tích Hình chữ nhật, Hình vuông", "Phân biệt rõ chu vi (độ dài viền) và diện tích (bề mặt).",
         "- Hình chữ nhật: $P = (a + b) \\times 2$, $\\quad S = a \\times b$\n- Hình vuông: $P = a \\times 4$, $\\quad S = a \\times a$.",
         "Hình chữ nhật dài $8\\text{ cm}$, rộng $5\\text{ cm}$ có $P = 26\\text{ cm}$, $S = 40\\text{ cm}^2$."),
        ("Các số đến 100.000 & Chữ số La Mã", "Đọc viết số đến trăm nghìn và đọc số La Mã I đến XX.",
         "Ký hiệu La Mã cơ bản: $\\text{I}=1, \\text{V}=5, \\text{X}=10$. Ví dụ: $\\text{IV}=4, \\text{IX}=9, \\text{XIV}=14$.",
         "Thế kỷ $\\text{XXI}$ là thế kỷ thứ $21$."),
    ]),
    (3, "ngu-van", "Chủ đề 1: Biện pháp So sánh & Viết đoạn văn", [
        ("Biện pháp tu từ So sánh", "Nhận biết 2 sự vật được so sánh và từ so sánh (`như, là, tựa, giống`).",
         "Cấu trúc: **Sự vật A** + *từ so sánh* + **Sự vật B** giúp câu văn giàu hình ảnh.",
         "*Mặt trăng tròn vành vạnh **như** chiếc đĩa bạc khổng lồ.*"),
    ]),
    (3, "tieng-anh", "Unit 1–5: Giao tiếp cơ bản & Gia đình, Trường học", [
        ("Greeting, Family & School Things (Chào hỏi, Gia đình & Đồ dùng học tập)", "Làm quen giao tiếp tiếng Anh bắt buộc từ lớp 3 theo GDPT 2018.",
         "- *What's your name?* / *How old are you?*\n- *This is my pen / ruler / notebook.*\n- *Who's that? — That's my mother.*",
         "Luyện phát âm chuẩn đuôi số nhiều `-s`: *books, pens, pencils*."),
    ]),
    (3, "tin-hoc", "Chủ đề 1: Máy tính và Em (Bắt buộc từ Lớp 3)", [
        ("Các bộ phận cơ bản của máy tính & Gõ bàn phím 10 ngón", "Phân biệt màn hình, thân máy, bàn phím, chuột và tư thế ngồi đúng.",
         "4 thành phần chính: **Màn hình** (hiển thị), **Thân máy** (xử lý CPU), **Bàn phím & Chuột** (nhập dữ liệu).",
         "Hàng phím cơ sở gồm: `A S D F` (tay trái) và `J K L ;` (tay phải) với 2 phím có gai `F` và `J`."),
    ]),

    # ===================== LỚP 4 (TIỂU HỌC) =====================
    (4, "toan", "Chương 1: Số tự nhiên lớp triệu & Bài toán điển hình", [
        ("Tìm số trung bình cộng & Bài toán Tổng – Hiệu", "Hai dạng toán có lời văn cốt lõi lớp 4.",
         "- Trung bình cộng của $n$ số: $\\text{TBC} = \\dfrac{\\text{Tổng các số}}{n}$\n- Tổng – Hiệu: $\\text{Số lớn} = \\dfrac{\\text{Tổng} + \\text{Hiệu}}{2}$, $\\text{Số bé} = \\dfrac{\\text{Tổng} - \\text{Hiệu}}{2}$.",
         "Tổng hai số là $50$, hiệu là $14 \\Rightarrow$ Số lớn $= 32$, Số bé $= 18$."),
    ]),
    (4, "toan", "Chương 2: Phân số & Các phép tính với phân số", [
        ("Khái niệm, Rút gọn & Quy đồng mẫu số phân số", "Hiểu bản chất phân số và áp dụng tính chất cơ bản.",
         "$$\\frac{a}{b} = \\frac{a \\times m}{b \\times m} = \\frac{a : n}{b : n} \\quad (m, n \\neq 0)$$",
         "Rút gọn $\\dfrac{12}{18} = \\dfrac{12 : 6}{18 : 6} = \\dfrac{2}{3}$."),
        ("Cộng, trừ, nhân, chia phân số", "Thành thạo 4 phép tính trên phân số.",
         "- Cộng/trừ: Quy đồng mẫu rồi cộng/trừ tử.\n- Nhân: $\\dfrac{a}{b} \\times \\dfrac{c}{d} = \\dfrac{a \\times c}{b \\times d}$\n- Chia: Nhân với phân số đảo ngược $\\dfrac{a}{b} : \\dfrac{c}{d} = \\dfrac{a}{b} \\times \\dfrac{d}{c}$.",
         "$\\dfrac{2}{3} : \\dfrac{4}{5} = \\dfrac{2}{3} \\times \\dfrac{5}{4} = \\dfrac{10}{12} = \\dfrac{5}{6}$."),
    ]),
    (4, "toan", "Chương 3: Hình bình hành, Hình thoi & Yếu tố Thống kê", [
        ("Hình bình hành, Hình thoi & Biểu đồ cột", "Nhận biết tính chất cặp cạnh song song và đọc số liệu biểu đồ cột.",
         "- Hình bình hành: 2 cặp cạnh đối song song và bằng nhau.\n- Hình thoi: 4 cạnh bằng nhau, 2 đường chéo vuông góc nhau.",
         "Biểu đồ cột giúp so sánh nhanh số lượng giữa các nhóm đối tượng."),
    ]),
    (4, "ngu-van", "Chủ đề 1: Danh từ, Động từ, Tính từ & Biện pháp Nhân hóa", [
        ("Phân biệt Danh từ, Động từ, Tính từ & Nhân hóa", "Mở rộng vốn từ và sử dụng nhân hóa trong văn miêu tả.",
         "**Nhân hóa** là gọi hoặc tả con vật, cây cối, đồ vật bằng từ ngữ vốn dùng cho con người.",
         "*Ông mặt trời thức dậy, mỉm cười tỏa nắng xuống cánh đồng.*"),
    ]),
    (4, "khtn", "Chủ đề 1: Chất, Năng lượng & Thực vật, Động vật (Khoa học 4)", [
        ("Vòng tuần hoàn của nước, Ánh sáng & Âm thanh", "Giải thích các hiện tượng tự nhiên gần gũi xung quanh.",
         "Nước tồn tại ở 3 thể: **Rắn** (nước đá), **Lỏng** (nước uống), **Khí** (hơi nước). Âm thanh truyền qua chất rắn, lỏng, khí (không truyền trong chân không).",
         "Mặt Trời là nguồn sáng và nguồn nhiệt tự nhiên lớn nhất đối với Trái Đất."),
    ]),
    (4, "lich-su", "Chủ đề 1: Lịch sử & Địa lý các vùng miền Việt Nam (Lớp 4)", [
        ("Thăng Long – Hà Nội & Các triều đại phong kiến tiêu biểu", "Tìm hiểu sự kiện Lý Công Uẩn dời đô năm 1010 và các di sản văn hóa.",
         "Năm **1010**, vua Lý Thái Tổ ban *Chiếu dời đô* từ Hoa Lư (Ninh Bình) về thành Đại La và đổi tên thành **Thăng Long**.",
         "Văn Miếu – Quốc Tử Giám (1070–1076) là trường đại học đầu tiên của nước ta."),
    ]),

    # ===================== LỚP 5 (TIỂU HỌC) =====================
    (5, "toan", "Chương 1: Số thập phân & Tỉ số phần trăm", [
        ("Số thập phân & 4 Phép tính trên số thập phân", "Thành thạo cộng, trừ, nhân, chia số thập phân.",
         "Cộng/trừ số thập phân: đặt **dấu phẩy thẳng cột**. Nhân: đếm tổng chữ số phần thập phân để đánh dấu phẩy ở tích.",
         "$12{,}5 \\times 0{,}4 = 5{,}00 = 5$."),
        ("3 Dạng toán cơ bản về Tỉ số phần trăm", "Ứng dụng tính lãi suất, giảm giá, tỉ lệ hoàn thành.",
         "1. Tìm tỉ số phần trăm của $a$ và $b$: $(a : b) \\times 100\\%$.\n2. Tìm $p\\%$ của $A$: $A \\times p : 100$.\n3. Tìm số biết $p\\%$ của nó là $B$: $B \\times 100 : p$.",
         "Áo giá $200.000\\text{ đ}$ giảm $15\\%$ còn $200.000 \\times 85\\% = 170.000\\text{ đ}$."),
    ]),
    (5, "toan", "Chương 2: Hình học phẳng, Hình khối & Toán chuyển động đều", [
        ("Diện tích Tam giác, Hình thang, Hình tròn & Thể tích Hình hộp", "Hệ thống công thức hình học trọng tâm cuối cấp Tiểu học.",
         "- Tam giác: $S = \\dfrac{a \\times h}{2}$ | Hình thang: $S = \\dfrac{(a+b) \\times h}{2}$\n- Hình tròn: $C = d \\times 3{,}14 = r \\times 2 \\times 3{,}14$, $\\quad S = r \\times r \\times 3{,}14$\n- Hình hộp chữ nhật: $V = a \\times b \\times c$.",
         "Hình tròn bán kính $r = 5\\text{ cm}$ có diện tích $S = 5 \\times 5 \\times 3{,}14 = 78{,}5\\text{ cm}^2$."),
        ("Toán chuyển động đều (Cùng chiều & Ngược chiều)", "Trọng tâm ôn thi lên lớp 6 Chất lượng cao.",
         "$$v = \\frac{s}{t}, \\quad s = v \\times t, \\quad t_{\\text{ngược chiều}} = \\frac{s}{v_1 + v_2}, \\quad t_{\\text{cùng chiều}} = \\frac{s}{v_1 - v_2}$$",
         "Hai xe cách nhau $180\\text{ km}$ đi ngược chiều với $v_1 = 40, v_2 = 50\\text{ km/h}$ sẽ gặp nhau sau $180 : 90 = 2$ giờ."),
    ]),
    (5, "ngu-van", "Chủ đề 1: Câu ghép, Điệp từ & Văn tả cảnh, tả người", [
        ("Câu đơn, Câu ghép & Quan hệ từ nối vế câu", "Phân biệt câu đơn (1 cụm C–V) và câu ghép (từ 2 cụm C–V trở lên).",
         "Cặp quan hệ từ hay dùng: *Vì... nên...* (nguyên nhân–kết quả), *Tuy... nhưng...* (tương phản), *Nếu... thì...* (giả thiết).",
         "*Tuy trời mưa rất to nhưng các bạn học sinh vẫn đến lớp đúng giờ.*"),
    ]),
    (5, "tieng-anh", "Unit 1–10: Thì Hiện tại đơn, Quá khứ đơn & Tương lai đơn", [
        ("Present Simple, Past Simple & Future Simple (Ôn thi lên Lớp 6)", "Nắm vững 3 thì cốt lõi cuối bậc Tiểu học.",
         "- Hiện tại đơn: `S + V(s/es)` (*every day, usually*)\n- Quá khứ đơn: `S + V2/V-ed` (*yesterday, last week*)\n- Tương lai đơn: `S + will + V` (*tomorrow, next summer*).",
         "*Last weekend, I **visited** Ha Long Bay with my family.*"),
    ]),
    (5, "tin-hoc", "Chủ đề 5: Giải quyết vấn đề với Scratch (Lập trình kéo thả)", [
        ("Cấu trúc Tuần tự, Rẽ nhánh & Vòng lặp trong Scratch", "Tạo chương trình hoạt hình và trò chơi đơn giản bằng khối lệnh.",
         "3 cấu trúc điều khiển nền tảng: **Tuần tự** (chạy từ trên xuống), **Lặp** (`repeat / forever`), **Rẽ nhánh** (`if ... then ... else`).",
         "Dùng khối `khi bấm vào cờ xanh` kết hợp vòng lặp để điều khiển nhân vật di chuyển."),
    ]),

    # ===================== LỚP 6 (THCS) =====================
    (6, "toan", "Chương 1: Tập hợp các số tự nhiên & Tính chia hết", [
        ("Lũy thừa với số mũ tự nhiên & Thứ tự thực hiện phép tính", "Nắm chắc định nghĩa lũy thừa và quy tắc nhân chia cùng cơ số.",
         "$$a^n = \\underbrace{a \\cdot a \\cdots a}_{n \\text{ thừa số}}, \\quad a^m \\cdot a^n = a^{m+n}, \\quad a^m : a^n = a^{m-n}, \\quad a^0 = 1 \\;(a \\neq 0)$$",
         "$2^3 \\cdot 2^2 = 2^5 = 32$."),
        ("Số nguyên tố, Hợp số, ƯCLN và BCNN", "Phân tích ra thừa số nguyên tố để tìm ƯCLN, BCNN.",
         "- **ƯCLN:** Tích các thừa số nguyên tố **chung** với số mũ **nhỏ nhất**.\n- **BCNN:** Tích các thừa số nguyên tố **chung và riêng** với số mũ **lớn nhất**.",
         "$12 = 2^2 \\cdot 3$, $18 = 2 \\cdot 3^2 \\Rightarrow \\text{ƯCLN}(12,18) = 6$, $\\text{BCNN}(12,18) = 36$."),
    ]),
    (6, "toan", "Chương 2: Số nguyên & Phân số mở rộng", [
        ("Tập hợp số nguyên Z, Phép tính & Quy tắc dấu ngoặc", "Làm quen số nguyên âm và quy tắc cộng trừ nhân chia số nguyên.",
         "- Nhân hai số **cùng dấu** cho kết quả **dương** (`(-).(-) = (+)`).\n- Nhân hai số **khác dấu** cho kết quả **âm**.\n- Bỏ ngoặc có dấu `(-)` đằng trước phải **đổi dấu** mọi số hạng bên trong.",
         "$-(15 - 23 + 7) = -15 + 23 - 7 = 1$."),
    ]),
    (6, "toan", "Chương 3: Hình học trực quan & Điểm, Đường thẳng, Góc", [
        ("Điểm, Đường thẳng, Tia, Đoạn thẳng & Trung điểm", "Làm quen các khái niệm hình học phẳng chuẩn THCS.",
         "Điểm $M$ là trung điểm của đoạn thẳng $AB$ khi $M$ nằm giữa $A, B$ và $MA = MB = \\dfrac{AB}{2}$.",
         "Góc nhọn ($<90^\\circ$), góc vuông ($=90^\\circ$), góc tù ($90^\\circ < \\alpha < 180^\\circ$), góc bẹt ($=180^\\circ$)."),
    ]),
    (6, "khtn", "Chủ đề 1–3: Chất, Tế bào & Lực (KHTN 6 GDPT 2018)", [
        ("Đo lường, Hỗn hợp – Chất tinh khiết & Tách chất", "Nắm các phương pháp lọc, cô cạn, chiết tách chất ra khỏi hỗn hợp.",
         "- **Lọc:** Tách chất rắn không tan khỏi chất lỏng.\n- **Cô cạn:** Tách chất rắn tan không bay hơi (muối ăn khỏi nước).\n- **Chiết:** Tách hai chất lỏng không hòa tan (dầu ăn và nước).",
         "Nhiệt độ Kelvin: $T(\\text{K}) = t(^\\circ\\text{C}) + 273$."),
        ("Tế bào — Đơn vị cơ sở của sự sống & Các loại Lực", "Phân biệt tế bào nhân sơ/nhân thực và công thức trọng lượng.",
         "Trọng lượng của vật: $$P = 10 \\times m \\quad (P: \\text{Newton},\\; m: \\text{kg})$$",
         "Vật có khối lượng $m = 5\\text{ kg}$ chịu trọng lực $P = 50\\text{ N}$."),
    ]),
    (6, "ngu-van", "Chủ đề 1: Truyền thuyết, Cổ tích & Biện pháp Ẩn dụ, Hoán dụ", [
        ("Đặc trưng Truyền thuyết, Cổ tích & Phân biệt Ẩn dụ – Hoán dụ", "Đọc hiểu văn bản tự sự dân gian và phân tích biện pháp tu từ.",
         "- **Ẩn dụ:** Dựa trên nét **tương đồng** (*Người cha mái tóc bạc* chỉ Bác Hồ).\n- **Hoán dụ:** Dựa trên mối quan hệ **gần gũi** (*Áo nâu liền với áo xanh* chỉ nông dân và công nhân).",
         "Truyền thuyết (*Thánh Gióng, Sơn Tinh – Thủy Tinh*) thường gắn với sự kiện lịch sử và yếu tố kỳ ảo."),
    ]),
    (6, "lich-su", "Chủ đề 1: Lịch sử Thế giới Cổ đại & Việt Nam thời dựng nước", [
        ("Các quốc gia Cổ đại phương Đông, phương Tây & Văn Lang – Âu Lạc", "Nắm mốc thời gian lịch sử (TCN/CN) và nền văn minh sông Hồng.",
         "Nhà nước **Văn Lang** (thời các vua Hùng, thế kỷ VII TCN) là nhà nước đầu tiên của người Việt cổ, tiếp nối bởi **Âu Lạc** (An Dương Vương, thành Cổ Loa).",
         "Chiến thắng **Bạch Đằng năm 938** của Ngô Quyền chấm dứt hơn 1000 năm Bắc thuộc."),
    ]),
    (6, "dia-ly", "Chủ đề 1: Trái Đất — Hệ Mặt Trời, Kinh vĩ tuyến & Khí hậu", [
        ("Hệ thống Kinh – Vĩ tuyến & Chuyển động của Trái Đất", "Xác định tọa độ địa lí và giải thích hiện tượng ngày đêm, các mùa.",
         "- Trái Đất tự quay quanh trục (24 giờ) $\\Rightarrow$ sinh ra **ngày và đêm**, giờ khu vực (24 múi giờ, Việt Nam là **UTC+7**).\n- Trái Đất quay quanh Mặt Trời (365 ngày 6 giờ) với trục nghiêng $66^\\circ 33'$ $\\Rightarrow$ sinh ra **4 mùa**.",
         "Xích đạo là vĩ tuyến $0^\\circ$ chia Trái Đất thành Bắc bán cầu và Nam bán cầu."),
    ]),

    # ===================== LỚP 7 (THCS) =====================
    (7, "toan", "Chương 1: Số hữu tỉ, Số thực & Tỉ lệ thức", [
        ("Tập hợp Số hữu tỉ Q, Số vô tỉ & Căn bậc hai số học", "Phân biệt số hữu tỉ, số thập phân vô hạn không tuần hoàn và số thực $\\mathbb{R}$.",
         "Với $a \\ge 0$, căn bậc hai số học $\\sqrt{a} = x \\Leftrightarrow x \\ge 0$ và $x^2 = a$.",
         "$\\sqrt{25} = 5$; $\\sqrt{2} \\approx 1{,}4142\\dots$ là số vô tỉ."),
        ("Tỉ lệ thức & Tính chất dãy tỉ số bằng nhau", "Công cụ giải toán chia tỉ lệ cực mạnh của Đại số 7.",
         "$$\\frac{a}{b} = \\frac{c}{d} = \\frac{a + c}{b + d} = \\frac{a - c}{b - d}$$",
         "Nếu $\\dfrac{x}{2} = \\dfrac{y}{3}$ và $x + y = 25$ thì $\\dfrac{x}{2} = \\dfrac{y}{3} = \\dfrac{25}{5} = 5 \\Rightarrow x = 10, y = 15$."),
    ]),
    (7, "toan", "Chương 2: Góc, Đường thẳng song song & Tam giác bằng nhau", [
        ("Hai đường thẳng song song & Tổng ba góc trong tam giác", "Chứng minh song song và tính số đo góc.",
         "- Tổng ba góc trong một tam giác luôn bằng $180^\\circ$: $\\widehat{A} + \\widehat{B} + \\widehat{C} = 180^\\circ$.\n- Góc ngoài tam giác bằng tổng hai góc trong không kề với nó.",
         "3 trường hợp bằng nhau của tam giác: **c.c.c**, **c.g.c**, **g.c.g**."),
    ]),
    (7, "khtn", "Chủ đề 1–3: Nguyên tử, Tốc độ, Âm thanh & Ánh sáng (KHTN 7)", [
        ("Cấu tạo Nguyên tử, Bảng tuần hoàn & Liên kết hóa học", "Hiểu cấu tạo vỏ electron – hạt nhân (proton, neutron) và hóa trị.",
         "Số proton ($p$) = số electron ($e$) = số hiệu nguyên tử $Z$. Khối lượng nguyên tử tính theo đơn vị **amu**.",
         "Liên kết **ion** (cho–nhận electron, VD $\\text{NaCl}$) và liên kết **cộng hóa trị** (dùng chung electron, VD $\\text{H}_2\\text{O}$)."),
        ("Tốc độ, Đồ thị quãng đường – thời gian & Phản xạ ánh sáng", "Tính tốc độ và nắm Định luật phản xạ ánh sáng.",
         "- Tốc độ: $v = \\dfrac{s}{t}$ ($1\\text{ m/s} = 3{,}6\\text{ km/h}$).\n- Định luật phản xạ: góc phản xạ bằng góc tới ($i' = i$).",
         "Xe chạy $72\\text{ km/h}$ tương đương $72 : 3{,}6 = 20\\text{ m/s}$."),
    ]),
    (7, "tieng-anh", "Unit 1–12: So sánh, Động từ khuyết thiếu & Câu bị động cơ bản", [
        ("Comparison (So sánh bằng/hơn/nhất) & Quantifiers", "Thành thạo cấu trúc so sánh `as...as`, `different from`, `the same as`.",
         "- So sánh bằng: `as + adj/adv + as`\n- Khác với: `different from`\n- Giống như: `the same as`.",
         "*This painting is **not as expensive as** that one.*"),
    ]),
    (7, "tin-hoc", "Chủ đề 4: Ứng dụng Bảng tính điện tử (Excel / Sheets)", [
        ("Công thức & Các hàm SUM, AVERAGE, MAX, MIN, COUNT", "Xử lý số liệu bảng điểm và định dạng tự động bằng bảng tính.",
         "Mọi công thức bắt đầu bằng dấu `=`. Ví dụ: `=AVERAGE(C2:C10)`, `=SUM(D2:D10)`.",
         "Địa chỉ tuyệt đối `$A$1` không thay đổi khi sao chép công thức sang ô khác."),
    ]),

    # ===================== LỚP 8 (THCS) =====================
    (8, "toan", "Chương 1: Đa thức, 7 Hằng đẳng thức & Phân thức đại số", [
        ("7 Hằng đẳng thức đáng nhớ & Phân tích đa thức thành nhân tử", "Nền tảng đại số quan trọng nhất cấp THCS.",
         "1. $(A\\pm B)^2 = A^2 \\pm 2AB + B^2$\n2. $A^2 - B^2 = (A-B)(A+B)$\n3. $(A\\pm B)^3 = A^3 \\pm 3A^2B + 3AB^2 \\pm B^3$\n4. $A^3 \\pm B^3 = (A\\pm B)(A^2 \\mp AB + B^2)$.",
         "Phân tích: $x^2 - 9 = (x - 3)(x + 3)$; $x^2 - 4x + 4 = (x - 2)^2$."),
        ("Phân thức đại số & Hàm số bậc nhất y = ax + b", "Rút gọn phân thức và vẽ đồ thị đường thẳng $y = ax + b$ ($a \\neq 0$).",
         "Hai đường thẳng $y = ax + b$ và $y = a'x + b'$ **song song** khi $a = a', b \\neq b'$ và **cắt nhau** khi $a \\neq a'$.",
         "Hệ số $a$ gọi là **hệ số góc** của đường thẳng."),
    ]),
    (8, "toan", "Chương 2: Tứ giác, Định lý Thalès & Tam giác đồng dạng", [
        ("Định lý Pythagore, Định lý Thalès & 3 Trường hợp Tam giác đồng dạng", "Chứng minh tỉ lệ đoạn thẳng và tính độ dài trong hình học 8.",
         "- Pythagore (tam giác vuông tại $A$): $$BC^2 = AB^2 + AC^2$$\n- Thalès ($MN \\parallel BC$): $$\\frac{AM}{AB} = \\frac{AN}{AC} = \\frac{MN}{BC}$$",
         "3 trường hợp đồng dạng: **c.c.c**, **c.g.c**, **g.g**."),
    ]),
    (8, "khtn", "Chủ đề 1–4: Phản ứng hóa học, Acid–Base, Áp suất & Điện học (KHTN 8)", [
        ("Mol, Tỉ khối khí, Nồng độ dung dịch & Acid – Base – Oxide – Muối", "Nắm chuẩn danh pháp IUPAC mới theo GDPT 2018 và công thức tính toán hóa học.",
         "- Số mol: $n = \\dfrac{m}{M} = \\dfrac{V_{\\text{đkc}}}{24{,}79} = C_M \\cdot V$\n- Nồng độ phần trăm: $C\\% = \\dfrac{m_{\\text{ct}}}{m_{\\text{dd}}} \\cdot 100\\%$\n- Thang pH: $\\text{pH} < 7$ (Acid), $\\text{pH} = 7$ (Trung tính), $\\text{pH} > 7$ (Base).",
         "Đổi mới GDPT 2018: thể tích 1 mol khí ở điều kiện chuẩn ($25^\\circ\\text{C}, 1\\text{ bar}$) là **$24{,}79\\text{ lít}$**."),
        ("Khối lượng riêng, Áp suất chất lỏng & Lực đẩy Archimedes", "Các công thức Vật lý cốt lõi lớp 8.",
         "- Khối lượng riêng: $D = \\dfrac{m}{V}$\n- Áp suất: $p = \\dfrac{F}{S}$\n- Lực đẩy Archimedes: $$F_A = d \\cdot V = 10 \\cdot D \\cdot V$$",
         "Vật nổi khi $F_A > P$, chìm khi $F_A < P$."),
    ]),
    (8, "ngu-van", "Chủ đề 1: Thơ Đường luật, Hài kịch & Văn nghị luận", [
        ("Thơ thất ngôn bát cú Đường luật & Cấu trúc bài văn Nghị luận", "Nhận biết luật bằng trắc, đối, niêm và kỹ năng lập luận chặt chẽ.",
         "Thơ thất ngôn bát cú gồm 8 câu × 7 chữ chia 4 cặp: **Đề – Thực – Luận – Kết** (cặp Thực và Luận phải đối nhau).",
         "Mỗi luận điểm nghị luận cần có **lí lẽ** sắc bén đi kèm **bằng chứng** xác thực."),
    ]),

    # ===================== LỚP 9 (THCS — ÔN THI VÀO 10) =====================
    (9, "toan", "Chương 1: Hệ phương trình bậc nhất hai ẩn & Bất phương trình", [
        ("Giải Hệ phương trình bậc nhất hai ẩn & Giải bài toán bằng cách lập hệ", "Phương pháp thế, cộng đại số và mô hình hóa bài toán năng suất/chuyển động thi vào 10.",
         "$$\\begin{cases} a_1 x + b_1 y = c_1 \\\\ a_2 x + b_2 y = c_2 \\end{cases}$$",
         "Mẹo thi vào 10: luôn đặt **điều kiện của ẩn** (ví dụ $x > 0$, $x \\in \\mathbb{N}^*$) và đối chiếu kết luận."),
    ]),
    (9, "toan", "Chương 2: Căn bậc hai, Căn bậc ba & Rút gọn biểu thức", [
        ("Các phép biến đổi Căn thức bậc hai (Câu 1 đề thi vào 10)", "Thành thạo hằng đẳng thức $\\sqrt{A^2} = |A|$ và trục căn thức ở mẫu.",
         "$$\\sqrt{A^2} = |A| = \\begin{cases} A & \\text{nếu } A \\ge 0 \\\\ -A & \\text{nếu } A < 0 \\end{cases}, \\qquad \\frac{1}{\\sqrt{a} - \\sqrt{b}} = \\frac{\\sqrt{a} + \\sqrt{b}}{a - b}$$",
         "Điều kiện xác định của $\\sqrt{A}$ là $A \\ge 0$."),
    ]),
    (9, "toan", "Chương 3: Hàm số y = ax², Phương trình bậc hai & Định lý Viète", [
        ("Công thức nghiệm bậc hai & Ứng dụng Định lý Viète (Trọng tâm thi vào 10)", "Biện luận tham số $m$ và tính giá trị biểu thức đối xứng giữa hai nghiệm.",
         "$$\\Delta = b^2 - 4ac, \\qquad S = x_1 + x_2 = -\\frac{b}{a}, \\qquad P = x_1 x_2 = \\frac{c}{a}$$",
         "Các biến đổi hay gặp: $x_1^2 + x_2^2 = S^2 - 2P$; $(x_1 - x_2)^2 = S^2 - 4P$."),
    ]),
    (9, "toan", "Chương 4: Tỉ số lượng giác & Đường tròn, Tứ giác nội tiếp", [
        ("Góc với đường tròn & 4 Dấu hiệu chứng minh Tứ giác nội tiếp", "Chuyên đề hình học chiếm 3 điểm trong đề tuyển sinh lớp 10.",
         "Dấu hiệu hay dùng nhất:\n1. Tổng hai góc đối bằng $180^\\circ$.\n2. Hai đỉnh kề nhau cùng nhìn cạnh chứa hai đỉnh còn lại dưới cùng một góc $\\alpha$ (hay gặp góc $90^\\circ$).",
         "Góc nội tiếp bằng nửa số đo cung bị chắn; góc nội tiếp chắn nửa đường tròn bằng $90^\\circ$."),
    ]),
    (9, "khtn", "Chủ đề 1–4: Cơ năng, Định luật Ohm, Kim loại, Alkane–Alkene & Di truyền (KHTN 9)", [
        ("Định luật Ohm, Công – Công suất điện & Khúc xạ ánh sáng", "Hệ thống công thức Vật lý 9 nền tảng cho THPT.",
         "- Định luật Ohm: $I = \\dfrac{U}{R}$\n- Mạch nối tiếp: $R_{\\text{tđ}} = R_1 + R_2$; Song song: $\\dfrac{1}{R_{\\text{tđ}}} = \\dfrac{1}{R_1} + \\dfrac{1}{R_2}$\n- Công suất điện: $P = U \\cdot I = I^2 R = \\dfrac{U^2}{R}$.",
         "Điện năng tiêu thụ: $A = P \\cdot t$ ($1\\text{ kWh} = 3{,}6 \\times 10^6\\text{ J}$)."),
        ("Hydrocarbon (Alkane, Alkene), Ethylic Alcohol, Acetic Acid & Quy luật Mendel", "Hóa hữu cơ đại cương và Di truyền học cơ bản lớp 9.",
         "- Phản ứng ester hóa: $\\text{CH}_3\\text{COOH} + \\text{C}_2\\text{H}_5\\text{OH} \\xrightleftharpoons{\\text{H}_2\\text{SO}_4, t^\\circ} \\text{CH}_3\\text{COOC}_2\\text{H}_5 + \\text{H}_2\\text{O}$\n- Quy luật phân li Mendel: lai 2 cơ thể dị hợp $Aa \\times Aa$ cho tỉ lệ kiểu gen $1AA : 2Aa : 1aa$.",
         "Alkene (như ethylene $\\text{C}_2\\text{H}_4$) làm mất màu dung dịch nước bromine."),
    ]),
    (9, "tieng-anh", "Chuyên đề Tổng ôn thi vào Lớp 10 (Ngữ pháp & Đọc hiểu)", [
        ("Câu điều kiện, Câu bị động, Câu tường thuật & Mệnh đề quan hệ", "4 chuyên đề ngữ pháp chắc chắn xuất hiện trong đề thi vào 10.",
         "- **Passive Voice:** `S + be + V3/ed (+ by O)`\n- **Conditional Type 2:** `If + S + V2/ed (were), S + would + V`\n- **Relative Clauses:** `who` (người), `which` (vật), `whose` (sở hữu), `that`.",
         "*If I **were** you, I **would spend** more time practicing reading comprehension.*"),
    ]),
    (9, "ngu-van", "Chuyên đề Ôn thi vào Lớp 10 (Ngữ liệu ngoài SGK theo GDPT 2018)", [
        ("Chiến thuật Đọc hiểu & Nghị luận Văn học với ngữ liệu mới 100%", "Kỹ năng phân tích tác phẩm thơ/truyện ngoài sách giáo khoa chuẩn định dạng thi mới.",
         "Cấu trúc bài NLVH chuẩn: Mở bài (giới thiệu tác giả/tác phẩm/vấn đề) → Thân bài (Phân tích nội dung + Nghệ thuật + Đánh giá mở rộng) → Kết bài.",
         "Luôn bám sát câu chữ trong đề thi, trích dẫn chính xác từ ngữ/hình ảnh nghệ thuật để chứng minh."),
    ]),

    # ===================== LỚP 10 (THPT) =====================
    (10, "toan", "Chương 1: Mệnh đề, Tập hợp & Bất phương trình bậc nhất hai ẩn", [
        ("Mệnh đề, Các phép toán Tập hợp & Miền nghiệm BPT bậc nhất hai ẩn", "Làm quen tư duy logic toán học THPT và bài toán tối ưu tuyến tính.",
         "- Giao: $A \\cap B$, Hợp: $A \\cup B$, Hiệu: $A \\setminus B$.\n- Miền nghiệm của hệ BPT bậc nhất 2 ẩn là một đa giác lồi; GTLN/GTNN của $F(x,y) = ax + by$ đạt tại các **đỉnh** của đa giác.",
         "Phủ định của $\\forall x \\in X, P(x)$ là $\\exists x \\in X, \\overline{P(x)}$."),
    ]),
    (10, "toan", "Chương 2: Hàm số bậc hai, Dấu tam thức bậc hai & Hệ thức lượng", [
        ("Định lý Cosin, Định lý Sin & Dấu tam thức bậc hai", "Giải tam giác tổng quát và giải bất phương trình bậc hai.",
         "- Định lý Cosin: $a^2 = b^2 + c^2 - 2bc\\cos A$\n- Định lý Sin: $\\dfrac{a}{\\sin A} = \\dfrac{b}{\\sin B} = \\dfrac{c}{\\sin C} = 2R$\n- Dấu tam thức $f(x) = ax^2+bx+c$: **Trong trái, ngoài cùng** (khi $\\Delta > 0$).",
         "Diện tích tam giác: $S = \\dfrac{1}{2}ab\\sin C = \\sqrt{p(p-a)(p-b)(p-c)}$ (Heron)."),
    ]),
    (10, "toan", "Chương 3: Phương pháp tọa độ Oxy & Đại số tổ hợp", [
        ("Phương trình đường thẳng, Đường tròn & Quy tắc đếm, Nhị thức Newton", "Tọa độ Oxy và các công thức tổ hợp $P_n, A_n^k, C_n^k$.",
         "- Khoảng cách từ $M(x_0;y_0)$ đến $\\Delta: ax+by+c=0$: $$d(M,\\Delta) = \\frac{|ax_0+by_0+c|}{\\sqrt{a^2+b^2}}$$\n- Tổ hợp: $C_n^k = \\dfrac{n!}{k!(n-k)!}$, Chỉnh hợp: $A_n^k = \\dfrac{n!}{(n-k)!}$.",
         "Khai triển $(a+b)^4 = a^4 + 4a^3b + 6a^2b^2 + 4ab^3 + b^4$."),
    ]),
    (10, "vat-ly", "Chương 1–4: Động học, 3 Định luật Newton, Công – Năng lượng & Động lượng", [
        ("Chuyển động biến đổi đều, 3 Định luật Newton & Bảo toàn cơ năng", "Nền tảng cơ học cổ điển THPT.",
         "- Chuyển động thẳng biến đổi đều: $v = v_0 + at$, $d = v_0 t + \\dfrac{1}{2}at^2$, $v^2 - v_0^2 = 2ad$\n- Định luật II Newton: $\\vec{F} = m\\vec{a}$\n- Cơ năng: $W = W_đ + W_t = \\dfrac{1}{2}mv^2 + mgh$.",
         "Động lượng $\\vec{p} = m\\vec{v}$ được bảo toàn trong hệ kín."),
    ]),
    (10, "hoa-hoc", "Chương 1–5: Cấu tạo nguyên tử, Liên kết, Phản ứng Oxi hóa – Khử & Enthalpy", [
        ("Cấu hình electron, Phản ứng Oxi hóa – Khử & Biến thiên Enthalpy", "Hóa học đại cương 10 theo chương trình GDPT 2018 (tích hợp nhiệt hóa học).",
         "- Thứ tự mức năng lượng: $1s\\; 2s\\; 2p\\; 3s\\; 3p\\; 4s\\; 3d\\dots$\n- Cân bằng Oxi hóa – Khử theo nguyên tắc **Tổng số e nhường = Tổng số e nhận**.\n- $\\Delta_r H_{298}^\\circ < 0$: phản ứng **tỏa nhiệt**; $\\Delta_r H_{298}^\\circ > 0$: **thu nhiệt**.",
         "Ghi nhớ: *Khử cho – O nhận* (Chất khử nhường electron, số oxi hóa tăng)."),
    ]),
    (10, "sinh-hoc", "Chủ đề 1–3: Sinh học tế bào, Chuyển hóa năng lượng & Chu kì tế bào", [
        ("Cấu trúc tế bào, Nguyên phân – Giảm phân & Vi sinh vật", "Phân biệt quá trình nguyên phân (tạo 2 tế bào con 2n) và giảm phân (tạo 4 giao tử n).",
         "Từ $1$ tế bào mẹ ($2n$) qua $k$ lần nguyên phân liên tiếp tạo ra $2^k$ tế bào con có bộ NST giống hệt tế bào mẹ.",
         "ATP là đồng tiền năng lượng của tế bào."),
    ]),
    (10, "tin-hoc", "Chủ đề 5: Lập trình Python cơ bản (THPT GDPT 2018)", [
        ("Cấu trúc điều khiển, Hàm (`def`), Xâu ký tự & Danh sách trong Python", "Viết chương trình giải quyết bài toán tin học lớp 10 bằng Python.",
         "- Vòng lặp `for x in range(1, n+1):` và `while cond:`\n- Định nghĩa hàm: `def tinh_tong(a, b): return a + b`.",
         "Xâu ký tự (`str`) trong Python là bất biến (immutable); danh sách (`list`) có thể thay đổi phần tử."),
    ]),

    # ===================== LỚP 11 (THPT) =====================
    (11, "toan", "Chương 1: Hàm số lượng giác & Phương trình lượng giác", [
        ("Công thức lượng giác & 4 Phương trình lượng giác cơ bản", "Nền tảng giải tích 11–12 và Vật lý dao động điều hòa.",
         "- $\\sin(a\\pm b) = \\sin a\\cos b \\pm \\cos a\\sin b$\n- $\\cos 2a = \\cos^2 a - \\sin^2 a = 2\\cos^2 a - 1 = 1 - 2\\sin^2 a$\n- $\\sin x = \\sin\\alpha \\Leftrightarrow x = \\alpha + k2\\pi$ hoặc $x = \\pi - \\alpha + k2\\pi$.",
         "Hạ bậc: $\\sin^2 x = \\dfrac{1 - \\cos 2x}{2}$, $\\cos^2 x = \\dfrac{1 + \\cos 2x}{2}$."),
    ]),
    (11, "toan", "Chương 2: Dãy số, Cấp số cộng, Cấp số nhân & Giới hạn", [
        ("Cấp số cộng (CSC), Cấp số nhân (CSN) & Giới hạn hàm số", "Các công thức số hạng tổng quát và tổng $n$ số hạng đầu.",
         "- **CSC:** $u_n = u_1 + (n-1)d$, $\\quad S_n = \\dfrac{n(u_1 + u_n)}{2}$\n- **CSN:** $u_n = u_1 \\cdot q^{n-1}$, $\\quad S_n = u_1 \\dfrac{1 - q^n}{1 - q}$ ($q \\neq 1$).",
         "Hàm số liên tục tại $x_0$ khi $\\lim_{x\\to x_0} f(x) = f(x_0)$."),
    ]),
    (11, "toan", "Chương 3: Hàm số Mũ – Lôgarit, Đạo hàm & Quan hệ vuông góc không gian", [
        ("Quy tắc tính Đạo hàm & Khoảng cách, Góc trong Hình học không gian", "Trọng tâm nối trực tiếp sang chương trình thi THPT Lớp 12.",
         "- $(u \\cdot v)' = u'v + uv'$, $\\quad \\left(\\dfrac{u}{v}\\right)' = \\dfrac{u'v - uv'}{v^2}$\n- Đạo hàm hàm hợp: $[f(u)]' = u' \\cdot f'(u)$\n- $(e^x)' = e^x$, $(\\ln x)' = \\dfrac{1}{x}$, $(\\sin x)' = \\cos x$, $(\\cos x)' = -\\sin x$.",
         "Đường thẳng $d \\perp (P)$ khi $d$ vuông góc với **2 đường thẳng cắt nhau** nằm trong $(P)$."),
    ]),
    (11, "vat-ly", "Chương 1–4: Dao động điều hòa, Sóng cơ – Sóng điện từ & Điện trường", [
        ("Dao động điều hòa, Sóng & Định luật Coulomb – Điện trường", "Chương trình Vật lý 11 mới (đã đưa Dao động & Sóng từ lớp 12 cũ xuống lớp 11).",
         "- Phương trình dao động: $x = A\\cos(\\omega t + \\varphi)$, $\\quad v = -\\omega A\\sin(\\omega t + \\varphi)$, $\\quad a = -\\omega^2 x$\n- Bước sóng: $\\lambda = v \\cdot T = \\dfrac{v}{f}$\n- Định luật Coulomb: $F = k\\dfrac{|q_1 q_2|}{\\varepsilon r^2}$.",
         "Hệ thức độc lập thời gian: $A^2 = x^2 + \\dfrac{v^2}{\\omega^2}$."),
    ]),
    (11, "hoa-hoc", "Chương 1–6: Cân bằng hóa học, Nitrogen – Sulfur & Hóa hữu cơ (Hydrocarbon, Alcohol, Carbonyl)", [
        ("Cân bằng hóa học (Le Chatelier) & Đại cương Hóa hữu cơ", "Chuyển dịch cân bằng, pH dung dịch và đồng phân – danh pháp hữu cơ.",
         "Hằng số cân bằng: $$K_C = \\frac{[C]^c [D]^d}{[A]^a [B]^b}$$ Chỉ phụ thuộc vào **nhiệt độ**.",
         "Danh pháp IUPAC mới: `meth-` (1C), `eth-` (2C), `prop-` (3C), `but-` (4C), `pent-` (5C)."),
    ]),
    (11, "sinh-hoc", "Chủ đề 1–4: Trao đổi chất ở Thực vật – Động vật, Cảm ứng & Sinh sản", [
        ("Quang hợp, Hô hấp tế bào & Hệ tuần hoàn, Miễn dịch ở người", "Hiểu cơ chế quang hợp (pha sáng, chu trình Calvin) và cơ chế miễn dịch.",
         "Phương trình tổng quát quang hợp: $$6\\text{CO}_2 + 12\\text{H}_2\\text{O} \\xrightarrow{\\text{ánh sáng, diệp lục}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2 + 6\\text{H}_2\\text{O}$$",
         "Huyết áp giảm dần từ động mạch $\\to$ mao mạch $\\to$ tĩnh mạch."),
    ]),

    # ===================== LỚP 12 (THPT — THI TỐT NGHIỆP THPT 2025+) =====================
    (12, "toan", "Chương 1: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số", [
        ("Tính đơn điệu, Cực trị, GTLN – GTNN & Đường tiệm cận (Kể cả tiệm cận xiên)", "Trọng tâm số 1 của đề thi Tốt nghiệp THPT 2025+ (bổ sung lại Tiệm cận xiên theo GDPT 2018).",
         "- Tiệm cận đứng $x = x_0$: $\\lim_{x\\to x_0^\\pm} f(x) = \\pm\\infty$\n- Tiệm cận ngang $y = y_0$: $\\lim_{x\\to\\pm\\infty} f(x) = y_0$\n- Tiệm cận xiên $y = ax + b$: $a = \\lim_{x\\to\\pm\\infty} \\dfrac{f(x)}{x}$, $b = \\lim_{x\\to\\pm\\infty}[f(x)-ax]$.",
         "Hàm phân thức bậc 2 trên bậc 1 $y = \\dfrac{ax^2+bx+c}{dx+e}$ luôn có 1 tiệm cận đứng và 1 tiệm cận xiên."),
    ]),
    (12, "toan", "Chương 2: Vectơ và Hệ trục tọa độ trong không gian Oxyz", [
        ("Tọa độ vectơ, Tích có hướng, Phương trình Mặt phẳng, Đường thẳng & Mặt cầu", "Chuyên đề hình học Oxyz dễ ăn điểm trọn vẹn trong kỳ thi THPT.",
         "- Mặt phẳng $(P)$ qua $M_0$ có VTPT $\\vec{n}=(A;B;C)$: $A(x-x_0)+B(y-y_0)+C(z-z_0)=0$\n- Mặt cầu tâm $I(a;b;c)$ bán kính $R$: $(x-a)^2+(y-b)^2+(z-c)^2 = R^2$.",
         "Góc giữa đường thẳng $(\\vec{u})$ và mặt phẳng $(\\vec{n})$: $\\sin\\varphi = \\dfrac{|\\vec{u}\\cdot\\vec{n}|}{|\\vec{u}|\\cdot|\\vec{n}|}$."),
    ]),
    (12, "toan", "Chương 3: Các số đặc trưng đo mức độ phân tán mẫu số liệu ghép nhóm", [
        ("Khoảng biến thiên, Khoảng tứ phân vị, Phương sai & Độ lệch chuẩn", "Chuyên đề MỚI 100% của GDPT 2018 thường xuất hiện trong đề thi 2025+.",
         "- Khoảng tứ phân vị: $\\Delta_Q = Q_3 - Q_1$\n- Phương sai: $s^2 = \\dfrac{1}{n}\\sum n_i (c_i - \\bar{x})^2$\n- Độ lệch chuẩn: $s = \\sqrt{s^2}$.",
         "Độ lệch chuẩn $s$ càng nhỏ thì số liệu càng tập trung đều quanh giá trị trung bình."),
    ]),
    (12, "toan", "Chương 5: Xác suất có điều kiện & Công thức Bayes", [
        ("Xác suất có điều kiện, Công thức Xác suất toàn phần & Công thức Bayes", "Chuyên đề MỚI 100% xuất hiện ở câu Đúng/Sai và Trả lời ngắn thi THPT 2025+.",
         "- Xác suất có điều kiện: $$P(A|B) = \\frac{P(A \\cap B)}{P(B)}$$\n- Công thức Bayes: $$P(B|A) = \\frac{P(B) \\cdot P(A|B)}{P(B)P(A|B) + P(\\overline{B})P(A|\\overline{B})}$$",
         "Vẽ **sơ đồ hình cây** là cách trực quan và ít sai nhất cho mọi bài toán Bayes."),
    ]),
    (12, "vat-ly", "Chương 1–4: Vật lí nhiệt, Khí lí tưởng, Từ trường & Vật lí Hạt nhân", [
        ("Khí lí tưởng — 3 Đẳng quá trình & Phương trình Clapeyron", "Nắm chắc Định luật Boyle, Charles và phương trình trạng thái khí lí tưởng.",
         "$$\\frac{p_1 V_1}{T_1} = \\frac{p_2 V_2}{T_2}, \\qquad pV = nRT \\quad (R = 8{,}31\\text{ J/mol.K})$$",
         "Luôn đổi nhiệt độ sang Kelvin: $T(\\text{K}) = t(^\\circ\\text{C}) + 273$."),
        ("Từ trường, Cảm ứng điện từ & Phản ứng Hạt nhân – Phóng xạ", "Các định luật Faraday, độ hụt khối và định luật phóng xạ.",
         "- Suất điện động cảm ứng: $e_c = -\\dfrac{\\Delta\\Phi}{\\Delta t}$ (với $\\Phi = NBS\\cos\\alpha$)\n- Năng lượng liên kết: $E_{\\text{lk}} = \\Delta m \\cdot c^2$\n- Định luật phóng xạ: $$N(t) = N_0 \\cdot 2^{-t/T}$$",
         "Sau mỗi chu kì bán rã $T$, số hạt nhân phóng xạ giảm đi một nửa."),
    ]),
    (12, "hoa-hoc", "Chương 1–8: Ester, Carbohydrate, Amine–Amino Acid, Polymer & Điện hóa học", [
        ("Carbohydrate (Glucose, Fructose, Saccharose, Tinh bột) & Amine – Peptide", "Phân biệt phản ứng tráng bạc, màu với $\\text{Cu(OH)}_2$ và tính lưỡng tính của Amino Acid.",
         "- **Glucose** và **Fructose** đều tham gia phản ứng với thuốc thử Tollens ($\\text{AgNO}_3/\\text{NH}_3$) tạo kết tủa bạc.\n- **Saccharose** không tráng bạc nhưng thủy phân cho Glucose + Fructose.\n- Peptide có từ $2$ liên kết peptide trở lên (tripeptide trở lên) có **phản ứng màu biuret** màu tím.",
         "Aniline ($\\text{C}_6\\text{H}_5\\text{NH}_2$) tác dụng với nước $\\text{Br}_2$ tạo kết tủa trắng."),
        ("Pin điện hóa & Điện phân (Chuẩn GDPT 2018)", "Tính sức điện động chuẩn của pin Galvani và thứ tự điện phân.",
         "$$E^\\circ_{\\text{pin}} = E^\\circ_{\\text{cathode (+)}} - E^\\circ_{\\text{anode (-)}}$$",
         "Tại **Anode** luôn xảy ra quá trình **oxi hóa**; tại **Cathode** luôn xảy ra quá trình **khử**."),
    ]),
    (12, "sinh-hoc", "Chủ đề 1–3: Di truyền phân tử, Quy luật di truyền, Tiến hóa & Sinh thái học", [
        ("Cơ chế Nhân đôi DNA, Phiên mã, Dịch mã & Đột biến Gen – NST", "Trọng tâm Sinh học 12 thi Tốt nghiệp THPT.",
         "- Nhân đôi DNA theo nguyên tắc **bổ sung** ($A=T, G\\equiv C$) và **bán bảo toàn**.\n- Mã di truyền là mã bộ ba ($4^3 = 64$ bộ ba: $61$ mã hóa amino acid, $3$ bộ ba kết thúc `UAA, UAG, UGA`).",
         "Quần thể cân bằng Hardy–Weinberg: $p^2 AA + 2pq Aa + q^2 aa = 1$."),
    ]),
    (12, "ngu-van", "Chuyên đề Tổng ôn Tốt nghiệp THPT 2025+ (Đọc hiểu + NLXH + NLVH)", [
        ("Cấu trúc Đề thi Ngữ văn THPT 2025+ (100% Ngữ liệu ngoài SGK)", "Phân bổ thời gian 120 phút chuẩn cho Phần I Đọc hiểu (4 điểm) và Phần II Viết (6 điểm).",
         "- **Đọc hiểu (4đ — 30 phút):** Nhận diện thể loại, biện pháp tu từ, thông điệp tác giả.\n- **Viết đoạn văn 200 chữ (2đ — 25 phút)** & **Viết bài văn 600 chữ (4đ — 65 phút)**.",
         "Thí sinh cần rèn kỹ năng đọc nhanh, gạch chân từ khóa và dùng dẫn chứng xã hội mới, xác thực."),
    ]),
    (12, "tieng-anh", "Chuyên đề Tổng ôn Tốt nghiệp THPT 2025+ (Cấu trúc 40 câu / 50 phút)", [
        ("Chiến thuật 40 câu Đọc điền Thông báo/Tờ rơi, Sắp xếp đoạn văn & Đọc hiểu", "Nắm chắc định dạng đề Tiếng Anh THPT hoàn toàn mới từ năm 2025.",
         "Cấu trúc mới tập trung mạnh vào năng lực đọc thực tế:\n- Cloze test Advertisement / Leaflet (12 câu)\n- Rearrangement of dialogues/letters/paragraphs (5 câu)\n- Reading Comprehension (18 câu) & Cloze passage (5 câu).",
         "Mẹo làm bài sắp xếp hội thoại/đoạn văn: tìm câu mở đầu độc lập và theo dõi từ nối (`However, Therefore, Firstly, In addition`)."),
    ]),
    (12, "lich-su", "Chủ đề 1–6: Thế giới sau 1945, ASEAN, Cách mạng Tháng Tám & Kháng chiến 1945–1975", [
        ("Cách mạng Tháng Tám 1945, Điện Biên Phủ 1954 & Đại thắng Mùa Xuân 1975", "Hệ thống các mốc lịch sử trọng tâm thi tốt nghiệp THPT 2025+.",
         "- **2/9/1945:** Chủ tịch Hồ Chí Minh đọc *Tuyên ngôn Độc lập*, khai sinh nước Việt Nam Dân chủ Cộng hòa.\n- **7/5/1954:** Chiến thắng Điện Biên Phủ kết thúc kháng chiến chống Pháp.\n- **30/4/1975:** Chiến dịch Hồ Chí Minh toàn thắng, thống nhất đất nước.",
         "Từ **12/1986** (Đại hội VI), Việt Nam tiến hành công cuộc **Đổi mới** toàn diện đất nước."),
    ]),
    (12, "dia-ly", "Chủ đề 1–4: Địa lí tự nhiên, Dân cư, Các ngành kinh tế & 7 Vùng kinh tế Việt Nam", [
        ("Vị trí địa lí, Thiên nhiên nhiệt đới ẩm gió mùa & 7 Vùng kinh tế Việt Nam", "Trọng tâm Địa lí 12 theo GDPT 2018 (không còn mang Atlat vào phòng thi từ 2025).",
         "- Việt Nam nằm hoàn toàn trong vùng nội chí tuyến Bắc bán cầu, múi giờ số **7**.\n- Khí hậu nhiệt đới ẩm gió mùa có 2 mùa gió chính: **Gió mùa Đông Bắc** và **Gió mùa Tây Nam**.",
         "Cần thuộc đặc trưng thế mạnh của 7 vùng kinh tế (ĐBSH, ĐBSCL, Đông Nam Bộ, Tây Nguyên, Trung du MNBB, Bắc Trung Bộ, Duyên hải Nam Trung Bộ)."),
    ]),
    (12, "tin-hoc", "Chủ đề 1–6: Trí tuệ nhân tạo (AI), Mạng máy tính, HTML/CSS & Cơ sở dữ liệu", [
        ("Trí tuệ nhân tạo (AI), Giao thức TCP/IP & Tạo trang web bằng HTML5/CSS3", "Kiến thức Tin học 12 theo chương trình mới 2018 (môn thi tự chọn THPT 2025+).",
         "- **HTML5:** Thẻ cấu trúc `<header>, <main>, <section>, <table>, <form>`.\n- **CSS3:** Bộ chọn lớp `.class`, bộ chọn định danh `#id`, mô hình hộp (`margin, border, padding, content`).\n- **Mạng:** Địa chỉ IP định danh thiết bị; Router định tuyến gói tin; Switch kết nối mạng LAN.",
         "Thẻ liên kết trong HTML: `<a href=\"https://eduk12.vn\">Học trực tuyến</a>`."),
    ]),
]


def build_pack():
    lessons = []
    for grade_id, sub_code, chapter, items in CURRICULUM_SPEC:
        sub_name = SUBJECT_NAMES[sub_code]
        for idx, (title, summary, core, example) in enumerate(items, start=1):
            slug = slugify(title)
            les_id = f"gdpt-g{grade_id:02d}-{sub_code}-{slugify(chapter)[:12]}-{idx:02d}-{slug[:18]}"
            content_mdx = (
                f"### 1. Kiến thức trọng tâm (Chuẩn GDPT 2018 — {sub_name} Lớp {grade_id})\n"
                f"{core}\n\n"
                f"### 2. Ví dụ minh họa & Lưu ý\n"
                f"{example}\n\n"
                f"### 3. Yêu cầu cần đạt\n"
                f"- {summary}\n"
                f"- Sau khi đọc xong lý thuyết, em hãy bấm **\"Hỏi AI về bài này\"** ở góc trên để AI Gia sư đặt câu hỏi gợi mở và kiểm tra mức độ hiểu bài nhé!"
            )
            lessons.append(
                {
                    "id": les_id,
                    "grade_id": grade_id,
                    "subject_code": sub_code,
                    "textbook": "kntt",
                    "chapter": chapter,
                    "title": title,
                    "summary": summary,
                    "content_mdx": content_mdx,
                    "duration_min": 20 if grade_id <= 5 else (25 if grade_id <= 9 else 30),
                    "materials": [
                        {
                            "id": f"mat-{les_id}",
                            "title": f"Tóm tắt lý thuyết & Bài tập tự luyện: {title} (PDF)",
                            "type": "pdf",
                            "url": f"#cdn-r2-{les_id}",
                            "size_label": "PDF Chuẩn GDPT 2018",
                            "is_free": True,
                        }
                    ],
                }
            )

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_path = os.path.join(root, "database", "seeds", "gdpt2018-full-k12.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"lessons": lessons}, f, ensure_ascii=False, indent=2)

    grades_covered = sorted(set(l["grade_id"] for l in lessons))
    subjects_covered = sorted(set(l["subject_code"] for l in lessons))
    print(f"Generated {len(lessons)} GDPT 2018 lessons -> {out_path}")
    print(f"Grades covered ({len(grades_covered)}): {grades_covered}")
    print(f"Subjects covered ({len(subjects_covered)}): {subjects_covered}")


if __name__ == "__main__":
    build_pack()
