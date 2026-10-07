package api

import (
	"net/http"

	"rentacar/internal/auth"
	"rentacar/internal/httpx"
)

func (a *API) createBooking(w http.ResponseWriter, r *http.Request) {
	var in struct {
		CarID int64  `json:"carId"`
		Start string `json:"startDate"`
		End   string `json:"endDate"`
	}
	if err := httpx.Decode(r, &in); err != nil {
		badRequest(w, "Invalid JSON body")
		return
	}
	if in.CarID <= 0 {
		invalid(w, "carId is required")
		return
	}
	start, end, msg := parseRange(in.Start, in.End)
	if msg != "" {
		invalid(w, msg)
		return
	}
	b, err := a.store.CreateBooking(r.Context(), auth.From(r.Context()).UserID, in.CarID, start, end)
	if err != nil {
		fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, b)
}

func (a *API) myBookings(w http.ResponseWriter, r *http.Request) {
	bs, err := a.store.BookingsForUser(r.Context(), auth.From(r.Context()).UserID)
	if err != nil {
		fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, bs)
}

func (a *API) cancelBooking(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		badRequest(w, "Invalid booking id")
		return
	}
	p := auth.From(r.Context())
	b, err := a.store.CancelBooking(r.Context(), id, p.UserID, p.IsAdmin())
	if err != nil {
		fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, b)
}
