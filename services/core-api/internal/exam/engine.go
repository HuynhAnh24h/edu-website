package exam

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	mrand "math/rand/v2"
	"runtime"
	"sort"
	"strings"
	"sync/atomic"
	"time"

	"github.com/twmb/franz-go/pkg/kadm"
	"github.com/twmb/franz-go/pkg/kgo"

	"edu-website/core-api/internal/db"
	"edu-website/core-api/internal/models"
)

const SubmissionTopic = "exam.submissions"

type SubmitEvent struct {
	AttemptID  string             `json:"attempt_id"`
	ExamID     string             `json:"exam_id"`
	UserName   string             `json:"user_name"`
	Answers    map[string]any     `json:"answers"`
	CheatFlags []models.CheatFlag `json:"cheat_flags"`
	EnqueuedAt time.Time          `json:"enqueued_at"`
}

// Engine kết nối thật với PostgreSQL + Redis + Kafka/Redpanda.
type Engine struct {
	repo         *db.Repo
	kafkaBrokers []string
	producer     *kgo.Client
	consumer     *kgo.Client
	kafkaOK      atomic.Bool

	totalStarts      atomic.Int64
	totalAutosaves   atomic.Int64
	totalSubmissions atomic.Int64
	totalGraded      atomic.Int64
	workerCount      int
}

func NewEngine(ctx context.Context, repo *db.Repo, kafkaBrokers []string) (*Engine, error) {
	workers := runtime.NumCPU() * 2
	if workers < 4 {
		workers = 4
	}
	e := &Engine{
		repo:         repo,
		kafkaBrokers: kafkaBrokers,
		workerCount:  workers,
	}

	if err := e.initKafka(ctx); err != nil {
		return nil, fmt.Errorf("init kafka (%v): %w", kafkaBrokers, err)
	}

	// Tiền mã hóa tất cả đề thi trong PostgreSQL lên Redis
	exams, err := repo.ListExams(ctx, 0)
	if err == nil {
		for _, ex := range exams {
			if err := e.BuildAndCacheEncryptedBundle(ctx, ex.ID); err != nil {
				log.Printf("⚠️ Pre-encrypt bundle %s failed: %v", ex.ID, err)
			}
		}
	}

	// Khởi động Kafka Consumer grading loop
	go e.runKafkaGradingConsumer()

	return e, nil
}

func (e *Engine) initKafka(ctx context.Context) error {
	var producer *kgo.Client
	var err error
	for attempt := 1; attempt <= 15; attempt++ {
		producer, err = kgo.NewClient(
			kgo.SeedBrokers(e.kafkaBrokers...),
			kgo.AllowAutoTopicCreation(),
		)
		if err == nil {
			pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
			err = producer.Ping(pingCtx)
			cancel()
			if err == nil {
				break
			}
			producer.Close()
		}
		log.Printf("⏳ Waiting for Kafka/Redpanda (%d/15): %v", attempt, err)
		time.Sleep(1500 * time.Millisecond)
	}
	if err != nil {
		return err
	}

	// Đảm bảo topic exam.submissions tồn tại với 6 partition để mở rộng ngang
	admin := kadm.NewClient(producer)
	tCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	_, _ = admin.CreateTopics(tCtx, 6, 1, nil, SubmissionTopic)
	cancel()

	consumer, err := kgo.NewClient(
		kgo.SeedBrokers(e.kafkaBrokers...),
		kgo.ConsumerGroup("edu-grading-workers"),
		kgo.ConsumeTopics(SubmissionTopic),
		kgo.ConsumeResetOffset(kgo.NewOffset().AtStart()),
	)
	if err != nil {
		producer.Close()
		return err
	}

	e.producer = producer
	e.consumer = consumer
	e.kafkaOK.Store(true)
	log.Printf("✅ Connected to Kafka/Redpanda (%v) — topic: %s", e.kafkaBrokers, SubmissionTopic)
	return nil
}

func (e *Engine) Close() {
	if e.producer != nil {
		e.producer.Close()
	}
	if e.consumer != nil {
		e.consumer.Close()
	}
}

