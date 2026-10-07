CREATE TABLE users (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(255)  NOT NULL,
    phone         VARCHAR(30)   NOT NULL DEFAULT '',
    password_hash VARCHAR(255)  NOT NULL,
    role          ENUM('customer','admin') NOT NULL DEFAULT 'customer',
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE locations (
    id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name    VARCHAR(120) NOT NULL,
    city    VARCHAR(80)  NOT NULL,
    address VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Prices are stored in minor currency units (e.g. paise) to avoid float errors.
CREATE TABLE cars (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    slug          VARCHAR(160) NOT NULL,
    make          VARCHAR(60)  NOT NULL,
    model         VARCHAR(60)  NOT NULL,
    year          SMALLINT UNSIGNED NOT NULL,
    category      ENUM('economy','sedan','suv','luxury','van','electric') NOT NULL,
    transmission  ENUM('manual','automatic') NOT NULL,
    fuel          ENUM('petrol','diesel','electric','hybrid') NOT NULL,
    seats         TINYINT UNSIGNED NOT NULL,
    bags          TINYINT UNSIGNED NOT NULL DEFAULT 2,
    price_per_day INT UNSIGNED NOT NULL,
    image_url     VARCHAR(500) NOT NULL DEFAULT '',
    description   TEXT NOT NULL,
    features      JSON NOT NULL,
    location_id   BIGINT UNSIGNED NOT NULL,
    active        TINYINT(1) NOT NULL DEFAULT 1,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cars_slug (slug),
    KEY idx_cars_filter (active, category, price_per_day),
    CONSTRAINT fk_cars_location FOREIGN KEY (location_id) REFERENCES locations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Rentals are date based. end_date is the return day (exclusive for overlap
-- checks, so a car returned on the 10th can be picked up again on the 10th).
CREATE TABLE bookings (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT UNSIGNED NOT NULL,
    car_id      BIGINT UNSIGNED NOT NULL,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    days        SMALLINT UNSIGNED NOT NULL,
    total_price INT UNSIGNED NOT NULL,
    status      ENUM('confirmed','cancelled','completed') NOT NULL DEFAULT 'confirmed',
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_bookings_car_dates (car_id, status, start_date, end_date),
    KEY idx_bookings_user (user_id, created_at),
    CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_bookings_car  FOREIGN KEY (car_id)  REFERENCES cars(id),
    CONSTRAINT chk_bookings_dates CHECK (end_date > start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
