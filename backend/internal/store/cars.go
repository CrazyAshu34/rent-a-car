package store

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type Car struct {
	ID           int64    `json:"id"`
	Slug         string   `json:"slug"`
	Make         string   `json:"make"`
	Model        string   `json:"model"`
	Year         int      `json:"year"`
	Category     string   `json:"category"`
	Transmission string   `json:"transmission"`
	Fuel         string   `json:"fuel"`
	Seats        int      `json:"seats"`
	Bags         int      `json:"bags"`
	PricePerDay  int64    `json:"pricePerDay"`
	ImageURL     string   `json:"imageUrl"`
	Description  string   `json:"description"`
	Features     []string `json:"features"`
	LocationID   int64    `json:"locationId"`
	LocationName string   `json:"locationName"`
	City         string   `json:"city"`
	Active       bool     `json:"active"`
}

type Location struct {
	ID      int64  `json:"id"`
	Name    string `json:"name"`
	City    string `json:"city"`
	Address string `json:"address"`
}

type CarFilter struct {
	Query           string
	Category        string
	Transmission    string
	Fuel            string
	MinSeats        int
	MaxPrice        int64
	LocationID      int64
	Start, End      *time.Time // only cars free for the whole window
	Sort            string
	IncludeInactive bool
}

const carSelect = `
	SELECT c.id, c.slug, c.make, c.model, c.year, c.category, c.transmission, c.fuel,
	       c.seats, c.bags, c.price_per_day, c.image_url, c.description, c.features,
	       c.location_id, l.name, l.city, c.active
	FROM cars c JOIN locations l ON l.id = c.location_id`

func scanCar(row interface{ Scan(...any) error }) (Car, error) {
	var c Car
	var features []byte
	err := row.Scan(&c.ID, &c.Slug, &c.Make, &c.Model, &c.Year, &c.Category, &c.Transmission, &c.Fuel,
		&c.Seats, &c.Bags, &c.PricePerDay, &c.ImageURL, &c.Description, &features,
		&c.LocationID, &c.LocationName, &c.City, &c.Active)
	if errors.Is(err, sql.ErrNoRows) {
		return c, ErrNotFound
	}
	if err != nil {
		return c, err
	}
	if err := json.Unmarshal(features, &c.Features); err != nil || c.Features == nil {
		c.Features = []string{}
	}
	return c, nil
}

func (s *Store) ListCars(ctx context.Context, f CarFilter) ([]Car, error) {
	var (
		where []string
		args  []any
	)
	if !f.IncludeInactive {
		where = append(where, "c.active = 1")
	}
	if f.Query != "" {
		where = append(where, "(c.make LIKE ? OR c.model LIKE ?)")
		like := "%" + escapeLike(f.Query) + "%"
		args = append(args, like, like)
	}
	if f.Category != "" {
		where = append(where, "c.category = ?")
		args = append(args, f.Category)
	}
	if f.Transmission != "" {
		where = append(where, "c.transmission = ?")
		args = append(args, f.Transmission)
	}
	if f.Fuel != "" {
		where = append(where, "c.fuel = ?")
		args = append(args, f.Fuel)
	}
	if f.MinSeats > 0 {
		where = append(where, "c.seats >= ?")
		args = append(args, f.MinSeats)
	}
	if f.MaxPrice > 0 {
		where = append(where, "c.price_per_day <= ?")
		args = append(args, f.MaxPrice)
	}
	if f.LocationID > 0 {
		where = append(where, "c.location_id = ?")
		args = append(args, f.LocationID)
	}
	if f.Start != nil && f.End != nil {
		where = append(where, `NOT EXISTS (
			SELECT 1 FROM bookings b
			WHERE b.car_id = c.id AND b.status = 'confirmed'
			  AND b.start_date < ? AND b.end_date > ?)`)
		args = append(args, f.End.Format(DateLayout), f.Start.Format(DateLayout))
	}

	q := carSelect
	if len(where) > 0 {
		q += " WHERE " + strings.Join(where, " AND ")
	}
	switch f.Sort {
	case "price_desc":
		q += " ORDER BY c.price_per_day DESC, c.id"
	case "newest":
		q += " ORDER BY c.year DESC, c.id DESC"
	default:
		q += " ORDER BY c.price_per_day ASC, c.id"
	}

	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cars := []Car{}
	for rows.Next() {
		c, err := scanCar(rows)
		if err != nil {
			return nil, err
		}
		cars = append(cars, c)
	}
	return cars, rows.Err()
}

