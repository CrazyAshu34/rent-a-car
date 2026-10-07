package api

import (
	"errors"
	"net/http"
	"net/mail"
	"strings"
	"unicode/utf8"

	"rentacar/internal/auth"
	"rentacar/internal/httpx"
	"rentacar/internal/store"
)

type authResponse struct {
	Token string     `json:"token"`
	User  store.User `json:"user"`
}

func (a *API) register(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Phone    string `json:"phone"`
		Password string `json:"password"`
	}
	if err := httpx.Decode(r, &in); err != nil {
		badRequest(w, "Invalid JSON body")
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	in.Phone = strings.TrimSpace(in.Phone)

	if n := utf8.RuneCountInString(in.Name); n < 2 || n > 100 {
		invalid(w, "Name must be 2–100 characters")
		return
	}
	if _, err := mail.ParseAddress(in.Email); err != nil || len(in.Email) > 255 {
		invalid(w, "Enter a valid email address")
		return
	}
	if len(in.Password) < 8 || len(in.Password) > 72 { // bcrypt ignores bytes past 72
		invalid(w, "Password must be 8–72 characters")
		return
	}
	if len(in.Phone) > 30 {
		invalid(w, "Phone number is too long")
		return
	}

	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		fail(w, r, err)
		return
	}
	u, err := a.store.CreateUser(r.Context(), in.Name, in.Email, in.Phone, hash, "customer")
	if errors.Is(err, store.ErrConflict) {
		httpx.Error(w, http.StatusConflict, "email_taken", "An account with this email already exists")
		return
	}
	if err != nil {
		fail(w, r, err)
		return
	}
	a.respondWithToken(w, r, http.StatusCreated, u)
}

func (a *API) login(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := httpx.Decode(r, &in); err != nil {
		badRequest(w, "Invalid JSON body")
		return
	}
	u, err := a.store.UserByEmail(r.Context(), strings.ToLower(strings.TrimSpace(in.Email)))
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		fail(w, r, err)
		return
	}
	// Same error for unknown email and wrong password to avoid user enumeration.
	if err != nil || !auth.CheckPassword(u.PasswordHash, in.Password) {
		httpx.Error(w, http.StatusUnauthorized, "bad_credentials", "Incorrect email or password")
		return
	}
	a.respondWithToken(w, r, http.StatusOK, u)
}

func (a *API) respondWithToken(w http.ResponseWriter, r *http.Request, status int, u store.User) {
	token, err := a.auth.Issue(u.ID, u.Role)
	if err != nil {
		fail(w, r, err)
		return
	}
	httpx.JSON(w, status, authResponse{Token: token, User: u})
}

func (a *API) me(w http.ResponseWriter, r *http.Request) {
	u, err := a.store.UserByID(r.Context(), auth.From(r.Context()).UserID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Account no longer exists")
			return
		}
		fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, u)
}
