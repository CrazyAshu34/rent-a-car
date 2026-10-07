// Package auth handles password hashing, JWT issuing and request authentication.
package auth

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"rentacar/internal/httpx"
)

type Principal struct {
	UserID int64
	Role   string
}

func (p Principal) IsAdmin() bool { return p.Role == "admin" }

type ctxKey struct{}

type Service struct {
	secret []byte
	ttl    time.Duration
}

func New(secret string, ttl time.Duration) *Service {
	return &Service{secret: []byte(secret), ttl: ttl}
}

func HashPassword(pw string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	return string(b), err
}

func CheckPassword(hash, pw string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pw)) == nil
}

type claims struct {
	Role string `json:"role"`
	jwt.RegisteredClaims
}

func (s *Service) Issue(userID int64, role string) (string, error) {
	now := time.Now()
	c := claims{
		Role: role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatInt(userID, 10),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.ttl)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, c).SignedString(s.secret)
}

func (s *Service) parse(token string) (Principal, error) {
	var c claims
	t, err := jwt.ParseWithClaims(token, &c, func(*jwt.Token) (any, error) { return s.secret, nil },
		jwt.WithValidMethods([]string{"HS256"}), jwt.WithExpirationRequired())
	if err != nil || !t.Valid {
		return Principal{}, errors.New("invalid token")
	}
	id, err := strconv.ParseInt(c.Subject, 10, 64)
	if err != nil {
		return Principal{}, errors.New("invalid subject")
	}
	return Principal{UserID: id, Role: c.Role}, nil
}

// Require rejects requests without a valid bearer token. When adminOnly is
// set, non-admin principals receive 403.
func (s *Service) Require(adminOnly bool, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := r.Header.Get("Authorization")
		token, ok := strings.CutPrefix(h, "Bearer ")
		if !ok || token == "" {
			httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Authentication required")
			return
		}
		p, err := s.parse(token)
		if err != nil {
			httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Invalid or expired session")
			return
		}
		if adminOnly && !p.IsAdmin() {
			httpx.Error(w, http.StatusForbidden, "forbidden", "Admin access required")
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, p)))
	})
}

func From(ctx context.Context) Principal {
	p, _ := ctx.Value(ctxKey{}).(Principal)
	return p
}
