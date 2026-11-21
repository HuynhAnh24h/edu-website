package db

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"edu-website/core-api/internal/models"
)

type BulkLessonsReport struct {
	Total     int      `json:"total"`
	Imported  int      `json:"imported"`
	Updated   int      `json:"updated"`
	Errors    []string `json:"errors,omitempty"`
	LessonIDs []string `json:"lesson_ids"`
}

// UpsertLessonCMS thêm mới hoặc cập nhật bài giảng theo (chapter_id, slug) để import lại không bị trùng.
func (r *Repo) UpsertLessonCMS(ctx context.Context, in CreateLessonInput) (models.Lesson, bool, error) {
	if in.GradeID < 1 || in.GradeID > 12 {
		return models.Lesson{}, false, errors.New("khối lớp phải từ 1 đến 12")
	}
	if strings.TrimSpace(in.Title) == "" {
		return models.Lesson{}, false, errors.New("tiêu đề bài giảng không được trống")
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
		return models.Lesson{}, false, fmt.Errorf("không tìm thấy môn học '%s'", in.SubjectCode)
	}

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
		return models.Lesson{}, false, err
	}

	chSlug := slugify(in.Chapter)
	var chapterID string
	err = r.PG.QueryRow(ctx, `
		INSERT INTO chapters (course_id, title, slug)
		VALUES ($1::uuid, $2, $3)
		ON CONFLICT (course_id, slug) DO UPDATE SET title = EXCLUDED.title
		RETURNING id::text
	`, courseID, in.Chapter, chSlug).Scan(&chapterID)
	if err != nil {
		return models.Lesson{}, false, err
	}

	lesSlug := slugify(in.Title)
	var existingID string
	_ = r.PG.QueryRow(ctx, `SELECT id::text FROM lessons WHERE chapter_id = $1::uuid AND slug = $2`, chapterID, lesSlug).Scan(&existingID)
	isUpdate := existingID != ""

	var lessonID string
	err = r.PG.QueryRow(ctx, `
		INSERT INTO lessons (chapter_id, title, slug, summary, content_mdx, duration_min, is_published, updated_at)
		VALUES ($1::uuid, $2, $3, $4, $5, $6, TRUE, NOW())
		ON CONFLICT (chapter_id, slug) DO UPDATE
		SET title = EXCLUDED.title,
		    summary = EXCLUDED.summary,
		    content_mdx = EXCLUDED.content_mdx,
		    duration_min = EXCLUDED.duration_min,
		    updated_at = NOW()
		RETURNING id::text
	`, chapterID, strings.TrimSpace(in.Title), lesSlug, in.Summary, in.ContentMDX, in.DurationMin).Scan(&lessonID)
	if err != nil {
		return models.Lesson{}, false, err
	}

	// Chỉ thêm tài liệu đính kèm nếu bài mới (hoặc chưa có tài liệu cùng tên)
	createdMaterials := make([]models.StudyMaterial, 0, len(in.Materials))
	for _, m := range in.Materials {
		if strings.TrimSpace(m.Title) == "" {
			continue
		}
		var existsMat int
		_ = r.PG.QueryRow(ctx, `SELECT COUNT(*) FROM study_materials WHERE lesson_id = $1::uuid AND title = $2`, lessonID, m.Title).Scan(&existsMat)
		if existsMat > 0 {
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
	}, isUpdate, nil
}

func (r *Repo) BulkImportLessonsCMS(ctx context.Context, items []CreateLessonInput) BulkLessonsReport {
	report := BulkLessonsReport{
		Total:     len(items),
		LessonIDs: make([]string, 0, len(items)),
	}
	for i, item := range items {
		les, updated, err := r.UpsertLessonCMS(ctx, item)
		if err != nil {
			report.Errors = append(report.Errors, fmt.Sprintf("Bài #%d (%s): %v", i+1, item.Title, err))
			continue
		}
		if updated {
			report.Updated++
		} else {
			report.Imported++
		}
		report.LessonIDs = append(report.LessonIDs, les.ID)
	}
	return report
}

type BulkExamImportInput struct {
	GradeID         int                   `json:"grade_id"`
	SubjectCode     string                `json:"subject_code"`
	Title           string                `json:"title"`
	Slug            string                `json:"slug"`
	Mode            string                `json:"mode"`
	DurationMinutes int                   `json:"duration_minutes"`
	TotalPoints     float64               `json:"total_points"`
	Questions       []CreateQuestionInput `json:"questions"`
	CreatedBy       string                `json:"-"`
}

// BulkImportExamWithQuestionsCMS import trọn bộ 1 đề thi kèm danh sách câu hỏi mới.
func (r *Repo) BulkImportExamWithQuestionsCMS(ctx context.Context, in BulkExamImportInput) (models.ExamSummary, error) {
	if strings.TrimSpace(in.Title) == "" {
		return models.ExamSummary{}, errors.New("tên đề thi không được trống")
	}
	if len(in.Questions) == 0 {
		return models.ExamSummary{}, errors.New("đề thi phải có ít nhất 1 câu hỏi")
	}
	if in.TotalPoints <= 0 {
		in.TotalPoints = 10.0
	}
	if in.DurationMinutes <= 0 {
		in.DurationMinutes = 50
	}
	if in.Mode == "" {
		in.Mode = "mock_live"
	}

	slug := strings.TrimSpace(in.Slug)
	if slug == "" {
		slug = slugify(fmt.Sprintf("%s-lop-%d-%s", in.SubjectCode, in.GradeID, in.Title))
	}

	// Nếu slug đã tồn tại, trả về đề hiện có tránh nhân bản khi re-import
	var existingID string
	_ = r.PG.QueryRow(ctx, `SELECT id::text FROM exams WHERE slug = $1`, slug).Scan(&existingID)
	if existingID != "" {
		ex, _, err := r.GetExamWithQuestions(ctx, existingID)
		return ex, err
	}

	qIDs := make([]string, 0, len(in.Questions))
	qPts := make(map[string]float64, len(in.Questions))

	// Tính trọng số điểm hợp lý chuẩn GDPT 2018 nếu không chỉ định
	totalWeight := 0.0
	weights := make([]float64, len(in.Questions))
	for i, q := range in.Questions {
		w := 1.0
		if q.QType == "true_false_group" {
			w = 2.0
		} else if q.QType == "short_answer" {
			w = 1.5
		}
		weights[i] = w
		totalWeight += w
	}

	for i, qIn := range in.Questions {
		if qIn.GradeID == 0 {
			qIn.GradeID = in.GradeID
		}
		if qIn.SubjectCode == "" {
			qIn.SubjectCode = in.SubjectCode
		}
		qIn.CreatedBy = in.CreatedBy
		createdQ, err := r.CreateQuestionCMS(ctx, qIn)
		if err != nil {
			return models.ExamSummary{}, fmt.Errorf("lỗi câu hỏi #%d: %w", i+1, err)
		}
		qIDs = append(qIDs, createdQ.ID)
		qPts[createdQ.ID] = (weights[i] / totalWeight) * in.TotalPoints
	}

	return r.CreateExamCMS(ctx, CreateExamInput{
		GradeID:         in.GradeID,
		SubjectCode:     in.SubjectCode,
		Title:           in.Title,
		Slug:            slug,
		Mode:            in.Mode,
		DurationMinutes: in.DurationMinutes,
		TotalPoints:     in.TotalPoints,
		QuestionIDs:     qIDs,
		QuestionPoints:  qPts,
	})
}
