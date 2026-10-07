package api

import (
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	"rentacar/internal/httpx"
	"rentacar/internal/store"
)

var (
	categories    = []string{"economy", "sedan", "suv", "luxury", "van", "electric"}
	transmissions = []string{"manual", "automatic"}
	fuels         = []string{"petrol", "diesel", "electric", "hybrid"}
)

func (a *API) listLocations(w http.ResponseWriter, r *http.Request) {
	locs, err := a.store.Locations(r.Context())
	if err != nil {
		fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, locs)
}

func (a *API) listCars(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := store.CarFilter{
		Query:        strings.TrimSpace(q.Get("q")),
		Category:     q.Get("category"),
		Transmission: q.Get("transmission"),
		Fuel:         q.Get("fuel"),
		Sort:         q.Get("sort"),
	}
	if f.Category != "" && !slices.Contains(categories, f.Category) ||
		f.Transmission != "" && !slices.Contains(transmissions, f.Transmission) ||
		f.Fuel != "" && !slices.Contains(fuels, f.Fuel) {
		invalid(w, "Unknown filter value")
		return
	}
	f.MinSeats, _ = strconv.Atoi(q.Get("seats"))
	f.MaxPrice, _ = strconv.ParseInt(q.Get("maxPrice"), 10, 64)
	f.LocationID, _ = strconv.ParseInt(q.Get("locationId"), 10, 64)

	if q.Get("start") != "" || q.Get("end") != "" {
		start, end, err := parseRange(q.Get("start"), q.Get("end"))
		if err != "" {
			invalid(w, err)
			return
		}
		f.Start, f.End = &start, &end
	}

	cars, err := a.store.ListCars(r.Context(), f)
	if err != nil {
		fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, cars)
}

func (a *API) getCar(w http.ResponseWriter, r *http.Request) {
	car, err := a.store.CarBySlug(r.Context(), r.PathValue("slug"))
	if err != nil || !car.Active {
		fail(w, r, store.ErrNotFound)
		return
	}
	booked, err := a.store.BookedRanges(r.Context(), car.ID)
	if err != nil {
		fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, struct {
		store.Car
		BookedRanges [][2]string `json:"bookedRanges"`
	}{car, booked})
}

// parseRange validates a pickup/return pair. It returns a user-facing
// message instead of an error so handlers can reply directly.
func parseRange(startStr, endStr string) (start, end time.Time, msg string) {
	start, err1 := time.Parse(store.DateLayout, startStr)
	end, err2 := time.Parse(store.DateLayout, endStr)
	if err1 != nil || err2 != nil {
		return start, end, "Dates must be in YYYY-MM-DD format"
	}
	today := time.Now().UTC().Truncate(24 * time.Hour)
	if start.Before(today) {
		return start, end, "Pickup date can't be in the past"
	}
	days := store.RentalDays(start, end)
	if days < 1 {
		return start, end, "Return date must be after pickup date"
	}
	if days > store.MaxRentalDays {
		return start, end, "Rentals are limited to " + strconv.Itoa(store.MaxRentalDays) + " days"
	}
	return start, end, ""
}