// BuildAndCacheEncryptedBundle xuất gói đề mã hóa AES-256-GCM (không chứa đáp án) và lưu lên Redis.
func (e *Engine) BuildAndCacheEncryptedBundle(ctx context.Context, examUUID string) error {
	ex, qs, err := e.repo.GetExamWithQuestions(ctx, examUUID)
	if err != nil {
		return err
	}
	pubQs := make([]models.PublicQuestion, 0, len(qs))
	for _, q := range qs {
		pubQs = append(pubQs, q.PublicQuestion)
	}

	payload := models.ExamPayloadPlain{
		Exam:      ex,
		Questions: pubQs,
	}
	plainBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		return err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return err
	}
	iv := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(iv); err != nil {
		return err
	}
	ciphertext := gcm.Seal(nil, iv, plainBytes, nil)

	bundle := models.EncryptedExamBundle{
		ExamID:        ex.ID,
		BundleVersion: ex.BundleVersion,
		Algorithm:     "AES-256-GCM",
		IVBase64:      base64.StdEncoding.EncodeToString(iv),
		CiphertextB64: base64.StdEncoding.EncodeToString(ciphertext),
		GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
	}
	bundleJSON, _ := json.Marshal(bundle)
	keyB64 := base64.StdEncoding.EncodeToString(key)

	pipe := e.repo.Redis.Pipeline()
	pipe.Set(ctx, "exam:bundle:"+ex.ID, bundleJSON, 24*time.Hour)
	pipe.Set(ctx, "exam:key:"+ex.ID, keyB64, 24*time.Hour)
	_, err = pipe.Exec(ctx)
	return err
}

func (e *Engine) GetEncryptedBundle(ctx context.Context, idOrSlug string) (models.EncryptedExamBundle, error) {
	examUUID, err := e.repo.ResolveExamID(ctx, idOrSlug)
	if err != nil {
		return models.EncryptedExamBundle{}, err
	}

	raw, err := e.repo.Redis.Get(ctx, "exam:bundle:"+examUUID).Result()
	if err != nil {
		if buildErr := e.BuildAndCacheEncryptedBundle(ctx, examUUID); buildErr != nil {
			return models.EncryptedExamBundle{}, buildErr
		}
		raw, err = e.repo.Redis.Get(ctx, "exam:bundle:"+examUUID).Result()
		if err != nil {
			return models.EncryptedExamBundle{}, err
		}
	}

	var bundle models.EncryptedExamBundle
	if err := json.Unmarshal([]byte(raw), &bundle); err != nil {
		return models.EncryptedExamBundle{}, err
	}
	return bundle, nil
}

type StartExamResponse struct {
	AttemptID     string    `json:"attempt_id"`
	ExamID        string    `json:"exam_id"`
	DecryptKeyB64 string    `json:"decrypt_key_b64"`
	ShuffleSeed   int       `json:"shuffle_seed"`
	ServerTime    time.Time `json:"server_time"`
	EndsAt        time.Time `json:"ends_at"`
}

func (e *Engine) StartExam(ctx context.Context, idOrSlug string, userID *string, userName string) (StartExamResponse, error) {
	examUUID, err := e.repo.ResolveExamID(ctx, idOrSlug)
	if err != nil {
		return StartExamResponse{}, err
	}
	keyB64, err := e.repo.Redis.Get(ctx, "exam:key:"+examUUID).Result()
	if err != nil {
		if buildErr := e.BuildAndCacheEncryptedBundle(ctx, examUUID); buildErr != nil {
			return StartExamResponse{}, buildErr
		}
		keyB64, err = e.repo.Redis.Get(ctx, "exam:key:"+examUUID).Result()
		if err != nil {
			return StartExamResponse{}, err
		}
	}

	ex, _, err := e.repo.GetExamWithQuestions(ctx, examUUID)
	if err != nil {
		return StartExamResponse{}, err
	}
	if strings.TrimSpace(userName) == "" {
		userName = "Học sinh K-12"
	}

	seed := mrand.IntN(1000000)
	attemptID, startedAt, err := e.repo.CreateAttempt(ctx, examUUID, userID, userName, seed)
	if err != nil {
		return StartExamResponse{}, err
	}
	e.totalStarts.Add(1)

	return StartExamResponse{
		AttemptID:     attemptID,
		ExamID:        examUUID,
		DecryptKeyB64: keyB64,
		ShuffleSeed:   seed,
		ServerTime:    startedAt,
		EndsAt:        startedAt.Add(time.Duration(ex.DurationMinutes) * time.Minute),
	}, nil
}

