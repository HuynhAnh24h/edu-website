package models

import "time"

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	FullName     string    `json:"full_name"`
	Role         string    `json:"role"` // student | teacher | parent | content_admin | super_admin
	Tier         string    `json:"tier"` // free | plus | pro
	CurrentGrade *int      `json:"current_grade,omitempty"`
	SchoolName   string    `json:"school_name,omitempty"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
}

type Grade struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Slug  string `json:"slug"`
	Level string `json:"level"` // primary | middle | high
}

type Subject struct {
	ID           int    `json:"id"`
	Code         string `json:"code"`
	Name         string `json:"name"`
	DisplayOrder int    `json:"display_order"`
}

type StudyMaterial struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Type        string `json:"type"` // article | pdf | video_hls | mindmap | flashcard
	URL         string `json:"url"`
	SizeLabel   string `json:"size_label"`
	DurationMin int    `json:"duration_min,omitempty"`
	IsFree      bool   `json:"is_free"`
}

type Lesson struct {
	ID          string          `json:"id"`
	GradeID     int             `json:"grade_id"`
	SubjectCode string          `json:"subject_code"`
	SubjectName string          `json:"subject_name"`
	Textbook    string          `json:"textbook"` // kntt | ctst | canh_dieu | general
	Chapter     string          `json:"chapter"`
	Title       string          `json:"title"`
	Slug        string          `json:"slug"`
	Summary     string          `json:"summary"`
	ContentMDX  string          `json:"content_mdx"`
	DurationMin int             `json:"duration_min"`
	Materials   []StudyMaterial `json:"materials"`
}

type QuestionOption struct {
	Key  string `json:"key"`
	Text string `json:"text"`
}

// PublicQuestion KHÔNG BAO GIỜ chứa đáp án đúng (an toàn để phát qua CDN).
type PublicQuestion struct {
	ID          string           `json:"id"`
	GradeID     int              `json:"grade_id"`
	SubjectCode string           `json:"subject_code"`
	SubjectName string           `json:"subject_name,omitempty"`
	Topic       string           `json:"topic"`
	QType       string           `json:"q_type"`     // single_choice | multi_choice | true_false_group | short_answer
	Difficulty  string           `json:"difficulty"` // nhan_biet | thong_hieu | van_dung | van_dung_cao
	ContentMDX  string           `json:"content_mdx"`
	Options     []QuestionOption `json:"options,omitempty"`
	UnitHint    string           `json:"unit_hint,omitempty"`
	Points      float64          `json:"points"`
}

// QuestionInternal giữ thêm đáp án chuẩn & lời giải, chỉ tồn tại trên Server / Grading Worker / CMS.
type QuestionInternal struct {
	PublicQuestion
	AnswerSingle    string          `json:"answer_single,omitempty"`
	AnswerMulti     []string        `json:"answer_multi,omitempty"`
	AnswerTrueFalse map[string]bool `json:"answer_true_false,omitempty"`
	AnswerShort     []string        `json:"answer_short,omitempty"`
	ExplanationMDX  string          `json:"explanation_mdx,omitempty"`
}

type ExerciseSet struct {
	ID          string           `json:"id"`
	GradeID     int              `json:"grade_id"`
	SubjectCode string           `json:"subject_code"`
	SubjectName string           `json:"subject_name"`
	Title       string           `json:"title"`
	Description string           `json:"description"`
	Questions   []PublicQuestion `json:"questions"`
}

type ExamSummary struct {
	ID              string    `json:"id"`
	GradeID         int       `json:"grade_id"`
	SubjectCode     string    `json:"subject_code"`
	SubjectName     string    `json:"subject_name"`
	Title           string    `json:"title"`
	Slug            string    `json:"slug,omitempty"`
	Mode            string    `json:"mode"` // practice | mock_live | official
	DurationMinutes int       `json:"duration_minutes"`
	TotalPoints     float64   `json:"total_points"`
	QuestionCount   int       `json:"question_count"`
	ParticipantCnt  int64     `json:"participant_count"`
	BundleVersion   int       `json:"bundle_version"`
	StartsAt        time.Time `json:"starts_at"`
}

type EncryptedExamBundle struct {
	ExamID        string `json:"exam_id"`
	BundleVersion int    `json:"bundle_version"`
	Algorithm     string `json:"algorithm"` // AES-256-GCM
	IVBase64      string `json:"iv_b64"`
	CiphertextB64 string `json:"ciphertext_b64"`
	GeneratedAt   string `json:"generated_at"`
}

type ExamPayloadPlain struct {
	Exam      ExamSummary      `json:"exam"`
	Questions []PublicQuestion `json:"questions"`
}

type CheatFlag struct {
	Type        string `json:"type"`
	At          string `json:"at"`
	DurationSec int    `json:"duration_sec"`
}

type QuestionGradeDetail struct {
	QuestionID     string  `json:"question_id"`
	UserAnswer     any     `json:"user_answer"`
	CorrectAnswer  any     `json:"correct_answer"`
	IsCorrect      bool    `json:"is_correct"`
	EarnedPoints   float64 `json:"earned_points"`
	MaxPoints      float64 `json:"max_points"`
	ExplanationMDX string  `json:"explanation_mdx"`
}

type ExamAttempt struct {
	ID               string                `json:"attempt_id"`
	ExamID           string                `json:"exam_id"`
	UserID           string                `json:"user_id,omitempty"`
	UserName         string                `json:"user_name"`
	Status           string                `json:"status"` // in_progress | submitted_queued | graded
	ShuffleSeed      int                   `json:"shuffle_seed"`
	StartedAt        time.Time             `json:"started_at"`
	EndsAt           time.Time             `json:"ends_at"`
	SubmittedAt      *time.Time            `json:"submitted_at,omitempty"`
	GradedAt         *time.Time            `json:"graded_at,omitempty"`
	DurationSec      int                   `json:"duration_sec"`
	Score            float64               `json:"score"`
	MaxScore         float64               `json:"max_score"`
	CorrectCount     int                   `json:"correct_count"`
	TotalQuestions   int                   `json:"total_questions"`
	Answers          map[string]any        `json:"answers"`
	CheatFlags       []CheatFlag           `json:"cheat_flags"`
	Details          []QuestionGradeDetail `json:"details,omitempty"`
	GradingLatencyUs int64                 `json:"grading_latency_us,omitempty"`
}

type LeaderboardEntry struct {
	Rank        int     `json:"rank"`
	UserID      string  `json:"user_id"`
	UserName    string  `json:"user_name"`
	Score       float64 `json:"score"`
	DurationSec int     `json:"duration_sec"`
	SubmittedAt string  `json:"submitted_at"`
}
