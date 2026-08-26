-- 1. Create and Connect to the 'cloud' Database
SELECT 'CREATE DATABASE cloud'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud')\gexec

\connect cloud;

-- 2. Extensions & Enumerations
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('ROLE_ADMIN', 'ROLE_CUSTOMER', 'ROLE_DRIVER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status_enum AS ENUM (
        'PENDING', 'ASSIGNED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE vehicle_type_enum AS ENUM (
        'LIGHT_TRUCK', 'HEAVY_TRAILER', 'BOX_TRUCK', 'CONTAINER', 'VAN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_phone_key UNIQUE (phone),
    CONSTRAINT check_valid_user_role CHECK (
        role::text = ANY (ARRAY[
            'ROLE_CUSTOMER'::character varying,
            'ROLE_DRIVER'::character varying,
            'ROLE_ADMIN'::character varying,
            'ROLE_DISPATCHER'::character varying
        ]::text[])
    )
);

-- Locations Table
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    company_name VARCHAR(150),
    title VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT locations_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    registration_number VARCHAR(30) NOT NULL,
    model VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(30) NOT NULL,
    max_payload_kg NUMERIC(8, 2),
    status vehicle_status_enum NOT NULL DEFAULT 'AVAILABLE'::vehicle_status_enum,
    CONSTRAINT vehicles_registration_number_key UNIQUE (registration_number)
);

-- Drivers Table
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    license_number VARCHAR(50) NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    rating NUMERIC(2, 1) DEFAULT 5.0,
    CONSTRAINT drivers_user_id_key UNIQUE (user_id),
    CONSTRAINT drivers_license_number_key UNIQUE (license_number),
    CONSTRAINT drivers_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    vehicle_id INTEGER,
    driver_id INTEGER,
    pickup_location_id INTEGER NOT NULL,
    dropoff_location_id INTEGER NOT NULL,
    pickup_time TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cargo_type VARCHAR(100) DEFAULT 'Standard Freight'::character varying,
    weight_kg NUMERIC(8, 2) NOT NULL,
    status booking_status_enum NOT NULL DEFAULT 'PENDING'::booking_status_enum,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bookings_weight_kg_check CHECK (weight_kg > 0::numeric),
    CONSTRAINT chk_locations_distinct CHECK (pickup_location_id <> dropoff_location_id),
    CONSTRAINT bookings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT bookings_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
    CONSTRAINT bookings_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
    CONSTRAINT bookings_pickup_location_id_fkey FOREIGN KEY (pickup_location_id) REFERENCES locations(id) ON DELETE RESTRICT,
    CONSTRAINT bookings_dropoff_location_id_fkey FOREIGN KEY (dropoff_location_id) REFERENCES locations(id) ON DELETE RESTRICT
);

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    base_fare NUMERIC(10, 2) NOT NULL,
    weight_surcharge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(10, 2) GENERATED ALWAYS AS ((base_fare + weight_surcharge + tax_amount)) STORED,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'PAID'::character varying,
    issued_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT invoices_booking_id_key UNIQUE (booking_id),
    CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number),
    CONSTRAINT invoices_base_fare_check CHECK (base_fare >= 0::numeric),
    CONSTRAINT invoices_weight_surcharge_check CHECK (weight_surcharge >= 0::numeric),
    CONSTRAINT invoices_tax_amount_check CHECK (tax_amount >= 0::numeric),
    CONSTRAINT invoices_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- 5. Indexes
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);

-- 6. Initial Admin Seed
-- Email: admin@cloudhaul.com | Password: AdminPassword123
INSERT INTO users (name, email, phone, password_hash, role)
VALUES (
    'Admin Operations',
    'admin@cloudhaul.com',
    '+919876543210',
    '$2b$12$FO.o/6Y4MSsztifD7QMtAeb/q877aoPg/XfFlo46U6QEt90td1sx6',
    'ROLE_ADMIN'
);