INSERT INTO locations (id, name, city, address) VALUES
    (1, 'Indira Gandhi Airport (T3)', 'Delhi',     'Terminal 3 Arrivals, New Delhi 110037'),
    (2, 'Chhatrapati Shivaji Airport', 'Mumbai',   'Terminal 2, Andheri East, Mumbai 400099'),
    (3, 'Kempegowda Airport',          'Bengaluru','Devanahalli, Bengaluru 560300'),
    (4, 'Dabolim Airport',             'Goa',      'Dabolim, Goa 403801');

INSERT INTO cars
    (slug, make, model, year, category, transmission, fuel, seats, bags, price_per_day, image_url, description, features, location_id)
VALUES
    ('maruti-swift-2024', 'Maruti Suzuki', 'Swift', 2024, 'economy', 'manual', 'petrol', 5, 2, 250000, '',
     'Nimble, frugal and easy to park. The perfect city companion.',
     JSON_ARRAY('Air conditioning','Bluetooth audio','Dual airbags','ABS'), 1),
    ('hyundai-i20-2024', 'Hyundai', 'i20', 2024, 'economy', 'automatic', 'petrol', 5, 2, 300000, '',
     'A premium hatchback with an automatic gearbox and a connected cabin.',
     JSON_ARRAY('Automatic','Sunroof','Apple CarPlay','Rear camera'), 2),
    ('honda-city-2024', 'Honda', 'City', 2024, 'sedan', 'automatic', 'petrol', 5, 3, 400000, '',
     'Refined, spacious and quiet — a comfortable sedan for long highway drives.',
     JSON_ARRAY('Automatic','Cruise control','Leatherette seats','6 airbags'), 3),
    ('skoda-slavia-2024', 'Škoda', 'Slavia', 2024, 'sedan', 'manual', 'petrol', 5, 3, 420000, '',
     'Turbo-petrol punch with European handling and a huge boot.',
     JSON_ARRAY('Turbo engine','Ventilated seats','Wireless charging','6 airbags'), 1),
    ('mahindra-thar-2024', 'Mahindra', 'Thar', 2024, 'suv', 'manual', 'diesel', 4, 2, 550000, '',
     'Go anywhere. Convertible top, 4x4 and unmistakable road presence.',
     JSON_ARRAY('4x4','Removable roof','Touchscreen infotainment','Hill assist'), 4),
    ('hyundai-creta-2024', 'Hyundai', 'Creta', 2024, 'suv', 'automatic', 'diesel', 5, 3, 520000, '',
     'The do-it-all family SUV with a panoramic sunroof and ADAS.',
     JSON_ARRAY('Panoramic sunroof','ADAS','Ventilated seats','Bose audio'), 2),
    ('toyota-innova-hycross-2024', 'Toyota', 'Innova Hycross', 2024, 'van', 'automatic', 'hybrid', 7, 4, 750000, '',
     'Seven comfortable seats and hybrid efficiency for group travel.',
     JSON_ARRAY('Hybrid','Captain seats','Dual-zone climate','Ottoman seats'), 3),
    ('tata-nexon-ev-2024', 'Tata', 'Nexon EV', 2024, 'electric', 'automatic', 'electric', 5, 2, 480000, '',
     'Silent, quick and zero tailpipe emissions. Charging cable included.',
     JSON_ARRAY('~400 km range','Fast charging','Connected car tech','Sunroof'), 1),
    ('bmw-3-series-2023', 'BMW', '3 Series', 2023, 'luxury', 'automatic', 'petrol', 5, 3, 1400000, '',
     'The ultimate driving machine. Arrive in style for business or leisure.',
     JSON_ARRAY('Leather interior','Harman Kardon audio','Parking assist','Ambient lighting'), 2),
    ('mercedes-e-class-2023', 'Mercedes-Benz', 'E-Class', 2023, 'luxury', 'automatic', 'diesel', 5, 3, 1800000, '',
     'Executive-class luxury with a serene, tech-rich cabin.',
     JSON_ARRAY('Air suspension','Burmester audio','Massage seats','360° camera'), 3);
