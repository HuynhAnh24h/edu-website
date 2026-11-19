package db

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"edu-website/core-api/internal/auth"
	"edu-website/core-api/internal/models"
	"edu-website/core-api/internal/store"
)

type Repo struct {
	PG    *pgxpool.Pool
	Redis *redis.Client
}

func Connect(ctx context.Context, databaseURL, redisAddr string) (*Repo, error) {
	pgCfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL: %w", err)
	}
	pgCfg.MaxConns = 30
	pgCfg.MinConns = 4

	var pool *pgxpool.Pool
	for attempt := 1; attempt <= 15; attempt++ {
		pool, err = pgxpool.NewWithConfig(ctx, pgCfg)
		if err == nil {
			if pingErr := pool.Ping(ctx); pingErr == nil {
				break
			} else {
				err = pingErr
				pool.Close()
			}
		}
		log.Printf("⏳ Waiting for PostgreSQL (%d/15): %v", attempt, err)
		time.Sleep(1500 * time.Millisecond)
	}
	if err != nil {
		return nil, fmt.Errorf("connect PostgreSQL failed: %w", err)
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		PoolSize: 40,
	})
	if err := rdb.Ping(ctx).Err(); err != nil {
		pool.Close()
		return nil, fmt.Errorf("connect Redis (%s) failed: %w", redisAddr, err)
	}

	repo := &Repo{PG: pool, Redis: rdb}
	if err := repo.SeedIfEmpty(ctx); err != nil {
		log.Printf("⚠️ Seed warning: %v", err)
	}
	return repo, nil
}

func (r *Repo) Close() {
	if r.PG != nil {
		r.PG.Close()
	}
	if r.Redis != nil {
		_ = r.Redis.Close()
	}
}

// SeedIfEmpty nạp dữ liệu chuẩn Lớp 1-12 + tài khoản Admin/Giáo viên/Học sinh vào PostgreSQL lần đầu.
func (r *Repo) SeedIfEmpty(ctx context.Context) error {
	// 1. Luôn đảm bảo 3 tài khoản demo có sẵn để test phân quyền
	demoUsers := []struct {
		email    string
		password string
		name     string
		role     string
		grade    *int
		school   string
	}{
		{"admin@eduk12.vn", "Admin@123", "Quản trị viên Hệ thống", "super_admin", nil, "EduK12 Headquarters"},
		{"giaovien@eduk12.vn", "Teacher@123", "Thầy Nguyễn Văn Minh (GV Toán)", "teacher", nil, "THPT Chuyên KHTN"},
		{"hocsinh@eduk12.vn", "Student@123", "Nguyễn Minh Anh", "student", intPtr(12), "THPT Chu Văn An"},
	}
	for _, u := range demoUsers {
		hash, err := auth.HashPassword(u.password)
		if err != nil {
			return err
		}
		_, err = r.PG.Exec(ctx, `
			INSERT INTO users (email, password_hash, full_name, role, tier, current_grade, school_name)
			VALUES ($1, $2, $3, $4::user_role, 'pro', $5, $6)
			ON CONFLICT (email) DO NOTHING
		`, u.email, hash, u.name, u.role, u.grade, u.school)
		if err != nil {
			return fmt.Errorf("seed user %s: %w", u.email, err)
		}
	}

	// 2. Kiểm tra nếu đã có bài học trong DB thì không seed trùng
	var lessonCount int
	if err := r.PG.QueryRow(ctx, `SELECT COUNT(*) FROM lessons`).Scan(&lessonCount); err != nil {
		return err
	}
	if lessonCount > 0 {
		return nil
	}

	log.Println("🌱 Seeding initial K-12 curriculum, questions & exams into PostgreSQL...")
	ds := store.BuildSeedDataset()

	// Nạp bài học + tài liệu
	for _, les := range ds.Lessons {
		_, err := r.CreateLessonCMS(ctx, CreateLessonInput{
			GradeID:     les.GradeID,
			SubjectCode: les.SubjectCode,
			Textbook:    les.Textbook,
			Chapter:     les.Chapter,
			Title:       les.Title,
			Summary:     les.Summary,
			ContentMDX:  les.ContentMDX,
			DurationMin: les.DurationMin,
			Materials:   les.Materials,
		})
		if err != nil {
			return fmt.Errorf("seed lesson %s: %w", les.Title, err)
		}
	}

	// Nạp câu hỏi & ánh xạ oldID -> newUUID để tạo đề thi mẫu
	idMap := make(map[string]string, len(ds.Questions))
	var adminID string
	_ = r.PG.QueryRow(ctx, `SELECT id::text FROM users WHERE email = 'admin@eduk12.vn'`).Scan(&adminID)

	for oldID, q := range ds.Questions {
		created, err := r.CreateQuestionCMS(ctx, CreateQuestionInput{
			GradeID:         q.GradeID,
			SubjectCode:     q.SubjectCode,
			Topic:           q.Topic,
			QType:           q.QType,
			Difficulty:      q.Difficulty,
			ContentMDX:      q.ContentMDX,
			Options:         q.Options,
			UnitHint:        q.UnitHint,
			AnswerSingle:    q.AnswerSingle,
			AnswerMulti:     q.AnswerMulti,
			AnswerTrueFalse: q.AnswerTrueFalse,
			AnswerShort:     q.AnswerShort,
			ExplanationMDX:  q.ExplanationMDX,
			CreatedBy:       adminID,
		})
		if err != nil {
			return fmt.Errorf("seed question %s: %w", oldID, err)
		}
		idMap[oldID] = created.ID
	}

	// Nạp kỳ thi mẫu
	for _, ex := range ds.Exams {
		qUUIDs := make([]string, 0, len(ex.QuestionIDs))
		qPoints := make(map[string]float64, len(ex.QuestionIDs))
		for _, oldQID := range ex.QuestionIDs {
			if uid, ok := idMap[oldQID]; ok {
				qUUIDs = append(qUUIDs, uid)
				qPoints[uid] = ds.Questions[oldQID].Points
			}
		}
		_, err := r.CreateExamCMS(ctx, CreateExamInput{
			GradeID:         ex.Summary.GradeID,
			SubjectCode:     ex.Summary.SubjectCode,
			Title:           ex.Summary.Title,
			Slug:            ex.Summary.ID,
			Mode:            ex.Summary.Mode,
			DurationMinutes: ex.Summary.DurationMinutes,
			TotalPoints:     ex.Summary.TotalPoints,
			QuestionIDs:     qUUIDs,
			QuestionPoints:  qPoints,
		})
		if err != nil {
			return fmt.Errorf("seed exam %s: %w", ex.Summary.Title, err)
		}
	}

	log.Println("✅ PostgreSQL K-12 seed completed!")
	return nil
}

