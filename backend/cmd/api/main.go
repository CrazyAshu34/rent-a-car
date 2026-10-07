package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"rentacar/internal/api"
	"rentacar/internal/auth"
	"rentacar/internal/config"
	"rentacar/internal/db"
	"rentacar/internal/store"
)

func main() {
	if err := run(); err != nil {
		slog.Error("fatal", "err", err)
		os.Exit(1)
	}
}

func run() error {
	_ = godotenv.Load() // optional; real env vars always win

	cfg, err := config.Load()
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	conn, err := db.Open(ctx, cfg.DatabaseDSN)
	if err != nil {
		return err
	}
	defer conn.Close()

	if err := db.Migrate(ctx, conn); err != nil {
		return err
	}

	st := store.New(conn)
	if err := bootstrapAdmin(ctx, st, cfg); err != nil {
		return err
	}

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           api.New(conn, st, auth.New(cfg.JWTSecret, cfg.JWTTTL), cfg.CORSOrigins),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		slog.Info("api listening", "addr", srv.Addr, "env", cfg.Env)
		errCh <- srv.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		slog.Info("shutting down")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return srv.Shutdown(shutdownCtx)
	}
}

// bootstrapAdmin creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD.
// It never overwrites an existing account.
func bootstrapAdmin(ctx context.Context, st *store.Store, cfg config.Config) error {
	if cfg.AdminEmail == "" || cfg.AdminPassword == "" {
		return nil
	}
	if _, err := st.UserByEmail(ctx, cfg.AdminEmail); err == nil {
		return nil
	} else if !errors.Is(err, store.ErrNotFound) {
		return err
	}
	hash, err := auth.HashPassword(cfg.AdminPassword)
	if err != nil {
		return err
	}
	if _, err := st.CreateUser(ctx, "Administrator", cfg.AdminEmail, "", hash, "admin"); err != nil {
		return err
	}
	slog.Info("created admin user", "email", cfg.AdminEmail)
	return nil
}
