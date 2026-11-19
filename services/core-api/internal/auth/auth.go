package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"edu-website/core-api/internal/models"
)

type ctxKey string

const userClaimsKey ctxKey = "edu_user_claims"

type Claims struct {
	UserID   string `json:"uid"`
	Email    string `json:"email"`
	FullName string `json:"name"`
	Role     string `json:"role"`
	Grade    int    `json:"grade,omitempty"`
	jwt.RegisteredClaims
}

type Service struct {
	jwtSecret []byte
}

func NewService() *Service {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "eduk12-dev-super-secret-change-in-production-2026"
	}
	return &Service{jwtSecret: []byte(secret)}
}

func HashPassword(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	return string(b), err
}

func VerifyPassword(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}

func (s *Service) GenerateAccessToken(u models.User) (string, error) {
	grade := 0
	if u.CurrentGrade != nil {
		grade = *u.CurrentGrade
	}
	claims := Claims{
		UserID:   u.ID,
		Email:    u.Email,
		FullName: u.FullName,
		Role:     u.Role,
		Grade:    grade,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   u.ID,
			Issuer:    "eduk12-core-api",
			IssuedAt:  jwt.NewNumericDate(time.Now().UTC()),
			ExpiresAt: jwt.NewNumericDate(time.Now().UTC().Add(24 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func GenerateRefreshToken() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func (s *Service) ParseToken(tokenStr string) (*Claims, error) {
	tok, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("thuật toán ký token không hợp lệ")
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := tok.Claims.(*Claims)
	if !ok || !tok.Valid {
		return nil, errors.New("token không hợp lệ")
	}
	return claims, nil
}

func (s *Service) ExtractClaims(r *http.Request) (*Claims, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return nil, errors.New("thiếu Authorization header")
	}
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return nil, errors.New("định dạng Bearer token không hợp lệ")
	}
	return s.ParseToken(strings.TrimSpace(parts[1]))
}

// RequireRoles middleware bảo vệ các endpoint CMS & Admin.
func (s *Service) RequireRoles(allowedRoles ...string) func(http.HandlerFunc) http.HandlerFunc {
	allowed := make(map[string]bool, len(allowedRoles))
	for _, r := range allowedRoles {
		allowed[r] = true
	}
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			claims, err := s.ExtractClaims(r)
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = w.Write([]byte(`{"error":"Vui lòng đăng nhập để thực hiện thao tác này"}`))
				return
			}
			if len(allowed) > 0 && !allowed[claims.Role] {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				_, _ = w.Write([]byte(`{"error":"Bạn không có quyền truy cập chức năng này (yêu cầu Giáo viên hoặc Admin)"}`))
				return
			}
			ctx := context.WithValue(r.Context(), userClaimsKey, claims)
			next(w, r.WithContext(ctx))
		}
	}
}

func ClaimsFromContext(ctx context.Context) *Claims {
	v, _ := ctx.Value(userClaimsKey).(*Claims)
	return v
}