func (s *Store) CarByID(ctx context.Context, id int64) (Car, error) {
	return scanCar(s.db.QueryRowContext(ctx, carSelect+` WHERE c.id = ?`, id))
}

func (s *Store) CarBySlug(ctx context.Context, slug string) (Car, error) {
	return scanCar(s.db.QueryRowContext(ctx, carSelect+` WHERE c.slug = ?`, slug))
}

func (s *Store) Locations(ctx context.Context) ([]Location, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, name, city, address FROM locations ORDER BY city, name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Location{}
	for rows.Next() {
		var l Location
		if err := rows.Scan(&l.ID, &l.Name, &l.City, &l.Address); err != nil {
			return nil, err
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

// BookedRanges returns the confirmed future ranges for a car so the UI can
// show why dates are unavailable.
func (s *Store) BookedRanges(ctx context.Context, carID int64) ([][2]string, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT DATE_FORMAT(start_date, '%Y-%m-%d'), DATE_FORMAT(end_date, '%Y-%m-%d')
		FROM bookings
		WHERE car_id = ? AND status = 'confirmed' AND end_date >= CURRENT_DATE()
		ORDER BY start_date`, carID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := [][2]string{}
	for rows.Next() {
		var r [2]string
		if err := rows.Scan(&r[0], &r[1]); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

type CarInput struct {
	Make         string   `json:"make"`
	Model        string   `json:"model"`
	Year         int      `json:"year"`
	Category     string   `json:"category"`
	Transmission string   `json:"transmission"`
	Fuel         string   `json:"fuel"`
	Seats        int      `json:"seats"`
	Bags         int      `json:"bags"`
	PricePerDay  int64    `json:"pricePerDay"`
	ImageURL     string   `json:"imageUrl"`
	Description  string   `json:"description"`
	Features     []string `json:"features"`
	LocationID   int64    `json:"locationId"`
	Active       bool     `json:"active"`
}

func (s *Store) CreateCar(ctx context.Context, in CarInput) (Car, error) {
	features, _ := json.Marshal(nonNil(in.Features))
	res, err := s.db.ExecContext(ctx, `
		INSERT INTO cars (slug, make, model, year, category, transmission, fuel, seats, bags,
		                  price_per_day, image_url, description, features, location_id, active)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		newSlug(in), in.Make, in.Model, in.Year, in.Category, in.Transmission, in.Fuel, in.Seats, in.Bags,
		in.PricePerDay, in.ImageURL, in.Description, features, in.LocationID, in.Active)
	if err != nil {
		return Car{}, err
	}
	id, _ := res.LastInsertId()
	return s.CarByID(ctx, id)
}

func (s *Store) UpdateCar(ctx context.Context, id int64, in CarInput) (Car, error) {
	features, _ := json.Marshal(nonNil(in.Features))
	res, err := s.db.ExecContext(ctx, `
		UPDATE cars SET make=?, model=?, year=?, category=?, transmission=?, fuel=?, seats=?, bags=?,
		       price_per_day=?, image_url=?, description=?, features=?, location_id=?, active=?
		WHERE id = ?`,
		in.Make, in.Model, in.Year, in.Category, in.Transmission, in.Fuel, in.Seats, in.Bags,
		in.PricePerDay, in.ImageURL, in.Description, features, in.LocationID, in.Active, id)
	if err != nil {
		return Car{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		// MySQL reports 0 for unchanged rows too; confirm existence.
		if _, err := s.CarByID(ctx, id); err != nil {
			return Car{}, err
		}
	}
	return s.CarByID(ctx, id)
}

func nonNil(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

func escapeLike(s string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
}

var nonSlug = regexp.MustCompile(`[^a-z0-9]+`)

func newSlug(in CarInput) string {
	base := strings.ToLower(in.Make + " " + in.Model + " " + strconv.Itoa(in.Year))
	base = strings.Trim(nonSlug.ReplaceAllString(base, "-"), "-")
	b := make([]byte, 3)
	_, _ = rand.Read(b)
	return base + "-" + hex.EncodeToString(b)
}
