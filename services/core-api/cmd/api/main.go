package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"edu-website/core-api/internal/auth"
	"edu-website/core-api/internal/db"
	"edu-website/core-api/internal/exam"
	"edu-website/core-api/internal/models"
)

func main() {
	port := envOr("PORT", "8080")
	databaseURL := envOr("DATABASE_URL", "postgres://edu_admin:edu_dev_password@127.0.0.1:5432/edu_k12?sslmode=disable")
	redisAddr := envOr("REDIS_ADDR", "127.0.0.1:6379")
	kafkaBrokers := strings.Split(envOr("KAFKA_BROKERS", "127.0.0.1:19092"), ",")

	ctx := context.Background()
	repo, err := db.Connect(ctx, databaseURL, redisAddr)
	if err != nil {
		log.Fatalf("❌ Failed to connect data layer: %v", err)
	}
	defer repo.Close()

	examEngine, err := exam.NewEngine(ctx, repo, kafkaBrokers)
	if err != nil {
		log.Fatalf("❌ Failed to start exam engine: %v", err)
	}
	defer examEngine.Close()

	authSvc := auth.NewService()
	requireStaff := authSvc.RequireRoles("teacher", "content_admin", "super_admin")
	requireAdmin := authSvc.RequireRoles("super_admin")

	mux := http.NewServeMux()

	// === HEALTH & TELEMETRY ===
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		pgOK, redisOK := repo.PingAll(r.Context())
		writeJSON(w, http.StatusOK, map[string]any{
			"status":      "ok",
			"service":     "edu-core-api-go",
			"postgres_ok": pgOK,
			"redis_ok":    redisOK,
			"timestamp":   time.Now().UTC().Format(time.RFC3339),
		})
	})

	mux.HandleFunc("GET /api/v1/metrics", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, examEngine.Metrics(r.Context()))
	})

	// === 1. AUTHENTICATION & RBAC (Stateless JWT + Redis Refresh Token) ===
	mux.HandleFunc("POST /api/v1/auth/register", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Email        string `json:"email"`
			Password     string `json:"password"`
			FullName     string `json:"full_name"`
			Role         string `json:"role"`
			CurrentGrade *int   `json:"current_grade"`
			SchoolName   string `json:"school_name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "dữ liệu đăng ký không hợp lệ"})
			return
		}
		if strings.TrimSpace(req.Email) == "" || len(req.Password) < 6 || strings.TrimSpace(req.FullName) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Vui lòng nhập đầy đủ Email, Họ tên và Mật khẩu (>= 6 ký tự)"})
			return
		}
		// Chỉ cho tự đăng ký học sinh hoặc giáo viên (admin phải do super_admin cấp)
		role := "student"
		if req.Role == "teacher" || req.Role == "parent" {
			role = req.Role
		}

		hash, err := auth.HashPassword(req.Password)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "lỗi mã hóa mật khẩu"})
			return
		}
		u, err := repo.CreateUser(r.Context(), req.Email, hash, req.FullName, role, req.SchoolName, req.CurrentGrade)
		if err != nil {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "Email đã tồn tại trong hệ thống"})
			return
		}
		accessToken, _ := authSvc.GenerateAccessToken(u)
		refreshToken := auth.GenerateRefreshToken()
		_ = repo.StoreRefreshToken(r.Context(), refreshToken, u.ID)

		writeJSON(w, http.StatusCreated, map[string]any{
			"access_token":  accessToken,
			"refresh_token": refreshToken,
			"user":          u,
		})
	})

	mux.HandleFunc("POST /api/v1/auth/login", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "dữ liệu không hợp lệ"})
			return
		}
		u, passHash, err := repo.GetUserByEmail(r.Context(), req.Email)
		if err != nil || !auth.VerifyPassword(passHash, req.Password) {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Email hoặc mật khẩu không đúng"})
			return
		}
		accessToken, _ := authSvc.GenerateAccessToken(u)
		refreshToken := auth.GenerateRefreshToken()
		_ = repo.StoreRefreshToken(r.Context(), refreshToken, u.ID)

		writeJSON(w, http.StatusOK, map[string]any{
			"access_token":  accessToken,
			"refresh_token": refreshToken,
			"user":          u,
		})
	})

	mux.HandleFunc("POST /api/v1/auth/refresh", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			RefreshToken string `json:"refresh_token"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		uid, err := repo.ValidateRefreshToken(r.Context(), req.RefreshToken)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Refresh token hết hạn hoặc không hợp lệ"})
			return
		}
		u, err := repo.GetUserByID(r.Context(), uid)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Không tìm thấy người dùng"})
			return
		}
		accessToken, _ := authSvc.GenerateAccessToken(u)
		writeJSON(w, http.StatusOK, map[string]any{"access_token": accessToken, "user": u})
	})

	mux.HandleFunc("POST /api/v1/auth/logout", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			RefreshToken string `json:"refresh_token"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		if req.RefreshToken != "" {
			_ = repo.RevokeRefreshToken(r.Context(), req.RefreshToken)
		}
		w.WriteHeader(http.StatusNoContent)
	})

	mux.HandleFunc("GET /api/v1/auth/me", authSvc.RequireRoles()(func(w http.ResponseWriter, r *http.Request) {
		claims := auth.ClaimsFromContext(r.Context())
		u, err := repo.GetUserByID(r.Context(), claims.UserID)
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Không tìm thấy tài khoản"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"user": u})
	}))

	// === 2. CHƯƠNG TRÌNH HỌC LỚP 1-12 & TÀI LIỆU (PostgreSQL) ===
	mux.HandleFunc("GET /api/v1/grades", func(w http.ResponseWriter, r *http.Request) {
		grades, err := repo.ListGrades(r.Context())
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		w.Header().Set("Cache-Control", "public, s-maxage=86400")
		writeJSON(w, http.StatusOK, map[string]any{"grades": grades})
	})

	mux.HandleFunc("GET /api/v1/subjects", func(w http.ResponseWriter, r *http.Request) {
		subjects, err := repo.ListSubjects(r.Context())
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"subjects": subjects})
	})

	mux.HandleFunc("GET /api/v1/lessons", func(w http.ResponseWriter, r *http.Request) {
		gradeFilter, _ := strconv.Atoi(r.URL.Query().Get("grade"))
		lessons, err := repo.ListLessons(r.Context(), gradeFilter, r.URL.Query().Get("subject"), r.URL.Query().Get("textbook"))
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"lessons": lessons})
	})

	// === 3. BÀI TẬP TRỰC TUYẾN ===
	mux.HandleFunc("GET /api/v1/exercises", func(w http.ResponseWriter, r *http.Request) {
		gradeFilter, _ := strconv.Atoi(r.URL.Query().Get("grade"))
		sets, err := repo.ListExerciseSets(r.Context(), gradeFilter)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"exercise_sets": sets})
	})

	mux.HandleFunc("POST /api/v1/exercises/check", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			QuestionID string `json:"question_id"`
			Answer     any    `json:"answer"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "dữ liệu không hợp lệ"})
			return
		}
		q, err := repo.GetQuestionByID(r.Context(), req.QuestionID)
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "không tìm thấy câu hỏi"})
			return
		}
		detail := exam.GradeSingleQuestion(q, req.Answer)
		writeJSON(w, http.StatusOK, detail)
	})

	// === 4. THI TRẮC NGHIỆM QUY MÔ 1M CCU (Redis + Kafka + PostgreSQL) ===
	mux.HandleFunc("GET /api/v1/exams", func(w http.ResponseWriter, r *http.Request) {
		gradeFilter, _ := strconv.Atoi(r.URL.Query().Get("grade"))
		exams, err := repo.ListExams(r.Context(), gradeFilter)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"exams": exams})
	})

	mux.HandleFunc("GET /api/v1/exams/{examId}/bundle", func(w http.ResponseWriter, r *http.Request) {
		bundle, err := examEngine.GetEncryptedBundle(r.Context(), r.PathValue("examId"))
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
			return
		}
		w.Header().Set("Cache-Control", "public, max-age=3600, s-maxage=86400")
		writeJSON(w, http.StatusOK, bundle)
	})

	mux.HandleFunc("POST /api/v1/exams/{examId}/start", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			UserName string `json:"user_name"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)

		var userID *string
		userName := req.UserName
		if claims, err := authSvc.ExtractClaims(r); err == nil {
			uid := claims.UserID
			userID = &uid
			if strings.TrimSpace(userName) == "" {
				userName = claims.FullName
			}
		}

		res, err := examEngine.StartExam(r.Context(), r.PathValue("examId"), userID, userName)
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, res)
	})

	mux.HandleFunc("PATCH /api/v1/attempts/{attemptId}/autosave", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Answers map[string]any `json:"answers"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "payload không hợp lệ"})
			return
		}
		if err := examEngine.Autosave(r.Context(), r.PathValue("attemptId"), req.Answers); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	mux.HandleFunc("POST /api/v1/attempts/{attemptId}/submit", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Answers    map[string]any     `json:"answers"`
			CheatFlags []models.CheatFlag `json:"cheat_flags"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "payload không hợp lệ"})
			return
		}
		attemptID := r.PathValue("attemptId")
		if err := examEngine.EnqueueSubmit(r.Context(), attemptID, r.Header.Get("Idempotency-Key"), req.Answers, req.CheatFlags); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusAccepted, map[string]any{
			"attempt_id": attemptID,
			"status":     "submitted_queued",
			"message":    "Bài thi đã được đẩy vào Redpanda Kafka để chấm điểm.",
			"poll_url":   "/api/v1/attempts/" + attemptID + "/result",
		})
	})

	mux.HandleFunc("GET /api/v1/attempts/{attemptId}/result", func(w http.ResponseWriter, r *http.Request) {
		att, err := repo.GetAttempt(r.Context(), r.PathValue("attemptId"))
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "không tìm thấy kết quả bài thi"})
			return
		}
		writeJSON(w, http.StatusOK, att)
	})

	mux.HandleFunc("GET /api/v1/exams/{examId}/leaderboard", func(w http.ResponseWriter, r *http.Request) {
		examUUID, err := repo.ResolveExamID(r.Context(), r.PathValue("examId"))
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
			return
		}
		lb, err := repo.GetLeaderboard(r.Context(), examUUID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"exam_id": examUUID, "leaderboard": lb})
	})

	// === 5. TRANG QUẢN TRỊ CMS (Yêu cầu quyền Giáo viên / Admin) ===
	mux.HandleFunc("POST /api/v1/cms/lessons", requireStaff(func(w http.ResponseWriter, r *http.Request) {
		var in db.CreateLessonInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "dữ liệu bài học không hợp lệ"})
			return
		}
		les, err := repo.CreateLessonCMS(r.Context(), in)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusCreated, map[string]any{"lesson": les})
	}))

	mux.HandleFunc("GET /api/v1/cms/questions", requireStaff(func(w http.ResponseWriter, r *http.Request) {
		gradeFilter, _ := strconv.Atoi(r.URL.Query().Get("grade"))
		qs, err := repo.ListQuestions(r.Context(), gradeFilter, r.URL.Query().Get("subject"))
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"questions": qs})
	}))

	mux.HandleFunc("POST /api/v1/cms/questions", requireStaff(func(w http.ResponseWriter, r *http.Request) {
		var in db.CreateQuestionInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "dữ liệu câu hỏi không hợp lệ"})
			return
		}
		in.CreatedBy = auth.ClaimsFromContext(r.Context()).UserID
		q, err := repo.CreateQuestionCMS(r.Context(), in)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusCreated, map[string]any{"question": q})
	}))

	mux.HandleFunc("POST /api/v1/cms/exams", requireStaff(func(w http.ResponseWriter, r *http.Request) {
		var in db.CreateExamInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "dữ liệu đề thi không hợp lệ"})
			return
		}
		ex, err := repo.CreateExamCMS(r.Context(), in)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		// Tự động mã hóa gói đề AES-256-GCM và đẩy lên Redis ngay lập tức
		if err := examEngine.BuildAndCacheEncryptedBundle(r.Context(), ex.ID); err != nil {
			log.Printf("⚠️ Failed to encrypt new CMS exam %s: %v", ex.ID, err)
		}
		writeJSON(w, http.StatusCreated, map[string]any{"exam": ex})
	}))

	// === BULK IMPORT PRODUCTION (Nhập hàng loạt Bài giảng 1-12 & Đề thi chuẩn) ===
	mux.HandleFunc("POST /api/v1/cms/import/lessons", requireStaff(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Lessons []db.CreateLessonInput `json:"lessons"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.Lessons) == 0 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "cần truyền mảng 'lessons' hợp lệ"})
			return
		}
		report := repo.BulkImportLessonsCMS(r.Context(), req.Lessons)
		writeJSON(w, http.StatusOK, report)
	}))

	mux.HandleFunc("POST /api/v1/cms/import/exams", requireStaff(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Exams []db.BulkExamImportInput `json:"exams"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.Exams) == 0 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "cần truyền mảng 'exams' hợp lệ"})
			return
		}
		staffID := auth.ClaimsFromContext(r.Context()).UserID
		created := make([]models.ExamSummary, 0, len(req.Exams))
		var errs []string
		for idx, exIn := range req.Exams {
			exIn.CreatedBy = staffID
			ex, err := repo.BulkImportExamWithQuestionsCMS(r.Context(), exIn)
			if err != nil {
				errs = append(errs, "Đề #"+strconv.Itoa(idx+1)+" ("+exIn.Title+"): "+err.Error())
				continue
			}
			_ = examEngine.BuildAndCacheEncryptedBundle(r.Context(), ex.ID)
			created = append(created, ex)
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"total":    len(req.Exams),
			"imported": len(created),
			"exams":    created,
			"errors":   errs,
		})
	}))

	mux.HandleFunc("GET /api/v1/admin/users", requireAdmin(func(w http.ResponseWriter, r *http.Request) {
		users, err := repo.ListUsers(r.Context())
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"users": users})
	}))

	mux.HandleFunc("PATCH /api/v1/admin/users/{userId}/role", requireAdmin(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Role string `json:"role"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "role không hợp lệ"})
			return
		}
		if err := repo.UpdateUserRole(r.Context(), r.PathValue("userId"), req.Role); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
	}))

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           corsMiddleware(mux),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("🚀 Edu Core & Exam API (Go + PostgreSQL + Redis + Kafka) listening on http://localhost:%s", port)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}
