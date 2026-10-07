package store

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

const (
	DateLayout      = "2006-01-02"
	MaxRentalDays   = 30
	StatusConfirmed = "confirmed"
	StatusCancelled = "cancelled"
)

var (
	ErrCarUnavailable = errors.New("car is not available for the selected dates")
	ErrTooLateCancel  = errors.New("booking can no longer be cancelled")
)

type Booking struct {
	ID           int64     `json:"id"`
	CarID        int64     `json:"carId"`
	CarName      string    `json:"carName"`
	CarSlug      string    `json:"carSlug"`
	CarImageURL  string    `json:"carImageUrl"`
	LocationName string    `json:"locationName"`
	City         string    `json:"city"`
	StartDate    string    `json:"startDate"`
	EndDate      string    `json:"endDate"`
	Days         int       `json:"days"`
	TotalPrice   int64     `json:"totalPrice"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"createdAt"`
	UserName     string    `json:"userName,omitempty"`
	UserEmail    string    `json:"userEmail,omitempty"`
}

const bookingSelect = `
	SELECT b.id, b.car_id, CONCAT(c.make, ' ', c.model), c.slug, c.image_url, l.name, l.city,
	       DATE_FORMAT(b.start_date, '%Y-%m-%d'), DATE_FORMAT(b.end_date, '%Y-%m-%d'),
	       b.days, b.total_price, b.status, b.created_at, u.name, u.email
	FROM bookings b
	JOIN cars c ON c.id = b.car_id
	JOIN locations l ON l.id = c.location_id
	JOIN users u ON u.id = b.user_id`

func scanBooking(row interface{ Scan(...any) error }) (Booking, error) {
	var b Booking
	err := row.Scan(&b.ID, &b.CarID, &b.CarName, &b.CarSlug, &b.CarImageURL, &b.LocationName, &b.City,
		&b.StartDate, &b.EndDate, &b.Days, &b.TotalPrice, &b.Status, &b.CreatedAt, &b.UserName, &b.UserEmail)
	if errors.Is(err, sql.ErrNoRows) {
		return b, ErrNotFound
	}
	return b, err
}

// RentalDays is the number of 24h periods between pickup and return (min 1).
func RentalDays(start, end time.Time) int {
	return int(end.Sub(start).Hours() / 24)
}

// CreateBooking reserves a car. The car row is locked for the transaction so
// two concurrent requests for overlapping dates cannot both succeed.
func (s *Store) CreateBooking(ctx context.Context, userID, carID int64, start, end time.Time) (Booking, error) {
	days := RentalDays(start, end)
	if days < 1 || days > MaxRentalDays {
		return Booking{}, ErrInvalid
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Booking{}, err
	}
	defer tx.Rollback()

	var price int64
	var active bool
	err = tx.QueryRowContext(ctx, `SELECT price_per_day, active FROM cars WHERE id = ? FOR UPDATE`, carID).
		Scan(&price, &active)
	if errors.Is(err, sql.ErrNoRows) || (err == nil && !active) {
		return Booking{}, ErrNotFound
	}
	if err != nil {
		return Booking{}, err
	}

	var clashes int
	if err := tx.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM bookings
		WHERE car_id = ? AND status = 'confirmed' AND start_date < ? AND end_date > ?`,
		carID, end.Format(DateLayout), start.Format(DateLayout)).Scan(&clashes); err != nil {
		return Booking{}, err
	}
	if clashes > 0 {
		return Booking{}, ErrCarUnavailable
	}

	res, err := tx.ExecContext(ctx, `
		INSERT INTO bookings (user_id, car_id, start_date, end_date, days, total_price, status)
		VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`,
		userID, carID, start.Format(DateLayout), end.Format(DateLayout), days, price*int64(days))
	if err != nil {
		return Booking{}, err
	}
	id, _ := res.LastInsertId()
	if err := tx.Commit(); err != nil {
		return Booking{}, err
	}
	return s.BookingByID(ctx, id)
}

func (s *Store) BookingByID(ctx context.Context, id int64) (Booking, error) {
	return scanBooking(s.db.QueryRowContext(ctx, bookingSelect+` WHERE b.id = ?`, id))
}

func (s *Store) BookingsForUser(ctx context.Context, userID int64) ([]Booking, error) {
	return s.queryBookings(ctx, bookingSelect+` WHERE b.user_id = ? ORDER BY b.start_date DESC, b.id DESC`, userID)
}

func (s *Store) AllBookings(ctx context.Context) ([]Booking, error) {
	return s.queryBookings(ctx, bookingSelect+` ORDER BY b.created_at DESC, b.id DESC LIMIT 500`)
}

func (s *Store) queryBookings(ctx context.Context, q string, args ...any) ([]Booking, error) {
	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Booking{}
	for rows.Next() {
		b, err := scanBooking(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, rows.Err()
}

// CancelBooking cancels a confirmed booking that has not started yet.
// Non-admins may only cancel their own bookings (reported as not found).
func (s *Store) CancelBooking(ctx context.Context, id, userID int64, isAdmin bool) (Booking, error) {
	b, err := s.BookingByID(ctx, id)
	if err != nil {
		return Booking{}, err
	}
	if !isAdmin {
		var owner int64
		if err := s.db.QueryRowContext(ctx, `SELECT user_id FROM bookings WHERE id = ?`, id).Scan(&owner); err != nil {
			return Booking{}, err
		}
		if owner != userID {
			return Booking{}, ErrNotFound
		}
	}
	if b.Status != StatusConfirmed {
		return Booking{}, ErrConflict
	}
	today := time.Now().UTC().Format(DateLayout)
	if !isAdmin && b.StartDate < today {
		return Booking{}, ErrTooLateCancel
	}
	if _, err := s.db.ExecContext(ctx,
		`UPDATE bookings SET status = 'cancelled' WHERE id = ? AND status = 'confirmed'`, id); err != nil {
		return Booking{}, err
	}
	return s.BookingByID(ctx, id)
}
