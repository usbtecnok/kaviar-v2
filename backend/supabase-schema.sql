-- KAVIAR Database Schema
-- Execute este SQL no Supabase SQL Editor

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    role_id TEXT NOT NULL REFERENCES roles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create passengers table
CREATE TABLE IF NOT EXISTS passengers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rides table
CREATE TABLE IF NOT EXISTS rides (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    driver_id TEXT REFERENCES drivers(id),
    passenger_id TEXT NOT NULL REFERENCES passengers(id),
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    status TEXT DEFAULT 'requested',
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ride_status_history table
CREATE TABLE IF NOT EXISTS ride_status_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    ride_id TEXT NOT NULL REFERENCES rides(id),
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial roles
INSERT INTO roles (name) VALUES ('SUPER_ADMIN') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('OPERATOR') ON CONFLICT (name) DO NOTHING;

-- Insert sample data
INSERT INTO drivers (name, email, phone, status) VALUES 
('Carlos Silva', 'carlos.silva@email.com', '+55 11 99999-1111', 'approved'),
('Ana Santos', 'ana.santos@email.com', '+55 11 99999-2222', 'pending'),
('Pedro Costa', 'pedro.costa@email.com', '+55 11 99999-3333', 'suspended')
ON CONFLICT (email) DO NOTHING;

INSERT INTO passengers (name, email, phone) VALUES 
('Maria Oliveira', 'maria.oliveira@email.com', '+55 11 88888-1111'),
('João Costa', 'joao.costa@email.com', '+55 11 88888-2222'),
('Lucia Santos', 'lucia.santos@email.com', '+55 11 88888-3333')
ON CONFLICT (email) DO NOTHING;

-- Sample rides (will use actual IDs from inserted data)
WITH driver_ids AS (SELECT id FROM drivers WHERE email = 'carlos.silva@email.com'),
     passenger_ids AS (SELECT id FROM passengers WHERE email = 'maria.oliveira@email.com')
INSERT INTO rides (driver_id, passenger_id, origin, destination, status, price)
SELECT d.id, p.id, 'Shopping Center', 'Aeroporto Internacional', 'completed', 28.50
FROM driver_ids d, passenger_ids p;

WITH passenger_ids AS (SELECT id FROM passengers WHERE email = 'joao.costa@email.com')
INSERT INTO rides (passenger_id, origin, destination, status, price)
SELECT p.id, 'Centro da Cidade', 'Universidade', 'requested', 15.75
FROM passenger_ids p;
