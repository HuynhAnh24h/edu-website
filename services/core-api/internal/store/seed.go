package store

import (
	"fmt"
	"time"

	"edu-website/core-api/internal/models"
)

type Dataset struct {
	Grades       []models.Grade
	Lessons      []models.Lesson
	Questions    map[string]models.QuestionInternal
	ExerciseSets []models.ExerciseSet
	Exams        []ExamRecord
}

type ExamRecord struct {
	Summary     models.ExamSummary
	QuestionIDs []string
}

func BuildSeedDataset() *Dataset {
	grades := make([]models.Grade, 0, 12)
	for i := 1; i <= 12; i++ {
		level := "primary"
		if i >= 6 && i <= 9 {
			level = "middle"
		} else if i >= 10 {
			level = "high"
		}
		grades = append(grades, models.Grade{
			ID:    i,
			Name:  fmt.Sprintf("Lớp %d", i),
			Slug:  fmt.Sprintf("lop-%d", i),
			Level: level,
		})
	}

	lessons := []models.Lesson{
		{
			ID:          "les-toan-1-01",
			GradeID:     1,
			SubjectCode: "toan",
			SubjectName: "Toán học",
			Textbook:    "kntt",
			Chapter:     "Chương 2: Phép cộng, phép trừ trong phạm vi 10",
			Title:       "Phép cộng trong phạm vi 10 (Tư duy trực quan)",
			Slug:        "phep-cong-pham-vi-10",
			Summary:     "Làm quen với dấu cộng (+), gộp hai nhóm đồ vật và thuộc bảng cộng trong phạm vi 10.",
			DurationMin: 15,
			ContentMDX: `### 1. Gộp hai nhóm đồ vật
Khi ta có **3 quả táo** và thêm **4 quả táo**, tổng số táo là:
$$3 + 4 = 7$$

### 2. Tính chất giao hoán đơn giản cho bé
Đổi chỗ hai số trong phép cộng thì kết quả không thay đổi:
- $2 + 5 = 5 + 2 = 7$
- $4 + 6 = 6 + 4 = 10$

### 3. Mẹo tính nhẩm nhanh bằng ngón tay
Giữ số lớn hơn trong đầu, rồi đếm tiếp thêm số nhỏ hơn. Ví dụ tính $6 + 3$: giữ $6$, đếm tiếp $7, 8, 9 \Rightarrow 6 + 3 = 9$.`,
			Materials: []models.StudyMaterial{
				{ID: "mat-1-1", Title: "Phiếu bài tập in màu Toán 1 - Phép cộng", Type: "pdf", URL: "#pdf-toan-1", SizeLabel: "1.4 MB", IsFree: true},
				{ID: "mat-1-2", Title: "Video hoạt hình đếm táo cùng Bé (HLS 1080p)", Type: "video_hls", URL: "#hls-toan-1", SizeLabel: "Adaptive HLS", DurationMin: 8, IsFree: true},
				{ID: "mat-1-3", Title: "Bộ Flashcard 20 phép cộng nhanh", Type: "flashcard", URL: "#fc-toan-1", SizeLabel: "20 thẻ", IsFree: true},
			},
		},
		{
			ID:          "les-toan-5-01",
			GradeID:     5,
			SubjectCode: "toan",
			SubjectName: "Toán học",
			Textbook:    "kntt",
			Chapter:     "Chương 5: Hình học và Đo lường",
			Title:       "Diện tích hình tam giác & hình thang",
			Slug:        "dien-tich-tam-giac-hinh-thang",
			Summary:     "Nắm chắc công thức tính diện tích hình tam giác, hình thang và ứng dụng giải toán thực tế lớp 5.",
			DurationMin: 20,
			ContentMDX: `### 1. Diện tích hình tam giác
Muốn tính diện tích hình tam giác ta lấy độ dài đáy nhân với chiều cao (cùng một đơn vị đo) rồi chia cho $2$:
$$S = \frac{a \times h}{2}$$

### 2. Diện tích hình thang
Muốn tính diện tích hình thang ta lấy tổng độ dài hai đáy nhân với chiều cao (cùng một đơn vị đo) rồi chia cho $2$:
$$S = \frac{(a + b) \times h}{2}$$

### 3. Ví dụ minh họa
Một mảnh vườn hình thang có đáy lớn $a = 12\text{ m}$, đáy bé $b = 8\text{ m}$, chiều cao $h = 5\text{ m}$. Diện tích là:
$$S = \frac{(12 + 8) \times 5}{2} = 50\text{ m}^2$$`,
			Materials: []models.StudyMaterial{
				{ID: "mat-5-1", Title: "Tóm tắt công thức Hình học Tiểu học (PDF)", Type: "pdf", URL: "#pdf-toan-5", SizeLabel: "2.1 MB", IsFree: true},
				{ID: "mat-5-2", Title: "Sơ đồ tư duy 5 dạng toán diện tích lớp 5", Type: "mindmap", URL: "#mm-toan-5", SizeLabel: "HD PNG", IsFree: true},
			},
		},
		{
			ID:          "les-toan-9-01",
			GradeID:     9,
			SubjectCode: "toan",
			SubjectName: "Toán học",
			Textbook:    "ctst",
			Chapter:     "Chương 6: Phương trình bậc hai một ẩn & Hệ thức Viète",
			Title:       "Công thức nghiệm phương trình bậc hai và Định lý Viète",
			Slug:        "phuong-trinh-bac-hai-viete",
			Summary:     "Trọng tâm ôn thi tuyển sinh vào lớp 10: Biện luận số nghiệm theo biệt thức Delta và ứng dụng hệ thức Viète.",
			DurationMin: 30,
			ContentMDX: `### 1. Phương trình bậc hai một ẩn
Xét phương trình $ax^2 + bx + c = 0$ (với $a \neq 0$). Tính biệt thức:
$$\Delta = b^2 - 4ac$$
- Nếu $\Delta > 0$: Phương trình có hai nghiệm phân biệt $x_{1,2} = \frac{-b \pm \sqrt{\Delta}}{2a}$.
- Nếu $\Delta = 0$: Phương trình có nghiệm kép $x_1 = x_2 = -\frac{b}{2a}$.
- Nếu $\Delta < 0$: Phương trình vô nghiệm thực.

### 2. Định lý Viète (Cực kỳ quan trọng thi vào 10)
Khi phương trình có hai nghiệm $x_1, x_2$, ta luôn có:
$$\begin{cases} S = x_1 + x_2 = -\dfrac{b}{a} \\ P = x_1 x_2 = \dfrac{c}{a} \end{cases}$$
**Biểu thức hay gặp:** $x_1^2 + x_2^2 = S^2 - 2P$.`,
			Materials: []models.StudyMaterial{
				{ID: "mat-9-1", Title: "Chuyên đề 50 bài toán Viète thi vào 10 (Có giải chi tiết)", Type: "pdf", URL: "#pdf-toan-9", SizeLabel: "4.6 MB", IsFree: true},
				{ID: "mat-9-2", Title: "Bài giảng luyện thi vào 10: Bẫy thường gặp ở tham số m", Type: "video_hls", URL: "#hls-toan-9", SizeLabel: "Adaptive HLS", DurationMin: 26, IsFree: true},
			},
		},
		{
			ID:          "les-toan-12-01",
			GradeID:     12,
			SubjectCode: "toan",
			SubjectName: "Toán học",
			Textbook:    "kntt",
			Chapter:     "Chương 1: Ứng dụng đạo hàm để khảo sát hàm số",
			Title:       "Tính đơn điệu và Cực trị của hàm số (Chuẩn thi THPT 2025+)",
			Slug:        "don-dieu-cuc-tri-ham-so",
			Summary:     "Xét dấu đạo hàm $f'(x)$, tìm khoảng đồng biến/nghịch biến, cực đại, cực tiểu và bài toán tối ưu thực tế.",
			DurationMin: 35,
			ContentMDX: `### 1. Điều kiện đủ cho tính đơn điệu
Cho hàm số $y = f(x)$ có đạo hàm trên khoảng $K$:
- Nếu $f'(x) > 0$ với mọi $x \in K$ thì hàm số **đồng biến** trên $K$.
- Nếu $f'(x) < 0$ với mọi $x \in K$ thì hàm số **nghịch biến** trên $K$.

### 2. Quy tắc tìm cực trị
1. Tìm tập xác định và tính $f'(x)$.
2. Giải phương trình $f'(x) = 0$ tìm các điểm tới hạn $x_i$.
3. Lập bảng biến thiên xét dấu $f'(x)$:
   - Đổi dấu từ **$(+)$ sang $(-)$** qua $x_0 \Rightarrow x_0$ là điểm **cực đại**.
   - Đổi dấu từ **$(-)$ sang $(+)$** qua $x_0 \Rightarrow x_0$ là điểm **cực tiểu**.

### 3. Ví dụ chuẩn đề minh họa
Cho $y = x^3 - 3x + 2$. Ta có $y' = 3x^2 - 3 = 0 \Leftrightarrow x = \pm 1$.
- Hàm số đạt cực đại tại $x = -1$ với $y_{\text{CĐ}} = 4$.
- Hàm số đạt cực tiểu tại $x = 1$ với $y_{\text{CT}} = 0$.`,
			Materials: []models.StudyMaterial{
				{ID: "mat-12-1", Title: "Tổng ôn Khảo sát hàm số & Đúng/Sai THPT 2025 (PDF)", Type: "pdf", URL: "#pdf-toan-12", SizeLabel: "5.8 MB", IsFree: true},
				{ID: "mat-12-2", Title: "Video chữa 10 bài toán tối ưu thực tế bằng đạo hàm", Type: "video_hls", URL: "#hls-toan-12", SizeLabel: "Adaptive HLS", DurationMin: 32, IsFree: true},
				{ID: "mat-12-3", Title: "Sơ đồ tư duy nhận diện đồ thị hàm bậc 3 & phân thức", Type: "mindmap", URL: "#mm-toan-12", SizeLabel: "Vector SVG", IsFree: true},
			},
		},
		{
			ID:          "les-ly-12-01",
			GradeID:     12,
			SubjectCode: "vat-ly",
			SubjectName: "Vật lý",
			Textbook:    "kntt",
			Chapter:     "Chương 1: Vật lí nhiệt",
			Title:       "Nội năng và Định luật I của Nhiệt động lực học",
			Slug:        "dinh-luat-1-nhiet-dong-luc-hoc",
			Summary:     "Hiểu rõ mối liên hệ giữa độ biến thiên nội năng, công và nhiệt lượng trong chương trình Vật lý 12 mới.",
			DurationMin: 25,
			ContentMDX: `### 1. Định luật I Nhiệt động lực học
Độ biến thiên nội năng của vật bằng tổng công và nhiệt lượng mà vật nhận được:
$$\Delta U = A + Q$$

### 2. Quy ước dấu bắt buộc nhớ
- $Q > 0$: Vật **nhận** nhiệt lượng; $Q < 0$: Vật **truyền** nhiệt lượng.
- $A > 0$: Vật **nhận** công; $A < 0$: Vật **thực hiện** công.

### 3. Nhiệt lượng thu vào / tỏa ra
$$Q = m \cdot c \cdot \Delta T$$
Trong đó $c$ là nhiệt dung riêng ($\text{J/kg.K}$).`,
			Materials: []models.StudyMaterial{
				{ID: "mat-ly-12-1", Title: "Bộ công thức Vật lí nhiệt lớp 12 GDPT 2018", Type: "pdf", URL: "#pdf-ly-12", SizeLabel: "1.9 MB", IsFree: true},
			},
		},
		{
			ID:          "les-anh-12-01",
			GradeID:     12,
			SubjectCode: "tieng-anh",
			SubjectName: "Tiếng Anh",
			Textbook:    "general",
			Chapter:     "Unit 1: Life Stories We Admire",
			Title:       "Past Simple vs. Past Continuous & Reading Strategies",
			Slug:        "past-simple-vs-past-continuous",
			Summary:     "Phân biệt thì Quá khứ đơn và Quá khứ tiếp diễn trong câu kể chuyện và cấu trúc đề đọc hiểu THPT mới.",
			DurationMin: 20,
			ContentMDX: `### 1. Khi hai hành động xảy ra trong quá khứ
- Hành động **đang diễn ra** (nền): dùng **Past Continuous** (was/were + V-ing).
- Hành động **xen vào** (ngắn): dùng **Past Simple** (V-ed / V2).

**Ví dụ:** *While she **was studying** for her final exam, the lights suddenly **went** out.*

### 2. Mẹo nhận biết nhanh
- **When** + Past Simple, Past Continuous.
- **While** + Past Continuous, Past Simple / Past Continuous (2 hành động song song).`,
			Materials: []models.StudyMaterial{
				{ID: "mat-anh-12-1", Title: "Bảng 100 cụm từ vựng trọng tâm Unit 1–3 (Flashcard)", Type: "flashcard", URL: "#fc-anh-12", SizeLabel: "100 thẻ", IsFree: true},
			},
		},
	}

	// Bổ sung bài học đại diện cho các lớp còn lại (2, 3, 4, 6, 7, 8, 10, 11) để đủ trọn bộ lớp 1-12
	extraGrades := []struct {
		grade   int
		subject string
		subName string
		chapter string
		title   string
		summary string
		content string
	}{
		{2, "toan", "Toán học", "Chương 3: Phép nhân & Bảng nhân 2, 5", "Làm quen phép nhân qua tổng các số hạng bằng nhau", "Hiểu ý nghĩa phép nhân $a \\times b$ và áp dụng bảng nhân 2, 5.", "### Phép nhân là gì?\nKhi cộng nhiều số giống nhau, ta viết gọn thành phép nhân:\n$$2 + 2 + 2 + 2 = 2 \\times 4 = 8$$"},
		{3, "toan", "Toán học", "Chương 4: Chu vi & Diện tích hình chữ nhật", "Tính chu vi hình chữ nhật và hình vuông", "Phân biệt chu vi với diện tích và giải bài toán đố lớp 3.", "### Công thức chuẩn\n- Chu vi hình chữ nhật: $P = (a + b) \\times 2$\n- Chu vi hình vuông: $P = a \\times 4$"},
		{4, "toan", "Toán học", "Chương 5: Phân số", "Khái niệm phân số và tính chất cơ bản của phân số", "Rút gọn phân số và quy đồng mẫu số các phân số.", "### Tính chất cơ bản\nNếu nhân hoặc chia cả tử số và mẫu số của một phân số cho cùng một số tự nhiên khác $0$ thì được phân số bằng phân số đã cho:\n$$\\frac{a}{b} = \\frac{a \\times m}{b \\times m} \\quad (m \\neq 0)$$"},
		{6, "toan", "Toán học", "Chương 2: Tính chia hết trong tập hợp số tự nhiên", "Ước chung lớn nhất (ƯCLN) và Bội chung nhỏ nhất (BCNN)", "Phân tích ra thừa số nguyên tố để tìm ƯCLN và BCNN nhanh chóng.", "### Quy tắc tìm ƯCLN\n1. Phân tích mỗi số ra thừa số nguyên tố.\n2. Chọn các thừa số nguyên tố **chung** với số mũ **nhỏ nhất**.\n3. Lập tích các thừa số đã chọn."},
		{7, "toan", "Toán học", "Chương 4: Góc và đường thẳng song song", "Hai đường thẳng song song và dấu hiệu nhận biết", "Nhận biết góc so le trong, góc đồng vị và áp dụng tiên đề Euclid.", "### Dấu hiệu nhận biết\nNếu đường thẳng $c$ cắt hai đường thẳng $a, b$ và trong các góc tạo thành có một cặp góc **so le trong bằng nhau** hoặc một cặp góc **đồng vị bằng nhau** thì $a \\parallel b$."},
		{8, "toan", "Toán học", "Chương 2: Hằng đẳng thức đáng nhớ", "7 Hằng đẳng thức đáng nhớ & Phân tích đa thức thành nhân tử", "Nền tảng đại số THCS dùng xuyên suốt đến lớp 12.", "### 3 Hằng đẳng thức dùng nhiều nhất\n1. $(A + B)^2 = A^2 + 2AB + B^2$\n2. $(A - B)^2 = A^2 - 2AB + B^2$\n3. $A^2 - B^2 = (A - B)(A + B)$"},
		{10, "toan", "Toán học", "Chương 1: Mệnh đề và Tập hợp", "Các phép toán trên tập hợp (Giao, Hợp, Hiệu)", "Biểu diễn tập hợp bằng khoảng/đoạn trên trục số và giải bài toán thực tế bằng biểu đồ Ven.", "### Các phép toán cơ bản\n- **Giao:** $A \\cap B = \\{x \\mid x \\in A \\text{ và } x \\in B\\}$\n- **Hợp:** $A \\cup B = \\{x \\mid x \\in A \\text{ hoặc } x \\in B\\}$\n- **Hiệu:** $A \\setminus B = \\{x \\mid x \\in A \\text{ và } x \\notin B\\}$"},
		{11, "toan", "Toán học", "Chương 1: Hàm số lượng giác & Phương trình lượng giác", "Công thức lượng giác cơ bản và phương trình $\\sin x = m$", "Nắm vững đường tròn lượng giác và công thức nghiệm tổng quát.", "### Phương trình lượng giác cơ bản\nVới $|m| \\le 1$, đặt $m = \\sin \\alpha$:\n$$\\sin x = \\sin \\alpha \\Leftrightarrow \\left[\\begin{array}{l} x = \\alpha + k2\\pi \\\\ x = \\pi - \\alpha + k2\\pi \\end{array}\\right. \\quad (k \\in \\mathbb{Z})$$"},
	}
	for _, eg := range extraGrades {
		lessons = append(lessons, models.Lesson{
			ID:          fmt.Sprintf("les-%s-%d-01", eg.subject, eg.grade),
			GradeID:     eg.grade,
			SubjectCode: eg.subject,
			SubjectName: eg.subName,
			Textbook:    "kntt",
			Chapter:     eg.chapter,
			Title:       eg.title,
			Slug:        fmt.Sprintf("bai-1-lop-%d", eg.grade),
			Summary:     eg.summary,
			ContentMDX:  eg.content,
			DurationMin: 20,
			Materials: []models.StudyMaterial{
				{ID: fmt.Sprintf("mat-%d-1", eg.grade), Title: fmt.Sprintf("Tài liệu tóm tắt trọng tâm %s lớp %d (PDF)", eg.subName, eg.grade), Type: "pdf", URL: fmt.Sprintf("#pdf-%d", eg.grade), SizeLabel: "1.8 MB", IsFree: true},
			},
		})
	}

	// Ngân hàng câu hỏi mẫu đủ 4 dạng chuẩn GDPT 2018 (1 đáp án, nhiều đáp án, Đúng/Sai 4 ý, Trả lời ngắn)
	questionsList := []models.QuestionInternal{
		// --- Lớp 12 Toán ---
		{
			PublicQuestion: models.PublicQuestion{
				ID: "q-12-1", GradeID: 12, SubjectCode: "toan", Topic: "Tính đơn điệu & Cực trị",
				QType: "single_choice", Difficulty: "nhan_biet", Points: 1.5,
				ContentMDX: "Cho hàm số $y = x^3 - 3x + 2$. Điểm cực đại của hàm số là:",
				Options: []models.QuestionOption{
					{Key: "A", Text: "$x = 1$"},
					{Key: "B", Text: "$x = -1$"},
					{Key: "C", Text: "$x = 4$"},
					{Key: "D", Text: "$x = 0$"},
				},
			},
			AnswerSingle:   "B",
			ExplanationMDX: "Ta có $y' = 3x^2 - 3 = 0 \\Leftrightarrow x = \\pm 1$. Dấu của $y'$ đổi từ $(+)$ sang $(-)$ khi đi qua $x = -1$, nên $x = -1$ là điểm cực đại (giá trị cực đại là $y(-1) = 4$).",
		},
		{
			PublicQuestion: models.PublicQuestion{
				ID: "q-12-2", GradeID: 12, SubjectCode: "toan", Topic: "Nguyên hàm - Tích phân",
				QType: "single_choice", Difficulty: "thong_hieu", Points: 1.5,
				ContentMDX: "Tính tích phân $I = \\int_0^2 (3x^2 + 2x)\\,dx$:",
				Options: []models.QuestionOption{
					{Key: "A", Text: "$I = 12$"},
					{Key: "B", Text: "$I = 10$"},
					{Key: "C", Text: "$I = 8$"},
					{Key: "D", Text: "$I = 14$"},
				},
			},
			AnswerSingle:   "A",
			ExplanationMDX: "Nguyên hàm của $3x^2 + 2x$ là $x^3 + x^2$. Do đó $I = (2^3 + 2^2) - (0) = 8 + 4 = 12$.",
		},
		{
			PublicQuestion: models.PublicQuestion{
				ID: "q-12-3", GradeID: 12, SubjectCode: "toan", Topic: "Khảo sát hàm số (Dạng Đúng/Sai 2025)",
				QType: "true_false_group", Difficulty: "van_dung", Points: 4.0,
				ContentMDX: "Cho hàm số $f(x) = \\dfrac{2x - 1}{x - 1}$. Xét tính **Đúng / Sai** của các mệnh đề sau (chấm điểm lũy tiến chuẩn THPT 2025):",
				Options: []models.QuestionOption{
					{Key: "a", Text: "Tập xác định của hàm số là $D = \\mathbb{R} \\setminus \\{1\\}$."},
					{Key: "b", Text: "Đạo hàm $f'(x) = \\dfrac{-1}{(x - 1)^2} < 0$ với mọi $x \\neq 1$."},
					{Key: "c", Text: "Hàm số nghịch biến trên toàn tập xác định $D$."},
					{Key: "d", Text: "Đồ thị hàm số có tiệm cận ngang là đường thẳng $y = 2$."},
				},
			},
			AnswerTrueFalse: map[string]bool{"a": true, "b": true, "c": false, "d": true},
			ExplanationMDX:  "- **(a) Đúng:** Mẫu số $x - 1 \\neq 0 \\Leftrightarrow x \\neq 1$.\n- **(b) Đúng:** $f'(x) = \\dfrac{2(-1) - 1(-1)}{(x-1)^2} = \\dfrac{-1}{(x-1)^2} < 0$.\n- **(c) Sai:** Không được kết luận nghịch biến trên hợp hai khoảng rời nhau; phải nói nghịch biến trên từng khoảng $(-\\infty; 1)$ và $(1; +\\infty)$.\n- **(d) Đúng:** $\\lim_{x \\to \\pm\\infty} f(x) = 2$.",
		},
		{
			PublicQuestion: models.PublicQuestion{
				ID: "q-12-4", GradeID: 12, SubjectCode: "toan", Topic: "Giá trị lớn nhất - nhỏ nhất (Trả lời ngắn)",
				QType: "short_answer", Difficulty: "van_dung", Points: 3.0,
				ContentMDX: "Tìm giá trị lớn nhất của hàm số $y = -x^2 + 4x$ trên đoạn $[0; 3]$. (Chỉ nhập kết quả là số)",
				UnitHint:   "Nhập số (VD: 4)",
			},
			AnswerShort:    []string{"4", "4.0", "4,0"},
			ExplanationMDX: "Ta có $y' = -2x + 4 = 0 \\Leftrightarrow x = 2 \\in [0; 3]$. Tính các giá trị: $y(0) = 0$, $y(2) = 4$, $y(3) = 3$. Vậy $\\max_{[0;3]} y = 4$.",
		},
		// --- Lớp 9 Toán (Ôn thi vào 10) ---
		{
			PublicQuestion: models.PublicQuestion{
				ID: "q-9-1", GradeID: 9, SubjectCode: "toan", Topic: "Định lý Viète",
				QType: "single_choice", Difficulty: "thong_hieu", Points: 3.0,
				ContentMDX: "Gọi $x_1, x_2$ là hai nghiệm của phương trình $x^2 - 5x + 6 = 0$. Giá trị của biểu thức $x_1^2 + x_2^2$ là:",
				Options: []models.QuestionOption{
					{Key: "A", Text: "$13$"},
					{Key: "B", Text: "$19$"},
					{Key: "C", Text: "$25$"},
					{Key: "D", Text: "$37$"},
				},
			},
			AnswerSingle:   "A",
			ExplanationMDX: "Theo định lý Viète: $x_1 + x_2 = 5$ và $x_1 x_2 = 6$. Suy ra $x_1^2 + x_2^2 = (x_1 + x_2)^2 - 2x_1 x_2 = 5^2 - 2(6) = 25 - 12 = 13$.",
		},
		{
			PublicQuestion: models.PublicQuestion{
				ID: "q-9-2", GradeID: 9, SubjectCode: "toan", Topic: "Căn thức bậc hai",
				QType: "multi_choice", Difficulty: "thong_hieu", Points: 4.0,
				ContentMDX: "Chọn **TẤT CẢ** các giá trị của $x$ thỏa mãn điều kiện xác định của biểu thức $\\sqrt{2x - 4}$:",
				Options: []models.QuestionOption{
					{Key: "A", Text: "$x = 2$"},
					{Key: "B", Text: "$x = 1$"},
					{Key: "C", Text: "$x = 5$"},
					{Key: "D", Text: "$x = -3$"},
				},
			},
			AnswerMulti:    []string{"A", "C"},
			ExplanationMDX: "Điều kiện xác định là $2x - 4 \\ge 0 \\Leftrightarrow x \\ge 2$. Trong các lựa chọn, $x = 2$ (A) và $x = 5$ (C) thỏa mãn.",
		},
		{
			PublicQuestion: models.PublicQuestion{
				ID: "q-9-3", GradeID: 9, SubjectCode: "toan", Topic: "Hệ phương trình bậc nhất",
				QType: "short_answer", Difficulty: "nhan_biet", Points: 3.0,
				ContentMDX: "Cho hệ phương trình $\\begin{cases} x + y = 10 \\\\ x - y = 2 \\end{cases}$. Tìm giá trị của $x$:",
				UnitHint:   "Nhập số nguyên",
			},
			AnswerShort:    []string{"6"},
			ExplanationMDX: "Cộng vế theo vế hai phương trình ta được $2x = 12 \\Leftrightarrow x = 6$ (và $y = 4$).",
		},
		// --- Lớp 5 & Lớp 1 Toán ---
		{
			PublicQuestion: models.PublicQuestion{
				ID: "q-5-1", GradeID: 5, SubjectCode: "toan", Topic: "Hình học lớp 5",
				QType: "short_answer", Difficulty: "nhan_biet", Points: 5.0,
				ContentMDX: "Một hình tam giác có độ dài đáy $a = 10\\text{ cm}$ và chiều cao $h = 6\\text{ cm}$. Diện tích hình tam giác đó là bao nhiêu $\\text{cm}^2$?",
				UnitHint:   "cm²",
			},
			AnswerShort:    []string{"30"},
			ExplanationMDX: "Áp dụng công thức $S = \\dfrac{a \\times h}{2} = \\dfrac{10 \\times 6}{2} = 30\\text{ cm}^2$.",
		},
		{
			PublicQuestion: models.PublicQuestion{
				ID: "q-1-1", GradeID: 1, SubjectCode: "toan", Topic: "Phép cộng phạm vi 10",
				QType: "single_choice", Difficulty: "nhan_biet", Points: 5.0,
				ContentMDX: "Bé có **4 viên bi**, mẹ cho thêm **5 viên bi**. Hỏi bé có tất cả bao nhiêu viên bi?",
				Options: []models.QuestionOption{
					{Key: "A", Text: "$7$ viên bi"},
					{Key: "B", Text: "$8$ viên bi"},
					{Key: "C", Text: "$9$ viên bi"},
					{Key: "D", Text: "$10$ viên bi"},
				},
			},
			AnswerSingle:   "C",
			ExplanationMDX: "Ta thực hiện phép cộng: $4 + 5 = 9$ (viên bi). Đáp án đúng là C!",
		},
		// --- Lớp 12 Vật lý ---
		{
			PublicQuestion: models.PublicQuestion{
				ID: "q-ly-12-1", GradeID: 12, SubjectCode: "vat-ly", Topic: "Vật lí nhiệt",
				QType: "single_choice", Difficulty: "thong_hieu", Points: 5.0,
				ContentMDX: "Truyền cho khí trong xi-lanh nhiệt lượng $Q = 100\\text{ J}$. Chất khí nở ra thực hiện công $70\\text{ J}$ đẩy pít-tông lên. Độ biến thiên nội năng $\\Delta U$ của khí là:",
				Options: []models.QuestionOption{
					{Key: "A", Text: "$170\\text{ J}$"},
					{Key: "B", Text: "$30\\text{ J}$"},
					{Key: "C", Text: "$-30\\text{ J}$"},
					{Key: "D", Text: "$70\\text{ J}$"},
				},
			},
			AnswerSingle:   "B",
			ExplanationMDX: "Khí nhận nhiệt nên $Q = +100\\text{ J}$; khí thực hiện công nên $A = -70\\text{ J}$. Theo Định luật I NĐLH: $\\Delta U = A + Q = -70 + 100 = 30\\text{ J}$.",
		},
	}

	qMap := make(map[string]models.QuestionInternal, len(questionsList))
	for _, q := range questionsList {
		qMap[q.ID] = q
	}

	exerciseSets := []models.ExerciseSet{
		{
			ID: "ex-toan-12-hamso", GradeID: 12, SubjectCode: "toan", SubjectName: "Toán học",
			Title:       "Luyện tập Toán 12 — Khảo sát hàm số & Đúng/Sai chuẩn 2025",
			Description: "Gồm cả trắc nghiệm 1 đáp án, Đúng/Sai 4 mệnh đề và trả lời ngắn. Chấm ngay kèm lời giải chi tiết.",
			Questions:   []models.PublicQuestion{qMap["q-12-1"].PublicQuestion, qMap["q-12-3"].PublicQuestion, qMap["q-12-4"].PublicQuestion},
		},
		{
			ID: "ex-toan-9-vao10", GradeID: 9, SubjectCode: "toan", SubjectName: "Toán học",
			Title:       "Ôn thi vào 10 — Định lý Viète, Căn thức & Hệ phương trình",
			Description: "Bộ bài tập trọng tâm giúp học sinh lớp 9 nắm chắc 8+ điểm thi tuyển sinh THPT.",
			Questions:   []models.PublicQuestion{qMap["q-9-1"].PublicQuestion, qMap["q-9-2"].PublicQuestion, qMap["q-9-3"].PublicQuestion},
		},
		{
			ID: "ex-tieuhoc-vui", GradeID: 1, SubjectCode: "toan", SubjectName: "Toán học",
			Title:       "Toán tư duy Tiểu học (Lớp 1 – Lớp 5)",
			Description: "Bài tập tương tác trực quan, sinh động cho học sinh tiểu học.",
			Questions:   []models.PublicQuestion{qMap["q-1-1"].PublicQuestion, qMap["q-5-1"].PublicQuestion},
		},
		{
			ID: "ex-ly-12-nhiet", GradeID: 12, SubjectCode: "vat-ly", SubjectName: "Vật lý",
			Title:       "Vật lý 12 — Vật lí nhiệt (Chương trình GDPT 2018)",
			Description: "Luyện tập Định luật I Nhiệt động lực học với quy ước dấu chuẩn.",
			Questions:   []models.PublicQuestion{qMap["q-ly-12-1"].PublicQuestion},
		},
	}

	now := time.Now().UTC()
	exams := []ExamRecord{
		{
			Summary: models.ExamSummary{
				ID:              "exam-toan-12-thpt-2025",
				GradeID:         12,
				SubjectCode:     "toan",
				SubjectName:     "Toán học",
				Title:           "Kỳ thi thử THPT Quốc gia 2025 — Môn Toán (Đề chuẩn 3 phần)",
				Mode:            "mock_live",
				DurationMinutes: 45,
				TotalPoints:     10.0,
				QuestionCount:   4,
				ParticipantCnt:  12480,
				BundleVersion:   1,
				StartsAt:        now.Add(-15 * time.Minute),
			},
			QuestionIDs: []string{"q-12-1", "q-12-2", "q-12-3", "q-12-4"},
		},
		{
			Summary: models.ExamSummary{
				ID:              "exam-toan-9-tuyen-sinh-10",
				GradeID:         9,
				SubjectCode:     "toan",
				SubjectName:     "Toán học",
				Title:           "Thi thử Tuyển sinh vào lớp 10 — Chuyên đề Đại số trọng tâm",
				Mode:            "practice",
				DurationMinutes: 30,
				TotalPoints:     10.0,
				QuestionCount:   3,
				ParticipantCnt:  8310,
				BundleVersion:   1,
				StartsAt:        now.Add(-1 * time.Hour),
			},
			QuestionIDs: []string{"q-9-1", "q-9-2", "q-9-3"},
		},
	}

	return &Dataset{
		Grades:       grades,
		Lessons:      lessons,
		Questions:    qMap,
		ExerciseSets: exerciseSets,
		Exams:        exams,
	}
}
