package api

import (
	"net/http"
	"slices"
	"strings"
	"unicode/utf8"

	"rentacar/internal/httpx"
	"rentacar/internal/store"
)

func (a *API) adminBookings(w http.ResponseWriter, r *http.Request) {
	bs, err := a.store.AllBookings(r.Context())
	if err != nil {
		fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, bs)
}

func (a *API) adminCars(w http.ResponseWriter, r *http.Request) {
	cars, err := a.store.ListCars(r.Context(), store.CarFilter{IncludeInactive: true})
	if err != nil {
		fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, cars)
}

func (a *API) adminCreateCar(w http.ResponseWriter, r *http.Request) {
	in, ok := a.readCarInput(w, r)
	if !ok {
		return
	}
	car, err := a.store.CreateCar(r.Context(), in)
	if err != nil {
		fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, car)
}

func (a *API) adminUpdateCar(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		badRequest(w, "Invalid car id")
		return
	}
	in, ok := a.readCarInput(w, r)
	if !ok {
		return
	}
	car, err := a.store.UpdateCar(r.Context(), id, in)
	if err != nil {
		fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, car)
}

func (a *API) readCarInput(w http.ResponseWriter, r *http.Request) (store.CarInput, bool) {
	var in store.CarInput
	if err := httpx.Decode(r, &in); err != nil {
		badRequest(w, "Invalid JSON body")
		return in, false
	}
	in.Make, in.Model = strings.TrimSpace(in.Make), strings.TrimSpace(in.Model)
	in.Description = strings.TrimSpace(in.Description)
	in.ImageURL = strings.TrimSpace(in.ImageURL)

	switch {
	case in.Make == "" || in.Model == "" || utf8.RuneCountInString(in.Make) > 60 || utf8.RuneCountInString(in.Model) > 60:
		invalid(w, "Make and model are required (max 60 characters)")
	case in.Year < 1990 || in.Year > 2100:
		invalid(w, "Year is out of range")
	case !slices.Contains(categories, in.Category):
		invalid(w, "Unknown category")
	case !slices.Contains(transmissions, in.Transmission):
		invalid(w, "Unknown transmission")
	case !slices.Contains(fuels, in.Fuel):
		invalid(w, "Unknown fuel type")
	case in.Seats < 1 || in.Seats > 20 || in.Bags < 0 || in.Bags > 20:
		invalid(w, "Seats or bags out of range")
	case in.PricePerDay < 1 || in.PricePerDay > 100_000_000:
		invalid(w, "Price must be a positive amount (minor units)")
	case len(in.ImageURL) > 500 || (in.ImageURL != "" && !strings.HasPrefix(in.ImageURL, "https://")):
		invalid(w, "Image URL must be an https:// URL")
	case in.LocationID <= 0:
		invalid(w, "Location is required")
	default:
		return in, true
	}
	return in, false
}