func (e *Engine) Autosave(ctx context.Context, attemptID string, deltaAnswers map[string]any) error {
	if err := e.repo.SaveAutosaveRedis(ctx, attemptID, deltaAnswers); err != nil {
		return err
	}
	e.totalAutosaves.Add(1)
	return nil
}

func (e *Engine) EnqueueSubmit(ctx context.Context, attemptID, idemKey string, answers map[string]any, cheatFlags []models.CheatFlag) error {
	if idemKey != "" {
		ok, err := e.repo.Redis.SetNX(ctx, "exam:idem:"+idemKey, attemptID, 24*time.Hour).Result()
		if err == nil && !ok {
			return nil // Idempotent: bỏ qua bấm đúp
		}
	}

	att, err := e.repo.GetAttempt(ctx, attemptID)
	if err != nil {
		return errors.New("không tìm thấy phiên làm bài")
	}
	if att.Status == "graded" || att.Status == "submitted_queued" {
		return nil
	}

	if err := e.repo.MarkAttemptQueued(ctx, attemptID, answers, cheatFlags); err != nil {
		return err
	}

	ev := SubmitEvent{
		AttemptID:  attemptID,
		ExamID:     att.ExamID,
		UserName:   att.UserName,
		Answers:    answers,
		CheatFlags: cheatFlags,
		EnqueuedAt: time.Now().UTC(),
	}
	payload, _ := json.Marshal(ev)

	rec := &kgo.Record{
		Topic: SubmissionTopic,
		Key:   []byte(attemptID),
		Value: payload,
	}
	if err := e.producer.ProduceSync(ctx, rec).FirstErr(); err != nil {
		return fmt.Errorf("không thể đẩy bài thi vào Kafka: %w", err)
	}

	e.totalSubmissions.Add(1)
	return nil
}

func (e *Engine) runKafkaGradingConsumer() {
	sem := make(chan struct{}, e.workerCount)
	for {
		fetches := e.consumer.PollFetches(context.Background())
		if fetches.IsClientClosed() {
			return
		}
		fetches.EachError(func(t string, p int32, err error) {
			log.Printf("⚠️ Kafka consume error (%s[%d]): %v", t, p, err)
		})
		fetches.EachRecord(func(rec *kgo.Record) {
			sem <- struct{}{}
			go func(val []byte) {
				defer func() { <-sem }()
				var ev SubmitEvent
				if err := json.Unmarshal(val, &ev); err != nil {
					log.Printf("⚠️ Invalid submit event: %v", err)
					return
				}
				e.gradeAttemptFromKafka(ev)
			}(rec.Value)
		})
	}
}

func (e *Engine) gradeAttemptFromKafka(ev SubmitEvent) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	start := time.Now()
	att, err := e.repo.GetAttempt(ctx, ev.AttemptID)
	if err != nil || att.Status == "graded" {
		return
	}

	_, qs, err := e.repo.GetExamWithQuestions(ctx, ev.ExamID)
	if err != nil {
		log.Printf("⚠️ Grade load questions failed (%s): %v", ev.ExamID, err)
		return
	}

	var totalScore float64
	correctCount := 0
	wrongCount := 0
	details := make([]models.QuestionGradeDetail, 0, len(qs))

	for _, q := range qs {
		detail := GradeSingleQuestion(q, ev.Answers[q.ID])
		totalScore += detail.EarnedPoints
		if detail.IsCorrect {
			correctCount++
		} else {
			wrongCount++
		}
		details = append(details, detail)
	}

	totalScore = math.Round(totalScore*100) / 100
	durSec := int(time.Since(att.StartedAt).Seconds())
	if durSec < 1 {
		durSec = 1
	}
	latencyUs := time.Since(start).Microseconds()

	if err := e.repo.SaveGradedAttempt(
		ctx, ev.AttemptID, ev.ExamID, att.UserName,
		totalScore, correctCount, wrongCount, durSec, latencyUs, details,
	); err != nil {
		log.Printf("⚠️ Save graded attempt failed (%s): %v", ev.AttemptID, err)
		return
	}

	e.totalGraded.Add(1)
}

