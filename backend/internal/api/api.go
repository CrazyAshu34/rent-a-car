// Package api wires HTTP routes to handlers.
package api

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"rentacar/internal/auth"
	"rentacar/internal/httpx"
	"rentacar/internal/store"
)

type API struct {
	store *store.Store
	auth  *auth.Service
	db    *sql.DB
}

func New(db *sql.DB, st *store.Store, a *auth.Service, corsOrigins []string) http.Handler {
	api := &API{store: st, auth: a, db: db}
	mux := http.NewServeMux()

	authLimit := rateLimit(20, time.Minute)
	user := func(h http.HandlerFunc) http.Handler { return a.Require(false, h) }
	admin := func(h http.HandlerFunc) http.Handler { return a.Require(true, h) }

	mux.HandleFunc("GET /api/health", api.health)

	mux.Handle("POST /api/auth/register", authLimit(http.HandlerFunc(api.register)))
	mux.Handle("POST /api/auth/login", authLimit(http.HandlerFunc(api.login)))
	mux.Handle("GET /api/me", user(api.me))

	mux.HandleFunc("GET /api/locations", api.listLocations)
	mux.HandleFunc("GET /api/cars", api.listCars)
	mux.HandleFunc("GET /api/cars/{slug}", api.getCar)

	mux.Handle("POST /api/bookings", user(api.createBooking))
	mux.Handle("GET /api/bookings", user(api.myBookings))
	mux.Handle("POST /api/bookings/{id}/cancel", user(api.cancelBooking))

	mux.Handle("GET /api/admin/bookings", admin(api.adminBookings))
	mux.Handle("GET /api/admin/cars", admin(api.adminCars))
	mux.Handle("POST /api/admin/cars", admin(api.adminCreateCar))
	mux.Handle("PUT /api/admin/cars/{id}", admin(api.adminUpdateCar))

	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		httpx.Error(w, http.StatusNotFound, "not_found", "Route not found")
	})

	return recoverer(logging(secureHeaders(cors(corsOrigins)(mux))))
}

func (a *API) health(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := a.db.PingContext(ctx); err != nil {
		httpx.Error(w, http.StatusServiceUnavailable, "db_down", "Database unavailable")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// fail maps domain errors to HTTP responses; anything unexpected is logged
// and returned as an opaque 500.
func fail(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, store.ErrNotFound):
		httpx.Error(w, http.StatusNotFound, "not_found", "Resource not found")
	case errors.Is(err, store.ErrCarUnavailable):
		httpx.Error(w, http.StatusConflict, "car_unavailable", "This car is already booked for the selected dates")
	case errors.Is(err, store.ErrTooLateCancel):
		httpx.Error(w, http.StatusConflict, "too_late", "This booking has already started and can't be cancelled")
	case errors.Is(err, store.ErrConflict):
		httpx.Error(w, http.StatusConflict, "conflict", "Request conflicts with the current state")
	case errors.Is(err, store.ErrInvalid):
		httpx.Error(w, http.StatusUnprocessableEntity, "invalid", "Invalid request")
	default:
		slog.Error("unhandled error", "err", err, "path", r.URL.Path)
		httpx.Error(w, http.StatusInternalServerError, "internal", "Something went wrong")
	}
}

func badRequest(w http.ResponseWriter, msg string) {
	httpx.Error(w, http.StatusBadRequest, "bad_request", msg)
}

func invalid(w http.ResponseWriter, msg string) {
	httpx.Error(w, http.StatusUnprocessableEntity, "validation", msg)
}

func pathID(r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	return id, err == nil && id > 0
}
