package config

import (
	"errors"
	"log/slog"
	"os"
	"strings"
	"time"
)

type Config struct {
	Env           string
	Port          string
	DatabaseDSN   string
	JWTSecret     string
	JWTTTL        time.Duration
	CORSOrigins   []string
	AdminEmail    string
	AdminPassword string
}

func (c Config) IsProd() bool { return c.Env == "production" }

func Load() (Config, error) {
	c := Config{
		Env:  get("APP_ENV", "development"),
		Port: get("PORT", "8080"),
		DatabaseDSN: get("DATABASE_DSN",
			"rentacar:rentacar@tcp(127.0.0.1:3307)/rentacar?parseTime=true&charset=utf8mb4&loc=UTC&multiStatements=true"),
		JWTSecret:     os.Getenv("JWT_SECRET"),
		JWTTTL:        7 * 24 * time.Hour,
		CORSOrigins:   strings.Split(get("CORS_ORIGINS", "http://localhost:5173"), ","),
		AdminEmail:    strings.ToLower(os.Getenv("ADMIN_EMAIL")),
		AdminPassword: os.Getenv("ADMIN_PASSWORD"),
	}

	if c.JWTSecret == "" {
		if c.IsProd() {
			return c, errors.New("JWT_SECRET is required in production")
		}
		slog.Warn("JWT_SECRET not set; using an insecure development secret")
		c.JWTSecret = "dev-only-insecure-secret-change-me"
	}
	if len(c.JWTSecret) < 16 {
		return c, errors.New("JWT_SECRET must be at least 16 characters")
	}
	return c, nil
}

func get(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