// =============================================================================
// AUTH & USERS
// =============================================================================

func (r *Repo) CreateUser(ctx context.Context, email, passwordHash, fullName, role, school string, grade *int) (models.User, error) {
	var u models.User
	err := r.PG.QueryRow(ctx, `
		INSERT INTO users (email, password_hash, full_name, role, current_grade, school_name)
		VALUES ($1, $2, $3, $4::user_role, $5, $6)
		RETURNING id::text, email, full_name, role::text, tier::text, current_grade, COALESCE(school_name,''), is_active, created_at
	`, strings.ToLower(strings.TrimSpace(email)), passwordHash, strings.TrimSpace(fullName), role, grade, school).Scan(
		&u.ID, &u.Email, &u.FullName, &u.Role, &u.Tier, &u.CurrentGrade, &u.SchoolName, &u.IsActive, &u.CreatedAt,
	)
	return u, err
}

func (r *Repo) GetUserByEmail(ctx context.Context, email string) (models.User, string, error) {
	var u models.User
	var passHash string
	err := r.PG.QueryRow(ctx, `
		SELECT id::text, email, password_hash, full_name, role::text, tier::text, current_grade, COALESCE(school_name,''), is_active, created_at
		FROM users WHERE LOWER(email) = LOWER($1)
	`, strings.TrimSpace(email)).Scan(
		&u.ID, &u.Email, &passHash, &u.FullName, &u.Role, &u.Tier, &u.CurrentGrade, &u.SchoolName, &u.IsActive, &u.CreatedAt,
	)
	return u, passHash, err
}

func (r *Repo) GetUserByID(ctx context.Context, userID string) (models.User, error) {
	var u models.User
	err := r.PG.QueryRow(ctx, `
		SELECT id::text, email, full_name, role::text, tier::text, current_grade, COALESCE(school_name,''), is_active, created_at
		FROM users WHERE id = $1::uuid
	`, userID).Scan(
		&u.ID, &u.Email, &u.FullName, &u.Role, &u.Tier, &u.CurrentGrade, &u.SchoolName, &u.IsActive, &u.CreatedAt,
	)
	return u, err
}