// GradeSingleQuestion hỗ trợ chuẩn 4 dạng câu hỏi GDPT 2018 (bao gồm thang điểm lũy tiến Đúng/Sai 2025).
func GradeSingleQuestion(q models.QuestionInternal, userAns any) models.QuestionGradeDetail {
	detail := models.QuestionGradeDetail{
		QuestionID:     q.ID,
		UserAnswer:     userAns,
		MaxPoints:      q.Points,
		ExplanationMDX: q.ExplanationMDX,
	}

	switch q.QType {
	case "single_choice":
		detail.CorrectAnswer = q.AnswerSingle
		if s, ok := userAns.(string); ok && strings.EqualFold(strings.TrimSpace(s), q.AnswerSingle) {
			detail.IsCorrect = true
			detail.EarnedPoints = q.Points
		}

	case "multi_choice":
		detail.CorrectAnswer = q.AnswerMulti
		var selected []string
		switch v := userAns.(type) {
		case []any:
			for _, item := range v {
				if s, ok := item.(string); ok {
					selected = append(selected, strings.ToUpper(strings.TrimSpace(s)))
				}
			}
		case []string:
			for _, s := range v {
				selected = append(selected, strings.ToUpper(strings.TrimSpace(s)))
			}
		}
		sort.Strings(selected)
		expected := append([]string(nil), q.AnswerMulti...)
		sort.Strings(expected)
		if len(selected) == len(expected) && strings.Join(selected, ",") == strings.Join(expected, ",") {
			detail.IsCorrect = true
			detail.EarnedPoints = q.Points
		}

	case "true_false_group":
		detail.CorrectAnswer = q.AnswerTrueFalse
		matched := 0
		if m, ok := userAns.(map[string]any); ok {
			for k, expectedBool := range q.AnswerTrueFalse {
				if rawVal, exists := m[k]; exists {
					if b, ok := rawVal.(bool); ok && b == expectedBool {
						matched++
					}
				}
			}
		}
		ratios := map[int]float64{0: 0, 1: 0.10, 2: 0.25, 3: 0.50, 4: 1.00}
		ratio := ratios[matched]
		detail.EarnedPoints = math.Round(q.Points*ratio*100) / 100
		detail.IsCorrect = matched == len(q.AnswerTrueFalse)

	case "short_answer":
		detail.CorrectAnswer = q.AnswerShort
		if s, ok := userAns.(string); ok {
			clean := strings.TrimSpace(strings.ReplaceAll(s, " ", ""))
			for _, acc := range q.AnswerShort {
				if strings.EqualFold(clean, acc) {
					detail.IsCorrect = true
					detail.EarnedPoints = q.Points
					break
				}
			}
		}
	}

	return detail
}

func (e *Engine) Metrics(ctx context.Context) map[string]any {
	pgOK, redisOK := e.repo.PingAll(ctx)
	var dbGradedCount int64
	_ = e.repo.PG.QueryRow(ctx, `SELECT COUNT(*) FROM exam_attempts WHERE status = 'graded'`).Scan(&dbGradedCount)

	return map[string]any{
		"engine":            "Go Core/Exam Engine (PostgreSQL + Redis + Redpanda Kafka)",
		"postgres_ok":       pgOK,
		"redis_ok":          redisOK,
		"kafka_ok":          e.kafkaOK.Load(),
		"kafka_topic":       SubmissionTopic,
		"worker_goroutines": e.workerCount,
		"queue_capacity":    100000,
		"queue_depth":       0,
		"total_starts":      e.totalStarts.Load(),
		"total_autosaves":   e.totalAutosaves.Load(),
		"total_submissions": e.totalSubmissions.Load(),
		"total_graded":      dbGradedCount,
		"encryption":        "AES-256-GCM (Redis Cached)",
	}
}