func (r *Repo) ListUsers(ctx context.Context) ([]models.User, error) {
	rows, err := r.PG.Query(ctx, `
		SELECT id::text, COALESCE(email,''), full_name, role::text, tier::text, current_grade, COALESCE(school_name,''), is_active, created_at
		FROM users ORDER BY created_at DESC LIMIT 100
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Email, &u.FullName, &u.Role, &u.Tier, &u.CurrentGrade, &u.SchoolName, &u.IsActive, &u.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, nil
}

func (r *Repo) UpdateUserRole(ctx context.Context, userID, newRole string) error {
	_, err := r.PG.Exec(ctx, `UPDATE users SET role = $1::user_role, updated_at = NOW() WHERE id = $2::uuid`, newRole, userID)
	return err
}

func (r *Repo) StoreRefreshToken(ctx context.Context, token, userID string) error {
	return r.Redis.Set(ctx, "auth:refresh:"+token, userID, 30*24*time.Hour).Err()
}

func (r *Repo) ValidateRefreshToken(ctx context.Context, token string) (string, error) {
	return r.Redis.Get(ctx, "auth:refresh:"+token).Result()
}

func (r *Repo) RevokeRefreshToken(ctx context.Context, token string) error {
	return r.Redis.Del(ctx, "auth:refresh:"+token).Err()
}

// =============================================================================
// CURRICULUM & CMS (Lớp 1-12, Tài liệu, Câu hỏi)
// =============================================================================

func (r *Repo) ListGrades(ctx context.Context) ([]models.Grade, error) {
	rows, err := r.PG.Query(ctx, `SELECT id, name, slug, level::text FROM grades ORDER BY id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.Grade
	for rows.Next() {
		var g models.Grade
		if err := rows.Scan(&g.ID, &g.Name, &g.Slug, &g.Level); err != nil {
			return nil, err
		}
		out = append(out, g)
	}
	return out, nil
}

func (r *Repo) ListSubjects(ctx context.Context) ([]models.Subject, error) {
	rows, err := r.PG.Query(ctx, `SELECT id, code, name, display_order FROM subjects ORDER BY display_order ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.Subject
	for rows.Next() {
		var s models.Subject
		if err := rows.Scan(&s.ID, &s.Code, &s.Name, &s.DisplayOrder); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, nil
}

func (r *Repo) ListLessons(ctx context.Context, gradeID int, subjectCode, textbook string) ([]models.Lesson, error) {
	query := `
		SELECT l.id::text, c.grade_id, s.code, s.name, c.textbook::text, ch.title,
		       l.title, l.slug, COALESCE(l.summary,''), COALESCE(l.content_mdx,''), COALESCE(l.duration_min, 20)
		FROM lessons l
		JOIN chapters ch ON l.chapter_id = ch.id
		JOIN courses c ON ch.course_id = c.id
		JOIN subjects s ON c.subject_id = s.id
		WHERE l.is_published = TRUE
	`
	args := []any{}
	idx := 1
	if gradeID > 0 {
		query += fmt.Sprintf(" AND c.grade_id = $%d", idx)
		args = append(args, gradeID)
		idx++
	}
	if subjectCode != "" && subjectCode != "all" {
		query += fmt.Sprintf(" AND s.code = $%d", idx)
		args = append(args, subjectCode)
		idx++
	}
	if textbook != "" && textbook != "all" {
		query += fmt.Sprintf(" AND c.textbook = $%d::textbook_series", idx)
		args = append(args, textbook)
		idx++
	}
	query += " ORDER BY c.grade_id ASC, l.updated_at DESC"

	rows, err := r.PG.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	lessons := make([]models.Lesson, 0)
	lessonIdx := make(map[string]int)
	for rows.Next() {
		var les models.Lesson
		if err := rows.Scan(
			&les.ID, &les.GradeID, &les.SubjectCode, &les.SubjectName, &les.Textbook,
			&les.Chapter, &les.Title, &les.Slug, &les.Summary, &les.ContentMDX, &les.DurationMin,
		); err != nil {
			return nil, err
		}
		les.Materials = []models.StudyMaterial{}
		lessonIdx[les.ID] = len(lessons)
		lessons = append(lessons, les)
	}

	if len(lessons) == 0 {
		return lessons, nil
	}

	// Nạp kèm study_materials
	mRows, err := r.PG.Query(ctx, `
		SELECT id::text, lesson_id::text, title, type::text, storage_url, COALESCE(duration_sec,0), is_free
		FROM study_materials ORDER BY created_at ASC
	`)
	if err == nil {
		defer mRows.Close()
		for mRows.Next() {
			var m models.StudyMaterial
			var lesID string
			var durSec int
			if err := mRows.Scan(&m.ID, &lesID, &m.Title, &m.Type, &m.URL, &durSec, &m.IsFree); err == nil {
				if pos, ok := lessonIdx[lesID]; ok {
					m.DurationMin = durSec / 60
					switch m.Type {
					case "video_hls":
						m.SizeLabel = "Adaptive HLS"
					case "flashcard":
						m.SizeLabel = "Bộ thẻ học"
					case "mindmap":
						m.SizeLabel = "Sơ đồ tư duy"
					default:
						m.SizeLabel = "Tài liệu PDF"
					}
					lessons[pos].Materials = append(lessons[pos].Materials, m)
				}
			}
		}
	}

	return lessons, nil
}

type CreateLessonInput struct {
	GradeID     int                    `json:"grade_id"`
	SubjectCode string                 `json:"subject_code"`
	Textbook    string                 `json:"textbook"`
	Chapter     string                 `json:"chapter"`
	Title       string                 `json:"title"`
	Summary     string                 `json:"summary"`
	ContentMDX  string                 `json:"content_mdx"`
	DurationMin int                    `json:"duration_min"`
	Materials   []models.StudyMaterial `json:"materials"`
}

func (r *Repo) CreateLessonCMS(ctx context.Context, in CreateLessonInput) (models.Lesson, error) {
	if in.GradeID < 1 || in.GradeID > 12 {
		return models.Lesson{}, errors.New("khối lớp phải từ 1 đến 12")
	}
	if in.Textbook == "" {
		in.Textbook = "kntt"
	}
	if in.DurationMin <= 0 {
		in.DurationMin = 20
	}
	if strings.TrimSpace(in.Chapter) == "" {
		in.Chapter = "Chương tổng hợp"
	}

	var subjectID int
	var subjectName string
	err := r.PG.QueryRow(ctx, `SELECT id, name FROM subjects WHERE code = $1`, in.SubjectCode).Scan(&subjectID, &subjectName)
	if err != nil {
		return models.Lesson{}, fmt.Errorf("không tìm thấy môn học '%s'", in.SubjectCode)
	}

	// Upsert Course
	courseSlug := fmt.Sprintf("lop-%d-%s-%s", in.GradeID, in.SubjectCode, in.Textbook)
	courseTitle := fmt.Sprintf("%s Lớp %d (%s)", subjectName, in.GradeID, strings.ToUpper(in.Textbook))
	var courseID string
	err = r.PG.QueryRow(ctx, `
		INSERT INTO courses (grade_id, subject_id, textbook, title, slug, is_published)
		VALUES ($1, $2, $3::textbook_series, $4, $5, TRUE)
		ON CONFLICT (grade_id, subject_id, textbook) DO UPDATE SET title = EXCLUDED.title
		RETURNING id::text
	`, in.GradeID, subjectID, in.Textbook, courseTitle, courseSlug).Scan(&courseID)
	if err != nil {
		return models.Lesson{}, err
	}

	// Upsert Chapter
	chSlug := slugify(in.Chapter)
	var chapterID string
	err = r.PG.QueryRow(ctx, `
		INSERT INTO chapters (course_id, title, slug)
		VALUES ($1::uuid, $2, $3)
		ON CONFLICT (course_id, slug) DO UPDATE SET title = EXCLUDED.title
		RETURNING id::text
	`, courseID, in.Chapter, chSlug).Scan(&chapterID)
	if err != nil {
		return models.Lesson{}, err
	}

	// Insert Lesson
	lesSlug := fmt.Sprintf("%s-%d", slugify(in.Title), time.Now().UnixMilli()%100000)
	var lessonID string
	err = r.PG.QueryRow(ctx, `
		INSERT INTO lessons (chapter_id, title, slug, summary, content_mdx, duration_min, is_published)
		VALUES ($1::uuid, $2, $3, $4, $5, $6, TRUE)
		RETURNING id::text
	`, chapterID, strings.TrimSpace(in.Title), lesSlug, in.Summary, in.ContentMDX, in.DurationMin).Scan(&lessonID)
	if err != nil {
		return models.Lesson{}, err
	}

	createdMaterials := make([]models.StudyMaterial, 0, len(in.Materials))
	for _, m := range in.Materials {
		if strings.TrimSpace(m.Title) == "" {
			continue
		}
		mType := m.Type
		if mType == "" {
			mType = "pdf"
		}
		mURL := m.URL
		if mURL == "" {
			mURL = "#cdn-r2-material"
		}
		var matID string
		if err := r.PG.QueryRow(ctx, `
			INSERT INTO study_materials (lesson_id, title, type, storage_url, duration_sec, is_free)
			VALUES ($1::uuid, $2, $3::material_type, $4, $5, TRUE)
			RETURNING id::text
		`, lessonID, m.Title, mType, mURL, m.DurationMin*60).Scan(&matID); err == nil {
			m.ID = matID
			createdMaterials = append(createdMaterials, m)
		}
	}

	return models.Lesson{
		ID:          lessonID,
		GradeID:     in.GradeID,
		SubjectCode: in.SubjectCode,
		SubjectName: subjectName,
		Textbook:    in.Textbook,
		Chapter:     in.Chapter,
		Title:       in.Title,
		Slug:        lesSlug,
		Summary:     in.Summary,
		ContentMDX:  in.ContentMDX,
		DurationMin: in.DurationMin,
		Materials:   createdMaterials,
	}, nil
}

// =============================================================================
// QUESTIONS & EXERCISES
// =============================================================================

type CreateQuestionInput struct {
	GradeID         int                     `json:"grade_id"`
	SubjectCode     string                  `json:"subject_code"`
	Topic           string                  `json:"topic"`
	QType           string                  `json:"q_type"`
	Difficulty      string                  `json:"difficulty"`
	ContentMDX      string                  `json:"content_mdx"`
	Options         []models.QuestionOption `json:"options"`
	UnitHint        string                  `json:"unit_hint"`
	AnswerSingle    string                  `json:"answer_single"`
	AnswerMulti     []string                `json:"answer_multi"`
	AnswerTrueFalse map[string]bool         `json:"answer_true_false"`
	AnswerShort     []string                `json:"answer_short"`
	ExplanationMDX  string                  `json:"explanation_mdx"`
	CreatedBy       string                  `json:"-"`
}

func (r *Repo) CreateQuestionCMS(ctx context.Context, in CreateQuestionInput) (models.QuestionInternal, error) {
	var subjectID int
	var subjectName string
	if err := r.PG.QueryRow(ctx, `SELECT id, name FROM subjects WHERE code = $1`, in.SubjectCode).Scan(&subjectID, &subjectName); err != nil {
		return models.QuestionInternal{}, fmt.Errorf("không tìm thấy môn '%s'", in.SubjectCode)
	}
	if in.Difficulty == "" {
		in.Difficulty = "thong_hieu"
	}
	if strings.TrimSpace(in.Topic) == "" {
		in.Topic = "Chuyên đề tổng hợp"
	}

	optPayload := map[string]any{
		"options":   in.Options,
		"unit_hint": in.UnitHint,
	}
	optJSON, _ := json.Marshal(optPayload)

	ansPayload := map[string]any{
		"single":     in.AnswerSingle,
		"multi":      in.AnswerMulti,
		"true_false": in.AnswerTrueFalse,
		"short":      in.AnswerShort,
	}
	ansJSON, _ := json.Marshal(ansPayload)

	var createdByPtr *string
	if in.CreatedBy != "" {
		createdByPtr = &in.CreatedBy
	}

	var qID string
	err := r.PG.QueryRow(ctx, `
		INSERT INTO questions (grade_id, subject_id, topic, q_type, difficulty, content_mdx, options_json, answer_key_json, explanation_mdx, created_by)
		VALUES ($1, $2, $3, $4::question_type, $5::cognitive_level, $6, $7::jsonb, $8::jsonb, $9, $10::uuid)
		RETURNING id::text
	`, in.GradeID, subjectID, in.Topic, in.QType, in.Difficulty, in.ContentMDX, optJSON, ansJSON, in.ExplanationMDX, createdByPtr).Scan(&qID)
	if err != nil {
		return models.QuestionInternal{}, err
	}

	return models.QuestionInternal{
		PublicQuestion: models.PublicQuestion{
			ID:          qID,
			GradeID:     in.GradeID,
			SubjectCode: in.SubjectCode,
			SubjectName: subjectName,
			Topic:       in.Topic,
			QType:       in.QType,
			Difficulty:  in.Difficulty,
			ContentMDX:  in.ContentMDX,
			Options:     in.Options,
			UnitHint:    in.UnitHint,
			Points:      defaultPointsForType(in.QType),
		},
		AnswerSingle:    in.AnswerSingle,
		AnswerMulti:     in.AnswerMulti,
		AnswerTrueFalse: in.AnswerTrueFalse,
		AnswerShort:     in.AnswerShort,
		ExplanationMDX:  in.ExplanationMDX,
	}, nil
}

func (r *Repo) ListQuestions(ctx context.Context, gradeID int, subjectCode string) ([]models.QuestionInternal, error) {
	query := `
		SELECT q.id::text, q.grade_id, s.code, s.name, q.topic, q.q_type::text, q.difficulty::text,
		       q.content_mdx, q.options_json, q.answer_key_json, COALESCE(q.explanation_mdx,'')
		FROM questions q
		JOIN subjects s ON q.subject_id = s.id
		WHERE q.is_active = TRUE
	`
	args := []any{}
	idx := 1
	if gradeID > 0 {
		query += fmt.Sprintf(" AND q.grade_id = $%d", idx)
		args = append(args, gradeID)
		idx++
	}
	if subjectCode != "" && subjectCode != "all" {
		query += fmt.Sprintf(" AND s.code = $%d", idx)
		args = append(args, subjectCode)
		idx++
	}
	query += " ORDER BY q.created_at DESC LIMIT 200"

	rows, err := r.PG.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.QuestionInternal
	for rows.Next() {
		q, err := scanQuestionRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, q)
	}
	return out, nil
}

func (r *Repo) GetQuestionByID(ctx context.Context, questionID string) (models.QuestionInternal, error) {
	row := r.PG.QueryRow(ctx, `
		SELECT q.id::text, q.grade_id, s.code, s.name, q.topic, q.q_type::text, q.difficulty::text,
		       q.content_mdx, q.options_json, q.answer_key_json, COALESCE(q.explanation_mdx,'')
		FROM questions q
		JOIN subjects s ON q.subject_id = s.id
		WHERE q.id = $1::uuid
	`, questionID)
	return scanQuestionRow(row)
}

func (r *Repo) ListExerciseSets(ctx context.Context, gradeID int) ([]models.ExerciseSet, error) {
	qs, err := r.ListQuestions(ctx, gradeID, "all")
	if err != nil {
		return nil, err
	}
	// Nhóm câu hỏi thành các bộ bài tập theo (grade_id, subject_code)
	grouped := make(map[string]*models.ExerciseSet)
	order := make([]string, 0)
	for _, q := range qs {
		key := fmt.Sprintf("%d:%s", q.GradeID, q.SubjectCode)
		set, exists := grouped[key]
		if !exists {
			set = &models.ExerciseSet{
				ID:          fmt.Sprintf("ex-lop-%d-%s", q.GradeID, q.SubjectCode),
				GradeID:     q.GradeID,
				SubjectCode: q.SubjectCode,
				SubjectName: q.SubjectName,
				Title:       fmt.Sprintf("Luyện tập %s Lớp %d (Chấm tức thì)", q.SubjectName, q.GradeID),
				Description: fmt.Sprintf("Tổng hợp câu hỏi chuẩn GDPT 2018 môn %s Lớp %d từ ngân hàng PostgreSQL.", q.SubjectName, q.GradeID),
				Questions:   []models.PublicQuestion{},
			}
			grouped[key] = set
			order = append(order, key)
		}
		set.Questions = append(set.Questions, q.PublicQuestion)
	}
	out := make([]models.ExerciseSet, 0, len(order))
	for _, k := range order {
		out = append(out, *grouped[k])
	}
	return out, nil
}

// =============================================================================
// EXAMS, ATTEMPTS & REDIS LEADERBOARD
// =============================================================================

type CreateExamInput struct {
	GradeID         int                `json:"grade_id"`
	SubjectCode     string             `json:"subject_code"`
	Title           string             `json:"title"`
	Slug            string             `json:"slug"`
	Mode            string             `json:"mode"`
	DurationMinutes int                `json:"duration_minutes"`
	TotalPoints     float64            `json:"total_points"`
	QuestionIDs     []string           `json:"question_ids"`
	QuestionPoints  map[string]float64 `json:"question_points"`
}

func (r *Repo) CreateExamCMS(ctx context.Context, in CreateExamInput) (models.ExamSummary, error) {
	if len(in.QuestionIDs) == 0 {
		return models.ExamSummary{}, errors.New("cần chọn ít nhất 1 câu hỏi cho đề thi")
	}
	var subjectID int
	var subjectName string
	if err := r.PG.QueryRow(ctx, `SELECT id, name FROM subjects WHERE code = $1`, in.SubjectCode).Scan(&subjectID, &subjectName); err != nil {
		return models.ExamSummary{}, fmt.Errorf("không tìm thấy môn '%s'", in.SubjectCode)
	}
	if in.Mode == "" {
		in.Mode = "practice"
	}
	if in.DurationMinutes <= 0 {
		in.DurationMinutes = 45
	}
	if in.TotalPoints <= 0 {
		in.TotalPoints = 10.0
	}
	if in.Slug == "" {
		in.Slug = fmt.Sprintf("exam-%s-%d-%d", in.SubjectCode, in.GradeID, time.Now().UnixMilli()%100000)
	}

	var examID string
	var startsAt time.Time
	err := r.PG.QueryRow(ctx, `
		INSERT INTO exams (grade_id, subject_id, title, slug, mode, duration_minutes, total_points, question_count, starts_at, is_published)
		VALUES ($1, $2, $3, $4, $5::exam_mode, $6, $7, $8, NOW(), TRUE)
		RETURNING id::text, starts_at
	`, in.GradeID, subjectID, strings.TrimSpace(in.Title), in.Slug, in.Mode, in.DurationMinutes, in.TotalPoints, len(in.QuestionIDs)).Scan(&examID, &startsAt)
	if err != nil {
		return models.ExamSummary{}, err
	}

	perQ := in.TotalPoints / float64(len(in.QuestionIDs))
	for i, qid := range in.QuestionIDs {
		pts := perQ
		if custom, ok := in.QuestionPoints[qid]; ok && custom > 0 {
			pts = custom
		}
		_, err := r.PG.Exec(ctx, `
			INSERT INTO exam_questions (exam_id, question_id, display_order, points)
			VALUES ($1::uuid, $2::uuid, $3, $4)
			ON CONFLICT (exam_id, question_id) DO NOTHING
		`, examID, qid, i+1, pts)
		if err != nil {
			return models.ExamSummary{}, err
		}
	}

	return models.ExamSummary{
		ID:              examID,
		GradeID:         in.GradeID,
		SubjectCode:     in.SubjectCode,
		SubjectName:     subjectName,
		Title:           in.Title,
		Slug:            in.Slug,
		Mode:            in.Mode,
		DurationMinutes: in.DurationMinutes,
		TotalPoints:     in.TotalPoints,
		QuestionCount:   len(in.QuestionIDs),
		BundleVersion:   1,
		StartsAt:        startsAt,
	}, nil
}

func (r *Repo) ListExams(ctx context.Context, gradeID int) ([]models.ExamSummary, error) {
	query := `
		SELECT e.id::text, e.grade_id, s.code, s.name, e.title, e.slug, e.mode::text,
		       e.duration_minutes, e.total_points::float8, e.question_count, e.bundle_version,
		       COALESCE(e.starts_at, e.created_at),
		       (SELECT COUNT(*) FROM exam_attempts a WHERE a.exam_id = e.id)
		FROM exams e
		JOIN subjects s ON e.subject_id = s.id
		WHERE e.is_published = TRUE
	`
	args := []any{}
	if gradeID > 0 {
		query += " AND e.grade_id = $1"
		args = append(args, gradeID)
	}
	query += " ORDER BY e.created_at DESC"

	rows, err := r.PG.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]models.ExamSummary, 0)
	for rows.Next() {
		var ex models.ExamSummary
		if err := rows.Scan(
			&ex.ID, &ex.GradeID, &ex.SubjectCode, &ex.SubjectName, &ex.Title, &ex.Slug, &ex.Mode,
			&ex.DurationMinutes, &ex.TotalPoints, &ex.QuestionCount, &ex.BundleVersion, &ex.StartsAt, &ex.ParticipantCnt,
		); err != nil {
			return nil, err
		}
		out = append(out, ex)
	}
	return out, nil
}

// ResolveExamID chấp nhận cả UUID lẫn slug thân thiện (VD: exam-toan-12-thpt-2025).
func (r *Repo) ResolveExamID(ctx context.Context, idOrSlug string) (string, error) {
	var uid string
	err := r.PG.QueryRow(ctx, `
		SELECT id::text FROM exams WHERE id::text = $1 OR slug = $1 LIMIT 1
	`, idOrSlug).Scan(&uid)
	if err != nil {
		return "", errors.New("không tìm thấy kỳ thi")
	}
	return uid, nil
}

func (r *Repo) GetExamWithQuestions(ctx context.Context, examUUID string) (models.ExamSummary, []models.QuestionInternal, error) {
	var ex models.ExamSummary
	err := r.PG.QueryRow(ctx, `
		SELECT e.id::text, e.grade_id, s.code, s.name, e.title, e.slug, e.mode::text,
		       e.duration_minutes, e.total_points::float8, e.question_count, e.bundle_version,
		       COALESCE(e.starts_at, e.created_at)
		FROM exams e
		JOIN subjects s ON e.subject_id = s.id
		WHERE e.id = $1::uuid
	`, examUUID).Scan(
		&ex.ID, &ex.GradeID, &ex.SubjectCode, &ex.SubjectName, &ex.Title, &ex.Slug, &ex.Mode,
		&ex.DurationMinutes, &ex.TotalPoints, &ex.QuestionCount, &ex.BundleVersion, &ex.StartsAt,
	)
	if err != nil {
		return ex, nil, err
	}

	rows, err := r.PG.Query(ctx, `
		SELECT q.id::text, q.grade_id, s.code, s.name, q.topic, q.q_type::text, q.difficulty::text,
		       q.content_mdx, q.options_json, q.answer_key_json, COALESCE(q.explanation_mdx,''), eq.points::float8
		FROM exam_questions eq
		JOIN questions q ON eq.question_id = q.id
		JOIN subjects s ON q.subject_id = s.id
		WHERE eq.exam_id = $1::uuid
		ORDER BY eq.display_order ASC
	`, examUUID)
	if err != nil {
		return ex, nil, err
	}
	defer rows.Close()

	var qs []models.QuestionInternal
	for rows.Next() {
		var q models.QuestionInternal
		var optRaw, ansRaw []byte
		var pts float64
		if err := rows.Scan(
			&q.ID, &q.GradeID, &q.SubjectCode, &q.SubjectName, &q.Topic, &q.QType, &q.Difficulty,
			&q.ContentMDX, &optRaw, &ansRaw, &q.ExplanationMDX, &pts,
		); err != nil {
			return ex, nil, err
		}
		decodeQuestionJSON(&q, optRaw, ansRaw)
		q.Points = pts
		qs = append(qs, q)
	}
	return ex, qs, nil
}

func (r *Repo) CreateAttempt(ctx context.Context, examUUID string, userID *string, userName string, shuffleSeed int) (string, time.Time, error) {
	var attemptID string
	var startedAt time.Time
	err := r.PG.QueryRow(ctx, `
		INSERT INTO exam_attempts (exam_id, user_id, user_name, status, shuffle_seed)
		VALUES ($1::uuid, $2::uuid, $3, 'in_progress', $4)
		RETURNING id::text, started_at
	`, examUUID, userID, userName, shuffleSeed).Scan(&attemptID, &startedAt)
	return attemptID, startedAt, err
}

func (r *Repo) SaveAutosaveRedis(ctx context.Context, attemptID string, answers map[string]any) error {
	if len(answers) == 0 {
		return nil
	}
	key := "exam:draft:" + attemptID
	fields := make(map[string]any, len(answers))
	for qid, ans := range answers {
		b, _ := json.Marshal(ans)
		fields[qid] = string(b)
	}
	if err := r.Redis.HSet(ctx, key, fields).Err(); err != nil {
		return err
	}
	return r.Redis.Expire(ctx, key, 4*time.Hour).Err()
}

func (r *Repo) MarkAttemptQueued(ctx context.Context, attemptID string, answers map[string]any, cheatFlags []models.CheatFlag) error {
	ansJSON, _ := json.Marshal(answers)
	flagsJSON, _ := json.Marshal(cheatFlags)
	_, err := r.PG.Exec(ctx, `
		UPDATE exam_attempts
		SET status = 'submitted_queued', submitted_at = NOW(),
		    answers_snapshot = $2::jsonb, cheat_flags_json = $3::jsonb
		WHERE id = $1::uuid AND status = 'in_progress'
	`, attemptID, ansJSON, flagsJSON)
	return err
}

func (r *Repo) SaveGradedAttempt(
	ctx context.Context,
	attemptID string,
	examUUID string,
	userName string,
	score float64,
	correctCount int,
	wrongCount int,
	durationSec int,
	latencyUs int64,
	details []models.QuestionGradeDetail,
) error {
	detailsJSON, _ := json.Marshal(details)
	_, err := r.PG.Exec(ctx, `
		UPDATE exam_attempts
		SET status = 'graded', graded_at = NOW(), score = $2, correct_count = $3,
		    wrong_count = $4, duration_sec = $5, grading_latency_us = $6, details_snapshot = $7::jsonb
		WHERE id = $1::uuid
	`, attemptID, score, correctCount, wrongCount, durationSec, latencyUs, detailsJSON)
	if err != nil {
		return err
	}

	// Cập nhật Redis Sorted Set Leaderboard tức thì (score chính - thời gian nhỏ làm tie-breaker)
	memberObj, _ := json.Marshal(map[string]any{
		"attempt_id":   attemptID,
		"user_name":    userName,
		"duration_sec": durationSec,
		"submitted_at": time.Now().UTC().Format(time.RFC3339),
	})
	compositeScore := score - float64(durationSec)/1_000_000.0
	_ = r.Redis.ZAdd(ctx, "exam:lb:"+examUUID, redis.Z{
		Score:  compositeScore,
		Member: string(memberObj),
	}).Err()

	return nil
}

func (r *Repo) GetAttempt(ctx context.Context, attemptID string) (*models.ExamAttempt, error) {
	var att models.ExamAttempt
	var userID *string
	var ansRaw, flagsRaw, detailsRaw []byte
	var totalPts float64
	var qCount int

	err := r.PG.QueryRow(ctx, `
		SELECT a.id::text, a.exam_id::text, a.user_id::text, a.user_name, a.status::text, a.shuffle_seed,
		       a.started_at, a.submitted_at, a.graded_at, COALESCE(a.duration_sec,0),
		       COALESCE(a.score,0)::float8, COALESCE(a.correct_count,0), COALESCE(a.grading_latency_us,0),
		       a.answers_snapshot, a.cheat_flags_json, a.details_snapshot,
		       e.total_points::float8, e.question_count
		FROM exam_attempts a
		JOIN exams e ON a.exam_id = e.id
		WHERE a.id = $1::uuid
	`, attemptID).Scan(
		&att.ID, &att.ExamID, &userID, &att.UserName, &att.Status, &att.ShuffleSeed,
		&att.StartedAt, &att.SubmittedAt, &att.GradedAt, &att.DurationSec,
		&att.Score, &att.CorrectCount, &att.GradingLatencyUs,
		&ansRaw, &flagsRaw, &detailsRaw, &totalPts, &qCount,
	)
	if err != nil {
		return nil, err
	}
	if userID != nil {
		att.UserID = *userID
	}
	att.MaxScore = totalPts
	att.TotalQuestions = qCount
	_ = json.Unmarshal(ansRaw, &att.Answers)
	_ = json.Unmarshal(flagsRaw, &att.CheatFlags)
	_ = json.Unmarshal(detailsRaw, &att.Details)
	return &att, nil
}

func (r *Repo) GetLeaderboard(ctx context.Context, examUUID string) ([]models.LeaderboardEntry, error) {
	// Ưu tiên đọc từ Redis Sorted Set (< 1ms)
	zs, err := r.Redis.ZRevRangeWithScores(ctx, "exam:lb:"+examUUID, 0, 29).Result()
	if err == nil && len(zs) > 0 {
		out := make([]models.LeaderboardEntry, 0, len(zs))
		for idx, z := range zs {
			var meta struct {
				AttemptID   string `json:"attempt_id"`
				UserName    string `json:"user_name"`
				DurationSec int    `json:"duration_sec"`
				SubmittedAt string `json:"submitted_at"`
			}
			if str, ok := z.Member.(string); ok {
				_ = json.Unmarshal([]byte(str), &meta)
			}
			// Làm tròn lại điểm thật từ compositeScore
			cleanScore := float64(int(z.Score*100+0.5)) / 100.0
			out = append(out, models.LeaderboardEntry{
				Rank:        idx + 1,
				UserID:      meta.AttemptID,
				UserName:    meta.UserName,
				Score:       cleanScore,
				DurationSec: meta.DurationSec,
				SubmittedAt: meta.SubmittedAt,
			})
		}
		return out, nil
	}

	// Fallback đọc từ PostgreSQL nếu Redis cold
	rows, err := r.PG.Query(ctx, `
		SELECT id::text, user_name, COALESCE(score,0)::float8, COALESCE(duration_sec,0), COALESCE(graded_at, created_at)
		FROM exam_attempts
		WHERE exam_id = $1::uuid AND status = 'graded'
		ORDER BY score DESC, duration_sec ASC
		LIMIT 30
	`, examUUID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]models.LeaderboardEntry, 0)
	rank := 1
	for rows.Next() {
		var item models.LeaderboardEntry
		var ts time.Time
		if err := rows.Scan(&item.UserID, &item.UserName, &item.Score, &item.DurationSec, &ts); err == nil {
			item.Rank = rank
			item.SubmittedAt = ts.Format(time.RFC3339)
			out = append(out, item)
			rank++
		}
	}
	return out, nil
}

// =============================================================================
// HELPERS
// =============================================================================

type rowScanner interface {
	Scan(dest ...any) error
}

func scanQuestionRow(row rowScanner) (models.QuestionInternal, error) {
	var q models.QuestionInternal
	var optRaw, ansRaw []byte
	err := row.Scan(
		&q.ID, &q.GradeID, &q.SubjectCode, &q.SubjectName, &q.Topic, &q.QType, &q.Difficulty,
		&q.ContentMDX, &optRaw, &ansRaw, &q.ExplanationMDX,
	)
	if err != nil {
		return q, err
	}
	decodeQuestionJSON(&q, optRaw, ansRaw)
	q.Points = defaultPointsForType(q.QType)
	return q, nil
}

func decodeQuestionJSON(q *models.QuestionInternal, optRaw, ansRaw []byte) {
	var optObj struct {
		Options  []models.QuestionOption `json:"options"`
		UnitHint string                  `json:"unit_hint"`
	}
	_ = json.Unmarshal(optRaw, &optObj)
	q.Options = optObj.Options
	q.UnitHint = optObj.UnitHint

	var ansObj struct {
		Single    string          `json:"single"`
		Multi     []string        `json:"multi"`
		TrueFalse map[string]bool `json:"true_false"`
		Short     []string        `json:"short"`
	}
	_ = json.Unmarshal(ansRaw, &ansObj)
	q.AnswerSingle = ansObj.Single
	q.AnswerMulti = ansObj.Multi
	q.AnswerTrueFalse = ansObj.TrueFalse
	q.AnswerShort = ansObj.Short
}

func defaultPointsForType(qType string) float64 {
	switch qType {
	case "true_false_group":
		return 4.0
	case "short_answer":
		return 3.0
	case "multi_choice":
		return 2.5
	default:
		return 2.0
	}
}

var nonAlnum = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	repl := strings.NewReplacer(
		"á", "a", "à", "a", "ả", "a", "ã", "a", "ạ", "a",
		"ă", "a", "ắ", "a", "ằ", "a", "ẳ", "a", "ẵ", "a", "ặ", "a",
		"â", "a", "ấ", "a", "ầ", "a", "ẩ", "a", "ẫ", "a", "ậ", "a",
		"đ", "d",
		"é", "e", "è", "e", "ẻ", "e", "ẽ", "e", "ẹ", "e",
		"ê", "e", "ế", "e", "ề", "e", "ể", "e", "ễ", "e", "ệ", "e",
		"í", "i", "ì", "i", "ỉ", "i", "ĩ", "i", "ị", "i",
		"ó", "o", "ò", "o", "ỏ", "o", "õ", "o", "ọ", "o",
		"ô", "o", "ố", "o", "ồ", "o", "ổ", "o", "ỗ", "o", "ộ", "o",
		"ơ", "o", "ớ", "o", "ờ", "o", "ở", "o", "ỡ", "o", "ợ", "o",
		"ú", "u", "ù", "u", "ủ", "u", "ũ", "u", "ụ", "u",
		"ư", "u", "ứ", "u", "ừ", "u", "ử", "u", "ữ", "u", "ự", "u",
		"ý", "y", "ỳ", "y", "ỷ", "y", "ỹ", "y", "ỵ", "y",
	)
	s = repl.Replace(s)
	s = nonAlnum.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		return "item"
	}
	if len(s) > 80 {
		return s[:80]
	}
	return s
}

func intPtr(v int) *int {
	return &v
}

// Kiểm tra kết nối health cho /api/v1/metrics
func (r *Repo) PingAll(ctx context.Context) (pgOK bool, redisOK bool) {
	if r.PG != nil && r.PG.Ping(ctx) == nil {
		pgOK = true
	}
	if r.Redis != nil && r.Redis.Ping(ctx).Err() == nil {
		redisOK = true
	}
	return
}

// Không dùng biến unused nếu pgx chưa gọi trực tiếp
var _ = pgx.ErrNoRows
